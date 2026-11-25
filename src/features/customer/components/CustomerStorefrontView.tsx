import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, LayoutGrid, Store } from 'lucide-react';
import type { AuthUser } from '../../../services/authService';
import { APP_BRAND } from '../../../app/branding';
import { useCustomerStorefront } from '../hooks/useCustomerStorefront';
import { CustomerHeader } from './CustomerHeader';
import { containerClass, CustomerFooter, customerButton, ProductCard, PublicState } from './CustomerCommerce';

export interface CustomerStorefrontViewProps {
  user?: AuthUser | null;
  onLogout?: () => void;
  onProfile?: () => void;
  onHome: () => void;
  onLogin: () => void;
  onProduct: (id: string) => void;
  onExplore?: () => void;
  landing?: boolean;
}
const zoneLabels: Record<string, string> = { BASELINE: 'Sản phẩm trưng bày', BANNER: 'Sản phẩm nổi bật', BUNDLE: 'Gợi ý kết hợp', CROSS_SELL: 'Gợi ý thêm cho bạn', FBT: 'Thường được mua cùng' };
const scrollToProducts = () => document.getElementById('shop-products')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });

export function CustomerStorefrontView({ user, onLogout, onProfile, onHome, onLogin, onProduct, onExplore, landing = false }: CustomerStorefrontViewProps) {
  const shop = useCustomerStorefront();
  const { stores, selectedStore, slug, home, products, query, setQuery, categoryId, setCategoryId, categories, sort, setSort, page, setPage, chooseStore, resetFilters } = shop;
  useEffect(() => {
    const previous = document.title;
    document.title = `${selectedStore?.name || 'Cửa hàng'} | ${APP_BRAND.name}`;
    return () => { document.title = previous; };
  }, [selectedStore?.name]);
  const total = products.data?.totalElements ?? 0;
  const pageCount = Math.ceil(total / 20);
  const openProduct = (id: number) => onProduct(String(id));
  const homeHasProducts = Boolean(home.data?.zones.some(zone => zone.placements.some(block => block.products.length)) || home.data?.catalog.some(category => category.products.length));

  return <div className={`${landing ? 'customer-home' : 'customer-storefront'} min-h-screen bg-white text-[#212529] [&_button]:cursor-pointer [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-[#088178]`} lang="vi">
    <a href="#shop-main" className="absolute -top-20 left-4 z-50 bg-white p-3 focus:top-2">Chuyển đến nội dung chính</a>
    <CustomerHeader query={query} setQuery={setQuery} onSearch={scrollToProducts} onLogin={onLogin} onHome={onHome} user={user} onProfile={onProfile} onLogout={onLogout} />
    <nav className="border-y border-[#e6eee8]" aria-label="Điều hướng cửa hàng"><div className={`${containerClass} flex min-h-14 flex-wrap items-center gap-6 text-sm`}>
      {!landing && <button onClick={onHome} className="flex items-center gap-2 text-[#607c6b]"><ArrowLeft size={15} />Trang chủ</button>}
      <a href="#shop-stores" className="text-[#088178]">Cửa hàng</a><a href="#shop-products">Sản phẩm</a>
      {selectedStore && <span className="ml-auto text-xs text-[#6c8577]">{selectedStore.name}</span>}
    </div></nav>
    <main id="shop-main">
      <section className={`${containerClass} mt-7 overflow-hidden rounded-3xl bg-[#eaf5ef] p-8 max-[580px]:p-5`}>
        <div className="flex items-center justify-between gap-5"><div className="max-w-2xl"><p className="text-xs font-medium tracking-widest text-[#367b60]">KHÁM PHÁ CỬA HÀNG</p><h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight max-[580px]:text-3xl">{landing ? 'Sản phẩm mỗi ngày, từ cửa hàng bạn chọn.' : selectedStore?.name || 'Chọn cửa hàng của bạn'}</h1><p className="mt-4 text-sm leading-6 text-[#5f7b6d]">{landing ? 'Chọn một cửa hàng để xem danh mục, sản phẩm và những gợi ý đang được trưng bày.' : home.data?.campaignName || 'Xem sản phẩm được công khai tại cửa hàng.'}</p><button className={`${customerButton} mt-5`} onClick={landing && onExplore ? onExplore : scrollToProducts}>{landing ? 'Khám phá sản phẩm' : 'Xem danh mục'}<ArrowRight size={16} /></button></div><Store size={116} strokeWidth={.8} className="shrink-0 text-[#85b49d] max-[800px]:hidden" /></div>
      </section>
      <section id="shop-stores" className={`${containerClass} scroll-mt-5 py-9`} aria-labelledby="shop-stores-title">
        <div className="mb-4 flex items-center justify-between gap-4"><h2 id="shop-stores-title" className="text-2xl font-semibold tracking-tight">Chọn cửa hàng</h2>{stores.data && <span className="text-xs text-[#6b8377]">{stores.data.length} cửa hàng</span>}</div>
        {stores.loading || stores.error ? <PublicState loading={stores.loading} error={stores.error} onRetry={stores.retry} /> : stores.data?.length === 0 ? <PublicState empty="Chưa có cửa hàng nào được mở công khai." /> : <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[420px]:grid-cols-1">{stores.data?.map(store => <button key={store.storeSlug} onClick={() => chooseStore(store.storeSlug)} aria-pressed={store.storeSlug === slug} className={`flex min-h-24 items-center gap-3 rounded-2xl border p-4 text-left ${store.storeSlug === slug ? 'border-[#088178] bg-[#eff8f2]' : 'border-[#e1eae5] hover:bg-[#f6faf7]'}`}><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#e4f1e9] text-[#088178]"><Store size={24} /></span><span className="min-w-0"><strong className="block text-sm">{store.name}</strong><span className="mt-2 flex items-center gap-1 text-xs text-[#5c806d]">{store.storeSlug === slug ? <><Check size={13} />Đang chọn</> : 'Xem cửa hàng'}</span></span></button>)}</div>}
      </section>
      {slug && <>
        <section aria-label="Trưng bày tại cửa hàng" className={`${containerClass} pb-8`}>
          {home.loading || home.error ? <PublicState loading={home.loading} error={home.error} onRetry={home.retry} /> : home.data && <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-semibold">{home.data.campaignName || 'Danh mục cửa hàng'}</h2>{home.data.fallbackType === 'DEFAULT_CATALOG' && <span className="text-xs text-[#6c8577]">Danh mục hiện có</span>}</div>
            {home.data.zones.map(zone => <section key={zone.name} className="mb-7" aria-label={zoneLabels[zone.name] || zone.name}><h3 className="mb-3 flex items-center gap-2 text-lg font-medium text-[#306f56]"><LayoutGrid size={18} />{zoneLabels[zone.name] || zone.name}</h3><div className="grid gap-4">{zone.placements.map(block => <div key={`${zone.name}-${block.blockNo}`} className="rounded-2xl border border-[#e0eae4] bg-[#f5f9f6] p-4"><div className="mb-3 text-xs text-[#5d7b69]">Nhóm {block.blockNo}</div><div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-3 max-[650px]:grid-cols-2">{block.products.map(product => <ProductCard key={product.productId} product={product} onOpen={() => openProduct(product.productId)} />)}</div></div>)}</div></section>)}
            {landing && home.data.catalog.map(category => <section key={category.categoryId ?? 'uncategorized'} className="mb-7"><h3 className="mb-3 text-lg font-medium text-[#306f56]">{category.name}</h3><div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-3 max-[650px]:grid-cols-2">{category.products.map(product => <ProductCard key={product.productId} product={product} onOpen={() => openProduct(product.productId)} />)}</div></section>)}
            {!homeHasProducts && <p className="text-sm text-[#738b7d]">Cửa hàng chưa có sản phẩm trưng bày.</p>}
          </>}
        </section>
        <section id="shop-products" aria-labelledby="shop-products-title" className="scroll-mt-4 bg-[#f5f7f5] py-9"><div className={containerClass}>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs tracking-widest text-[#088178]">DANH MỤC SẢN PHẨM</p><h2 id="shop-products-title" className="mt-2 text-2xl font-semibold">{selectedStore?.name || 'Sản phẩm cửa hàng'}</h2></div><div className="flex flex-wrap gap-3">
            <select aria-label="Lọc theo danh mục" value={categoryId} onChange={event => setCategoryId(event.target.value)} className="max-w-56 rounded-full border border-[#dce7df] bg-white px-4 py-2 text-sm"><option value="">Tất cả danh mục</option>{categoryId && !categories.some(category => String(category.categoryId) === categoryId) && <option value={categoryId}>Danh mục đang chọn</option>}{categories.map(category => <option key={category.categoryId} value={category.categoryId}>{category.name}</option>)}</select>
            <select aria-label="Sắp xếp sản phẩm" value={sort} onChange={event => setSort(event.target.value)} className="rounded-full border border-[#dce7df] bg-white px-4 py-2 text-sm"><option value="name">Tên A–Z</option><option value="price-asc">Giá tăng dần</option><option value="price-desc">Giá giảm dần</option></select>
          </div></div>
          {query || categoryId ? <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-[#637d6d]">{query && <span>Tìm “{query}”</span>}<button className="text-[#088178] underline" onClick={resetFilters}>Xóa bộ lọc</button></div> : null}
          {products.loading || products.error ? <PublicState loading={products.loading} error={products.error} onRetry={products.retry} /> : <>
            <p role="status" className="mb-4 text-xs text-[#658271]">{total ? `${page * 20 + 1}–${page * 20 + (products.data?.items.length ?? 0)} / ${total} sản phẩm` : '0 sản phẩm'}</p>
            <div className="grid grid-cols-4 gap-4 max-[1000px]:grid-cols-3 max-[650px]:grid-cols-2">{products.data?.items.map(product => <ProductCard key={product.productId} product={product} onOpen={() => openProduct(product.productId)} />)}</div>
            {!products.data?.items.length && <PublicState empty={query || categoryId ? 'Không tìm thấy sản phẩm phù hợp.' : 'Cửa hàng chưa có sản phẩm công khai.'} />}
            {pageCount > 1 && <nav aria-label="Phân trang sản phẩm" className="mt-7 flex items-center justify-center gap-4"><button className={customerButton} disabled={page === 0} onClick={() => { setPage(page - 1); scrollToProducts(); }}><ChevronLeft size={16} />Trước</button><span className="text-sm">Trang {page + 1} / {pageCount}</span><button className={customerButton} disabled={page + 1 >= pageCount} onClick={() => { setPage(page + 1); scrollToProducts(); }}>Sau<ChevronRight size={16} /></button></nav>}
          </>}
        </div></section>
      </>}
    </main><CustomerFooter />
  </div>;
}
