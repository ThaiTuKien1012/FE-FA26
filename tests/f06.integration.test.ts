import assert from './f06.assert';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { setImmediate as flush } from 'node:timers/promises';
import { authService } from '../src/services/authService';
import { f05Api } from '../src/features/f05/f05.api';
import { f06Api, F06ApiError } from '../src/features/f06/f06.api';
import { isRecExpiryPage, isRecView } from '../src/features/f06/f06.read-contracts';
import { RecommendationGeneration } from '../src/features/f06/f06.generate';
import { F06EligibilityCheck, F06RecommendationDetailContent } from '../src/features/f06/components/F06RecommendationDetails';
import { F06RecommendationTable } from '../src/features/f06/components/F06RecommendationTable';
import { eligibility, legacyEligibility, recommendation, expiryPage, generation, policy } from './f06.fixtures';
import { conversionRequestFixture, conversionRunFixture, user } from './f05.fixtures';

test('W2 current eligibility accepts products without expiryPushDays and preserves null priority', () => {
  const item = recommendation();
  assert.equal(isRecView(item), true);
  assert.equal('expiryPushDays' in item.currentEligibility.products[0], false);
  assert.equal(item.currentEligibility.products[0].expiryPriorityScore, null);
  const html = renderToStaticMarkup(createElement(F06EligibilityCheck, { title: 'Current', check: item.currentEligibility }));
  assert.doesNotMatch(html, /Expiry risk|Expiry information/); assert.equal(item.currentEligibility.products[0].expiryPriorityScore,null);
  assert.equal(html.includes('W2_EXPIRY_SEASON_V1'),false);assert.equal(item.currentEligibility.scoringVersion,'W2_EXPIRY_SEASON_V1');
  assert.doesNotMatch(html, /Reminder days|Historical reminder days/);
});

test('mixed legacy creation/review evidence and W2 current checks retain separate versions and values', () => {
  const legacy = legacyEligibility('NEEDS_RECHECK');
  const item = recommendation({ generationEligibility: legacy, inventoryChanged: true,
    reviewHistory: [{ oldStatus: 'PENDING_REVIEW', newStatus: 'APPROVED', reviewedBy: 7, reviewedAt: '2026-11-07T00:00:00Z', reason: 'Old check', resultingVersion: 2, eligibilityCheck: legacy },
      { oldStatus: 'PENDING_REVIEW', newStatus: 'REJECTED', reviewedBy: 8, reviewedAt: '2026-11-08T00:00:00Z', reason: 'W2 check', resultingVersion: 3, eligibilityCheck: eligibility('INELIGIBLE') }] });
  const before = JSON.stringify(item);
  assert.equal(isRecView(item), true);
  const html = renderToStaticMarkup(createElement(F06RecommendationDetailContent, { item }));
  for (const text of ['Saved reminder period', 'Old check', 'W2 check','Current Availability']) assert.ok(html.includes(text));
  assert.equal(JSON.stringify(item), before);
  assert.equal(isRecView(recommendation({ generationEligibility: { ...legacy, scoringVersion: null } })), true);
});

for (const field of ['currentEligibility', 'generationEligibility'] as const) {
  for (const version of [null, 'W3_UNKNOWN', 2]) test(`${field} validates scoring version ${version} without fallback`, () => {
    const item = recommendation();
    const check = { ...legacyEligibility(), scoringVersion: version };
    // Missing/null is valid only for historical legacy evidence.
    assert.equal(isRecView({ ...item, [field]: check }), field === 'generationEligibility' && version === null);
  });
}

test('unknown review scoring versions and malformed nested products are rejected without legacy fallback', () => {
  const item = recommendation();
  const review = { oldStatus: 'PENDING_REVIEW', newStatus: 'APPROVED', reviewedBy: 7, reviewedAt: 'now', reason: 'check', resultingVersion: 2,
    eligibilityCheck: { ...legacyEligibility(), scoringVersion: 'W3_UNKNOWN' } };
  assert.equal(isRecView({ ...item, reviewHistory: [review] }), false);
  for (const key of ['scoringVersion', 'products', 'warnings', 'fingerprint', 'checkedAt', 'asOfDate', 'timeZone']) {
    const check: Record<string, unknown> = { ...item.currentEligibility }; delete check[key];
    assert.equal(isRecView({ ...item, currentEligibility: check }), false, key);
  }
  const product = item.currentEligibility.products[0];
  for (const bad of [{ ...product, sellableQuantity: -1 }, { ...product, expiryPriorityScore: undefined }, { ...product, status: 'UNKNOWN' }, { ...product, warnings: null }]) {
    assert.equal(isRecView({ ...item, currentEligibility: { ...item.currentEligibility, products: [bad] } }), false);
  }
});

test('Push Day alerts accept negative/zero days and nullable expiry without old product fields', () => {
  const data = expiryPage();
  for (const daysToPush of [-365, -1, 0]) {
    const row = { ...data.items[0], daysToPush, expiryDate: null };
    assert.equal(isRecExpiryPage({ ...data, items: [row] }), true);
  }
  for (const key of ['pushDay', 'daysToPush', 'expiryDate', 'pushRequired', 'checkedAt', 'warnings']) {
    const row: Record<string, unknown> = { ...data.items[0] }; delete row[key];
    assert.equal(isRecExpiryPage({ ...data, items: [row] }), false, key);
  }
  for (const daysToPush of ['-1', -0.5, Number.MIN_SAFE_INTEGER - 1]) assert.equal(isRecExpiryPage({ ...data, items: [{ ...data.items[0], daysToPush }] }), false);
  assert.equal(isRecExpiryPage({ ...data, items: [], totalElements: 0, warnings: ['Missing Push Day'] }), true);
});

