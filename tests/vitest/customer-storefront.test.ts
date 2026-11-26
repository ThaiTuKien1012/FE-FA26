import { describe, expect, it, vi } from 'vitest';
import { createCustomerApi, customerErrorMessage } from '../../src/features/customer/customer.api';
import { createCustomerCart } from '../../src/features/customer/customerCart';
import { formatCustomerMoney } from '../../src/features/customer/customerMoney';
import { money } from '../../src/features/store/f02.forms';
import { STOREFRONT_STORE, STOREFRONT_WITH_BROKEN_IMAGES, STOREFRONT_WITH_IMAGES, storefrontFixture } from '../storefront.fixtures';
import type { CartView } from '../../src/features/customer/customer.types';

const empty: CartView = {
  cartId: null, store: { ...STOREFRONT_STORE, storeSlug: 'qa-store-b', name: 'Store B' }, version: '0',
  currency: 'VND', updatedAt: null, items: [], subtotal: 0,
};
const line = {
  itemId: '11', productId: 4, quantity: 2, name: 'Milk', imageUrl: null, unit: 'box',
  unitPrice: 21.5, lineTotal: 43, state: 'AVAILABLE' as const,
};
const cart: CartView = { ...empty, cartId: '9', version: '1', items: [line], subtotal: 43 };
function wire(value: unknown) {
  return JSON.stringify(value).replace(/("(?:version|cartId|itemId)":)"(\d+)"/g, '$1$2');
}
const ok = (value: unknown) => new Response(wire(value));
const conflict = (code: string, components?: unknown) => Response.json({ code, error: 'Problem', components }, { status: 409 });
const components = [{ productId: 4, requested: 1, added: 1 }, { productId: 5, requested: 1, added: 0 }];

