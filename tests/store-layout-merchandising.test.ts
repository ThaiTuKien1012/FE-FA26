import assert from 'node:assert/strict';
import test from 'node:test';
import {
  alignMerchandisingProducts, arrangeMerchandisingProducts, autoArrangeMerchandisingProducts, GROUPS, merchandisingZones, parseMerchandising, productGroup, reorderMerchandisingProducts,
} from '../src/features/store/storeLayoutMerchandising';

test('all requested merchandising sections exist while empty sections remain compact', () => {
  const products = [{ id: 1, stockQuantity: 5 }];
  const zones = merchandisingZones(products, { '1': 'regular' });
  assert.deepEqual(zones.map(zone => zone.group), GROUPS);
  assert.deepEqual(zones.slice(0, 4).map(zone => zone.height), [64, 64, 64, 64]);
  assert.equal(zones[4].count, 1);
  assert.equal(zones[4].y, 256);
});

test('API flags and manual overrides place products in Hot Sale, New, Combo, and Best Seller', () => {
  const products = [
    { id: 1, stockQuantity: 5, isHotSale: true },
    { id: 2, stockQuantity: 9, isNew: true },
    { id: 3, stockQuantity: 2, isCombo: true },
    { id: 4, stockQuantity: 3, isBestSeller: true },
    { id: 5, stockQuantity: 1 },
  ];
  const overrides = { '1': 'regular' as const };
  const groups = Object.fromEntries(products.map(product => [String(product.id), productGroup(product, overrides)]));
  assert.deepEqual(groups, { '1': 'regular', '2': 'new', '3': 'combo', '4': 'best', '5': 'regular' });
  const zones = merchandisingZones(products, groups);
  const frames = arrangeMerchandisingProducts(products, groups);
  assert.equal(Object.keys(frames).length, products.length);
  for (const product of products) {
    const zone = zones.find(item => item.group === groups[String(product.id)])!;
    assert.ok(frames[String(product.id)].y >= zone.y + 70);
    assert.ok(frames[String(product.id)].y + 184 <= zone.y + zone.height);
  }
});

test('saved groups accept new and combo while ignoring invalid entries', () => {
  assert.deepEqual(parseMerchandising('{"1":"hot","2":"new","3":"combo","4":"unknown","bad":"best"}'), { '1': 'hot', '2': 'new', '3': 'combo' });
});

test('auto arrange includes every catalog product and uses API flags plus manually assigned groups', () => {
  const products = [
    { id: 1, name: 'Sale', stockQuantity: 0, isHotSale: true },
    { id: 2, name: 'New', stockQuantity: 3, isNew: true },
    { id: 3, name: 'Combo', stockQuantity: 0, isCombo: true },
    { id: 4, name: 'Popular', stockQuantity: 8, isBestSeller: true },
    { id: 5, name: 'Manual', stockQuantity: 2 },
    { id: 6, name: 'Regular', stockQuantity: 0 },
  ];
  const { frames, zones } = autoArrangeMerchandisingProducts(products, { '5': 'combo' });
  assert.equal(Object.keys(frames).length, products.length);
  assert.deepEqual(zones.map(zone => zone.count), [1, 1, 2, 1, 1]);
  for (const [index, product] of products.entries()) {
    const zone = zones.find(item => frames[String(product.id)].y >= item.y && frames[String(product.id)].y < item.y + item.height);
    assert.equal(zone?.group, ['hot', 'new', 'combo', 'best', 'combo', 'regular'][index]);
  }
});

test('dragging before or after a card reorders and snaps its group to the grid', () => {
  const products = [1, 2, 3, 4].map(id => ({ id, stockQuantity: 20 }));
  const groups = Object.fromEntries(products.map(product => [String(product.id), 'hot' as const]));
  const initial = arrangeMerchandisingProducts(products, groups);
  const after = reorderMerchandisingProducts(products, groups, initial, 1, 'hot',
    { x: initial['3'].x + 130, y: initial['3'].y + 90 });
  assert.deepEqual([2, 3, 1, 4].map(id => after[String(id)].x), [36, 228, 420, 612]);
  assert.ok(Object.values(after).every(frame => frame.y === 70));
  const before = reorderMerchandisingProducts(products, groups, initial, 4, 'hot',
    { x: initial['1'].x + 20, y: initial['1'].y + 90 });
  assert.deepEqual([4, 1, 2, 3].map(id => before[String(id)].x), [36, 228, 420, 612]);
  const blank = reorderMerchandisingProducts(products, groups, initial, 1, 'hot',
    { x: 810, y: initial['4'].y + 90 });
  assert.deepEqual([2, 3, 4, 1].map(id => blank[String(id)].x), [36, 228, 420, 612]);
});

test('moving to another group closes the old gap and inserts into the new group', () => {
  const products = [1, 2, 3].map(id => ({ id, stockQuantity: 20 }));
  const groups = { '1': 'hot' as const, '2': 'hot' as const, '3': 'new' as const };
  const initial = arrangeMerchandisingProducts(products, groups, { combo: 2 });
  const after = reorderMerchandisingProducts(products, groups, initial, 1, 'new',
    { x: initial['3'].x + 10, y: initial['3'].y + 90 }, { combo: 2 });
  assert.equal(after['2'].x, 36);
  assert.equal(after['1'].x, 36);
  assert.equal(after['3'].x, 228);
  assert.ok(after['1'].y > after['2'].y);
  assert.equal(new Set(Object.values(after).map(frame => `${frame.x}:${frame.y}`)).size, 3);
});

test('removing a product closes the gap without undoing a custom order', () => {
  const products = [1, 2, 3, 4].map(id => ({ id, stockQuantity: 20 }));
  const groups = Object.fromEntries(products.map(product => [String(product.id), 'hot' as const]));
  const initial = arrangeMerchandisingProducts(products, groups);
  const reordered = reorderMerchandisingProducts(products, groups, initial, 4, 'hot',
    { x: initial['1'].x + 20, y: initial['1'].y + 90 });
  const withoutSecond = alignMerchandisingProducts(products.filter(product => product.id !== 2), groups, reordered);
  assert.deepEqual([4, 1, 3].map(id => withoutSecond[String(id)].x), [36, 228, 420]);
});
