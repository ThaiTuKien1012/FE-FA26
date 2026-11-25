import { useSyncExternalStore } from 'react';

type ShoppingState = {
  carts: Record<string, Record<string, number>>;
  saved: string[];
};

const STORAGE_KEY = 'retailspace_customer_shopping_v1';
const emptyState: ShoppingState = { carts: {}, saved: [] };
let snapshot: ShoppingState | undefined;
const listeners = new Set<() => void>();

function getSnapshot(): ShoppingState {
  if (snapshot) return snapshot;
  snapshot = emptyState;
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (!stored || typeof stored !== 'object') return snapshot;
    const value = stored as Partial<ShoppingState>;
    const carts: ShoppingState['carts'] = {};
    if (value.carts && typeof value.carts === 'object' && !Array.isArray(value.carts)) {
      for (const [storeId, quantities] of Object.entries(value.carts)) {
        if (!quantities || typeof quantities !== 'object' || Array.isArray(quantities)) continue;
        const entries = Object.entries(quantities).filter(([, quantity]) => Number.isSafeInteger(quantity) && quantity > 0);
        carts[storeId] = Object.fromEntries(entries);
      }
    }
    const saved = Array.isArray(value.saved) ? [...new Set(value.saved.filter(id => typeof id === 'string'))] : [];
    snapshot = { carts, saved };
  } catch {
    // Shopping still works in memory if browser storage is unavailable or invalid.
  }
  return snapshot;
}

function commit(next: ShoppingState): void {
  snapshot = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Navigation within this session still shares the in-memory state.
  }
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function changeQuantity(storeId: string, productId: string, difference: number): void {
  if (!Number.isSafeInteger(difference)) return;
  const current = getSnapshot();
  const quantities = { ...current.carts[storeId] };
  const next = Math.max(0, (quantities[productId] || 0) + difference);
  if (!Number.isSafeInteger(next)) return;
  if (next > 0) quantities[productId] = next;
  else delete quantities[productId];
  commit({ ...current, carts: { ...current.carts, [storeId]: quantities } });
}

function clearCart(storeId: string): void {
  const current = getSnapshot();
  commit({ ...current, carts: { ...current.carts, [storeId]: {} } });
}

function toggleSaved(productId: string): void {
  const current = getSnapshot();
  const saved = current.saved.includes(productId)
    ? current.saved.filter(id => id !== productId)
    : [...current.saved, productId];
  commit({ ...current, saved });
}

/** Home and Shop share one tab-scoped cart per store, including across reloads. */
export function useCustomerShopping() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => emptyState);
  return { storeCarts: state.carts, saved: state.saved, changeQuantity, clearCart, toggleSaved };
}
