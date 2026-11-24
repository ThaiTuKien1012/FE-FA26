import assert from 'node:assert/strict';
import test from 'node:test';
import type { F02Product } from '../src/features/store/store.api';
import { comboDraftError, comboFacts, comboStorageKey, emptyComboState, parseComboState, suggestCombos, type ComboPlan } from '../src/features/store/storeLayoutCombos';
import { arrangeMerchandisingProducts, merchandisingLayoutSignature, merchandisingZones, rebaseMerchandisingFrames, restoreMerchandisingFrames, validMerchandisingPlacement } from '../src/features/store/storeLayoutMerchandising';

function product(id: number, sku: string, stockQuantity: number, sellingPrice: number): F02Product {
  return { id, sku, name: sku, stockQuantity, sellingPrice } as F02Product;
}

test('auto suggestions use actual Store SKUs, are idempotent, and respect dismissal', () => {
  const products = [
    product(1, 'F02-MILK-01', 21, 32000), product(2, 'F02-COFFEE-01', 8, 78000),
    product(3, 'STORE30-17', 0, 135000), product(4, 'STORE30-15', 0, 24000),
  ];
  const initial = suggestCombos(products, emptyComboState());
  assert.deepEqual(initial.combos.map(combo => combo.id), ['auto:morning', 'auto:pantry']);
  assert.deepEqual(initial.combos[0].items, [{ productId: 1, quantity: 1 }, { productId: 2, quantity: 1 }]);
  assert.equal(initial.combos[0].price, null);
  assert.equal(initial.combos[0].status, 'suggested');
  assert.deepEqual(suggestCombos(products, initial), initial);
  assert.deepEqual(suggestCombos(products, { combos: [], dismissedIds: ['auto:morning'] }).combos.map(combo => combo.id), ['auto:pantry']);
  assert.notEqual(comboStorageKey(1), comboStorageKey(2));
});

test('combo stock follows the limiting ingredient and no discount is inferred from dummy prices', () => {
  const combo: ComboPlan = {
    id: 'auto:morning', name: 'Combo bữa sáng', source: 'auto', status: 'suggested', price: null,
    items: [{ productId: 1, quantity: 2 }, { productId: 2, quantity: 1 }],
  };
  const facts = comboFacts(combo, [product(1, 'MILK', 21, 32000), product(2, 'COFFEE', 8, 78000)]);
  assert.equal(facts.stock, 8);
  assert.equal(facts.subtotal, 142000);
  assert.equal(comboFacts(combo, [product(1, 'MILK', 21, 1), product(2, 'COFFEE', 8, 1)]).subtotal, null);
  assert.equal(comboFacts(combo, [product(1, 'MILK', 0, 32000), product(2, 'COFFEE', 8, 78000)]).stock, 0);
});

test('combo editor reports the missing name separately from valid products, price and stock', () => {
  const products = [product(1, 'POWDER', 20, 145000), product(2, 'TUNA', 20, 35000)];
  const draft: ComboPlan = {
    id: 'manual:test', name: '', source: 'manual', status: 'suggested', price: 100000,
    items: [{ productId: 1, quantity: 1 }, { productId: 2, quantity: 1 }],
  };
  assert.equal(comboDraftError(draft, products, true), 'Vui lòng nhập tên combo.');
  assert.equal(comboDraftError({ ...draft, name: 'Combo bữa sáng' }, products, true), null);
  assert.equal(comboDraftError({ ...draft, name: 'Combo bữa sáng', items: [{ productId: 1, quantity: 1 }, { productId: 1, quantity: 1 }] }, products, true),
    'Mỗi sản phẩm chỉ được chọn một lần trong combo.');
});

test('combo cards reserve their own layout row without assigning single products to Combo', () => {
  const products = [product(1, 'MILK', 5, 32000), product(2, 'COFFEE', 4, 78000)];
  const groups = { '1': 'hot' as const, '2': 'regular' as const };
  const zones = merchandisingZones(products, groups, { combo: 3 });
  const frames = arrangeMerchandisingProducts(products, groups, { combo: 3 });
  assert.equal(zones.find(zone => zone.group === 'combo')?.count, 3);
  assert.ok(frames['2'].y > zones.find(zone => zone.group === 'combo')!.y);
  assert.equal(Object.keys(frames).length, 2);
});

test('adding and removing combo rows preserves manually positioned product cards', () => {
  const products = [product(1, 'MILK', 5, 32000), product(2, 'COFFEE', 4, 78000)];
  const groups = { '1': 'hot' as const, '2': 'regular' as const };
  const before = { '1': { x: 425, y: 95 }, '2': { x: 817, y: 286 } };
  const after = rebaseMerchandisingFrames(before, products, groups, { combo: 0 }, { combo: 8 });
  assert.deepEqual(after['1'], before['1']);
  assert.equal(after['2'].x, before['2'].x);
  assert.equal(after['2'].y - before['2'].y, 426);
  assert.deepEqual(rebaseMerchandisingFrames(after, products, groups, { combo: 8 }, { combo: 0 }), before);
});

test('reload identifies old or overlapping frame positions before restoring them', () => {
  const products = [product(1, 'MILK', 5, 32000), product(2, 'COFFEE', 4, 78000)];
  const groups = { '1': 'hot' as const, '2': 'new' as const };
  const arranged = arrangeMerchandisingProducts(products, groups, { combo: 3 });
  const signature = merchandisingLayoutSignature(products, groups, 3);
  assert.equal(validMerchandisingPlacement(arranged, products, groups, 3), true);
  assert.equal(restoreMerchandisingFrames(arranged, products, groups, 3, signature), arranged);
  assert.equal(validMerchandisingPlacement({ ...arranged, '2': { x: 36, y: 95 } }, products, groups, 3), false);
  assert.equal(validMerchandisingPlacement({ ...arranged, '2': { x: 36, y: arranged['1'].y } }, products, groups, 3), false);
  assert.deepEqual(restoreMerchandisingFrames({ ...arranged, '2': { x: 36, y: 95 } }, products, groups, 3, signature), arranged);
  assert.deepEqual(restoreMerchandisingFrames({ ...arranged, '2': { x: 60, y: arranged['2'].y } }, products, groups, 3, null), arranged);
  assert.notEqual(merchandisingLayoutSignature(products, groups, 0), merchandisingLayoutSignature(products, groups, 3));
  assert.notEqual(merchandisingLayoutSignature(products, groups, 3), merchandisingLayoutSignature(products, { ...groups, '2': 'hot' }, 3));
});

test('stored combo drafts are validated before loading', () => {
  const valid: ComboPlan = {
    id: 'auto:morning', name: 'Combo bữa sáng', source: 'auto', status: 'suggested', price: null,
    items: [{ productId: 1, quantity: 1 }, { productId: 2, quantity: 1 }],
  };
  const invalid = { ...valid, id: 'broken', items: [{ productId: 1, quantity: 1 }, { productId: 1, quantity: 1 }] };
  const unpricedApproved = { ...valid, id: 'broken-approved', status: 'approved' };
  assert.deepEqual(parseComboState(JSON.stringify({ combos: [valid, invalid, unpricedApproved], dismissedIds: ['auto:snack', 'bad'] })),
    { combos: [valid], dismissedIds: ['auto:snack'] });
  assert.deepEqual(parseComboState('{'), emptyComboState());
});
