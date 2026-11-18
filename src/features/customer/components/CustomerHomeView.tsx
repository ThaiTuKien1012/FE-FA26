import React from 'react';
import {
  ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight,
  Flame, Grid2X2, Headphones, MapPin, Search, Sparkles, TrendingUp,
  Store, X,
} from 'lucide-react';
import { AppLogo } from '../../../components/common/AppLogo';
import { APP_BRAND } from '../../../app/branding';
import { CUSTOMER_STORES } from '../data/customerStores';
import { CustomerBannerCarousel } from './CustomerBannerCarousel';
import { CustomerStoreLogo } from './CustomerStoreLogo';
import { CustomerShoppingDialog } from './CustomerShoppingDialog';
import { CustomerHeader } from './CustomerHeader';
import type { AuthUser } from '../../../services/authService';
import type { CustomerProduct } from '../data/customerCatalog';
import { categoryLabel } from '../data/customerLocale';
import type { DiscoveryFilter } from '../hooks/useCustomerHome';
import { useCustomerHome } from '../hooks/useCustomerHome';
import { ProductCard, PillButton, SectionHeading, containerClass } from './CustomerCommerce';

type Props = { onLogin: () => void; onRegister: () => void; onExplore: () => void; onProduct: (id: string) => void; user?: AuthUser | null; onProfile?: () => void; onLogout?: () => void };
const basketImage = '/images/customer-home/fresh/grocery-basket.png';
const imagePath = (name: string) => name.startsWith('/') ? name : `/images/customer-home/fresh/${name}`;
const storeNameFor = (storeId: string) => CUSTOMER_STORES.find(store => store.id === storeId)?.name || 'cửa hàng';

function ProductRail({ id, eyebrow, title, description, variant, products, saved, storeCarts, onSave, onOpen, onAdd, onViewAll }: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  variant: 'hot' | 'trending' | 'new';
  products: CustomerProduct[];
  saved: string[];
  storeCarts: Record<string, Record<string, number>>;
  onSave: (id: string) => void;
  onOpen: (product: CustomerProduct) => void;
  onAdd: (product: CustomerProduct) => void;
  onViewAll: () => void;
}) {
  const theme = {
    hot: { shell: 'bg-[linear-gradient(125deg,#a93427,#dc5943_58%,#ed8465)] text-white', icon: Flame, iconBox: 'bg-white/15 text-white', eyebrow: 'text-white/80', description: 'text-white/85', action: 'bg-white text-[#a93427] hover:bg-[#fff4ee]', count: 'bg-white/15 text-white' },
    trending: { shell: 'bg-[linear-gradient(115deg,#e7f6f0,#f1faf5_65%,#e8f4ec)] text-[#163e33]', icon: TrendingUp, iconBox: 'bg-[#d4ebe0] text-[#08765b]', eyebrow: 'text-[#187b61]', description: 'text-[#587468]', action: 'bg-[#087960] text-white hover:bg-[#06694f]', count: 'bg-white/80 text-[#26785e]' },
    new: { shell: 'bg-[linear-gradient(115deg,#edf3fb,#f6f9fd_65%,#eaf2f7)] text-[#243d55]', icon: Sparkles, iconBox: 'bg-[#dceafb] text-[#356d9b]', eyebrow: 'text-[#356d9b]', description: 'text-[#647c91]', action: 'bg-[#2d628d] text-white hover:bg-[#245476]', count: 'bg-white/80 text-[#477391]' },
  }[variant];
  const Icon = theme.icon;
  return (
    <section id={id} className={`${containerClass} scroll-mt-5 py-4 max-[580px]:py-3`} aria-labelledby={`${id}-title`}>
      <div className={`overflow-hidden rounded-[22px] px-7 py-7 max-[800px]:px-5 max-[580px]:rounded-2xl max-[580px]:px-4 max-[580px]:py-5 ${theme.shell}`}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 max-[580px]:mb-4 max-[580px]:flex-col max-[580px]:items-stretch">
          <div className="flex min-w-0 items-start gap-4 max-[580px]:gap-3">
            <span className={`grid size-11 shrink-0 place-items-center rounded-2xl max-[580px]:size-10 ${theme.iconBox}`}><Icon size={22} strokeWidth={2.3} /></span>
            <div><span className={`block text-[10px] font-semibold uppercase tracking-[0.14em] max-[580px]:text-[9px] ${theme.eyebrow}`}>{eyebrow}</span><h2 id={`${id}-title`} className="mt-1 text-[30px] font-bold leading-tight tracking-tight max-[580px]:text-[24px]">{title}</h2><p className={`mt-1.5 text-xs max-[580px]:text-[10px] ${theme.description}`}>{description}</p></div>
          </div>
          <button className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold shadow-sm max-[580px]:self-start ${theme.action}`} onClick={onViewAll}>{variant === 'hot' ? 'Xem tất cả ưu đãi' : 'Xem tất cả sản phẩm'} <ArrowUpRight size={15} /></button>
        </div>
        <div className="grid grid-cols-4 gap-[15px] max-[800px]:grid-cols-2 max-[800px]:gap-3">
          {products.slice(0, 4).map((product, index) => <div key={product.id} className="min-w-0">{variant !== 'hot' && <div className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold ${theme.count}`}>{variant === 'trending' ? `#${index + 1} nổi bật` : 'Vừa thêm'}</div>}<ProductCard product={product} storeLabel={storeNameFor(product.storeId)} saved={saved.includes(product.id)} quantity={storeCarts[product.storeId]?.[product.id] || 0} onSave={() => onSave(product.id)} onOpen={() => onOpen(product)} onAdd={() => onAdd(product)} /></div>)}
        </div>
      </div>
    </section>
  );
}

