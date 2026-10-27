import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate as flush } from 'node:timers/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { authService } from '../src/services/authService';
import type { AuthUser } from '../src/services/authService';
import { f05Api, F05ApiError } from '../src/features/f05/f05.api';
import { F05NumberError, parseMiningId, parseMinUtilInput, parseSafeMiningJson } from '../src/features/f05/f05.numbers';
import { clearPendingSubmission, readPendingSubmission, sendSubmission } from '../src/features/f05/f05.submission';
import type { CreateRequest, RequestStatus, RequestView, RunView } from '../src/features/f05/f05.types';
import { watchMiningRequest } from '../src/features/f05/f05.progress';
import type { MiningProgress } from '../src/features/f05/f05.progress';
import { F05WorkspaceView } from '../src/features/f05/components/F05WorkspaceView';

// Test fixtures only. These responses are never imported by the application.
class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const user: AuthUser = {
  id: 'f05-test', name: 'Test User', email: 'test@example.invalid', role: 'Merchandiser',
  avatarText: 'TU', department: 'Test', defaultScreen: 'f03-configuration', allowedScreens: ['f05-mining']
};
const payload: CreateRequest = {
  requestKey: '009f3ef1-d4ba-4291-9854-b74c6878d26b', snapshotId: 2,
  algorithms: ['HUI_MINER', 'EFIM'], minUtilMode: 'PERCENTAGE', minUtilValue: 0.5
};
const receipt = { ...payload, requestId: 17, status: 'PENDING' };
const hasStatus = (status: number | null) => (error: unknown) => error instanceof F05ApiError && error.status === status;

