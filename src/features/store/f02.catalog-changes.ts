const listeners = new Set<(productId: number) => void>();

export function subscribeToProductDeletion(listener: (productId: number) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function notifyProductDeleted(productId: number) {
  listeners.forEach(listener => listener(productId));
}
