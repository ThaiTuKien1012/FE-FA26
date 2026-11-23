import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { StoreExpiryTable } from '../src/features/f03/components/ProductScores';
import { FrozenConfiguration, Matrix, MatrixMetadata } from '../src/features/f03/components/UtilityMatrix';
import { Warnings } from '../src/features/f03/components/F03Shared';
import { configErrors, draftFromConfig, enabledTotal, millionths, periodError, previewEligible, validScore, validLambda, seasonErrors, seasonRequest, complement } from '../src/features/f03/f03.validation';
import { configView, matrix, legacyMatrix, scores, season, snapshot } from './f03.fixtures';
import { authService, ROLE_PERMISSIONS, SCREEN_OWNER_MAP, type AuthUser } from '../src/services/authService';
import { user } from './f05.fixtures';
import { getPathForScreen, getScreenFromPathname } from '../src/utils/navigationRouter';
import { f03Api, F03ApiError, type F03PushPage } from '../src/features/f03/f03.api';

const draft = () => draftFromConfig(configView.config);
function setup(t: TestContext, role: AuthUser['role'] = 'Merchandiser') {
  let actor: AuthUser | null = { ...user, role, storeId: 1 }, response: () => Promise<Response> = async () => Response.json(configView);
  const calls: { path: string; method: string; body: any }[] = [];
  t.mock.method(authService, 'getCurrentUser', () => actor);
  t.mock.method(authService, 'getToken', () => 'fixture-only');
  t.mock.method(authService, 'request', async (path: string, init: RequestInit = {}) => { calls.push({ path, method: init.method || 'GET', body: init.body ? JSON.parse(String(init.body)) : undefined }); return response(); });
  return { calls, role(value: AuthUser['role'] | null) { actor = value ? { ...user, role: value, storeId: 1 } : null; }, respond(fn: typeof response) { response = fn; } };
}
test('W2 alpha + beta use exact millionths; complementary editing preserves six places', () => {
  assert.deepEqual(configErrors(draft(), configView.lambdaPolicy), []);
  assert.equal(enabledTotal({ alpha: '0.333333', beta: '0.666667' }), 1000000n);
  assert.ok(configErrors({ ...draft(), alpha: '0.599999' }, configView.lambdaPolicy).length);
  assert.ok(configErrors({ ...draft(), alpha: '0.5000001' }, configView.lambdaPolicy).length);
  assert.equal(millionths('0.000001'), 1n);
  assert.equal(complement('0.333333'), '0.666667'); assert.equal(complement('1'), '0'); assert.equal(complement('0'), '1');
  assert.equal(complement('0.1234567'), null);
});
test('Lambda boundaries, finite numeric precision and sales window follow live W2 constraints', () => {
  for (const lambda of ['0', '0.5', '0.123456']) assert.deepEqual(configErrors({ ...draft(), lambda }, configView.lambdaPolicy), []);
  for (const lambda of ['', '-0.1', '0.500001', '0.1234567', 'NaN', 'Infinity', '1e-3']) assert.ok(configErrors({ ...draft(), lambda }, configView.lambdaPolicy).length);
  assert.equal(validLambda('1000000000000000000000000'), false);
  for (const lambda of ['9007199254740993', '999999999999999999999999']) assert.equal(validLambda(lambda), true);
  assert.equal(validLambda('100000000000000000000000'), true);
  for (const salesWindowDays of ['0', '366', '1.5', '', 'NaN']) assert.ok(configErrors({ ...draft(), salesWindowDays }, configView.lambdaPolicy).length);
  for (const salesWindowDays of ['1', '365']) assert.deepEqual(configErrors({ ...draft(), salesWindowDays }, configView.lambdaPolicy), []);
});
test('Season validation: names, date inclusivity and exact six-place weights', () => {
  const value = { name: ' Holiday ', startDate: '2026-11-05', endDate: '2026-11-05', weight: '0.999999' };
  assert.deepEqual(seasonErrors(value), {}); assert.equal(seasonRequest(value).name, 'Holiday');
  for (const name of ['', '   ', 'x'.repeat(101)]) assert.ok(seasonErrors({ ...value, name }).name);
  assert.equal(seasonErrors({ ...value, name: 'x'.repeat(100) }).name, undefined);
  assert.ok(seasonErrors({ ...value, endDate: '2026-11-04' }).endDate);
  for (const weight of ['', '-1', '1.000001', '0.1234567', 'Infinity', '1e-3']) { assert.equal(validScore(weight), false); assert.throws(() => seasonRequest({ ...value, weight })); }
  for (const weight of ['0', '1', '0.000001']) assert.equal(validScore(weight), true);
});
test('sales dates require real calendar dates and independent Analysis Date', () => {
  assert.equal(periodError({ rangeStart: '2026-10-01', rangeEnd: '2026-10-31', asOfDate: '2026-09-01' }), '');
  assert.ok(periodError({ rangeStart: '2026-10-31', rangeEnd: '2026-10-01', asOfDate: '2026-11-05' }));
  for (const bad of ['', '2026-02-30', '2026-13-01', '0000-01-01']) assert.ok(periodError({ rangeStart: bad, rangeEnd: '2026-11-05', asOfDate: '2026-11-05' }));
});
test('ready and nonempty Preview required; missing Push Day and slow-moving warnings are nonblocking', () => {
  assert.equal(previewEligible(matrix()), true);
  assert.equal(previewEligible({ ...matrix(), warnings: ['MISSING_PUSH_DAY', 'SLOW_MOVING_NO_RECENT_SALES'] }), true);
  assert.equal(previewEligible({ ...matrix(), ready: false }), false);
  assert.equal(previewEligible({ ...matrix(), totalElements: 0 }), false);
  assert.equal(previewEligible({ ...matrix(), totalWeightedUtility: null }), false);
  assert.equal(previewEligible(null), false);
  const html = renderToStaticMarkup(createElement(Warnings, { warnings: ['MISSING_PUSH_DAY', 'SLOW_MOVING_NO_RECENT_SALES'] }));
  assert.match(html, /no Push Day/); assert.match(html, /No recent sales/);
});
test('five routes, retired expiry-window links and role permissions preserve isolation', () => {
  for (const screen of ['f03-configuration', 'f03-seasons', 'f03-product-scores', 'f03-preview', 'f03-snapshots'] as const) assert.equal(getScreenFromPathname(getPathForScreen(screen)), screen);
  assert.equal(getScreenFromPathname('/f03/snapshot'), 'f03-snapshots'); assert.equal(getScreenFromPathname('/f03/expiry-window'), 'f03-product-scores');
  assert.equal(getScreenFromPathname('/f03/snapshot/matrix'), 'f03-snapshot-matrix');
  for (const role of ['Merchandiser', 'Store Admin'] as const) assert.ok(ROLE_PERMISSIONS[role].allowedScreens.includes('f03-seasons'));
  for (const role of ['System Admin', 'End-Customer'] as const) assert.ok(!ROLE_PERMISSIONS[role].allowedScreens.includes('f03-seasons'));
  assert.deepEqual(SCREEN_OWNER_MAP['f03-snapshot-detail']?.allowedRoles, ['Merchandiser']);
});
test('live request allowlists strip legacy fields, Store IDs and expectedVersion on create', async t => {
  const f = setup(t); await f03Api.updateConfig({ ...configView.config, gamma: 1, enableStock: true, storeId: 99 } as any);
  assert.deepEqual(f.calls.at(-1)?.body, { alpha: 0.6, beta: 0.4, lambda: 0.3, salesWindowDays: 30 });
  f.respond(async () => Response.json(season));
  await f03Api.createSeason({ ...season, expectedVersion: 99 } as any); assert.deepEqual(f.calls.at(-1)?.body, { name: 'Holiday', startDate: '2026-11-01', endDate: '2026-12-31', weight: 0.8 });
  await f03Api.updateSeason(1, { ...season, expectedVersion: 2 }); assert.equal(f.calls.at(-1)?.body.expectedVersion, 2);
  f.role('System Admin'); f.respond(async () => Response.json(configView.lambdaPolicy)); await f03Api.updatePolicy({ lambdaMax: 0.4, lambdaMin: 0.1 } as any); assert.deepEqual(f.calls.at(-1)?.body, { lambdaMax: 0.4 });
  assert.equal('updateScores' in f03Api, false); assert.equal('updateExpiryWindow' in f03Api, false);
});
test('assignment accepts empty 201 and idempotent empty 200; unassign/delete accept 204', async t => {
  const f = setup(t);
  for (const status of [201, 200]) { f.respond(async () => new Response(null, { status })); assert.equal(await f03Api.assignProduct(1, 121), undefined); }
  f.respond(async () => new Response(null, { status: 204 })); await f03Api.unassignProduct(1, 121); await f03Api.deleteSeason(1);
  assert.deepEqual(f.calls.map(c => [c.path, c.method]), [['/api/utility/seasons/1/products/121', 'PUT'], ['/api/utility/seasons/1/products/121', 'PUT'], ['/api/utility/seasons/1/products/121', 'DELETE'], ['/api/utility/seasons/1', 'DELETE']]);
});
test('Store Admin reads only; denied roles issue no feature requests', async t => {
  const f = setup(t, 'Store Admin');
  await f03Api.getConfig(); f.respond(async () => Response.json(scores)); await f03Api.getScores(1);
  f.respond(async () => Response.json({ items: [], page: 0, pageSize: 20, totalElements: 0 }));
  await f03Api.listSeasons(); await f03Api.getSeason(1); await f03Api.seasonProducts(1); await f03Api.listSnapshots(); await f03Api.getExpiryPushBatches();
  const before = f.calls.length;
  for (const operation of [() => f03Api.createSeason(season), () => f03Api.updateSeason(1, { ...season, expectedVersion: 2 }), () => f03Api.deleteSeason(1), () => f03Api.assignProduct(1, 1), () => f03Api.unassignProduct(1, 1), () => f03Api.updateConfig(configView.config), () => f03Api.preview(snapshot()), () => f03Api.createSnapshot(snapshot()), () => f03Api.getSnapshot(1), () => f03Api.getMatrix(1), () => f03Api.getPolicy()]) await assert.rejects(operation, (e: F03ApiError) => e.status === 403);
  for (const role of ['System Admin', 'End-Customer', null] as const) { f.role(role); await assert.rejects(() => f03Api.listSeasons()); await assert.rejects(() => f03Api.getScores(1)); }
  assert.equal(f.calls.length, before);
});
test('push-batch filters, paginated history, preview and snapshot use exact API payloads', async t => {
  const f = setup(t); f.respond(async () => Response.json(matrix()));
  await f03Api.getExpiryPushBatches({ productId: 121, asOfDate: '2026-11-05', page: 2, pageSize: 20, expiryPushDays: 10 } as any);
  assert.equal(f.calls.at(-1)?.path, '/api/utility/expiry-push-batches?productId=121&asOfDate=2026-11-05&page=2&pageSize=20');
  await f03Api.listSnapshots(2, 20); assert.equal(f.calls.at(-1)?.path, '/api/mining/snapshots?page=2&pageSize=20');
  await f03Api.preview({ ...snapshot(), page: 1, pageSize: 20 }); assert.deepEqual(f.calls.at(-1)?.body, { rangeStart: '2026-10-01', rangeEnd: '2026-10-31', asOfDate: '2026-11-05', page: 1, pageSize: 20 });
  f.respond(async () => Response.json(snapshot())); await f03Api.createSnapshot({ ...snapshot(), page: 1 } as any); assert.deepEqual(Object.keys(f.calls.at(-1)!.body).sort(), ['asOfDate', 'rangeEnd', 'rangeStart']);
});
for (const status of [400, 401, 403, 404, 405, 409, 500, 503]) test(`HTTP ${status} is readable and never auto-retried`, async t => {
  const f = setup(t); f.respond(async () => new Response('gateway', { status }));
  await assert.rejects(() => f03Api.createSnapshot(snapshot()), (e: F03ApiError) => e.status === status && Boolean(e.message)); assert.equal(f.calls.length, 1);
});
test('version conflict and unsupported scoring versions surface without retries or conversion', async t => {
  const f = setup(t); f.respond(async () => Response.json({ error: 'Season was changed by another request; reload it' }, { status: 409 }));
  await assert.rejects(() => f03Api.updateSeason(1, { ...season, expectedVersion: 2 }), /reload/); assert.equal(f.calls.length, 1);
  f.respond(async () => Response.json({ ...snapshot(), configuration: { ...matrix().configuration, config: { ...configView.config, scoringVersion: 'FUTURE_V9' } } }));
  await assert.rejects(() => f03Api.getSnapshot(1), (e: F03ApiError) => e.code === 'UNSUPPORTED_SCORING_VERSION');
  f.respond(async () => Response.json({ ...configView, config: { ...configView.config, scoringVersion: 'F03_LINEAR_V1' } })); await assert.rejects(() => f03Api.getConfig(), (e: F03ApiError) => e.code === 'UNSUPPORTED_SCORING_VERSION');
});
test('session change fences delayed response and network failure sends one POST only', async t => {
  const f = setup(t); f.respond(async () => { f.role('Store Admin'); return Response.json(matrix()); }); await assert.rejects(() => f03Api.preview(snapshot()), (e: F03ApiError) => e.status === 401);
  f.role('Merchandiser'); f.respond(async () => { throw new TypeError('offline'); }); const before = f.calls.length; await assert.rejects(() => f03Api.createSnapshot(snapshot()), /offline/); assert.equal(f.calls.length, before + 1);
});
test('W2 and both frozen legacy models render stored evidence, nulls and hashes without mutation', async t => {
  const f = setup(t);
  for (const result of [matrix(), legacyMatrix(), legacyMatrix('EXPIRY_PRODUCT_EARLIEST_BATCH_BINARY_V1')]) {
    const before = JSON.stringify(result); f.respond(async () => Response.json(result)); assert.deepEqual(await f03Api.getMatrix(21), result);
    const html = renderToStaticMarkup(createElement(Matrix, { result, loadPage() {}, busy: false }));
    const frozen = renderToStaticMarkup(createElement(FrozenConfiguration, { configuration: result.configuration }));
    const metadata = renderToStaticMarkup(createElement(MatrixMetadata, { result }));
    assert.match(html, /Unavailable/); assert.match(metadata, new RegExp(result.matrixHash));
    if (result.configuration?.config.scoringVersion === 'W2_EXPIRY_SEASON_V1') { assert.match(html, /Expiry Risk/); assert.match(frozen, /Frozen Seasons/); } else { assert.match(frozen, /Historical scoring model/); assert.match(html, /expiryPushDays/); }
    assert.equal(JSON.stringify(result), before);
  }
});
test('push table displays negative days, nullable expiry and quantities without legacy thresholds', () => {
  const page: F03PushPage = { items: [{ productId: 1, batchId: 9, pushDay: '2026-11-03', expiryDate: null, remainingQuantity: 50, daysToPush: -2 }], page: 0, pageSize: 20, totalElements: 1, asOfDate: '2026-11-05', timeZone: 'Asia/Ho_Chi_Minh', warnings: [] };
  const before = JSON.stringify(page), html = renderToStaticMarkup(createElement(StoreExpiryTable, { result: page, names: new Map([[1, 'Fresh milk']]) }));
  for (const text of ['Fresh milk', 'Batch #9', '2 days overdue', 'No expiry date', 'Push Day']) assert.ok(html.includes(text));
  for (const text of ['Days Remaining', 'expiryPushDays', 'pushRequired']) assert.equal(html.includes(text), false);
  assert.equal(JSON.stringify(page), before);
  page.items[0].daysToPush = 0; assert.match(renderToStaticMarkup(createElement(StoreExpiryTable, { result: page, names: new Map() })), /Due today/);
});
