import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { setImmediate as flush } from 'node:timers/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { authService, ROLE_PERMISSIONS, SCREEN_OWNER_MAP, type AuthUser } from '../src/services/authService';
import { f05Api, F05ApiError } from '../src/features/f05/f05.api';
import type { Page, RequestView, RunView } from '../src/features/f05/f05.types';
import { f06Api, F06ApiError } from '../src/features/f06/f06.api';
import { RecommendationGeneration } from '../src/features/f06/f06.generate';
import type { RecGenerationResult } from '../src/features/f06/f06.types';
import { F06WorkspaceView } from '../src/features/f06/components/F06WorkspaceView';
import { F06RunPicker } from '../src/features/f06/components/F06RunPicker';
import { F06GenerationResult } from '../src/features/f06/components/F06GenerationResult';
import { AppLayout } from '../src/components/layout/AppLayout';
import { isSystemMiningScreen, SYSTEM_MINING_NAV } from '../src/features/f05/f05.navigation';
import { getPathForScreen, getScreenFromPathname } from '../src/utils/navigationRouter';
import { generation, policy } from './f06.fixtures';
import { user, requestFixture, runFixture } from './f05.fixtures';

const page = (items: RequestView[], index = 0, total = items.length): Page<RequestView> => ({ items, page: index, pageSize: 20, totalElements: total });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup(t: TestContext, role: AuthUser['role'] = 'Merchandiser') {
  let currentUser: AuthUser | null = { ...user, role, storeId: 1 };
  let session = 'fixture-session';
  let notify = () => {};
  t.mock.method(authService, 'getCurrentUser', () => currentUser);
  t.mock.method(authService, 'getSessionId', () => session);
  t.mock.method(authService, 'getToken', () => currentUser ? 'fixture-token' : null);
  t.mock.method(authService, 'subscribe', (callback: () => void) => { notify = callback; return () => { notify = () => {}; }; });
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('No live HTTP is permitted in unit tests.'); });
  const requests = t.mock.method(f05Api, 'listRequests', async () => page([requestFixture('COMPLETED')]));
  const detail = t.mock.method(f05Api, 'getRequest', async () => requestFixture('COMPLETED'));
  const runs = t.mock.method(f05Api, 'listRuns', async () => [runFixture('COMPLETED')]);
  const config = t.mock.method(f06Api, 'getConfig', async () => ({ ...policy }));
  const submit = t.mock.method(f06Api, 'generate', async () => ({ ...generation }));
  const workflow = new RecommendationGeneration();
  t.after(workflow.stop);
  return { workflow, requests, detail, runs, config, submit,
    change: (next: AuthUser | null, nextSession = session) => { currentUser = next; session = nextSession; notify(); } };
}
async function select(workflow: RecommendationGeneration) {
  workflow.start(); await flush();
  await workflow.selectRequest(17); workflow.selectRun(42);
}