describe('F09/F10 API adapter', () => {
  it('uses public paths and passes search, category, paging and sort using contract names', async () => {
    const publicRequest = vi.fn(async (path: string) => ok(path.endsWith('/stores') ? [] : { store: STOREFRONT_STORE }));
    const privateRequest = vi.fn();
    const api = createCustomerApi(publicRequest, privateRequest);
    await api.stores();
    await api.home('qa/store');
    await api.products('qa-store-b', { search: 'A & B', categoryId: 2, page: 1, sortBy: 'sellingPrice', sortDirection: 'desc' });
    await api.product('qa-store-b', 2);
    expect(publicRequest.mock.calls.map(([path]) => path)).toEqual([
      '/api/storefront/stores', '/api/storefront/qa%2Fstore/home',
      '/api/storefront/qa-store-b/products?search=A+%26+B&categoryId=2&page=1&sortBy=sellingPrice&sortDirection=desc',
      '/api/storefront/qa-store-b/products/2',
    ]);
    expect(privateRequest).not.toHaveBeenCalled();
  });

  it.each([
    ['available', STOREFRONT_WITH_IMAGES],
    ['none', STOREFRONT_STORE],
    ['broken on fetch', STOREFRONT_WITH_BROKEN_IMAGES],
    ['relative', { ...STOREFRONT_WITH_IMAGES, iconUrl: STOREFRONT_WITH_IMAGES.iconUrl.slice(1) }],
  ] as const)('adapts %s Store images on list, home and cart', async (_, store) => {
    const request = async (path: string) => ok(storefrontFixture(path, 'GET', store)?.body);
    const api = createCustomerApi(request, request);
    const expected = { ...store, iconUrl: store.iconUrl && `/${store.iconUrl.replace(/^\//, '')}` };
    await expect(api.stores()).resolves.toEqual([expected]);
    await expect(api.home(store.storeSlug)).resolves.toMatchObject({ store: expected });
    await expect(api.getCart(store.storeSlug)).resolves.toMatchObject({ store: expected, version: '0' });
    const cartWithStore = { ...cart, store };
    const cartApi = createCustomerApi(request, async (_path, init) =>
      ok(init?.body === '{"bundleKey":"key"}' ? { cart: cartWithStore, components } : cartWithStore));
    await expect(cartApi.addItem(store.storeSlug, '0', 4, 1)).resolves.toMatchObject({ store: expected });
    await expect(cartApi.addBundle(store.storeSlug, '0', 'key')).resolves.toMatchObject({ cart: { store: expected } });
  });

  it('normalizes omitted branding from an older backend', async () => {
    const { storeSlug, name } = STOREFRONT_STORE;
    const api = createCustomerApi(async () => ok([{ storeSlug, name }]), vi.fn());
    await expect(api.stores()).resolves.toEqual([STOREFRONT_STORE]);
  });

  it.each([[0.5, '1 ₫'], [1234.4, '1,234 ₫'], [1234.5, '1,235 ₫']])(
    'formats F02 VND %s without decimals and keeps the existing label', (value, expected) => {
      expect(money(value)).toBe(expected);
    },
  );

  it('sends the exact cart payloads and quoted If-Match including large int64 values', async () => {
    const request = vi.fn().mockImplementation(() => ok(cart));
    const api = createCustomerApi(vi.fn(), request);
    await api.getCart('qa-store-b');
    await api.addItem('qa-store-b', '0', 4, 1);
    await api.changeQuantity('qa-store-b', '9007199254740993', '9007199254740995', 99);
    await api.removeItem('qa-store-b', '1', '11');
    request.mockImplementationOnce(() => ok({ cart, components }));
    await api.addBundle('qa-store-b', '1', 'opaque-key');
    expect(request.mock.calls.map(([path, init]) => [path, init?.method, new Headers(init?.headers).get('If-Match'), init?.body])).toEqual([
      ['/api/storefront/qa-store-b/cart', undefined, null, undefined],
      ['/api/storefront/qa-store-b/cart/items', 'POST', '"0"', '{"productId":4,"quantity":1}'],
      ['/api/storefront/qa-store-b/cart/items/9007199254740995', 'PATCH', '"9007199254740993"', '{"quantity":99}'],
      ['/api/storefront/qa-store-b/cart/items/11', 'DELETE', '"1"', undefined],
      ['/api/storefront/qa-store-b/cart/bundles', 'POST', '"1"', '{"bundleKey":"opaque-key"}'],
    ]);
    request.mockImplementationOnce(() => ok({ ...cart, version: '9007199254740993' }));
    expect((await api.getCart('qa-store-b')).version).toBe('9007199254740993');
  });

  it('preserves status and rejection details and maps public errors safely', async () => {
    const api = createCustomerApi(vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
      vi.fn().mockResolvedValue(conflict('BUNDLE_ADD_REJECTED', components)));
    await expect(api.home('missing')).rejects.toMatchObject({ status: 404 });
    await expect(api.addBundle('qa-store-b', '0', 'key')).rejects.toMatchObject({
      status: 409, code: 'BUNDLE_ADD_REJECTED', components,
    });
    expect(customerErrorMessage({ status: 409, code: 'BUNDLE_ADD_REJECTED' })).toMatch(/Không thể thêm/);
    expect(customerErrorMessage({ status: 404 })).toMatch(/Không tìm thấy/);
    expect(customerErrorMessage({ status: 503 })).toMatch(/tạm thời/);
  });

  it('preserves zero and uses HALF_UP whole đồng formatting', () => {
    expect(formatCustomerMoney(21000.5)).toBe('21.001 ₫');
    expect(formatCustomerMoney(21000.49)).toBe('21.000 ₫');
    expect(formatCustomerMoney(0)).toBe('0 ₫');
    expect(formatCustomerMoney(null)).toBe('Chưa có giá');
  });
});

