import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { authService } from '../src/services/authService';
import { f07f08Api, type LayoutPolicy, type LayoutView, type RecommendationOption } from '../src/features/f07f08/f07f08.api';
import { addPlacements, draftErrors, groupedPlacements, matchingReport, movePlacement, placementRequest, samePlacements, shiftPlacement, type DraftPlacement } from '../src/features/f07f08/f07.designer';

const option = (id: number, products: number[], type: RecommendationOption['type'] = 'BUNDLE'): RecommendationOption => ({ recommendationId: id, productIds: products, type, snapshotId: 1, utility: 25, version: 1 });
const empty = { layoutId: 2, campaignId: 1, snapshotId: 1, role: 'B', status: 'DRAFT', version: 1, placements: [], valid: false, validationErrors: [], weightedUtilityScore: 0, equalSizeBaselineScore: 0, equalSizeProductCount: 0 } as unknown as LayoutView;
const policy: LayoutPolicy = { utilityScoreLabel: '', utilityScoreDefinition: '', capacityPolicy: '', zones: [{ zone: 'BUNDLE', recommendationType: 'BUNDLE', maxBlocks: 2, maxProducts: 4 }, { zone: 'BANNER', recommendationType: 'BANNER', maxBlocks: null, maxProducts: null }] };
const recommendations = [option(1, [1, 2]), option(2, [3, 4]), option(3, [1, 5]), option(4, [6, 7]), option(5, [8], 'BANNER')];

const manual: DraftPlacement = {
  productId: 7, zone: 'BUNDLE', blockNo: 4, position: 3, sourceRecommendationId: null,
  recommendationId: null, recommendationType: null, sku: 'SKU-7', productName: 'Seven',
  snapshotWeightedUtility: 14, valid: true, validationErrors: [],
};
const sourced = { ...manual, productId: 8, blockNo: 4, position: 5, recommendationId: 88, sourceRecommendationId: 88 };

test('F07 validates capacity by actual zone/block and rejects duplicate products or positions', () => {
  assert.deepEqual(draftErrors([manual, sourced], policy), []);
  assert.match(draftErrors([manual, { ...sourced, position: 3 }], policy).join(' '), /Position 3/);
  assert.match(draftErrors([manual, { ...sourced, productId: 7 }], policy).join(' '), /only once/);
  assert.match(draftErrors([manual, { ...sourced, blockNo: 5 }, { ...sourced, productId: 9, blockNo: 6, position: 8 }], policy).join(' '), /maximum 2 blocks/);
  assert.match(draftErrors([manual, sourced], { ...policy, zones: [{ ...policy.zones[0], maxProducts: 1 }] }).join(' '), /maximum 1 products/);
  assert.match(draftErrors([{ ...manual, blockNo: 0, position: -1 }], policy).join(' '), /positive/);
  assert.match(draftErrors([{ ...manual, zone: 'BASELINE' }], policy).join(' '), /No editable zone/);
  assert.deepEqual(draftErrors([{ ...manual, zone: 'BANNER', blockNo: 50 }], policy), []);
});

test('moving or removing one placement preserves unrelated rows and exact provenance', () => {
  const rows = [manual, sourced];
  assert.deepEqual(groupedPlacements(rows, 'BUNDLE').map(group => group.blockNo), [4]);
  const shifted = shiftPlacement(rows, 8, -1);
  assert.equal(shifted[1].position, 3);
  assert.equal(shifted[0].position, 5);
  assert.equal(samePlacements(rows, shifted), false);
  assert.equal(samePlacements(rows, [sourced, manual]), true);
  const moved = movePlacement(rows, 8, 'BANNER');
  assert.equal(moved[0], manual);
  assert.deepEqual(placementRequest(moved[1]), { productId: 8, zone: 'BANNER', blockNo: 1, position: 1, sourceRecommendationId: 88 });
  assert.equal(placementRequest(rows.filter(row => row.productId !== 8)[0]).sourceRecommendationId, null);
  assert.deepEqual(draftErrors(rows, policy), [], 'an existing source need not still appear in the ready recommendation picker');
});

test('adds one recommendation product independently and will not recreate absent members on save', () => {
  const rows = addPlacements([manual], 'BUNDLE', [1], new Map(), recommendations[0]);
  assert.deepEqual(rows.map(placementRequest), [placementRequest(manual),
    { productId: 1, zone: 'BUNDLE', blockNo: 5, position: 4, sourceRecommendationId: 1 }]);
  assert.equal(addPlacements(rows, 'BUNDLE', [1, 2], new Map(), recommendations[0]).filter(row => row.productId === 1).length, 1);
  assert.equal(addPlacements(rows, 'BUNDLE', [99], new Map(), null).length, rows.length, 'manual product needs eligible snapshot data');
});

