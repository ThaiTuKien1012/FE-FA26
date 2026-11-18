import { CANVAS_WIDTH, FRAME_HEIGHT, FRAME_WIDTH, type ProductFrameMap } from './storeLayoutFrames';

export type ProductGroup = 'hot' | 'new' | 'combo' | 'best' | 'regular';
export type PromotionProduct = {
  id: number;
  stockQuantity: number;
  isHotSale?: boolean;
  isNew?: boolean;
  isCombo?: boolean;
  isBestSeller?: boolean;
  isTrending?: boolean;
};
export type LayoutZone = { group: ProductGroup; label: string; description: string; y: number; height: number; count: number };

export const MERCHANDISING_STORAGE_KEY = 'store-product-merchandising-v1';
export const GROUPS: ProductGroup[] = ['hot', 'new', 'combo', 'best', 'regular'];
export const GROUP_LABELS: Record<ProductGroup, string> = {
  hot: 'Hot Sale',
  new: 'Sản phẩm mới',
  combo: 'Combo',
  best: 'Bán chạy',
  regular: 'Sản phẩm thường',
};
const GROUP_DESCRIPTIONS: Record<ProductGroup, string> = {
  hot: 'Ưu đãi nổi bật',
  new: 'Hàng vừa ra mắt',
  combo: 'Sản phẩm bán theo bộ',
  best: 'Được quan tâm nhiều',
  regular: 'Những sản phẩm còn lại',
};

export function productGroup(product: PromotionProduct, overrides: Record<string, ProductGroup>): ProductGroup {
  if (overrides[String(product.id)]) return overrides[String(product.id)];
  if (product.isHotSale) return 'hot';
  if (product.isCombo) return 'combo';
  if (product.isNew) return 'new';
  if (product.isBestSeller || product.isTrending) return 'best';
  return 'regular';
}

export function merchandisingZones(products: PromotionProduct[], groups: Record<string, ProductGroup>, extraCounts: Partial<Record<ProductGroup, number>> = {}): LayoutZone[] {
  let y = 0;
  return GROUPS.map(group => {
    const count = products.filter(product => groups[String(product.id)] === group).length + (extraCounts[group] ?? 0);
    const zone: LayoutZone = {
      group, label: GROUP_LABELS[group], description: GROUP_DESCRIPTIONS[group], y,
      height: count ? Math.ceil(count / 7) * 210 + 70 : 64, count,
    };
    y += zone.height;
    return zone;
  });
}

export function arrangeMerchandisingProducts(products: PromotionProduct[], groups: Record<string, ProductGroup>, extraCounts: Partial<Record<ProductGroup, number>> = {}): ProductFrameMap {
  const frames: ProductFrameMap = {};
  for (const zone of merchandisingZones(products, groups, extraCounts)) {
    const items = products.filter(product => groups[String(product.id)] === zone.group);
    items.forEach((product, index) => {
      frames[String(product.id)] = { x: 36 + (index % 7) * 192, y: zone.y + 70 + Math.floor(index / 7) * 210 };
    });
  }
  return frames;
}

export function alignMerchandisingProducts(
  products: PromotionProduct[], groups: Record<string, ProductGroup>, frames: ProductFrameMap,
  extraCounts: Partial<Record<ProductGroup, number>> = {},
): ProductFrameMap {
  const ordered = [...products].sort((a, b) => {
    const first = frames[String(a.id)] ?? { x: 0, y: Number.MAX_SAFE_INTEGER };
    const second = frames[String(b.id)] ?? { x: 0, y: Number.MAX_SAFE_INTEGER };
    return first.y - second.y || first.x - second.x || a.id - b.id;
  });
  return arrangeMerchandisingProducts(ordered, groups, extraCounts);
}

