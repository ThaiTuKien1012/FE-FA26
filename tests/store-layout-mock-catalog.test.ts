import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import type { LayoutProduct as F02Product } from '../src/features/store/storeLayoutMockCatalog';
import { layoutImageFor, mockLayoutProduct } from '../src/features/store/storeLayoutMockCatalog';
import { productGroup } from '../src/features/store/storeLayoutMerchandising';

const currentSkus = [
  'F02-COFFEE-01', 'F02-MILK-01',
  ...Array.from({ length: 8 }, (_, index) => `STORE30-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 20 }, (_, index) => `STORE30-${String(index + 11).padStart(2, '0')}`),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 25, 27, 28, 29, 30]
    .map(number => `STOREMORE-${String(number).padStart(2, '0')}`),
];

function product(sku: string, overrides: Partial<F02Product> = {}): F02Product {
  return { id: currentSkus.indexOf(sku) + 1, sku, name: `Sản phẩm ${sku}`, stockQuantity: 0, ...overrides } as F02Product;
}

test('all 56 current Store SKUs receive a usable image, with varied illustrated packshots for missing assets', () => {
  assert.equal(currentSkus.length, 56);
  const sources = currentSkus.map(sku => layoutImageFor(product(sku)));
  for (const source of sources) {
    if (source.startsWith('/')) assert.ok(existsSync(join(process.cwd(), 'public', source.slice(1))), source);
    else {
      assert.ok(source.startsWith('data:image/svg+xml,'), source);
      assert.match(decodeURIComponent(source.slice('data:image/svg+xml,'.length)), /<svg[\s\S]*<\/svg>/);
    }
  }
  assert.ok(new Set(sources).size >= 48, 'The product images should not repeat excessively');
});

test('mock group labels fill every merchandising row while retaining real API fields', () => {
  const expectations = [
    ['F02-MILK-01', 'hot'], ['STORE30-27', 'new'], ['STORE30-03', 'regular'],
    ['STORE30-17', 'best'], ['STOREMORE-30', 'regular'],
  ] as const;
  for (const [sku, expected] of expectations) {
    const item = mockLayoutProduct(product(sku, { sellingPrice: 42000, stockQuantity: 9 }));
    assert.equal(productGroup(item, {}), expected);
    assert.equal(item.sellingPrice, 42000);
    assert.equal(item.stockQuantity, 9);
  }
  const realApiItem = mockLayoutProduct(product('F02-MILK-01', { isHotSale: false, isNew: true }));
  assert.equal(productGroup(realApiItem, {}), 'new');
});
