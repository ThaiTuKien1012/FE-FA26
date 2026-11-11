import { ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronRight, Clock, Leaf, MapPin, Search, ShoppingCart, Store, X } from 'lucide-react';
import type { AuthUser } from '../../../services/authService';
import type { ProductItem } from '../customer.types';
import { APP_BRAND } from '../../../app/branding';
import { AppLogo } from '../../../components/common/AppLogo';
import { CUSTOMER_STORES } from '../data/customerStores';
import { formatCustomerPrice as money } from '../data/customerCatalog';
import { useCustomerStorefront } from '../hooks/useCustomerStorefront';
import { CustomerBannerCarousel } from './CustomerBannerCarousel';
import { CustomerHeader } from './CustomerHeader';
import { CustomerStoreLogo } from './CustomerStoreLogo';
import { CustomerShoppingDialog } from './CustomerShoppingDialog';
import { containerClass, PillButton, ProductCard } from './CustomerCommerce';

interface CustomerStorefrontViewProps {
  productsByStore?: Record<string, ProductItem[]>;
  user?: AuthUser | null;
  onLogout: () => void;
  onProfile: () => void;
  onHome: () => void;
  onLogin: () => void;
}

export function CustomerStorefrontView({ productsByStore, user, onLogout, onProfile, onHome, onLogin }: CustomerStorefrontViewProps) {
  const shop = useCustomerStorefront(productsByStore);
  const {
    selectedStore, storeProducts, categories, brands, bundles,
    query, setQuery, category, setCategory, brand, setBrand, saved, savedOnly,
    sort, setSort, filteredProducts, hasFilters, resetFilters, chooseStore, toggleSavedOnly,
    cart, cartProducts, cartCount, cartTotal, addToCart, updateQuantity, toggleSaved,
    selectedProduct, dialogMode, dialogRef, openProduct, openCart, closeDialog,
    receipt, receiptRef, completeDemoOrder, notice, setNotice, scrollTo,
  } = shop;

  return (
    <div className="customer-storefront isolate min-h-screen bg-white text-sm leading-normal text-[#212529] [&_button]:cursor-pointer [&_button]:transition-colors [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-[#088178] motion-reduce:[&_*]:transition-none" lang="en">
      <a className="absolute -top-25 left-4 z-100 bg-white p-3 focus:top-2" href="#shop-main">Skip to main content</a>
      <CustomerHeader query={query} setQuery={setQuery} onSearch={() => scrollTo()} savedCount={saved.length} savedOnly={savedOnly} toggleSavedOnly={toggleSavedOnly} cartCount={cartCount} openCart={openCart} onLogin={onLogin} onHome={onHome} user={user} onProfile={onProfile} onLogout={onLogout} />
      <div className="border-y border-[#e9eded]">
        <div className={`${containerClass} flex min-h-14 items-center justify-between gap-4 text-[11px] max-[580px]:min-h-12 max-[580px]:text-[10px]`}>
          <nav aria-label="Shop navigation" className="flex items-center gap-6 whitespace-nowrap max-[580px]:gap-4">
            <a href="/customer-home" onClick={event => { event.preventDefault(); onHome(); }} className="flex items-center gap-1.5 text-[#6f7c76] hover:text-[#088178]"><ArrowLeft size={13} />Home</a>
            <a href="/storefront" aria-current="page" className="font-semibold text-[#088178]">Shop</a>
            <a href="#shop-stores" className="hover:text-[#088178]">Our stores</a>
            <a href="#shop-pairs" className="hover:text-[#088178] max-[580px]:hidden">Everyday pairs</a>
          </nav>
          <span className="flex items-center gap-1.5 text-[10px] text-[#6f7c76] max-[580px]:text-[8px] max-[360px]:hidden"><Leaf size={13} className="text-[#088178]" />A little goodness, every day</span>
        </div>
      </div>

      <main id="shop-main" className="pb-14 max-[580px]:pb-20">
        <div className={`${containerClass} flex items-center justify-between gap-3 py-5 max-[580px]:py-4`}>
          <div className="flex min-w-0 items-center gap-2 text-[10px] text-[#94a099] max-[580px]:text-[9px]"><span>Shop</span><ChevronRight size={11} /><span className="truncate text-[#557065]">{selectedStore.englishName}</span></div>
          <label className="flex shrink-0 items-center gap-2 text-[10px] text-[#617a6e] max-[580px]:text-[8px]"><Store size={14} /><span className="max-[360px]:hidden">Shopping at</span><select aria-label="Shopping at" value={selectedStore.id} onChange={event => chooseStore(event.target.value)} className="max-w-[190px] rounded-full border border-[#dce9e1] bg-[#f0f7f3] py-1.5 pr-6 pl-3 text-[#266b57] max-[580px]:max-w-[145px] max-[580px]:py-1 max-[580px]:pl-2">{CUSTOMER_STORES.map(store => <option key={store.id} value={store.id}>{store.englishName}</option>)}</select></label>
        </div>

        <CustomerBannerCarousel variant="shop" selectedStore={selectedStore} featuredProduct={storeProducts[0]} onBrowseProducts={() => { resetFilters(); scrollTo(); }} onBrowseStores={() => scrollTo('shop-stores')} onShopStore={storeId => { chooseStore(storeId); scrollTo(); }} onBannerStoreChange={chooseStore} />

        <section id="shop-stores" aria-labelledby="shop-stores-title" className={`${containerClass} scroll-mt-5 pt-9 pb-10 max-[580px]:pt-7 max-[580px]:pb-7`}>
          <div className="mb-4 flex items-center justify-between gap-3"><h2 id="shop-stores-title" className="text-xl font-[650] tracking-[-0.6px] max-[580px]:text-lg">Your neighborhood stores</h2><span className="text-[9px] text-[#8a9990]">4 stores · one happy place</span></div>
          <div className="storefront-store-grid grid grid-cols-4 gap-3 max-[800px]:grid-cols-2 max-[580px]:gap-2">
            {CUSTOMER_STORES.map(store => {
              const selected = store.id === selectedStore.id;
              return <button key={store.id} onClick={() => chooseStore(store.id)} aria-label={`Shop at ${store.englishName}`} aria-pressed={selected} className={`storefront-store-card relative flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left max-[1100px]:gap-2 max-[580px]:p-2 ${selected ? 'border-[#088178] bg-[#f0f8f4]' : 'border-[#e8edeb] bg-white hover:border-[#b5d7c7] hover:bg-[#f7fbf8]'}`}>
                <CustomerStoreLogo store={store} className="size-14 rounded-lg max-[1100px]:size-11 max-[580px]:size-10" />
                <span className="min-w-0"><strong className="block text-[11px] leading-[1.4] font-semibold max-[1100px]:text-[10px] max-[580px]:text-[9px]">{store.englishName}</strong><span className="mt-1 block text-[8px] text-[#8a9990] max-[580px]:text-[7px]">{store.englishArea}</span><span className={`mt-1.5 flex items-center gap-1 text-[8px] max-[580px]:text-[7px] ${selected ? 'text-[#088178]' : 'text-[#8a9990]'}`}>{selected ? <Check size={10} /> : <span className="size-1 rounded-full bg-[#78b08c]" />}{selected ? 'Your selected store' : 'Explore store'}</span></span>
              </button>;
            })}
          </div>
        </section>

        <section id="shop-products" aria-labelledby="shop-products-title" className="storefront-catalog scroll-mt-4 bg-[#f5f5f5] py-10 max-[580px]:py-7">
          <div className={containerClass}>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3 max-[580px]:mb-5">
              <div><span className="text-[8px] tracking-[1.5px] text-[#088178]">FRESH FINDS. EVERYDAY FAVORITES.</span><h2 id="shop-products-title" className="mt-2 text-[29px] leading-tight font-[650] tracking-[-1px] max-[580px]:text-[23px]">{savedOnly ? 'Your saved favorites' : `Fresh picks at ${selectedStore.englishName}`}</h2><p className="mt-2 flex items-center gap-1 text-[9px] text-[#8b9991]"><MapPin size={12} />{selectedStore.englishArea}<span className="mx-1">·</span>{selectedStore.englishDescription}</p></div>
              <button onClick={openCart} className="flex shrink-0 items-center gap-2 rounded-full border border-[#d5e6de] bg-white px-4 py-2 text-[10px] text-[#088178] hover:bg-[#e9f5ef]"><ShoppingCart size={14} />Your cart ({cartCount})<ArrowUpRight size={13} /></button>
            </div>

            <div className="grid grid-cols-[185px_minmax(0,1fr)] items-start gap-6 max-[1100px]:grid-cols-[155px_minmax(0,1fr)] max-[1100px]:gap-4 max-[800px]:grid-cols-1">
              <aside className="rounded-xl bg-white p-4 max-[800px]:p-3" aria-label="Product categories">
                <h3 className="mb-4 text-xs font-semibold max-[800px]:mb-3">Shop by category</h3>
                <div className="flex flex-col gap-1 max-[800px]:flex-row max-[800px]:overflow-x-auto max-[800px]:pb-1" aria-label="Filter by category">
                  {categories.map(item => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-[10px] whitespace-nowrap max-[800px]:shrink-0 max-[800px]:rounded-full max-[800px]:border max-[800px]:px-4 max-[800px]:py-2 ${category === item ? 'border-[#088178] bg-[#edf7f1] text-[#088178]' : 'border-[#e8edeb] text-[#79877f] hover:bg-[#f6f9f7]'}`}>{item}<span className="text-[8px] text-[#8faa9b] max-[800px]:hidden">{item === 'All Products' ? storeProducts.length : storeProducts.filter(product => product.category === item).length}</span></button>)}
                </div>
                <div className="mt-5 border-t border-[#edf1ee] pt-4 max-[800px]:hidden"><span className="text-[8px] tracking-wider text-[#93a39a]">YOUR LOCAL STORE</span><p className="mt-2 text-xs font-medium text-[#386c56]">{selectedStore.englishName}</p><p className="mt-1 text-[9px] leading-relaxed text-[#94a198]">{selectedStore.englishAddress}</p><p className="mt-3 flex items-center gap-1.5 text-[9px] text-[#6d987e]"><Clock size={12} />Open until {selectedStore.closesAt}</p></div>
              </aside>

              <div className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-[9px] text-[#8a9991]">
                  <p role="status" aria-live="polite">Showing {filteredProducts.length} of {storeProducts.length} products{query.trim() && ` for “${query.trim()}”`}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {hasFilters && <button onClick={resetFilters} className="flex items-center gap-1 text-[#088178]">Clear filters<X size={11} /></button>}
                    <select aria-label="Filter by brand" value={brand} onChange={event => setBrand(event.target.value)} className="max-w-[145px] rounded-full border border-[#e2e8e4] bg-white py-2 pr-6 pl-3 text-[9px] text-[#6d7e73]"><option value="All Products">All brands</option>{brands.map(item => <option key={item}>{item}</option>)}</select>
                    <select aria-label="Sort products" value={sort} onChange={event => setSort(event.target.value as typeof sort)} className="rounded-full border border-[#e2e8e4] bg-white py-2 pr-6 pl-3 text-[9px] text-[#6d7e73]"><option value="featured">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name: A to Z</option></select>
                  </div>
                </div>
                <div className="storefront-product-grid grid grid-cols-3 gap-x-4 gap-y-5 max-[1100px]:gap-x-3 max-[580px]:grid-cols-2 max-[580px]:gap-x-2">
                  {filteredProducts.map(product => <ProductCard key={product.id} product={product} saved={saved.includes(product.id)} quantity={cart[product.id] || 0} onSave={() => toggleSaved(product.id)} onOpen={() => openProduct(product)} onAdd={() => addToCart(product)} />)}
                </div>
                {filteredProducts.length === 0 && <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-xl bg-white p-7 text-center"><Search size={27} className="text-[#9ab8a8]" /><h3 className="text-lg font-medium">{savedOnly ? 'No saved favorites in this store yet' : 'No matching products found'}</h3><p className="mb-2 text-[11px] text-[#8a9991]">Try another search or explore more of this store.</p><PillButton onClick={resetFilters}>View all products</PillButton></div>}
                <p className="mt-5 text-right text-[8px] text-[#9ca69f]">Demo products & prices · VND</p>
              </div>
            </div>
          </div>
        </section>

        {bundles.length > 0 && <section id="shop-pairs" aria-labelledby="shop-pairs-title" className={`${containerClass} scroll-mt-5 pt-10 max-[580px]:pt-7`}>
          <div className="mb-5 flex items-center justify-between gap-3"><div><span className="text-[8px] tracking-[1.2px] text-[#088178]">GOOD THINGS GO TOGETHER</span><h2 id="shop-pairs-title" className="mt-2 text-[25px] font-[650] tracking-[-0.7px] max-[580px]:text-[22px]">A little more to love.</h2></div><span className="text-[9px] text-[#8a9991] max-[580px]:max-w-20 max-[580px]:text-right">Picks from your store</span></div>
          <div className="grid grid-cols-2 gap-4 max-[580px]:grid-cols-1 max-[580px]:gap-3">{bundles.map((items, index) => <article key={`${selectedStore.id}-${index}`} className={`storefront-bundle-card flex items-center justify-between gap-4 overflow-hidden rounded-xl p-5 max-[800px]:p-4 ${index === 0 ? 'bg-[#edf5e8]' : 'bg-[#fcf1e6]'}`}>
            <div className="min-w-0"><p className="text-[8px] text-[#7f9587]">YOUR EVERYDAY PAIR</p><h3 className="mt-2 max-w-[210px] text-sm leading-[1.5] font-semibold max-[800px]:text-xs">{items.map(item => item.name).join(' + ')}</h3><strong className="mt-2 block text-sm text-[#2f6450]">{money(items.reduce((sum, item) => sum + item.priceVnd, 0))}</strong><button onClick={() => items.forEach(addToCart)} className="mt-4 flex items-center gap-3 rounded-full bg-[#088178] py-2 pr-2 pl-3 text-[9px] text-white hover:bg-[#06685f]">Add both<span className="grid size-5 place-items-center rounded-full bg-white text-[#088178]"><ArrowUpRight size={12} /></span></button></div>
            <div className="flex shrink-0 items-center gap-1">{items.map(item => <div key={item.id} className="grid h-28 w-16 place-items-center rounded-xl bg-white/55 p-2 max-[1100px]:h-24 max-[1100px]:w-12">{item.image ? <img className="size-full object-contain" src={item.image} alt={item.name} loading="lazy" /> : <Store className="text-[#a3b3a9]" />}</div>)}</div>
          </article>)}</div>
        </section>}
      </main>

      <footer className="bg-[#032724] py-7 text-[#b8d0c4] max-[580px]:pb-24">
        <div className={`${containerClass} flex items-center justify-between gap-6 max-[580px]:flex-col max-[580px]:items-start max-[580px]:gap-4`}>
          <a href="/customer-home" onClick={event => { event.preventDefault(); onHome(); }} className="inline-flex items-center gap-2 text-xl font-bold tracking-[-0.8px] text-[#e3f0e7]"><AppLogo className="size-7" variant="system-contrast" />{APP_BRAND.name}</a>
          <p className="text-[10px] leading-relaxed text-[#83a79b]">Many stores. One place for your everyday favorites.<br /><span className="text-[8px]">Shopping preview · No payment is collected.</span></p>
          <button onClick={onHome} className="flex items-center gap-2 text-[10px] hover:text-white">Back to Home<ArrowRight size={14} /></button>
        </div>
      </footer>

      {cartCount > 0 && <button onClick={openCart} className="fixed inset-x-4 bottom-4 z-20 hidden items-center justify-between gap-3 rounded-full bg-[#088178] py-3 pr-4 pl-3 text-white shadow-lg max-[580px]:flex" aria-label={`View cart (${cartCount})`}><span className="flex items-center gap-2 text-[11px]"><span className="grid size-7 place-items-center rounded-full bg-white/15"><ShoppingCart size={15} /></span>View cart ({cartCount})</span><span className="flex items-center gap-2 text-xs font-semibold">{money(cartTotal)}<ArrowUpRight size={15} /></span></button>}
      {notice && <div role="status" className="fixed bottom-6 left-1/2 z-40 flex w-max max-w-[calc(100%_-_32px)] -translate-x-1/2 items-center gap-2.5 rounded-xl bg-[#032724] px-4 py-3.5 text-xs text-white shadow-lg max-[580px]:bottom-20 max-[580px]:text-[10px]"><Check size={16} className="shrink-0 text-[#91d3b7]" /><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice('')} className="ml-1 text-[#96b4a5]"><X size={14} /></button></div>}

      <CustomerShoppingDialog dialogRef={dialogRef} dialogMode={dialogMode} selectedProduct={selectedProduct} storeName={selectedStore.englishName} cart={cart} cartProducts={cartProducts} cartCount={cartCount} cartTotal={cartTotal} saved={saved} addToCart={addToCart} toggleSaved={toggleSaved} updateQuantity={updateQuantity} closeDialog={closeDialog} onCartAction={completeDemoOrder} scrollTo={scrollTo} cartActionLabel="Complete demo order" />
      <dialog ref={receiptRef} aria-labelledby="demo-receipt-title" className="fixed inset-0 m-auto max-h-[90dvh] w-[min(460px,calc(100%_-_32px))] overflow-auto rounded-[18px] border-0 bg-white p-7 text-[#212529] shadow-xl backdrop:bg-[#03272470] backdrop:backdrop-blur-[4px]" onClick={event => { if (event.target === event.currentTarget) receiptRef.current?.close(); }}>
        <button aria-label="Close order summary" onClick={() => receiptRef.current?.close()} className="absolute top-3 right-3 rounded-full p-1 text-[#8a9991]"><X size={20} /></button>
        {receipt && <><span className="mx-auto mt-2 grid size-12 place-items-center rounded-full bg-[#edf7f1] text-[#088178]"><CheckCircle2 size={26} /></span><h2 id="demo-receipt-title" className="mt-4 text-center text-2xl font-semibold tracking-[-0.7px]">Demo order complete</h2><p className="mt-2 text-center text-[10px] leading-relaxed text-[#8a9991]">This was a shopping preview. No real order or payment was created.</p><div className="mt-5 rounded-xl bg-[#f5f8f5] p-4"><span className="text-[8px] text-[#8a9991]">{receipt.id}</span><h3 className="mt-1 text-xs font-semibold text-[#2f6450]">{receipt.storeName}</h3><div className="my-4 space-y-3 border-y border-[#e2ebe5] py-4">{receipt.items.map(({ product, quantity }) => <div key={product.id} className="flex justify-between gap-4 text-[10px]"><span>{product.name} × {quantity}</span><strong className="shrink-0 font-medium">{money(product.priceVnd * quantity)}</strong></div>)}</div><div className="flex items-center justify-between gap-4 text-xs"><span>Total</span><strong className="text-lg text-[#088178]">{money(receipt.total)}</strong></div></div><button onClick={() => receiptRef.current?.close()} className="mt-5 w-full rounded-full bg-[#088178] py-3 text-[11px] text-white hover:bg-[#06685f]">Continue shopping</button></>}
      </dialog>
    </div>
  );
}
