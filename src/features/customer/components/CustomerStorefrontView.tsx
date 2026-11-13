import { ArrowRight, Check, Heart, Leaf, Package, Search, ShoppingBag, SlidersHorizontal, X } from 'lucide-react';
import type { AuthUser } from '../../../services/authService';
import type { ProductItem } from '../customer.types';
import { APP_BRAND } from '../../../app/branding';
import { CUSTOMER_STORES } from '../data/customerStores';
import { formatCustomerPrice as money } from '../data/customerCatalog';
import { useCustomerStorefront } from '../hooks/useCustomerStorefront';
import type { CustomerStorefrontSource } from '../hooks/useActiveStorefront';
import { CustomerHeader } from './CustomerHeader';
import { CustomerShoppingDialog } from './CustomerShoppingDialog';
import { ProductCard } from './CustomerCommerce';
import { GroupDetail, ProductRecommendations, StorefrontLayoutRenderer } from './StorefrontMerchandising';
import '../storefront.css';

interface CustomerStorefrontViewProps {
  productsByStore?: Record<string, ProductItem[]>;
  source?: CustomerStorefrontSource;
  user?: AuthUser | null;
  onLogout: () => void;
  onProfile: () => void;
  onHome: () => void;
  onLogin: () => void;
  onRegister?: () => void;
  onExplore?: () => void;
}

