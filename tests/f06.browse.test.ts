import assert from './f06.assert';
import { test, type TestContext } from 'node:test';
import { setImmediate as flush } from 'node:timers/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { authService, type AuthUser } from '../src/services/authService';
import { f05Api } from '../src/features/f05/f05.api';
import { f06Api, F06ApiError } from '../src/features/f06/f06.api';
import { RecommendationBrowser, readRecommendationProductNames } from '../src/features/f06/f06.browse';
import type { RecListParams, RecPage, RecView } from '../src/features/f06/f06.types';
import { F06RecommendationTable } from '../src/features/f06/components/F06RecommendationTable';
import { F06RecommendationDetailContent } from '../src/features/f06/components/F06RecommendationDetails';
import { F06RecommendationOptions } from '../src/features/f06/components/F06RecommendationGroupDetails';
import { F06DashboardContent } from '../src/features/f06/components/F06DashboardView';
import { RecommendationBadge, RecommendationProduct, recommendationPercent, recommendationValue, recommendationReadiness, recommendationNumber } from '../src/features/f06/components/F06ReadShared';
import { eligibility, recommendation } from './f06.fixtures';
import { user, requestFixture, runFixture } from './f05.fixtures';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const resultPage = (params: RecListParams = {}, items: RecView[] = [recommendation()], totalElements = items.length): RecPage => ({
  items:items.map(item=>params.type?{...item,type:params.type}:item), page: params.page ?? 0, pageSize: params.pageSize ?? 20, totalElements,
  ordering: params.miningRunId === undefined ? 'CREATED_DESC' : 'RANKED_WITHIN_SOURCE_RUN'
});
function setup(t: TestContext, role: AuthUser['role'] = 'Merchandiser') {
  let currentUser: AuthUser | null = { ...user, role, storeId: 1 };
  let sessionId = 'fixture-session';
  let notify = () => {};
  t.mock.method(authService, 'getCurrentUser', () => currentUser);
  t.mock.method(authService, 'getToken', () => currentUser ? 'fixture-access' : null);
  t.mock.method(authService, 'getSessionId', () => sessionId);
  t.mock.method(authService, 'subscribe', (callback: () => void) => { notify = callback; return () => { notify = () => {}; }; });
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected live fetch'); });
  const products = t.mock.method(authService, 'request', async (input: RequestInfo | URL) => {
    const id = Number(String(input).split('/').at(-1)); return Response.json({ id, name: 'Product ' + id });
  });
  const list = t.mock.method(f06Api, 'list', async (params: RecListParams = {}) => resultPage(params));
  const detail = t.mock.method(f06Api, 'get', async (id: number) => recommendation({ recommendationId:id,type:workflow.getSnapshot().filters.type??'BUNDLE' }));
  const requests = t.mock.method(f05Api, 'listRequests', async () => ({ items: [{ ...requestFixture('FAILED'), comparisonStatus: 'FAILED' as const }], page: 0, pageSize: 20, totalElements: 1 }));
  const runs = t.mock.method(f05Api, 'listRuns', async () => [runFixture('COMPLETED')]);
  t.mock.method(f05Api,'getRun',async (id:number)=>({...runFixture('COMPLETED',currentUser?.storeId??1),runId:id}));
  t.mock.method(f05Api,'getRequest',async ()=>requestFixture('FAILED',currentUser?.storeId??1));
  const workflow = new RecommendationBrowser(); t.after(workflow.stop);
  return { workflow, list, detail, requests, runs, products,
    change: (next: AuthUser | null, session = sessionId) => { currentUser = next; sessionId = session; notify(); } };
}
async function startSelected(workflow:RecommendationBrowser) { workflow.start();void workflow.selectSource(42);await flush(); }
const table = (data: RecPage) => renderToStaticMarkup(createElement(F06RecommendationTable, { data, onOpen: () => {} }));
const content = (item: RecView) => renderToStaticMarkup(createElement(F06RecommendationDetailContent, { item }));

