import React from 'react';
import {
  ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight,
  Grid2X2, Headphones, MapPin, Search,
  Store, X,
} from 'lucide-react';
import { AppLogo } from '../../../components/common/AppLogo';
import { APP_BRAND } from '../../../app/branding';
import { CUSTOMER_STORES } from '../data/customerStores';
import { CustomerBannerCarousel } from './CustomerBannerCarousel';
import { CustomerStoreLogo } from './CustomerStoreLogo';
import { formatCustomerPrice as money } from '../data/customerCatalog';
import { CustomerShoppingDialog } from './CustomerShoppingDialog';
import { CustomerHeader } from './CustomerHeader';
import type { AuthUser } from '../../../services/authService';
import { useCustomerHome } from '../hooks/useCustomerHome';
import { AddToCartButton, ProductCard, PillButton, SectionHeading, containerClass } from './CustomerCommerce';

type Props = { onLogin: () => void; onRegister: () => void; onExplore: () => void; user?: AuthUser | null; onProfile?: () => void; onLogout?: () => void };
const textButtonClass = 'inline-flex items-center justify-center gap-[7px] border-0 bg-transparent py-[5px] text-[11px] text-[#088178] hover:text-[#032724]';
const basketImage = '/images/customer-home/fresh/grocery-basket.png';
const imagePath = (name: string) => name.startsWith('/') ? name : `/images/customer-home/fresh/${name}`;

