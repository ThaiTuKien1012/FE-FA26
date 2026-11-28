import { useEffect, useState } from 'react';
import {
  ArrowUpRight, ChevronRight, Headphones, Package, Search, Store, X,
} from 'lucide-react';
import { AppLogo } from '../../../components/common/AppLogo';
import { APP_BRAND } from '../../../app/branding';
import { buildBannerSlides, homeSavedKey, type HomeBundle, type HomeProduct, type HomeStore } from '../customerHomeModel';
import { customerPath } from '../customerRoutes';
import { useCustomerHome } from '../hooks/useCustomerHome';
import { CustomerBannerCarousel } from './CustomerBannerCarousel';
import { CustomerHeader } from './CustomerHeader';
import { CustomerStoreLogo } from './CustomerStoreLogo';
import { containerClass, PillButton, ProductCard, SectionHeading } from './CustomerCommerce';
import { type CustomerNavigation, StoreMessage } from './CustomerStorefrontView';

type Props = CustomerNavigation & { onProduct: (storeSlug: string, productId: number) => void; onRegister?: () => void };
const basketImage = '/images/customer-home/fresh/grocery-basket.png';
const storeTints = ['#eaf5ef', '#fcf1e6', '#fff6e4', '#edf4e6', '#eef1fb'];
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion() ? 'instant' : 'smooth', block: 'start' });

function BundleRail({ bundles, onStore }: { bundles: HomeBundle[]; onStore: (slug: string) => void }) {
  return (
    <section id="fm-bundles" className={`${containerClass} scroll-mt-5 py-4 max-[580px]:py-3`} aria-labelledby="fm-bundles-title">
      <div className="overflow-hidden rounded-[22px] bg-[linear-gradient(125deg,#a93427,#dc5943_58%,#ed8465)] px-7 py-7 text-white max-[800px]:px-5 max-[580px]:rounded-2xl max-[580px]:px-4 max-[580px]:py-5">
        <div className="mb-6 flex min-w-0 items-start gap-4 max-[580px]:mb-4 max-[580px]:gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/15 text-white max-[580px]:size-10"><Package size={22} strokeWidth={2.3} /></span>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80 max-[580px]:text-[9px]">GỢI Ý TỪ CỬA HÀNG</span>
            <h2 id="fm-bundles-title" className="mt-1 text-[30px] leading-tight font-bold tracking-tight max-[580px]:text-[24px]">Gói sản phẩm</h2>
            <p className="mt-1.5 text-xs text-white/85 max-[580px]:text-[10px]">Các gói sản phẩm đang được cửa hàng đề xuất. Thêm gói vào giỏ tại trang cửa hàng.</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-[15px] max-[800px]:grid-cols-2 max-[800px]:gap-3">
          {bundles.slice(0, 4).map(bundle => {
            const partlyOut = bundle.products.some(product => product.availability !== 'AVAILABLE');
            return <article key={bundle.key} className="home-bundle-card flex min-w-0 flex-col rounded-[15px] bg-white p-3 text-[#212529]">
              <div className="mb-3 flex gap-1.5">{bundle.products.slice(0, 3).map(product => <span key={product.productId} className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f5f5f5] max-[580px]:size-12">
                {product.imageUrl ? <img className="size-full object-contain p-1" src={product.imageUrl} alt="" loading="lazy" /> : <Package className="size-7 text-[#9daea5]" aria-hidden="true" />}
              </span>)}</div>
              <h3 className="line-clamp-2 text-xs font-semibold">{bundle.products.map(product => product.name).join(' + ')}</h3>
              <p className="mt-1 text-[9px] text-[#8a9a90]">Bán tại {bundle.storeName}</p>
              {partlyOut && <p className="mt-1 text-[9px] font-medium text-[#b4443a]">Một số sản phẩm hết hàng</p>}
              <div className="mt-auto pt-3"><PillButton compact onClick={() => onStore(bundle.storeSlug)}>Xem gói tại cửa hàng</PillButton></div>
            </article>;
          })}
        </div>
      </div>
    </section>
  );
}

