import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { setImmediate as flush } from 'node:timers/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { authService, type AuthUser } from '../src/services/authService';
import { f06Api, F06ApiError } from '../src/features/f06/f06.api';
import { RecommendationBrowser } from '../src/features/f06/f06.browse';
import { F06ReviewForm } from '../src/features/f06/components/F06ReviewForm';
import type { RecListParams, RecView } from '../src/features/f06/f06.types';
import { recommendation, eligibility } from './f06.fixtures';
import { user } from './f05.fixtures';

const reason = 'Reviewed historical evidence and current availability.';
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function setup(t: TestContext, role: AuthUser['role'] = 'Merchandiser') {
  let actor: AuthUser | null = { ...user, role, storeId: 1 }; let epoch = 'review-test'; let changed = () => {};
  t.mock.method(authService, 'getCurrentUser', () => actor); t.mock.method(authService, 'getSessionId', () => epoch);
  t.mock.method(authService, 'getToken', () => actor ? 'fixture-token' : null);
  t.mock.method(authService, 'subscribe', (callback: () => void) => { changed = callback; return () => {}; });
  t.mock.method(authService, 'request', async () => Response.json({}));
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Live HTTP is not allowed'); });
  const list = t.mock.method(f06Api, 'list', async (params: RecListParams = {}) => ({ items: [recommendation({ rank: params.miningRunId ? 21 : null })], page: params.page ?? 0, pageSize: params.pageSize ?? 20, totalElements: 45, ordering: params.miningRunId ? 'RANKED_WITHIN_SOURCE_RUN' as const : 'CREATED_DESC' as const }));
  const get = t.mock.method(f06Api, 'get', async () => recommendation());
  const decision = (status: 'APPROVED' | 'REJECTED') => recommendation({ version: 2, reviewStatus: status, reviewedBy: 7, reviewedAt: '2026-11-10T00:00:00Z', reviewReason: reason,
    reviewHistory: [{ oldStatus: 'PENDING_REVIEW', newStatus: status, reviewedBy: 7, reviewedAt: '2026-11-10T00:00:00Z', reason, resultingVersion: 2, eligibilityCheck: eligibility() }] });
  const approve = t.mock.method(f06Api, 'approve', async () => decision('APPROVED'));
  const reject = t.mock.method(f06Api, 'reject', async () => decision('REJECTED'));
  const workflow = new RecommendationBrowser(); t.after(workflow.stop);
  return { workflow, list, get, approve, reject, decision, change: (next: AuthUser | null, session = epoch) => { actor = next; epoch = session; changed(); } };
}
async function open(workflow: RecommendationBrowser) { workflow.start(); await flush(); await workflow.openDetail(62); }