export function CustomerHomeView({ onLogin, onRegister, onExplore, user, onProfile, onLogout }: Props) {
  const home = useCustomerHome(onExplore);
  const {
    selectedStore, storeProducts, categories, brands, featuredProduct, secondaryProduct,
    query, setQuery, category, setCategory, brand, setBrand, saved, savedOnly,
    cart, cartCount, cartProducts, cartTotal, filteredProducts, hasFilters,
    notice, setNotice, menuOpen, setMenuOpen, categoryMenuOpen, setCategoryMenuOpen,
    selectedProduct, dialogMode, dialogRef, brandRowRef,
    scrollTo, resetFilters, chooseStore, chooseBrand, chooseCategory, openStorefront,
    toggleSaved, toggleSavedOnly, addToCart, updateQuantity, openProduct,
    openCart, closeDialog, scrollBrands,
  } = home;

  return (
    <div className="customer-home isolate bg-white text-sm leading-normal text-[#212529] [&_button]:cursor-pointer [&_button]:transition-colors [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-[#088178] motion-reduce:[&_*]:transition-none" lang="en">
      <a className="absolute -top-25 left-[15px] z-100 bg-white p-3 focus:top-[10px]" href="#fm-main">Skip to main content</a>
      <CustomerHeader query={query} setQuery={setQuery} onSearch={() => scrollTo('fm-products')} savedCount={saved.length} savedOnly={savedOnly} toggleSavedOnly={toggleSavedOnly} cartCount={cartCount} openCart={openCart} onLogin={onLogin} user={user} onProfile={onProfile} onLogout={onLogout} menuOpen={menuOpen} onToggleMenu={() => setMenuOpen(!menuOpen)} />

      <div className="border-t border-[#e9eded]">
        <div className={`fm-navbar ${containerClass} relative flex min-h-14 items-center justify-between gap-5 text-[11px] max-[1100px]:gap-[15px] max-[580px]:min-h-[45px]`}>
          <div className="relative">
            <button className="flex items-center gap-[9px] border-0 bg-transparent py-3 text-[11px] max-[580px]:py-[10px] max-[580px]:text-[10px]" onClick={() => setCategoryMenuOpen(!categoryMenuOpen)} aria-expanded={categoryMenuOpen}><Grid2X2 size={16} />Explore All Categories<ChevronDown size={13} className="ml-[7px]" /></button>
            {categoryMenuOpen && <div className="absolute top-11 left-0 z-15 w-[235px] rounded-xl border border-[#e9eded] bg-white p-[7px] shadow-[0_15px_40px_#03272418] max-[580px]:top-[39px] max-[580px]:w-[225px]">
              {categories.map(item => <button className="flex w-full items-center justify-between rounded-md border-0 bg-transparent px-[10px] py-3 text-left text-xs text-[#52615e] hover:bg-[#e9f5f1] hover:text-[#088178]" key={item} onClick={() => chooseCategory(item)}>{item}<ChevronRight size={13} /></button>)}
            </div>}
          </div>
          <nav className={`fm-navigation items-center gap-[29px] max-[1100px]:gap-5 max-[800px]:gap-[13px] max-[580px]:absolute max-[580px]:top-11 max-[580px]:-right-4 max-[580px]:-left-4 max-[580px]:z-20 max-[580px]:flex-col max-[580px]:items-start max-[580px]:gap-0 max-[580px]:border-t max-[580px]:border-[#e9eded] max-[580px]:bg-white max-[580px]:px-5 max-[580px]:py-[14px] max-[580px]:shadow-[0_20px_25px_#03272410] ${menuOpen ? 'flex' : 'flex max-[580px]:hidden'}`} aria-label="Main navigation">
            {[['Stores', 'fm-stores'], ['Brands', 'fm-brands'], ['Products', 'fm-products'], ['Collections', 'fm-collections']].map(([label, id]) => <a className="hover:text-[#088178] max-[580px]:py-[11px] max-[580px]:text-xs" key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>)}
            <button className="flex items-center gap-[5px] border-0 bg-transparent p-0 hover:text-[#088178] max-[580px]:py-[11px] max-[580px]:text-xs" onClick={openStorefront}>Shop <ArrowUpRight size={12} /></button>
          </nav>
          <a className="flex items-center gap-[7px] text-[10px] max-[800px]:gap-0 max-[800px]:text-[0px] max-[580px]:gap-[5px] max-[580px]:text-[8px]" href="#fm-footer"><Headphones className="size-[22px] rounded-full bg-[#088178] p-1 text-white max-[580px]:size-[18px] max-[580px]:p-[3px]" />Help & Information</a>
        </div>
      </div>

      <div className={`fm-store-strip ${containerClass} mb-4 flex items-center justify-between gap-[18px] rounded-lg border border-[#e1ede6] bg-[#f0f7f3] px-[15px] py-[10px] text-[10px] text-[#627e6e] max-[580px]:mb-3 max-[580px]:gap-2 max-[580px]:px-[10px] max-[580px]:py-[9px] max-[580px]:text-[8px]`}>
        <div className="flex min-w-0 items-center gap-[9px] max-[580px]:gap-[5px]">
          <Store size={17} className="shrink-0 max-[580px]:size-[13px]" /><label htmlFor="fm-current-store" className="whitespace-nowrap">Shopping at</label>
          <select className="max-w-[210px] rounded-[5px] border border-[#d6e6dc] bg-white py-[5px] pr-[22px] pl-2 text-[11px] text-[#265b44] max-[580px]:max-w-[145px] max-[580px]:pr-4 max-[580px]:pl-[5px] max-[580px]:text-[9px]" id="fm-current-store" value={selectedStore.id} onChange={event => chooseStore(event.target.value, false)}>{CUSTOMER_STORES.map(store => <option key={store.id} value={store.id}>{store.englishName}</option>)}</select>
          <span className="flex items-center gap-1 text-[9px] max-[800px]:hidden"><MapPin size={12} />{selectedStore.englishArea}</span>
        </div>
        <a className="inline-flex items-center gap-[5px] text-[#088178] max-[580px]:gap-[2px] max-[580px]:text-[7px] max-[360px]:hidden" href="#fm-stores">Explore stores <ArrowUpRight size={13} /></a>
      </div>

      <main id="fm-main">
        <CustomerBannerCarousel selectedStore={selectedStore} featuredProduct={featuredProduct} onBrowseProducts={() => { resetFilters(); scrollTo('fm-products'); }} onBrowseStores={() => scrollTo('fm-stores')} onShopStore={storeId => chooseStore(storeId)} onBannerStoreChange={storeId => chooseStore(storeId, false)} />

        <section className={`fm-stores-section ${containerClass} scroll-mt-[18px] pt-[42px] pb-[10px] max-[580px]:pt-[29px] max-[580px]:pb-0`} id="fm-stores" aria-labelledby="fm-stores-title">
          <div className="mb-[22px] flex items-center justify-between gap-[18px] max-[580px]:mb-[17px]">
            <div><span className="mb-[9px] block text-[8px] tracking-[1.2px] text-[#89a18f] max-[580px]:mb-[7px] max-[580px]:text-[6px] max-[580px]:tracking-[0.6px]">ONE PLATFORM. YOUR NEIGHBORHOOD STORES.</span><h2 id="fm-stores-title" className="m-0 text-[29px] leading-[1.25] font-[650] tracking-[-1.1px] max-[800px]:text-[26px] max-[580px]:text-[23px]">Find your everyday store</h2></div>
            <span className="text-[10px] whitespace-nowrap text-[#84958c] max-[580px]:text-[8px]">{CUSTOMER_STORES.length} demo stores</span>
          </div>
          <div className="fm-stores-grid grid grid-cols-4 gap-4 max-[800px]:grid-cols-2 max-[800px]:gap-[13px] max-[580px]:gap-[11px]">
            {CUSTOMER_STORES.map(store => (
              <button key={store.id} className={`fm-store-card group min-w-0 rounded-[13px] border bg-white p-1 text-left hover:border-[#088178] hover:shadow-[0_4px_16px_#08817809] ${selectedStore.id === store.id ? 'border-[#088178] shadow-[0_4px_16px_#08817809]' : 'border-[#e5ebe7]'}`} aria-label={`Shop at ${store.englishName}`} aria-pressed={selectedStore.id === store.id} onClick={() => chooseStore(store.id)}>
                <div className="fm-store-picture relative flex h-[158px] items-center justify-center overflow-hidden rounded-[9px] max-[1100px]:h-[140px] max-[800px]:h-[150px] max-[580px]:h-30 max-[360px]:h-[105px]" style={{ background: store.color }}>
                  <CustomerStoreLogo store={store} className="size-[112px] transition-transform group-hover:scale-[1.04] max-[580px]:size-[88px] max-[360px]:size-20" />
                  {selectedStore.id === store.id && <span className="absolute top-[9px] left-[9px] flex items-center gap-1 rounded-full border border-[#d5e9dc] bg-[#ffffffed] px-[7px] py-1 text-[8px] text-[#088178] max-[580px]:top-[6px] max-[580px]:left-[6px] max-[580px]:px-[5px] max-[580px]:py-[3px] max-[580px]:text-[6px]"><Check size={12} />Selected store</span>}
                </div>
                <div className="px-[10px] pt-[14px] pb-[11px] max-[580px]:px-[7px] max-[580px]:pt-[10px] max-[580px]:pb-[9px]">
                  <span className="flex items-center gap-1 text-[8px] text-[#93a196] max-[580px]:text-[7px]"><MapPin size={11} />{store.englishArea}</span>
                  <strong className="my-[6px] block text-[15px] font-[650] tracking-[-0.3px] max-[1100px]:text-[13px] max-[800px]:text-[15px] max-[580px]:text-xs">{store.englishName}</strong>
                  <p className="mb-[15px] min-h-[34px] text-[10px] leading-[1.7] text-[#88978c] max-[1100px]:text-[9px] max-[800px]:min-h-0 max-[580px]:mb-[10px] max-[580px]:min-h-7 max-[580px]:text-[8px]">{store.englishDescription}</p>
                  <span className="flex items-center justify-between gap-[6px] border-t border-[#edf0ec] pt-3 max-[1100px]:flex-wrap max-[800px]:flex-nowrap max-[580px]:flex-wrap max-[580px]:gap-[7px] max-[580px]:pt-[9px]">
                    <small className="text-[8px] text-[#98a49b] max-[580px]:text-[7px]">{store.productIds.length} demo products</small><span className="flex items-center gap-1 text-[9px] text-[#088178] max-[580px]:text-[8px]">Browse store <ArrowUpRight size={13} /></span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section id="fm-brands" className={`fm-brands-section ${containerClass} scroll-mt-5 pt-[43px] pb-[45px] max-[580px]:pt-7 max-[580px]:pb-[30px]`} aria-labelledby="fm-brands-title">
          <SectionHeading id="fm-brands-title" title="Explore Our Brands">
            <div className="fm-arrows flex gap-[7px] min-[801px]:hidden">
              <button className="grid size-[27px] place-items-center rounded-full border-0 bg-[#f0f3f2] text-[#a3b0ac] hover:bg-[#dbede5]" aria-label="Previous brands" onClick={() => scrollBrands(-1)}><ChevronLeft size={17} /></button>
              <button className="grid size-[27px] place-items-center rounded-full border-0 bg-[#088178] text-white hover:bg-[#06685f]" aria-label="Next brands" onClick={() => scrollBrands(1)}><ChevronRight size={17} /></button>
            </div>
          </SectionHeading>
          <div className="fm-brands grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4 overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[800px]:flex max-[800px]:gap-[13px] max-[580px]:-mr-4 max-[580px]:gap-[10px] max-[580px]:pr-4" ref={brandRowRef}>
            {brands.map(item => (
              <button key={item.name} className="fm-brand-card group min-w-0 border-0 bg-transparent p-0 text-center max-[800px]:shrink-0 max-[800px]:basis-[135px] max-[580px]:basis-[115px]" onClick={() => chooseBrand(item.name)}>
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
            <SectionHeading id="fm-products-title" title={savedOnly ? 'Your Saved Favorites' : `Fresh picks at ${selectedStore.englishName}`}><PillButton onClick={openStorefront}>View All</PillButton></SectionHeading>
            <p className="fm-catalog-store -mt-[10px] mb-[17px] flex flex-wrap items-center gap-[6px] text-[9px] text-[#8c9b91] max-[580px]:text-[8px]"><Store size={13} />Shopping at <strong className="font-[550] text-[#5d806b]">{selectedStore.englishName}</strong><span>•</span>{selectedStore.englishArea}</p>
            <div className="fm-product-toolbar flex items-center justify-between gap-[15px] max-[800px]:items-start max-[580px]:flex-wrap max-[580px]:gap-[10px]">
              <div className="fm-category-tabs flex flex-wrap items-center gap-[7px] max-[1100px]:gap-[5px] max-[800px]:flex-nowrap max-[800px]:overflow-auto max-[800px]:py-[2px] max-[800px]:[scrollbar-width:none] max-[580px]:-mr-4 max-[580px]:w-[calc(100%_+_16px)] max-[580px]:gap-[6px] max-[580px]:pr-4" aria-label="Filter by category">
                {categories.map(item => <button key={item} className={`shrink-0 rounded-full border bg-white px-[15px] py-2 text-[10px] whitespace-nowrap hover:bg-[#e7f1ed] max-[1100px]:px-3 max-[1100px]:py-[7px] max-[1100px]:text-[9px] ${category === item ? 'border-[#088178] text-[#088178]' : 'border-[#e9eceb] text-[#4d5856]'}`} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
              </div>
              <select className="max-w-[180px] rounded-full border border-[#e2e7e5] bg-white px-3 py-2 text-[10px] text-[#677370] max-[1100px]:max-w-[153px] max-[1100px]:text-[9px] max-[580px]:max-w-none max-[580px]:px-[10px] max-[580px]:py-[6px]" aria-label="Filter by brand" value={brand} onChange={event => setBrand(event.target.value)}><option value="All Products">All Brands</option>{brands.map(item => <option key={item.name}>{item.name}</option>)}</select>
            </div>
            <div className="fm-filter-status flex min-h-[43px] items-center gap-3 text-[9px] text-[#929b98] max-[580px]:min-h-9 max-[580px]:flex-wrap max-[580px]:gap-[9px] max-[580px]:text-[8px]">
              <p className="m-0 max-[580px]:max-w-[58%]" role="status" aria-live="polite">{filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}{query.trim() && ` for “${query.trim()}”`}{brand !== 'All Products' && ` · ${brand}`}</p>
              {hasFilters && <button className="flex items-center gap-1 border-0 bg-transparent py-1 text-[#088178]" onClick={resetFilters}>Clear Filters <X size={12} /></button>}
              <span className="ml-auto text-[#9ea5a2] max-[580px]:text-[7px]">Demo products & prices</span>
            </div>
            <div className="fm-products-grid grid grid-cols-3 gap-x-[18px] gap-y-[22px] max-[800px]:gap-x-3 max-[800px]:gap-y-[15px] max-[580px]:grid-cols-2 max-[580px]:gap-x-[10px]">
              {filteredProducts.map(product => <ProductCard key={product.id} product={product} saved={saved.includes(product.id)} quantity={cart[product.id] || 0} onSave={() => toggleSaved(product.id)} onOpen={() => openProduct(product)} onAdd={() => addToCart(product)} />)}
            </div>
            {filteredProducts.length === 0 && <div className="fm-empty flex flex-col items-center gap-3 px-[15px] py-[50px] text-center text-[#6f8880]"><Search size={30} /><h3 className="m-0 text-xl">{savedOnly ? 'No saved favorites here yet' : 'No matching products found'}</h3><p className="mb-[6px] text-xs">Try another search or adjust your filters.</p><PillButton onClick={resetFilters}>View All Products</PillButton></div>}
          </div>
        </section>

        <section id="fm-collections" className={`fm-promos ${containerClass} grid scroll-mt-0 grid-cols-[1fr_1.5fr] grid-rows-[175px_175px] gap-4 py-11 max-[1100px]:grid-rows-[160px_160px] max-[800px]:grid-rows-[145px_145px] max-[800px]:gap-3 max-[580px]:grid-cols-2 max-[580px]:grid-rows-[160px_275px] max-[580px]:gap-[10px] max-[580px]:py-[29px]`} aria-label="Shopping collections">
          <article className="fm-promo fm-promo-snack relative col-start-1 row-start-1 overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_90%_100%,#96dbc7,transparent_60%),linear-gradient(115deg,#4d43df,#6d68e8)] p-[26px] text-white max-[1100px]:p-6 max-[800px]:p-[22px] max-[580px]:rounded-[10px] max-[580px]:px-[14px] max-[580px]:py-[18px]">
            <div className="relative z-2"><span className="text-[7px] tracking-[1.1px] opacity-80 max-[580px]:text-[5px]">FAVORITES FROM YOUR STORE</span><h2 className="mt-[9px] mb-[14px] text-[27px] leading-[1.15] font-[650] tracking-[-0.8px] max-[1100px]:text-[25px] max-[800px]:text-[22px] max-[580px]:text-xl">Everyday picks.<br />Made for you.</h2><PillButton compact onClick={() => chooseCategory(featuredProduct.category)}>Shop {featuredProduct.category}</PillButton></div>
            <img className="absolute -right-px bottom-[-6px] h-[165px] w-[175px] -rotate-8 object-contain max-[1100px]:right-[-8px] max-[1100px]:h-[140px] max-[1100px]:w-[150px] max-[800px]:right-[-9px] max-[800px]:size-[110px] max-[580px]:bottom-[-7px] max-[580px]:h-[98px] max-[580px]:w-[105px]" src={featuredProduct.image} alt={featuredProduct.name} loading="lazy" />
          </article>
          <article className="fm-promo fm-promo-pantry relative col-start-1 row-start-2 overflow-hidden rounded-xl bg-[linear-gradient(115deg,#dbc19b,#f5e7d4)] p-[26px] text-white max-[1100px]:p-6 max-[800px]:p-[22px] max-[580px]:col-start-2 max-[580px]:row-start-1 max-[580px]:rounded-[10px] max-[580px]:px-[14px] max-[580px]:py-[18px]">
            <div className="relative z-2"><span className="text-[7px] tracking-[1.1px] opacity-80 max-[580px]:text-[5px]">FILL YOUR EVERYDAY BASKET</span><h2 className="mt-[9px] mb-[14px] text-[27px] leading-[1.15] font-[650] tracking-[-0.8px] max-[1100px]:text-[25px] max-[800px]:text-[22px] max-[580px]:text-[19px]">A little more.<br />To love.</h2><PillButton compact onClick={() => chooseCategory(secondaryProduct.category)}>Explore More</PillButton></div>
            <img className="absolute right-[5px] bottom-[-8px] h-[154px] w-[158px] rotate-10 object-contain max-[1100px]:right-[-4px] max-[1100px]:size-[135px] max-[800px]:right-[-9px] max-[800px]:bottom-[-10px] max-[800px]:size-[110px] max-[580px]:right-[-8px] max-[580px]:bottom-[-7px] max-[580px]:size-[95px]" src={secondaryProduct.image} alt={secondaryProduct.name} loading="lazy" />
          </article>
          <article className="fm-promo fm-promo-produce relative col-start-2 row-span-2 row-start-1 overflow-hidden rounded-xl bg-[radial-gradient(circle_at_84%_82%,#ecfcff_0%,transparent_57%),linear-gradient(115deg,#229bbc,#84d9eb)] p-9 text-white max-[1100px]:p-[31px] max-[800px]:p-[22px] max-[580px]:col-span-2 max-[580px]:col-start-1 max-[580px]:row-span-1 max-[580px]:row-start-2 max-[580px]:p-[27px]">
            <div className="relative z-2 max-w-[58%] max-[800px]:max-w-[84%] max-[580px]:max-w-[82%]"><span className="text-[7px] tracking-[1.1px] opacity-80 max-[580px]:text-[5px]">DISCOVER {selectedStore.englishName.toUpperCase()}</span><h2 className="my-3 text-[38px] leading-[1.16] font-[650] tracking-[-1.2px] max-[1100px]:text-[34px] max-[800px]:text-[30px] max-[580px]:text-[31px]">Good food.<br />Fresh starts.<br />Every day.</h2><p className="mb-[19px] text-[10px] leading-[1.8] text-[#e1f6fc] max-[800px]:text-[8px] max-[580px]:max-w-[170px]">Your favorite brands and everyday essentials,<br className="max-[580px]:hidden" />selected from your current store.</p><PillButton onClick={() => { resetFilters(); scrollTo('fm-products'); }}>Shop This Store</PillButton></div>
            <img className="fm-promo-basket absolute right-[-6px] bottom-0 h-[85%] w-[65%] object-contain object-right-bottom drop-shadow-[0_8px_10px_#163e4020] max-[1100px]:right-[-13px] max-[1100px]:h-[75%] max-[800px]:right-[-10px] max-[800px]:h-[67%] max-[800px]:w-[68%] max-[580px]:right-[-12px] max-[580px]:h-[64%] max-[580px]:w-[69%]" src={basketImage} alt="Wicker basket filled with fresh vegetables, fruit, bread and milk" loading="lazy" />
          </article>
        </section>

        <section className={`fm-picks-section ${containerClass} pb-[45px] max-[580px]:pb-[29px]`} aria-labelledby="fm-picks-title">
          <SectionHeading id="fm-picks-title" title="Everyday Basket Essentials"><button className={`${textButtonClass} whitespace-nowrap max-[580px]:text-[8px]`} onClick={openStorefront}>Explore More <ArrowUpRight size={16} /></button></SectionHeading>
          <div className="fm-compact-grid grid grid-cols-2 gap-[15px] max-[580px]:grid-cols-1 max-[580px]:gap-[11px]">
            {storeProducts.slice(0, 4).map(product => <article className="fm-compact-product grid min-h-[172px] grid-cols-[45%_1fr] gap-[15px] rounded-xl border border-[#eef0ee] p-2 max-[800px]:grid-cols-[40%_1fr] max-[800px]:gap-[9px] max-[580px]:min-h-[150px] max-[580px]:grid-cols-[43%_1fr] max-[580px]:gap-[13px]" key={product.id}>
              <button className="fm-compact-image group grid place-items-center rounded-lg border-0 bg-[#f5f5f5] p-[15px] max-[800px]:p-[6px]" onClick={() => openProduct(product)} aria-label={`Details for ${product.name}`}><img className="h-[138px] w-full object-contain drop-shadow-[0_5px_3px_#152c1c0c] transition-transform group-hover:scale-105 max-[800px]:h-[127px] max-[580px]:h-[130px]" src={product.image} alt={product.name} loading="lazy" /></button>
              <div className="py-2 pr-2 max-[580px]:pr-[10px]"><span className="text-[9px] text-[#088178]">{product.brand}</span><h3 className="my-[5px] text-[13px] leading-[1.4] font-semibold max-[800px]:text-[11px] max-[580px]:text-xs">{product.name}</h3><p className="mb-[6px] text-[9px] text-[#969f9a]">{product.unit}</p><strong className="mb-3 block text-sm max-[800px]:text-xs max-[580px]:text-[13px]">{money(product.priceVnd)}</strong><AddToCartButton onClick={() => addToCart(product)} /></div>
            </article>)}
          </div>
        </section>

        <section className={`fm-join ${containerClass} relative mb-[45px] flex min-h-[290px] items-center overflow-hidden rounded-[18px] bg-[linear-gradient(128deg,#c5edfa,#edf8f8_68%,#f5f5f5)] px-[43px] py-10 max-[1100px]:p-[35px] max-[800px]:min-h-[275px] max-[800px]:p-[29px] max-[580px]:mb-[29px] max-[580px]:min-h-[405px] max-[580px]:items-start max-[580px]:rounded-[14px] max-[580px]:p-[27px]`} id="fm-join">
          <div className="relative z-2"><span className="text-[7px] tracking-[1.2px] text-[#68959c] max-[580px]:text-[5px]">YOUR EVERYDAY, MADE EASIER</span><h2 className="my-3 text-[34px] leading-[1.2] font-[650] tracking-[-1px] max-[1100px]:text-[30px] max-[800px]:text-[27px]">Your favorite stores.<br />Your everyday favorites.</h2><p className="mb-5 text-[10px] leading-[1.9] text-[#7d9296] max-[800px]:text-[9px] max-[580px]:mb-4 max-[580px]:text-[8px]">Discover neighborhood stores and the brands you love.<br />Choose your store and make every basket your own.</p><PillButton onClick={onRegister}>Create Account</PillButton></div>
          <img className="fm-join-basket absolute right-4 bottom-0 h-[96%] w-[47%] object-contain object-right-bottom drop-shadow-[0_6px_8px_#32625b12] max-[1100px]:right-[3px] max-[800px]:right-[-4px] max-[800px]:h-[85%] max-[800px]:w-[44%] max-[580px]:right-[2px] max-[580px]:h-[185px] max-[580px]:w-[95%]" src={basketImage} alt="A carefully arranged basket of fresh groceries and fruit" loading="lazy" />
        </section>
      </main>

      <footer className={`fm-footer ${containerClass} overflow-hidden rounded-t-[18px] bg-[#032724] px-7 text-[#d5e6df] max-[800px]:px-[23px] max-[580px]:rounded-t-[14px] max-[580px]:px-5`} id="fm-footer">
        <div className="fm-footer-wordmark pt-2 text-center text-[clamp(75px,13.1vw,180px)] leading-[1.05] font-[650] tracking-[-0.065em] text-[#477d7280] min-[1500px]:text-[180px] max-[580px]:pt-[14px] max-[580px]:text-[12.5vw]" aria-hidden="true">{APP_BRAND.name}</div>
        <div className="flex items-center justify-between gap-5 border-y border-white/10 py-5 text-[11px] max-[580px]:flex-col max-[580px]:items-start max-[580px]:gap-[11px] max-[580px]:py-[19px] max-[580px]:text-[9px]"><p className="text-[#a7c4b8]">Many stores. One place for your everyday favorites.</p><button className="flex items-center gap-[10px] border-0 bg-transparent text-[10px] text-[#d3e5dc] max-[580px]:text-[9px]" onClick={onRegister}>Make room for something fresh <ArrowUpRight size={18} /></button></div>
        <div className="grid grid-cols-[1.1fr_.7fr_.7fr_1.5fr] gap-[25px] py-7 max-[800px]:gap-[18px] max-[580px]:grid-cols-2 max-[580px]:gap-x-[17px] max-[580px]:gap-y-6 max-[580px]:py-[25px]">
          <div><a className="fm-footer-logo inline-flex items-center gap-2 text-[19px] font-bold tracking-[-0.7px] text-[#e3f0e7]" href="/customer-home"><AppLogo className="size-[29px] shrink-0" variant="system-contrast" />{APP_BRAND.name}</a><p className="mt-[9px] text-[9px] leading-[1.9] text-[#83a79b] max-[800px]:text-[8px]">Local stores. Familiar brands.<br />A little easier, every day.</p></div>
          <nav className="flex flex-col items-start gap-[9px] text-[9px] [&_a:hover]:text-white [&_a:hover]:underline" aria-label="Explore RetailSpace"><span className="mb-[5px] text-[7px] tracking-[1px] text-[#6e9a8c]">EXPLORE</span>{[['Stores', 'fm-stores'], ['Brands', 'fm-brands'], ['Products', 'fm-products'], ['Collections', 'fm-collections']].map(([label, id]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
          <nav className="flex flex-col items-start gap-[9px] text-[9px] max-[580px]:col-start-1 max-[580px]:row-start-2 [&_button:hover]:text-white [&_button:hover]:underline" aria-label="RetailSpace account"><span className="mb-[5px] text-[7px] tracking-[1px] text-[#6e9a8c]">YOUR ACCOUNT</span><button onClick={onLogin}>Sign In</button><button onClick={onRegister}>Create Account</button><button onClick={openStorefront}>Visit the Store</button></nav>
          <div className="max-[580px]:col-start-2 max-[580px]:row-start-2"><span className="text-[7px] tracking-[1px] text-[#6e9a8c]">ABOUT THIS CONCEPT</span><p className="mt-[9px] text-[9px] leading-[1.9] text-[#83a79b] max-[800px]:text-[8px]">A multi-store shopping preview.<br />Demo stores, brands, products and prices.</p><a className="mt-3 flex items-center gap-[5px] text-[8px] text-[#b1cec1] max-[580px]:flex-wrap max-[580px]:text-[6px]" href="https://dribbble.com/shots/27839977-Grocery-E-Commerce-Website-UI-UX-Design" target="_blank" rel="noreferrer">Design reference: Farmora by Ali Mortuja <ArrowUpRight size={12} /></a></div>
        </div>
        <div className="flex justify-between gap-[15px] border-t border-white/10 py-[18px] text-[8px] text-[#5e8b7d] max-[580px]:text-[6px]"><span>© {new Date().getFullYear()} {APP_BRAND.name} · Customer Home Concept</span><span>Fresh picks. Happy days.</span></div>
      </footer>

      {notice && <div className="fm-toast fixed bottom-6 left-1/2 z-50 flex w-max max-w-[calc(100%_-_30px)] -translate-x-1/2 items-center gap-[10px] rounded-xl bg-[#032724] px-[17px] py-[14px] text-xs text-white shadow-[0_12px_40px_#03272430] max-[580px]:bottom-[17px] max-[580px]:px-[14px] max-[580px]:py-3 max-[580px]:text-[10px]" role="status"><Check size={17} className="shrink-0 text-[#91d3b7]" /><span>{notice}</span><button className="ml-[7px] flex text-[#96b4a5]" onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={15} /></button></div>}

      <CustomerShoppingDialog dialogRef={dialogRef} dialogMode={dialogMode} selectedProduct={selectedProduct} storeName={selectedStore.englishName} cart={cart} cartProducts={cartProducts} cartCount={cartCount} cartTotal={cartTotal} saved={saved} addToCart={addToCart} toggleSaved={toggleSaved} updateQuantity={updateQuantity} closeDialog={closeDialog} onCartAction={openStorefront} scrollTo={scrollTo} />
    </div>
  );
}
