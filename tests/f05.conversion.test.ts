import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { setImmediate as flush } from 'node:timers/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { authService } from '../src/services/authService';
import { f05Api, F05ApiError } from '../src/features/f05/f05.api';
import { f05SystemApi } from '../src/features/f05/f05.system.api';
import { isRequestView, isRunView } from '../src/features/f05/f05.read-contracts';
import { conversionDescription, sameMiningInput } from '../src/features/f05/f05.conversion';
import { MiningConversionDetails } from '../src/features/f05/components/MiningConversionDetails';
import { watchMiningRequest, type MiningProgress } from '../src/features/f05/f05.progress';
import { f06Api } from '../src/features/f06/f06.api';
import { generation } from './f06.fixtures';
import { conversionRequestFixture, conversionRunFixture, efimRequestFixture, progressFixture, requestFixture, runFixture, user } from './f05.fixtures';

function setup(t: TestContext, system = false) {
  let actor = { ...user, role: system ? 'System Admin' as const : 'Merchandiser' as const, storeId: system ? null : 1 };
  t.mock.method(authService, 'getCurrentUser', () => actor);
  t.mock.method(authService, 'getToken', () => 'conversion-fixture-token');
  t.mock.method(globalThis, 'fetch', async () => { throw Error('Unexpected HTTP blocked'); });
  return { system() { actor = { ...user, role: 'System Admin', storeId: null }; } };
}
const modes = ['LOSSLESS', 'WHOLE_UNIT_HALF_UP'] as const;
for (const mode of modes) {
  test(`${mode} request/run metadata parses without altering frozen numbers`, () => {
    const request = conversionRequestFixture(mode), run = conversionRunFixture(mode), before = structuredClone(request);
    assert.equal(isRequestView(request), true); assert.equal(isRunView(run), true); assert.equal(sameMiningInput(request, run), true);
    assert.deepEqual(request, before); assert.equal(request.snapshot.totalWeightedUtility, 48.123456);
    assert.equal(request.roundingUnit, mode === 'LOSSLESS' ? null : 1);
    if (mode === 'WHOLE_UNIT_HALF_UP') assert.notEqual(request.snapshot.totalWeightedUtility, request.totalScaledUtility);
  });
  test(`${mode} reads through Store and System request/run APIs`, async t => {
    const context = setup(t), request = conversionRequestFixture(mode), run = conversionRunFixture(mode);
    t.mock.method(globalThis, 'fetch', async (url: RequestInfo | URL) => {
      const path = String(url);
      if (path.endsWith('/runs')) return Response.json([run]);
      if (path.endsWith('/runs/42')) return Response.json(run);
      if (path.endsWith('/requests/17')) return Response.json(request);
      return Response.json({ items: [request], page: 0, pageSize: 20, totalElements: 1 });
    });
    assert.deepEqual(await f05Api.getRequest(17), request); assert.deepEqual(await f05Api.getRun(42), run);
    assert.deepEqual(await f05Api.listRequests(), { items: [request], page: 0, pageSize: 20, totalElements: 1 });
    context.system(); assert.deepEqual(await f05SystemApi.getRequest(1, 17), request); assert.deepEqual(await f05SystemApi.listRuns(1, 17), [run]);
  });
  test(`${mode} EFIM acknowledgement accepts exactly two submission fields`, async t => {
    setup(t); const request = conversionRequestFixture(mode, 'PENDING'), body = { snapshotId: request.snapshotId, requestKey: request.requestKey };
    let calls = 0;
    t.mock.method(globalThis, 'fetch', async (url: RequestInfo | URL, init?: RequestInit) => { calls++; assert.equal(url, '/api/mining/requests'); assert.deepEqual(JSON.parse(String(init?.body)), body); return Response.json(request, { status: 202 }); });
    assert.deepEqual(await f05Api.createRequest(body), request); assert.equal(calls, 1);
    await assert.rejects(f05Api.createRequest({ ...body, conversionMode: mode } as typeof body), error => error instanceof F05ApiError && error.status === 400);
    assert.equal(calls, 1);
  });
  test(`${mode} Additional Details is neutral and distinguishes saved F03 data`, () => {
    const request = conversionRequestFixture(mode), description = conversionDescription(request);
    const html = renderToStaticMarkup(createElement(MiningConversionDetails, { value: request }));
    assert.ok(html.includes(mode)); assert.ok(html.includes(request.conversionVersion)); assert.ok(!html.includes('role="alert"'));
    assert.ok(!html.includes('Not measured')); assert.ok(description.explanation.includes(mode === 'LOSSLESS' ? 'exactly' : 'snapshot is unchanged'));
    assert.ok(html.includes(mode === 'LOSSLESS' ? 'None (exact conversion)' : '1 đồng (HALF_UP)'));
  });
  test(`${mode} recovery keeps backend percent/threshold and stops after empty completed run`, async t => {
    setup(t); t.mock.timers.enable({ apis: ['setTimeout'] }); let cycle = 0;
    const progress = [{ ...progressFixture('RUNNING'), stage: 'SAVING', completedSteps: 1, percent: 50 }, { ...progressFixture('RUNNING'), attemptNo: 2, percent: 0 }, progressFixture('COMPLETED')];
    t.mock.method(globalThis, 'fetch', async (url: RequestInfo | URL) => {
      const path = String(url), done = cycle >= 3;
      return Response.json(path.endsWith('/progress') ? progress[cycle++] : path.endsWith('/runs') ? [conversionRunFixture(mode, done ? 'COMPLETED' : 'RUNNING')] : conversionRequestFixture(mode, done ? 'COMPLETED' : 'RUNNING'));
    });
    const seen: MiningProgress[] = [], stop = watchMiningRequest(17, data => seen.push(data), error => assert.fail(String(error))); t.after(stop);
    await flush(); t.mock.timers.tick(1500); await flush(); t.mock.timers.tick(1500); await flush(); t.mock.timers.tick(60_000); await flush();
    assert.deepEqual(seen.map(data => data.progress.percent), [50, 0, 100]); assert.equal(cycle, 3);
    assert.equal(seen.at(-1)?.runs[0].patternCount, 0); assert.ok(seen.every(data => data.request.conversionMode === mode && data.request.minUtilSpmf === conversionRequestFixture(mode).minUtilSpmf));
  });
  test(`${mode} F06 accepts only a completed run and sends no conversion fields`, async t => {
    setup(t); const calls: Array<{ url: string; body?: unknown }> = [], body = { miningRunId: 42, types: ['BUNDLE' as const] };
    const emptyGeneration = { ...generation, createdCount: 0, reusedCount: 0, recommendationIds: [], skipped: [] };
    let complete = false;
    t.mock.method(globalThis, 'fetch', async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined });
      return Response.json(String(url).endsWith('/runs/42') ? conversionRunFixture(mode, complete ? 'COMPLETED' : 'TIMED_OUT') : emptyGeneration);
    });
    await assert.rejects(f06Api.generate(body)); assert.equal(calls.length, 1);
    complete = true; assert.deepEqual(await f06Api.generate(body), emptyGeneration);
    assert.deepEqual(calls.at(-1), { url: '/api/recommendations/generate', body }); assert.ok(calls.every(call => !call.url.includes('/mining/requests')));
  });
}
test('legacy missing fields and unknown-version null fields remain readable without inference', () => {
  for (const request of [requestFixture(), { ...requestFixture(), conversionMode: null, roundingUnit: null }]) {
    assert.equal(isRequestView(request), true); assert.equal(conversionDescription(request).label, 'Not recorded');
  }
  assert.equal(isRunView(runFixture()), true); assert.equal(isRunView({ ...runFixture(), conversionMode: null, roundingUnit: null }), true);
  const legacy = { ...conversionRequestFixture('LOSSLESS') }; delete legacy.conversionMode; delete legacy.roundingUnit;
  assert.equal(isRequestView(legacy), true); assert.equal(conversionDescription(legacy).rounding, 'Not recorded');
});
test('inconsistent modes, rounding units, versions and whole-input scaling are rejected', () => {
  const whole = conversionRequestFixture('WHOLE_UNIT_HALF_UP'), exact = conversionRequestFixture('LOSSLESS');
  for (const invalid of [
    { ...whole, roundingUnit: null }, { ...whole, roundingUnit: 1000 }, { ...whole, roundingUnit: '1' }, { ...whole, roundingUnit: 1.5 },
    { ...whole, conversionMode: 'LOSSLESS' }, { ...whole, conversionMode: undefined, roundingUnit: undefined },
    { ...whole, conversionVersion: 'UNKNOWN' }, { ...whole, utilityScale: 6 }, { ...whole, divisor: 2 }, { ...whole, roundingMode: 'DOWN' },
    { ...exact, roundingUnit: 0 }, { ...exact, conversionMode: null }, { ...exact, utilityScale: 0 },
    { ...exact, conversionMode: 'OTHER' }, { ...requestFixture(), conversionMode: 'LOSSLESS', roundingUnit: null },
  ]) assert.equal(isRequestView(invalid), false, JSON.stringify(invalid));
  assert.equal(isRunView({ ...conversionRunFixture('WHOLE_UNIT_HALF_UP'), roundingUnit: null }), false);
  assert.equal(isRunView({ ...runFixture(), conversionMode: null }), false);
});
test('request/run frozen input mismatch stops progress instead of mixing conversion modes', async t => {
  setup(t); const seen: unknown[] = [], errors: unknown[] = [];
  t.mock.method(globalThis, 'fetch', async (url: RequestInfo | URL) => Response.json(String(url).endsWith('/progress') ? progressFixture('COMPLETED') : String(url).endsWith('/runs') ? [conversionRunFixture('LOSSLESS')] : conversionRequestFixture('WHOLE_UNIT_HALF_UP')));
  const stop = watchMiningRequest(17, value => seen.push(value), error => errors.push(error)); t.after(stop); await flush();
  assert.equal(seen.length, 0); assert.equal(errors.length, 1); assert.ok(errors[0] instanceof F05ApiError);
  for (const patch of [{ inputHash: 'wrong' }, { minUtilSpmf: 123 }, { conversionVersion: 'other' }]) assert.equal(sameMiningInput(efimRequestFixture(), { ...runFixture(), ...patch }), false);
});
test('failed/timed-out whole-unit responses stay readable and null telemetry stays null', () => {
  const request = conversionRequestFixture('WHOLE_UNIT_HALF_UP', 'FAILED'), run = { ...conversionRunFixture('WHOLE_UNIT_HALF_UP', 'TIMED_OUT'), failureCode: 'TIMED_OUT', failureMessage: 'Execution time limit exceeded' };
  assert.equal(isRequestView(request), true); assert.equal(isRunView(run), true); assert.equal(run.runtimeMillis, null); assert.equal(run.patternCount, null);
});
