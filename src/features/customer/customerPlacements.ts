import type { Placement, StoreHome, StoreProduct } from './customer.types';

export function placementProducts(home: StoreHome | undefined, type: Placement['type'], containingProductId?: number): StoreProduct[] {
  const seen = new Set<number>();
  if (containingProductId !== undefined) seen.add(containingProductId);
  const products: StoreProduct[] = [];

  for (const zone of home?.zones ?? []) {
    for (const placement of zone.placements) {
      if (placement.type !== type) continue;
      if (containingProductId !== undefined && !placement.products.some(product => product.productId === containingProductId)) continue;

      for (const product of placement.products) {
        if (seen.has(product.productId)) continue;
        seen.add(product.productId);
        products.push(product);
      }
    }
  }

  return products;
}

export function relatedPlacementProducts(home: StoreHome | undefined, type: 'FBT' | 'CROSS_SELL', productId: number): StoreProduct[] {
  return placementProducts(home, type, productId).slice(0, 8);
}
