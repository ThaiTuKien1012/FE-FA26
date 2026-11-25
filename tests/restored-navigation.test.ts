import assert from 'node:assert/strict';
import test from 'node:test';
import { getCustomerProductId, getPathForScreen, getScreenFromPathname } from '../src/utils/navigationRouter';
import { ROLE_PERMISSIONS } from '../src/services/authService';
import { productPath, storeSlugFromPath } from '../src/features/customer/data/customerStores';

test('restored routes coexist with live F03–F08 routes and decode product deep links', () => {
  for (const screen of ['customer-home', 'customer-storefront', 'customer-product', 'f03-seasons', 'f04-import-transactions', 'f05-mining', 'f06-recommendations', 'f07-f08-workspace'] as const) {
    assert.equal(getScreenFromPathname(getPathForScreen(screen)), screen);
  }
  assert.equal(getScreenFromPathname('/product/demo%20item/'), 'customer-product');
  assert.equal(getCustomerProductId('/product/demo%20item/'), 'demo item');
  assert.equal(getCustomerProductId('/product/%E0%A4'), null);
});

test('old Store Layout links open F07 and campaigns retain both staff roles', () => {
  assert.equal(getScreenFromPathname('/store/layout'), 'f07-f08-workspace');
  for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    assert.equal(permissions.allowedScreens.includes('f07-f08-workspace'), ['Store Admin', 'Merchandiser'].includes(role));
  }
  assert.equal(ROLE_PERMISSIONS['End-Customer'].defaultScreen, 'customer-home');
  for (const screen of ['customer-home', 'customer-product', 'customer-storefront'] as const) assert.ok(ROLE_PERMISSIONS['End-Customer'].allowedScreens.includes(screen));
});

test('F09 product links retain the public Store slug across direct links and reloads', () => {
  const path = productPath('cửa-hàng-abc', '123');
  assert.equal(getScreenFromPathname(path), 'customer-product');
  assert.equal(getCustomerProductId(path), '123');
  assert.equal(storeSlugFromPath(path), 'cửa-hàng-abc');
  assert.equal(getScreenFromPathname('/storefront/shop-a/'), 'customer-storefront');
  assert.equal(storeSlugFromPath('/storefront/%E0%A4/products/1'), null);
});
