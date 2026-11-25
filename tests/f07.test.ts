import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { authService } from '../src/services/authService';
import { f07f08Api, type LayoutPolicy, type LayoutView, type RecommendationOption } from '../src/features/f07f08/f07f08.api';
import { designerBlocks, draftErrors, matchingReport, moveBlock, placementIds, sameIds } from '../src/features/f07f08/f07.designer';

const option = (id: number, products: number[], type: RecommendationOption['type'] = 'BUNDLE'): RecommendationOption => ({ recommendationId: id, productIds: products, type, snapshotId: 1, utility: 25, version: 1 });
const empty = { layoutId: 2, campaignId: 1, snapshotId: 1, role: 'B', status: 'DRAFT', version: 1, placements: [], valid: false, validationErrors: [], weightedUtilityScore: 0, equalSizeBaselineScore: 0, equalSizeProductCount: 0 } as unknown as LayoutView;
const policy: LayoutPolicy = { utilityScoreLabel: '', utilityScoreDefinition: '', capacityPolicy: '', zones: [{ zone: 'BUNDLE', recommendationType: 'BUNDLE', maxBlocks: 2, maxProducts: 4 }, { zone: 'BANNER', recommendationType: 'BANNER', maxBlocks: null, maxProducts: null }] };
const recommendations = [option(1, [1, 2]), option(2, [3, 4]), option(3, [1, 5]), option(4, [6, 7]), option(5, [8], 'BANNER')];

test('F07 validates whole-block capacities and overlapping products before saving', () => {
  const blocks = designerBlocks(recommendations, empty);
  assert.deepEqual(draftErrors([1, 2], blocks, policy), []);
  assert.match(draftErrors([1, 3], blocks, policy).join(' '), /Product #1 appears/);
  assert.match(draftErrors([1, 2, 4], blocks, policy).join(' '), /maximum 2 groups/);
  assert.match(draftErrors([1, 2, 4], blocks, policy).join(' '), /maximum 4 products/);
  assert.match(draftErrors([1, 1], blocks, policy).join(' '), /only once/);
  assert.match(draftErrors([999], blocks, policy).join(' '), /no longer available/);
});

test('F07 treats absent capacity as unbounded and rejects unknown zones', () => {
  const blocks = designerBlocks([option(1, Array.from({ length: 40 }, (_, i) => i + 1), 'BANNER')], empty);
  assert.deepEqual(draftErrors([1], blocks, policy), []);
  assert.match(draftErrors([1], blocks, { ...policy, zones: [] }).join(' '), /No section/);
});

test('saved ineligible recommendations remain visible with all product evidence and cannot be resaved', () => {
  const saved = { ...empty, placements: [{ recommendationId: 88, recommendationType: 'BUNDLE', productId: 12, validationErrors: ['Inventory changed'] }, { recommendationId: 88, recommendationType: 'BUNDLE', productId: 13, validationErrors: [] }] } as LayoutView;
  assert.deepEqual(placementIds(saved), [88]);
  const blocks = designerBlocks([], saved);
  assert.equal(blocks.get(88)?.eligible, false);
  assert.deepEqual(blocks.get(88)?.productIds, [12, 13]);
  assert.match(blocks.get(88)!.errors.join(' '), /Inventory changed/);
  assert.match(draftErrors([88], blocks, policy).join(' '), /no longer available/);
});

test('reordering preserves complete blocks and does not move them into other zone types', () => {
  const blocks = designerBlocks(recommendations, empty);
  assert.deepEqual(moveBlock([1, 2, 5], 2, 1, blocks), [2, 1, 5]);
  assert.deepEqual(moveBlock([1, 2, 5], 1, 5, blocks), [1, 2, 5]);
  assert.equal(sameIds([1, 2], [2, 1]), false);
  assert.equal(sameIds([1, 2], [1, 2]), true);
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
  await f07f08Api.savePlacements(2, 7, [1, 2]);
  assert.deepEqual(JSON.parse(String(f.calls.at(-1)!.init.body)), { expectedVersion: 7, recommendationIds: [1, 2] });
  await f07f08Api.preview(2);
  assert.equal(f.calls.at(-1)!.path, '/api/layouts/2/preview');
});

test('F07 preserves 409 errors and refuses writes by Store Admin', async t => {
  const f = transport(t);
  f.respond(() => Response.json({ error: 'Layout version is stale' }, { status: 409 }));
  await assert.rejects(f07f08Api.savePlacements(2, 1, [1]), (error: any) => error.status === 409 && /stale/.test(error.message));
  t.mock.method(authService, 'getCurrentUser', () => ({ id: 'fixture', storeId: 1, role: 'Store Admin' }) as any);
  await assert.rejects(f07f08Api.savePlacements(2, 1, [1]), /role/);
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
