import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { authService, type AuthUser } from '../src/services/authService';
import { f05Api, F05ApiError } from '../src/features/f05/f05.api';
import { f06Api, F06ApiError } from '../src/features/f06/f06.api';
import type { RecGenerateRequest, RecListParams, RecPolicyRequest, RecReviewRequest, RecView } from '../src/features/f06/f06.types';
import { user, runFixture } from './f05.fixtures';
import { eligibility, expiryPage, generation, policy, policyRequest, recommendation } from './f06.fixtures';

const hasStatus = (status: number | null) => (error: unknown) => error instanceof F06ApiError && error.status === status;
function actor(t: TestContext, role: AuthUser['role'] = 'Merchandiser') {
  t.mock.method(authService, 'getCurrentUser', () => ({ ...user, role }));
  t.mock.method(authService, 'getToken', () => 'test-only-token');
  t.mock.method(authService, 'getSessionId', () => 'test-session');
  const calls: { path: string; init: RequestInit }[] = [];
  let respond = async (_path: string, _init: RequestInit): Promise<Response> => { throw new Error('Unexpected test request'); };
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ path: String(input), init });
    return respond(String(input), init);
  });
  return { calls, respond: (fn: typeof respond) => { respond = fn; }, body: (data: unknown) => { respond = async () => Response.json(data); } };
}
const decision: RecReviewRequest = { expectedVersion: 1, reason: 'Reviewed frozen evidence and current inventory' };
const generateRequest: RecGenerateRequest = { miningRunId: 42, types: ['BUNDLE', 'CROSS_SELL', 'FBT', 'BANNER'] };
const page = (items: RecView[] = [], ordering = 'CREATED_DESC', index = 0, size = 20, total = items.length) =>
  ({ items, page: index, pageSize: size, totalElements: total, ordering });

test('all eight operations use the authenticated transport, exact paths and JSON DTOs', async t => {
  const f = actor(t);
  f.respond(async path => {
    if (path === '/api/mining/runs/42') return Response.json(runFixture('COMPLETED'));
    if (path.endsWith('/generate')) return Response.json(generation);
    if (path.endsWith('/config')) return Response.json(policy);
    if (path.includes('/expiry-push')) return Response.json(expiryPage());
    if (path.includes('?')) return Response.json(page());
    if (path.endsWith('/approve') || path.endsWith('/reject')) return Response.json(recommendation({
      reviewStatus: path.endsWith('/approve') ? 'APPROVED' : 'REJECTED', version: 2,
      reviewedBy: 7, reviewedAt: '2026-11-07T01:00:00Z', reviewReason: decision.reason,
      readyForConsumption: path.endsWith('/approve')
    }));
    return Response.json(recommendation());
  });
  await f06Api.generate(generateRequest);
  await f06Api.list();
  await f06Api.get(62);
  await f06Api.approve(62, decision);
  await f06Api.reject(62, decision);
  await f06Api.getConfig();
  t.mock.method(authService, 'getCurrentUser', () => ({ ...user, role: 'Store Admin' }));
  await f06Api.updateConfig(policyRequest);
  await f06Api.listExpiryPush();
  assert.deepEqual(f.calls.map(c => [c.init.method || 'GET', c.path]), [
    ['GET', '/api/mining/runs/42'], ['POST', '/api/recommendations/generate'],
    ['GET', '/api/recommendations?page=0&pageSize=20'], ['GET', '/api/recommendations/62'],
    ['POST', '/api/recommendations/62/approve'], ['POST', '/api/recommendations/62/reject'],
    ['GET', '/api/recommendations/config'], ['PUT', '/api/recommendations/config'],
    ['GET', '/api/recommendations/expiry-push?page=0&pageSize=20']
  ]);
  for (const call of f.calls) {
    assert.equal(new Headers(call.init.headers).get('Authorization'), 'Bearer test-only-token');
    assert.equal(call.init.credentials, 'include');
  }
  for (const [index, body] of [[1, generateRequest], [4, decision], [5, decision], [7, policyRequest]] as const) {
    assert.deepEqual(JSON.parse(String(f.calls[index].init.body)), body);
    assert.equal(new Headers(f.calls[index].init.headers).get('Content-Type'), 'application/json');
    assert.equal(typeof JSON.parse(String(f.calls[index].init.body))[index === 1 ? 'miningRunId' : 'expectedVersion'], 'number');
  }
});

