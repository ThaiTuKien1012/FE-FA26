import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StoreExpiryTable } from '../src/features/f03/components/ProductScores';
import type { F03PushPage } from '../src/features/f03/f03.api';
import assert from 'node:assert/strict';
import test from 'node:test';
import { configErrors, draftFromConfig, enabledTotal, millionths, periodError, previewEligible, validScore } from '../src/features/f03/f03.validation';
import { configView, matrix } from './f03.fixtures';
import { authService, ROLE_PERMISSIONS, SCREEN_OWNER_MAP } from '../src/services/authService';
import { getPathForScreen, getScreenFromPathname } from '../src/utils/navigationRouter';
import { f03Api } from '../src/features/f03/f03.api';

const draft = () => draftFromConfig(configView.config);
test('coefficients use exact six-place decimal sums without tolerance', () => {
  assert.deepEqual(configErrors(draft(), configView.lambdaPolicy), []);
  assert.equal(enabledTotal({ ...draft(), alpha: '0.333333', beta: '0.333333', gamma: '0.333334' }), 1000000n);
  assert.ok(configErrors({ ...draft(), alpha: '0.499999' }, configView.lambdaPolicy).length);
  assert.ok(configErrors({ ...draft(), alpha: '0.5000001' }, configView.lambdaPolicy).length);
  assert.equal(millionths('0.000001'), 1n);
});
test('disabled coefficients remain stored; enabled total and all-disabled baseline follow backend', () => {
  assert.ok(configErrors({ ...draft(), enableExpiry: false }, configView.lambdaPolicy).length);
  assert.deepEqual(configErrors({ ...draft(), enableExpiry: false, alpha: '0.7' }, configView.lambdaPolicy), []);
  assert.deepEqual(configErrors({ ...draft(), enableStock: false, enableExpiry: false, enableSeason: false }, configView.lambdaPolicy), []);
  assert.ok(configErrors({ ...draft(), enableStock: false, enableExpiry: false, enableSeason: false, beta: '2' }, configView.lambdaPolicy).length);
});
test('Lambda policy limits and decimal validation apply at boundaries', () => {
  for (const lambda of ['0', '0.5', '0.123456']) assert.deepEqual(configErrors({ ...draft(), lambda }, configView.lambdaPolicy), []);
  for (const lambda of ['', '-0.1', '0.500001', '0.1234567', 'NaN']) assert.ok(configErrors({ ...draft(), lambda }, configView.lambdaPolicy).length);
});
test('manual score validation preserves six places and rejects blanks and out-of-range inputs', () => {
  for (const value of ['0', '1', '0.000001', '0.999999']) assert.equal(validScore(value), true);
  for (const value of ['', '-1', '1.000001', '0.1234567', 'Infinity', '1e-3']) assert.equal(validScore(value), false);
});
test('sales dates require real calendar dates; Analysis Date is independently selectable', () => {
  assert.equal(periodError({ rangeStart: '2026-10-01', rangeEnd: '2026-10-31', asOfDate: '2026-09-01' }), '');
  assert.ok(periodError({ rangeStart: '2026-10-31', rangeEnd: '2026-10-01', asOfDate: '2026-11-05' }));
  for (const bad of ['', '2026-02-30', '2026-13-01', '0000-01-01']) assert.ok(periodError({ rangeStart: bad, rangeEnd: '2026-11-05', asOfDate: '2026-11-05' }));
});
test('READY is authoritative; informational warnings do not become readiness failures', () => {
  assert.equal(previewEligible(matrix()), true);
  assert.equal(previewEligible({ ...matrix(), warnings: ['Historical transaction retained'] }), true);
  assert.equal(previewEligible({ ...matrix(), ready: false }), false);
  assert.equal(previewEligible({ ...matrix(), totalElements: 0 }), false);
  assert.equal(previewEligible(null), false);
});
test('four routes, legacy links and role permissions preserve detail isolation', () => {
  for (const screen of ['f03-configuration', 'f03-product-scores', 'f03-preview', 'f03-snapshots'] as const) assert.equal(getScreenFromPathname(getPathForScreen(screen)), screen);
  assert.equal(getScreenFromPathname('/f03/snapshot'), 'f03-snapshots');
  assert.equal(getScreenFromPathname('/f03/snapshot/matrix'), 'f03-snapshot-matrix');
  for (const role of ['Merchandiser', 'Store Admin'] as const) assert.ok(ROLE_PERMISSIONS[role].allowedScreens.includes('f03-snapshots'));
  for (const role of ['System Admin', 'End-Customer'] as const) assert.ok(!ROLE_PERMISSIONS[role].allowedScreens.includes('f03-snapshots'));
  assert.deepEqual(SCREEN_OWNER_MAP['f03-snapshot-detail']?.allowedRoles, ['Merchandiser']);
});
test('API uses real paginated mining history and unchanged three-field creation payload, without retries', async () => {
  const original = globalThis.fetch;
  const originalToken = authService.getToken;
  const calls: { path: string; init?: RequestInit }[] = [];
  authService.getToken = () => null;
  globalThis.fetch = async (path, init) => { calls.push({ path: String(path), init }); return new Response(JSON.stringify({ error: 'fixture failure' }), { status: 503 }); };
  try {
    await assert.rejects(f03Api.listSnapshots(2, 20));
    await assert.rejects(f03Api.createSnapshot({ rangeStart: '2026-10-01', rangeEnd: '2026-10-31', asOfDate: '2026-11-05' }));
    assert.equal(calls[0].path, '/api/mining/snapshots?page=2&pageSize=20');
    assert.equal(calls.length, 2);
    assert.deepEqual(Object.keys(JSON.parse(calls[1].init?.body as string)).sort(), ['asOfDate', 'rangeEnd', 'rangeStart']);
  } finally { globalThis.fetch = original; authService.getToken = originalToken; }
});

test('Store expiry UI keeps backend priority separate from sellability and uses inventory wording', () => {
 const page: F03PushPage = { items: [{ productId: 1, batchId: 9, expiryDate: '2026-11-12', remainingQuantity: 50, expiryPushDays: 10, daysRemaining: 3, pushRequired: true, pushRequiredQuantity: 50, asOfDate: '2026-11-09' }], page: 0, pageSize: 20, totalElements: 1, asOfDate: '2026-11-09', timeZone: 'Asia/Ho_Chi_Minh', warnings: [] };
 const before = JSON.stringify(page);
 const html = renderToStaticMarkup(createElement(StoreExpiryTable, { result: page, names: new Map([[1, 'Fresh milk']]) }));
 for(const label of ['Fresh milk', 'Batch #9', '3 days left', 'Needs attention', '12 Nov 2026', 'Remaining']) assert.ok(html.includes(label));
 for(const label of ['Priority push (', 'High priority', 'Unsellable', 'Expired']) assert.equal(html.includes(label), false);
 assert.equal(JSON.stringify(page), before);
 page.items[0].pushRequired = false;
 const fallback = renderToStaticMarkup(createElement(StoreExpiryTable, { result: page, names: new Map() }));
 assert.ok(fallback.includes('Product #1')); assert.ok(fallback.includes('No action needed'));
});