test('season warning displays backend names/dates without changing readiness or historical explanation', () => {
  const item = recommendation({ seasonEnded: true, endedSeasons: [{ seasonId: 3, name: 'Autumn sale', endDate: '2026-10-31' }],
    reviewStatus: 'APPROVED', readyForConsumption: true, explanation: ['Backend frozen-season explanation'] });
  const before = JSON.stringify(item);
  assert.equal(isRecView(item), true);
  const html = renderToStaticMarkup(createElement(F06RecommendationDetailContent, { item }));
  for (const text of ['Historical season has ended','Autumn sale','31/10/2026','Approved and ready for layout.']) assert.ok(html.includes(text));
  assert.equal(JSON.stringify(item), before);
  const list = renderToStaticMarkup(createElement(F06RecommendationTable, { data: { items: [item], page: 0, pageSize: 20, totalElements: 1, ordering: 'CREATED_DESC' }, onOpen: () => {} }));
  assert.equal(list.includes('Season ended'),false,'Season warning is shown in Details, not the compact summary');
  for (const bad of [{ seasonEnded: undefined }, { endedSeasons: null }, { endedSeasons: [{ seasonId: 0, name: 'Broken', endDate: 'date' }] }]) assert.equal(isRecView({ ...item, ...bad }), false);
  assert.doesNotMatch(renderToStaticMarkup(createElement(F06RecommendationDetailContent, { item: recommendation() })), /aria-label="Ended season warning"/);
});

test('transport rejects late data after Store changes within the same session epoch', async t => {
  let current = { ...user, role: 'Merchandiser' as const, storeId: 1 };
  t.mock.method(authService, 'getCurrentUser', () => current);
  t.mock.method(authService, 'getSessionId', () => 'same-epoch');
  t.mock.method(authService, 'getToken', () => 'fixture');
  let resolve!: (value: Response) => void;
  t.mock.method(authService, 'request', () => new Promise<Response>(done => { resolve = done; }));
  const pending = f06Api.get(62); current = { ...current, storeId: 2 };
  resolve(Response.json(recommendation()));
  await assert.rejects(pending, error => error instanceof F06ApiError && error.status === 401);
});

test('cross-Store recommendations and completed generation sources are rejected before POST/display', async t => {
  t.mock.method(authService, 'getCurrentUser', () => ({ ...user, role: 'Merchandiser' as const, storeId: 1 }));
  t.mock.method(authService, 'getSessionId', () => 'same-epoch'); t.mock.method(authService, 'getToken', () => 'fixture');
  const request = t.mock.method(authService, 'request', async () => Response.json(recommendation({ storeId: 2 })));
  await assert.rejects(f06Api.get(62), error => error instanceof F06ApiError && error.status === 200);
  t.mock.method(f05Api, 'getRun', async () => conversionRunFixture('WHOLE_UNIT_HALF_UP', 'COMPLETED', 2));
  await assert.rejects(f06Api.generate({ miningRunId: 42, types: ['BANNER'] }), error => error instanceof F06ApiError && error.status === 200);
  assert.equal(request.mock.callCount(), 1, 'no generation POST was sent');
});

for (const mode of ['LOSSLESS', 'WHOLE_UNIT_HALF_UP'] as const) test(`${mode} F05 selection verifies frozen provenance before F06 generation`, async t => {
  t.mock.method(authService, 'getCurrentUser', () => ({ ...user, role: 'Merchandiser' as const, storeId: 1 }));
  t.mock.method(authService, 'getSessionId', () => 'fixture'); t.mock.method(authService, 'getToken', () => 'fixture');
  t.mock.method(authService, 'subscribe', () => () => {});
  const source = conversionRequestFixture(mode, 'COMPLETED');
  t.mock.method(f05Api, 'listRequests', async () => ({ items: [source], page: 0, pageSize: 20, totalElements: 1 }));
  t.mock.method(f05Api, 'getRequest', async () => source);
  const runs = t.mock.method(f05Api, 'listRuns', async () => [conversionRunFixture(mode, 'COMPLETED')]);
  t.mock.method(f06Api, 'getConfig', async () => policy);
  const generate = t.mock.method(f06Api, 'generate', async () => generation);
  const workflow = new RecommendationGeneration(); t.after(workflow.stop); workflow.start(); await flush();
  await workflow.selectRequest(17); workflow.selectRun(42); await workflow.generate();
  assert.equal(generate.mock.callCount(), 1);
  assert.deepEqual(Object.keys(generate.mock.calls[0].arguments[0]!).sort(), ['miningRunId', 'types']);
  runs.mock.mockImplementation(async () => [{ ...conversionRunFixture(mode, 'COMPLETED'), inputHash: 'different-frozen-input' }]);
  await workflow.selectRequest(17); workflow.selectRun(42); await workflow.generate();
  assert.match(workflow.getSnapshot().runsError, /could not be verified/);
  assert.equal(generate.mock.callCount(), 1);
});