test('approve requires a deliberate confirmation and sends the frozen version/reason once', async t => {
  const f = setup(t); await open(f.workflow);
  f.workflow.prepareReview('approve', reason); assert.equal(f.approve.mock.callCount(), 0);
  assert.deepEqual(f.workflow.getSnapshot().reviewConfirmation, { id: 62, expectedVersion: 1, reason, action: 'approve' });
  await f.workflow.confirmReview();
  assert.equal(f.approve.mock.callCount(), 1); assert.deepEqual(f.approve.mock.calls[0].arguments[1], { expectedVersion: 1, reason });
  assert.deepEqual(f.workflow.getSnapshot().detail, f.decision('APPROVED'));
  assert.equal(f.workflow.getSnapshot().detailId, 62); assert.equal(f.workflow.getSnapshot().detail!.reviewHistory.length, 1);
});
for (const status of ['INELIGIBLE', 'NEEDS_RECHECK'] as const) test(`${status} blocks approval but permits a reasoned rejection`, async t => {
  const f = setup(t); f.get.mock.mockImplementation(async () => recommendation({ currentEligibility: eligibility(status) })); await open(f.workflow);
  f.workflow.prepareReview('approve', reason); await f.workflow.confirmReview(); assert.equal(f.approve.mock.callCount(), 0);
  f.workflow.prepareReview('reject', reason); await f.workflow.confirmReview(); assert.equal(f.reject.mock.callCount(), 1);
});
for (const status of ['APPROVED', 'REJECTED'] as const) test(`${status} is final; no review form or second decision`, async t => {
  const f = setup(t); f.get.mock.mockImplementation(async () => recommendation({ reviewStatus: status })); await open(f.workflow);
  f.workflow.prepareReview('approve', reason); f.workflow.prepareReview('reject', reason); await f.workflow.confirmReview();
  assert.equal(f.approve.mock.callCount() + f.reject.mock.callCount(), 0);
  assert.equal(renderToStaticMarkup(createElement(F06ReviewForm, { state: f.workflow.getSnapshot(), workflow: f.workflow })), '');
});
test('blank/spaces/overlong reasons cannot prepare either mutation', async t => {
  const f = setup(t); await open(f.workflow);
  for (const text of ['', ' \t\n', 'a'.repeat(1001)]) for (const action of ['approve', 'reject'] as const) {
    f.workflow.prepareReview(action, text); assert.equal(f.workflow.getSnapshot().reviewConfirmation, null); await f.workflow.confirmReview();
  }
  assert.equal(f.approve.mock.callCount() + f.reject.mock.callCount(), 0);
  f.workflow.prepareReview('approve', 'a'.repeat(1000)); assert.ok(f.workflow.getSnapshot().reviewConfirmation);
});
test('double confirmation is fenced synchronously and pending review cannot close or refresh', async t => {
  const f = setup(t); await open(f.workflow); const wait = deferred<RecView>(); f.approve.mock.mockImplementation(() => wait.promise);
  f.workflow.prepareReview('approve', reason); const first = f.workflow.confirmReview(); const second = f.workflow.confirmReview();
  f.workflow.closeDetail(); await f.workflow.openDetail(63); await f.workflow.refresh();
  assert.equal(f.workflow.getSnapshot().detailId, 62); assert.equal(f.get.mock.callCount(), 1); assert.equal(f.approve.mock.callCount(), 1);
  wait.resolve(f.decision('APPROVED')); await Promise.all([first, second]);
});
test('successful review refetches server ranking without replacing it with null detail rank or losing filters/page', async t => {
  const f = setup(t); await open(f.workflow);
  await f.workflow.applyFilters({ type: 'BUNDLE', reviewStatus: 'PENDING_REVIEW', pageSize: 20 }); await f.workflow.setPage(1); await f.workflow.openDetail(62);
  f.workflow.prepareReview('approve', reason); await f.workflow.confirmReview();
  assert.equal(f.workflow.getSnapshot().page, 1); assert.equal(f.workflow.getSnapshot().filters.type, 'BUNDLE');
  assert.equal(f.workflow.getSnapshot().detailId, 62); assert.equal(f.workflow.getSnapshot().detail!.rank, null);
  assert.equal(f.list.mock.calls.at(-1)!.arguments[0]?.page, 1);
});
test('409 reloads changed version/inventory and requires a fresh human confirmation, never retries', async t => {
  const f = setup(t); await open(f.workflow); f.approve.mock.mockImplementation(async () => { throw new F06ApiError(409, 'Inventory changed'); });
  f.get.mock.mockImplementation(async () => recommendation({ version: 2, currentEligibility: eligibility('INELIGIBLE') }));
  f.workflow.prepareReview('approve', reason); await f.workflow.confirmReview(); await flush();
  assert.equal(f.approve.mock.callCount(), 1); assert.equal(f.get.mock.callCount(), 2);
  assert.equal(f.workflow.getSnapshot().detail!.version, 2); assert.equal(f.workflow.getSnapshot().reviewConfirmation, null);
  assert.match(f.workflow.getSnapshot().reviewError, /Inventory changed.*409/);
  f.workflow.prepareReview('approve', reason); assert.equal(f.workflow.getSnapshot().reviewConfirmation, null);
  f.workflow.prepareReview('reject', reason); assert.equal(f.workflow.getSnapshot().reviewConfirmation!.expectedVersion, 2);
});
test('another actor resolving a 409 removes actions after GET shows the final decision', async t => {
  const f = setup(t); await open(f.workflow); f.approve.mock.mockImplementation(async () => { throw new F06ApiError(409, 'Version changed'); });
  f.get.mock.mockImplementation(async () => f.decision('REJECTED'));
  f.workflow.prepareReview('approve', reason); await f.workflow.confirmReview();
  assert.equal(f.workflow.getSnapshot().detail!.reviewStatus, 'REJECTED'); f.workflow.prepareReview('reject', reason); await f.workflow.confirmReview(); assert.equal(f.reject.mock.callCount(), 0);
});
test('lost response is reconciled via GET without claiming failure or replaying a saved decision', async t => {
  const f = setup(t); await open(f.workflow); f.approve.mock.mockImplementation(async () => { throw new F06ApiError(null, 'Response lost'); });
  f.get.mock.mockImplementation(async () => f.decision('APPROVED'));
  f.workflow.prepareReview('approve', reason); await f.workflow.confirmReview();
  assert.equal(f.workflow.getSnapshot().detail!.reviewStatus, 'APPROVED'); assert.match(f.workflow.getSnapshot().reviewError, /not confirmed/);
  assert.equal(f.approve.mock.callCount(), 1); assert.equal(f.workflow.getSnapshot().reviewNotice, '');
});
test('a failed reconciliation blocks another write until a manual detail read succeeds', async t => {
  const f = setup(t); await open(f.workflow); f.approve.mock.mockImplementation(async () => { throw new F06ApiError(null, 'Offline'); });
  f.get.mock.mockImplementation(async () => { throw new F06ApiError(503, 'Still offline'); });
  f.workflow.prepareReview('approve', reason); await f.workflow.confirmReview(); f.workflow.prepareReview('approve', reason); await f.workflow.confirmReview();
  assert.equal(f.approve.mock.callCount(), 1); assert.equal(f.workflow.getSnapshot().reviewNeedsRefresh, true);
  f.get.mock.mockImplementation(async () => recommendation()); await f.workflow.openDetail(62); assert.equal(f.workflow.getSnapshot().reviewNeedsRefresh, false);
});
for (const role of ['Store Admin', 'System Admin', 'End-Customer'] as const) test(`${role} cannot approve/reject in the workflow`, async t => {
  const f = setup(t, role); await open(f.workflow); f.workflow.prepareReview('approve', reason); await f.workflow.confirmReview();
  assert.equal(f.approve.mock.callCount(), 0); assert.equal(f.reject.mock.callCount(), 0);
});
test('session change/unmount discard late mutation results and abort requests', async t => {
  const f = setup(t); await open(f.workflow); const wait = deferred<RecView>(); f.approve.mock.mockImplementation(() => wait.promise);
  f.workflow.prepareReview('approve', reason); const submit = f.workflow.confirmReview(); f.change(null, 'signed-out');
  assert.equal(f.approve.mock.calls[0].arguments[2]?.aborted, true); wait.resolve(f.decision('APPROVED')); await submit;
  assert.equal(f.workflow.getSnapshot().detail, null); assert.equal(f.workflow.getSnapshot().reviewPending, false);
});
