import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { setImmediate as flush } from 'node:timers/promises';
import { authService, type AuthUser } from '../src/services/authService';
import { f06Api, F06ApiError } from '../src/features/f06/f06.api';
import { RecommendationRules, RecommendationExpiry, parseRuleInputs, parseRulePercentage, ruleInputs } from '../src/features/f06/f06.settings';
import type { RecPolicy, RecPolicyRequest, RecExpiryPage, RecExpiryParams } from '../src/features/f06/f06.types';
import { policy, expiryPage } from './f06.fixtures';
import { user } from './f05.fixtures';

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function setup(t: TestContext, role: AuthUser['role'] = 'Store Admin') {
  let actor: AuthUser | null = { ...user, role, storeId: 1 }, epoch = 'rules-expiry-test', changed = () => {};
  t.mock.method(authService, 'getCurrentUser', () => actor); t.mock.method(authService, 'getToken', () => actor ? 'fixture-only' : null);
  t.mock.method(authService, 'getSessionId', () => epoch); t.mock.method(authService, 'subscribe', (cb: () => void) => { changed = cb; return () => {}; });
  t.mock.method(authService, 'request', async () => Response.json({}));
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('No live HTTP'); });
  const get = t.mock.method(f06Api, 'getConfig', async () => ({ ...policy }));
  const put = t.mock.method(f06Api, 'updateConfig', async (request: RecPolicyRequest) => ({ ...policy, ...request, version: request.expectedVersion + 1 }));
  const expiry = t.mock.method(f06Api, 'listExpiryPush', async (params: RecExpiryParams = {}) => ({ ...expiryPage(), page: params.page ?? 0, pageSize: params.pageSize ?? 20, totalElements: 45 }));
  return { get, put, expiry, change: (next: AuthUser | null, session = epoch) => { actor = next; epoch = session; changed(); } };
}
async function rules(t: TestContext) { const flow = new RecommendationRules(); t.after(flow.stop); flow.start(); await flush(); return flow; }
async function alerts(t: TestContext) { const flow = new RecommendationExpiry(); t.after(flow.stop); flow.start(); await flush(); return flow; }