test('campaign decisions attach a report only for the exact current A/B versions', () => {
  const a = { ...empty, layoutId: 1, version: 3 };
  const report = { layouts: [{ layoutId: 1, layoutVersion: 3 }, { layoutId: 2, layoutVersion: 1 }] } as any;
  assert.equal(matchingReport(report, a, empty), true);
  assert.equal(matchingReport(report, a, { ...empty, version: 2 }), false);
  assert.equal(matchingReport(null, a, empty), false);
});

function transport(t: TestContext) {
  t.mock.method(authService, 'getCurrentUser', () => ({ id: 'fixture', storeId: 1, role: 'Merchandiser' }) as any);
  t.mock.method(authService, 'getSessionId', () => 'fixture-session');
  const calls: { path: string; init: RequestInit }[] = [];
  let response: (path: string, init: RequestInit) => Response = () => Response.json({});
  t.mock.method(authService, 'request', async (path: string, init: RequestInit) => { calls.push({ path, init }); return response(path, init); });
  return { calls, respond: (fn: typeof response) => { response = fn; } };
}

test('F07 reads all recommendation pages, preserves Store scope and submits only contract fields', async t => {
  const f = transport(t);
  f.respond(path => Response.json({ items: path.includes('page=0&') ? recommendations.slice(0, 2) : recommendations.slice(2), totalElements: 5, page: 0, pageSize: 2 }));
  const page = await f07f08Api.recommendations(1);
  assert.equal(page.items.length, 5);
  assert.equal(f.calls.length, 2);
  assert.ok(f.calls.every(call => !call.path.includes('storeId')));
  f.respond(() => Response.json(empty));
  const placements = [
    { productId: 1, zone: 'BUNDLE' as const, blockNo: 2, position: 1, sourceRecommendationId: 10, sku: 'display-only' },
    { productId: 2, zone: 'CROSS_SELL' as const, blockNo: 1, position: 1, sourceRecommendationId: null },
  ];
  await f07f08Api.savePlacements(2, 7, placements);
  assert.deepEqual(JSON.parse(String(f.calls.at(-1)!.init.body)), { expectedVersion: 7, placements: [
    { productId: 1, zone: 'BUNDLE', blockNo: 2, position: 1, sourceRecommendationId: 10 },
    placements[1],
  ] });
  await f07f08Api.preview(2);
  assert.equal(f.calls.at(-1)!.path, '/api/layouts/2/preview');
});

test('F07 preserves 409 errors and refuses writes by Store Admin', async t => {
  const f = transport(t);
  f.respond(() => Response.json({ error: 'Layout version is stale' }, { status: 409 }));
  await assert.rejects(f07f08Api.savePlacements(2, 1, [placementRequest(manual)]), (error: any) => error.status === 409 && /stale/.test(error.message));
  t.mock.method(authService, 'getCurrentUser', () => ({ id: 'fixture', storeId: 1, role: 'Store Admin' }) as any);
  await assert.rejects(f07f08Api.savePlacements(2, 1, [placementRequest(manual)]), /role/);
  assert.equal(f.calls.length, 1);
  f.respond(() => Response.json({ defaultLayout: true, campaign: null, layout: null }));
  assert.equal((await f07f08Api.rollback(1, 1)).defaultLayout, true);
});

test('layout requests discard responses across a changed Store session', async t => {
  transport(t).respond(() => { t.mock.method(authService, 'getSessionId', () => 'changed'); return Response.json(empty); });
  await assert.rejects(f07f08Api.layout(2), /session changed/);
});

test('cancelled layout reads cannot overwrite a newer campaign selection', async t => {
  const controller = new AbortController();
  transport(t).respond(() => { controller.abort(); return Response.json(empty); });
  await assert.rejects(f07f08Api.layout(2, controller.signal), (error: any) => error.name === 'AbortError');
});

test('F07 queries paginated snapshot products without inventing a Store input', async t => {
  const f = transport(t);
  const result = { items: [{ productId: 7, sku: 'SKU-7', productName: 'Tea', productStatus: 'ACTIVE', deleted: false,
    sellableQuantity: 4, snapshotWeightedUtility: 11, eligible: true, validationErrors: [] }], page: 2, pageSize: 20, totalElements: 41 };
  f.respond(() => Response.json(result));
  assert.deepEqual(await f07f08Api.snapshotProducts(5, 'tea & milk', 2, 20), result);
  const url = new URL(f.calls[0].path, 'http://localhost');
  assert.equal(url.pathname, '/api/layouts/products');
  assert.deepEqual(Object.fromEntries(url.searchParams), { snapshotId: '5', q: 'tea & milk', page: '2', pageSize: '20' });
});