test('F05 numeric safety, HTTP boundary and idempotent submission', async t => {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'sessionStorage', { value: storage, configurable: true });
  t.after(() => {
    if (previousStorage) Object.defineProperty(globalThis, 'sessionStorage', previousStorage);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  });
  t.mock.method(authService, 'getCurrentUser', () => user);
  t.mock.method(authService, 'getToken', () => 'test-jwt');

  await t.test('decimal strings preserve 0.5%, six fractional digits and safe large values', () => {
    for (const text of ['0.5', '0.000001', '0.123456', '100.000000']) {
      assert.equal(parseMinUtilInput(text, 'PERCENTAGE'), Number(text));
    }
    for (const text of ['0000.500000', '123456789.123456', '9007199254740991']) {
      assert.equal(parseMinUtilInput(text, 'ABSOLUTE'), Number(text));
    }
    for (const text of ['', '0', '-1', 'NaN', 'Infinity', '0.1234567', '1e-6', '0,5', '1.', '100.000001', '101']) {
      assert.throws(() => parseMinUtilInput(text, 'PERCENTAGE'), F05NumberError, text);
    }
    for (const text of ['9007199254740993', '9007199254.740991', '1234567890123456789012345']) {
      assert.throws(() => parseMinUtilInput(text, 'ABSOLUTE'), F05NumberError, text);
    }
  });

  await t.test('raw response numbers cannot silently round; numeric text inside strings stays text', () => {
    assert.deepEqual(parseSafeMiningJson('{"id":9007199254740991,"utility":1.230000,"small":1e-6}'), { id: Number.MAX_SAFE_INTEGER, utility: 1.23, small: 0.000001 });
    const quoted = JSON.stringify({ text: '9007199254740993 and "1234567890123.123456"', date: '2026-10-27', unicode: '\u0031' });
    assert.deepEqual(parseSafeMiningJson(quoted), JSON.parse(quoted));
    for (const text of ['{"id":9007199254740993}', '{"utility":1234567890123.123456}', '[1e309]', '[1e-999]', '[0.100000000000000005]']) {
      assert.throws(() => parseSafeMiningJson(text), F05NumberError, text);
    }
    assert.throws(() => parseSafeMiningJson('invalid JSON'), SyntaxError);
  });

  await t.test('POST uses JWT, numeric decimal, original UUID and only the five DTO fields', async st => {
    let calls = 0;
    st.mock.method(globalThis, 'fetch', async (url: RequestInfo | URL, init?: RequestInit) => {
      calls++;
      assert.equal(url, '/api/mining/requests');
      assert.equal(init?.method, 'POST');
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('Authorization'), 'Bearer test-jwt');
      assert.equal(headers.get('Accept'), 'application/json');
      assert.equal(headers.get('Content-Type'), 'application/json');
      assert.deepEqual(JSON.parse(String(init?.body)), payload);
      return Response.json(receipt, { status: 202 });
    });
    const response = await f05Api.createRequest({ ...payload, storeId: 999 } as CreateRequest);
    assert.equal(response.requestId, 17);
    assert.equal(response.status, 'PENDING');
    assert.equal(calls, 1);
    assert.equal(Object.keys(f05Api).length, 8);
  });

  await t.test('client guards reject duplicate algorithms, invalid thresholds and unsafe path IDs before fetch', async st => {
    let calls = 0;
    st.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({}); });
    for (const invalid of [
      { ...payload, algorithms: [] }, { ...payload, algorithms: ['EFIM', 'EFIM'] },
      { ...payload, minUtilValue: NaN }, { ...payload, minUtilValue: 0.1234567 },
      { ...payload, minUtilValue: 100.000001 }, { ...payload, snapshotId: 0 },
      { ...payload, requestKey: 'not-a-uuid' }
    ]) await assert.rejects(f05Api.createRequest(invalid as CreateRequest), hasStatus(400));
    for (const id of [Number.MAX_SAFE_INTEGER + 1, NaN, 1.5, 0]) {
      await assert.rejects(f05Api.getRequest(id), hasStatus(400));
      await assert.rejects(f05Api.listRuns(id), hasStatus(400));
      await assert.rejects(f05Api.getRun(id), hasStatus(400));
      await assert.rejects(f05Api.listPatterns(id), hasStatus(400));
      await assert.rejects(f05Api.getBenchmark(id), hasStatus(400));
    }
    assert.equal(calls, 0);
  });

  await t.test('client uses the current JWT without changing auth or depending on a stale session role', async st => {
    st.mock.method(authService, 'getCurrentUser', () => { throw new Error('Cached user must not control JWT API access'); });
    st.mock.method(authService, 'getToken', () => 'current-test-jwt');
    st.mock.method(authService, 'logout', () => { throw new Error('API client must not change auth'); });
    st.mock.method(globalThis, 'fetch', async (_url: RequestInfo | URL, init?: RequestInit) => {
      assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer current-test-jwt');
      return Response.json(receipt, { status: 202 });
    });
    assert.equal((await f05Api.createRequest(payload)).requestId, 17);
  });

  await t.test('GET pagination, JSON headers and empty/error envelopes retain HTTP status', async st => {
    st.mock.method(globalThis, 'fetch', async (url: RequestInfo | URL, init?: RequestInit) => {
      assert.equal(url, '/api/mining/snapshots?page=1&pageSize=10');
      assert.equal(new Headers(init?.headers).get('Content-Type'), null);
      return Response.json({ items: [], page: 1, pageSize: 10, totalElements: 0 });
    });
    await f05Api.listSnapshots(1, 10);
    for (const [page, size] of [[-1, 20], [0, 0], [0, 101], [0, 1.5]]) {
      await assert.rejects(f05Api.listSnapshots(page, size), hasStatus(400));
    }
    for (const status of [400, 401, 403, 404, 409, 503]) {
      for (const body of ['', '<html>proxy failed</html>', '{"error":"backend detail"}', '{"message":"backend detail"}']) {
        const stub = st.mock.method(globalThis, 'fetch', async () => new Response(body, { status }));
        await assert.rejects(f05Api.getRun(42), error => {
          assert.ok(hasStatus(status)(error));
          if (body.startsWith('{')) assert.equal((error as Error).message, 'backend detail');
          return true;
        });
        stub.mock.restore();
      }
    }
  });

  await t.test('network-uncertain submission survives restore and retries byte-for-byte with the same key', async st => {
    storage.clear();
    const bodies: string[] = [];
    st.mock.method(globalThis, 'fetch', async (_url: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(String(init?.body));
      assert.deepEqual(readPendingSubmission(user.id), payload, 'payload must be saved before fetch');
      if (bodies.length === 1) throw new TypeError('offline');
      return Response.json(receipt, { status: 202 });
    });
    await assert.rejects(sendSubmission(user.id, payload), hasStatus(null));
    const restored = readPendingSubmission(user.id);
    assert.deepEqual(restored, payload);
    assert.equal(readPendingSubmission('another-user'), null);
    await sendSubmission(user.id, restored!);
    assert.equal(bodies.length, 2);
    assert.equal(bodies[0], bodies[1]);
    assert.deepEqual(readPendingSubmission(user.id), payload, 'view owns acknowledgement/clear');
    clearPendingSubmission(user.id);
    assert.equal(readPendingSubmission(user.id), null);
  });

  await t.test('multiple attempts join one POST; a different payload cannot run concurrently', async st => {
    let release!: (response: Response) => void;
    let calls = 0;
    st.mock.method(globalThis, 'fetch', () => {
      calls++;
      return new Promise<Response>(resolve => { release = resolve; });
    });
    const first = sendSubmission(user.id, payload);
    const second = sendSubmission(user.id, { ...payload, algorithms: [...payload.algorithms] });
    assert.equal(first, second);
    assert.equal(calls, 1);
    assert.throws(() => sendSubmission(user.id, { ...payload, minUtilValue: 1 }), /still in progress/);
    release(Response.json(receipt, { status: 202 }));
    await first;
  });

  await t.test('unreadable/unsafe 202 responses retain the retry payload instead of inventing a result', async st => {
    for (const body of ['', '{}', JSON.stringify({ ...receipt, requestKey: 'wrong-key' }), '{"requestId":9007199254740993,"status":"PENDING"}']) {
      const stub = st.mock.method(globalThis, 'fetch', async () => new Response(body, { status: 202 }));
      await assert.rejects(sendSubmission(user.id, payload), hasStatus(202));
      assert.deepEqual(readPendingSubmission(user.id), payload);
      stub.mock.restore();
    }
  });

  await t.test('storage failure prevents POST and corrupt stored payload is never silently discarded', async st => {
    let calls = 0;
    st.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json(receipt, { status: 202 }); });
    const storageMock = st.mock.method(storage, 'setItem', () => { throw new Error('storage blocked'); });
    assert.throws(() => sendSubmission(user.id, payload), /No mining request was sent/);
    assert.equal(calls, 0);
    storageMock.mock.restore();
    storage.setItem('paspm:f05:pending:f05-test', '{invalid');
    assert.throws(() => readPendingSubmission(user.id));
    assert.equal(storage.getItem('paspm:f05:pending:f05-test'), '{invalid');
  });
});