function StoreCard({ store, tint, onOpen }: { store: HomeStore; tint: string; onOpen: () => void }) {
  const [bannerFailed, setBannerFailed] = useState(false);
  const banner = store.bannerUrl && !bannerFailed ? store.bannerUrl : null;
  return <button className="home-store-card group min-w-0 overflow-hidden rounded-xl border border-[#e5ebe7] bg-white p-1 text-left transition-all hover:-translate-y-0.5 hover:border-[#088178] hover:shadow-md" aria-label={`Đến ${store.name}`} onClick={onOpen}>
    <div className="relative grid h-36 place-items-center overflow-hidden rounded-lg max-[580px]:h-28" style={{ background: tint }}>
      {banner && <img src={banner} alt={`Ảnh bìa ${store.name}`} className="absolute inset-0 size-full object-cover" onError={() => setBannerFailed(true)} />}
      {banner
        ? <span className="absolute bottom-2 left-2 rounded-xl bg-white p-1 shadow-sm"><CustomerStoreLogo store={store} className="size-10 rounded-lg" /></span>
        : <CustomerStoreLogo store={store} className="size-24 rounded-2xl transition-transform group-hover:scale-105 max-[580px]:size-20" />}
    </div>
    <div className="p-3 max-[580px]:p-2">
      <strong className="block truncate text-sm max-[580px]:text-xs">{store.name}</strong>
      <span className="mt-3 flex items-center justify-between border-t border-[#edf1ed] pt-2 text-[9px] text-[#088178]">
        {store.productCount === null ? <span /> : <span>{store.productCount} sản phẩm</span>}
        <span className="inline-flex items-center gap-1">Vào cửa hàng <ArrowUpRight size={13} /></span>
      </span>
    </div>
  </button>;
}

