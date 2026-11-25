import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { authService } from '../../services/authService';
import { f02ErrorMessage, storeApi } from './store.api';

export interface ProductStats { total: number; active: number; inactive: number; }

// Counts come from the complete Store result set, never the visible page.
export async function loadProductStats(): Promise<ProductStats> {
  const [all, active, inactive] = await Promise.all([
    storeApi.listProducts({ page: 0, pageSize: 1 }),
    storeApi.listProducts({ page: 0, pageSize: 1, status: 'ACTIVE' }),
    storeApi.listProducts({ page: 0, pageSize: 1, status: 'INACTIVE' })
  ]);
  const counts = [all.totalElements, active.totalElements, inactive.totalElements];
  if (counts.some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('Product totals are unavailable. Please refresh products.');
  return { total: counts[0], active: counts[1], inactive: counts[2] };
}

const statsScope = () => {
  const user = authService.getCurrentUser();
  return `${authService.getSessionId()}:${user?.id}:${user?.storeId}:${user?.role}`;
};
interface StatsState { scope: string; values: ProductStats | null; loading: boolean; error: string; }

export function useProductStats() {
  const scope = useSyncExternalStore(authService.subscribe, statsScope, statsScope);
  const [state, setState] = useState<StatsState>({ scope, values: null, loading: true, error: '' });
  const version = useRef(0);
  const refresh = useCallback(async () => {
    if (scope !== statsScope() || !authService.getCurrentUser()) return;
    const current = ++version.current;
    setState({ scope, values: null, loading: true, error: '' });
    try {
      const values = await loadProductStats();
      if (current === version.current && scope === statsScope()) setState({ scope, values, loading: false, error: '' });
    } catch (error) {
      if (current === version.current && scope === statsScope()) setState({ scope, values: null, loading: false, error: f02ErrorMessage(error) });
    }
  }, [scope]);
  useEffect(() => { void refresh(); return () => { ++version.current; }; }, [refresh]);
  // Hide previous Store totals immediately, before the new scope's effect runs.
  return { ...(state.scope === scope ? state : { values: null, loading: true, error: '' }), refresh };
}
