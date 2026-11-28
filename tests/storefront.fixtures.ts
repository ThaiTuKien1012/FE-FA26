import type { Placement, StoreProduct, StoreSummary } from '../src/features/customer/customer.types';

// Shared public-storefront fixture for the browser tests (tests/*.browser.mjs).
//
// Every browser test intercepts all API traffic and fails on any request it does not know
// ("unexpected" must stay empty). The customer storefront (F09/F10, PR #12) calls the public
// /api/storefront/* routes as soon as a guest or customer screen is shown, so each fixture
// server asks this helper first:
//
//   const front = storefrontFixture(path, method);
//   if (front) { responseCode = front.status; body = front.body; } else { unexpected.push(path); ... }
//
// The helper answers only the one fixture Store below and only the routes the customer views
// call; every other path returns undefined so the stray-request assertion stays strict.
// Money is VND with 2 decimals, as on the wire.

export const STOREFRONT_SLUG = 'fixture-store';
export const STOREFRONT_STORE = { storeSlug: STOREFRONT_SLUG, name: 'Fixture Store', iconUrl: null, bannerUrl: null };
const imagePrefix = '/api/public/stores/1/images';
export const STOREFRONT_WITH_IMAGES = {
  ...STOREFRONT_STORE, iconUrl: `${imagePrefix}/icon.png`, bannerUrl: `${imagePrefix}/banner.png`,
};
export const STOREFRONT_WITH_BROKEN_IMAGES = {
  ...STOREFRONT_STORE, iconUrl: `${imagePrefix}/missing-icon.png`, bannerUrl: `${imagePrefix}/missing-banner.png`,
};
export const STOREFRONT_PRODUCT_ID = 501;

export const STOREFRONT_PRODUCT = {
  productId: STOREFRONT_PRODUCT_ID,
  name: 'Fixture oat milk',
  description: null,
  imageUrl: null,
  unit: 'carton',
  sellingPrice: 32000.5,
  category: { categoryId: 7, name: 'Dairy' },
  availability: 'AVAILABLE',
};

export const FEATURED_PRODUCT_ID = 510;
export const RELATED_PRODUCT_ID = 511;
export const UNAVAILABLE_RELATED_PRODUCT_ID = 512;
export const CROSS_SELL_PRODUCT_ID = 513;

function placementProducts(origin: string): StoreProduct[] {
  return [
    { productId: FEATURED_PRODUCT_ID, name: 'Bánh mì nguyên cám', sellingPrice: 26000.5, unit: 'ổ', category: { categoryId: 8, name: 'Bánh mì' }, image: 'bread-loaf.png' },
    { productId: RELATED_PRODUCT_ID, name: 'Mật ong nguyên chất', sellingPrice: 39000, unit: 'hũ', category: { categoryId: 9, name: 'Thực phẩm khô' }, image: 'honey-jar.webp' },
    { productId: UNAVAILABLE_RELATED_PRODUCT_ID, name: 'Dâu tươi', sellingPrice: 42000, unit: 'hộp', category: { categoryId: 10, name: 'Trái cây' }, image: 'strawberry.webp' },
    { productId: CROSS_SELL_PRODUCT_ID, name: 'Cà phê rang xay', sellingPrice: 61000, unit: 'gói', category: { categoryId: 11, name: 'Đồ uống' }, image: 'nescafe-coffee.webp' },
  ].map(({ image, ...product }) => ({
    ...STOREFRONT_PRODUCT, ...product,
    imageUrl: new URL('/images/customer-home/fresh/' + image, origin).href,
    availability: product.productId === UNAVAILABLE_RELATED_PRODUCT_ID ? 'OUT_OF_STOCK' : 'AVAILABLE',
  }));
}

function placementZones(items: StoreProduct[]) {
  const [featured, related, unavailable, crossSell] = items;
  const block = (type: Placement['type'], blockNo: number, products: StoreProduct[]): Placement =>
    ({ type, blockNo, startPosition: blockNo, products });
  const current: StoreProduct = { ...STOREFRONT_PRODUCT, availability: 'AVAILABLE' };
  return [
    { name: 'BANNER', placements: [block('BANNER', 1, [featured])] },
    { name: 'FBT', placements: [
      block('FBT', 1, [current, related, unavailable]),
      block('FBT', 2, [current, related]),
      block('FBT', 3, [featured, crossSell]),
    ] },
    { name: 'CROSS_SELL', placements: [block('CROSS_SELL', 1, [crossSell, current])] },
  ];
}

export function storefrontCartFixture(store: StoreSummary, version = 0, quantity = 0) {
  return {
    cartId: version > 0 ? 60 : null, store, version, currency: 'VND', updatedAt: null,
    items: quantity ? [{ itemId: 1, productId: RELATED_PRODUCT_ID, name: 'Mật ong nguyên chất', imageUrl: null,
      unit: 'hũ', quantity, unitPrice: 39000, lineTotal: quantity * 39000, state: 'AVAILABLE' }] : [],
    subtotal: quantity * 39000,
  };
}

export type FixtureReply = { status: number; body: unknown };

export function storefrontFixture(pathname: string, method = 'GET', store: StoreSummary = STOREFRONT_STORE, placementOrigin?: string): FixtureReply | undefined {
  if (method !== 'GET') return undefined;
  if (pathname === '/api/storefront/stores') return { status: 200, body: [store] };
  const prefix = `/api/storefront/${STOREFRONT_SLUG}`;
  if (pathname === `${prefix}/home`) {
    if (placementOrigin) return { status: 200, body: {
      store, campaignName: 'Gian hàng theo mùa', fallbackType: null, zones: placementZones(placementProducts(placementOrigin)), catalog: [],
    } };
    return { status: 200, body: {
      store, campaignName: null, fallbackType: 'DEFAULT_CATALOG', zones: [],
      catalog: [{ categoryId: 7, name: 'Dairy', products: [STOREFRONT_PRODUCT] }],
    } };
  }
  if (pathname === `${prefix}/products`) {
    return { status: 200, body: { items: [STOREFRONT_PRODUCT], page: 0, pageSize: 20, totalElements: 1 } };
  }
  if (pathname === `${prefix}/products/${STOREFRONT_PRODUCT_ID}`) return { status: 200, body: STOREFRONT_PRODUCT };
  if (placementOrigin && pathname.startsWith(`${prefix}/products/`)) {
    const product = placementProducts(placementOrigin).find(item => pathname === `${prefix}/products/${item.productId}`);
    if (product) return { status: 200, body: product };
  }
  // The cart exists only for a signed-in End-Customer: a never-created cart is virtual (F10).
  if (pathname === `${prefix}/cart`) {
    return { status: 200, body: storefrontCartFixture(store) };
  }
  return undefined;
}