test('F06 gets a separate route and only Store roles get navigation access; legacy paths stay intact', t => {
  setup(t);
  assert.equal(getPathForScreen('f06-recommendations'), '/recommendations');
  assert.equal(getScreenFromPathname('/recommendations/'), 'f06-recommendations');
  assert.equal(getScreenFromPathname('/merchandiser/recommendations'), 'merchandiser-recommendations');
  assert.equal(getScreenFromPathname('/merchandiser/approve'), 'merchandiser-approve');
  assert.equal(getScreenFromPathname('/mining'), 'f05-mining');
  assert.equal(isSystemMiningScreen('f06-recommendations'), false);
  assert.equal(SYSTEM_MINING_NAV.some(item => String(item.screen) === 'f06-recommendations'), false);
  assert.deepEqual(SCREEN_OWNER_MAP['f06-recommendations']?.allowedRoles, ['Merchandiser', 'Store Admin']);
  for (const role of ['Merchandiser', 'Store Admin', 'System Admin', 'End-Customer'] as const) {
    const allowed = role === 'Merchandiser' || role === 'Store Admin';
    assert.equal(ROLE_PERMISSIONS[role].allowedScreens.includes('f06-recommendations'), allowed);
    assert.equal(authService.isScreenAllowed({ ...user, role }, 'f06-recommendations'), allowed);
    const html = renderToStaticMarkup(createElement(AppLayout, { currentScreen: 'f06-recommendations', currentUser: { ...user, role }, onNavigate: () => {}, children: null }));
    assert.equal(html.includes('>Recommendations<'), allowed);
  }
});
for (const role of ['System Admin', 'End-Customer'] as const) test(`${role} cannot load F06 sources, policy or generate`, async t => {
  const f = setup(t, role); f.workflow.start(); await flush();
  await f.workflow.generate();
  assert.equal(f.requests.mock.callCount(), 0); assert.equal(f.config.mock.callCount(), 0); assert.equal(f.submit.mock.callCount(), 0);
  const html = renderToStaticMarkup(createElement(F06WorkspaceView));
  assert.ok(html.includes('authorized account')); assert.equal(html.includes('<form'), false);
});
test('Store Admin can read sources and policy without type selection or a Generate button', async t => {
  const f = setup(t, 'Store Admin'); await select(f.workflow);
  await f.workflow.generate();
  assert.equal(f.requests.mock.callCount(), 1); assert.equal(f.config.mock.callCount(), 1);
  assert.equal(f.workflow.getSnapshot().selectedRunId, null); assert.equal(f.submit.mock.callCount(), 0);
  const html = renderToStaticMarkup(createElement(F06WorkspaceView));
  assert.ok(html.includes('Read-only access')); assert.ok(html.includes('Store Rules'));
  assert.equal(html.includes('<form'), false); assert.equal(html.includes('Generate recommendations'), false);
});
test('empty request history and no completed runs get explicit empty states', async t => {
  const f = setup(t); f.requests.mock.mockImplementation(async () => page([]));
  f.workflow.start(); await flush();
  let html = renderToStaticMarkup(createElement(F06RunPicker, { state: f.workflow.getSnapshot(), workflow: f.workflow }));
  assert.ok(html.includes('No mining requests are available')); assert.equal(f.submit.mock.callCount(), 0);
  f.requests.mock.mockImplementation(async () => page([requestFixture()]));
  f.runs.mock.mockImplementation(async () => [runFixture('RUNNING')]);
  await f.workflow.refreshHistory(); await f.workflow.selectRequest(17);
  f.workflow.selectRun(42); await f.workflow.generate();
  assert.equal(f.workflow.getSnapshot().selectedRunId, null);
  assert.equal(f.submit.mock.callCount(), 0);
  html = renderToStaticMarkup(createElement(F06RunPicker, { state: f.workflow.getSnapshot(), workflow: f.workflow }));
  assert.ok(html.includes('No completed runs are available')); assert.match(html, /type="radio"[^>]*disabled/);
});
for (const status of ['PENDING', 'RUNNING', 'FAILED', 'TIMED_OUT'] as const) test(`${status} run cannot be selected or submitted`, async t => {
  const f = setup(t); f.runs.mock.mockImplementation(async () => [runFixture(status)]);
  await select(f.workflow); await f.workflow.generate();
  assert.equal(f.workflow.getSnapshot().selectedRunId, null); assert.equal(f.submit.mock.callCount(), 0);
});
test('COMPLETED run under FAILED request/comparison remains selectable; statuses are separate', async t => {
  const f = setup(t);
  const request = { ...requestFixture('FAILED'), comparisonStatus: 'FAILED' as const };
  f.requests.mock.mockImplementation(async () => page([request])); f.detail.mock.mockImplementation(async () => request);
  await select(f.workflow); await f.workflow.generate();
  assert.equal(f.submit.mock.callCount(), 1);
  assert.deepEqual(f.submit.mock.calls[0].arguments[0], { miningRunId: 42, types: ['BUNDLE'] });
  const html = renderToStaticMarkup(createElement(F06RunPicker, { state: f.workflow.getSnapshot(), workflow: f.workflow }));
  assert.ok(html.includes('request status: FAILED')); assert.ok(html.includes('comparison status: FAILED')); assert.ok(html.includes('run status: COMPLETED'));
});
test('no selected types blocks submission; toggling never produces duplicates', async t => {
  const f = setup(t); await select(f.workflow);
  f.workflow.toggleType('BUNDLE'); await f.workflow.generate();
  assert.equal(f.submit.mock.callCount(), 0); assert.match(f.workflow.getSnapshot().generationError, /at least one/);
  f.workflow.toggleType('FBT'); f.workflow.toggleType('FBT'); f.workflow.toggleType('FBT');
  f.workflow.toggleType('CROSS_SELL'); await f.workflow.generate();
  assert.deepEqual(f.submit.mock.calls[0].arguments[0], { miningRunId: 42, types: ['FBT', 'CROSS_SELL'] });
});
test('successful generation renders actual counts, unique IDs and all skipped reasons', async t => {
  const f = setup(t); await select(f.workflow); await f.workflow.generate();
  assert.deepEqual(f.workflow.getSnapshot().result, generation);
  const html = renderToStaticMarkup(createElement(F06GenerationResult, { result: { ...generation, reusedCount: 3 }, types: ['BUNDLE'] }));
  for (const text of ['Recommendations Created', 'New Suggestions', 'Reused Suggestions', 'Skipped Checks', '#62', '#83', 'This format needs at least two products.', 'PATTERN_REQUIRES_AT_LEAST_TWO_PRODUCTS']) assert.ok(html.includes(text));
  assert.equal(html.includes('<button'), false);
});
test('zero candidates is a successful empty result, including zero-pattern runs with no skips', async t => {
  const f = setup(t); await select(f.workflow);
  const result = { ...generation, createdCount: 0, reusedCount: 0, recommendationIds: [], skipped: [] };
  f.submit.mock.mockImplementation(async () => result);
  await f.workflow.generate(); assert.deepEqual(f.workflow.getSnapshot().result, result); assert.equal(f.workflow.getSnapshot().generationError, '');
  const html = renderToStaticMarkup(createElement(F06GenerationResult, { result, types: ['BUNDLE'] }));
  assert.ok(html.includes('No recommendations were returned')); assert.ok(html.includes('No patterns were skipped'));
});

