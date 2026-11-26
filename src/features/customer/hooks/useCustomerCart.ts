import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { AuthUser } from '../../../services/authService';
import { customerApi } from '../customer.api';
import { createCustomerCart } from '../customerCart';

export function useCustomerCart(storeSlug: string, user: AuthUser | null | undefined) {
  const shopperId = user?.role === 'End-Customer' ? user.id : null;
  const controller = useMemo(() => createCustomerCart(customerApi, storeSlug), [storeSlug, shopperId]);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  useEffect(() => {
    if (shopperId && storeSlug) void controller.load();
    return () => controller.dispose();
  }, [controller, shopperId, storeSlug]);
  return {
    ...state,
    count: state.cart?.items.reduce((sum, line) => sum + line.quantity, 0) ?? 0,
    blocked: Boolean(shopperId) && (!state.cart || state.pending || state.needsReload),
    load: controller.load,
    mutate: controller.mutate,
  };
}