describe('server-backed cart state', () => {
  function fixture() {
    const request = vi.fn().mockImplementation(() => ok(cart));
    const api = createCustomerApi(vi.fn(), request);
    return { request, state: createCustomerCart(api, 'qa-store-b') };
  }

  it('reloads on version conflict and never replays the write', async () => {
    const { request, state } = fixture();
    await state.load();
    request.mockImplementationOnce(() => conflict('CART_VERSION_CONFLICT'))
      .mockImplementationOnce(() => ok({ ...cart, version: '4' }));
    await state.mutate({ kind: 'quantity', itemId: '11', quantity: 3 });
    expect(request.mock.calls.map(([, init]) => init?.method ?? 'GET')).toEqual(['GET', 'PATCH', 'GET']);
    expect(state.getSnapshot().cart?.version).toBe('4');
    expect(state.getSnapshot().message).toMatch(/đã thay đổi/);
  });

  it.each(['CART_QUANTITY_LIMIT', 'INSUFFICIENT_SELLABLE_STOCK'])('keeps the last quantity after %s', async code => {
    const { request, state } = fixture();
    await state.load();
    request.mockImplementationOnce(() => conflict(code));
    await state.mutate({ kind: 'quantity', itemId: '11', quantity: 100 });
    expect(state.getSnapshot().cart?.items[0].quantity).toBe(2);
    expect(request).toHaveBeenCalledTimes(2);
    expect(state.getSnapshot().message).toMatch(code === 'CART_QUANTITY_LIMIT' ? /99/ : /tồn kho/);
  });

  it('reports partial bundle results, then removes one ordinary line only', async () => {
    const { request, state } = fixture();
    await state.load();
    const other = { ...line, itemId: '12', productId: 5 };
    request.mockImplementationOnce(() => ok({ cart: { ...cart, version: '2', items: [line, other] }, components }));
    await state.mutate({ kind: 'bundle', bundleKey: 'key' });
    expect(state.getSnapshot().components).toEqual(components);
    request.mockImplementationOnce(() => ok({ ...cart, version: '3', items: [other] }));
    await state.mutate({ kind: 'remove', itemId: '11' });
    expect(state.getSnapshot().cart?.items).toEqual([other]);
    expect(request.mock.calls.at(-1)?.[0]).toMatch(/\/items\/11$/);
  });

  it('preserves the cart and displays component results when all are rejected', async () => {
    const { request, state } = fixture();
    await state.load();
    request.mockImplementationOnce(() => conflict('BUNDLE_ADD_REJECTED', [{ ...components[1] }]));
    await state.mutate({ kind: 'bundle', bundleKey: 'key' });
    expect(state.getSnapshot().cart).toEqual(cart);
    expect(state.getSnapshot().components).toEqual([components[1]]);
    expect(state.getSnapshot().message).toMatch(/Không thể thêm/);
  });

  it('blocks double clicks and ignores responses after the Store/session scope ends', async () => {
    const { request, state } = fixture();
    await state.load();
    let finish!: (value: Response) => void;
    request.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = state.mutate({ kind: 'add', productId: 4, quantity: 1 });
    await state.mutate({ kind: 'add', productId: 4, quantity: 1 });
    expect(request).toHaveBeenCalledTimes(2);
    state.dispose();
    finish(ok({ ...cart, version: '2' }));
    await pending;
    expect(state.getSnapshot().cart).toBeNull();
  });

  it('refetches after uncertain network outcomes and never automatically resends', async () => {
    const { request, state } = fixture();
    await state.load();
    request.mockRejectedValueOnce(new TypeError('Network')).mockImplementationOnce(() => ok(cart));
    await state.mutate({ kind: 'remove', itemId: '11' });
    expect(request.mock.calls.map(([, init]) => init?.method ?? 'GET')).toEqual(['GET', 'DELETE', 'GET']);
    expect(state.getSnapshot().cart?.version).toBe('1');
    expect(state.getSnapshot().message).toMatch(/xác nhận/);
  });
});

describe('customer login return', () => {
  it('keeps a same-app Store and product and ignores arbitrary redirect targets', async () => {
    const { customerLoginPath, customerLoginTarget, customerPath } = await import('../../src/features/customer/customerRoutes');
    const url = new URL(customerLoginPath('qa-store-b', '6'), 'https://example.test');
    expect(customerLoginTarget(url.pathname, url.search)).toEqual({ slug: 'qa-store-b', productId: '6' });
    expect(customerLoginTarget('/login', '?returnStore=..&returnProduct=6')).toBeNull();
    expect(customerLoginTarget('/login', '?returnStore=qa-store-b&returnProduct=https://example.test')).toEqual({
      slug: 'qa-store-b', productId: null,
    });
    expect(customerPath('qa-store-b', '6')).toBe('/product/6?store=qa-store-b');
  });
});
