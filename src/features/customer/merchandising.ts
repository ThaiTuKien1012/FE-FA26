import type { CustomerDisplayProduct } from './customer.types';
import { applyCartItems, type CartAddition } from './cartRules';

export type PlacementType = 'BANNER' | 'BUNDLE' | 'FBT' | 'CROSS_SELL' | 'PRODUCT_COLLECTION';
export interface CustomerPlacement {
  id: string;
  type: PlacementType;
  order: number;
  title: string;
  description?: string;
  imageUrl?: string;
  groupId: string;
  anchorProductId?: string;
  items: { productId: string; quantity: number }[];
}
export interface CustomerActiveLayout {
  id: string;
  version: string;
  status: 'ACTIVE';
  storeId: string;
  placements: CustomerPlacement[];
}
export interface ResolvedItem { productId: string; quantity: number; product: CustomerDisplayProduct | null }
export interface ResolvedPlacement { placement: CustomerPlacement; items: ResolvedItem[]; total: number; valid: boolean }
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const identifier = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const positiveInteger = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;
const nonnegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const types: PlacementType[] = ['BANNER', 'BUNDLE', 'FBT', 'CROSS_SELL', 'PRODUCT_COLLECTION'];
const optionalText = (value: unknown): string | undefined => typeof value === 'string' ? value : undefined;
/** Customer asset URLs may be same-origin paths or HTTPS images, never executable protocols. */
export function customerImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (/^\/(?!\/)/.test(value)) return value;
  try { const url = new URL(value); return url.protocol === 'https:' ? value : undefined; } catch { return undefined; }
}

/** Whitelist public fields; a future backend response must never leak mining or cost evidence. */
export function normalizeCustomerProducts(input: unknown): CustomerDisplayProduct[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  return input.flatMap(value => {
    if (!record(value) || !identifier(value.id) || seen.has(value.id) || !identifier(value.name)
      || !nonnegative(value.priceVnd) || !nonnegative(value.stockQuantity)
      || !['In Stock','Low Stock','Out of Stock'].includes(String(value.status)) || typeof value.isActive !== 'boolean') return [];
    seen.add(value.id);
    return [{ id:value.id, name:value.name, sku:optionalText(value.sku) ?? '', category:optionalText(value.category) ?? '',
      priceVnd:value.priceVnd, stockQuantity:value.stockQuantity, status:value.status as CustomerDisplayProduct['status'],
      isActive:value.isActive, thumbnail:'', image:customerImageUrl(value.image), unit:optionalText(value.unit),
      brand:optionalText(value.brand), description:optionalText(value.description) }];
  });
}

export function normalizeActiveLayout(input: unknown, storeId: string): CustomerActiveLayout | null {
  if (!record(input) || input.status !== 'ACTIVE' || input.storeId !== storeId || !identifier(input.id)
    || !identifier(input.version) || !Array.isArray(input.placements)) return null;
  const seen = new Set<string>();
  const placements = input.placements.flatMap((value): CustomerPlacement[] => {
    if (!record(value) || !identifier(value.id) || seen.has(value.id) || !types.includes(value.type as PlacementType)
      || !Number.isSafeInteger(value.order) || Number(value.order) < 0 || !identifier(value.title)
      || !identifier(value.groupId) || !Array.isArray(value.items) || !value.items.length
      || value.items.some(item => !record(item) || !identifier(item.productId) || !positiveInteger(item.quantity))) return [];
    const uniqueCount = new Set(value.items.map(item => item.productId)).size;
    if ((value.type === 'BUNDLE' || value.type === 'FBT') && (uniqueCount < 2 || uniqueCount > 4)) return [];
    seen.add(value.id);
    return [{ id:value.id, type:value.type as PlacementType, order:Number(value.order), title:value.title,
      groupId:value.groupId, description:optionalText(value.description), imageUrl:customerImageUrl(value.imageUrl),
      anchorProductId:identifier(value.anchorProductId) ? value.anchorProductId : undefined,
      items:value.items.map(item => ({productId:item.productId as string,quantity:item.quantity as number})) }];
  }).sort((a,b) => a.order-b.order || a.id.localeCompare(b.id));
  return {id:input.id,version:input.version,status:'ACTIVE',storeId,placements};
}

export function canPurchase(items: ResolvedItem[], cart: Record<string, number>): boolean {
  const additions: CartAddition[] = [];
  for (const {productId, quantity, product} of items) {
    if (!product || product.id !== productId) return false;
    additions.push({product, quantity});
  }
  return applyCartItems(cart, additions) !== null;
}

export function resolvePlacement(placement: CustomerPlacement, products: CustomerDisplayProduct[]): ResolvedPlacement {
  const quantities = new Map<string,number>();
  placement.items.forEach(item => quantities.set(item.productId,(quantities.get(item.productId) ?? 0)+item.quantity));
  const items = [...quantities].map(([productId,quantity]) => ({productId,quantity,product:products.find(p=>p.id===productId) ?? null}));
  const total = items.reduce((sum,item)=>sum+(item.product && nonnegative(item.product.priceVnd) && positiveInteger(item.quantity) ? item.product.priceVnd*item.quantity : 0),0);
  const groupSizeValid = placement.type === 'BUNDLE' || placement.type === 'FBT' ? items.length >= 2 && items.length <= 4 : items.length > 0;
  const priced = items.every(item => item.product && positiveInteger(item.quantity) && nonnegative(item.product.priceVnd));
  const safeTotal = Number.isSafeInteger(total);
  return {placement,items,total:safeTotal ? total : 0,valid:groupSizeValid && priced && safeTotal};
}

export function getProductPlacements(layout: CustomerActiveLayout | null, productId: string, type: 'FBT' | 'CROSS_SELL'): CustomerPlacement[] {
  return layout?.placements.filter(p => p.type === type && (type === 'FBT'
    ? p.items.some(item => item.productId === productId) : p.anchorProductId === productId)) ?? [];
}