for (const role of ['System Admin', 'End-Customer'] as const) test(`${role} cannot call any F06 operation`, async t => {
  const f = actor(t, role);
  for (const call of [() => f06Api.generate(generateRequest), () => f06Api.list(), () => f06Api.get(62),
    () => f06Api.approve(62, decision), () => f06Api.reject(62, decision), () => f06Api.getConfig(),
    () => f06Api.updateConfig(policyRequest), () => f06Api.listExpiryPush()]) await assert.rejects(call(), hasStatus(403));
  assert.equal(f.calls.length, 0);
});
test('Store Admin reads only; Merchandiser cannot update policy; anonymous access is rejected', async t => {
  const f = actor(t, 'Store Admin');
  for (const call of [() => f06Api.generate(generateRequest), () => f06Api.approve(62, decision), () => f06Api.reject(62, decision)]) {
    await assert.rejects(call(), hasStatus(403));
  }
  t.mock.method(authService, 'getCurrentUser', () => ({ ...user, role: 'Merchandiser' }));
  await assert.rejects(f06Api.updateConfig(policyRequest), hasStatus(403));
  t.mock.method(authService, 'getCurrentUser', () => null);
  await assert.rejects(f06Api.list(), hasStatus(401));
  assert.equal(f.calls.length, 0);
});

for (const status of ['PENDING', 'RUNNING', 'FAILED', 'TIMED_OUT'] as const) test(`generate rejects ${status} source without starting mining or posting`, async t => {
  const f = actor(t); f.body(runFixture(status));
  await assert.rejects(f06Api.generate(generateRequest), hasStatus(409));
  assert.deepEqual(f.calls.map(c => c.path), ['/api/mining/runs/42']);
});
test('zero-candidate generation and reused identities preserve backend counts and skips', async t => {
  const f = actor(t);
  t.mock.method(f05Api, 'getRun', async () => runFixture('COMPLETED'));
  for (const result of [{ ...generation, createdCount: 0, recommendationIds: [] }, { ...generation, createdCount: 0, reusedCount: 3 }]) {
    f.body(result);
    assert.deepEqual(await f06Api.generate(generateRequest), result);
  }
  assert.equal(f.calls.length, 2);
});
test('generation preflight propagates F05 errors and fences session changes before POST', async t => {
  const f = actor(t);
  for (const status of [401, 403, 404, 409]) {
    t.mock.method(f05Api, 'getRun', async () => { throw new F05ApiError(status, 'Source unavailable'); });
    await assert.rejects(f06Api.generate(generateRequest), hasStatus(status));
  }
  t.mock.method(f05Api, 'getRun', async () => {
    t.mock.method(authService, 'getSessionId', () => 'another-user');
    return runFixture('COMPLETED');
  });
  await assert.rejects(f06Api.generate(generateRequest), hasStatus(401));
  assert.equal(f.calls.length, 0);
});

test('all supported list filters/pagination are serialized; server ranking and order are preserved', async t => {
  const f = actor(t);
  const result = page([recommendation({ recommendationId: 90, rank: 21, utility: 1 }), recommendation({ rank: 22, utility: 999 })], 'RANKED_WITHIN_SOURCE_RUN', 1, 20, 45);
  f.body(result);
  assert.deepEqual(await f06Api.list({ miningRunId: 42, snapshotId: 2, type: 'BUNDLE', reviewStatus: 'PENDING_REVIEW', page: 1, pageSize: 20 }), result);
  assert.equal(f.calls[0].path, '/api/recommendations?page=1&pageSize=20&miningRunId=42&snapshotId=2&type=BUNDLE&reviewStatus=PENDING_REVIEW');
});
test('history uses null ranks and totalElements, including empty pages beyond the last page', async t => {
  const f = actor(t); f.body(page([recommendation()], 'CREATED_DESC', 0, 20, 45));
  assert.equal((await f06Api.list()).items[0].rank, null);
  f.body(page([], 'CREATED_DESC', 9, 20, 45));
  assert.equal((await f06Api.list({ page: 9 })).totalElements, 45);
});
test('expiry needs no mining, preserves Store date/time/warnings and empty-page warnings', async t => {
  const f = actor(t); const result = expiryPage(); f.body(result);
  assert.deepEqual(await f06Api.listExpiryPush({ productId: 31 }), result);
  assert.equal(f.calls[0].path, '/api/recommendations/expiry-push?page=0&pageSize=20&productId=31');
  f.body({ ...result, items: [], totalElements: 0 });
  assert.deepEqual((await f06Api.listExpiryPush()).warnings, result.warnings);
  assert.equal(f.calls.length, 2);
});
test('nullable evidence/product expiry/review/rank remain null; explicit null differs from missing', async t => {
  const f = actor(t);
  const result = recommendation({ evidence: { totalTransactions: 0, supportCount: null, supportRatio: null, anchorSupportCount: null, confidence: null, status: 'EVIDENCE_UNAVAILABLE' } });
  f.body(result); assert.deepEqual(await f06Api.get(62), result);
  for (const key of ['anchorProductId', 'reviewedBy', 'reviewedAt', 'reviewReason', 'rank']) {
    const missing = { ...result }; delete (missing as unknown as Record<string, unknown>)[key]; f.body(missing);
    await assert.rejects(f06Api.get(62), hasStatus(200));
  }
});
test('approved can become unready; reject is allowed while ineligible; historical checks remain separate', async t => {
  const f = actor(t);
  const result = recommendation({ reviewStatus: 'APPROVED', version: 2, inventoryChanged: true,
    currentEligibility: eligibility('INELIGIBLE'), readyForConsumption: false, reviewedBy: 7,
    reviewedAt: '2026-11-07T01:00:00Z', reviewReason: decision.reason,
    reviewHistory: [{ oldStatus: 'PENDING_REVIEW', newStatus: 'APPROVED', reviewedBy: 7,
      reviewedAt: '2026-11-07T01:00:00Z', reason: decision.reason, resultingVersion: 2, eligibilityCheck: eligibility() }] });
  f.body(result); assert.deepEqual(await f06Api.get(62), result);
  const rejected = { ...result, reviewStatus: 'REJECTED' }; f.body(rejected);
  assert.deepEqual(await f06Api.reject(62, decision), rejected);
});

