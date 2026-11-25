import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { paginationItems, paginationRange } from '../src/features/store/f02.tables';
import { F02TableEmpty, F02TablePagination } from '../src/features/store/components/F02Table';

test('37 pages show first/last and at most two neighbours on each side', () => {
  assert.deepEqual(paginationItems(0, 37), [0, 1, 2, 'ellipsis', 36]);
  assert.deepEqual(paginationItems(18, 37), [0, 'ellipsis', 16, 17, 18, 19, 20, 'ellipsis', 36]);
  assert.deepEqual(paginationItems(36, 37), [0, 'ellipsis', 34, 35, 36]);
});
test('all positions in small and large paginations stay bounded and accessible', () => {
  for (const total of [1, 2, 3, 7, 37, 1000]) for (let current = 0; current < total; current++) {
    const items = paginationItems(current, total), numbers = items.filter((item): item is number => typeof item === 'number');
    assert.equal(numbers[0], 0); assert.equal(numbers.at(-1), total - 1); assert.ok(numbers.includes(current));
    assert.ok(numbers.length <= 7); assert.ok(items.length <= 9); assert.equal(new Set(numbers).size, numbers.length);
    assert.ok(numbers.every(number => number === 0 || number === total - 1 || Math.abs(number - current) <= 2));
    assert.ok(items.every((item, index) => item !== 'ellipsis' || index > 0 && index < items.length - 1 && items[index - 1] !== 'ellipsis'));
  }
});
test('out-of-range page clamps to first or last after totals shrink', () => {
  assert.deepEqual(paginationItems(99, 3), [0, 1, 2]); assert.deepEqual(paginationItems(-1, 3), [0, 1, 2]);
  assert.deepEqual(paginationRange(99, 11, 1), { from: 11, to: 11 });
});
test('range uses actual visible records for 0, 1, 2, 9, 10 and 11 rows', () => {
  for (const total of [0, 1, 2, 9, 10, 11]) assert.deepEqual(paginationRange(0, total, Math.min(total, 10)), { from: total ? 1 : 0, to: Math.min(total, 10) });
  assert.deepEqual(paginationRange(1, 11, 1), { from: 11, to: 11 });
  assert.deepEqual(paginationRange(0, 361, 2), { from: 1, to: 2 });
  assert.deepEqual(paginationRange(0, 361, 0), { from: 0, to: 0 });
});
test('361 products first/middle/last ranges match server totalElements', () => {
  assert.deepEqual(paginationRange(0, 361, 10), { from: 1, to: 10 });
  assert.deepEqual(paginationRange(18, 361, 10), { from: 181, to: 190 });
  assert.deepEqual(paginationRange(36, 361, 1), { from: 361, to: 361 });
});
const pagination = (page: number, total: number, count: number, disabled = false) => renderToStaticMarkup(React.createElement(F02TablePagination, { label: 'Products', page, totalPages: Math.max(1, Math.ceil(total / 10)), total, count, disabled, onPage: () => {} }));
test('single/empty page renders summary without unnecessary page controls', () => {
  for (const total of [0, 1, 2, 9, 10]) { const html = pagination(0, total, total); assert.ok(!html.includes('<nav')); assert.ok(html.includes(`Showing ${total ? 1 : 0}–${total} of ${total} products`)); }
});
test('pagination renders semantic current page and non-button ellipses', () => {
  const html = pagination(18, 361, 10);
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1); assert.ok(html.includes('Go to page 19')); assert.ok(html.includes('Page 19 of 37'));
  assert.equal((html.match(/class="f02-page-ellipsis"/g) || []).length, 2);
  assert.equal((html.match(/<button/g) || []).length, 9);
  assert.match(pagination(0, 361, 10), /class="f02-page-step" disabled="">Previous/);
  assert.match(pagination(36, 361, 1), /class="f02-page-step" disabled="">Next/);
  assert.equal((pagination(18, 361, 10, true).match(/disabled=""/g) || []).length, 9);
});
test('empty table row only exists for a message, never as ten-row filler', () => {
  assert.equal(renderToStaticMarkup(React.createElement(F02TableEmpty, { columns: 7 })), '');
  const html = renderToStaticMarkup(React.createElement(F02TableEmpty, { columns: 7, message: 'No batches found.' }));
  assert.equal((html.match(/<tr/g) || []).length, 1); assert.ok(html.includes('colSpan="7"') || html.includes('colspan="7"')); assert.ok(!html.includes('height:'));
});