test('percentage text conversion preserves all six backend decimal places, without rounding', () => {
  for (const [input, ratio] of [['0', 0], ['100', 1], ['12.3456', 0.123456], ['0.0001', 0.000001], ['99.9999', 0.999999], ['05.500000', 0.055]] as const) {
    assert.equal(parseRulePercentage(input, 'Ratio'), ratio);
    assert.equal(parseRulePercentage(ruleInputs({ ...policy, minSupportRatio: ratio }).supportPercent, 'Ratio'), ratio);
  }
  for (const input of ['', ' ', '-1', '100.0001', '101', '1e1', '1,5', '12.34567', '0.00001', 'Infinity', '.5']) assert.throws(() => parseRulePercentage(input, 'Ratio'));
});
test('rules accept inclusive bounds and reject integer, precision, and version violations', () => {
  const draft = ruleInputs(policy);
  assert.equal(parseRuleInputs({ ...draft, maxBundleSize: '256', minSupportCount: '2147483647', minimumSellableQuantity: '2147483647', supportPercent: '100', confidencePercent: '0' }, 9).maxBundleSize, 256);
  assert.equal(parseRuleInputs({ ...draft, maxBundleSize: '2', minSupportCount: '1', minimumSellableQuantity: '1' }, 1).maxBundleSize, 2);
  for (const [field, value] of [['maxBundleSize', '1'], ['maxBundleSize', '257'], ['maxBundleSize', '2.5'], ['minSupportCount', '0'], ['minSupportCount', '2147483648'], ['minimumSellableQuantity', '0'], ['minimumSellableQuantity', '2147483648'], ['confidencePercent', '50.12345']] as const) assert.throws(() => parseRuleInputs({ ...draft, [field]: value }, 1));
  assert.throws(() => parseRuleInputs(draft, 0));
});
test('Store Admin loads actual config and sends a complete numeric PUT once with the actual version', async t => {
  const f = setup(t); f.get.mock.mockImplementation(async () => ({ ...policy, version: 7, minSupportRatio: 0.123456 })); const flow = await rules(t);
  assert.equal(flow.getSnapshot().draft!.supportPercent, '12.3456'); flow.edit('confidencePercent', '98.7654');
  const wait = deferred<RecPolicy>(); f.put.mock.mockImplementation(() => wait.promise);
  const first = flow.save(); await flow.save(); assert.equal(f.put.mock.callCount(), 1);
  assert.deepEqual(f.put.mock.calls[0].arguments[0], { expectedVersion: 7, maxBundleSize: 4, minSupportCount: 2, minSupportRatio: 0.123456, minConfidence: 0.987654, minimumSellableQuantity: 1 });
  wait.resolve({ ...policy, version: 8, minConfidence: 0.987654 }); await first;
  assert.equal(flow.getSnapshot().policy!.version, 8); assert.equal(flow.getSnapshot().draft!.confidencePercent, '98.7654'); assert.match(flow.getSnapshot().notice, /saved/);
});
test('invalid draft never reaches PUT and remains editable', async t => {
  const f = setup(t); const flow = await rules(t); flow.edit('supportPercent', '0.00001'); await flow.save(); assert.equal(f.put.mock.callCount(), 0); assert.match(flow.getSnapshot().error, /rounding/);
  flow.edit('supportPercent', '0.0001'); await flow.save(); assert.equal(f.put.mock.callCount(), 1);
});
test('409 preserves draft, fetches current policy, and requires explicit reconciliation plus manual save', async t => {
  const f = setup(t), flow = await rules(t); flow.edit('maxBundleSize', '9');
  f.put.mock.mockImplementation(async () => { throw new F06ApiError(409, 'Version conflict'); }); f.get.mock.mockImplementation(async () => ({ ...policy, version: 2, maxBundleSize: 6 }));
  await flow.save(); assert.equal(flow.getSnapshot().draft!.maxBundleSize, '9'); assert.equal(flow.getSnapshot().latest!.maxBundleSize, 6); assert.equal(flow.getSnapshot().policy!.version, 1);
  await flow.save(); assert.equal(f.put.mock.callCount(), 1); flow.acceptLatest(true); assert.equal(flow.getSnapshot().policy!.version, 2); assert.equal(flow.getSnapshot().draft!.maxBundleSize, '9'); assert.equal(f.put.mock.callCount(), 1);
  f.put.mock.mockImplementation(async (request: RecPolicyRequest) => ({ ...policy, ...request, version: 3 })); await flow.save(); assert.equal(f.put.mock.calls.at(-1)!.arguments[0].expectedVersion, 2);
});
test('current rules can replace conflicting edits only by explicit user action', async t => {
  const f = setup(t), flow = await rules(t); flow.edit('maxBundleSize', '9'); f.get.mock.mockImplementation(async () => ({ ...policy, version: 2, maxBundleSize: 6 })); await flow.refresh();
  assert.equal(flow.getSnapshot().draft!.maxBundleSize, '9'); flow.acceptLatest(false); assert.equal(flow.getSnapshot().draft!.maxBundleSize, '6'); assert.equal(f.put.mock.callCount(), 0);
});
test('unknown PUT outcome preserves edits and fences another write even if reconciliation fails', async t => {
  const f = setup(t), flow = await rules(t); flow.edit('maxBundleSize', '9'); f.put.mock.mockImplementation(async () => { throw new F06ApiError(null, 'Response lost'); }); f.get.mock.mockImplementation(async () => { throw new F06ApiError(503, 'Offline'); });
  await flow.save(); await flow.save(); assert.equal(f.put.mock.callCount(), 1); assert.equal(flow.getSnapshot().needsReload, true); assert.equal(flow.getSnapshot().draft!.maxBundleSize, '9');
  f.get.mock.mockImplementation(async () => ({ ...policy, version: 2 })); await flow.refresh(); assert.equal(flow.getSnapshot().latest!.version, 2); assert.equal(f.put.mock.callCount(), 1);
});
test('Merchandiser rules remain read-only even if controller methods are called directly', async t => {
  const f = setup(t, 'Merchandiser'), flow = await rules(t); flow.edit('maxBundleSize', '9'); await flow.save(); assert.equal(f.get.mock.callCount(), 1); assert.equal(f.put.mock.callCount(), 0); assert.equal(flow.getSnapshot().draft!.maxBundleSize, '4');
});
for (const role of ['System Admin', 'End-Customer'] as const) test(`${role} cannot read or modify F06 rules or expiry`, async t => {
  const f = setup(t, role), flow = await rules(t); await flow.save(); assert.equal(f.get.mock.callCount(), 0); assert.equal(f.put.mock.callCount(), 0); flow.stop();
  const expiry = await alerts(t); await expiry.refresh(); assert.equal(f.expiry.mock.callCount(), 0);
});
test('rules clear draft and ignore late PUT after session changes', async t => {
  const f = setup(t), flow = await rules(t); const wait = deferred<RecPolicy>(); f.put.mock.mockImplementation(() => wait.promise); const saving = flow.save();
  f.change(null, 'logged-out'); wait.resolve({ ...policy, version: 99 }); await saving; assert.equal(flow.getSnapshot().policy, null); assert.equal(flow.getSnapshot().draft, null); assert.equal(flow.getSnapshot().notice, '');
});
test('expiry uses only supported filters and pagination, independent of mining and Store date', async t => {
  const f = setup(t, 'Merchandiser'), flow = await alerts(t); await flow.applyFilter(31, 10); await flow.setPage(1);
  assert.deepEqual(f.expiry.mock.calls.at(-1)!.arguments[0], { productId: 31, page: 1, pageSize: 10 });
  const data = flow.getSnapshot().data!; assert.equal(data.timeZone, 'Asia/Ho_Chi_Minh'); assert.equal(data.asOfDate, '2026-11-07'); assert.equal(data.items[0].daysRemaining, 5); assert.equal(data.items[0].remainingQuantity, 10);
  await flow.applyFilter(); assert.deepEqual(f.expiry.mock.calls.at(-1)!.arguments[0], { page: 0, pageSize: 20 });
});
test('expiry invalid IDs/page sizes do not send requests', async t => {
  const f = setup(t), flow = await alerts(t); const before = f.expiry.mock.callCount();
  for (const id of [0, -1, 1.5, 2147483648]) await flow.applyFilter(id); for (const size of [0, 101, 1.5]) await flow.applyFilter(undefined, size);
  assert.equal(f.expiry.mock.callCount(), before);
});
test('empty expiry results preserve page warnings and backend timezone without inventing priorities', async t => {
  const f = setup(t); const empty: RecExpiryPage = { ...expiryPage(), items: [], totalElements: 0, timeZone: 'Pacific/Kiritimati', asOfDate: '2026-11-08', warnings: ['Product metadata missing'] };
  f.expiry.mock.mockImplementation(async () => empty); const flow = await alerts(t); assert.deepEqual(flow.getSnapshot().data, empty); assert.equal(flow.getSnapshot().data!.items.length, 0);
  // The server excludes T=0, expired and today-expiring batches. The frontend
  // consumes the returned empty page; these backend rules are not reimplemented.
});
test('expiry errors clear stale batches, manual refresh recovers, and last-page clamping refetches', async t => {
  const f = setup(t), flow = await alerts(t); f.expiry.mock.mockImplementation(async () => { throw new F06ApiError(403, 'Forbidden'); }); await flow.refresh(); assert.equal(flow.getSnapshot().data, null); assert.match(flow.getSnapshot().error, /403/);
  f.expiry.mock.mockImplementation(async (params?: RecExpiryParams) => ({ ...expiryPage(), page: params?.page ?? 0 })); await flow.setPage(8); assert.equal(flow.getSnapshot().page, 0); assert.equal(flow.getSnapshot().data!.page, 0);
});
test('expiry clears all old Store data and ignores late results on scope change', async t => {
  const f = setup(t), flow = await alerts(t); const wait = deferred<RecExpiryPage>(); f.expiry.mock.mockImplementation(() => wait.promise); const pending = flow.refresh(); f.change(null, 'next-session'); assert.equal(flow.getSnapshot().data, null); assert.deepEqual(flow.getSnapshot().names, {});
  wait.resolve(expiryPage()); await pending; assert.equal(flow.getSnapshot().data, null);
});
