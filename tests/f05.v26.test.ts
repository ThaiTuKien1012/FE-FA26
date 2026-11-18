import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { setImmediate as flush } from 'node:timers/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { authService, type AuthUser } from '../src/services/authService';
import { f05Api, F05ApiError } from '../src/features/f05/f05.api';
import { f05SystemApi, validateConfiguration } from '../src/features/f05/f05.system.api';
import { isMiningProgressView, isRequestView } from '../src/features/f05/f05.read-contracts';
import { parseMinUtilInput } from '../src/features/f05/f05.numbers';
import { clearPendingSubmission, readPendingSubmission, sendSubmission } from '../src/features/f05/f05.submission';
import { watchMiningRequest, type MiningProgress } from '../src/features/f05/f05.progress';
import { systemMiningReader } from '../src/features/f05/f05.reader';
import { MiningSubmissionPanel } from '../src/features/f05/components/MiningSubmissionPanel';
import { MiningProgressCard } from '../src/features/f05/components/MiningProgressCard';
import { user, payload, configuration, snapshot, efimRequestFixture, requestFixture, progressFixture, runFixture } from './f05.fixtures';

const status = (n: number | null) => (e: unknown) => e instanceof F05ApiError && e.status === n;
function setup(t: TestContext, role: AuthUser['role'] = 'Merchandiser') {
  let actor: AuthUser | null = { ...user, role, storeId: role === 'System Admin' ? null : 1 };
  t.mock.method(authService, 'getCurrentUser', () => actor);
  t.mock.method(authService, 'getToken', () => 'fixture-token');
  t.mock.method(globalThis, 'fetch', async () => { throw Error('Unexpected fetch blocked'); });
  return { change(next: AuthUser | null) { actor = next; } };
}
function storage(t: TestContext) {
  const data = new Map<string, string>();
  const old = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const value = { get length() { return data.size; }, key: (i: number) => [...data.keys()][i] ?? null, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => data.delete(k) };
  Object.defineProperty(globalThis, 'sessionStorage', { value, configurable: true });
  t.after(() => { if (old) Object.defineProperty(globalThis, 'sessionStorage', old); else Reflect.deleteProperty(globalThis, 'sessionStorage'); });
  return data;
}
test('V26 version zero has fixed EFIM, including before a threshold is configured', async t => {
  setup(t, 'System Admin'); const initial = { version: 0, algorithm: 'EFIM', minUtilMode: null, minUtilValue: null, changedBy: null, changedAt: null };
  t.mock.method(globalThis, 'fetch', async () => Response.json(initial)); assert.deepEqual(await f05SystemApi.getConfiguration(), initial);
});
test('V26 configuration PUT uses only threshold and expectedVersion, and verifies response version', async t => {
  setup(t, 'System Admin'); let calls = 0;
  const body = { minUtilMode: 'PERCENTAGE' as const, minUtilValue: 0.5, expectedVersion: 0 };
  t.mock.method(globalThis, 'fetch', async (_url: RequestInfo | URL, init?: RequestInit) => { calls++; assert.deepEqual(JSON.parse(String(init?.body)), body); return Response.json(configuration); });
  assert.equal((await f05SystemApi.updateConfiguration(body)).algorithm, 'EFIM'); assert.equal(calls, 1);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ ...configuration, version: 5 })); await assert.rejects(f05SystemApi.updateConfiguration(body), status(200));
});
for (const [mode, valid, invalid] of [['PERCENTAGE', ['0.000001', '0.5', '5', '100'], ['0', '100.000001', '0.1234567']], ['ABSOLUTE', ['0.000001', '101', '12.123456'], ['0', '-1', '1.0000001']]] as const) {
  test(`V26 ${mode} threshold boundaries and six-place precision`, () => {
    for (const value of valid) validateConfiguration({ minUtilMode: mode, minUtilValue: parseMinUtilInput(value, mode), expectedVersion: 0 });
    for (const value of invalid) assert.throws(() => parseMinUtilInput(value, mode));
  });
}
test('Merchandiser sends exactly requestKey/snapshotId and cannot read System Admin policy', async t => {
  setup(t); let calls = 0; const body = { requestKey: payload.requestKey, snapshotId: 2 };
  t.mock.method(globalThis, 'fetch', async (url: RequestInfo | URL, init?: RequestInit) => { calls++; assert.equal(url, '/api/mining/requests'); assert.deepEqual(JSON.parse(String(init?.body)), body); return Response.json(efimRequestFixture(), { status: 202 }); });
  assert.deepEqual((await f05Api.createRequest(body)).algorithms, ['EFIM']); await assert.rejects(f05SystemApi.getConfiguration(), status(403)); assert.equal(calls, 1);
});
for (const role of ['Store Admin', 'System Admin', 'End-Customer'] as const) test(`${role} cannot submit Store mining`, async t => {
  setup(t, role); await assert.rejects(f05Api.createRequest({ snapshotId: 2, requestKey: payload.requestKey }), status(403));
});
for (const extra of [{ storeId: 1 }, { algorithms: ['EFIM'] }, { algorithm: 'HUI_MINER' }, { compareAlgorithms: false }, { minUtilMode: 'PERCENTAGE' }, { minUtilValue: 0.5 }]) test(`Store write rejects obsolete field ${Object.keys(extra)[0]}`, async t => {
  setup(t); await assert.rejects(f05Api.createRequest({ snapshotId: 2, requestKey: payload.requestKey, ...extra }), status(400));
});
test('A legacy two-algorithm response is not accepted as acknowledgement of a new EFIM request', async t => {
  setup(t); t.mock.method(globalThis, 'fetch', async () => Response.json(requestFixture(), { status: 202 })); await assert.rejects(f05Api.createRequest({ snapshotId: 2, requestKey: payload.requestKey }), status(202));
});
test('Progress routes validate identity for Store and explicit System scope', async t => {
  const context = setup(t); const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: RequestInfo | URL) => { urls.push(String(url)); return Response.json(progressFixture()); });
  await f05Api.getProgress(17); context.change({ ...user, role: 'System Admin', storeId: null }); await f05SystemApi.getProgress(1, 17);
  assert.deepEqual(urls, ['/api/mining/requests/17/progress', '/api/system/mining/stores/1/requests/17/progress']);
  t.mock.method(globalThis, 'fetch', async () => Response.json(progressFixture('PENDING', 2))); await assert.rejects(f05SystemApi.getProgress(1, 17), status(200));
  assert.equal('getBenchmark' in f05Api, false); assert.equal('getBenchmark' in f05SystemApi, false); assert.equal('listPatterns' in f05SystemApi, false);
});
for (const [stage, state, completedSteps, percent] of [['QUEUED', 'PENDING', 0, 0], ['RUNNING', 'RUNNING', 0, 0], ['SAVING', 'RUNNING', 1, 50], ['COMPLETED', 'COMPLETED', 2, 100], ['FAILED', 'FAILED', 1, 50], ['LEGACY', 'COMPLETED', 0, 0], ['COMPARING', 'RUNNING', 1, 50]] as const) test(`Progress ${stage} renders backend percentage ${percent}%`, () => {
  const progress = { ...progressFixture(state), stage, completedSteps, percent };
  assert.equal(isMiningProgressView(progress), true);
  const html = renderToStaticMarkup(createElement(MiningProgressCard, { progress, snapshotId: 2 })); assert.ok(html.includes(`aria-valuenow="${percent}"`));
  if (stage === 'FAILED') assert.equal(html.includes('aria-valuenow="100"'), false);
  if (stage === 'LEGACY') assert.ok(html.includes('historical request'));
});
for (const patch of [{ percent: 101 }, { percent: -1 }, { completedSteps: 3 }, { elapsedMs: -1 }, { attemptNo: 0.5 }, { currentRunId: 0 }, { algorithm: 'OTHER' }, { stage: 'SIMULATED' }, { stageStartedAt: 'invalid' }]) test(`Invalid Progress DTO ${JSON.stringify(patch)} rejected`, () => assert.equal(isMiningProgressView({ ...progressFixture(), ...patch }), false));
test('Legacy progress null timing/algorithm and historical HUI-Miner/COMPARING remain readable', () => {
  assert.equal(isMiningProgressView({ ...progressFixture(), stage: 'LEGACY', stageStartedAt: null, elapsedMs: null, timeoutMs: null, algorithm: null }), true);
  assert.equal(isMiningProgressView({ ...progressFixture('RUNNING'), stage: 'COMPARING', algorithm: 'HUI_MINER', comparisonStatus: 'PENDING' }), true);
  assert.equal(isRequestView(requestFixture('COMPLETED')), true);
});
test('Global int64 total above int32 is accepted exactly; unsafe JSON is rejected', async t => {
  setup(t); const large = { ...efimRequestFixture(), totalScaledUtility: 4294967296 }; assert.equal(isRequestView(large), true);
  t.mock.method(globalThis, 'fetch', async () => Response.json(large)); assert.equal((await f05Api.getRequest(17)).totalScaledUtility, 4294967296);
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(large).replace('4294967296', '9007199254740993'))); await assert.rejects(f05Api.getRequest(17), status(200));
});
test('Merchandiser reload/retry keeps key and isolates role, user and Store; legacy drafts never replay', async t => {
  const context = setup(t); const data = storage(t), body = { requestKey: payload.requestKey, snapshotId: 2 }, sent: string[] = [];
  data.set('paspm:f05:system:v2:pending:' + user.id, JSON.stringify({ ...payload, compareAlgorithms: true })); assert.equal(readPendingSubmission(user.id), null);
  t.mock.method(globalThis, 'fetch', async (_url: RequestInfo | URL, init?: RequestInit) => { sent.push(String(init?.body)); if (sent.length === 1) throw Error('offline'); return Response.json(efimRequestFixture(), { status: 202 }); });
  await assert.rejects(sendSubmission(user.id, body), status(null)); assert.deepEqual(readPendingSubmission(user.id), body);
  context.change({ ...user, role: 'Merchandiser', storeId: 2 }); assert.equal(readPendingSubmission(user.id), null);
  context.change({ ...user, role: 'System Admin', storeId: null }); assert.equal(readPendingSubmission(user.id), null);
  context.change({ ...user, role: 'Merchandiser', storeId: 1 }); await sendSubmission(user.id, readPendingSubmission(user.id)!); assert.equal(sent[0], sent[1]); clearPendingSubmission(user.id);
});
for (const [code, error] of [[400, 'Product 7 TWU exceeds SPMF int32 capacity'], [400, 'Transaction utility exceeds SPMF int32 capacity'], [400, 'Converted minUtil exceeds SPMF int32 capacity'], [409, 'Configure mining policy before execution'], [409, 'The lambda policy changed'], [503, 'SPMF unavailable'], [404, 'Utility snapshot not found']]) test(`Backend ${code}: ${error} is preserved without retry or payload changes`, async t => {
  setup(t); let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({ error }, { status: code as number }); });
  await assert.rejects(f05Api.createRequest({ snapshotId: 2, requestKey: payload.requestKey }), e => status(code as number)(e) && (e as Error).message === error); assert.equal(calls, 1);
});
test('Polling accepts recovery decreases, stops terminal, and refreshes final request/runs', async t => {
  setup(t, 'System Admin'); t.mock.timers.enable({ apis: ['setTimeout'] }); const seen: MiningProgress[] = [], urls: string[] = []; let cycle = 0;
  const values = [{ ...progressFixture('RUNNING'), stage: 'SAVING' as const, completedSteps: 1, percent: 50 }, { ...progressFixture('RUNNING'), attemptNo: 2, percent: 0 }, progressFixture('COMPLETED')];
  t.mock.method(globalThis, 'fetch', async (url: RequestInfo | URL) => { const path = String(url); urls.push(path); return Response.json(path.endsWith('/progress') ? values[cycle++] : path.endsWith('/runs') ? [{ ...runFixture(cycle === 3 ? 'COMPLETED' : 'RUNNING'), algorithm: 'EFIM' }] : efimRequestFixture(cycle === 3 ? 'COMPLETED' : 'RUNNING')); });
  const stop = watchMiningRequest(17, p => seen.push(p), e => assert.fail(String(e)), null, systemMiningReader(1)); t.after(stop);
  await flush(); t.mock.timers.tick(1500); await flush(); t.mock.timers.tick(1500); await flush(); t.mock.timers.tick(60000); await flush();
  assert.deepEqual(seen.map(p => p.progress.percent), [50, 0, 100]); assert.equal(cycle, 3); assert.equal(urls.filter(p => p.endsWith('/runs')).length, 3);
});
test('Logout/Store switch aborts a pending progress read before any late result can render', async t => {
  const context = setup(t); let callback = () => {}, signal: AbortSignal | undefined, release!: (r: Response) => void;
  t.mock.method(authService, 'subscribe', (f: () => void) => { callback = f; return () => {}; });
  t.mock.method(globalThis, 'fetch', (_url: RequestInfo | URL, init?: RequestInit) => { signal = init?.signal as AbortSignal; return new Promise<Response>(resolve => { release = resolve; }); });
  const errors: unknown[] = [], stop = watchMiningRequest(17, () => assert.fail('Stale result'), e => errors.push(e)); t.after(stop);
  context.change(null); callback(); assert.equal(signal?.aborted, true); release(Response.json(progressFixture())); await flush(); assert.equal(errors.length, 1);
});
for (const code of [401, 403, 503]) test(`Progress ${code} stops polling until explicit Refresh`, async t => {
  setup(t); t.mock.timers.enable({ apis: ['setTimeout'] }); let calls = 0; const errors: unknown[] = [];
  t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({ error: 'Read refused' }, { status: code }); });
  const stop = watchMiningRequest(17, () => assert.fail('No progress should render'), e => errors.push(e)); t.after(stop);
  await flush(); t.mock.timers.tick(60000); await flush(); assert.equal(calls, 1); assert.ok(status(code)(errors[0]));
});
test('A single foreign Store response is rejected for snapshot, request and run reads', async t => {
  setup(t); const page = (items: unknown[]) => ({ items, page: 0, pageSize: 20, totalElements: items.length });
  for (const [read, body] of [[() => f05Api.listSnapshots(), page([snapshot(2)])], [() => f05Api.listRequests(), page([requestFixture('COMPLETED', 2)])], [() => f05Api.getRequest(17), requestFixture('COMPLETED', 2)], [() => f05Api.getRun(42), runFixture('COMPLETED', 2)], [() => f05Api.listRuns(17), [runFixture('COMPLETED', 2)]]] as const) {
    t.mock.method(globalThis, 'fetch', async () => Response.json(body)); await assert.rejects(read(), status(200));
  }
});
test('Explicit discard recovers corrupt submission data without clearing another role/user', t => {
  setup(t); const data=storage(t), prefix='paspm:f05:efim:v3:Merchandiser:'+encodeURIComponent(user.id);
  data.set(prefix+':store','invalid'); data.set(prefix+':store:1','invalid'); data.set('unrelated-role-pending','keep');
  assert.throws(()=>readPendingSubmission(user.id)); clearPendingSubmission(user.id);
  assert.equal(readPendingSubmission(user.id),null); assert.equal(data.has(prefix+':store:1'),false); assert.equal(data.get('unrelated-role-pending'),'keep');
});
test('System Admin cannot read Store raw patterns, even through the Store API adapter', async t => {
  setup(t, 'System Admin'); await assert.rejects(f05Api.listPatterns(42),status(403));
});

