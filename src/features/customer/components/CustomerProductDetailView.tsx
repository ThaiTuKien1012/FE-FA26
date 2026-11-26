import { useCallback, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Heart, Minus, Package, Plus, ShoppingCart, Store } from 'lucide-react';
import { APP_BRAND } from '../../../app/branding';
import { AppLogo } from '../../../components/common/AppLogo';
import { AvatarDropdown } from '../../../components/common/AvatarDropdown';
import { CustomerApiError, customerApi, isStoreSlug } from '../customer.api';
import { formatCustomerMoney as money } from '../customerMoney';
import { unitLabel } from '../data/customerLocale';
import { useCustomerCart } from '../hooks/useCustomerCart';
import { useCustomerResource } from '../hooks/useCustomerResource';
import { useSavedCustomerProducts } from '../hooks/useSavedCustomerProducts';
import { CustomerCartDialog } from './CustomerCartDialog';
import { containerClass } from './CustomerCommerce';
import { type CustomerNavigation, StoreMessage } from './CustomerStorefrontView';

interface Props extends CustomerNavigation {
  storeSlug: string | null;
  productId: string | null;
}

export function CustomerProductDetailView({ storeSlug, productId, user, onBack, onHome, onStore,
  onLogin, onProfile, onLogout }: Props & { onBack: () => void }) {
  const id = /^\d+$/.test(productId ?? '') ? Number(productId) : 0;
  const valid = isStoreSlug(storeSlug) && id > 0 && id <= 2147483647;
  const loadProduct = useCallback((signal: AbortSignal) => valid && storeSlug
    ? customerApi.product(storeSlug, id, signal) : Promise.reject(new CustomerApiError(404)), [valid, storeSlug, id]);
  const stores = useCustomerResource(customerApi.stores);
  const result = useCustomerResource(loadProduct);
  const product = result.data;
  const cart = useCustomerCart(product && storeSlug ? storeSlug : '', user);
  const storeName = stores.data?.find(store => store.storeSlug === storeSlug)?.name ?? cart.cart?.store.name ?? 'Cửa hàng';
  const { saved, toggle } = useSavedCustomerProducts();
  const savedKey = `${storeSlug}/${id}`;
  const [quantity, setQuantity] = useState(1);
  const dialog = useRef<HTMLDialogElement>(null);
  const openCart = () => user ? dialog.current?.showModal() : onLogin();
  return <div className="min-h-dvh bg-[#f7f9f7] text-[#212d27]" lang="vi">
    <div className="border-b border-[#e7eeea] bg-white">
      <div className={`${containerClass} flex min-h-19 items-center justify-between gap-4 max-[580px]:min-h-16`}>
        <button onClick={onHome} className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#088178] max-[580px]:text-lg"><AppLogo className="size-8 max-[580px]:size-7" />{APP_BRAND.name}</button>
        <div className="flex items-center gap-3 max-[580px]:gap-2">
          <button onClick={onBack} className="flex items-center gap-1 rounded-full border border-[#e2ebe5] px-3 py-2 text-xs text-[#4d6658] hover:bg-[#f4f8f5]"><ArrowLeft size={15} />Quay lại</button>
          {product && <button onClick={openCart} aria-label={`Mở giỏ hàng (${cart.count})`} className="relative rounded-full border border-[#e2ebe5] p-2.5 text-[#088178] hover:bg-[#f4f8f5]">
            <ShoppingCart size={19} />{cart.count > 0 && <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-[#e85d4a] text-[9px] text-white">{cart.count}</span>}
          </button>}
          {user ? <AvatarDropdown user={user} onProfile={onProfile} onLogout={onLogout} />
            : <button onClick={onLogin} className="rounded-full bg-[#e7f5ed] px-4 py-2 text-xs font-semibold text-[#087960]">Đăng nhập</button>}
        </div>
      </div>
    </div>
    <main className={`${containerClass} py-6 pb-16`}>
      {result.loading && <p role="status">Đang tải sản phẩm…</p>}
      {result.error && <StoreMessage
        text={result.error.status === 404 ? 'Không tìm thấy sản phẩm tại cửa hàng này.' : result.error.message}
        retry={result.error.status === 404 ? undefined : result.reload} />}
      {product && <>
        <nav aria-label="Đường dẫn" className="mb-5 flex flex-wrap items-center gap-2 text-xs text-[#718378]">
          <button onClick={() => onStore(storeSlug)} className="hover:text-[#088178]">{storeName}</button><span>/</span><span>{product.name}</span>
        </nav>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>{product.category?.name && <p className="text-xs font-medium text-[#088178]">{product.category.name}</p>}
            <h1 className="mt-1 text-3xl font-semibold tracking-tight max-[580px]:text-2xl">{product.name}</h1></div>
          <button onClick={() => toggle(savedKey)} aria-pressed={saved.includes(savedKey)} className="flex items-center gap-2 rounded-full border border-[#e2ebe5] bg-white px-4 py-2 text-xs text-[#657a6b]">
            <Heart size={16} fill={saved.includes(savedKey) ? 'currentColor' : 'none'} />{saved.includes(savedKey) ? 'Đã lưu' : 'Lưu sản phẩm'}
          </button>
        </div>
        <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(330px,.95fr)] gap-5 max-[900px]:grid-cols-1">
          <section className="rounded-2xl border border-[#e8eeea] bg-white p-5 max-[580px]:p-3" aria-label="Ảnh sản phẩm">
            <div className="grid min-h-[465px] place-items-center rounded-xl bg-[#f6f8f6] p-10 max-[580px]:min-h-[320px] max-[580px]:p-6">
              {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="max-h-[410px] w-full object-contain max-[580px]:max-h-[290px]" />
                : <Package className="size-16 text-[#9daea5]" aria-label="Chưa có ảnh sản phẩm" />}
            </div>
          </section>
          <section className="space-y-4" aria-label="Thông tin mua hàng">
            <div className="rounded-2xl border border-[#e8eeea] bg-white p-6 max-[580px]:p-5">
              <div className="rounded-xl bg-[#fff3f0] p-5">
                <strong className="text-4xl font-bold tracking-tight text-[#dd5947] max-[580px]:text-3xl">{money(product.sellingPrice)}</strong>
                <p className="mt-2 text-xs text-[#9b746c]">Giá theo {unitLabel(product.unit)}</p>
              </div>
              <p className="mt-5 rounded-xl border border-[#e2ebe5] p-4 text-sm text-[#146b52]">{product.availability === 'AVAILABLE' ? 'Còn hàng' : 'Hết hàng'}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3"><span className="text-sm font-medium">Số lượng</span>
                <div className="flex items-center overflow-hidden rounded-lg border border-[#dce6df]">
                  <button onClick={() => setQuantity(quantity - 1)} disabled={quantity <= 1} className="p-3 disabled:opacity-40" aria-label="Giảm số lượng"><Minus size={16} /></button>
                  <span className="min-w-10 text-center text-sm font-semibold">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} disabled={quantity >= 99 || product.availability !== 'AVAILABLE'} className="p-3 disabled:opacity-40" aria-label="Tăng số lượng"><Plus size={16} /></button>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-[1fr_auto] gap-3 max-[580px]:grid-cols-1">
                <button onClick={() => user ? void cart.mutate({ kind: 'add', productId: id, quantity }) : onLogin()}
                  disabled={product.availability !== 'AVAILABLE' || cart.blocked}
                  className="flex min-h-13 items-center justify-center gap-2 rounded-xl bg-[#088178] px-6 text-sm font-semibold text-white hover:bg-[#066c66] disabled:opacity-50"><ShoppingCart size={18} />Thêm vào giỏ</button>
                <button onClick={openCart} className="flex min-h-13 items-center justify-center gap-2 rounded-xl border border-[#088178] px-5 text-sm font-semibold text-[#088178] hover:bg-[#f1faf6]">Xem giỏ <ArrowRight size={16} /></button>
              </div>
              {cart.message && <p className="mt-3 text-xs text-[#167c63]" role="status">{cart.message}</p>}
            </div>
            <button onClick={() => onStore(storeSlug)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#d6e7dd] py-3 text-sm font-medium text-[#088178] hover:bg-[#f2faf5]"><Store size={16} />Đến {storeName} <ArrowRight size={15} /></button>
          </section>
        </div>
        {product.description && <section className="mt-8 rounded-2xl border border-[#e8eeea] bg-white p-6 max-[580px]:p-5" aria-labelledby="product-details-title">
          <h2 id="product-details-title" className="text-xl font-semibold">Thông tin sản phẩm</h2>
          <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#65796d]">{product.description}</p>
        </section>}
        <CustomerCartDialog dialogRef={dialog} storeName={cart.cart?.store.name ?? storeName} state={cart} onLogin={onLogin} />
      </>}
    </main>
  </div>;
}
