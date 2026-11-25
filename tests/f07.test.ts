import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { authService } from '../src/services/authService';
import { f07f08Api, type LayoutPolicy, type LayoutView, type PlacementRequest } from '../src/features/f07f08/f07f08.api';
import { matchingReport, normalizePositions, placementErrors, savedPlacements, samePlacements } from '../src/features/f07f08/f07.designer';

const placement = (productId: number, blockNo = 1, sourceRecommendationId: number | null = 101): PlacementRequest => ({ productId, zone: 'BUNDLE', blockNo, position: productId, sourceRecommendationId });
const empty = { layoutId: 2, campaignId: 1, snapshotId: 1, role: 'B', status: 'DRAFT', version: 1, placements: [], valid: false, validationErrors: [], weightedUtilityScore: 0 } as unknown as LayoutView;
const policy: LayoutPolicy = { utilityScoreLabel: '', utilityScoreDefinition: '', capacityPolicy: '', zones: [{ zone: 'BUNDLE', recommendationType: 'BUNDLE', maxBlocks: 2, maxProducts: 4 }, { zone: 'BANNER', recommendationType: 'BANNER', maxBlocks: null, maxProducts: null }] };

test('individual placements allow the same F06 source and manual products but reject duplicate products', () => {
  assert.deepEqual(placementErrors([placement(1), placement(2), placement(3, 2, null)], policy), []);
  assert.match(placementErrors([placement(1), placement(1, 2)], policy).join(' '), /only once/);
  assert.match(placementErrors([{ ...placement(1), zone: 'BASELINE' }], policy).join(' '), /Unsupported/);
});
test('capacity counts saved zone/block groups rather than source recommendations', () => {
  assert.match(placementErrors([placement(1, 1), placement(2, 2), placement(3, 3)], policy).join(' '), /maximum 2 blocks/);
  assert.match(placementErrors([1, 2, 3, 4, 5].map(id => placement(id)), policy).join(' '), /maximum 4 products/);
  assert.deepEqual(placementErrors([1, 2, 3, 4, 5].map(id => ({ ...placement(id), zone: 'BANNER' })), policy), []);
});
test('reorder and cross-zone moves generate unique per-zone positions', () => {
  const rows = normalizePositions([placement(3), { ...placement(8), zone: 'BANNER' }, placement(1, 2)]);
  assert.deepEqual(rows.map(row => row.position), [1, 1, 2]);
  assert.deepEqual(rows.map(row => row.productId), [3, 8, 1]);
  assert.deepEqual(placementErrors(rows, policy), []);
});
test('saved products are retained exactly, including partial, manual and invalid placements', () => {
  const rows = [{ ...placement(1), recommendationId: 101, valid: false, validationErrors: ['Inventory changed'] }, { ...placement(2, 2, null), recommendationId: null }];
  const saved = savedPlacements({ ...empty, placements: rows } as unknown as LayoutView);
  assert.deepEqual(saved, [placement(1), placement(2, 2, null)]);
  assert.equal(samePlacements(saved, savedPlacements({ ...empty, placements: rows } as any)), true);
  assert.equal(samePlacements(saved, [placement(1), placement(2, 3, null)]), false);
});
test('campaign decisions attach a report only for the current A/B versions', () => {
  const a = { ...empty, layoutId: 1, version: 3 };
  const report = { layouts: [{ layoutId: 1, layoutVersion: 3 }, { layoutId: 2, layoutVersion: 1 }] } as any;
  assert.equal(matchingReport(report, a, empty), true);
  assert.equal(matchingReport(report, a, { ...empty, version: 2 }), false);
});
function transport(t: TestContext) {
  t.mock.method(authService, 'getCurrentUser', () => ({ id: 'fixture', storeId: 1, role: 'Merchandiser' }) as any);
  t.mock.method(authService, 'getSessionId', () => 'fixture-session');
  const calls: { path: string; init: RequestInit }[] = [];
  let response: (path: string, init: RequestInit) => Response = () => Response.json({});
  t.mock.method(authService, 'request', async (path: string, init: RequestInit) => { calls.push({ path, init }); return response(path, init); });
  return { calls, respond: (fn: typeof response) => { response = fn; } };
}
test('F07 saves exact independent placements and searches snapshot products with server pagination', async t => {
  const f = transport(t); f.respond(() => Response.json(empty));
  const rows = [placement(1), placement(2, 2, null)];
  await f07f08Api.savePlacements(2, 7, rows);
  assert.deepEqual(JSON.parse(String(f.calls.at(-1)!.init.body)), { expectedVersion: 7, placements: rows });
  await f07f08Api.products(1, 'milk & tea', 2, 20);
  const url = new URL(f.calls.at(-1)!.path, 'http://test');
  assert.equal(url.searchParams.get('q'), 'milk & tea');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.has('storeId'), false);
});
test('F07 preserves 409 errors and refuses writes by Store Admin', async t => {
  const f = transport(t); f.respond(() => Response.json({ error: 'Layout version is stale' }, { status: 409 }));
  await assert.rejects(f07f08Api.savePlacements(2, 1, [placement(1)]), (error: any) => error.status === 409 && /stale/.test(error.message));
  t.mock.method(authService, 'getCurrentUser', () => ({ id: 'fixture', storeId: 1, role: 'Store Admin' }) as any);
  await assert.rejects(f07f08Api.savePlacements(2, 1, [placement(1)]), /role/);
  assert.equal(f.calls.length, 1);
});
test('cancelled and changed-session reads are discarded', async t => {
  const f = transport(t);
  const controller = new AbortController();
  f.respond(() => { controller.abort(); return Response.json(empty); });
  await assert.rejects(f07f08Api.layout(2, controller.signal), (error: any) => error.name === 'AbortError');
  f.respond(() => { t.mock.method(authService, 'getSessionId', () => 'changed'); return Response.json(empty); });
  await assert.rejects(f07f08Api.layout(2), /session changed/);
});