test('selected-run list preserves backend order and cached product names without fabricated KPIs', async t => {
  const f = setup(t); const items = [recommendation({ recommendationId: 80, utility: 1 }), recommendation({ recommendationId: 62, utility: 999 })];
  f.list.mock.mockImplementation(async (params: RecListParams = {}) => resultPage(params, items));
  await startSelected(f.workflow);
  assert.deepEqual(f.workflow.getSnapshot().list?.items, items);
  assert.equal(f.list.mock.calls[0].arguments[0]?.miningRunId, 42); assert.equal(f.products.mock.callCount(), 2);
  const html = table(f.workflow.getSnapshot().list!);
  assert.ok(html.indexOf('data-candidate-id="80"') < html.indexOf('data-candidate-id="62"')); assert.equal(html.includes('>Rank<'), false);
  for (const label of ['Purchase frequency','Bought together']) assert.ok(html.includes(label));
  const options=renderToStaticMarkup(createElement(F06RecommendationOptions,{items,onSelect:()=>{}}));
  for(const label of ['Needs review','Available','View Details'])assert.ok(options.includes(label));
});
test('opening group candidates retains cached product images; explicit refresh reloads them and session change clears them', async t => {
  const f=setup(t);
  f.products.mock.mockImplementation(async (input:RequestInfo|URL)=>{
    const id=Number(String(input).split('/').at(-1));return Response.json({id,name:'Product '+id,imageUrl:'/api/products/'+id+'/image'});
  });
  await startSelected(f.workflow);
  const images={31:'/api/products/31/image',32:'/api/products/32/image'};
  assert.deepEqual(f.workflow.getSnapshot().images,images);
  await f.workflow.openDetail(62);await f.workflow.openDetail(63);
  assert.deepEqual(f.workflow.getSnapshot().images,images);assert.equal(f.products.mock.callCount(),2);
  await f.workflow.openDetail(63,false,true);
  assert.deepEqual(f.workflow.getSnapshot().images,images);assert.equal(f.products.mock.callCount(),4);
  f.change(null,'logged-out');assert.deepEqual(f.workflow.getSnapshot().images,{});
});
for (const role of ['Merchandiser', 'Store Admin'] as const) test(`${role} selects a completed F05 run even with failed request comparison and reads server ranks`, async t => {
  const f = setup(t, role); f.list.mock.mockImplementation(async (params: RecListParams = {}) => resultPage(params, [recommendation({ rank: params.miningRunId ? 21 : null })]));
  await startSelected(f.workflow); f.workflow.setMode('ranked'); await flush();
  assert.equal(f.list.mock.callCount(), role==='Merchandiser'?6:2, 'availability, typed page and four optional counts for Merchandiser');
  await f.workflow.selectRequest(17); await f.workflow.selectRun(42);
  assert.equal(f.list.mock.calls.at(-1)!.arguments[0]?.miningRunId, 42);
  assert.ok(table(f.workflow.getSnapshot().list!).includes('data-rank="21"'));
  f.workflow.setMode('history'); await flush();
  assert.equal(f.list.mock.calls.at(-1)!.arguments[0]?.miningRunId, 42);assert.equal(f.workflow.getSnapshot().list,null,'legacy history mode cannot issue an unscoped list');
});
test('ranked source selection ignores incomplete runs and supports empty/error/manual refresh states', async t => {
  const f = setup(t); f.runs.mock.mockImplementation(async () => [runFixture('RUNNING')]);
  await startSelected(f.workflow); f.workflow.setMode('ranked'); await flush();
  await f.workflow.selectRequest(17); await f.workflow.selectRun(42);
  assert.equal(f.workflow.getSnapshot().miningRunId, null); assert.equal(f.list.mock.callCount(), 6);
  f.requests.mock.mockImplementation(async () => ({ items: [], page: 0, pageSize: 20, totalElements: 0 }));
  await f.workflow.loadRequests(); assert.equal(f.workflow.getSnapshot().requests?.items.length, 0);
  f.requests.mock.mockImplementation(async () => { throw new F06ApiError(403, 'Source access denied'); });
  await f.workflow.loadRequests(); assert.match(f.workflow.getSnapshot().requestsError, /permission/);
});
test('filters reset page to zero and pagination uses backend totalElements/pageSize', async t => {
  const f = setup(t); f.list.mock.mockImplementation(async (params: RecListParams = {}) => resultPage(params, [recommendation()], 45));
  await startSelected(f.workflow); await f.workflow.setPage(1);
  await f.workflow.applyFilters({ snapshotId: 2, type: 'BUNDLE', reviewStatus: 'APPROVED', pageSize: 10 });
  assert.deepEqual(f.list.mock.calls.at(-1)!.arguments[0], { miningRunId:42,snapshotId: 2, type: 'BUNDLE', reviewStatus: 'APPROVED', pageSize: 10, page: 0 });
  const html = renderToStaticMarkup(createElement(F06DashboardContent, { state: f.workflow.getSnapshot(), workflow: f.workflow }));
  assert.ok(html.includes('45 matching recommendations')); assert.ok(html.includes('Page 1 of 5'));
  assert.match(html, /<button[^>]*>Next recommendations<\/button>/);
  await f.workflow.applyFilters({ pageSize: 20,type:'BUNDLE' }); assert.equal(f.workflow.getSnapshot().page, 0);
});
test('invalid filter values do not issue a list request', async t => {
  const f = setup(t); await startSelected(f.workflow);
  for (const filters of [{ snapshotId: 2147483648 }, { snapshotId: 1.5 }, { pageSize: 101 }]) await f.workflow.applyFilters(filters);
  assert.equal(f.list.mock.callCount(), 6); assert.match(f.workflow.getSnapshot().error, /selection/);
});
test('empty/loading/error list states stay distinct and do not display stale rows', async t => {
  const f = setup(t); const pending = deferred<RecPage>(); f.list.mock.mockImplementation((params:RecListParams={}) => params.type?pending.promise:Promise.resolve(resultPage(params)));
  await startSelected(f.workflow); assert.equal(f.workflow.getSnapshot().loading, true);
  let html = renderToStaticMarkup(createElement(F06DashboardContent, { state: f.workflow.getSnapshot(), workflow: f.workflow }));
  assert.ok(html.includes('Loading recommendations')); assert.equal(html.includes('No recommendations match'), false);
  pending.resolve(resultPage({miningRunId:42}, [])); await flush();
  html = renderToStaticMarkup(createElement(F06DashboardContent, { state: f.workflow.getSnapshot(), workflow: f.workflow }));
  assert.ok(html.includes('No bundle recommendations found for this analysis'));
  f.list.mock.mockImplementation(async () => { throw new F06ApiError(null, 'Offline'); }); await f.workflow.refresh();
  assert.equal(f.workflow.getSnapshot().list, null); assert.match(f.workflow.getSnapshot().error, /connect/);
});
test('ranked 409 retains backend message and recommends narrower filters without automatic retry', async t => {
  const f = setup(t); await startSelected(f.workflow); f.workflow.setMode('ranked'); await flush(); await f.workflow.selectRequest(17);
  f.list.mock.mockImplementation(async () => { throw new F06ApiError(409, 'Rank scope exceeds 10000 candidates'); });
  await f.workflow.selectRun(42); await flush();
  assert.match(f.workflow.getSnapshot().availabilityError, /Choose another analysis/);
  assert.equal(f.list.mock.callCount(), 7); await f.workflow.refresh(); assert.equal(f.list.mock.callCount(), 8);
});
test('detail success loads optional product names using GET only; source evidence/history stay intact', async t => {
  const f = setup(t); await startSelected(f.workflow); await f.workflow.openDetail(62);
  assert.equal(f.workflow.getSnapshot().detail?.recommendationId, 62);
  assert.deepEqual(f.workflow.getSnapshot().names, { 31: 'Product 31', 32: 'Product 32' });
  assert.deepEqual(f.products.mock.calls.map(call => String(call.arguments[0])), ['/api/products/31', '/api/products/32']);
  assert.equal(f.workflow.getSnapshot().detailLoading, false);
  const html = content(f.workflow.getSnapshot().detail!);
  for (const label of ['More Details','Review History','Availability when created','Current Availability']) assert.ok(html.includes(label));
});
test('missing evidence is unavailable, null expiry risk is N/A and real utility zero remains zero', t => {
  setup(t); const item = recommendation({ utility: 0, type: 'CROSS_SELL', anchorProductId: 31, evidence: { totalTransactions: 0, supportCount: null, supportRatio: null, anchorSupportCount: null, confidence: null, status: 'EVIDENCE_UNAVAILABLE' } });
  const html = content(item);
  assert.match(html, /Add-on purchase rate<\/dt><dd[^>]*>Unavailable<\/dd>/); assert.match(html, /Bought together<\/dt><dd[^>]*>Unavailable<\/dd>/);
  assert.equal(html.includes('Expiry risk:'),false); assert.equal(item.currentEligibility.products[0].expiryPriorityScore,null);
  assert.match(html, /Historical utility<\/dt><dd[^>]*>0<\/dd>/); assert.ok(html.includes('Historical purchase data is unavailable'));
});
test('CROSS_SELL targets exclude anchor; API product names are rendered as escaped text', t => {
  setup(t); const html = renderToStaticMarkup(createElement(F06RecommendationDetailContent, {
    item: recommendation({ type: 'CROSS_SELL', anchorProductId: 31 }), names: { 31: 'Anchor', 32: '<script>not markup</script>' }
  }));
  const targets = html.match(/<span aria-label="Suggested cross-sell targets"[^>]*>(.*?)<\/span>/s)![1];
  assert.equal(targets.includes('#31'), false); assert.equal(targets.includes('#32'),false); assert.ok(targets.includes('&lt;script&gt;'));
});
test('approved can be unready with changed eligibility; refresh uses the new detail response without recomputing', async t => {
  const f = setup(t); await startSelected(f.workflow); await f.workflow.openDetail(62);
  const item = recommendation({ reviewStatus: 'APPROVED', readyForConsumption: false, inventoryChanged: true, currentEligibility: eligibility('INELIGIBLE'),
    reviewHistory: [{ oldStatus: 'PENDING_REVIEW', newStatus: 'APPROVED', reviewedBy: 7, reviewedAt: '2026-11-07T00:00:00Z', reason: 'Historical decision', resultingVersion: 2, eligibilityCheck: eligibility() }] });
  f.detail.mock.mockImplementation(async () => item); await f.workflow.openDetail(62);
  assert.deepEqual(f.workflow.getSnapshot().detail, item); const html = content(item);
  assert.ok(html.includes('Approved')); assert.ok(html.includes('INELIGIBLE'));
  assert.ok(html.includes('data-readiness="not-ready"')); assert.ok(html.includes('Availability checked against current inventory.'));
  assert.ok(html.includes('Historical decision')); assert.ok(html.includes('Availability at review'));
  assert.equal(html.includes('<button'), false);
});
test('cross-Store 404 clears prior detail and names without revealing another Store', async t => {
  const f = setup(t); await startSelected(f.workflow); await f.workflow.openDetail(62);
  f.detail.mock.mockImplementation(async () => { throw new F06ApiError(404, 'Recommendation not found'); }); await f.workflow.openDetail(999);
  assert.equal(f.workflow.getSnapshot().detail, null); assert.deepEqual(f.workflow.getSnapshot().names, {});
  assert.match(f.workflow.getSnapshot().detailError, /unavailable for your store/);
});
for (const status of [400, 401, 403, 404, 409, null]) test(`list and detail handle ${status ?? 'network'} with no automatic reads or writes`, async t => {
  const f = setup(t);
  f.list.mock.mockImplementation(async () => { throw new F06ApiError(status, 'Controlled list failure'); });
  f.detail.mock.mockImplementation(async () => { throw new F06ApiError(status, 'Controlled detail failure'); });
  await startSelected(f.workflow); await f.workflow.openDetail(62); await flush();
  assert.ok(f.workflow.getSnapshot().availabilityError);assert.ok(f.workflow.getSnapshot().detailError);assert.equal(/HTTP|Controlled/.test(f.workflow.getSnapshot().availabilityError+f.workflow.getSnapshot().detailError),false);
  assert.equal(f.list.mock.callCount(), 1); assert.equal(f.detail.mock.callCount(), 1); assert.equal(f.products.mock.callCount(), 0);
});
for (const role of ['System Admin', 'End-Customer'] as const) test(`${role} cannot load list/detail or mining sources`, async t => {
  const f = setup(t, role); f.workflow.start(); f.workflow.setMode('ranked'); await f.workflow.openDetail(62); await flush();
  assert.equal(f.list.mock.callCount(), 0); assert.equal(f.detail.mock.callCount(), 0); assert.equal(f.requests.mock.callCount(), 0);
});
test('session change during list load cancels old GETs and discards late responses', async t => {
  const f = setup(t); const pending = deferred<RecPage>(); f.list.mock.mockImplementation(() => pending.promise);
  await startSelected(f.workflow); const signal = f.list.mock.calls[0].arguments[1]; f.change(null, 'signed-out');
  assert.equal(signal?.aborted, true); pending.resolve(resultPage()); await flush();
  assert.equal(f.workflow.getSnapshot().list, null); assert.equal(f.workflow.getSnapshot().detail, null); assert.deepEqual(f.workflow.getSnapshot().names, {});
});
test('same-session Store change clears open details, cancels name lookups and resets filters', async t => {
  const f = setup(t); const names = deferred<Response>(); f.products.mock.mockImplementation(() => names.promise);
  await startSelected(f.workflow); const opened = f.workflow.openDetail(62); await flush();
  const signal = f.products.mock.calls[0].arguments[1]?.signal;
  f.list.mock.mockImplementation(async (params: RecListParams = {}) => resultPage(params, [])); f.change({ ...user, role: 'Merchandiser', storeId: 2 });
  assert.equal(signal?.aborted, true); names.resolve(Response.json({ id: 31, name: 'Previous Store name' })); await opened; await flush();
  assert.equal(f.workflow.getSnapshot().detailId, null); assert.deepEqual(f.workflow.getSnapshot().names, {}); assert.deepEqual(f.workflow.getSnapshot().filters, { pageSize: 20,type:'BUNDLE' });
});
test('superseded list/detail responses and unmounted dashboard cannot overwrite current data', async t => {
  const f = setup(t); await startSelected(f.workflow);
  const oldList = deferred<RecPage>(); f.list.mock.mockImplementation(() => oldList.promise); const first = f.workflow.refresh();
  const signal = f.list.mock.calls.at(-1)!.arguments[1];
  f.list.mock.mockImplementation(async (params: RecListParams = {}) => resultPage(params, [recommendation({ recommendationId: 70 })])); await f.workflow.applyFilters({ type: 'FBT' });
  oldList.resolve(resultPage()); await first; assert.equal(signal?.aborted, true); assert.equal(f.workflow.getSnapshot().list!.items[0].recommendationId, 70);
  const oldDetail = deferred<RecView>(); f.detail.mock.mockImplementation(() => oldDetail.promise); const opened = f.workflow.openDetail(62);
  const detailSignal = f.detail.mock.calls.at(-1)!.arguments[1]; f.workflow.closeDetail(); oldDetail.resolve(recommendation()); await opened;
  assert.equal(detailSignal?.aborted, true); assert.equal(f.workflow.getSnapshot().detail, null);
  f.workflow.stop(); await f.workflow.refresh(); assert.equal(f.workflow.getSnapshot().detail, null);
});
test('optional name lookup tolerates unavailable and mismatched products without hiding IDs', async t => {
  const f = setup(t); f.products.mock.mockImplementation(async (path: RequestInfo | URL) => String(path).endsWith('/31') ? new Response('', { status: 404 }) : Response.json({ id: 999, name: 'Wrong product' }));
  await startSelected(f.workflow); await f.workflow.openDetail(62);
  assert.deepEqual(f.workflow.getSnapshot().names, {}); assert.equal(f.workflow.getSnapshot().namesUnavailable, true);
  assert.ok(content(f.workflow.getSnapshot().detail!).includes('Product name unavailable'));assert.deepEqual(f.workflow.getSnapshot().detail!.productIds,[31,32]);
});
test('product name requests honor abort, deduplicate IDs and use bounded concurrency', async t => {
  const f = setup(t); let active = 0, maximum = 0;
  f.products.mock.mockImplementation(async (path: RequestInfo | URL) => { active++; maximum = Math.max(maximum, active); await flush(); active--; return Response.json({ id: Number(String(path).split('/').at(-1)), name: 'Name' }); });
  const names = await readRecommendationProductNames([1, 1, 2, 3, 4, 5, 6], new AbortController().signal);
  assert.equal(Object.keys(names).length, 6); assert.equal(f.products.mock.callCount(), 6); assert.ok(maximum <= 4);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(readRecommendationProductNames([1], controller.signal), error => (error as Error).name === 'AbortError');
});