test('invalid generation and review DTOs never reach HTTP', async t => {
  const f = actor(t);
  for (const request of [{ miningRunId: 42, types: [] }, { ...generateRequest, types: ['BUNDLE', 'BUNDLE'] },
    { ...generateRequest, types: ['IMPULSE'] }, { ...generateRequest, storeId: 1 },
    ...[0, -1, 1.5, '42', null, Number.MAX_SAFE_INTEGER + 1].map(miningRunId => ({ ...generateRequest, miningRunId }))]) {
    await assert.rejects(f06Api.generate(request as RecGenerateRequest), hasStatus(400));
  }
  for (const request of [{ ...decision, expectedVersion: '1' }, { ...decision, expectedVersion: 0 },
    { ...decision, expectedVersion: 1.5 }, { ...decision, expectedVersion: Number.MAX_SAFE_INTEGER + 1 },
    { ...decision, reason: '' }, { ...decision, reason: ' \n\t' }, { ...decision, reason: 'x'.repeat(1001) },
    { ...decision, reason: null }, { ...decision, storeId: 1 }]) {
    await assert.rejects(f06Api.approve(62, request as RecReviewRequest), hasStatus(400));
    await assert.rejects(f06Api.reject(62, request as RecReviewRequest), hasStatus(400));
  }
  assert.equal(f.calls.length, 0);
});
test('IDs, supported filters, page bounds and unsupported expiry asOfDate are validated', async t => {
  const f = actor(t);
  for (const id of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '62', null] as number[]) await assert.rejects(f06Api.get(id), hasStatus(400));
  for (const params of [{ page: -1 }, { page: 1.1 }, { page: 2147483648 }, { page: null }, { pageSize: 0 },
    { pageSize: 101 }, { miningRunId: '42' }, { snapshotId: 2147483648 }, { type: 'Impulse' },
    { reviewStatus: 'ELIGIBLE' }, { sort: 'utility' }, { storeId: 1 }]) {
    await assert.rejects(f06Api.list(params as RecListParams), hasStatus(400));
  }
  for (const params of [{ asOfDate: '2026-11-07' }, { productId: 2147483648 }, { pageSize: 101 }]) {
    await assert.rejects(f06Api.listExpiryPush(params), hasStatus(400));
  }
  assert.equal(f.calls.length, 0);
});
test('policy validation covers complete replacement, integer tokens and decimal bounds without rounding', async t => {
  const f = actor(t, 'Store Admin');
  for (const request of [{ ...policyRequest, expectedVersion: 0 }, { ...policyRequest, maxBundleSize: 1 },
    { ...policyRequest, maxBundleSize: 257 }, { ...policyRequest, maxBundleSize: 2.5 },
    { ...policyRequest, minSupportCount: 2147483648 }, { ...policyRequest, minimumSellableQuantity: 0 },
    { ...policyRequest, minSupportRatio: -0.1 }, { ...policyRequest, minConfidence: 1.000001 },
    { ...policyRequest, minConfidence: 0.1234567 }, { ...policyRequest, minConfidence: '0.5' },
    { ...policyRequest, minConfidence: null }, { ...policyRequest, minConfidence: NaN },
    { expectedVersion: 1 }, { ...policyRequest, storeId: 1 }]) {
    await assert.rejects(f06Api.updateConfig(request as RecPolicyRequest), hasStatus(400));
  }
  assert.equal(f.calls.length, 0);
  for (const ratio of [0, 0.000001, 0.123456, 1]) {
    f.body({ ...policy, minSupportRatio: ratio, minConfidence: ratio });
    await f06Api.updateConfig({ ...policyRequest, minSupportRatio: ratio, minConfidence: ratio });
    const body = JSON.parse(String(f.calls.at(-1)!.init.body));
    assert.equal(body.minSupportRatio, ratio); assert.equal(body.minConfidence, ratio);
  }
});

