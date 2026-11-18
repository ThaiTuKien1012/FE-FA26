import type { F02Product } from './store.api';

export type ComboItem = { productId: number; quantity: number };
export type ComboPlan = {
  id: string;
  name: string;
  items: ComboItem[];
  price: number | null;
  status: 'suggested' | 'approved';
  source: 'auto' | 'manual';
};
export type ComboState = { combos: ComboPlan[]; dismissedIds: string[] };

export const emptyComboState = (): ComboState => ({ combos: [], dismissedIds: [] });
export const comboStorageKey = (storeId: number | string) => `store-layout-combos-v1:${storeId}`;

const recipes = [
  { id: 'auto:morning', name: 'Combo bữa sáng', skus: ['F02-MILK-01', 'F02-COFFEE-01'] },
  { id: 'auto:pantry', name: 'Combo bếp nhà', skus: ['STORE30-17', 'STORE30-15'] },
  { id: 'auto:snack', name: 'Combo ăn nhẹ', skus: ['STORE30-11', 'STORE30-23'] },
];

export function suggestCombos(products: F02Product[], state: ComboState): ComboState {
  const bySku = new Map(products.map(product => [product.sku, product]));
  const existing = new Set(state.combos.map(combo => combo.id));
  const dismissed = new Set(state.dismissedIds);
  const suggested = recipes.flatMap(recipe => {
    if (existing.has(recipe.id) || dismissed.has(recipe.id)) return [];
    const matches = recipe.skus.map(sku => bySku.get(sku));
    if (matches.some(product => !product)) return [];
    return [{
      id: recipe.id, name: recipe.name,
      items: matches.map(product => ({ productId: product!.id, quantity: 1 })),
      price: null, status: 'suggested' as const, source: 'auto' as const,
    }];
  });
  return { ...state, combos: [...state.combos, ...suggested] };
}

export function comboFacts(combo: ComboPlan, products: F02Product[]) {
  const byId = new Map(products.map(product => [product.id, product]));
  const items = combo.items.map(item => ({ ...item, product: byId.get(item.productId) }));
  const valid = items.length >= 2 && new Set(items.map(item => item.productId)).size === items.length &&
    items.every(item => item.product && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99);
  const stock = valid ? Math.min(...items.map(item => Math.floor(item.product!.stockQuantity / item.quantity))) : 0;
  const subtotal = valid && items.every(item => Number.isFinite(item.product!.sellingPrice) && item.product!.sellingPrice > 1000)
    ? items.reduce((sum, item) => sum + item.product!.sellingPrice * item.quantity, 0) : null;
  return { items, valid, stock, subtotal };
}

export function parseComboState(value: string | null): ComboState {
  if (!value) return emptyComboState();
  try {
    const data: unknown = JSON.parse(value);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return emptyComboState();
    const record = data as Record<string, unknown>;
    const combos = Array.isArray(record.combos) ? record.combos.filter((value): value is ComboPlan => {
      if (!value || typeof value !== 'object') return false;
      const combo = value as ComboPlan;
      return typeof combo.id === 'string' && combo.id.length <= 120 && typeof combo.name === 'string' && combo.name.length <= 100 &&
        (combo.status === 'suggested' || combo.status === 'approved') && (combo.source === 'auto' || combo.source === 'manual') &&
        (combo.price === null && combo.status === 'suggested' || Number.isSafeInteger(combo.price) && combo.price! > 0) &&
        Array.isArray(combo.items) && combo.items.length >= 2 && combo.items.length <= 12 &&
        combo.items.every(item => Number.isSafeInteger(item?.productId) && item.productId > 0 && Number.isInteger(item?.quantity) && item.quantity > 0 && item.quantity <= 99) &&
        new Set(combo.items.map(item => item.productId)).size === combo.items.length;
    }) : [];
    const dismissedIds = Array.isArray(record.dismissedIds)
      ? record.dismissedIds.filter((id): id is string => typeof id === 'string' && id.startsWith('auto:') && id.length <= 120)
      : [];
    return { combos, dismissedIds };
  } catch {
    return emptyComboState();
  }
}
