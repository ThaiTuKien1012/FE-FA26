import { useCallback, useMemo, useState } from 'react';
import { customerApi } from '../customer.api';
import { filterHomeProducts, loadCustomerHome, promoProducts, type HomeFilter } from '../customerHomeModel';
import { useCustomerResource } from './useCustomerResource';
import { useSavedCustomerProducts } from './useSavedCustomerProducts';

export const HOME_PAGE_SIZE = 12;
const NO_FILTER: HomeFilter = { query: '', category: null, storeSlug: null, savedOnly: false };

/** Data and filters of the customer home. Every Store, product, price and bundle comes from the F09 API. */
export function useCustomerHome() {
  const load = useCallback((signal: AbortSignal) => loadCustomerHome(customerApi, signal), []);
  const resource = useCustomerResource(load);
  const { saved, toggle } = useSavedCustomerProducts();
  const [filter, setFilter] = useState<HomeFilter>(NO_FILTER);
  const [limit, setLimit] = useState(HOME_PAGE_SIZE);
  const model = resource.data;
  const products = useMemo(() => model?.products ?? [], [model]);
  const filtered = useMemo(() => filterHomeProducts(products, filter, saved), [products, filter, saved]);
  const promos = useMemo(() => promoProducts(products), [products]);
  const change = (patch: Partial<HomeFilter>) => { setFilter(current => ({ ...current, ...patch })); setLimit(HOME_PAGE_SIZE); };
  return {
    ...resource, model, products, filtered, promos, filter, saved, toggleSaved: toggle,
    visible: filtered.slice(0, limit), hasMore: filtered.length > limit, showMore: () => setLimit(current => current + HOME_PAGE_SIZE),
    hasFilters: filter.query.trim() !== '' || filter.storeSlug !== null || filter.savedOnly,
    setQuery: (query: string) => change({ query }),
    setStore: (storeSlug: string | null) => change({ storeSlug }),
    toggleSavedOnly: () => change({ ...NO_FILTER, savedOnly: !filter.savedOnly }),
    reset: () => change(NO_FILTER),
  };
}
