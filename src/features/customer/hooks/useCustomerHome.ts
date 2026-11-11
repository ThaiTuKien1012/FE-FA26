import { useEffect, useRef, useState } from 'react';
import { APP_BRAND } from '../../../app/branding';
import { CUSTOMER_STORES, getCustomerStoreId, rememberCustomerStore } from '../data/customerStores';
import { getCustomerCategories, getCustomerProducts, type CustomerProduct } from '../data/customerCatalog';
import { useCustomerShopping } from './useCustomerShopping';

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
}

export function useCustomerHome(onExplore: () => void) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All Products');
  const [brand, setBrand] = useState('All Products');
  const { storeCarts, saved, changeQuantity, toggleSaved } = useCustomerShopping();
  const [savedOnly, setSavedOnly] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState(getCustomerStoreId);
  const [notice, setNotice] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CustomerProduct | null>(null);
  const [dialogMode, setDialogMode] = useState<'product' | 'cart'>('product');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const brandRowRef = useRef<HTMLDivElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const selectedStore = CUSTOMER_STORES.find(store => store.id === selectedStoreId) || CUSTOMER_STORES[0];
  const storeProducts = getCustomerProducts(selectedStore.id);
  const categories = ['All Products', ...getCustomerCategories(selectedStore.id)];
  const brands = [...new Set(storeProducts.map(product => product.brand))].map((name, index) => ({
    name,
    image: storeProducts.find(product => product.brand === name)!.image,
    description: `Available at ${selectedStore.englishName}`,
    color: ['#eef5e9', '#fff4e5', '#edf5fb', '#fff0f3', '#eaf5ef'][index % 5],
  }));
  const featuredProduct = storeProducts[0];
  const secondaryProduct = storeProducts.find(product => product.category !== featuredProduct.category) || storeProducts[1];
  const cart = storeCarts[selectedStore.id] || {};
  const cartProducts = storeProducts.filter(product => cart[product.id] > 0);
  const cartCount = cartProducts.reduce((sum, product) => sum + cart[product.id], 0);
  const cartTotal = cartProducts.reduce((sum, product) => sum + product.priceVnd * cart[product.id], 0);
  const filteredProducts = storeProducts.filter(product =>
    (category === 'All Products' || product.category === category) &&
    (brand === 'All Products' || product.brand === brand) &&
    (!savedOnly || saved.includes(product.id)) &&
    normalize(`${product.name} ${product.brand} ${product.category}`).includes(normalize(query.trim())),
  );
  const hasFilters = Boolean(query || brand !== 'All Products' || category !== 'All Products' || savedOnly);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = APP_BRAND.customerTitle;
    return () => {
      document.title = previousTitle;
      clearTimeout(noticeTimer.current);
    };
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    block: 'start',
  });
  const resetFilters = () => {
    setCategory('All Products');
    setBrand('All Products');
    setQuery('');
    setSavedOnly(false);
  };
  const chooseStore = (storeId: string, scroll = true) => {
    if (!CUSTOMER_STORES.some(store => store.id === storeId)) return;
    setSelectedStoreId(storeId);
    rememberCustomerStore(storeId);
    resetFilters();
    setNotice('');
    if (scroll) scrollTo('fm-products');
  };
  const chooseBrand = (name: string) => {
    resetFilters();
    setBrand(name);
    scrollTo('fm-products');
  };
  const chooseCategory = (name: string) => {
    resetFilters();
    setCategory(name);
    setCategoryMenuOpen(false);
    scrollTo('fm-products');
  };
  const openStorefront = () => {
    rememberCustomerStore(selectedStore.id);
    onExplore();
  };
  const toggleSavedOnly = () => {
    const next = !savedOnly;
    resetFilters();
    setSavedOnly(next);
    scrollTo('fm-products');
  };
  const addToCart = (product: Pick<CustomerProduct, 'id' | 'name'>) => {
    if (!selectedStore.productIds.includes(product.id)) return;
    changeQuantity(selectedStore.id, product.id, 1);
    setNotice(`Added ${product.name} to your ${selectedStore.englishName} cart`);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 3000);
  };
  const updateQuantity = (id: string, difference: number) => {
    if (selectedStore.productIds.includes(id)) changeQuantity(selectedStore.id, id, difference);
  };
  const openProduct = (product: CustomerProduct) => {
    setSelectedProduct(product);
    setDialogMode('product');
    dialogRef.current?.showModal();
  };
  const openCart = () => {
    setDialogMode('cart');
    dialogRef.current?.showModal();
  };
  const closeDialog = () => dialogRef.current?.close();
  const scrollBrands = (direction: number) => brandRowRef.current?.scrollBy({
    left: direction * 250,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  });

  return {
    query, setQuery, category, setCategory, brand, setBrand, saved, savedOnly,
    selectedStore, storeProducts, categories, brands, featuredProduct, secondaryProduct,
    cart, cartCount, cartProducts, cartTotal, filteredProducts, hasFilters,
    notice, setNotice, menuOpen, setMenuOpen, categoryMenuOpen, setCategoryMenuOpen,
    selectedProduct, dialogMode, dialogRef, brandRowRef,
    scrollTo, resetFilters, chooseStore, chooseBrand, chooseCategory, openStorefront,
    toggleSaved, toggleSavedOnly, addToCart, updateQuantity,
    openProduct, openCart, closeDialog, scrollBrands,
  };
}
