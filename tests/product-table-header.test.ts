import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProductTableHeader } from '../src/components/common/ProductTableHeader';
import { nextTableSort } from '../src/features/store/f02.tables';
import { restoreProductViewState } from '../src/features/store/f02.product-view';

test('each product header exposes one accessible sort action and its direction', () => {
  for (const direction of ['asc', 'desc'] as const) {
      const html = renderToStaticMarkup(createElement(ProductTableHeader, { label: 'Product', description: 'Product name', column: 'name', sort: { by: 'name', direction }, onSort: () => {} }));
      assert.ok(html.includes(`aria-sort="${direction === 'asc' ? 'ascending' : 'descending'}"`));
      assert.ok(html.includes('Sort by Product name'));
      assert.equal((html.match(/<button\b/g) ?? []).length, 1);
      assert.equal(/Sort by Unit|Sort by SKU|<select|role="menu"/.test(html), false);
      assert.equal((html.match(/data-active="true"/g) ?? []).length, 1);
      assert.ok(html.includes(direction === 'asc' ? 'lucide-arrow-up' : 'lucide-arrow-down'));
      assert.equal(html.includes('lucide-arrow-up-down'), false);
  }
});

test('legacy Unit or invalid product sort preferences retain valid page and filters', () => {
  for (const sortBy of ['unit', 'unknown']) {
    const saved = { page: 1, query: 'milk', categoryId: '7', status: 'INACTIVE', sortBy, sortDirection: 'desc' };
    assert.deepEqual(restoreProductViewState(JSON.stringify(saved)), { ...saved, sortBy: 'name' });
  }
  const sku = { page: 2, query: 'SKU-', categoryId: '', status: 'ACTIVE', sortBy: 'sku', sortDirection: 'desc' };
  assert.deepEqual(restoreProductViewState(JSON.stringify(sku)), sku);
});

test('corrupt or inaccessible product preferences cannot break catalog rendering', () => {
  for (const raw of [null, 'null', '[]', 'bad json', '123']) assert.deepEqual(restoreProductViewState(raw), { page: 0, query: '', categoryId: '', status: '', sortBy: 'name', sortDirection: 'asc' });
  assert.deepEqual(restoreProductViewState('{"page":-1,"query":4,"categoryId":null,"status":"BROKEN","sortDirection":"sideways"}'), restoreProductViewState(null));
});

test('a different product column starts ascending, repeating it toggles, and disabled headers stay disabled', () => {
  const first = nextTableSort({ by: 'name', direction: 'asc' }, 'category');
  assert.deepEqual(first, { by: 'category', direction: 'asc' });
  assert.deepEqual(nextTableSort(first, 'category'), { by: 'category', direction: 'desc' });
  const html = renderToStaticMarkup(createElement(ProductTableHeader, { label: 'Stock', column: 'stockQuantity', sort: first, disabled: true, onSort: () => {} }));
  assert.ok(html.includes('aria-sort="none"'));
  assert.ok(html.includes('disabled=""'));
  assert.ok(html.includes('lucide-arrow-up-down'));
});