for(const role of ['System Admin','Store Admin','End-Customer'] as const)test(role+' cannot restore or submit manual mining through Frontend',async t=>{
  setup(t,role);const data=storage(t);const key='paspm:f05:efim:v3:System%20Admin:'+encodeURIComponent(user.id)+':store:1';data.set(key,JSON.stringify(payload));let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;throw Error('Unexpected HTTP');});
  assert.equal(readPendingSubmission(user.id),null);
  assert.throws(()=>sendSubmission(user.id,{snapshotId:2,requestKey:payload.requestKey}),status(403));
  await assert.rejects(f05SystemApi.createRequest(payload),status(403));
  assert.equal(data.get(key),JSON.stringify(payload));assert.equal(calls,0);
  const html=renderToStaticMarkup(createElement(MiningSubmissionPanel,{user:{...user,role},storeId:1,selected:snapshot(),confirmedStore:true,onAccepted:()=>{},onLocked:()=>{},onHistory:()=>{}}));assert.equal(html,'');
});
test('Merchandiser review has Run Analysis, frozen snapshot fields, and no quota/settings editor',t=>{
  setup(t);storage(t);
  const html=renderToStaticMarkup(createElement(MiningSubmissionPanel,{user:{...user,role:'Merchandiser',storeId:1},storeId:1,selected:snapshot(),confirmedStore:true,onAccepted:()=>{},onLocked:()=>{},onHistory:()=>{}}));
  for(const label of ['Run Analysis','Sales Period','Analysis Date','Weighted Utility','Algorithm: EFIM'])assert.ok(html.includes(label));
  assert.equal(/remaining runs|next available run|runs per week|runs per month/i.test(html),false);
  assert.equal(html.includes('Minimum Utility Threshold'),false);
});
