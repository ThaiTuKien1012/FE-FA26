import { describe, expect, it, vi } from 'vitest';
import {
  buildBannerSlides, buildHomeModel, filterHomeProducts, HOME_BANNER_STORES, HOME_PRODUCTS_PER_STORE, HOME_STORE_LIMIT,
  homeCategories, homeSavedKey, loadCustomerHome, normalizeSearch, promoProducts, type HomeProduct,
} from '../../src/features/customer/customerHomeModel';
import { BANNER_ART } from '../../src/features/customer/data/customerBanners';
import { formatCustomerMoney } from '../../src/features/customer/customerMoney';
import type { Placement, StoreHome, StoreProduct, StoreProductPage, StoreSummary } from '../../src/features/customer/customer.types';
import { STOREFRONT_PRODUCT, STOREFRONT_STORE, STOREFRONT_WITH_IMAGES, storefrontFixture } from '../storefront.fixtures';

const store = (slug: string, overrides: Partial<StoreSummary> = {}): StoreSummary =>
  ({ storeSlug: slug, name: `Store ${slug}`, iconUrl: null, bannerUrl: null, ...overrides });
const product = (productId: number, overrides: Partial<StoreProduct> = {}): StoreProduct =>
  ({ ...STOREFRONT_PRODUCT, productId, name: `Product ${productId}`, ...overrides } as StoreProduct);
const page = (items: StoreProduct[], totalElements = items.length): StoreProductPage => ({ items, page: 0, pageSize: 12, totalElements });
const bundle = (blockNo: number, products: StoreProduct[], bundleKey: string | null = `key-${blockNo}`): Placement =>
  ({ type: 'BUNDLE', blockNo, startPosition: 1, products, bundleKey: bundleKey ?? undefined });
const homeOf = (s: StoreSummary, placements: Placement[] = []): StoreHome => ({
  store: s, campaignName: null, fallbackType: placements.length ? null : 'DEFAULT_CATALOG',
  zones: placements.length ? [{ name: 'BUNDLE', placements }] : [], catalog: [],
});

