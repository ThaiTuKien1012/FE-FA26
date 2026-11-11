import { useEffect, useRef, useState } from 'react';
import { APP_BRAND } from '../../../app/branding';
import type { CustomerDisplayProduct, ProductItem } from '../customer.types';
import { CUSTOMER_STORES, getCustomerStoreId, rememberCustomerStore } from '../data/customerStores';
import { getCustomerProducts } from '../data/customerCatalog';
import { useCustomerShopping } from './useCustomerShopping';

type SortOrder = 'featured' | 'price-asc' | 'price-desc' | 'name';
type DemoReceipt = {
  id: string;
  storeName: string;
  items: { product: CustomerDisplayProduct; quantity: number }[];
  total: number;
};

export function useCustomerStorefront(productsByStore?: Record<string, ProductItem[]>) {
  const { storeCarts, saved, changeQuantity, clearCart, toggleSaved } = useCustomerShopping();
  const [selectedStoreId, setSelectedStoreId] = useState(getCustomerStoreId);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All Products');
  const [brand, setBrand] = useState('All Products');
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState<SortOrder>('featured');
  const [selectedProduct, setSelectedProduct] = useState<CustomerDisplayProduct | null>(null);
  const [dialogMode, setDialogMode] = useState<'product' | 'cart'>('product');
  const [receipt, setReceipt] = useState<DemoReceipt | null>(null);
  const [notice, setNotice] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const receiptRef = useRef<HTMLDialogElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const selectedStore = CUSTOMER_STORES.find(store => store.id === selectedStoreId) || CUSTOMER_STORES[0];
  const storeProducts: CustomerDisplayProduct[] = productsByStore?.[selectedStore.id] ?? getCustomerProducts(selectedStore.id);
  const categories = ['All Products', ...new Set(storeProducts.map(product => product.category))];
  const brands = [...new Set(storeProducts.map(product => product.brand || product.category))];
  const cart = storeCarts[selectedStore.id] || {};
  const cartProducts = storeProducts.filter(product => cart[product.id] > 0);
  const cartCount = cartProducts.reduce((sum, product) => sum + cart[product.id], 0);
  const cartTotal = cartProducts.reduce((sum, product) => sum + product.priceVnd * cart[product.id], 0);
  const search = query.trim().toLowerCase();
  const filteredProducts = storeProducts.filter(product =>
    (category === 'All Products' || category === product.category) &&
    (brand === 'All Products' || brand === (product.brand || product.category)) &&
    (!savedOnly || saved.includes(product.id)) &&
    `${product.name} ${product.sku} ${product.brand || ''} ${product.category}`.toLowerCase().includes(search),
  ).sort((a, b) => sort === 'price-asc' ? a.priceVnd - b.priceVnd
    : sort === 'price-desc' ? b.priceVnd - a.priceVnd
      : sort === 'name' ? a.name.localeCompare(b.name) : 0);
  const hasFilters = Boolean(query || savedOnly || category !== 'All Products' || brand !== 'All Products');
  const bundles = [storeProducts.slice(0, 2), storeProducts.slice(2, 4)].filter(items => items.length === 2);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${APP_BRAND.name} | Shop Your Everyday Favorites`;
    return () => { document.title = previousTitle; clearTimeout(noticeTimer.current); };
  }, []);

  const scrollTo = (id = 'shop-products') => document.getElementById(id === 'fm-products' ? 'shop-products' : id)?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start',
  });
  const resetFilters = () => { setQuery(''); setCategory('All Products'); setBrand('All Products'); setSavedOnly(false); };
  const chooseStore = (storeId: string) => {
    if (!CUSTOMER_STORES.some(store => store.id === storeId)) return;
    setSelectedStoreId(storeId);
    rememberCustomerStore(storeId);
    resetFilters();
    setSort('featured');
    setNotice('');
  };
  const toggleSavedOnly = () => {
    const next = !savedOnly;
    resetFilters();
    setSavedOnly(next);
    scrollTo();
  };
  const addToCart = (product: CustomerDisplayProduct) => {
    if (!storeProducts.some(item => item.id === product.id)) return;
    changeQuantity(selectedStore.id, product.id, 1);
    setNotice(`Added ${product.name} to your ${selectedStore.englishName} cart`);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 3000);
  };
  const updateQuantity = (id: string, difference: number) => {
    if (storeProducts.some(product => product.id === id)) changeQuantity(selectedStore.id, id, difference);
  };
  const openProduct = (product: CustomerDisplayProduct) => {
    setSelectedProduct(product); setDialogMode('product'); dialogRef.current?.showModal();
  };
  const openCart = () => { setDialogMode('cart'); dialogRef.current?.showModal(); };
  const closeDialog = () => dialogRef.current?.close();
  const completeDemoOrder = () => {
    if (!cartProducts.length) return;
    setReceipt({ id: `DEMO-${Date.now().toString(36).toUpperCase()}`, storeName: selectedStore.englishName,
      items: cartProducts.map(product => ({ product, quantity: cart[product.id] })), total: cartTotal });
    clearCart(selectedStore.id);
    closeDialog();
    receiptRef.current?.showModal();
  };

  return { selectedStore, storeProducts, categories, brands, bundles,
    query, setQuery, category, setCategory, brand, setBrand, saved, savedOnly,
    sort, setSort, filteredProducts, hasFilters, resetFilters, chooseStore, toggleSavedOnly,
    cart, cartProducts, cartCount, cartTotal, addToCart, updateQuantity, toggleSaved,
    selectedProduct, dialogMode, dialogRef, openProduct, openCart, closeDialog,
    receipt, receiptRef, completeDemoOrder, notice, setNotice, scrollTo };
}
