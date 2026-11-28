import assert from 'node:assert/strict';
import test from 'node:test';
import { getCustomerProductId, getPathForScreen, getScreenFromPathname } from '../src/utils/navigationRouter';
import { ROLE_PERMISSIONS } from '../src/services/authService';
import { customerCartPath, customerLoginPath, customerLoginTarget } from '../src/features/customer/customerRoutes';

test('cart deep links and customer sign-in retain Store scope and a cart destination', () => {
  assert.equal(getScreenFromPathname('/cart'), 'customer-cart');
  assert.equal(customerCartPath('green-market'), '/cart?store=green-market');
  assert.equal(customerCartPath(null), '/cart');
  const url = new URL(customerLoginPath('green-market', null, true), 'https://example.invalid');
  assert.deepEqual(customerLoginTarget(url.pathname, url.search), { slug: 'green-market', productId: null, cart: true });
  assert.equal(customerLoginTarget('/login', '?returnStore=https://evil.invalid&returnCart=1'), null);
  for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    assert.equal(permissions.allowedScreens.includes('customer-cart'), role === 'End-Customer');
  }
});

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
