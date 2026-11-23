import assert from 'node:assert/strict';
import { test } from 'node:test';
import { batchTableRows, categoryTableRows, emptyBatchFilters, emptyCategoryFilters, nextTableSort, sortTableRows, tablePage } from '../src/features/store/f02.tables';
import type { F02Batch, F02Category } from '../src/features/store/store.api';

const categories: F02Category[] = [
  { id: 10, name: 'Đồ uống', status: 'ACTIVE' }, { id: 2, name: 'Bánh', status: 'ACTIVE' },
  { id: 11, name: 'Ăn vặt', status: 'INACTIVE' }, { id: 1, name: 'Áo', status: 'ACTIVE' },
  { id: 20, name: 'Bánh', status: 'INACTIVE' }, { id: 9, name: 'Bánh', status: 'ACTIVE' }
];
const batch: F02Batch = { id: 1, productId: 4, batchCode: 'BATCH-2', receivedAt: '2026-11-18T18:00:00Z', expiryDate: '2027-01-01', pushDay: '2026-12-25', initialQuantity: 100, remainingQuantity: 10, status: 'ACTIVE', createdAt: '2026-11-18T18:00:00Z', updatedAt: '2026-11-18T18:00:00Z' };
const batches: F02Batch[] = [batch, { ...batch, id: 2, batchCode: 'BATCH-10', receivedAt: '2026-11-18T16:00:00Z', expiryDate: null, pushDay: null, remainingQuantity: 2, status: 'BLOCKED' }, { ...batch, id: 3, batchCode: 'BATCH-1', receivedAt: '2026-11-20T01:00:00Z', expiryDate: '2026-12-30', remainingQuantity: 100, initialQuantity: 200 }, { ...batch, id: 4, batchCode: 'BATCH-2' }];
const ids = (rows: Array<{ id: number }>) => rows.map(row => row.id);

test('Category ID sort is numeric, both directions; data is not mutated', () => {
  const before = structuredClone(categories);
  assert.deepEqual(ids(categoryTableRows(categories, emptyCategoryFilters, { by: 'id', direction: 'asc' })), [1, 2, 9, 10, 11, 20]);
  assert.deepEqual(ids(categoryTableRows(categories, emptyCategoryFilters, { by: 'id', direction: 'desc' })), [20, 11, 10, 9, 2, 1]);
  assert.deepEqual(categories, before);
});

test('Vietnamese Category names sort by locale; equal names use ID ascending in either direction', () => {
  assert.deepEqual(ids(categoryTableRows(categories, emptyCategoryFilters, { by: 'name', direction: 'asc' })), [1, 11, 2, 9, 20, 10]);
  assert.deepEqual(ids(categoryTableRows(categories, emptyCategoryFilters, { by: 'name', direction: 'desc' })), [10, 2, 9, 20, 11, 1]);
});

test('Category filters combine exact ID, accent-insensitive name and status using AND', () => {
  assert.deepEqual(ids(categoryTableRows(categories, { id: '', name: 'banh', status: 'ACTIVE' }, null)), [2, 9]);
  assert.deepEqual(ids(categoryTableRows(categories, { id: '20', name: ' BÁNH ', status: 'INACTIVE' }, null)), [20]);
  assert.deepEqual(categoryTableRows(categories, { id: '20', name: 'Bánh', status: 'ACTIVE' }, null), []);
  assert.deepEqual(ids(categoryTableRows(categories, { id: '', name: 'do uong', status: '' }, null)), [10]);
});

test('Category sort and filter run across the full list before pagination, including rows beyond page one', () => {
  const all = Array.from({ length: 35 }, (_, index) => ({ id: index + 1, name: index > 19 ? 'Match' : 'Other', status: 'ACTIVE' as const }));
  const matching = categoryTableRows(all, { id: '', name: 'Match', status: '' }, { by: 'id', direction: 'desc' });
  assert.equal(matching.length, 15);
  assert.deepEqual(ids(tablePage(matching, 0)), [35, 34, 33, 32, 31, 30, 29, 28, 27, 26]);
  assert.deepEqual(ids(tablePage(matching, 1)), [25, 24, 23, 22, 21]);
});

test('One primary sort toggles asc/desc and starts a new column ascending', () => {
  assert.deepEqual(nextTableSort(null, 'id'), { by: 'id', direction: 'asc' });
  assert.deepEqual(nextTableSort({ by: 'id', direction: 'asc' }, 'id'), { by: 'id', direction: 'desc' });
  assert.deepEqual(nextTableSort({ by: 'id', direction: 'desc' }, 'name'), { by: 'name', direction: 'asc' });
});

