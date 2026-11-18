import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { F02Product } from '../src/features/store/store.api';
import { StoreLayoutComboDialog } from '../src/features/store/components/StoreLayoutComboDialog';
import type { ComboPlan } from '../src/features/store/storeLayoutCombos';

test('combo editor shows ingredients, stock, API subtotal, and review actions', () => {
  const products = [
    { id: 1, sku: 'F02-MILK-01', name: 'Sữa tươi', stockQuantity: 12, sellingPrice: 32000 },
    { id: 2, sku: 'F02-COFFEE-01', name: 'Cà phê', stockQuantity: 6, sellingPrice: 78000 },
  ] as F02Product[];
  const draft: ComboPlan = {
    id: 'auto:morning', name: 'Combo bữa sáng', items: [{ productId: 1, quantity: 1 }, { productId: 2, quantity: 1 }],
    price: 99000, status: 'suggested', source: 'auto',
  };
  const html = renderToStaticMarkup(createElement(StoreLayoutComboDialog, {
    draft, products, exists: true, error: '', onChange: () => {}, onSave: () => {}, onDismiss: () => {}, onClose: () => {},
  }));
  assert.match(html, /role="dialog"/);
  assert.match(html, /Combo bữa sáng/);
  assert.match(html, /Sản phẩm trong combo/);
  assert.match(html, /110\.000/);
  assert.match(html, /Tiết kiệm 11\.000/);
  assert.match(html, /Duyệt combo/);
  assert.match(html, /Bỏ qua đề xuất/);
});