for (const status of [400, 401, 403, 404, 409]) test(`HTTP ${status} retains status/detail and never replays decisions`, async t => {
  const f = actor(t); f.respond(async () => Response.json({ error: 'Backend decision detail' }, { status }));
  for (const action of [f06Api.approve, f06Api.reject]) {
    await assert.rejects(action(62, decision), error => hasStatus(status)(error) && (error as Error).message === 'Backend decision detail');
  }
  assert.equal(f.calls.length, 2);
});
test('empty/HTML error bodies use status fallback; configuration and generation 409 are never retried', async t => {
  const f = actor(t);
  for (const body of ['', '<html>error</html>']) {
    f.respond(async () => new Response(body, { status: 401 }));
    await assert.rejects(f06Api.get(62), hasStatus(401));
  }
  f.respond(async () => Response.json({ message: 'Source conflict' }, { status: 409 }));
  t.mock.method(f05Api, 'getRun', async () => runFixture('COMPLETED'));
  await assert.rejects(f06Api.generate(generateRequest), hasStatus(409));
  t.mock.method(authService, 'getCurrentUser', () => ({ ...user, role: 'Store Admin' }));
  await assert.rejects(f06Api.updateConfig(policyRequest), hasStatus(409));
  assert.equal(f.calls.length, 4);
});
test('unsafe wire integers/decimals and quoted integer fields are rejected instead of rounded', async t => {
  const f = actor(t);
  for (const raw of ['9007199254740993', '0.100000000000000005', '1e309', '1e-999', '"1"']) {
    f.respond(async () => new Response(JSON.stringify(policy).replace('"version":1', `"version":${raw}`)));
    await assert.rejects(f06Api.getConfig(), hasStatus(200));
  }
  f.respond(async () => new Response(JSON.stringify(recommendation()).replace('40.123456', '1234567890123.123456')));
  await assert.rejects(f06Api.get(62), hasStatus(200));
  f.body({ ...policy, version: Number.MAX_SAFE_INTEGER });
  assert.equal((await f06Api.getConfig()).version, Number.MAX_SAFE_INTEGER);
});
test('mismatched IDs, pages, ordering and malformed nested records are rejected', async t => {
  const f = actor(t);
  for (const result of [{ ...recommendation(), recommendationId: 63 }, { ...recommendation(), evidence: {} },
    { ...recommendation(), currentEligibility: null }, { ...recommendation(), sources: [{}] }, { ...recommendation(), reviewHistory: [{}] }]) {
    f.body(result); await assert.rejects(f06Api.get(62), hasStatus(200));
  }
  for (const result of [page([], 'CREATED_DESC', 1), page([], 'RANKED_WITHIN_SOURCE_RUN'),
    { ...page(), totalElements: -1 }, { ...page(), items: [{}] }]) {
    f.body(result); await assert.rejects(f06Api.list(), hasStatus(200));
  }
});
test('network/read failures are surfaced without retry; aborted requests stay aborted', async t => {
  const f = actor(t); f.respond(async () => { throw new TypeError('Network down'); });
  await assert.rejects(f06Api.approve(62, decision), hasStatus(null));
  assert.equal(f.calls.length, 1);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(f06Api.get(62, controller.signal), error => (error as Error).name === 'AbortError');
  assert.equal(f.calls.length, 1);
  const second = new AbortController();
  f.respond(async () => { second.abort(); throw new DOMException('Cancelled', 'AbortError'); });
  await assert.rejects(f06Api.get(62, second.signal), error => (error as Error).name === 'AbortError');
});
test('in-flight response is discarded after session changes; token rotation within session is accepted', async t => {
  const f = actor(t);
  f.respond(async () => {
    t.mock.method(authService, 'getToken', () => 'rotated-test-token');
    return Response.json(policy);
  });
  assert.deepEqual(await f06Api.getConfig(), policy);
  f.respond(async () => {
    t.mock.method(authService, 'getSessionId', () => 'different-user-session');
    return Response.json(policy);
  });
  await assert.rejects(f06Api.getConfig(), hasStatus(401));
});
test('requests pass through the existing session request hook', async t => {
  const f = actor(t);
  const transport = t.mock.method(authService, 'request', async () => Response.json(policy));
  assert.deepEqual(await f06Api.getConfig(), policy);
  assert.equal(transport.mock.callCount(), 1);
  assert.equal(f.calls.length, 0);
});