test('Batch code uses natural text order, quantities use numeric order and ties use ID', () => {
  assert.deepEqual(ids(batchTableRows(batches, emptyBatchFilters(), { by: 'batchCode', direction: 'asc' })), [3, 1, 4, 2]);
  assert.deepEqual(ids(batchTableRows(batches, emptyBatchFilters(), { by: 'remainingQuantity', direction: 'asc' })), [2, 1, 4, 3]);
  assert.deepEqual(ids(batchTableRows(batches, emptyBatchFilters(), { by: 'remainingQuantity', direction: 'desc' })), [3, 1, 4, 2]);
  assert.deepEqual(ids(batchTableRows(batches, emptyBatchFilters(), { by: 'status', direction: 'asc' })), [1, 3, 4, 2]);
});

test('Received sorting compares actual instants, including timezone offsets', () => {
  const rows = [{ ...batch, id: 1, receivedAt: '2026-01-01T23:00:00-05:00' }, { ...batch, id: 2, receivedAt: '2026-01-02T02:00:00Z' }];
  assert.deepEqual(ids(batchTableRows(rows, emptyBatchFilters(), { by: 'receivedAt', direction: 'asc' })), [2, 1]);
});

for (const by of ['expiryDate', 'pushDay'] as const) test(`Batch ${by} keeps Not set last in both directions`, () => {
  const asc = batchTableRows(batches, emptyBatchFilters(), { by, direction: 'asc' });
  const desc = batchTableRows(batches, emptyBatchFilters(), { by, direction: 'desc' });
  assert.equal(asc.at(-1)?.id, 2); assert.equal(desc.at(-1)?.id, 2);
});

test('Date filters use inclusive store calendar days and exclude Not set when bounded', () => {
  assert.deepEqual(ids(batchTableRows(batches, { ...emptyBatchFilters(), receivedAt: { min: '2026-11-19', max: '2026-11-19' } }, null)), [1, 4]);
  assert.deepEqual(ids(batchTableRows(batches, { ...emptyBatchFilters(), expiryDate: { min: '2027-01-01', max: '2027-01-01' } }, null)), [1, 4]);
  assert.deepEqual(ids(batchTableRows(batches, { ...emptyBatchFilters(), pushDay: { min: '2026-12-25', max: '2026-12-25' } }, null)), [1, 3, 4]);
});

test('Not set and date-is-set filters distinguish missing dates without inventing values', () => {
  assert.deepEqual(ids(batchTableRows(batches, { ...emptyBatchFilters(), expiryDate: { presence: 'unset' } }, null)), [2]);
  assert.deepEqual(ids(batchTableRows(batches, { ...emptyBatchFilters(), pushDay: { presence: 'set' } }, null)), [1, 3, 4]);
});

test('Batch filters combine code, received, expiry, push day, status and numeric bounds using AND', () => {
  const filters = { ...emptyBatchFilters(), batchCode: { text: 'batch-2' }, receivedAt: { min: '2026-11-19' }, expiryDate: { min: '2027-01-01' }, pushDay: { max: '2026-12-25' }, status: { choice: 'ACTIVE' }, remainingQuantity: { min: '10', max: '10' } };
  assert.deepEqual(ids(batchTableRows(batches, filters, null)), [1, 4]);
  assert.deepEqual(batchTableRows(batches, { ...filters, remainingQuantity: { min: '11' } }, null), []);
});

test('Batch filter/sort before pagination does not mutate inventory totals or original order', () => {
  const rows = Array.from({ length: 25 }, (_, index) => ({ ...batch, id: index + 1, remainingQuantity: index, initialQuantity: 100 }));
  const before = structuredClone(rows), total = rows.reduce((sum, row) => sum + row.remainingQuantity, 0);
  const matching = batchTableRows(rows, { ...emptyBatchFilters(), remainingQuantity: { min: '10' } }, { by: 'remainingQuantity', direction: 'desc' });
  assert.deepEqual(ids(tablePage(matching, 0)), [25, 24, 23, 22, 21, 20, 19, 18, 17, 16]);
  assert.equal(rows.reduce((sum, row) => sum + row.remainingQuantity, 0), total);
  assert.deepEqual(rows, before);
});

test('Null values and equal numeric/text values consistently tie-break by ID', () => {
  assert.deepEqual(ids(sortTableRows([{ id: 5 }, { id: 2 }], 'desc', () => null)), [2, 5]);
});
