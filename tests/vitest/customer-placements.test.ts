import { describe, expect, it } from 'vitest';
import { buildHomeModel } from '../../src/features/customer/customerHomeModel';
import { relatedPlacementProducts } from '../../src/features/customer/customerPlacements';
import type { Placement, StoreHome, StoreProduct } from '../../src/features/customer/customer.types';
import { STOREFRONT_PRODUCT, STOREFRONT_STORE } from '../storefront.fixtures';

const product = (productId: number): StoreProduct => ({ ...STOREFRONT_PRODUCT, productId, name: `Sản phẩm ${productId}`, availability: 'AVAILABLE' });
const placement = (type: Placement['type'], blockNo: number, ...ids: number[]): Placement =>
  ({ type, blockNo, startPosition: blockNo, products: ids.map(product) });

function home(...placements: Placement[]): StoreHome {
  return {
    store: STOREFRONT_STORE, campaignName: 'Chiến dịch', fallbackType: null, catalog: [],
    zones: placements.map(item => ({ name: item.type, placements: [item] })),
  };
}

describe('public storefront placements', () => {
  it('selects only BANNER items, in response order, deduplicated by Store and product', () => {
    const second = { ...STOREFRONT_STORE, storeSlug: 'second', name: 'Cửa hàng 2' };
    const model = buildHomeModel([STOREFRONT_STORE, second], [
      { store: STOREFRONT_STORE, home: home(placement('CROSS_SELL', 1, 99), placement('BANNER', 8, 3, 2), placement('BANNER', 1, 3, 7)) },
      { store: second, home: { ...home(placement('BANNER', 1, 3)), store: second } },
    ]);
    expect(model.featured.map(item => [item.storeSlug, item.productId])).toEqual([
      [STOREFRONT_STORE.storeSlug, 3], [STOREFRONT_STORE.storeSlug, 2], [STOREFRONT_STORE.storeSlug, 7], ['second', 3],
    ]);
  });

  it('returns no featured products for unreturned or missing BANNER placements', () => {
    expect(buildHomeModel([STOREFRONT_STORE], [{ store: STOREFRONT_STORE, home: home(placement('FBT', 1, 1, 2)) }]).featured).toEqual([]);
    expect(buildHomeModel([STOREFRONT_STORE], []).featured).toEqual([]);
  });

  it('matches only placements of the requested type containing the current product', () => {
    const view = home(placement('FBT', 1, 7, 8), placement('FBT', 2, 1, 4),
      placement('CROSS_SELL', 3, 3, 1), placement('BANNER', 4, 1, 9), placement('BUNDLE', 5, 1, 6));
    expect(relatedPlacementProducts(view, 'FBT', 1).map(item => item.productId)).toEqual([4]);
    expect(relatedPlacementProducts(view, 'CROSS_SELL', 1).map(item => item.productId)).toEqual([3]);
  });

  it('excludes the current product, deduplicates and keeps the first eight in response order', () => {
    const view = home(placement('FBT', 8, 1, 9, 3, 1), placement('FBT', 1, 3, 5, 1, 4, 8),
      placement('FBT', 2, 7, 6, 10, 11, 1));
    expect(relatedPlacementProducts(view, 'FBT', 1).map(item => item.productId)).toEqual([9, 3, 5, 4, 8, 7, 6, 10]);
  });

  it('returns no relations without a home, an eligible placement or another product', () => {
    expect(relatedPlacementProducts(undefined, 'FBT', 1)).toEqual([]);
    expect(relatedPlacementProducts(home(), 'FBT', 1)).toEqual([]);
    expect(relatedPlacementProducts(home(placement('CROSS_SELL', 1, 1, 1)), 'CROSS_SELL', 1)).toEqual([]);
  });
});