export function CustomerStorefrontView({ productsByStore, source, user, onLogout, onProfile, onHome, onLogin, onRegister, onExplore }: CustomerStorefrontViewProps) {
  const shop = useCustomerStorefront(productsByStore, source);
  const { selectedStore, storeProducts, categories, brands, active, query, setQuery, category, setCategory, brand, setBrand,
    saved, savedOnly, sort, setSort, filteredProducts, hasFilters, resetFilters, chooseStore, toggleSavedOnly,
    cart, cartProducts, cartCount, cartTotal, addToCart, updateQuantity, toggleSaved,
    selectedProduct, dialogMode, dialogRef, openProduct, openCart, closeDialog,
    receipt, receiptRef, completeDemoOrder, notice, setNotice, scrollTo, addGroup, openGroup, selectedGroup, groupRef } = shop;
  const demo = !source;
  const currentProduct = storeProducts.find(product => product.id === selectedProduct?.id) ?? null;
  return <div className="customer-storefront sf-root" lang="vi">
    <a className="sf-skip" href="#shop-main">Đến nội dung chính</a>
    <CustomerHeader query={query} setQuery={setQuery} onSearch={() => scrollTo()} savedCount={saved.length} savedOnly={savedOnly} toggleSavedOnly={toggleSavedOnly} cartCount={cartCount} openCart={openCart} onLogin={onLogin} onHome={onHome} user={user} onProfile={onProfile} onLogout={onLogout} demo={demo} />
    <nav className="sf-nav sf-wrap" aria-label="Điều hướng cửa hàng">
      <a href="#shop-products">Sản phẩm</a>{onExplore && <button onClick={onExplore}>Mua sắm</button>}<a href="#shop-stores">Cửa hàng</a>
      {active.layout && <a href="#shop-merchandising">Gợi ý kết hợp</a>}
      {onRegister && !user && <button onClick={onRegister}>Đăng ký</button>}
      <span className="sf-nav-note"><Leaf size={16} />Cho căn bếp mỗi ngày</span>
    </nav>
    <main id="shop-main">
      <div className="sf-store-context sf-wrap"><span>Cửa hàng / <strong>{selectedStore.name}</strong></span><label>Chọn cửa hàng<select value={selectedStore.id} onChange={e => chooseStore(e.target.value)}>{CUSTOMER_STORES.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label></div>
      {(!active.layout?.placements.some(item => item.type === 'BANNER')) && <section className="sf-hero sf-wrap" aria-labelledby="sf-hero-title">
        <div className="sf-hero-copy"><span className="sf-eyebrow">THỰC PHẨM & ĐỒ DÙNG HẰNG NGÀY</span><h1 id="sf-hero-title">Một giỏ đầy.<br /><em>Một bữa ngon.</em></h1><p>Tìm những món cần cho căn bếp của bạn tại {selectedStore.name}.</p><button className="sf-button" onClick={() => { resetFilters(); scrollTo(); }}>Khám phá sản phẩm<ArrowRight size={18} /></button></div>
        <div className="sf-hero-image"><img src="/images/customer-home/fresh/grocery-basket.png" alt="Giỏ rau củ minh họa" fetchPriority="high" width="650" height="600" /><span>Rau củ · Trái cây · Thực phẩm</span></div>
      </section>}
      {active.layout?.placements.some(item => item.type === 'BANNER') && <h1 className="sf-wrap sf-page-title">Thực phẩm cho căn bếp của bạn</h1>}
      <div id="shop-merchandising" className="sf-wrap sf-merchandising">
        {active.status === 'loading' && <p role="status" className="sf-status">Đang cập nhật gợi ý của cửa hàng…</p>}
        {active.status === 'error' && <div role="alert" className="sf-status">Chưa tải được gợi ý của cửa hàng. <button onClick={active.refresh}>Thử lại</button></div>}
        <StorefrontLayoutRenderer layout={active.layout} products={storeProducts} cart={cart} onAddGroup={addGroup} onOpenGroup={openGroup} onOpenProduct={openProduct} />
      </div>
      <section className="sf-catalog" id="shop-products" aria-labelledby="shop-products-title"><div className="sf-wrap">
        <div className="sf-section-head"><div><span className="sf-eyebrow">CHỌN MÓN BẠN CẦN</span><h2 id="shop-products-title">{savedOnly ? 'Sản phẩm đã lưu' : 'Ghé chợ hôm nay'}</h2></div><p>{filteredProducts.length} sản phẩm tại {selectedStore.name}</p></div>
        <div className="sf-categories" aria-label="Danh mục sản phẩm">{categories.map(item => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item === 'All Products' ? 'Tất cả sản phẩm' : item}</button>)}</div>
        <div className="sf-toolbar"><span><SlidersHorizontal size={17} />Lọc sản phẩm</span><div><label className="sr-only" htmlFor="sf-brand">Thương hiệu</label><select id="sf-brand" value={brand} onChange={e => setBrand(e.target.value)}><option value="All Products">Tất cả thương hiệu</option>{brands.map(item => <option key={item}>{item}</option>)}</select><label className="sr-only" htmlFor="sf-sort">Sắp xếp</label><select id="sf-sort" value={sort} onChange={e => setSort(e.target.value as typeof sort)}><option value="featured">Thứ tự mặc định</option><option value="price-asc">Giá tăng dần</option><option value="price-desc">Giá giảm dần</option><option value="name">Tên A–Z</option></select></div></div>
        {hasFilters && <div className="sf-filter-status" role="status"><span>{query && `Kết quả cho “${query}”`}</span><button onClick={resetFilters}>Xóa bộ lọc<X size={16} /></button></div>}
        <div className="sf-product-grid">{filteredProducts.map(product => <ProductCard key={product.id} product={product} saved={saved.includes(product.id)} quantity={cart[product.id] || 0} onSave={() => toggleSaved(product.id)} onOpen={() => openProduct(product)} onAdd={() => addToCart(product)} />)}</div>
        {!filteredProducts.length && <div className="sf-empty"><Search size={32} /><h3>{active.status === 'loading' ? 'Đang tải sản phẩm…' : 'Chưa có sản phẩm phù hợp'}</h3><p>Thử đổi từ khóa hoặc chọn danh mục khác.</p>{hasFilters && <button className="sf-button" onClick={resetFilters}>Xem tất cả sản phẩm</button>}</div>}
        {demo && <p className="sf-demo-note">Danh mục, giá và tồn kho minh họa. Giỏ hàng dùng thử, chưa hỗ trợ đặt hàng hoặc thanh toán.</p>}
      </div></section>
      <section id="shop-stores" className="sf-wrap sf-stores" aria-labelledby="sf-stores-title"><div className="sf-section-head"><div><span className="sf-eyebrow">CHỌN NƠI MUA SẮM</span><h2 id="sf-stores-title">Cửa hàng của bạn</h2></div></div><div className="sf-store-grid">{CUSTOMER_STORES.map(store => <button key={store.id} aria-pressed={store.id === selectedStore.id} onClick={() => { chooseStore(store.id); scrollTo(); }}><img src={store.logo} alt="" width="48" height="48" loading="lazy" /><span><strong>{store.name}</strong><small>{store.area}</small></span>{store.id === selectedStore.id && <Check size={18} />}</button>)}</div></section>
    </main>
    <footer className="sf-footer"><div className="sf-wrap"><div><strong>{APP_BRAND.name}</strong><p>Thực phẩm và đồ dùng cho mỗi ngày.</p></div><a href="#shop-products">Tiếp tục mua sắm<ArrowRight size={18} /></a></div></footer>
    {cartCount > 0 && <button className="sf-mobile-cart sf-button" onClick={openCart}><span><ShoppingBag size={18} />Giỏ hàng ({cartCount})</span><strong>{money(cartTotal)}</strong></button>}
    {notice && <div role="status" className="sf-toast"><Check size={18} /><span>{notice}</span><button aria-label="Đóng thông báo" onClick={() => setNotice('')}><X size={18} /></button></div>}
    <CustomerShoppingDialog dialogRef={dialogRef} dialogMode={dialogMode} selectedProduct={currentProduct} storeName={selectedStore.name} cart={cart} cartProducts={cartProducts} cartCount={cartCount} cartTotal={cartTotal} saved={saved} addToCart={addToCart} toggleSaved={toggleSaved} updateQuantity={updateQuantity} closeDialog={closeDialog} onCartAction={completeDemoOrder} scrollTo={scrollTo} cartActionLabel="Hoàn tất giỏ dùng thử" demo={demo}>
      {currentProduct && active.layout && <ProductRecommendations key={`${active.layout.id}-${active.layout.version}-${currentProduct.id}`} layout={active.layout} productId={currentProduct.id} products={storeProducts} cart={cart} onAddGroup={addGroup} onOpenProduct={openProduct} />}
    </CustomerShoppingDialog>
    <dialog ref={groupRef} aria-labelledby="sf-group-title" className="sf-dialog sf-group-dialog"><button className="sf-close" aria-label="Đóng chi tiết nhóm" onClick={() => groupRef.current?.close()}><X /></button>{selectedGroup && <><h2 id="sf-group-title">{selectedGroup.title}</h2><GroupDetail placement={selectedGroup} products={storeProducts} cart={cart} onAddGroup={addGroup} onOpenProduct={openProduct} /></>}</dialog>
    <dialog ref={receiptRef} aria-labelledby="sf-receipt-title" className="sf-dialog"><button className="sf-close" aria-label="Đóng tóm tắt" onClick={() => receiptRef.current?.close()}><X /></button>{receipt && <><Package size={32} /><h2 id="sf-receipt-title">Đã hoàn tất giỏ dùng thử</h2><p>Chưa tạo đơn hàng hoặc thu tiền.</p>{receipt.items.map(({product,quantity}) => <p key={product.id} className="sf-total"><span>{product.name} × {quantity}</span><strong>{money(product.priceVnd * quantity)}</strong></p>)}<p className="sf-total"><span>Tổng cộng</span><strong>{money(receipt.total)}</strong></p><button className="sf-button" onClick={() => receiptRef.current?.close()}>Tiếp tục mua sắm</button></>}</dialog>
  </div>;
}