export function reorderMerchandisingProducts(
  products: PromotionProduct[], groups: Record<string, ProductGroup>, frames: ProductFrameMap,
  movedId: number, targetGroup: ProductGroup, drop: { x: number; y: number },
  extraCounts: Partial<Record<ProductGroup, number>> = {},
): ProductFrameMap {
  const moved = products.find(product => product.id === movedId);
  if (!moved || targetGroup === 'combo') return frames;
  const zone = merchandisingZones(products, groups, extraCounts).find(item => item.group === targetGroup)!;
  const ordered = GROUPS.flatMap(group => {
    const members = products.filter(product => product.id !== movedId && groups[String(product.id)] === group)
      .sort((a, b) => {
        const first = frames[String(a.id)] ?? { x: 0, y: Number.MAX_SAFE_INTEGER };
        const second = frames[String(b.id)] ?? { x: 0, y: Number.MAX_SAFE_INTEGER };
        return first.y - second.y || first.x - second.x || a.id - b.id;
      });
    if (group !== targetGroup) return members;
    const hoveredIndex = members.findIndex(product => {
      const position = frames[String(product.id)];
      return position && drop.x >= position.x && drop.x < position.x + FRAME_WIDTH &&
        drop.y >= position.y && drop.y < position.y + FRAME_HEIGHT;
    });
    const hovered = hoveredIndex < 0 ? null : frames[String(members[hoveredIndex].id)];
    const index = hovered
      ? hoveredIndex + (drop.x >= hovered.x + FRAME_WIDTH / 2 ? 1 : 0)
      : Math.min(members.length, Math.max(0, Math.round((drop.y - zone.y - 70) / 210) * 7 +
        Math.round((drop.x - 36) / 192)));
    members.splice(index, 0, moved);
    return members;
  });
  return arrangeMerchandisingProducts(ordered, { ...groups, [String(movedId)]: targetGroup }, extraCounts);
}

export function rebaseMerchandisingFrames(
  frames: ProductFrameMap, products: PromotionProduct[], groups: Record<string, ProductGroup>,
  before: Partial<Record<ProductGroup, number>>, after: Partial<Record<ProductGroup, number>>,
): ProductFrameMap {
  const oldZones = merchandisingZones(products, groups, before);
  const newZones = merchandisingZones(products, groups, after);
  const shifts = Object.fromEntries(newZones.map((zone, index) => [zone.group, zone.y - oldZones[index].y])) as Record<ProductGroup, number>;
  return Object.fromEntries(Object.entries(frames).map(([id, frame]) => [id, {
    ...frame, y: Math.max(0, frame.y + shifts[groups[id] ?? 'regular']),
  }]));
}

export function merchandisingLayoutSignature(products: PromotionProduct[], groups: Record<string, ProductGroup>, comboCount: number): string {
  return JSON.stringify({ version: 1, comboCount, products: products.map(product => [product.id, groups[String(product.id)] ?? 'regular']).sort((a, b) => Number(a[0]) - Number(b[0])) });
}

export function validMerchandisingPlacement(
  frames: ProductFrameMap, products: PromotionProduct[], groups: Record<string, ProductGroup>, comboCount: number,
): boolean {
  const zones = merchandisingZones(products, groups, { combo: comboCount });
  const byGroup = Object.fromEntries(zones.map(zone => [zone.group, zone])) as Record<ProductGroup, LayoutZone>;
  const positions = products.map(product => {
    const position = frames[String(product.id)];
    const zone = byGroup[groups[String(product.id)] ?? 'regular'];
    if (!position || position.x < 12 || position.x + FRAME_WIDTH > CANVAS_WIDTH - 12 ||
      position.y < zone.y + 64 || position.y + FRAME_HEIGHT > zone.y + zone.height - 8) return null;
    return position;
  });
  if (positions.some(position => !position)) return false;
  return positions.every((position, index) => positions.slice(index + 1).every(other =>
    Math.abs(position!.x - other!.x) >= FRAME_WIDTH || Math.abs(position!.y - other!.y) >= FRAME_HEIGHT,
  ));
}

export function restoreMerchandisingFrames(
  frames: ProductFrameMap, products: PromotionProduct[], groups: Record<string, ProductGroup>, comboCount: number,
  savedSignature: string | null,
): ProductFrameMap {
  return savedSignature === merchandisingLayoutSignature(products, groups, comboCount) &&
    validMerchandisingPlacement(frames, products, groups, comboCount)
    ? frames : arrangeMerchandisingProducts(products, groups, { combo: comboCount });
}

export function autoArrangeMerchandisingProducts<T extends PromotionProduct & { name: string }>(
  products: T[], overrides: Record<string, ProductGroup>,
  resolveGroup: (product: T) => ProductGroup = product => productGroup(product, overrides),
  extraCounts: Partial<Record<ProductGroup, number>> = {},
): { frames: ProductFrameMap; zones: LayoutZone[] } {
  const groups = Object.fromEntries(products.map(product => [String(product.id), resolveGroup(product)])) as Record<string, ProductGroup>;
  const sorted = [...products].sort((a, b) => b.stockQuantity - a.stockQuantity || a.name.localeCompare(b.name, 'vi'));
  return {
    frames: arrangeMerchandisingProducts(sorted, groups, extraCounts),
    zones: merchandisingZones(sorted, groups, extraCounts),
  };
}

export function parseMerchandising(value: string | null): Record<string, ProductGroup> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([id, group]) => /^\d+$/.test(id) && GROUPS.includes(group as ProductGroup)));
  } catch {
    return {};
  }
}