test('business percentages preserve backend decimal values without floating point artifacts or rounding', () => {
  for (const [ratio, display] of [[0, '0%'], [1, '100%'], [0.5, '50%'], [0.29, '29%'],
    [0.333333, '33.3333%'], [0.666667, '66.6667%'], [0.123456, '12.3456%'], [0.000001, '0.0001%'], [1e-7, '0.00001%']] as const) {
    assert.equal(recommendationPercent(ratio), display);
  }
  assert.equal(recommendationPercent(null), 'N/A'); assert.equal(recommendationPercent(undefined), 'N/A');
  assert.equal(recommendationValue(null), 'N/A'); assert.equal(recommendationValue(0), '0');
});
test('status wording distinguishes review, current usability and readiness without changing backend fields', t => {
  setup(t);
  for (const [status, wording] of [['ELIGIBLE', 'Available'], ['INELIGIBLE','Currently unavailable'], ['NEEDS_RECHECK','Needs recheck'], ['PENDING_REVIEW', 'Needs review']]) {
    const html = renderToStaticMarkup(createElement(RecommendationBadge, { status }));
    assert.ok(html.includes(`data-status="${status}"`)); assert.equal(html.replace(/<[^>]*>/g, ''), wording);
  }
  const item = recommendation({ reviewStatus: 'APPROVED', readyForConsumption: false, currentEligibility: eligibility('INELIGIBLE') });
  const before = JSON.stringify(item); const html = content(item);
  assert.ok(html.includes('Approved')); assert.ok(html.includes('Currently unavailable'));
  assert.ok(html.includes('data-readiness="not-ready"'));
  assert.ok(html.includes('not currently ready for Layout'));
  assert.equal(JSON.stringify(item), before, 'presentation never changes API evidence or eligibility');
});
test('available product names precede IDs and unknown products retain a clear reference', () => {
  const named = renderToStaticMarkup(createElement(RecommendationProduct, { id: 31, names: { 31: 'Fresh milk' } }));
  assert.ok(named.includes('Fresh milk'));assert.equal(named.includes('#31'),false);
  assert.ok(renderToStaticMarkup(createElement(RecommendationProduct, { id: 31 })).includes('Product #31'));
  assert.equal(renderToStaticMarkup(createElement(RecommendationProduct, { id: null })), 'N/A');
});
test('friendly filter options keep exact backend enum values and the drawer keeps primary and collapsed historical sections', t => {
  const f=setup(t);const state={...f.workflow.getSnapshot(),sourceRun:runFixture('COMPLETED'),miningRunId:42,request:requestFixture(),runTotal:1};const html=renderToStaticMarkup(createElement(F06DashboardContent,{state,workflow:f.workflow}));
  assert.ok(html.includes('value="APPROVED">Approved</option>')); assert.ok(html.includes('id="f06-type-CROSS_SELL"'));
  assert.ok(html.includes('Items per page')); assert.equal(html.includes('f06-analysis-scope'),false); assert.ok(html.includes('Selected analysis'));
  const detail = content(recommendation());
  for (const title of ['Products in this suggestion','Why this recommendation?','Current Availability','More Details','Review History']) assert.ok(detail.includes(title));
});