function requestFixture(requestId = 17, status: RequestStatus = 'PENDING'): RequestView {
  return {
    ...payload, requestId, status, storeId: 1, requestedBy: 1, minUtilSpmf: 1, effectiveMinUtility: 0.5,
    comparisonStatus: 'PENDING', snapshotHash: 'matrix', inputHash: 'input', conversionVersion: 'v1', utilityScale: 6,
    roundingMode: 'HALF_UP', divisor: 1, totalScaledUtility: 100, transactionCount: 2, distinctItems: 3, inputBytes: 30,
    snapshot: { snapshotId: 2, storeId: 1, createdBy: 1, rangeStart: '2026-09-01', rangeEnd: '2026-09-30', asOfDate: '2026-10-27', configuration: null, sourceHash: 'source', matrixHash: 'matrix', totalWeightedUtility: 48.123456, roundingScale: 6, status: 'READY', createdAt: '2026-10-27T00:00:00Z', warnings: [] },
    createdAt: '2026-10-27T00:00:00Z'
  };
}

function runFixture(requestId = 17): RunView {
  return {
    runId: 42, requestId, storeId: 1, snapshotId: 2, algorithm: 'HUI_MINER', attemptNo: 1, libraryVersion: '2.67a',
    status: 'PENDING', minUtilSpmf: 1, inputHash: 'input', conversionVersion: 'v1', startedAt: null, completedAt: null,
    runtimeMillis: null, memoryMiB: null, memoryMethod: 'sampled Java heap', runtimeMethod: 'child JVM wall time',
    environment: null, patternCount: null, failureCode: null, failureMessage: null
  };
}

