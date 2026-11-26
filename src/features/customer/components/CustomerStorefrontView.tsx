import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ChevronRight, Package, Store } from 'lucide-react';
import type { AuthUser } from '../../../services/authService';
import { CustomerApiError, customerApi, isStoreSlug } from '../customer.api';
import type { Placement, StoreProduct, StoreSummary } from '../customer.types';
import { useCustomerCart } from '../hooks/useCustomerCart';
import { useCustomerResource } from '../hooks/useCustomerResource';
import { useSavedCustomerProducts } from '../hooks/useSavedCustomerProducts';
import { CustomerHeader } from './CustomerHeader';
import { CustomerCartDialog } from './CustomerCartDialog';
import { containerClass, PillButton, ProductCard, SectionHeading } from './CustomerCommerce';

export interface CustomerNavigation {
  user?: AuthUser | null;
  onLogout: () => void;
  onProfile: () => void;
  onHome: () => void;
  onLogin: () => void;
  onStore: (slug: string | null) => void;
}

interface Props extends CustomerNavigation {
  storeSlug: string | null;
  onProduct: (id: number) => void;
}

function StoreImage({ src, alt, className, fallback = null }: {
  src: string | null; alt: string; className: string; fallback?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return fallback;
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

export function CustomerStorefrontView(props: Props) {
  const stores = useCustomerResource(customerApi.stores);
  return <div className="customer-storefront isolate min-h-screen bg-white text-sm leading-normal text-[#212529] [&_button]:transition-colors [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-[#088178] motion-reduce:[&_*]:transition-none" lang="vi">
    <a className="absolute -top-25 left-4 z-100 bg-white p-3 focus:top-2" href="#shop-main">Chuyển đến nội dung chính</a>
    {props.storeSlug ? <SelectedStore key={props.storeSlug} {...props} storeSlug={props.storeSlug} stores={stores.data ?? []} /> : <>
      <CustomerHeader query="" savedCount={0} savedOnly={false} cartCount={0} {...props} />
      <main id="shop-main" className={`${containerClass} py-9`}>
        <SectionHeading id="shop-stores-title" title="Chọn cửa hàng" />
        {stores.loading && <p role="status">Đang tải cửa hàng…</p>}
        {stores.error && <StoreMessage text={stores.error.message} retry={stores.reload} />}
        {stores.data?.length === 0 && <p role="status">Chưa có cửa hàng đang hoạt động.</p>}
        <div className="storefront-store-grid grid grid-cols-4 gap-3 max-[800px]:grid-cols-2 max-[580px]:gap-2">
          {stores.data?.map(store => <button key={store.storeSlug} onClick={() => props.onStore(store.storeSlug)}
            className="storefront-store-card flex min-w-0 flex-col gap-3 rounded-xl border border-[#e8edeb] bg-white p-3 text-left hover:border-[#b5d7c7] hover:bg-[#f7fbf8]">
            <span className="flex w-full items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#edf7f1] text-[#088178]">
                <StoreImage key={store.iconUrl} src={store.iconUrl} alt={`Biểu tượng ${store.name}`}
                  className="size-full object-cover" fallback={<Store size={21} aria-hidden="true" />} />
              </span>
              <span className="min-w-0 break-words font-semibold">{store.name}</span><ChevronRight className="ml-auto shrink-0 text-[#088178]" size={16} />
            </span>
            <StoreImage key={store.bannerUrl} src={store.bannerUrl} alt={`Ảnh bìa ${store.name}`}
              className="h-16 w-full rounded-lg object-cover" />
          </button>)}
        </div>
      </main>
    </>}
  </div>;
}

function SelectedStore({ storeSlug, stores, onStore, onProduct, ...navigation }: Props & {
  storeSlug: string; stores: StoreSummary[];
}) {
  const home = useCustomerResource(useCallback(signal => isStoreSlug(storeSlug) ? customerApi.home(storeSlug, signal) : Promise.reject(new CustomerApiError(404)), [storeSlug]));
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number>();
  const [sort, setSort] = useState<'name' | 'price-asc' | 'price-desc'>('name');
  const [page, setPage] = useState(0);
  const [savedOnly, setSavedOnly] = useState(false);
  const { saved, toggle } = useSavedCustomerProducts();
  const [bundleProductNames, setBundleProductNames] = useState<Map<number, string>>(new Map());
  const dialog = useRef<HTMLDialogElement>(null);
  const storeReady = Boolean(home.data);
  const requestProducts = useCallback((signal: AbortSignal) => storeReady
    ? customerApi.products(storeSlug, { search, categoryId, page, pageSize: 20,
      sortBy: sort === 'name' ? 'name' : 'sellingPrice', sortDirection: sort === 'price-desc' ? 'desc' : 'asc' }, signal)
    : Promise.resolve(undefined), [storeSlug, storeReady, search, categoryId, page, sort]);
  const products = useCustomerResource(requestProducts);
  const cart = useCustomerCart(isStoreSlug(storeSlug) ? storeSlug : '', navigation.user);
  const store = home.data?.store;
  const openCart = () => {
    if (!navigation.user) navigation.onLogin();
    else dialog.current?.showModal();
  };
  const add = (product: StoreProduct) => {
    if (product.availability !== 'AVAILABLE') return;
    if (!navigation.user) navigation.onLogin();
    else void cart.mutate({ kind: 'add', productId: product.productId, quantity: 1 });
  };
  const addBundle = (placement: Placement) => {
    if (!placement.bundleKey) return;
    if (!navigation.user) { navigation.onLogin(); return; }
    setBundleProductNames(new Map(placement.products.map(item => [item.productId, item.name])));
    void cart.mutate({ kind: 'bundle', bundleKey: placement.bundleKey }).then(error => {
      if (error?.code === 'BUNDLE_UNAVAILABLE') home.reload();
    });
  };
  const savedKey = (id: number) => `${storeSlug}/${id}`;
  const card = (product: StoreProduct) => <ProductCard key={product.productId} product={product}
    saved={saved.includes(savedKey(product.productId))} onSave={() => toggle(savedKey(product.productId))}
    quantity={cart.cart?.items.find(line => line.productId === product.productId)?.quantity ?? 0}
    onOpen={() => onProduct(product.productId)} onAdd={() => add(product)} blocked={cart.blocked} />;
  const categoryOptions = new Map(home.data?.catalog.flatMap(group => group.categoryId === null ? [] : [[group.categoryId, group.name]]));
  for (const item of products.data?.items ?? []) if (item.category) categoryOptions.set(item.category.categoryId, item.category.name);
  const visible = products.data?.items.filter(item => !savedOnly || saved.includes(savedKey(item.productId))) ?? [];
  const categories = [...categoryOptions];
  return <>
    <CustomerHeader {...navigation} query={query} setQuery={store ? setQuery : undefined}
      onSearch={() => { setSearch(query.trim()); setPage(0); document.getElementById('shop-products')?.scrollIntoView(); }}
      savedCount={saved.filter(item => item.startsWith(`${storeSlug}/`)).length} savedOnly={savedOnly}
      toggleSavedOnly={store ? () => { setSavedOnly(!savedOnly); document.getElementById('shop-products')?.scrollIntoView(); } : undefined}
      cartCount={cart.count} openCart={store ? openCart : undefined} />
    <main id="shop-main" className="pb-14">
      <div className={`${containerClass} flex items-center justify-between gap-3 py-5`}>
        <button onClick={() => onStore(null)} className="flex items-center gap-2 text-[#088178]"><ArrowLeft size={15} />Các cửa hàng</button>
        {stores.length > 0 && <select aria-label="Chọn cửa hàng" value={stores.some(item => item.storeSlug === storeSlug) ? storeSlug : ''}
          onChange={event => onStore(event.target.value)}
          className="max-w-[190px] rounded-full border border-[#dce9e1] bg-[#f0f7f3] px-3 py-1.5 text-[#266b57]">
          <option value="" disabled>Chọn cửa hàng</option>
          {stores.map(item => <option key={item.storeSlug} value={item.storeSlug}>{item.name}</option>)}
        </select>}
      </div>
      {home.loading && <p className={containerClass} role="status">Đang tải cửa hàng…</p>}
      {home.error && <div className={containerClass}><StoreMessage
        text={home.error.status === 404 ? 'Cửa hàng không tồn tại hoặc đang ngừng hoạt động.' : home.error.message}
        retry={home.error.status === 404 ? undefined : home.reload} /></div>}
      {store && <>
        <section className={`${containerClass} flex flex-wrap items-center gap-4 rounded-xl bg-[#edf7f1] p-5`}>
          <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-white text-[#088178]">
            <StoreImage key={store.iconUrl} src={store.iconUrl} alt={`Biểu tượng ${store.name}`}
              className="size-full object-cover" fallback={<Store size={24} aria-hidden="true" />} />
          </span>
          <div className="min-w-0"><h1 className="break-words text-2xl font-semibold">{store.name}</h1>
            {home.data?.campaignName && <p className="mt-1 text-xs text-[#65796d]">{home.data.campaignName}</p>}</div>
          <StoreImage key={store.bannerUrl} src={store.bannerUrl} alt={`Ảnh bìa ${store.name}`}
            className="ml-auto h-24 w-full rounded-lg object-cover sm:max-w-[40%]" />
        </section>
        {cart.message && <div role="status" className={`${containerClass} mt-4 rounded-xl bg-[#f5faf6] px-4 py-3 text-xs text-[#436858]`}>
          <p>{cart.message}</p>
          {cart.components && <ul className="mt-2 space-y-1">
            {cart.components.map(item => <li key={item.productId}>
              {bundleProductNames.get(item.productId) ?? 'Sản phẩm trong gói'} · Đã thêm {item.added}/{item.requested}
            </li>)}
          </ul>}
          {cart.signInRequired && <button onClick={navigation.onLogin} className="mt-2 font-semibold underline">Đăng nhập</button>}
          {cart.needsReload && !cart.signInRequired && !cart.pending && <button onClick={() => void cart.load()} className="mt-2 font-semibold underline">Tải lại giỏ hàng</button>}
        </div>}
        {home.data?.zones.map(zone => zone.placements.length > 0 && <section key={zone.name} className={`${containerClass} pt-8`}>
          <SectionHeading title={zone.name === 'BUNDLE' ? 'Gói sản phẩm' : 'Gợi ý từ cửa hàng'} />
          {zone.placements.map(placement => placement.type === 'BUNDLE' ? <article key={placement.blockNo}
            className="storefront-bundle-card mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#edf5e8] p-5">
            <div className="min-w-0">
              <h3 className="mb-2 font-semibold">{placement.products.map(item => item.name).join(' + ') || 'Gói sản phẩm'}</h3>
              <ul className="space-y-1 text-xs text-[#436858]">{placement.products.map(item =>
                <li key={item.productId}><button onClick={() => onProduct(item.productId)} className="hover:underline">{item.name}</button>
                  {item.availability === 'OUT_OF_STOCK' && ' · Hết hàng'}</li>)}</ul>
            </div>
            {placement.bundleKey && <PillButton disabled={cart.blocked || home.loading} className="disabled:opacity-50" onClick={() => addBundle(placement)}>Thêm gói vào giỏ</PillButton>}
          </article> : <div key={placement.blockNo} className="mb-4 grid grid-cols-3 gap-4 max-[580px]:grid-cols-2">{placement.products.map(card)}</div>)}
        </section>)}
        <section id="shop-products" className="storefront-catalog mt-8 bg-[#f5f5f5] py-8">
          <div className={containerClass}>
            <SectionHeading title={savedOnly ? 'Sản phẩm đã lưu trên trang này' : `Sản phẩm tại ${store.name}`} />
            <div className="mb-4 flex flex-wrap items-center gap-3">
              {categories.length > 0 && <select aria-label="Danh mục sản phẩm" value={categoryId ?? ''}
                onChange={event => { setCategoryId(event.target.value ? Number(event.target.value) : undefined); setPage(0); }}
                className="rounded-full border border-[#e2e8e4] bg-white px-3 py-2 text-xs">
                <option value="">Tất cả danh mục</option>
                {categories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>}
              <select aria-label="Sắp xếp sản phẩm" value={sort}
                onChange={event => { setSort(event.target.value as typeof sort); setPage(0); }}
                className="rounded-full border border-[#e2e8e4] bg-white px-3 py-2 text-xs">
                <option value="name">Tên A–Z</option><option value="price-asc">Giá tăng dần</option><option value="price-desc">Giá giảm dần</option>
              </select>
              {search && <button onClick={() => { setQuery(''); setSearch(''); setPage(0); }} className="text-xs text-[#088178]">Xóa tìm kiếm</button>}
            </div>
            {products.loading && <p role="status">Đang tải sản phẩm…</p>}
            {products.error && <StoreMessage text={products.error.message} retry={products.reload} />}
            {products.data && !visible.length && <p role="status" className="flex items-center gap-2 rounded-xl bg-white p-6"><Package size={20} />Không tìm thấy sản phẩm.</p>}
            <div className="storefront-product-grid grid grid-cols-3 gap-4 max-[580px]:grid-cols-2 max-[580px]:gap-2">{visible.map(card)}</div>
            {products.data && (page > 0 || products.data.totalElements > products.data.pageSize) &&
              <nav aria-label="Trang sản phẩm" className="mt-5 flex items-center justify-center gap-4 text-xs">
                <button onClick={() => setPage(page - 1)} disabled={page === 0} className="text-[#088178] disabled:opacity-40">Trang trước</button>
                <span>Trang {page + 1}</span>
                <button onClick={() => setPage(page + 1)} disabled={(page + 1) * products.data.pageSize >= products.data.totalElements}
                  className="text-[#088178] disabled:opacity-40">Trang sau</button>
              </nav>}
          </div>
        </section>
        <CustomerCartDialog dialogRef={dialog} storeName={store.name} state={cart} onLogin={navigation.onLogin} />
      </>}
    </main>
  </>;
}

export function StoreMessage({ text, retry }: { text: string; retry?: () => void }) {
  return <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e2ebe5] bg-white p-5">
    <p className="text-[#436858]">{text}</p>
    {retry && <button onClick={retry} className="font-semibold text-[#088178] underline">Thử lại</button>}
  </div>;
}
