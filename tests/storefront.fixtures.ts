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

export type FixtureReply = { status: number; body: unknown };

export function storefrontFixture(pathname: string, method = 'GET', store: typeof STOREFRONT_STORE | typeof STOREFRONT_WITH_IMAGES = STOREFRONT_STORE): FixtureReply | undefined {
  if (method !== 'GET') return undefined;
  if (pathname === '/api/storefront/stores') return { status: 200, body: [store] };
  const prefix = `/api/storefront/${STOREFRONT_SLUG}`;
  if (pathname === `${prefix}/home`) {
    return { status: 200, body: {
      store, campaignName: null, fallbackType: 'DEFAULT_CATALOG', zones: [],
      catalog: [{ categoryId: 7, name: 'Dairy', products: [STOREFRONT_PRODUCT] }],
    } };
  }
  if (pathname === `${prefix}/products`) {
    return { status: 200, body: { items: [STOREFRONT_PRODUCT], page: 0, pageSize: 20, totalElements: 1 } };
  }
  if (pathname === `${prefix}/products/${STOREFRONT_PRODUCT_ID}`) return { status: 200, body: STOREFRONT_PRODUCT };
  // The cart exists only for a signed-in End-Customer: a never-created cart is virtual (F10).
  if (pathname === `${prefix}/cart`) {
    return { status: 200, body: {
      cartId: null, store: STOREFRONT_STORE, version: 0, currency: 'VND', updatedAt: null, items: [], subtotal: 0,
    } };
  }
  return undefined;
}