describe('customer home data model', () => {
  it('interleaves the products of each Store and tags them with the Store', () => {
    const a = store('a'); const b = store('b');
    const model = buildHomeModel([a, b], [
      { store: a, page: page([product(1), product(2), product(3)]), home: homeOf(a) },
      { store: b, page: page([product(11), product(12)]), home: homeOf(b) },
    ]);
    expect(model.products.map(item => `${item.storeSlug}:${item.productId}`)).toEqual(['a:1', 'b:11', 'a:2', 'b:12', 'a:3']);
    expect(model.products[1]).toMatchObject({ storeName: 'Store b', name: 'Product 11' });
    expect(model.failedStores).toBe(0);
    expect(model.truncated).toBe(false);
  });

  it('takes the Store product count from the API total, only for Stores that were read', () => {
    const a = store('a'); const b = store('b'); const c = store('c');
    const model = buildHomeModel([a, b, c], [
      { store: a, page: page([product(1)], 40), home: homeOf(a) },
      { store: b, home: homeOf(b) },
    ]);
    expect(model.stores.map(item => [item.storeSlug, item.productCount])).toEqual([['a', 40], ['b', null], ['c', null]]);
    expect(model.truncated).toBe(true);
    expect(model.failedStores).toBe(1);
    expect(model.sampledStores).toBe(2);
  });

  it('keeps only BUNDLE placements that have a bundle key and visible products', () => {
    const a = store('a'); const b = store('b');
    const cross: Placement = { type: 'CROSS_SELL', blockNo: 3, startPosition: 1, products: [product(9)] };
    const model = buildHomeModel([a, b], [
      { store: a, page: page([]), home: homeOf(a, [bundle(1, [product(1), product(2)]), bundle(2, []), bundle(4, [product(5)], null), cross]) },
      { store: b, page: page([]), home: homeOf(b, [bundle(1, [product(7)])]) },
    ]);
    expect(model.bundles.map(item => [item.key, item.storeSlug, item.products.map(p => p.productId)])).toEqual([
      ['a/1', 'a', [1, 2]], ['b/1', 'b', [7]],
    ]);
  });

  it('never invents data: no Stores gives no products, bundles or banner slides but the welcome one', () => {
    const model = buildHomeModel([], []);
    expect(model).toMatchObject({ stores: [], products: [], bundles: [], sampledStores: 0, failedStores: 0 });
    expect(buildBannerSlides([]).map(slide => slide.kind)).toEqual(['welcome']);
  });

  it('reads only the first Stores, sends the documented product query, and survives one failing Store', async () => {
    const stores = Array.from({ length: HOME_STORE_LIMIT + 2 }, (_, index) => store(`s${index}`));
    const api = {
      stores: vi.fn(async () => stores),
      products: vi.fn(async (slug: string) => {
        if (slug === 's1') throw new Error('boom');
        return page([product(Number(slug.slice(1)) + 1)]);
      }),
      home: vi.fn(async (slug: string) => homeOf(stores.find(item => item.storeSlug === slug)!)),
    };
    const model = await loadCustomerHome(api);
    expect(api.products).toHaveBeenCalledTimes(HOME_STORE_LIMIT);
    expect(api.home).toHaveBeenCalledTimes(HOME_STORE_LIMIT);
    expect(api.products).toHaveBeenCalledWith('s0', { pageSize: HOME_PRODUCTS_PER_STORE, sortBy: 'name' }, undefined);
    expect(model.stores).toHaveLength(HOME_STORE_LIMIT + 2);
    expect(model.sampledStores).toBe(HOME_STORE_LIMIT);
    expect(model.failedStores).toBe(1);
    expect(model.products.map(item => item.storeSlug)).not.toContain('s1');
  });

  it('fails as a whole only when the Store list itself fails', async () => {
    const api = { stores: vi.fn(async () => { throw new Error('down'); }), home: vi.fn(), products: vi.fn() };
    await expect(loadCustomerHome(api)).rejects.toThrow('down');
    expect(api.products).not.toHaveBeenCalled();
  });

  it('maps the shared storefront fixture to one Store, one product and no bundle', async () => {
    const request = async (path: string) => Response.json(storefrontFixture(new URL(path, 'http://localhost').pathname, 'GET', STOREFRONT_WITH_IMAGES)?.body);
    const { createCustomerApi } = await import('../../src/features/customer/customer.api');
    const model = await loadCustomerHome(createCustomerApi(request, request));
    expect(model.stores).toEqual([{ ...STOREFRONT_WITH_IMAGES, iconUrl: STOREFRONT_WITH_IMAGES.iconUrl, productCount: 1 }]);
    expect(model.products).toHaveLength(1);
    expect(model.products[0]).toMatchObject({ productId: STOREFRONT_PRODUCT.productId, storeSlug: STOREFRONT_STORE.storeSlug, sellingPrice: 32000.5 });
    expect(model.bundles).toEqual([]);
  });
});

