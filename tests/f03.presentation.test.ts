import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { completeMatrix, importanceControls, matrixRowWarnings, sortMatrix, tenthImportance, utilityNumber } from '../src/features/f03/f03.presentation';
import { draftFromConfig, configErrors } from '../src/features/f03/f03.validation';
import { Warnings, Pager } from '../src/features/f03/components/F03Shared';
import { Matrix } from '../src/features/f03/components/UtilityMatrix';
import { MerchantSnapshotList } from '../src/features/f03/components/MerchantSnapshotList';
import { configView, legacyMatrix, matrix, snapshot } from './f03.fixtures';

test('importance controls show tenths without modifying precise saved coefficients or the Save draft', () => {
  const config = { ...configView.config, alpha: 0.333333, beta: 0.666667 };
  const draft = draftFromConfig(config), before = JSON.stringify(draft);
  assert.deepEqual(importanceControls(draft), { alpha: '0.3', beta: '0.7' });
  assert.equal(JSON.stringify(draft), before);
  assert.equal(Number(draft.alpha), 0.333333);
  assert.deepEqual(configErrors(draft, configView.lambdaPolicy), []);
  assert.deepEqual(importanceControls({ alpha: '0.35', beta: '0.65' }), { alpha: '0.4', beta: '0.6' });
});
test('importance input accepts only inclusive tenths and always formats one decimal', () => {
  for (let tenth = 0; tenth <= 10; tenth++) assert.equal(tenthImportance(String(tenth / 10)), (tenth / 10).toFixed(1));
  for (const value of ['', '-0.1', '1.1', '0.01', '0.333333', '1e-1', 'NaN']) assert.equal(tenthImportance(value), null);
});
test('warnings correlate exact product IDs or attached row evidence, never unqualified page warnings', () => {
  const row = matrix().items[0];
  assert.deepEqual(matrixRowWarnings(row, ['MISSING_PUSH_DAY', 'Product 10: inactive Product', 'Unmatched import warning']), []);
  assert.deepEqual(matrixRowWarnings(row, ['Product 1: inactive Product', 'Product 10: no sellable batch']), ['Product 1: inactive Product']);
  const evidence = { ...row.expiryEvidence!, warnings: ['MISSING_PUSH_DAY'] };
  assert.deepEqual(matrixRowWarnings({ ...row, expiryEvidence: evidence }, []), ['MISSING_PUSH_DAY']);
  assert.deepEqual(matrixRowWarnings(legacyMatrix().items[0], ['Unmatched historical warning']), []);
});
test('a partial matrix never sorts a page in isolation, including its last short page', () => {
  const result = matrix(), original = JSON.stringify(result);
  assert.equal(completeMatrix(result), false);
  assert.deepEqual(sortMatrix(result, { key: 'transactionId', direction: 'desc' }), result.items);
  assert.equal(completeMatrix(matrix(1)), false);
  const html = renderToStaticMarkup(createElement(Matrix, { result, loadPage: () => {}, busy: false }));
  assert.match(html, /Sorting is available when all rows fit on one page/);
  assert.match(html, /disabled=""/);
  assert.equal(JSON.stringify(result), original);
});
test('complete-dataset sorting is stable, handles unavailable values and preserves frozen evidence', () => {
  const source = matrix();
  const result = { ...source, totalElements: 3, items: [
    { ...source.items[0], transactionId: 3, productId: 3, weightedUtility: null },
    { ...source.items[0], transactionId: 2, productId: 2, weightedUtility: 2.123456 },
    { ...source.items[0], transactionId: 1, productId: 1, weightedUtility: 2.123456 }
  ] };
  const before = JSON.stringify(result);
  assert.equal(completeMatrix(result), true);
  for (const direction of ['asc', 'desc'] as const) assert.deepEqual(sortMatrix(result, { key: 'weightedUtility', direction }).map(row => row.transactionId), [2, 1, 3]);
  assert.deepEqual(sortMatrix(result, { key: 'productId', direction: 'asc' }, { 1: 'Zebra', 2: 'Apple', 3: 'Milk' }).map(row => row.productId), [2, 3, 1]);
  assert.equal(JSON.stringify(result), before);
});
test('matrix shows names and exact values, with per-product warnings and a collapsed page summary', () => {
  const source = matrix();
  const result = { ...source, totalElements: 1, items: [source.items[0]], warnings: ['Product 1: inactive Product', 'Unmatched warning'] };
  const html = renderToStaticMarkup(createElement(Matrix, { result, loadPage: () => {}, busy: false, names: { 1: 'Fresh milk' } }));
  for (const text of ['Fresh milk', 'Needs Attention', 'View Issue', '2 warnings', 'View All', 'Technical Details', '11.54074']) assert.ok(html.includes(text));
  assert.equal(html.includes('<details open'), false);
  assert.equal(html.includes('matrix rows pagination'), false);
});
test('warning summary keeps unlinked warnings and distinguishes warnings from request errors', () => {
  const html = renderToStaticMarkup(createElement(Warnings, { warnings: ['MISSING_PUSH_DAY', 'Unlinked warning'], compact: true }));
  for (const text of ['2 warnings', 'View All', 'Unlinked warning', 'separate from request errors', 'Historical transactions are retained']) assert.ok(html.includes(text));
  assert.equal(html.includes('role="alert"'), false);
});
test('compact pagination is omitted for empty or single-page merchant datasets', () => {
  for (const totalElements of [0, 1, 20]) assert.equal(renderToStaticMarkup(createElement(Pager, { page: { page: 0, pageSize: 20, totalElements }, onChange: () => {}, label: 'snapshots', hideSingle: true })), '');
  assert.match(renderToStaticMarkup(createElement(Pager, { page: { page: 0, pageSize: 20, totalElements: 21 }, onChange: () => {}, label: 'snapshots', hideSingle: true })), /Next/);
});
test('snapshot list keeps READY and frozen values unchanged while collapsing warnings', () => {
  const saved = { ...snapshot(), warnings: ['MISSING_PUSH_DAY'] }, before = JSON.stringify(saved);
  const html = renderToStaticMarkup(createElement(MerchantSnapshotList, { items: [saved], busy: false }));
  for (const text of ['Snapshot', 'Sales period', 'READY', 'View Details', '1 warning']) assert.ok(html.includes(text));
  assert.equal(html.includes('type="radio"'), false);
  assert.equal(JSON.stringify(saved), before);
  assert.equal(utilityNumber(null), 'Unavailable'); assert.equal(utilityNumber(0), '0'); assert.equal(utilityNumber(1234.123456), '1,234.123456');
});
