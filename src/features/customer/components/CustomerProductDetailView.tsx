import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Heart, MapPin, Minus, Plus, ShoppingCart, Star, Store } from 'lucide-react';
import { APP_BRAND } from '../../../app/branding';
import { AppLogo } from '../../../components/common/AppLogo';
import { AvatarDropdown } from '../../../components/common/AvatarDropdown';
import type { AuthUser } from '../../../services/authService';
import { CUSTOMER_PRODUCTS, formatCustomerPrice } from '../data/customerCatalog';
import { categoryLabel, unitLabel } from '../data/customerLocale';
import { CUSTOMER_STORES, rememberCustomerStore } from '../data/customerStores';
import { useCustomerShopping } from '../hooks/useCustomerShopping';
import { CustomerShoppingDialog } from './CustomerShoppingDialog';
import { ProductCard, containerClass } from './CustomerCommerce';

interface Props {
  productId: string | null;
  user: AuthUser | null;
  onBack: () => void;
  onHome: () => void;
  onStore: () => void;
  onProduct: (id: string) => void;
  onLogin: () => void;
  onProfile: () => void;
  onLogout: () => void;
}

export function CustomerProductDetailView({ productId, user, onBack, onHome, onStore, onProduct, onLogin, onProfile, onLogout }: Props) {
  const product = CUSTOMER_PRODUCTS.find(item => item.id === productId);
  const store = CUSTOMER_STORES.find(item => item.id === product?.storeId);
  const { storeCarts, saved, changeQuantity, toggleSaved } = useCustomerShopping();
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const oldTitle = document.title;
    document.title = product ? `${product.name} | ${APP_BRAND.name}` : `Không tìm thấy sản phẩm | ${APP_BRAND.name}`;
    return () => { document.title = oldTitle; };
  }, [product]);
  useEffect(() => { setQuantity(1); setNotice(''); }, [productId]);

  if (!product || !store) return (
    <main className="grid min-h-dvh place-items-center bg-[#f7f9f7] p-6 text-center">
      <div className="rounded-2xl bg-white p-10 shadow-sm"><h1 className="text-2xl font-semibold">Không tìm thấy sản phẩm</h1><p className="mt-2 text-sm text-[#78877f]">Sản phẩm này không có trong danh sách hiện tại.</p><button onClick={onHome} className="mt-6 rounded-xl bg-[#088178] px-5 py-3 text-sm font-semibold text-white">Về trang chủ</button></div>
    </main>
  );

  const cart = storeCarts[store.id] || {};
  const cartProducts = CUSTOMER_PRODUCTS.filter(item => item.storeId === store.id && cart[item.id] > 0);
  const cartCount = cartProducts.reduce((count, item) => count + cart[item.id], 0);
  const cartTotal = cartProducts.reduce((total, item) => total + item.priceVnd * cart[item.id], 0);
  const related = CUSTOMER_PRODUCTS.filter(item => item.storeId === store.id && item.id !== product.id)
    .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category)).slice(0, 4);
  const savedProduct = saved.includes(product.id);

  const addToCart = () => {
    if (product.stockQuantity < 1) return;
    changeQuantity(store.id, product.id, Math.min(quantity, Math.max(0, product.stockQuantity - (cart[product.id] || 0))));
    rememberCustomerStore(store.id);
    setNotice(`Đã thêm ${product.name} vào giỏ của ${store.name}`);
  };
  const visitStore = () => { rememberCustomerStore(store.id); onStore(); };

  return (
    <div className="min-h-dvh bg-[#f7f9f7] text-[#212d27]" lang="vi">
      <div className="border-b border-[#e7eeea] bg-white">
        <div className={`${containerClass} flex min-h-19 items-center justify-between gap-4 max-[580px]:min-h-16`}>
          <button onClick={onHome} className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#088178] max-[580px]:text-lg" aria-label="Trang chủ Storefone"><AppLogo className="size-8 max-[580px]:size-7" />{APP_BRAND.name}</button>
          <div className="flex items-center gap-3 max-[580px]:gap-2">
            <button onClick={onBack} className="flex items-center gap-1 rounded-full border border-[#e2ebe5] px-3 py-2 text-xs text-[#4d6658] hover:bg-[#f4f8f5]"><ArrowLeft size={15} />Quay lại</button>
            <button onClick={() => dialogRef.current?.showModal()} aria-label={`Mở giỏ của ${store.name}, ${cartCount} món`} className="relative rounded-full border border-[#e2ebe5] p-2.5 text-[#088178] hover:bg-[#f4f8f5]"><ShoppingCart size={19} />{cartCount > 0 && <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-[#e85d4a] text-[9px] text-white">{cartCount}</span>}</button>
            {user ? <AvatarDropdown user={user} onProfile={onProfile} onLogout={onLogout} /> : <button onClick={onLogin} className="rounded-full bg-[#e7f5ed] px-4 py-2 text-xs font-semibold text-[#087960]">Đăng nhập</button>}
          </div>
        </div>
      </div>

      <main className={`${containerClass} pb-16`}>
        <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-2 py-6 text-xs text-[#718378] max-[580px]:py-4">
          <button onClick={onHome} className="hover:text-[#088178]">Storefone</button><span>/</span>
          <button onClick={visitStore} className="hover:text-[#088178]">{store.name}</button><span>/</span>
          <span className="max-w-[220px] truncate font-medium text-[#273e33]">{product.name}</span>
        </nav>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-medium text-[#088178]">{product.brand} · {categoryLabel(product.category)}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight max-[580px]:text-2xl">{product.name}</h1></div>
          <button onClick={() => toggleSaved(product.id)} aria-pressed={savedProduct} className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs ${savedProduct ? 'border-[#f3cdc8] bg-[#fff1ee] text-[#ce5a4b]' : 'border-[#e2ebe5] bg-white text-[#657a6b]'}`}><Heart size={16} fill={savedProduct ? 'currentColor' : 'none'} />{savedProduct ? 'Đã lưu' : 'Lưu sản phẩm'}</button>
        </div>

        <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(330px,.95fr)] gap-5 max-[900px]:grid-cols-1">
          <section className="rounded-2xl border border-[#e8eeea] bg-white p-5 max-[580px]:p-3" aria-label="Ảnh sản phẩm">
            <div className="relative grid min-h-[465px] place-items-center rounded-xl bg-[#f6f8f6] p-10 max-[580px]:min-h-[320px] max-[580px]:p-6">
              {product.discountPercent && <span className="absolute left-5 top-5 rounded-full bg-[#e85d4a] px-3 py-1.5 text-xs font-bold text-white">-{product.discountPercent}%</span>}
              <img src={product.image} alt={product.name} className="max-h-[410px] w-full object-contain drop-shadow-[0_16px_20px_#1c382518] max-[580px]:max-h-[290px]" />
            </div>
            <div className="mt-4 flex items-center gap-3"><div className="grid size-16 place-items-center rounded-lg border-2 border-[#088178] bg-[#f7faf8] p-1"><img src={product.image} alt="" className="size-full object-contain" /></div><p className="text-xs text-[#8a9890]">1 ảnh sản phẩm</p></div>
          </section>

          <section className="space-y-4" aria-label="Thông tin mua hàng">
            <div className="rounded-2xl border border-[#e8eeea] bg-white p-6 max-[580px]:p-5">
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#75877b]"><span className="flex items-center gap-1 text-[#d89624]"><Star size={16} fill="currentColor" />{product.rating?.toFixed(1) || '—'}</span><span>Đánh giá minh họa</span><span>·</span><span>{product.soldCount || 0} lượt mua minh họa</span><span>·</span><span>SKU: {product.sku}</span></div>
              <div className="mt-5 rounded-xl bg-[#fff3f0] p-5"><p className="text-xs font-medium uppercase tracking-wider text-[#c75d4f]">Giá minh họa</p><div className="mt-2 flex flex-wrap items-baseline gap-3"><strong className="text-4xl font-bold tracking-tight text-[#dd5947] max-[580px]:text-3xl">{formatCustomerPrice(product.priceVnd)}</strong>{product.originalPriceVnd && product.originalPriceVnd > product.priceVnd && <del className="text-lg text-[#9d9d99]">{formatCustomerPrice(product.originalPriceVnd)}</del>}</div><p className="mt-2 text-xs text-[#9b746c]">Giá tại {store.name} · theo {unitLabel(product.unit)}</p></div>
              <div className="mt-5 flex items-center justify-between rounded-xl border border-[#e2ebe5] p-4"><div><p className="text-xs text-[#6c8174]">Tồn kho tại cửa hàng</p><strong className="mt-1 block text-sm text-[#146b52]">{product.stockQuantity > 0 ? `${product.stockQuantity} ${unitLabel(product.unit)} (minh họa)` : 'Hết hàng'}</strong></div><Check className="text-[#168267]" size={20} /></div>
              <div className="mt-6 flex flex-wrap items-center gap-3"><span className="text-sm font-medium">Số lượng</span><div className="flex items-center overflow-hidden rounded-lg border border-[#dce6df]"><button onClick={() => setQuantity(value => Math.max(1, value - 1))} disabled={quantity <= 1} className="p-3 disabled:opacity-40" aria-label="Giảm số lượng"><Minus size={16} /></button><span className="min-w-10 text-center text-sm font-semibold">{quantity}</span><button onClick={() => setQuantity(value => Math.min(product.stockQuantity, value + 1))} disabled={quantity >= product.stockQuantity} className="p-3 disabled:opacity-40" aria-label="Tăng số lượng"><Plus size={16} /></button></div></div>
              <div className="mt-6 grid grid-cols-[1fr_auto] gap-3 max-[580px]:grid-cols-1"><button onClick={addToCart} disabled={product.stockQuantity < 1 || (cart[product.id] || 0) >= product.stockQuantity} className="flex min-h-13 items-center justify-center gap-2 rounded-xl bg-[#088178] px-6 text-sm font-semibold text-white hover:bg-[#066c66] disabled:cursor-not-allowed disabled:opacity-50"><ShoppingCart size={18} />Thêm vào giỏ</button><button onClick={() => dialogRef.current?.showModal()} className="flex min-h-13 items-center justify-center gap-2 rounded-xl border border-[#088178] px-5 text-sm font-semibold text-[#088178] hover:bg-[#f1faf6]">Xem giỏ <ArrowRight size={16} /></button></div>
              {notice && <p className="mt-3 text-xs text-[#167c63]" role="status">{notice}</p>}
            </div>

            <div className="rounded-2xl border border-[#e8eeea] bg-white p-5"><p className="mb-3 text-xs uppercase tracking-widest text-[#82948a]">Cửa hàng bán</p><div className="flex items-center gap-4"><img src={store.logo} alt="" className="size-14 rounded-xl bg-[#f2f8f4] p-1" /><div className="min-w-0 flex-1"><strong className="block text-sm">{store.name}</strong><span className="mt-1 flex items-center gap-1 text-xs text-[#809087]"><MapPin size={13} />{store.area} · {store.address}</span></div></div><button onClick={visitStore} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#d6e7dd] py-3 text-sm font-medium text-[#088178] hover:bg-[#f2faf5]"><Store size={16} />Đến cửa hàng <ArrowRight size={15} /></button></div>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-[#e8eeea] bg-white p-6 max-[580px]:p-5" aria-labelledby="product-details-title"><h2 id="product-details-title" className="text-xl font-semibold">Thông tin sản phẩm</h2><dl className="mt-4 grid grid-cols-[180px_1fr] gap-y-3 text-sm max-[580px]:grid-cols-[110px_1fr]"><dt className="text-[#839189]">Thương hiệu</dt><dd>{product.brand}</dd><dt className="text-[#839189]">Danh mục</dt><dd>{categoryLabel(product.category)}</dd><dt className="text-[#839189]">Đơn vị</dt><dd>{unitLabel(product.unit)}</dd><dt className="text-[#839189]">SKU</dt><dd>{product.sku}</dd><dt className="text-[#839189]">Cửa hàng</dt><dd>{store.name}</dd></dl><p className="mt-5 border-t border-[#edf1ee] pt-4 text-xs leading-6 text-[#798a7e]">Dữ liệu minh họa của Storefone. Ảnh, giá, tồn kho và lượt mua chỉ phục vụ bản xem thử; chưa hỗ trợ thanh toán hoặc giao hàng thật.</p></section>

        {related.length > 0 && <section className="mt-10" aria-labelledby="related-title"><div className="mb-5 flex items-end justify-between gap-3"><h2 id="related-title" className="text-2xl font-semibold max-[580px]:text-xl">Thêm sản phẩm từ {store.name}</h2><button onClick={visitStore} className="inline-flex items-center gap-1 text-xs text-[#088178]">Xem cửa hàng <ArrowRight size={14} /></button></div><div className="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[580px]:gap-2">{related.map(item => <ProductCard key={item.id} product={item} saved={saved.includes(item.id)} quantity={cart[item.id] || 0} onSave={() => toggleSaved(item.id)} onOpen={() => onProduct(item.id)} onAdd={() => changeQuantity(store.id, item.id, 1)} />)}</div></section>}
      </main>

      <CustomerShoppingDialog dialogRef={dialogRef} dialogMode="cart" selectedProduct={null} storeName={store.name} cart={cart} cartProducts={cartProducts} cartCount={cartCount} cartTotal={cartTotal} saved={saved} addToCart={item => changeQuantity(store.id, item.id, 1)} toggleSaved={toggleSaved} updateQuantity={(id, difference) => changeQuantity(store.id, id, difference)} closeDialog={() => dialogRef.current?.close()} onCartAction={visitStore} scrollTo={() => visitStore()} />
    </div>
  );
}