describe('customer home filters and categories', () => {
  const tagged = (id: number, slug: string, name: string, category: string | null, imageUrl: string | null = null, extra: Partial<StoreProduct> = {}): HomeProduct =>
    ({ ...product(id, { name, imageUrl, category: category ? { categoryId: id, name: category } : null, ...extra }), storeSlug: slug, storeName: `Store ${slug}` });
  const items = [
    tagged(1, 'a', 'Sữa tươi nguyên kem', 'Sữa & trứng', '/m.png'),
    tagged(2, 'a', 'Đường trắng', 'Đồ khô'),
    tagged(3, 'b', 'Sữa chua dâu', 'Sữa & trứng', '/y.png'),
    tagged(4, 'b', 'Gạo thơm', null, '/g.png', { description: 'Hạt dài, dẻo' }),
  ];
  const none = { query: '', category: null, storeSlug: null, savedOnly: false };

  it('ignores case and Vietnamese diacritics, including đ', () => {
    expect(normalizeSearch('  Đường TRẮNG ')).toBe('duong trang');
    expect(filterHomeProducts(items, { ...none, query: 'sua' }, []).map(item => item.productId)).toEqual([1, 3]);
    expect(filterHomeProducts(items, { ...none, query: 'duong' }, []).map(item => item.productId)).toEqual([2]);
    expect(filterHomeProducts(items, { ...none, query: 'deo' }, []).map(item => item.productId)).toEqual([4]);
    expect(filterHomeProducts(items, { ...none, query: 'store b' }, []).map(item => item.productId)).toEqual([3, 4]);
    expect(filterHomeProducts(items, { ...none, query: 'khong co' }, [])).toEqual([]);
  });

  it('combines category, Store and saved filters; saved keys are Store-scoped', () => {
    expect(filterHomeProducts(items, { ...none, category: 'Sữa & trứng' }, []).map(item => item.productId)).toEqual([1, 3]);
    expect(filterHomeProducts(items, { ...none, category: 'Sữa & trứng', storeSlug: 'b' }, []).map(item => item.productId)).toEqual([3]);
    expect(homeSavedKey(items[2])).toBe('b/3');
    expect(filterHomeProducts(items, { ...none, savedOnly: true }, ['b/3', 'a/999']).map(item => item.productId)).toEqual([3]);
    expect(filterHomeProducts(items, { ...none, savedOnly: true }, [])).toEqual([]);
  });

  it('lists each category name once, counts Stores and takes a real product image', () => {
    expect(homeCategories(items)).toEqual([
      { name: 'Sữa & trứng', storeCount: 2, imageUrl: '/m.png' },
      { name: 'Đồ khô', storeCount: 1, imageUrl: null },
    ].sort((x, y) => x.name.localeCompare(y.name, 'vi')));
  });

  it('picks promo products only from real products that have an image, one per category', () => {
    expect(promoProducts(items).map(item => item.productId)).toEqual([1]);
    expect(promoProducts([items[1]])).toEqual([]);
    expect(promoProducts([])).toEqual([]);
  });

  it('shows prices with the shared formatter: whole đồng, HALF_UP', () => {
    expect(formatCustomerMoney(STOREFRONT_PRODUCT.sellingPrice)).toBe('32.001 ₫');
    expect(formatCustomerMoney(32000.49)).toBe('32.000 ₫');
  });
});

describe('customer home banner slides', () => {
  it('starts with the decorative welcome slide, then one slide per Store with its own banner and icon', () => {
    const stores = [store('a', { bannerUrl: '/api/public/stores/1/images/b.png', iconUrl: '/api/public/stores/1/images/i.png' }), store('b')];
    const slides = buildBannerSlides(stores);
    expect(slides.map(slide => slide.id)).toEqual(['welcome', 'store-a', 'store-b']);
    expect(slides[1]).toMatchObject({ kind: 'store', storeSlug: 'a', storeName: 'Store a', bannerUrl: '/api/public/stores/1/images/b.png', iconUrl: '/api/public/stores/1/images/i.png' });
    // A Store without a banner keeps null: the view falls back to decorative art, never to invented content.
    expect(slides[2]).toMatchObject({ kind: 'store', bannerUrl: null, iconUrl: null });
  });

  it('caps the Store slides and reuses the decorative art in turn', () => {
    const many = Array.from({ length: HOME_BANNER_STORES + 3 }, (_, index) => store(`s${index}`));
    const slides = buildBannerSlides(many);
    expect(slides).toHaveLength(1 + HOME_BANNER_STORES);
    const art = slides.flatMap(slide => slide.kind === 'store' ? [slide.art] : []);
    expect(art).toEqual(BANNER_ART.slice(0, HOME_BANNER_STORES));
    expect(BANNER_ART.every(item => item.image.startsWith('/images/customer-home/banners/'))).toBe(true);
  });

  it('uses only Store names from the API in Store slides', () => {
    const slide = buildBannerSlides([store('a', { name: 'Tên từ API' })])[1];
    expect(slide).toMatchObject({ label: 'Tên từ API', storeName: 'Tên từ API' });
  });
});
