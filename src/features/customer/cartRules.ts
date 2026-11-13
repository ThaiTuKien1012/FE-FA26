import type { CustomerDisplayProduct } from './customer.types';
export type CartAddition = { product: CustomerDisplayProduct; quantity: number };
const safeId = (id: string) => !!id.trim() && !['__proto__', 'constructor', 'prototype'].includes(id);
/** Validate the entire purchase before changing any quantity. Checkout must reprice/reserve stock. */
export function applyCartItems(cart: Record<string, number>, items: CartAddition[]): Record<string, number> | null {
  if (!items.length || Object.entries(cart).some(([id,count]) => !safeId(id) || !Number.isSafeInteger(count) || count < 0)) return null;
  const next = { ...cart };
  let additionTotal = 0;
  for (const { product, quantity } of items) {
    if (!safeId(product.id) || !Number.isSafeInteger(quantity) || quantity <= 0 || product.isActive === false
      || !['In Stock','Low Stock'].includes(product.status)
      || !Number.isFinite(product.priceVnd) || product.priceVnd < 0
      || !Number.isFinite(product.stockQuantity) || product.stockQuantity < 0) return null;
    const count = (Object.hasOwn(next,product.id) ? next[product.id] : 0) + quantity;
    additionTotal += product.priceVnd * quantity;
    if (!Number.isSafeInteger(count) || count > product.stockQuantity || !Number.isSafeInteger(additionTotal)
      || !Number.isSafeInteger(product.priceVnd * count)) return null;
    next[product.id] = count;
  }
  return next;
}