test('not-ready wording follows review and availability without replacing the server readiness flag', () => {
  const check = (reviewStatus: RecView['reviewStatus'], status: RecView['currentEligibility']['status']) => recommendationReadiness(recommendation({ reviewStatus, readyForConsumption: false, currentEligibility: eligibility(status) }));
  assert.match(check('PENDING_REVIEW', 'ELIGIBLE'), /^Needs review/);
  assert.match(check('APPROVED', 'INELIGIBLE'), /^Approved. Currently unavailable for Layout/);
  assert.match(check('PENDING_REVIEW', 'INELIGIBLE'), /^Needs review. Currently unavailable for Layout/);
  assert.match(check('APPROVED', 'NEEDS_RECHECK'), /^Approved. Product availability needs rechecking/);
  assert.match(check('REJECTED', 'ELIGIBLE'), /^Rejected/);
  assert.match(check('APPROVED', 'ELIGIBLE'), /^Approved, but not yet ready/);
  assert.equal(recommendationReadiness(recommendation({ readyForConsumption: true })), 'Ready for Layout. Availability will be checked again before use.');
});
test('mobile cards preserve important data and confidence is only shown when applicable', () => {
  const bundle = recommendation({ reviewStatus: 'PENDING_REVIEW', currentEligibility: eligibility() });
  const html = table(resultPage({}, [bundle]));
  assert.ok(html.includes('aria-label="Product recommendation cards"')); assert.ok(html.includes('data-product-group'));
  for (const text of ['these products','Bought together in 2 of 6','33.3333%']) assert.ok(html.includes(text));
  assert.ok(html.includes('data-status="PENDING_REVIEW"'));assert.ok(html.includes('View Details'));assert.equal(/Suggestion #|Snapshot #|Historical utility/.test(html),false);
  const options=renderToStaticMarkup(createElement(F06RecommendationOptions,{items:[bundle],onSelect:()=>{}}));
  assert.ok(options.includes('Needs review'));assert.ok(options.includes('View Details'));
  assert.equal(content(bundle).includes('>Add-on purchase rate</dt>'), false);
  assert.ok(content(recommendation({ type: 'CROSS_SELL', anchorProductId: 31 })).includes('>Add-on purchase rate</dt>'));
  assert.equal(content(recommendation({ type: 'CROSS_SELL', anchorProductId: null })).includes('>Add-on purchase rate</dt>'), false);
});

test('Store Admin list stays focused on business status and preserves backend evidence', t => {
  const f = setup(t, 'Store Admin');
  const item = recommendation({ reviewStatus: 'APPROVED', currentEligibility: eligibility('INELIGIBLE'), readyForConsumption: false });
  const original = JSON.stringify(item);
  const html = renderToStaticMarkup(createElement(F06RecommendationTable, { data: resultPage({}, [item]), compact: true, onOpen: () => {} }));
  for (const text of ['Bought together in 2 of 6','Purchase frequency']) assert.ok(html.includes(text));
  assert.equal(html.includes('Snapshot #'),false);
  assert.ok(html.includes('Approved'));assert.ok(html.includes('Currently unavailable'));const options=renderToStaticMarkup(createElement(F06RecommendationOptions,{items:[item],onSelect:()=>{}}));assert.ok(options.includes('Approved'));assert.ok(options.includes('Currently unavailable'));
  const dashboard=renderToStaticMarkup(createElement(F06DashboardContent,{state:{...f.workflow.getSnapshot(),sourceRun:runFixture('COMPLETED'),request:requestFixture(),miningRunId:42,runTotal:1},workflow:f.workflow}));
  for(const id of ['f06-type-BUNDLE','f06-filter-size'])assert.ok(dashboard.includes(id));assert.equal(dashboard.includes('f06-analysis-scope'),false);assert.equal(dashboard.includes('Generate New'),false);
  assert.equal(dashboard.includes('f06-filter-type'),false); assert.ok(dashboard.includes('f06-filter-review'));
  assert.equal(JSON.stringify(item), original);
});

test('Store Admin drawer retains provenance inside closed Source Details and visible review history', () => {
  const item = recommendation();
  const html = renderToStaticMarkup(createElement(F06RecommendationDetailContent, { item, compact: true }));
  assert.match(html, /<details[^>]*><summary[^>]*>More Details<\/summary>/);
  assert.ok(html.includes('Historical utility')); assert.ok(html.includes('Review History'));
  assert.ok(html.includes('Availability when created'));for(const label of ['Input hash','Matrix hash','Rule version','Fingerprint'])assert.equal(html.includes(label),false);assert.equal(item.sources[0].inputHash,'input');
});

test('Store Admin list names are deduplicated, cached across pages/details and never block results', async t => {
  const f = setup(t, 'Store Admin'); await startSelected(f.workflow); await flush();
  assert.equal(f.workflow.getSnapshot().list?.items.length, 1);
  assert.deepEqual(f.workflow.getSnapshot().listNames, { 31: 'Product 31', 32: 'Product 32' });
  assert.equal(f.products.mock.callCount(), 2);
  await f.workflow.setPage(0); await flush(); await f.workflow.openDetail(62); await flush();
  assert.equal(f.products.mock.callCount(), 2, 'same Store product names are reused across rows, reads and details');
  f.workflow.closeDetail(); assert.equal(f.workflow.getSnapshot().listNames[31], 'Product 31');
  await f.workflow.refresh(true); await flush(); assert.equal(f.products.mock.callCount(), 4, 'explicit Refresh reloads names after catalog changes');
  f.list.mock.mockImplementation(async (params: RecListParams = {}) => resultPage(params, [recommendation({ storeId: 2 })]));
  f.change({ ...user, role: 'Store Admin', storeId: 2 }, 'another-session'); await flush(); await flush();
  await f.workflow.selectSource(42);await flush();assert.ok(f.products.mock.callCount()>=6,'new Store source loads its own names');
});

test('Store Admin optional-name failures keep IDs and late reads cannot populate another Store', async t => {
  const f = setup(t, 'Store Admin'); const gate = deferred<Response>();
  f.products.mock.mockImplementation(async (path: RequestInfo | URL) => f.products.mock.callCount() <= 2 ? gate.promise : Response.json({ id: Number(String(path).split('/').at(-1)), name: 'New Store name' })); await startSelected(f.workflow);
  assert.equal(f.workflow.getSnapshot().loading, false, 'results render before optional product names');
  f.list.mock.mockImplementation(async (params: RecListParams = {}) => resultPage(params, [recommendation({ storeId: 2 })]));
  f.change({ ...user, role: 'Store Admin', storeId: 2 }, 'new-session');
  gate.resolve(Response.json({ id: 31, name: 'Old Store name' })); await flush(); await flush();
  assert.equal(Object.values(f.workflow.getSnapshot().listNames).includes('Old Store name'), false);
});

test('missing product names are cached for this scope and number formatting preserves decimal evidence', async () => {
  assert.equal(recommendationNumber(47000), '47,000'); assert.equal(recommendationNumber(40.123456), '40.123456'); assert.equal(recommendationNumber(0), '0');
  const cache = new Map<number, string | null>(); const old = authService.request;
  let reads = 0;
  authService.request = async () => { reads++; return new Response(null, { status: 404 }); };
  try { await readRecommendationProductNames([31, 31], new AbortController().signal, cache); await readRecommendationProductNames([31], new AbortController().signal, cache); assert.equal(reads, 1); }
  finally { authService.request = old; }
});