test('reused-only results do not claim new recommendations and skipped reasons can be collapsed', () => {
  const html = renderToStaticMarkup(createElement(F06GenerationResult, { result: { ...generation, createdCount: 0, reusedCount: 3 }, types: ['BUNDLE'] }));
  assert.ok(html.includes('Existing Suggestions Reused')); assert.equal(html.includes('Recommendations Created'), false);
  assert.ok(html.includes('Reused Suggestions')); assert.ok(html.includes('A pattern may appear more than once'));
  assert.match(html, /<details[^>]*>\s*<summary[^>]*>Why some suggestions were skipped/);
  assert.equal(html.includes('<details open'), false);
});

test('long recommendation references are collapsed without dropping IDs; browse action is a plain UI button', () => {
  const ids = Array.from({ length: 12 }, (_, index) => 100 + index);
  const html = renderToStaticMarkup(createElement(F06GenerationResult, { result: { ...generation, recommendationIds: ids }, types: ['BUNDLE'], onViewRecommendations: () => {} }));
  for (const id of ids) assert.ok(html.includes(`#${id}`));
  assert.match(html, /<details[^>]*>\s*<summary[^>]*>Show all 12 recommendation references/);
  assert.match(html, /<button type="button"[^>]*>View Recommendations/); assert.equal(html.includes('href='), false);
});
test('409 retains backend detail and waits for a new manual action, without automatic reads or writes', async t => {
  const f = setup(t); await select(f.workflow);
  f.submit.mock.mockImplementation(async () => { throw new F06ApiError(409, 'Frozen mining source is inconsistent or unavailable'); });
  await f.workflow.generate(); await flush();
  assert.match(f.workflow.getSnapshot().generationError, /Frozen mining source.*409.*manually/);
  assert.equal(f.workflow.getSnapshot().result, null); assert.equal(f.workflow.getSnapshot().pending, false);
  assert.equal(f.submit.mock.callCount(), 1); assert.equal(f.runs.mock.callCount(), 1);
  await f.workflow.generate(); assert.equal(f.submit.mock.callCount(), 2);
});
for (const status of [400, 401, 403, 404, null]) test(`generate handles ${status ?? 'network'} without fabricating results`, async t => {
  const f = setup(t); await select(f.workflow);
  f.submit.mock.mockImplementation(async () => { throw new F06ApiError(status, 'Controlled failure'); });
  await f.workflow.generate();
  assert.match(f.workflow.getSnapshot().generationError, /Controlled failure/);
  assert.equal(f.workflow.getSnapshot().result, null); assert.equal(f.submit.mock.callCount(), 1);
});
test('double submit and changing selection during an outstanding write cannot start another mutation', async t => {
  const f = setup(t); await select(f.workflow);
  const pending = deferred<RecGenerationResult>(); f.submit.mock.mockImplementation(() => pending.promise);
  const first = f.workflow.generate(); const second = f.workflow.generate();
  assert.equal(f.workflow.getSnapshot().pending, true); assert.equal(f.submit.mock.callCount(), 1);
  f.workflow.toggleType('BANNER'); await f.workflow.refreshHistory(); await f.workflow.selectRequest(17);
  assert.deepEqual(f.workflow.getSnapshot().types, ['BUNDLE']); assert.equal(f.requests.mock.callCount(), 1);
  pending.resolve(generation); await Promise.all([first, second]); assert.equal(f.workflow.getSnapshot().pending, false);
});
test('request pagination and manual refresh use real F05 API and clear the previous source/result', async t => {
  const f = setup(t); await select(f.workflow); await f.workflow.generate();
  f.requests.mock.mockImplementation(async index => page([], index, 45));
  await f.workflow.refreshHistory(1);
  assert.equal(f.requests.mock.calls.at(-1)!.arguments[0], 1);
  assert.equal(f.workflow.getSnapshot().request, null); assert.equal(f.workflow.getSnapshot().result, null);
  assert.equal(f.workflow.getSnapshot().history?.totalElements, 45);
});
test('switching request aborts its GETs; out-of-order responses cannot replace the new selection', async t => {
  const f = setup(t); const second = { ...requestFixture(), requestId: 18 };
  f.requests.mock.mockImplementation(async () => page([requestFixture(), second]));
  const old = deferred<RunView[]>();
  f.detail.mock.mockImplementation(async id => id === 17 ? requestFixture() : second);
  f.runs.mock.mockImplementation(id => id === 17 ? old.promise : Promise.resolve([{ ...runFixture('COMPLETED'), requestId: 18, runId: 43 }]));
  f.workflow.start(); await flush(); const first = f.workflow.selectRequest(17);
  const oldSignal = f.runs.mock.calls[0].arguments[1];
  await f.workflow.selectRequest(18); assert.equal(oldSignal?.aborted, true);
  old.resolve([runFixture('COMPLETED')]); await first;
  assert.equal(f.workflow.getSnapshot().request?.requestId, 18); assert.equal(f.workflow.getSnapshot().runs[0].runId, 43);
});
test('session changes while loading abort GETs and reject late data from the previous Store', async t => {
  const f = setup(t); const pending = deferred<Page<RequestView>>(); f.requests.mock.mockImplementation(() => pending.promise);
  f.workflow.start(); const oldSignal = f.requests.mock.calls[0].arguments[2];
  f.change(null, 'signed-out'); assert.equal(oldSignal?.aborted, true);
  pending.resolve(page([requestFixture('COMPLETED')])); await flush();
  assert.equal(f.workflow.getSnapshot().history, null); assert.equal(f.workflow.getSnapshot().request, null); assert.equal(f.workflow.getSnapshot().policy, null);
});
test('Store changes in the same session clear selection, results and in-flight mutations', async t => {
  const f = setup(t); await select(f.workflow);
  const pending = deferred<RecGenerationResult>(); f.submit.mock.mockImplementation(() => pending.promise);
  const submitted = f.workflow.generate();
  f.requests.mock.mockImplementation(async () => page([]));
  f.change({ ...user, role: 'Merchandiser', storeId: 2 });
  assert.equal(f.submit.mock.calls[0].arguments[1]?.aborted, true);
  pending.resolve(generation); await submitted; await flush();
  assert.equal(f.workflow.getSnapshot().result, null); assert.equal(f.workflow.getSnapshot().selectedRunId, null);
  assert.equal(f.workflow.getSnapshot().history?.items.length, 0); assert.equal(f.submit.mock.callCount(), 1);
});
test('unmount/StrictMode cleanup aborts pending reads, drops late writes and does not auto-generate on restart', async t => {
  const f = setup(t); await select(f.workflow);
  const pending = deferred<RecGenerationResult>(); f.submit.mock.mockImplementation(() => pending.promise);
  const submitted = f.workflow.generate(); f.workflow.stop();
  assert.equal(f.submit.mock.calls[0].arguments[1]?.aborted, true);
  pending.resolve(generation); await submitted;
  f.workflow.start(); await flush();
  assert.equal(f.workflow.getSnapshot().result, null); assert.equal(f.submit.mock.callCount(), 1);
});
test('source/policy failures remain errors with manual refresh and never become sample data', async t => {
  const f = setup(t);
  f.requests.mock.mockImplementation(async () => { throw new F05ApiError(404, 'Source unavailable'); });
  f.config.mock.mockImplementation(async () => { throw new F06ApiError(403, 'Policy unavailable'); });
  f.workflow.start(); await flush();
  assert.equal(f.workflow.getSnapshot().history, null); assert.match(f.workflow.getSnapshot().historyError, /404/);
  assert.equal(f.workflow.getSnapshot().policy, null); assert.match(f.workflow.getSnapshot().policyError, /403/);
  assert.equal(f.submit.mock.callCount(), 0);
});
