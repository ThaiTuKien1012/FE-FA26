import { CustomerApiError, customerErrorMessage, type createCustomerApi } from './customer.api';
import type { BundleComponent, CartView } from './customer.types';

export type CartMutation =
  | { kind: 'add'; productId: number; quantity: number }
  | { kind: 'quantity'; itemId: string; quantity: number }
  | { kind: 'remove'; itemId: string }
  | { kind: 'bundle'; bundleKey: string };

type CartSnapshot = {
  cart: CartView | null;
  pending: boolean;
  needsReload: boolean;
  message: string;
  signInRequired?: boolean;
  components?: BundleComponent[];
};
const INITIAL: CartSnapshot = { cart: null, pending: false, needsReload: false, message: '' };

export function createCustomerCart(api: ReturnType<typeof createCustomerApi>, slug: string) {
  let snapshot = INITIAL;
  let operation: AbortController | undefined;
  const listeners = new Set<() => void>();
  const update = (patch: Partial<CartSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    for (const listener of listeners) listener();
  };
  const accept = (cart: CartView) => {
    if (cart?.store?.storeSlug !== slug || !Array.isArray(cart.items) || typeof cart.version !== 'string') {
      throw new CustomerApiError(502);
    }
    update({ cart, needsReload: false });
  };
  const begin = () => {
    operation = new AbortController();
    update({ pending: true, message: '', components: undefined, signInRequired: false });
    return operation;
  };
  const finish = (current: AbortController) => {
    if (operation === current) {
      operation = undefined;
      update({ pending: false });
    }
  };
  async function load() {
    if (operation) return;
    const current = begin();
    try {
      const cart = await api.getCart(slug, current.signal);
      if (operation === current) accept(cart);
    } catch (error) {
      if (operation === current) update({ needsReload: true, signInRequired: error instanceof CustomerApiError && error.status === 401, message: error instanceof CustomerApiError
        ? error.message : customerErrorMessage({ status: null }) });
    } finally {
      finish(current);
    }
  }

  async function mutate(mutation: CartMutation): Promise<CustomerApiError | undefined> {
    const { cart, needsReload } = snapshot;
    if (operation || !cart || needsReload) return;
    const current = begin();
    const { version } = cart;
    const { signal } = current;
    try {
      if (mutation.kind === 'bundle') {
        const result = await api.addBundle(slug, version, mutation.bundleKey, signal);
        if (operation !== current) return;
        accept(result.cart);
        update({ message: 'Đã cập nhật giỏ hàng.', components: result.components });
      } else {
        const next = mutation.kind === 'add' ? await api.addItem(slug, version, mutation.productId, mutation.quantity, signal)
          : mutation.kind === 'quantity' ? await api.changeQuantity(slug, version, mutation.itemId, mutation.quantity, signal)
          : await api.removeItem(slug, version, mutation.itemId, signal);
        if (operation === current) { accept(next); update({ message: 'Đã cập nhật giỏ hàng.' }); }
      }
    } catch (error) {
      if (operation !== current) return;
      const problem = error instanceof CustomerApiError ? error : new CustomerApiError(502);
      const uncertain = problem.status === null || problem.status >= 500;
      const shouldReload = problem.code === 'CART_VERSION_CONFLICT' || uncertain;
      const message = uncertain ? 'Chưa xác nhận được kết quả. Hãy kiểm tra giỏ trước khi thử lại.' : problem.message;
      update({ message, components: problem.components, signInRequired: problem.status === 401, needsReload: shouldReload || problem.status === 401 });
      if (shouldReload) {
        try {
          const fresh = await api.getCart(slug, signal);
          if (operation === current) accept(fresh);
        } catch {
          // Keep the last confirmed cart and require a successful GET before another mutation.
        }
      }
      if (operation === current) return problem;
    } finally {
      finish(current);
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    load,
    mutate,
    dispose() { operation?.abort(); operation = undefined; snapshot = INITIAL; },
  };
}
