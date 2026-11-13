import { useCallback, useEffect, useRef, useState } from 'react';
import type { CustomerDisplayProduct } from '../customer.types';
import { normalizeActiveLayout, normalizeCustomerProducts, type CustomerActiveLayout } from '../merchandising';

/** Proposed integration seam. No customer endpoint is currently implemented by the backend. */
export type CustomerStorefrontSource = (storeId: string, signal: AbortSignal) => Promise<{
  storeId: string;
  products: CustomerDisplayProduct[];
  activeLayout: unknown;
}>;
export type ActiveStorefrontStatus = 'unavailable' | 'loading' | 'ready' | 'error';
type State = { storeId: string; source?: CustomerStorefrontSource; layout: CustomerActiveLayout | null;
  products: CustomerDisplayProduct[] | null; status: ActiveStorefrontStatus };

export function useActiveStorefront(storeId: string, source?: CustomerStorefrontSource) {
  const [state, setState] = useState<State>({ storeId, source, layout:null, products:null, status:source ? 'loading' : 'unavailable' });
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const refresh = useCallback(() => setRevision(value => value+1), []);

  useEffect(() => {
    const controller = new AbortController();
    const currentGeneration = ++generation.current;
    const empty = {storeId,source,layout:null,products:null};
    setState({...empty,status:source ? 'loading' : 'unavailable'});
    if (source) {
      void Promise.resolve().then(() => source(storeId,controller.signal)).then(snapshot => {
        if (controller.signal.aborted || generation.current !== currentGeneration) return;
        if (!snapshot || snapshot.storeId !== storeId || !Array.isArray(snapshot.products)) throw new Error('Invalid storefront scope');
        const products = normalizeCustomerProducts(snapshot.products);
        setState({storeId,source,products,layout:normalizeActiveLayout(snapshot.activeLayout,storeId),status:'ready'});
      }).catch(() => {
        if (!controller.signal.aborted && generation.current === currentGeneration) setState({...empty,status:'error'});
      });
    }
    return () => controller.abort();
  },[storeId,source,revision]);

  useEffect(() => {
    if (!source) return;
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus',refresh);
    window.addEventListener('paspm:storefront-refresh',refresh);
    document.addEventListener('visibilitychange',onVisible);
    const interval = window.setInterval(onVisible,60_000);
    return () => { window.removeEventListener('paspm:storefront-refresh',refresh); window.removeEventListener('focus',refresh); document.removeEventListener('visibilitychange',onVisible); window.clearInterval(interval); };
  },[source,refresh]);

  // Render-time scope guard prevents even a single frame of the previous store/source.
  const current = state.storeId === storeId && state.source === source ? state
    : {layout:null,products:null,status:source ? 'loading' as const : 'unavailable' as const};
  return {layout:current.layout,products:current.products,status:current.status,refresh};
}
