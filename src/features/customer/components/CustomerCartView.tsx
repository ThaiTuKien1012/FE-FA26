import { ArrowLeft, ArrowRight, ShoppingBag, Store } from 'lucide-react';
import { customerApi, isStoreSlug } from '../customer.api';
import { customerCartPath } from '../customerRoutes';
import { useCustomerCart } from '../hooks/useCustomerCart';
import { useCustomerResource } from '../hooks/useCustomerResource';
import { CustomerHeader } from './CustomerHeader';
import { CustomerCartContents } from './CustomerCartContents';
import { containerClass } from './CustomerCommerce';
import { StoreImage, StoreMessage, type CustomerNavigation } from './CustomerStorefrontView';

export function CustomerCartView({ storeSlug, ...navigation }: CustomerNavigation & { storeSlug: string | null }) {
  const stores = useCustomerResource(customerApi.stores);
  const valid = isStoreSlug(storeSlug);
  const cart = useCustomerCart(valid ? storeSlug : '', navigation.user);
  const selected = stores.data?.find(store => store.storeSlug === storeSlug) ?? cart.cart?.store;
  const customer = navigation.user?.role === 'End-Customer';
  return <div className="min-h-dvh bg-[#f7f9f7] text-[#212d27]" lang="vi">
    <div className="bg-white"><CustomerHeader {...navigation} query="" savedCount={0} savedOnly={false} cartCount={cart.count} showSignInLabel /></div>
    <main className={`${containerClass} py-7 pb-16`}>
      <button onClick={() => valid ? navigation.onStore(storeSlug) : navigation.onHome()} className="mb-6 flex items-center gap-2 text-sm text-[#088178]"><ArrowLeft size={16} />Tiếp tục mua sắm</button>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#088178]">Mua sắm của bạn</p><h1 className="text-3xl font-semibold tracking-tight">Giỏ hàng</h1><p className="mt-2 text-sm text-[#65796d]">Mỗi cửa hàng có một giỏ hàng riêng.</p></div>
        {selected && <div className="flex items-center gap-3 rounded-xl border border-[#e2ebe5] bg-white px-4 py-3">
          <StoreImage key={selected.iconUrl} src={selected.iconUrl} alt="" className="size-9 rounded-lg object-cover" fallback={<Store size={24} className="text-[#088178]" />} /><span className="font-semibold">{selected.name}</span>
        </div>}
      </div>
      {!valid ? <section className="rounded-2xl border border-[#e2ebe5] bg-white p-6"><h2 className="mb-4 text-lg font-semibold">Chọn cửa hàng để xem giỏ</h2>
        {stores.loading && <p role="status">Đang tải cửa hàng…</p>}
        {stores.error && <StoreMessage text={stores.error.message} retry={stores.reload} />}
        {stores.data?.length === 0 && <p role="status">Chưa có cửa hàng đang hoạt động.</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{stores.data?.map(store => <a href={customerCartPath(store.storeSlug)} key={store.storeSlug} className="flex items-center gap-3 rounded-xl border border-[#e2ebe5] p-4 hover:bg-[#edf7f1]"><Store size={20} className="text-[#088178]" /><span>{store.name}</span><ArrowRight size={16} className="ml-auto" /></a>)}</div>
      </section> : !customer ? <section className="grid justify-items-center gap-4 rounded-2xl border border-[#e2ebe5] bg-white px-6 py-12 text-center">
        <ShoppingBag size={40} className="text-[#088178]" /><h2 className="text-xl font-semibold">Đăng nhập để xem giỏ hàng</h2><p className="text-sm text-[#65796d]">Giỏ hàng được lưu theo tài khoản và cửa hàng của bạn.</p><button onClick={navigation.onLogin} className="rounded-full bg-[#088178] px-6 py-3 text-sm font-semibold text-white">Đăng nhập</button>
      </section> : <section className="mx-auto max-w-4xl rounded-2xl border border-[#e2ebe5] bg-white p-6 max-[580px]:p-4" aria-label="Sản phẩm trong giỏ hàng">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Sản phẩm ({cart.count})</h2><button onClick={() => void cart.load()} disabled={cart.pending} className="rounded-lg border border-[#e2ebe5] px-3 py-2 text-sm text-[#088178] disabled:opacity-40">Làm mới</button></div>
        <CustomerCartContents state={cart} onLogin={navigation.onLogin} />
      </section>}
    </main>
  </div>;
}
