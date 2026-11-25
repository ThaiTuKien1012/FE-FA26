import { useCallback, useEffect, useMemo, useState } from 'react';
import { customerApi, storefrontError } from '../customer.api';
import type { PublicCategory } from '../customer.types';
import { getCustomerStoreId, rememberCustomerStore, storeSlugFromPath, storefrontPath } from '../data/customerStores';

/** Keying each result prevents old Store/search data from flashing during a new request. */
export function usePublicRead<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; data?: T; error: string; loading: boolean }>({ key: '', error: '', loading: false });
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    setState({ key, loading: true, error: '' });
    void Promise.resolve().then(() => load(controller.signal)).then(data => {
      if (!controller.signal.aborted) setState({ key, data, loading: false, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ key, loading: false, error: storefrontError(error) });
    });
    return () => controller.abort();
  }, [key, load, attempt]);
  return { data: key && state.key === key ? state.data : undefined, error: key && state.key === key ? state.error : '', loading: Boolean(key) && (key !== state.key || state.loading), retry: () => setAttempt(value => value + 1) };
}

export function useCustomerStorefront() {
  const stores = usePublicRead('stores', customerApi.stores);
  const [selectedSlug, setSelectedSlug] = useState(getCustomerStoreId);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(0);
  const slug = selectedSlug || stores.data?.[0]?.storeSlug || '';
  const loadHome = useCallback((signal: AbortSignal) => customerApi.home(slug, signal), [slug]);
  const home = usePublicRead(slug, loadHome);
  const sortBy = sort === 'name' ? 'name' : 'sellingPrice';
  const sortDirection = sort === 'price-desc' ? 'desc' : 'asc';
  const productKey = slug ? JSON.stringify([slug, search, categoryId, sort, page]) : '';
  const loadProducts = useCallback((signal: AbortSignal) => customerApi.products(slug, { search, categoryId: categoryId ? Number(categoryId) : undefined, sortBy, sortDirection, page, pageSize: 20 }, signal), [slug, search, categoryId, sortBy, sortDirection, page]);
  const products = usePublicRead(productKey, loadProducts);

  useEffect(() => { const timer = setTimeout(() => { setSearch(query); setPage(0); }, 300); return () => clearTimeout(timer); }, [query]);
  useEffect(() => { if (slug) rememberCustomerStore(slug); }, [slug]);
  useEffect(() => {
    const onPop = () => { setSelectedSlug(getCustomerStoreId()); setQuery(''); setSearch(''); setCategoryId(''); setPage(0); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const categories = useMemo(() => {
    const items = new Map<number, PublicCategory>();
    for (const category of home.data?.catalog ?? []) if (category.categoryId !== null) items.set(category.categoryId, { categoryId: category.categoryId, name: category.name });
    const rows = [...(products.data?.items ?? []), ...(home.data?.zones.flatMap(zone => zone.placements.flatMap(placement => placement.products)) ?? [])];
    for (const product of rows) if (product.category) items.set(product.category.categoryId, product.category);
    return [...items.values()];
  }, [home.data, products.data]);
  const chooseStore = (next: string) => {
    if (!stores.data?.some(store => store.storeSlug === next)) return;
    rememberCustomerStore(next); setSelectedSlug(next); setQuery(''); setSearch(''); setCategoryId(''); setSort('name'); setPage(0);
    if (storeSlugFromPath(window.location.pathname)) {
      window.history.pushState({ screen: 'customer-storefront' }, '', storefrontPath(next));
      window.dispatchEvent(new Event('popstate'));
    }
  };
  const visibleProducts = query === search ? products : { ...products, data: undefined, error: '', loading: true };
  return { stores, slug, selectedStore: stores.data?.find(store => store.storeSlug === slug) ?? home.data?.store, home, products: visibleProducts, categories,
    query, setQuery, categoryId, setCategoryId: (value: string) => { setCategoryId(value); setPage(0); },
    sort, setSort: (value: string) => { setSort(value); setPage(0); }, page, setPage, chooseStore,
    resetFilters: () => { setQuery(''); setSearch(''); setCategoryId(''); setSort('name'); setPage(0); } };
}