test('F05 Step 4 history, scoped reads and polling lifecycle', async t => {
  t.mock.method(authService, 'getToken', () => 'step4-test-jwt');

  await t.test('history uses zero-based items pagination and only the contracted query parameters', async st => {
    const calls: string[] = [];
    st.mock.method(globalThis, 'fetch', async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push(String(url));
      assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer step4-test-jwt');
      assert.equal(new Headers(init?.headers).get('Content-Type'), null);
      const page = new URL(String(url), 'http://test').searchParams.get('page');
      return Response.json({ items: [requestFixture(page === '0' ? 17 : 16)], page: Number(page), pageSize: 20, totalElements: 21 });
    });
    assert.equal((await f05Api.listRequests()).items[0].requestId, 17);
    assert.equal((await f05Api.listRequests(1, 20)).items[0].requestId, 16);
    assert.deepEqual(calls, ['/api/mining/requests?page=0&pageSize=20', '/api/mining/requests?page=1&pageSize=20']);
  });

  await t.test('polling follows real request states and stops at COMPLETED without polling history', async st => {
    st.mock.timers.enable({ apis: ['setTimeout'] });
    const updates: MiningProgress[] = [];
    const errors: unknown[] = [];
    const paths: string[] = [];
    let reads = 0;
    const states: RequestStatus[] = ['PENDING', 'RUNNING', 'COMPLETED'];
    st.mock.method(globalThis, 'fetch', async (url: RequestInfo | URL) => {
      paths.push(String(url));
      if (String(url).endsWith('/runs')) return Response.json([runFixture()]);
      return Response.json(requestFixture(17, states[reads++]));
    });
    const stop = watchMiningRequest(17, data => updates.push(data), error => errors.push(error));
    st.after(stop);
    await flush(); assert.equal(updates.length, 1);
    st.mock.timers.tick(1499); await flush(); assert.equal(updates.length, 1);
    st.mock.timers.tick(1); await flush(); assert.equal(updates[1].request.status, 'RUNNING');
    st.mock.timers.tick(1500); await flush(); assert.equal(updates[2].request.status, 'COMPLETED');
    st.mock.timers.tick(60000); await flush(); assert.equal(reads, 3);
    assert.deepEqual(errors, []);
    assert.ok(paths.every(path => path === '/api/mining/requests/17' || path === '/api/mining/requests/17/runs'));
  });

  await t.test('slow reads never overlap and disposal cancels the scheduled next cycle', async st => {
    st.mock.timers.enable({ apis: ['setTimeout'] });
    let release!: (response: Response) => void;
    let calls = 0;
    let updates = 0;
    st.mock.method(globalThis, 'fetch', (url: RequestInfo | URL) => {
      calls++;
      if (String(url).endsWith('/runs')) return Promise.resolve(Response.json([runFixture()]));
      return new Promise<Response>(resolve => { release = resolve; });
    });
    const stop = watchMiningRequest(17, () => updates++, error => { throw error; });
    st.after(stop);
    st.mock.timers.tick(15000); await flush(); assert.equal(calls, 1);
    release(Response.json(requestFixture())); await flush(); assert.equal(updates, 1); assert.equal(calls, 2);
    stop(); st.mock.timers.tick(60000); await flush(); assert.equal(calls, 2);
  });

  await t.test('changing selection aborts and ignores the previous late response', async st => {
    let release!: (response: Response) => void;
    let previousSignal: AbortSignal | null | undefined;
    const paths: string[] = [];
    const updates: number[] = [];
    st.mock.method(globalThis, 'fetch', (url: RequestInfo | URL, init?: RequestInit) => {
      paths.push(String(url));
      if (String(url) === '/api/mining/requests/17') {
        previousSignal = init?.signal;
        return new Promise<Response>(resolve => { release = resolve; });
      }
      return Promise.resolve(Response.json(String(url).endsWith('/runs') ? [runFixture(18)] : requestFixture(18, 'COMPLETED')));
    });
    const stopOld = watchMiningRequest(17, data => updates.push(data.request.requestId), error => { throw error; });
    stopOld(); assert.equal(previousSignal?.aborted, true);
    const stopNew = watchMiningRequest(18, data => updates.push(data.request.requestId), error => { throw error; });
    st.after(stopNew);
    await flush(); release(Response.json(requestFixture(17))); await flush();
    assert.deepEqual(updates, [18]);
    assert.equal(paths.includes('/api/mining/requests/17/runs'), false);
  });

  await t.test('network and HTTP errors stop polling until a new manual watch is started', async st => {
    st.mock.timers.enable({ apis: ['setTimeout'] });
    for (const status of [null, 401, 403, 404, 500, 503]) {
      let calls = 0;
      const errors: unknown[] = [];
      const stub = st.mock.method(globalThis, 'fetch', async () => {
        calls++;
        if (status === null) throw new TypeError('offline');
        return new Response('', { status });
      });
      const stop = watchMiningRequest(17, () => assert.fail('No status may be invented from an error'), error => errors.push(error));
      await flush(); st.mock.timers.tick(60000); await flush(); stop();
      assert.equal(calls, 1); assert.equal(errors.length, 1); assert.ok(hasStatus(status)(errors[0]));
      stub.mock.restore();
    }
    let updated = false;
    st.mock.method(globalThis, 'fetch', async (url: RequestInfo | URL) => Response.json(String(url).endsWith('/runs') ? [] : requestFixture(17, 'COMPLETED')));
    const stop = watchMiningRequest(17, () => { updated = true; }, error => { throw error; });
    st.after(stop); await flush(); assert.equal(updated, true);
  });

  await t.test('FAILED request and TIMED_OUT run remain distinct; run details use runId, and null metrics stay null', async st => {
    st.mock.timers.enable({ apis: ['setTimeout'] });
    const request = { ...requestFixture(17, 'FAILED'), comparisonStatus: 'BLOCKED' };
    const run = { ...runFixture(), status: 'TIMED_OUT', failureCode: 'TIMED_OUT', failureMessage: 'Execution timed out' };
    const paths: string[] = [];
    let result: MiningProgress | undefined;
    st.mock.method(globalThis, 'fetch', async (url: RequestInfo | URL) => {
      paths.push(String(url));
      return Response.json(String(url) === '/api/mining/runs/42' ? run : String(url).endsWith('/runs') ? [run] : request);
    });
    const stop = watchMiningRequest(17, data => { result = data; }, error => { throw error; }, 42);
    st.after(stop); await flush(); st.mock.timers.tick(60000); await flush();
    assert.deepEqual(paths, ['/api/mining/requests/17', '/api/mining/requests/17/runs', '/api/mining/runs/42']);
    assert.equal(result?.request.status, 'FAILED'); assert.equal(result?.request.comparisonStatus, 'BLOCKED');
    assert.equal(result?.runDetail?.status, 'TIMED_OUT'); assert.equal(result?.runDetail?.runtimeMillis, null);
    assert.equal(result?.runDetail?.memoryMiB, null); assert.equal(result?.runDetail?.patternCount, null);
    assert.equal(result?.runDetail?.failureCode, 'TIMED_OUT');
  });

  await t.test('mixed-store, mismatched and unsafe history/read data is rejected before display', async st => {
    let stub = st.mock.method(globalThis, 'fetch', async () => Response.json({ items: [requestFixture(), { ...requestFixture(18), storeId: 2, snapshot: { ...requestFixture().snapshot, storeId: 2 } }], page: 0, pageSize: 20, totalElements: 2 }));
    await assert.rejects(f05Api.listRequests(), hasStatus(200)); stub.mock.restore();
    stub = st.mock.method(globalThis, 'fetch', async () => Response.json(requestFixture(18)));
    await assert.rejects(f05Api.getRequest(17), hasStatus(200)); stub.mock.restore();
    stub = st.mock.method(globalThis, 'fetch', async (url: RequestInfo | URL) => Response.json(String(url).endsWith('/runs') ? [{ ...runFixture(), storeId: 2 }] : requestFixture()));
    const errors: unknown[] = [];
    const stop = watchMiningRequest(17, () => assert.fail('Foreign run must not be displayed'), error => errors.push(error));
    await flush(); stop(); assert.equal(errors.length, 1); stub.mock.restore();
    st.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ items: [requestFixture()], page: 0, pageSize: 20, totalElements: 1 }).replace('"requestId":17', '"requestId":9007199254740993')));
    await assert.rejects(f05Api.listRequests(), hasStatus(200));
    assert.equal(parseMiningId('9007199254740991'), Number.MAX_SAFE_INTEGER);
    for (const id of ['9007199254740992', '9007199254740993', '1.5', '001', '-1', 'abc']) assert.throws(() => parseMiningId(id), F05NumberError);
  });

  await t.test('a session change during a read cannot reveal stale request/run data', async st => {
    let token = 'first-token';
    let calls = 0;
    st.mock.method(authService, 'getToken', () => token);
    st.mock.method(globalThis, 'fetch', async () => { calls++; token = 'other-session-token'; return Response.json(requestFixture()); });
    const errors: unknown[] = [];
    const stop = watchMiningRequest(17, () => assert.fail('Previous session must not update the view'), error => errors.push(error));
    await flush(); stop(); assert.equal(calls, 1); assert.ok(hasStatus(401)(errors[0]));
  });

  await t.test('workspace read access and submit controls remain role-based', async st => {
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
    Object.defineProperty(globalThis, 'window', { value: { location: { search: '' } }, configurable: true });
    Object.defineProperty(globalThis, 'sessionStorage', { value: new MemoryStorage(), configurable: true });
    st.after(() => {
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow); else Reflect.deleteProperty(globalThis, 'window');
      if (previousStorage) Object.defineProperty(globalThis, 'sessionStorage', previousStorage); else Reflect.deleteProperty(globalThis, 'sessionStorage');
    });
    for (const role of ['Store Admin', 'Merchandiser', 'System Admin', 'End-Customer'] as const) {
      const html = renderToStaticMarkup(createElement(F05WorkspaceView, { currentUser: { ...user, role } }));
      if (role === 'System Admin' || role === 'End-Customer') assert.equal(html, '');
      else {
        assert.ok(html.includes('Request history'));
        assert.equal(html.includes('Run Mining'), role === 'Merchandiser');
        assert.equal(html.includes('Read-only access'), role === 'Store Admin');
      }
    }
  });
});
