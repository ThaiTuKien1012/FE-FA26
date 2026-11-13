import { useEffect, useRef, useState } from 'react';
import { normalizeCustomerSearch } from '../customerSearch';
import { APP_BRAND } from '../../../app/branding';
import type { CustomerDisplayProduct, ProductItem } from '../customer.types';
import { CUSTOMER_STORES, getCustomerStoreId, rememberCustomerStore } from '../data/customerStores';
import { getCustomerProducts } from '../data/customerCatalog';
import { useCustomerShopping } from './useCustomerShopping';
import { useActiveStorefront, type CustomerStorefrontSource } from './useActiveStorefront';
import { resolvePlacement, type CustomerPlacement } from '../merchandising';

type SortOrder = 'featured' | 'price-asc' | 'price-desc' | 'name';
type DemoReceipt = {
  id: string;
  storeName: string;
  items: { product: CustomerDisplayProduct; quantity: number }[];
  total: number;
};

export function useCustomerStorefront(productsByStore?: Record<string, ProductItem[]>, source?: CustomerStorefrontSource) {
  const { storeCarts, saved, addItems, changeQuantity, clearCart, toggleSaved } = useCustomerShopping();
  const [selectedStoreId, setSelectedStoreId] = useState(getCustomerStoreId);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All Products');
  const [brand, setBrand] = useState('All Products');
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState<SortOrder>('featured');
  const [selectedGroup, setSelectedGroup] = useState<CustomerPlacement | null>(null);
  const groupRef = useRef<HTMLDialogElement>(null);
  const [selectedProduct, setSelectedProduct] = useState<CustomerDisplayProduct | null>(null);
  const [dialogMode, setDialogMode] = useState<'product' | 'cart'>('product');
  const [receipt, setReceipt] = useState<DemoReceipt | null>(null);
  const [notice, setNotice] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const receiptRef = useRef<HTMLDialogElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const selectedStore = CUSTOMER_STORES.find(store => store.id === selectedStoreId) || CUSTOMER_STORES[0];
  const active = useActiveStorefront(selectedStore.id, source);
  const storeProducts: CustomerDisplayProduct[] = source ? (active.products ?? []) : (productsByStore?.[selectedStore.id] ?? getCustomerProducts(selectedStore.id));
  const categories = ['All Products', ...new Set(storeProducts.map(product => product.category))];
  const brands = [...new Set(storeProducts.map(product => product.brand || product.category))];
  const cart = storeCarts[selectedStore.id] || {};
  const cartProducts = storeProducts.filter(product => cart[product.id] > 0);
  const cartCount = cartProducts.reduce((sum, product) => sum + cart[product.id], 0);
  const cartTotal = cartProducts.reduce((sum, product) => sum + product.priceVnd * cart[product.id], 0);
  const search = normalizeCustomerSearch(query.trim());
  const filteredProducts = storeProducts.filter(product =>
    (category === 'All Products' || category === product.category) &&
    (brand === 'All Products' || brand === (product.brand || product.category)) &&
    (!savedOnly || saved.includes(product.id)) &&
    normalizeCustomerSearch(`${product.name} ${product.sku} ${product.brand || ''} ${product.category}`).includes(search),
  ).sort((a, b) => sort === 'price-asc' ? a.priceVnd - b.priceVnd
    : sort === 'price-desc' ? b.priceVnd - a.priceVnd
      : sort === 'name' ? a.name.localeCompare(b.name) : 0);
  const hasFilters = Boolean(query || savedOnly || category !== 'All Products' || brand !== 'All Products');
  useEffect(() => {
    groupRef.current?.close();
    setSelectedGroup(null);
  }, [selectedStore.id, active.layout]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${APP_BRAND.name} | Cửa hàng thực phẩm`;
    return () => { document.title = previousTitle; clearTimeout(noticeTimer.current); };
  }, []);

  const scrollTo = (id = 'shop-products') => document.getElementById(id === 'fm-products' ? 'shop-products' : id)?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start',
  });
  const resetFilters = () => { setQuery(''); setCategory('All Products'); setBrand('All Products'); setSavedOnly(false); };
  const chooseStore = (storeId: string) => {
    if (!CUSTOMER_STORES.some(store => store.id === storeId)) return;
    dialogRef.current?.close();
    groupRef.current?.close();
    setSelectedProduct(null);
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
  const announce = (message: string) => {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 3500);
  };
  const addToCart = (product: CustomerDisplayProduct) => {
    const current = storeProducts.find(item => item.id === product.id);
    if (!current) return;
    announce(addItems(selectedStore.id, [{ product: current, quantity: 1 }])
      ? `Đã thêm ${current.name} vào giỏ` : 'Số lượng hiện có không đủ để thêm vào giỏ.');
  };
  const addGroup = (placement: CustomerPlacement, selectedIds?: string[]) => {
    const current = active.layout?.placements.find(item => item.id === placement.id);
    if (!current) return;
    if (current.type === 'BUNDLE' || current.type === 'FBT') {
      const count = new Set(current.items.map(item => item.productId)).size;
      if (count < 2 || count > 4) return;
    }
    const group = resolvePlacement(current, storeProducts);
    const items = selectedIds ? group.items.filter(item => selectedIds.includes(item.productId)) : group.items;
    if ((!selectedIds && !group.valid) || items.some(item => !item.product)) return;
    announce(addItems(selectedStore.id, items.map(item => ({product: item.product!, quantity: item.quantity})))
      ? 'Đã thêm sản phẩm đã chọn vào giỏ' : 'Không thể thêm nhóm. Vui lòng kiểm tra số lượng còn lại.');
  };
  const openGroup = (placement: CustomerPlacement) => { setSelectedGroup(placement); groupRef.current?.showModal(); };
  const updateQuantity = (id: string, difference: number) => {
    const product = storeProducts.find(item => item.id === id);
    if (!product) return;
    if (difference > 0) {
      if (!addItems(selectedStore.id, [{product, quantity:difference}])) announce('Số lượng hiện có không đủ.');
    } else changeQuantity(selectedStore.id, id, difference);
  };
  const openProduct = (product: CustomerDisplayProduct) => {
    groupRef.current?.close();
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

  return { selectedStore, storeProducts, categories, brands, active, addGroup, openGroup, selectedGroup, groupRef,
    query, setQuery, category, setCategory, brand, setBrand, saved, savedOnly,
    sort, setSort, filteredProducts, hasFilters, resetFilters, chooseStore, toggleSavedOnly,
    cart, cartProducts, cartCount, cartTotal, addToCart, updateQuantity, toggleSaved,
    selectedProduct, dialogMode, dialogRef, openProduct, openCart, closeDialog,
    receipt, receiptRef, completeDemoOrder, notice, setNotice, scrollTo };
}
