import type { Placement, StoreHome, StoreProduct, StoreProductPage, StoreSummary } from './customer.types';
import { placementProducts } from './customerPlacements';
import { BANNER_ART, WELCOME_BANNER, type BannerArt } from './data/customerBanners';

// How much of the public catalogue the home page samples. The Store list is always complete;
// products and placements come from the first HOME_STORE_LIMIT Stores, with at most HOME_PRODUCTS_PER_STORE catalog products each.
export const HOME_STORE_LIMIT = 6;
export const HOME_PRODUCTS_PER_STORE = 12;
export const HOME_BANNER_STORES = 4;

export type HomeProduct = StoreProduct & { storeSlug: string; storeName: string };
export type HomeBundle = { key: string; storeSlug: string; storeName: string; products: StoreProduct[] };
export type HomeStore = StoreSummary & { productCount: number | null };
export type HomeModel = {
  stores: HomeStore[];
  products: HomeProduct[];
  bundles: HomeBundle[];
  featured: HomeProduct[];
  /** Stores whose products were requested. */
  sampledStores: number;
  /** Sampled Stores for which the products or the homepage request failed. */
  failedStores: number;
  /** True when a sampled Store has more products than the home page shows. */
  truncated: boolean;
};
export type StoreData = { store: StoreSummary; page?: StoreProductPage; home?: StoreHome };

type HomeApi = {
  stores: (signal?: AbortSignal) => Promise<StoreSummary[]>;
  home: (slug: string, signal?: AbortSignal) => Promise<StoreHome>;
  products: (slug: string, filters: { pageSize?: number; sortBy?: 'name' | 'sellingPrice' }, signal?: AbortSignal) => Promise<StoreProductPage>;
};

/** Reads the Store list, then the first products and the homepage placements of a few Stores. */
export async function loadCustomerHome(api: HomeApi, signal?: AbortSignal): Promise<HomeModel> {
  const stores = await api.stores(signal);
  const sampled = stores.slice(0, HOME_STORE_LIMIT);
  const results = await Promise.all(sampled.map(async (store): Promise<StoreData> => {
    const [page, home] = await Promise.allSettled([
      api.products(store.storeSlug, { pageSize: HOME_PRODUCTS_PER_STORE, sortBy: 'name' }, signal),
      api.home(store.storeSlug, signal),
    ]);
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return { store, page: page.status === 'fulfilled' ? page.value : undefined, home: home.status === 'fulfilled' ? home.value : undefined };
  }));
  return buildHomeModel(stores, results);
}

function interleave<T>(lists: T[][]): T[] {
  const result: T[] = [];
  for (let index = 0; ; index++) {
    let added = false;
    for (const list of lists) if (index < list.length) { result.push(list[index]); added = true; }
    if (!added) return result;
  }
}

export function buildHomeModel(stores: StoreSummary[], results: StoreData[]): HomeModel {
  const counts = new Map(results.flatMap(item => item.page ? [[item.store.storeSlug, item.page.totalElements] as const] : []));
  const bundlesOf = (item: StoreData): HomeBundle[] => (item.home?.zones ?? []).flatMap(zone => zone.placements)
    .filter((placement: Placement) => placement.type === 'BUNDLE' && Boolean(placement.bundleKey) && placement.products.length > 0)
    .map(placement => ({ key: `${item.store.storeSlug}/${placement.blockNo}`, storeSlug: item.store.storeSlug,
      storeName: item.store.name, products: placement.products }));
  return {
    stores: stores.map(store => ({ ...store, productCount: counts.get(store.storeSlug) ?? null })),
    products: interleave(results.map(item => (item.page?.items ?? []).map(product => ({
      ...product, storeSlug: item.store.storeSlug, storeName: item.store.name })))),
    bundles: interleave(results.map(bundlesOf)),
    featured: results.flatMap(({ store, home }) => placementProducts(home, 'BANNER').map(product => ({
      ...product, storeSlug: store.storeSlug, storeName: store.name,
    }))),
    sampledStores: results.length,
    failedStores: results.filter(item => !item.page || !item.home).length,
    truncated: results.some(item => item.page !== undefined && item.page.totalElements > item.page.items.length),
  };
}

export const homeSavedKey = (product: Pick<HomeProduct, 'storeSlug' | 'productId'>) => `${product.storeSlug}/${product.productId}`;

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

export type HomeFilter = { query: string; category: string | null; storeSlug: string | null; savedOnly: boolean };

export function filterHomeProducts(products: HomeProduct[], filter: HomeFilter, saved: string[]): HomeProduct[] {
  const query = normalizeSearch(filter.query);
  return products.filter(product =>
    (filter.category === null || product.category?.name === filter.category)
    && (filter.storeSlug === null || product.storeSlug === filter.storeSlug)
    && (!filter.savedOnly || saved.includes(homeSavedKey(product)))
    && (!query || normalizeSearch(`${product.name} ${product.description ?? ''} ${product.category?.name ?? ''} ${product.storeName}`).includes(query)));
}

export type HomeCategory = { name: string; storeCount: number; imageUrl: string | null };

/** Categories of the products on the page. The same name in two Stores is one category. */
export function homeCategories(products: HomeProduct[]): HomeCategory[] {
  const byName = new Map<string, { stores: Set<string>; imageUrl: string | null }>();
  for (const product of products) {
    if (!product.category) continue;
    const entry = byName.get(product.category.name) ?? { stores: new Set<string>(), imageUrl: null };
    entry.stores.add(product.storeSlug);
    entry.imageUrl ??= product.imageUrl;
    byName.set(product.category.name, entry);
  }
  return [...byName].map(([name, entry]) => ({ name, storeCount: entry.stores.size, imageUrl: entry.imageUrl }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

/** Up to `limit` products with an image, each from a different category, for the promo tiles. */
export function promoProducts(products: HomeProduct[], limit = 2): HomeProduct[] {
  const seen = new Set<string>();
  const result: HomeProduct[] = [];
  for (const product of products) {
    const category = product.category?.name;
    if (!product.imageUrl || !category || seen.has(category)) continue;
    seen.add(category);
    result.push(product);
    if (result.length === limit) break;
  }
  return result;
}

export type BannerSlide =
  | { id: string; kind: 'welcome'; label: string }
  | { id: string; kind: 'store'; label: string; storeSlug: string; storeName: string; iconUrl: string | null; bannerUrl: string | null; art: BannerArt };

/** The decorative welcome slide first, then one slide per Store (their own banner, or decorative art when it has none). */
export function buildBannerSlides(stores: StoreSummary[]): BannerSlide[] {
  return [
    { id: WELCOME_BANNER.id, kind: 'welcome', label: WELCOME_BANNER.label },
    ...stores.slice(0, HOME_BANNER_STORES).map((store, index): BannerSlide => ({
      id: `store-${store.storeSlug}`, kind: 'store', label: store.name, storeSlug: store.storeSlug, storeName: store.name,
      iconUrl: store.iconUrl, bannerUrl: store.bannerUrl, art: BANNER_ART[index % BANNER_ART.length],
    })),
  ];
}
