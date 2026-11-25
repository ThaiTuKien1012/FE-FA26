import assert from 'node:assert/strict';
import test from 'node:test';
import { customerApi, publicImageUrl, StorefrontApiError, storefrontError } from '../src/features/customer/customer.api';

test('F09 uses only public Store-scoped reads without staff credentials', async t => {
  const calls: { url: string; init: RequestInit }[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => { calls.push({ url, init }); return Response.json([]); });
  await customerApi.stores();
  await customerApi.home('shop-a');
  await customerApi.product('shop-b', '123');
  assert.deepEqual(calls.map(call => call.url), ['/api/storefront/stores', '/api/storefront/shop-a/home', '/api/storefront/shop-b/products/123']);
  for (const { init } of calls) {
    assert.equal(init.credentials, 'omit');
    assert.equal(new Headers(init.headers).has('Authorization'), false);
    assert.equal(init.method, undefined);
  }
});
test('F09 search, category, sort and page are sent to the server', async t => {
  let path = '';
  t.mock.method(globalThis, 'fetch', async (url: string) => { path = url; return Response.json({ items: [], page: 2, pageSize: 20, totalElements: 0 }); });
  await customerApi.products('shop-a', { search: 'milk & tea', categoryId: 7, sortBy: 'sellingPrice', sortDirection: 'desc', page: 2 });
  const url = new URL(path, 'http://test');
  assert.equal(url.searchParams.get('search'), 'milk & tea');
  assert.equal(url.searchParams.get('categoryId'), '7');
  assert.equal(url.searchParams.get('sortBy'), 'sellingPrice');
  assert.equal(url.searchParams.get('sortDirection'), 'desc');
  assert.equal(url.searchParams.get('page'), '2');
});
test('F09 has no mock fallback on empty, missing, unavailable or network responses', async t => {
  const stub = t.mock.method(globalThis, 'fetch', async () => Response.json([]));
  assert.deepEqual(await customerApi.stores(), []);
  for (const status of [404, 503]) {
    stub.mock.mockImplementation(async () => Response.json({ error: 'Storefront not found' }, { status }));
    await assert.rejects(customerApi.home('missing'), (error: unknown) => error instanceof StorefrontApiError && error.status === status);
  }
  stub.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(customerApi.stores(), /fetch/);
  assert.match(storefrontError(new StorefrontApiError(404, 'Product not found')), /Sản phẩm/);
});
test('F09 abort signals are forwarded and obsolete completed reads are discarded', async t => {
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => { assert.equal(init.signal, controller.signal); controller.abort(); return Response.json([]); });
  await assert.rejects(customerApi.stores(controller.signal), (error: any) => error.name === 'AbortError');
});
test('invalid product IDs and unsafe image URLs are rejected', () => {
  assert.throws(() => customerApi.product('shop-a', 'demo-product'), /Product not found/);
  assert.equal(publicImageUrl('javascript:alert(1)'), undefined);
  assert.equal(publicImageUrl('/images/mock-product.png'), undefined);
  assert.equal(publicImageUrl('https://example.com/product.jpg'), 'https://example.com/product.jpg');
});