export function CustomerHomeView({ user, onLogin, onRegister, onHome, onStore, onProfile, onLogout, onProduct }: Props) {
  const home = useCustomerHome();
  const { model, filter, saved, visible, filtered, promos } = home;
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const previous = document.title;
    document.title = APP_BRAND.customerTitle;
    return () => { document.title = previous; };
  }, []);
  const stores = model?.stores ?? [];
  const slides = buildBannerSlides(stores);
  const featured = home.products.find(product => product.imageUrl);
  const openProduct = (product: HomeProduct) => onProduct(product.storeSlug, product.productId);
  const showProducts = () => { home.reset(); scrollTo('fm-products'); };
  const navLinks = [
    ...(model?.bundles.length ? [['Gói sản phẩm', 'fm-bundles']] : []),
    ['Sản phẩm', 'fm-products'], ['Cửa hàng', 'fm-stores'],
  ];

  return (
    <div className="customer-home isolate bg-white text-sm leading-normal text-[#212529] [&_button]:cursor-pointer [&_button]:transition-colors [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-[#088178] motion-reduce:[&_*]:transition-none" lang="vi">
      <a className="absolute -top-25 left-[15px] z-100 bg-white p-3 focus:top-[10px]" href="#fm-main">Chuyển đến nội dung chính</a>
      <CustomerHeader query={filter.query} setQuery={home.setQuery} onSearch={() => scrollTo('fm-products')} savedCount={saved.length} savedOnly={filter.savedOnly}
        toggleSavedOnly={() => { home.toggleSavedOnly(); scrollTo('fm-products'); }} cartCount={0} onLogin={onLogin} onHome={onHome}
        showSignInLabel user={user} onProfile={onProfile} onLogout={onLogout} menuOpen={menuOpen} onToggleMenu={() => setMenuOpen(!menuOpen)} />

      <div className="border-t border-[#e9eded]">
        <div className={`fm-navbar ${containerClass} relative flex min-h-14 items-center justify-between gap-5 text-[11px] max-[1100px]:gap-[15px] max-[580px]:min-h-[45px]`}>
          <nav className={`fm-navigation items-center gap-[29px] max-[1100px]:gap-5 max-[800px]:gap-[13px] max-[580px]:absolute max-[580px]:top-11 max-[580px]:-right-4 max-[580px]:-left-4 max-[580px]:z-20 max-[580px]:flex-col max-[580px]:items-start max-[580px]:gap-0 max-[580px]:border-t max-[580px]:border-[#e9eded] max-[580px]:bg-white max-[580px]:px-5 max-[580px]:py-[14px] max-[580px]:shadow-[0_20px_25px_#03272410] ${menuOpen ? 'flex' : 'flex max-[580px]:hidden'}`} aria-label="Điều hướng chính">
            {navLinks.map(([label, id]) => <a className={`inline-flex items-center gap-1.5 hover:text-[#088178] max-[580px]:text-xs ${id === 'fm-bundles' ? 'rounded-full bg-[#fff0eb] px-3 py-1.5 font-semibold text-[#bd4634] hover:bg-[#ffe3db] max-[580px]:my-1 max-[580px]:py-2' : 'max-[580px]:py-[11px]'}`} key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{id === 'fm-bundles' && <Package size={14} />}{label}</a>)}
          </nav>
          <a className="flex items-center gap-[7px] text-[10px] max-[800px]:gap-0 max-[800px]:text-[0px] max-[580px]:gap-[5px] max-[580px]:text-[8px]" href="#fm-help"><Headphones className="size-[22px] rounded-full bg-[#088178] p-1 text-white max-[580px]:size-[18px] max-[580px]:p-[3px]" />Trợ giúp</a>
        </div>
      </div>

      <main id="fm-main">
        <CustomerBannerCarousel slides={slides} featuredProduct={featured} onBrowseProducts={showProducts} onBrowseStores={() => scrollTo('fm-stores')}
          onShopStore={onStore} onOpenProduct={openProduct} />

        {home.loading && <p className={`${containerClass} mt-4 text-xs text-[#436858]`} role="status">Đang tải cửa hàng và sản phẩm…</p>}
        {home.error && <div className={`${containerClass} mt-4`}><StoreMessage text={home.error.message} retry={home.reload} /></div>}
        {model && model.failedStores > 0 && <div className={`${containerClass} mt-4`}><StoreMessage
          text={`Chưa tải đủ sản phẩm của ${model.failedStores}/${model.sampledStores} cửa hàng. Danh sách bên dưới có thể chưa đầy đủ.`} retry={home.reload} /></div>}

        {model && model.bundles.length > 0 && <BundleRail bundles={model.bundles} onStore={onStore} />}

        {model && model.featured.length > 0 && <section id="fm-featured" className={`${containerClass} py-8`} aria-labelledby="fm-featured-title">
          <SectionHeading id="fm-featured-title" title="Sản phẩm nổi bật" />
          <div className="grid grid-cols-4 gap-4 max-[800px]:grid-cols-3 max-[580px]:grid-cols-2 max-[580px]:gap-2">
            {model.featured.map(product => {
              const key = homeSavedKey(product);
              return <ProductCard key={key} product={product} storeLabel={product.storeName} quantity={0}
                productHref={customerPath(product.storeSlug, String(product.productId))}
                saved={saved.includes(key)} onSave={() => home.toggleSaved(key)} onOpen={() => openProduct(product)} />;
            })}
          </div>
        </section>}

        {!home.error && <section className={`fm-stores-section ${containerClass} scroll-mt-5 py-11 max-[580px]:py-7`} id="fm-stores" aria-labelledby="fm-stores-title">
          <div className="mb-5 flex items-end justify-between gap-4"><div><span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#088178]">CỬA HÀNG</span><h2 id="fm-stores-title" className="mt-1 text-[29px] font-semibold tracking-tight max-[580px]:text-[23px]">Khám phá cửa hàng</h2><p className="mt-1 text-xs text-[#819188]">Mỗi cửa hàng có sản phẩm và giỏ hàng riêng.</p></div>{model && <span className="text-xs text-[#84958c]">{stores.length} cửa hàng</span>}</div>
          {home.loading && <p role="status" className="text-xs text-[#6f8880]">Đang tải cửa hàng…</p>}
          {model && stores.length === 0 && <p role="status" className="rounded-xl bg-[#f5faf6] p-5 text-xs text-[#436858]">Chưa có cửa hàng đang hoạt động.</p>}
          <div className="home-store-grid grid grid-cols-4 gap-4 max-[800px]:grid-cols-2 max-[580px]:gap-2">
            {stores.map((store, index) => <StoreCard key={store.storeSlug} store={store} tint={storeTints[index % storeTints.length]} onOpen={() => onStore(store.storeSlug)} />)}
          </div>
        </section>}

        {!home.error && <section id="fm-products" className="fm-products-section scroll-mt-0 bg-[#f5f5f5] pt-[42px] pb-[46px] max-[580px]:py-[29px]" aria-labelledby="fm-products-title">
          <div className={containerClass}>
            <SectionHeading id="fm-products-title" title={filter.savedOnly ? 'Sản phẩm đã lưu' : 'Sản phẩm từ các cửa hàng'}><button onClick={() => scrollTo('fm-stores')} className="inline-flex items-center gap-1 text-[10px] font-medium text-[#088178]">Xem cửa hàng <ArrowUpRight size={14} /></button></SectionHeading>
            {model && <p className="fm-catalog-store -mt-[10px] mb-[17px] flex flex-wrap items-center gap-[6px] text-[9px] text-[#8c9b91] max-[580px]:text-[8px]"><Store size={13} />Sản phẩm từ <strong className="font-[550] text-[#5d806b]">{model.sampledStores} cửa hàng</strong><span>•</span>Mỗi cửa hàng có sản phẩm và giỏ hàng riêng{model.truncated && ' · Mỗi cửa hàng hiển thị tối đa 12 sản phẩm đầu, hãy vào cửa hàng để xem tất cả'}</p>}
            {stores.length > 1 && <div className="fm-product-toolbar flex items-center justify-between gap-[15px] max-[800px]:items-start max-[580px]:flex-wrap max-[580px]:gap-[10px]">
              <select className="max-w-[180px] rounded-full border border-[#e2e7e5] bg-white px-3 py-2 text-[10px] text-[#677370] max-[1100px]:max-w-[153px] max-[1100px]:text-[9px] max-[580px]:max-w-none max-[580px]:px-[10px] max-[580px]:py-[6px]" aria-label="Lọc theo cửa hàng" value={filter.storeSlug ?? ''} onChange={event => home.setStore(event.target.value || null)}><option value="">Tất cả cửa hàng</option>{stores.map(item => <option key={item.storeSlug} value={item.storeSlug}>{item.name}</option>)}</select>
            </div>}
            {model && <div className="fm-filter-status flex min-h-[43px] items-center gap-3 text-[9px] text-[#929b98] max-[580px]:min-h-9 max-[580px]:flex-wrap max-[580px]:gap-[9px] max-[580px]:text-[8px]">
              <p className="m-0 max-[580px]:max-w-[58%]" role="status" aria-live="polite">Hiển thị {visible.length}/{filtered.length} sản phẩm{filter.query.trim() && ` cho “${filter.query.trim()}”`}</p>
              {home.hasFilters && <button className="flex items-center gap-1 border-0 bg-transparent py-1 text-[#088178]" onClick={home.reset}>Xóa bộ lọc <X size={12} /></button>}
            </div>}
            {home.loading && <p role="status" className="py-8 text-xs text-[#6f8880]">Đang tải sản phẩm…</p>}
            <div className="fm-products-grid grid grid-cols-3 gap-x-[18px] gap-y-[22px] max-[800px]:gap-x-3 max-[800px]:gap-y-[15px] max-[580px]:grid-cols-2 max-[580px]:gap-x-[10px]">
              {visible.map(product => <ProductCard key={homeSavedKey(product)} product={product} storeLabel={product.storeName}
                saved={saved.includes(homeSavedKey(product))} quantity={0} onSave={() => home.toggleSaved(homeSavedKey(product))}
                onOpen={() => openProduct(product)} />)}
            </div>
            {home.hasMore && <div className="mt-7 flex justify-center"><button className="rounded-full border border-[#088178] bg-white px-7 py-3 text-xs font-semibold text-[#08755d] hover:bg-[#ecf7f1]" onClick={home.showMore}>Xem thêm sản phẩm ({filtered.length - visible.length} còn lại)</button></div>}
            {model && filtered.length === 0 && <div className="fm-empty flex flex-col items-center gap-3 px-[15px] py-[50px] text-center text-[#6f8880]"><Search size={30} />
              <h3 className="m-0 text-xl">{home.products.length === 0 ? 'Chưa có sản phẩm để hiển thị' : filter.savedOnly ? 'Chưa có sản phẩm đã lưu' : 'Không tìm thấy sản phẩm'}</h3>
              {home.products.length > 0 && <><p className="mb-[6px] text-xs">Thử từ khóa khác hoặc đổi bộ lọc.</p><PillButton onClick={home.reset}>Xem tất cả sản phẩm</PillButton></>}
            </div>}
          </div>
        </section>}

        <section id="fm-collections" className={`fm-promos ${containerClass} grid scroll-mt-0 gap-4 py-11 max-[800px]:gap-3 max-[580px]:py-[29px] ${promos.length === 2 ? 'grid-cols-[1fr_1.5fr] grid-rows-[175px_175px] max-[1100px]:grid-rows-[160px_160px] max-[800px]:grid-rows-[145px_145px] max-[580px]:grid-cols-2 max-[580px]:grid-rows-[160px_275px] max-[580px]:gap-[10px]' : 'grid-cols-1'}`} aria-label="Bộ sưu tập mua sắm">
          {promos.length === 2 && <>
            <article className="fm-promo fm-promo-snack relative col-start-1 row-start-1 overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_90%_100%,#96dbc7,transparent_60%),linear-gradient(115deg,#4d43df,#6d68e8)] p-[26px] text-white max-[1100px]:p-6 max-[800px]:p-[22px] max-[580px]:rounded-[10px] max-[580px]:px-[14px] max-[580px]:py-[18px]">
              <div className="relative z-2"><span className="text-[7px] tracking-[1.1px] opacity-80 max-[580px]:text-[5px]">SẢN PHẨM TỪ CỬA HÀNG</span><h2 className="mt-[9px] mb-[14px] text-[27px] leading-[1.15] font-[650] tracking-[-0.8px] max-[1100px]:text-[25px] max-[800px]:text-[22px] max-[580px]:text-xl">Chọn món<br />tại cửa hàng.</h2><PillButton compact onClick={() => onStore(promos[0].storeSlug)}>Xem cửa hàng</PillButton></div>
              <img className="absolute -right-px bottom-[-6px] h-[165px] w-[175px] -rotate-8 object-contain max-[1100px]:right-[-8px] max-[1100px]:h-[140px] max-[1100px]:w-[150px] max-[800px]:right-[-9px] max-[800px]:size-[110px] max-[580px]:bottom-[-7px] max-[580px]:h-[98px] max-[580px]:w-[105px]" src={promos[0].imageUrl!} alt={promos[0].name} loading="lazy" />
            </article>
            <article className="fm-promo fm-promo-pantry relative col-start-1 row-start-2 overflow-hidden rounded-xl bg-[linear-gradient(115deg,#dbc19b,#f5e7d4)] p-[26px] text-white max-[1100px]:p-6 max-[800px]:p-[22px] max-[580px]:col-start-2 max-[580px]:row-start-1 max-[580px]:rounded-[10px] max-[580px]:px-[14px] max-[580px]:py-[18px]">
              <div className="relative z-2"><span className="text-[7px] tracking-[1.1px] opacity-80 max-[580px]:text-[5px]">THÊM MÓN CHO BỮA ĂN</span><h2 className="mt-[9px] mb-[14px] text-[27px] leading-[1.15] font-[650] tracking-[-0.8px] max-[1100px]:text-[25px] max-[800px]:text-[22px] max-[580px]:text-[19px]">Thêm món ngon.<br />Thêm niềm vui.</h2><PillButton compact onClick={() => onStore(promos[1].storeSlug)}>Xem cửa hàng</PillButton></div>
              <img className="absolute right-[5px] bottom-[-8px] h-[154px] w-[158px] rotate-10 object-contain max-[1100px]:right-[-4px] max-[1100px]:size-[135px] max-[800px]:right-[-9px] max-[800px]:bottom-[-10px] max-[800px]:size-[110px] max-[580px]:right-[-8px] max-[580px]:bottom-[-7px] max-[580px]:size-[95px]" src={promos[1].imageUrl!} alt={promos[1].name} loading="lazy" />
            </article>
          </>}
          <article className={`fm-promo fm-promo-produce relative overflow-hidden rounded-xl bg-[radial-gradient(circle_at_84%_82%,#ecfcff_0%,transparent_57%),linear-gradient(115deg,#229bbc,#84d9eb)] p-9 text-white max-[1100px]:p-[31px] max-[800px]:p-[22px] ${promos.length === 2 ? 'col-start-2 row-span-2 row-start-1 max-[580px]:col-span-2 max-[580px]:col-start-1 max-[580px]:row-span-1 max-[580px]:row-start-2 max-[580px]:p-[27px]' : 'min-h-[260px]'}`}>
            <div className="relative z-2 max-w-[58%] max-[800px]:max-w-[84%] max-[580px]:max-w-[82%]"><span className="text-[7px] tracking-[1.1px] opacity-80 max-[580px]:text-[5px]">KHÁM PHÁ CỬA HÀNG</span><h2 className="my-3 text-[38px] leading-[1.16] font-[650] tracking-[-1.2px] max-[1100px]:text-[34px] max-[800px]:text-[30px] max-[580px]:text-[31px]">Món ngon.<br />Tươi mới.<br />Mỗi ngày.</h2><p className="mb-[19px] text-[10px] leading-[1.8] text-[#e1f6fc] max-[800px]:text-[8px] max-[580px]:max-w-[170px]">Khám phá sản phẩm từ nhiều cửa hàng,<br className="max-[580px]:hidden" />rồi chọn nơi bạn muốn mua.</p><PillButton onClick={() => scrollTo('fm-stores')}>Chọn cửa hàng</PillButton></div>
            <img className="fm-promo-basket absolute right-[-6px] bottom-0 h-[85%] w-[65%] object-contain object-right-bottom drop-shadow-[0_8px_10px_#163e4020] max-[1100px]:right-[-13px] max-[1100px]:h-[75%] max-[800px]:right-[-10px] max-[800px]:h-[67%] max-[800px]:w-[68%] max-[580px]:right-[-12px] max-[580px]:h-[64%] max-[580px]:w-[69%]" src={basketImage} alt="Wicker basket filled with fresh vegetables, fruit, bread and milk" loading="lazy" />
          </article>
        </section>

        <section id="fm-help" className={`${containerClass} scroll-mt-5 py-8`} aria-labelledby="fm-help-title">
          <h2 id="fm-help-title" className="mb-4 text-xl font-semibold">Cách mua sắm</h2>
          <div className="grid grid-cols-3 gap-3 max-[800px]:grid-cols-1">
            <div className="rounded-xl border border-[#e2ece5] bg-[#f7faf8] p-4"><strong className="text-sm">1. Chọn cửa hàng</strong><p className="mt-2 text-xs leading-relaxed text-[#667a6d]">Xem sản phẩm, giá và tình trạng còn hàng ngay tại cửa hàng bán sản phẩm đó.</p></div>
            <div className="rounded-xl border border-[#e2ece5] bg-[#f7faf8] p-4"><strong className="text-sm">2. Mỗi cửa hàng một giỏ</strong><p className="mt-2 text-xs leading-relaxed text-[#667a6d]">Giỏ hàng thuộc về từng cửa hàng. Hãy vào cửa hàng để thêm sản phẩm hoặc cả gói sản phẩm vào giỏ.</p></div>
            <div className="rounded-xl border border-[#e2ece5] bg-[#f7faf8] p-4"><strong className="text-sm">3. Đăng nhập để thêm vào giỏ</strong><p className="mt-2 text-xs leading-relaxed text-[#667a6d]">Bạn có thể xem cửa hàng mà không cần đăng nhập. Cần tài khoản khách hàng để dùng giỏ hàng.</p></div>
          </div>
        </section>

        {!user && <section className={`fm-join ${containerClass} relative mb-[45px] flex min-h-[290px] items-center overflow-hidden rounded-[18px] bg-[linear-gradient(128deg,#c5edfa,#edf8f8_68%,#f5f5f5)] px-[43px] py-10 max-[1100px]:p-[35px] max-[800px]:min-h-[275px] max-[800px]:p-[29px] max-[580px]:mb-[29px] max-[580px]:min-h-[405px] max-[580px]:items-start max-[580px]:rounded-[14px] max-[580px]:p-[27px]`} id="fm-join">
          <div className="relative z-2"><span className="text-[7px] tracking-[1.2px] text-[#68959c] max-[580px]:text-[5px]">MUA SẮM DỄ DÀNG HƠN</span><h2 className="my-3 text-[34px] leading-[1.2] font-[650] tracking-[-1px] max-[1100px]:text-[30px] max-[800px]:text-[27px]">Các cửa hàng yêu thích.<br />Món hàng bạn cần.</h2><p className="mb-5 text-[10px] leading-[1.9] text-[#7d9296] max-[800px]:text-[9px] max-[580px]:mb-4 max-[580px]:text-[8px]">Khám phá cửa hàng và sản phẩm quen thuộc.<br />Chọn cửa hàng phù hợp với bạn.</p>{onRegister && <PillButton onClick={onRegister}>Tạo tài khoản</PillButton>}</div>
          <img className="fm-join-basket absolute right-4 bottom-0 h-[96%] w-[47%] object-contain object-right-bottom drop-shadow-[0_6px_8px_#32625b12] max-[1100px]:right-[3px] max-[800px]:right-[-4px] max-[800px]:h-[85%] max-[800px]:w-[44%] max-[580px]:right-[2px] max-[580px]:h-[185px] max-[580px]:w-[95%]" src={basketImage} alt="A carefully arranged basket of fresh groceries and fruit" loading="lazy" />
        </section>}
      </main>

      <footer className={`fm-footer ${containerClass} overflow-hidden rounded-t-[18px] bg-[#032724] px-7 text-[#d5e6df] max-[800px]:px-[23px] max-[580px]:rounded-t-[14px] max-[580px]:px-5`} id="fm-footer">
        <div className="fm-footer-wordmark pt-2 text-center text-[clamp(75px,13.1vw,180px)] leading-[1.05] font-[650] tracking-[-0.065em] text-[#477d7280] min-[1500px]:text-[180px] max-[580px]:pt-[14px] max-[580px]:text-[12.5vw]" aria-hidden="true">{APP_BRAND.name}</div>
        <div className="flex items-center justify-between gap-5 border-y border-white/10 py-5 text-[11px] max-[580px]:flex-col max-[580px]:items-start max-[580px]:gap-[11px] max-[580px]:py-[19px] max-[580px]:text-[9px]"><p className="text-[#a7c4b8]">Nhiều cửa hàng trong một nơi.</p><button className="flex items-center gap-[10px] border-0 bg-transparent text-[10px] text-[#d3e5dc] max-[580px]:text-[9px]" onClick={() => scrollTo('fm-stores')}>Khám phá cửa hàng <ArrowUpRight size={18} /></button></div>
        <div className="grid grid-cols-[1.1fr_.7fr_.7fr_1.5fr] gap-[25px] py-7 max-[800px]:gap-[18px] max-[580px]:grid-cols-2 max-[580px]:gap-x-[17px] max-[580px]:gap-y-6 max-[580px]:py-[25px]">
          <div><a className="fm-footer-logo inline-flex items-center gap-2 text-[19px] font-bold tracking-[-0.7px] text-[#e3f0e7]" href="/customer-home" onClick={event => { event.preventDefault(); onHome(); }}><AppLogo className="size-[29px] shrink-0" variant="system-contrast" />{APP_BRAND.name}</a><p className="mt-[9px] text-[9px] leading-[1.9] text-[#83a79b] max-[800px]:text-[8px]">Nhiều cửa hàng, nhiều lựa chọn.<br />Mua sắm dễ dàng hơn.</p></div>
          <nav className="flex flex-col items-start gap-[9px] text-[9px] [&_a:hover]:text-white [&_a:hover]:underline" aria-label="Khám phá RetailSpace"><span className="mb-[5px] text-[7px] tracking-[1px] text-[#6e9a8c]">KHÁM PHÁ</span>{[['Cửa hàng', 'fm-stores'], ['Sản phẩm', 'fm-products'], ['Bộ sưu tập', 'fm-collections']].map(([label, id]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
          <nav className="flex flex-col items-start gap-[9px] text-[9px] max-[580px]:col-start-1 max-[580px]:row-start-2 [&_button:hover]:text-white [&_button:hover]:underline" aria-label="Tài khoản RetailSpace"><span className="mb-[5px] text-[7px] tracking-[1px] text-[#6e9a8c]">TÀI KHOẢN</span>{!user && <button onClick={onLogin}>Đăng nhập</button>}{!user && onRegister && <button onClick={onRegister}>Tạo tài khoản</button>}<button onClick={() => scrollTo('fm-stores')}>Đến cửa hàng</button></nav>
          <div className="max-[580px]:col-start-2 max-[580px]:row-start-2"><span className="text-[7px] tracking-[1px] text-[#6e9a8c]">VỀ RETAILSPACE</span><p className="mt-[9px] text-[9px] leading-[1.9] text-[#83a79b] max-[800px]:text-[8px]">Nền tảng nhiều cửa hàng.<br />Cửa hàng, sản phẩm và giá lấy từ dữ liệu của từng cửa hàng.</p><a className="mt-3 flex items-center gap-[5px] text-[8px] text-[#b1cec1] max-[580px]:flex-wrap max-[580px]:text-[6px]" href="https://dribbble.com/shots/27839977-Grocery-E-Commerce-Website-UI-UX-Design" target="_blank" rel="noreferrer">Design reference: Farmora by Ali Mortuja <ArrowUpRight size={12} /></a></div>
        </div>
        <div className="flex justify-between gap-[15px] border-t border-white/10 py-[18px] text-[8px] text-[#5e8b7d] max-[580px]:text-[6px]"><span>© {new Date().getFullYear()} {APP_BRAND.name} · Trang mua sắm</span><span>Khám phá mỗi ngày.</span></div>
      </footer>
    </div>
  );
}