export function CustomerHomeView({ onLogin, onRegister, onExplore, onProduct, user, onProfile, onLogout }: Props) {
  const home = useCustomerHome(onExplore);
  const {
    selectedStore, storeProducts, categories, brands, featuredProduct, secondaryProduct,
    hotSaleProducts, trendingProducts, newProducts,
    query, setQuery, category, setCategory, brand, setBrand, discoveryFilter, showCollection, saved, savedOnly,
    cart, storeCarts, cartCount, cartProducts, cartTotal, filteredProducts, hasFilters,
    notice, setNotice, menuOpen, setMenuOpen, categoryMenuOpen, setCategoryMenuOpen,
    selectedProduct, dialogMode, dialogRef, brandRowRef,
    scrollTo, resetFilters, chooseStore, chooseBrand, chooseCategory, openStorefront,
    toggleSaved, toggleSavedOnly, addToCart, updateQuantity,
    openCart, closeDialog, scrollBrands,
  } = home;
  const openProduct = (product: CustomerProduct) => onProduct(product.id);
  const [visibleCount, setVisibleCount] = React.useState(12);
  React.useEffect(() => setVisibleCount(12), [query, category, brand, discoveryFilter, savedOnly]);
  const availableCarts = CUSTOMER_STORES.map(store => ({ id: store.id, name: store.name, count: Object.values(storeCarts[store.id] || {}).reduce((sum, quantity) => sum + quantity, 0) }));
  const collectionTabs: { label: string; filter: DiscoveryFilter }[] = [
    { label: 'Tất cả sản phẩm', filter: 'all' }, { label: 'Ưu đãi', filter: 'hot' },
    { label: 'Nổi bật', filter: 'trending' }, { label: 'Hàng mới', filter: 'new' },
  ];

  return (
    <div className="customer-home isolate bg-white text-sm leading-normal text-[#212529] [&_button]:cursor-pointer [&_button]:transition-colors [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-[#088178] motion-reduce:[&_*]:transition-none" lang="vi">
      <a className="absolute -top-25 left-[15px] z-100 bg-white p-3 focus:top-[10px]" href="#fm-main">Chuyển đến nội dung chính</a>
      <CustomerHeader query={query} setQuery={setQuery} onSearch={() => scrollTo('fm-products')} savedCount={saved.length} savedOnly={savedOnly} toggleSavedOnly={toggleSavedOnly} cartCount={availableCarts.reduce((sum, store) => sum + store.count, 0)} openCart={openCart} onLogin={onLogin} user={user} onProfile={onProfile} onLogout={onLogout} menuOpen={menuOpen} onToggleMenu={() => setMenuOpen(!menuOpen)} />

      <div className="border-t border-[#e9eded]">
        <div className={`fm-navbar ${containerClass} relative flex min-h-14 items-center justify-between gap-5 text-[11px] max-[1100px]:gap-[15px] max-[580px]:min-h-[45px]`}>
          <div className="relative">
            <button className="flex items-center gap-[9px] border-0 bg-transparent py-3 text-[11px] max-[580px]:py-[10px] max-[580px]:text-[10px]" onClick={() => setCategoryMenuOpen(!categoryMenuOpen)} aria-expanded={categoryMenuOpen}><Grid2X2 size={16} />Xem danh mục<ChevronDown size={13} className="ml-[7px]" /></button>
            {categoryMenuOpen && <div className="absolute top-11 left-0 z-15 w-[235px] rounded-xl border border-[#e9eded] bg-white p-[7px] shadow-[0_15px_40px_#03272418] max-[580px]:top-[39px] max-[580px]:w-[225px]">
              {categories.map(item => <button className="flex w-full items-center justify-between rounded-md border-0 bg-transparent px-[10px] py-3 text-left text-xs text-[#52615e] hover:bg-[#e9f5f1] hover:text-[#088178]" key={item} onClick={() => chooseCategory(item)}>{categoryLabel(item)}<ChevronRight size={13} /></button>)}
            </div>}
          </div>
          <nav className={`fm-navigation items-center gap-[29px] max-[1100px]:gap-5 max-[800px]:gap-[13px] max-[580px]:absolute max-[580px]:top-11 max-[580px]:-right-4 max-[580px]:-left-4 max-[580px]:z-20 max-[580px]:flex-col max-[580px]:items-start max-[580px]:gap-0 max-[580px]:border-t max-[580px]:border-[#e9eded] max-[580px]:bg-white max-[580px]:px-5 max-[580px]:py-[14px] max-[580px]:shadow-[0_20px_25px_#03272410] ${menuOpen ? 'flex' : 'flex max-[580px]:hidden'}`} aria-label="Điều hướng chính">
            {[['Ưu đãi', 'fm-hot-sale'], ['Danh mục', 'fm-categories'], ['Nổi bật', 'fm-trending'], ['Sản phẩm', 'fm-products'], ['Cửa hàng', 'fm-stores']].map(([label, id]) => <a className={`inline-flex items-center gap-1.5 hover:text-[#088178] max-[580px]:text-xs ${id === 'fm-hot-sale' ? 'rounded-full bg-[#fff0eb] px-3 py-1.5 font-semibold text-[#bd4634] hover:bg-[#ffe3db] max-[580px]:my-1 max-[580px]:py-2' : 'max-[580px]:py-[11px]'}`} key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{id === 'fm-hot-sale' && <Flame size={14} fill="currentColor" />}{label}</a>)}
          </nav>
          <a className="flex items-center gap-[7px] text-[10px] max-[800px]:gap-0 max-[800px]:text-[0px] max-[580px]:gap-[5px] max-[580px]:text-[8px]" href="#fm-help"><Headphones className="size-[22px] rounded-full bg-[#088178] p-1 text-white max-[580px]:size-[18px] max-[580px]:p-[3px]" />Trợ giúp</a>
        </div>
      </div>

      <main id="fm-main">
        <CustomerBannerCarousel selectedStore={selectedStore} featuredProduct={featuredProduct} onBrowseProducts={() => { resetFilters(); scrollTo('fm-products'); }} onBrowseStores={() => scrollTo('fm-stores')} onShopStore={storeId => { chooseStore(storeId, false); onExplore(); }} onBannerStoreChange={() => undefined} />
        <div className={`${containerClass} mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#dcebe1] bg-[#f5faf6] px-4 py-3 text-[11px] leading-relaxed text-[#436858]`} role="note"><Check size={16} className="shrink-0 text-[#088178]" /><strong>Bản xem thử:</strong><span>Giá và tồn kho chỉ để minh họa. Chưa hỗ trợ giao hàng, thanh toán hoặc đặt hàng thật.</span></div>

        <ProductRail id="fm-hot-sale" eyebrow="ƯU ĐÃI TỪ CỬA HÀNG" title="Ưu đãi" description="Sản phẩm giảm giá từ nhiều cửa hàng." variant="hot" products={hotSaleProducts} saved={saved} storeCarts={storeCarts} onSave={id => toggleSaved(id)} onOpen={openProduct} onAdd={addToCart} onViewAll={() => showCollection('hot')} />

        <section id="fm-categories" className={`${containerClass} scroll-mt-5 pt-9 max-[580px]:pt-7`} aria-labelledby="fm-categories-title">
          <div className="mb-4 flex items-end justify-between gap-3"><div><span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#088178]">TÌM NHANH</span><h2 id="fm-categories-title" className="mt-1 text-2xl font-semibold tracking-tight max-[580px]:text-xl">Mua theo danh mục</h2></div><button className="inline-flex items-center gap-1 text-[10px] text-[#088178]" onClick={() => scrollTo('fm-products')}>Xem {categories.length - 1} danh mục <ArrowUpRight size={13} /></button></div>
          <div className="grid grid-cols-4 gap-3 max-[800px]:grid-cols-3 max-[580px]:grid-cols-2 max-[580px]:gap-2">
            {categories.filter(item => item !== 'All Products').slice(0, 8).map((item, index) => {
              const preview = storeProducts.find(product => product.category === item);
              return <button key={item} className="group flex min-h-22 items-center gap-3 rounded-xl border border-[#e7eeea] bg-[#f8faf8] p-3 text-left hover:border-[#80b4a1] hover:bg-[#f0f8f3] max-[580px]:gap-2 max-[580px]:p-2" onClick={() => chooseCategory(item)}>
                <span className={`grid size-14 shrink-0 place-items-center rounded-lg max-[580px]:size-12 ${['bg-[#e7f4e9]', 'bg-[#fff1df]', 'bg-[#e8f0fa]', 'bg-[#faeaf1]'][index % 4]}`}><img className="size-11 object-contain transition-transform group-hover:scale-110 max-[580px]:size-9" src={preview?.image} alt="" loading="lazy" /></span>
                <span className="min-w-0"><strong className="block text-xs leading-snug max-[580px]:text-[10px]">{categoryLabel(item)}</strong><small className="mt-1 block text-[9px] text-[#829189]">{storeProducts.filter(product => product.category === item).length} sản phẩm</small></span>
              </button>;
            })}
          </div>
        </section>

        <ProductRail id="fm-trending" eyebrow="ĐƯỢC QUAN TÂM NHIỀU" title="Đang nổi bật" description="Những sản phẩm được quan tâm trong bản xem thử." variant="trending" products={trendingProducts} saved={saved} storeCarts={storeCarts} onSave={id => toggleSaved(id)} onOpen={openProduct} onAdd={addToCart} onViewAll={() => showCollection('trending')} />

        <section id="fm-brands" className={`fm-brands-section ${containerClass} scroll-mt-5 pt-[43px] pb-[45px] max-[580px]:pt-7 max-[580px]:pb-[30px]`} aria-labelledby="fm-brands-title">
          <SectionHeading id="fm-brands-title" title="Khám phá thương hiệu">
            <div className="fm-arrows flex gap-[7px]">
              <button className="grid size-[27px] place-items-center rounded-full border-0 bg-[#f0f3f2] text-[#a3b0ac] hover:bg-[#dbede5]" aria-label="Thương hiệu trước" onClick={() => scrollBrands(-1)}><ChevronLeft size={17} /></button>
              <button className="grid size-[27px] place-items-center rounded-full border-0 bg-[#088178] text-white hover:bg-[#06685f]" aria-label="Thương hiệu tiếp theo" onClick={() => scrollBrands(1)}><ChevronRight size={17} /></button>
            </div>
          </SectionHeading>
          <div className="fm-brands flex gap-4 overflow-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[800px]:gap-[13px] max-[580px]:-mr-4 max-[580px]:gap-[10px] max-[580px]:pr-4" ref={brandRowRef}>
            {brands.slice(0, 8).map(item => (
              <button key={item.name} className="fm-brand-card group w-[150px] shrink-0 border-0 bg-transparent p-0 text-center max-[800px]:w-[135px] max-[580px]:w-[115px]" onClick={() => chooseBrand(item.name)}>
                <div className="relative grid h-[145px] place-items-center overflow-hidden rounded-xl max-[1100px]:h-[125px] max-[580px]:h-[110px] max-[580px]:rounded-[10px]" style={{ background: item.color }}>
                  <img className="h-[125px] w-[88%] object-contain drop-shadow-[0_5px_3px_#152c1c0c] transition-transform duration-250 group-hover:-translate-y-[5px] group-hover:-rotate-4 max-[1100px]:h-[108px] max-[580px]:h-[94px]" src={imagePath(item.image)} alt="" loading="lazy" />
                  <span className="absolute right-[9px] bottom-[9px] grid size-6 place-items-center rounded-full bg-[#ffffffc9] text-[#088178] max-[580px]:size-5"><ArrowUpRight size={14} /></span>
                </div>
                <h3 className="mt-[11px] mb-[3px] text-[13px] font-semibold max-[1100px]:text-xs max-[580px]:mt-[9px] max-[580px]:text-[11px]">{item.name}</h3>
                <p className="m-0 text-[9px] text-[#919999] max-[1100px]:text-[8px] max-[580px]:text-[7px]">{item.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section id="fm-products" className="fm-products-section scroll-mt-0 bg-[#f5f5f5] pt-[42px] pb-[46px] max-[580px]:py-[29px]" aria-labelledby="fm-products-title">
          <div className={containerClass}>
            <SectionHeading id="fm-products-title" title={savedOnly ? 'Sản phẩm đã lưu' : 'Tất cả sản phẩm trên Storefone'}><button onClick={() => scrollTo('fm-stores')} className="inline-flex items-center gap-1 text-[10px] font-medium text-[#088178]">Xem cửa hàng <ArrowUpRight size={14} /></button></SectionHeading>
            <p className="fm-catalog-store -mt-[10px] mb-[17px] flex flex-wrap items-center gap-[6px] text-[9px] text-[#8c9b91] max-[580px]:text-[8px]"><Store size={13} />Sản phẩm từ <strong className="font-[550] text-[#5d806b]">{CUSTOMER_STORES.length} cửa hàng</strong><span>•</span>Chọn cửa hàng để xem sản phẩm và giỏ hàng riêng</p>
            <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Bộ sưu tập sản phẩm">{collectionTabs.map(tab => <button key={tab.filter} aria-pressed={discoveryFilter === tab.filter} onClick={() => showCollection(tab.filter)} className={`rounded-full border px-4 py-2 text-[10px] font-medium transition-colors ${discoveryFilter === tab.filter ? 'border-[#088178] bg-[#088178] text-white' : 'border-[#dfe9e3] bg-white text-[#60746a] hover:border-[#088178]'}`}>{tab.label}</button>)}</div>
            <div className="fm-product-toolbar flex items-center justify-between gap-[15px] max-[800px]:items-start max-[580px]:flex-wrap max-[580px]:gap-[10px]">
              <div className="fm-category-tabs flex flex-wrap items-center gap-[7px] max-[1100px]:gap-[5px] max-[800px]:flex-nowrap max-[800px]:overflow-auto max-[800px]:py-[2px] max-[800px]:[scrollbar-width:none] max-[580px]:-mr-4 max-[580px]:w-[calc(100%_+_16px)] max-[580px]:gap-[6px] max-[580px]:pr-4" aria-label="Lọc theo danh mục">
                {categories.map(item => <button key={item} className={`shrink-0 rounded-full border bg-white px-[15px] py-2 text-[10px] whitespace-nowrap hover:bg-[#e7f1ed] max-[1100px]:px-3 max-[1100px]:py-[7px] max-[1100px]:text-[9px] ${category === item ? 'border-[#088178] text-[#088178]' : 'border-[#e9eceb] text-[#4d5856]'}`} aria-pressed={category === item} onClick={() => setCategory(item)}>{categoryLabel(item)}</button>)}
              </div>
              <select className="max-w-[180px] rounded-full border border-[#e2e7e5] bg-white px-3 py-2 text-[10px] text-[#677370] max-[1100px]:max-w-[153px] max-[1100px]:text-[9px] max-[580px]:max-w-none max-[580px]:px-[10px] max-[580px]:py-[6px]" aria-label="Lọc theo thương hiệu" value={brand} onChange={event => setBrand(event.target.value)}><option value="All Products">Tất cả thương hiệu</option>{brands.map(item => <option key={item.name}>{item.name}</option>)}</select>
            </div>
            <div className="fm-filter-status flex min-h-[43px] items-center gap-3 text-[9px] text-[#929b98] max-[580px]:min-h-9 max-[580px]:flex-wrap max-[580px]:gap-[9px] max-[580px]:text-[8px]">
              <p className="m-0 max-[580px]:max-w-[58%]" role="status" aria-live="polite">Hiển thị {Math.min(visibleCount, filteredProducts.length)}/{filteredProducts.length} sản phẩm{query.trim() && ` cho “${query.trim()}”`}{brand !== 'All Products' && ` · ${brand}`}</p>
              {hasFilters && <button className="flex items-center gap-1 border-0 bg-transparent py-1 text-[#088178]" onClick={resetFilters}>Xóa bộ lọc <X size={12} /></button>}
              <span className="ml-auto text-[#9ea5a2] max-[580px]:text-[7px]">Giá và sản phẩm minh họa</span>
            </div>
            <div className="fm-products-grid grid grid-cols-3 gap-x-[18px] gap-y-[22px] max-[800px]:gap-x-3 max-[800px]:gap-y-[15px] max-[580px]:grid-cols-2 max-[580px]:gap-x-[10px]">
              {filteredProducts.slice(0, visibleCount).map(product => <ProductCard key={product.id} product={product} storeLabel={storeNameFor(product.storeId)} saved={saved.includes(product.id)} quantity={storeCarts[product.storeId]?.[product.id] || 0} onSave={() => toggleSaved(product.id)} onOpen={() => openProduct(product)} onAdd={() => addToCart(product)} />)}
            </div>
            {visibleCount < filteredProducts.length && <div className="mt-7 flex justify-center"><button className="rounded-full border border-[#088178] bg-white px-7 py-3 text-xs font-semibold text-[#08755d] hover:bg-[#ecf7f1]" onClick={() => setVisibleCount(count => count + 12)}>Xem thêm sản phẩm ({filteredProducts.length - visibleCount} còn lại)</button></div>}
            {filteredProducts.length === 0 && <div className="fm-empty flex flex-col items-center gap-3 px-[15px] py-[50px] text-center text-[#6f8880]"><Search size={30} /><h3 className="m-0 text-xl">{savedOnly ? 'Chưa có sản phẩm đã lưu' : 'Không tìm thấy sản phẩm'}</h3><p className="mb-[6px] text-xs">Thử từ khóa khác hoặc đổi bộ lọc.</p><PillButton onClick={resetFilters}>Xem tất cả sản phẩm</PillButton></div>}
          </div>
        </section>

        <ProductRail id="fm-new" eyebrow="SẢN PHẨM VỪA THÊM" title="Mới trên Storefone" description="Sản phẩm mới từ các cửa hàng." variant="new" products={newProducts} saved={saved} storeCarts={storeCarts} onSave={id => toggleSaved(id)} onOpen={openProduct} onAdd={addToCart} onViewAll={() => showCollection('new')} />

        <section className={`fm-stores-section ${containerClass} scroll-mt-5 py-11 max-[580px]:py-7`} id="fm-stores" aria-labelledby="fm-stores-title">
          <div className="mb-5 flex items-end justify-between gap-4"><div><span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#088178]">GẦN BẠN</span><h2 id="fm-stores-title" className="mt-1 text-[29px] font-semibold tracking-tight max-[580px]:text-[23px]">Khám phá cửa hàng</h2><p className="mt-1 text-xs text-[#819188]">Mỗi cửa hàng có sản phẩm và giỏ hàng riêng.</p></div><span className="text-xs text-[#84958c]">{CUSTOMER_STORES.length} cửa hàng</span></div>
          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-[#e3eee7] bg-[#f5faf6] px-4 py-3 text-[11px] text-[#5e7869]"><Store size={16} /><label htmlFor="fm-current-store">Đang xem giỏ của</label><select id="fm-current-store" className="max-w-[200px] rounded-md border border-[#d6e6dc] bg-white px-2 py-1.5 font-medium text-[#176950]" value={selectedStore.id} onChange={event => chooseStore(event.target.value, false)}>{CUSTOMER_STORES.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select><span className="text-[#82958a]">Mỗi cửa hàng có giỏ hàng riêng.</span></div>
          <div className="grid grid-cols-4 gap-4 max-[800px]:grid-cols-2 max-[580px]:gap-2">
            {CUSTOMER_STORES.map(store => <button key={store.id} className="group min-w-0 overflow-hidden rounded-xl border border-[#e5ebe7] bg-white p-1 text-left transition-all hover:-translate-y-0.5 hover:border-[#088178] hover:shadow-md" aria-label={`Đến ${store.name}`} onClick={() => { chooseStore(store.id, false); onExplore(); }}>
              <div className="grid h-36 place-items-center rounded-lg max-[580px]:h-28" style={{ background: store.color }}><CustomerStoreLogo store={store} className="size-24 transition-transform group-hover:scale-105 max-[580px]:size-20" /></div>
              <div className="p-3 max-[580px]:p-2"><span className="flex items-center gap-1 text-[9px] text-[#8a9a90]"><MapPin size={11} />{store.area}</span><strong className="mt-1 block truncate text-sm max-[580px]:text-xs">{store.name}</strong><span className="mt-3 flex items-center justify-between border-t border-[#edf1ed] pt-2 text-[9px] text-[#088178]">{store.productIds.length} sản phẩm <span className="inline-flex items-center gap-1">Vào cửa hàng <ArrowUpRight size={13} /></span></span></div>
            </button>)}
          </div>
        </section>

        <section id="fm-collections" className={`fm-promos ${containerClass} grid scroll-mt-0 grid-cols-[1fr_1.5fr] grid-rows-[175px_175px] gap-4 py-11 max-[1100px]:grid-rows-[160px_160px] max-[800px]:grid-rows-[145px_145px] max-[800px]:gap-3 max-[580px]:grid-cols-2 max-[580px]:grid-rows-[160px_275px] max-[580px]:gap-[10px] max-[580px]:py-[29px]`} aria-label="Bộ sưu tập mua sắm">
          <article className="fm-promo fm-promo-snack relative col-start-1 row-start-1 overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_90%_100%,#96dbc7,transparent_60%),linear-gradient(115deg,#4d43df,#6d68e8)] p-[26px] text-white max-[1100px]:p-6 max-[800px]:p-[22px] max-[580px]:rounded-[10px] max-[580px]:px-[14px] max-[580px]:py-[18px]">
            <div className="relative z-2"><span className="text-[7px] tracking-[1.1px] opacity-80 max-[580px]:text-[5px]">GỢI Ý TỪ STOREFONE</span><h2 className="mt-[9px] mb-[14px] text-[27px] leading-[1.15] font-[650] tracking-[-0.8px] max-[1100px]:text-[25px] max-[800px]:text-[22px] max-[580px]:text-xl">Gợi ý mỗi ngày.<br />Dành cho bạn.</h2><PillButton compact onClick={() => chooseCategory(featuredProduct.category)}>Xem {categoryLabel(featuredProduct.category)}</PillButton></div>
            <img className="absolute -right-px bottom-[-6px] h-[165px] w-[175px] -rotate-8 object-contain max-[1100px]:right-[-8px] max-[1100px]:h-[140px] max-[1100px]:w-[150px] max-[800px]:right-[-9px] max-[800px]:size-[110px] max-[580px]:bottom-[-7px] max-[580px]:h-[98px] max-[580px]:w-[105px]" src={featuredProduct.image} alt={featuredProduct.name} loading="lazy" />
          </article>
          <article className="fm-promo fm-promo-pantry relative col-start-1 row-start-2 overflow-hidden rounded-xl bg-[linear-gradient(115deg,#dbc19b,#f5e7d4)] p-[26px] text-white max-[1100px]:p-6 max-[800px]:p-[22px] max-[580px]:col-start-2 max-[580px]:row-start-1 max-[580px]:rounded-[10px] max-[580px]:px-[14px] max-[580px]:py-[18px]">
            <div className="relative z-2"><span className="text-[7px] tracking-[1.1px] opacity-80 max-[580px]:text-[5px]">THÊM MÓN CHO GIỎ HÀNG</span><h2 className="mt-[9px] mb-[14px] text-[27px] leading-[1.15] font-[650] tracking-[-0.8px] max-[1100px]:text-[25px] max-[800px]:text-[22px] max-[580px]:text-[19px]">Thêm món ngon.<br />Thêm niềm vui.</h2><PillButton compact onClick={() => chooseCategory(secondaryProduct.category)}>Khám phá thêm</PillButton></div>
            <img className="absolute right-[5px] bottom-[-8px] h-[154px] w-[158px] rotate-10 object-contain max-[1100px]:right-[-4px] max-[1100px]:size-[135px] max-[800px]:right-[-9px] max-[800px]:bottom-[-10px] max-[800px]:size-[110px] max-[580px]:right-[-8px] max-[580px]:bottom-[-7px] max-[580px]:size-[95px]" src={secondaryProduct.image} alt={secondaryProduct.name} loading="lazy" />
          </article>
          <article className="fm-promo fm-promo-produce relative col-start-2 row-span-2 row-start-1 overflow-hidden rounded-xl bg-[radial-gradient(circle_at_84%_82%,#ecfcff_0%,transparent_57%),linear-gradient(115deg,#229bbc,#84d9eb)] p-9 text-white max-[1100px]:p-[31px] max-[800px]:p-[22px] max-[580px]:col-span-2 max-[580px]:col-start-1 max-[580px]:row-span-1 max-[580px]:row-start-2 max-[580px]:p-[27px]">
            <div className="relative z-2 max-w-[58%] max-[800px]:max-w-[84%] max-[580px]:max-w-[82%]"><span className="text-[7px] tracking-[1.1px] opacity-80 max-[580px]:text-[5px]">KHÁM PHÁ CỬA HÀNG</span><h2 className="my-3 text-[38px] leading-[1.16] font-[650] tracking-[-1.2px] max-[1100px]:text-[34px] max-[800px]:text-[30px] max-[580px]:text-[31px]">Món ngon.<br />Tươi mới.<br />Mỗi ngày.</h2><p className="mb-[19px] text-[10px] leading-[1.8] text-[#e1f6fc] max-[800px]:text-[8px] max-[580px]:max-w-[170px]">Khám phá sản phẩm từ nhiều cửa hàng,<br className="max-[580px]:hidden" />rồi chọn nơi bạn muốn mua.</p><PillButton onClick={() => scrollTo('fm-stores')}>Chọn cửa hàng</PillButton></div>
            <img className="fm-promo-basket absolute right-[-6px] bottom-0 h-[85%] w-[65%] object-contain object-right-bottom drop-shadow-[0_8px_10px_#163e4020] max-[1100px]:right-[-13px] max-[1100px]:h-[75%] max-[800px]:right-[-10px] max-[800px]:h-[67%] max-[800px]:w-[68%] max-[580px]:right-[-12px] max-[580px]:h-[64%] max-[580px]:w-[69%]" src={basketImage} alt="Wicker basket filled with fresh vegetables, fruit, bread and milk" loading="lazy" />
          </article>
        </section>

        <section id="fm-help" className={`${containerClass} scroll-mt-5 py-8`} aria-labelledby="fm-help-title">
          <h2 id="fm-help-title" className="mb-4 text-xl font-semibold">Cách mua sắm trên bản xem thử</h2>
          <div className="grid grid-cols-3 gap-3 max-[800px]:grid-cols-1">
            <div className="rounded-xl border border-[#e2ece5] bg-[#f7faf8] p-4"><strong className="text-sm">1. Chọn sản phẩm</strong><p className="mt-2 text-xs leading-relaxed text-[#667a6d]">Xem giá và tồn kho minh họa từ cửa hàng bán sản phẩm đó.</p></div>
            <div className="rounded-xl border border-[#e2ece5] bg-[#f7faf8] p-4"><strong className="text-sm">2. Xem giỏ theo cửa hàng</strong><p className="mt-2 text-xs leading-relaxed text-[#667a6d]">Mỗi cửa hàng có giỏ riêng. Bạn có thể chuyển giỏ trong hộp giỏ hàng.</p></div>
            <div className="rounded-xl border border-[#e2ece5] bg-[#f7faf8] p-4"><strong className="text-sm">3. Đơn hàng xem thử</strong><p className="mt-2 text-xs leading-relaxed text-[#667a6d]">Chưa hỗ trợ giao hàng hoặc thanh toán. Thao tác tạo đơn tại cửa hàng chỉ là mô phỏng.</p></div>
          </div>
        </section>

        <section className={`fm-join ${containerClass} relative mb-[45px] flex min-h-[290px] items-center overflow-hidden rounded-[18px] bg-[linear-gradient(128deg,#c5edfa,#edf8f8_68%,#f5f5f5)] px-[43px] py-10 max-[1100px]:p-[35px] max-[800px]:min-h-[275px] max-[800px]:p-[29px] max-[580px]:mb-[29px] max-[580px]:min-h-[405px] max-[580px]:items-start max-[580px]:rounded-[14px] max-[580px]:p-[27px]`} id="fm-join">
          <div className="relative z-2"><span className="text-[7px] tracking-[1.2px] text-[#68959c] max-[580px]:text-[5px]">MUA SẮM DỄ DÀNG HƠN</span><h2 className="my-3 text-[34px] leading-[1.2] font-[650] tracking-[-1px] max-[1100px]:text-[30px] max-[800px]:text-[27px]">Các cửa hàng yêu thích.<br />Món hàng bạn cần.</h2><p className="mb-5 text-[10px] leading-[1.9] text-[#7d9296] max-[800px]:text-[9px] max-[580px]:mb-4 max-[580px]:text-[8px]">Khám phá cửa hàng và thương hiệu quen thuộc.<br />Chọn cửa hàng phù hợp với bạn.</p><PillButton onClick={onRegister}>Tạo tài khoản</PillButton></div>
          <img className="fm-join-basket absolute right-4 bottom-0 h-[96%] w-[47%] object-contain object-right-bottom drop-shadow-[0_6px_8px_#32625b12] max-[1100px]:right-[3px] max-[800px]:right-[-4px] max-[800px]:h-[85%] max-[800px]:w-[44%] max-[580px]:right-[2px] max-[580px]:h-[185px] max-[580px]:w-[95%]" src={basketImage} alt="A carefully arranged basket of fresh groceries and fruit" loading="lazy" />
        </section>
      </main>

      <footer className={`fm-footer ${containerClass} overflow-hidden rounded-t-[18px] bg-[#032724] px-7 text-[#d5e6df] max-[800px]:px-[23px] max-[580px]:rounded-t-[14px] max-[580px]:px-5`} id="fm-footer">
        <div className="fm-footer-wordmark pt-2 text-center text-[clamp(75px,13.1vw,180px)] leading-[1.05] font-[650] tracking-[-0.065em] text-[#477d7280] min-[1500px]:text-[180px] max-[580px]:pt-[14px] max-[580px]:text-[12.5vw]" aria-hidden="true">{APP_BRAND.name}</div>
        <div className="flex items-center justify-between gap-5 border-y border-white/10 py-5 text-[11px] max-[580px]:flex-col max-[580px]:items-start max-[580px]:gap-[11px] max-[580px]:py-[19px] max-[580px]:text-[9px]"><p className="text-[#a7c4b8]">Nhiều cửa hàng trong một nơi.</p><button className="flex items-center gap-[10px] border-0 bg-transparent text-[10px] text-[#d3e5dc] max-[580px]:text-[9px]" onClick={onRegister}>Khám phá thêm sản phẩm <ArrowUpRight size={18} /></button></div>
        <div className="grid grid-cols-[1.1fr_.7fr_.7fr_1.5fr] gap-[25px] py-7 max-[800px]:gap-[18px] max-[580px]:grid-cols-2 max-[580px]:gap-x-[17px] max-[580px]:gap-y-6 max-[580px]:py-[25px]">
          <div><a className="fm-footer-logo inline-flex items-center gap-2 text-[19px] font-bold tracking-[-0.7px] text-[#e3f0e7]" href="/customer-home"><AppLogo className="size-[29px] shrink-0" variant="system-contrast" />{APP_BRAND.name}</a><p className="mt-[9px] text-[9px] leading-[1.9] text-[#83a79b] max-[800px]:text-[8px]">Nhiều cửa hàng, nhiều lựa chọn.<br />Mua sắm dễ dàng hơn.</p></div>
          <nav className="flex flex-col items-start gap-[9px] text-[9px] [&_a:hover]:text-white [&_a:hover]:underline" aria-label="Explore RetailSpace"><span className="mb-[5px] text-[7px] tracking-[1px] text-[#6e9a8c]">KHÁM PHÁ</span>{[['Cửa hàng', 'fm-stores'], ['Thương hiệu', 'fm-brands'], ['Sản phẩm', 'fm-products'], ['Bộ sưu tập', 'fm-collections']].map(([label, id]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
          <nav className="flex flex-col items-start gap-[9px] text-[9px] max-[580px]:col-start-1 max-[580px]:row-start-2 [&_button:hover]:text-white [&_button:hover]:underline" aria-label="RetailSpace account"><span className="mb-[5px] text-[7px] tracking-[1px] text-[#6e9a8c]">TÀI KHOẢN</span><button onClick={onLogin}>Đăng nhập</button><button onClick={onRegister}>Tạo tài khoản</button><button onClick={openStorefront}>Đến cửa hàng</button></nav>
          <div className="max-[580px]:col-start-2 max-[580px]:row-start-2"><span className="text-[7px] tracking-[1px] text-[#6e9a8c]">VỀ BẢN XEM THỬ</span><p className="mt-[9px] text-[9px] leading-[1.9] text-[#83a79b] max-[800px]:text-[8px]">Bản xem thử nền tảng nhiều cửa hàng.<br />Cửa hàng, sản phẩm và giá đều mang tính minh họa.</p><a className="mt-3 flex items-center gap-[5px] text-[8px] text-[#b1cec1] max-[580px]:flex-wrap max-[580px]:text-[6px]" href="https://dribbble.com/shots/27839977-Grocery-E-Commerce-Website-UI-UX-Design" target="_blank" rel="noreferrer">Design reference: Farmora by Ali Mortuja <ArrowUpRight size={12} /></a></div>
        </div>
        <div className="flex justify-between gap-[15px] border-t border-white/10 py-[18px] text-[8px] text-[#5e8b7d] max-[580px]:text-[6px]"><span>© {new Date().getFullYear()} {APP_BRAND.name} · Trang mua sắm</span><span>Khám phá mỗi ngày.</span></div>
      </footer>

      {notice && <div className="fm-toast fixed bottom-6 left-1/2 z-50 flex w-max max-w-[calc(100%_-_30px)] -translate-x-1/2 items-center gap-[10px] rounded-xl bg-[#032724] px-[17px] py-[14px] text-xs text-white shadow-[0_12px_40px_#03272430] max-[580px]:bottom-[17px] max-[580px]:px-[14px] max-[580px]:py-3 max-[580px]:text-[10px]" role="status"><Check size={17} className="shrink-0 text-[#91d3b7]" /><span>{notice}</span><button className="ml-[7px] flex text-[#96b4a5]" onClick={() => setNotice('')} aria-label="Đóng thông báo"><X size={15} /></button></div>}

      <CustomerShoppingDialog dialogRef={dialogRef} dialogMode={dialogMode} selectedProduct={selectedProduct} storeName={selectedStore.name} cart={cart} cartProducts={cartProducts} cartCount={cartCount} cartTotal={cartTotal} availableCarts={availableCarts} selectedStoreId={selectedStore.id} onSelectStore={storeId => chooseStore(storeId, false)} saved={saved} addToCart={addToCart} toggleSaved={toggleSaved} updateQuantity={updateQuantity} closeDialog={closeDialog} onCartAction={openStorefront} scrollTo={scrollTo} />
    </div>
  );
}
