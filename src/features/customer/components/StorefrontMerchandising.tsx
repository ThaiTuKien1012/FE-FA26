import React, { useState } from 'react';
import { ArrowUpRight, Package, Plus } from 'lucide-react';
import type { CustomerDisplayProduct } from '../customer.types';
import { canPurchase, getProductPlacements, resolvePlacement, type CustomerActiveLayout, type CustomerPlacement } from '../merchandising';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
const button = 'sf-button inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#36543A] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0A1D11] disabled:cursor-not-allowed disabled:bg-[#dce2dc] disabled:text-[#526252]';
const secondary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#b8c8bb] px-5 py-3 text-sm font-semibold text-[#36543A] hover:bg-[#edf3ed]';
type SharedProps = {
  products: CustomerDisplayProduct[];
  cart: Record<string, number>;
  onAddGroup: (placement: CustomerPlacement, selectedIds?: string[]) => void;
  onOpenProduct: (product: CustomerDisplayProduct) => void;
};
type ResolvedItem = ReturnType<typeof resolvePlacement>['items'][number];

function safeImage(url?: string) { return url && (/^\/(?!\/)/.test(url) || /^https:\/\//.test(url)) ? url : undefined; }
function ProductImage({ product, className = '' }: { product: CustomerDisplayProduct | null; className?: string }) {
  const url = safeImage(product?.image);
  return <div className={`grid shrink-0 place-items-center rounded-xl bg-[#f4f5f2] ${className}`}>{url ? <img src={url} alt={product?.name || ''} className="size-full object-contain p-2" loading="lazy" /> : <Package size={28} className="text-[#819183]" aria-label="Chưa có hình sản phẩm" />}</div>;
}
function ItemRow({ item, cart, onOpenProduct, selectable, checked, onToggle }: {
  item: ResolvedItem; cart: Record<string, number>; onOpenProduct: SharedProps['onOpenProduct'];
  selectable?: boolean; checked?: boolean; onToggle?: () => void;
}) {
  const available = canPurchase([item], cart);
  return <div className="flex min-w-0 flex-wrap items-center gap-3 border-b border-[#e4e9e2] py-4 last:border-0">
    {selectable && <input type="checkbox" className="size-5 shrink-0 accent-[#36543A]" aria-label={`Chọn ${item.product?.name || 'sản phẩm không khả dụng'}`} checked={available && checked} disabled={!available} onChange={onToggle} />}
    <ProductImage product={item.product} className="size-18" />
    <div className="min-w-0 flex-1 basis-20"><button type="button" disabled={!item.product} onClick={() => item.product && onOpenProduct(item.product)} className="min-h-11 text-left text-sm font-semibold text-[#0A1D11] hover:underline">{item.product?.name || 'Sản phẩm không còn khả dụng'}</button>
      <p className="text-sm text-[#536455]">× {item.quantity}{item.product?.unit ? ` · ${item.product.unit}` : ''}</p>
      {item.product && Number.isFinite(item.product.priceVnd) && <p className="mt-1 text-sm text-[#536455]">{money(item.product.priceVnd)} / {item.product.unit || 'sản phẩm'}</p>}
      {!available && <p className="mt-1 text-sm text-[#AB422F]">{item.product ? (item.product.stockQuantity <= 0 || item.product.status === 'Out of Stock' ? 'Tạm hết hàng' : 'Chưa thể thêm số lượng này') : 'Sản phẩm không còn khả dụng'}</p>}
    </div>
    <span className="shrink-0 text-sm font-semibold tabular-nums">{item.product && Number.isFinite(item.product.priceVnd) ? money(item.product.priceVnd * item.quantity) : '—'}</span>
  </div>;
}

export function GroupDetail({ placement, ...props }: SharedProps & { placement: CustomerPlacement }) {
  const group = resolvePlacement(placement, props.products);
  const available = group.valid && canPurchase(group.items, props.cart);
  return <div className="text-[#0A1D11]">
    {placement.description && <p className="mb-4 text-base leading-relaxed text-[#536455]">{placement.description}</p>}
    <div>{group.items.map(item => <ItemRow key={item.productId} item={item} cart={props.cart} onOpenProduct={props.onOpenProduct} />)}</div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#dce4db] pt-5"><div><p className="text-sm text-[#536455]">Tổng tạm tính</p><strong className="text-2xl tabular-nums">{group.valid ? money(group.total) : 'Chưa xác định'}</strong></div><button className={button} disabled={!available} onClick={() => props.onAddGroup(placement)}>Thêm cả nhóm <Plus size={17} /></button></div>
    <p className="mt-3 text-sm leading-relaxed text-[#536455]">Tổng theo giá và số lượng hiện tại. Giá được xác nhận khi thanh toán.</p>
  </div>;
}

function BundleCard({ placement, onOpenGroup, ...props }: SharedProps & { placement: CustomerPlacement; onOpenGroup: (placement: CustomerPlacement) => void }) {
  const group = resolvePlacement(placement, props.products);
  return <article className="rounded-2xl border border-[#dfe6dc] bg-white p-5 sm:p-7">
    <h3 className="mb-2 text-xl font-semibold tracking-tight">{placement.title}</h3>
    {placement.description && <p className="mb-3 text-sm leading-relaxed text-[#536455]">{placement.description}</p>}
    {group.items.map(item => <ItemRow key={item.productId} item={item} cart={props.cart} onOpenProduct={props.onOpenProduct} />)}
    <div className="mt-4 flex items-end justify-between gap-3"><span className="text-sm text-[#536455]">Tổng tạm tính</span><strong className="text-xl tabular-nums">{group.valid ? money(group.total) : 'Chưa xác định'}</strong></div>
    <div className="mt-5 flex flex-wrap gap-2"><button className={secondary} onClick={() => onOpenGroup(placement)}>Xem chi tiết</button><button className={button} disabled={!group.valid || !canPurchase(group.items, props.cart)} onClick={() => props.onAddGroup(placement)}>Thêm cả nhóm <Plus size={17} /></button></div>
  </article>;
}

export function StorefrontLayoutRenderer({ layout, onOpenGroup, ...props }: SharedProps & { layout: CustomerActiveLayout | null; onOpenGroup: (placement: CustomerPlacement) => void }) {
  if (!layout || layout.status !== 'ACTIVE') return null;
  return <>{[...layout.placements].sort((a,b) => a.order-b.order).map(placement => {
    if (placement.type === 'BANNER') {
      const group = resolvePlacement(placement, props.products);
      const banner = safeImage(placement.imageUrl);
      return <section key={placement.id} data-placement={placement.id} className="sf-active-banner my-8 grid overflow-hidden rounded-3xl bg-[#e7eee1] md:grid-cols-2" aria-label={placement.title}>
        <div className="flex flex-col items-start justify-center p-7 sm:p-12"><p className="mb-4 text-sm font-medium text-[#36543A]">Bộ sản phẩm tại cửa hàng</p><h2 className="text-3xl leading-tight font-semibold tracking-tight sm:text-5xl">{placement.title}</h2>{placement.description && <p className="mt-5 max-w-md text-base leading-relaxed text-[#536455]">{placement.description}</p>}{group.valid ? <button className={`${button} mt-7`} onClick={() => onOpenGroup(placement)}>Khám phá bộ sản phẩm <ArrowUpRight size={18} /></button> : <p className="mt-6 text-sm text-[#536455]">Bộ sản phẩm hiện chưa khả dụng.</p>}</div>
        {banner ? <img src={banner} alt={placement.title} className="h-full min-h-64 w-full object-cover" /> : <div className="grid min-h-64 grid-cols-2 items-center gap-4 p-8" aria-hidden="true">{group.items.map(item => <ProductImage key={item.productId} product={item.product} className="aspect-square w-full" />)}</div>}
      </section>;
    }
    if (placement.type === 'BUNDLE') return <section key={placement.id} data-placement={placement.id} className="my-10"><h2 className="mb-6 text-3xl font-semibold tracking-tight">Gợi ý kết hợp</h2><BundleCard {...props} placement={placement} onOpenGroup={onOpenGroup} /></section>;
    if (placement.type === 'PRODUCT_COLLECTION') return <section key={placement.id} data-placement={placement.id} className="my-10"><h2 className="mb-6 text-3xl font-semibold tracking-tight">{placement.title}</h2><div className="grid gap-4 sm:grid-cols-2">{resolvePlacement(placement,props.products).items.map(item => <article key={item.productId} className="rounded-2xl border border-[#dfe6dc] bg-white p-4"><ItemRow item={item} cart={props.cart} onOpenProduct={props.onOpenProduct} /><button className={`${button} mt-3`} disabled={!canPurchase([item],props.cart)} onClick={()=>props.onAddGroup(placement,[item.productId])}>Thêm vào giỏ</button></article>)}</div></section>;
    return null;
  })}</>;
}

function FrequentlyTogether({ placement, ...props }: SharedProps & { placement: CustomerPlacement }) {
  const group = resolvePlacement(placement, props.products);
  const [selected, setSelected] = useState(() => group.items.filter(item => canPurchase([item],props.cart)).map(item=>item.productId));
  const items = group.items.filter(item => selected.includes(item.productId) && canPurchase([item], props.cart));
  const total = items.reduce((sum,item)=>sum+(item.product?.priceVnd || 0)*item.quantity,0);
  return <article className="mt-5 rounded-2xl border border-[#dfe6dc] bg-[#fafbf7] p-5">
    <h4 className="text-lg font-semibold">{placement.title}</h4>
    {group.items.map(item=><ItemRow key={item.productId} item={item} cart={props.cart} onOpenProduct={props.onOpenProduct} selectable checked={selected.includes(item.productId)} onToggle={()=>setSelected(current=>current.includes(item.productId)?current.filter(id=>id!==item.productId):[...current,item.productId])} />)}
    <div className="my-5 flex items-center justify-between gap-3"><span className="text-sm">Tổng đã chọn ({items.length})</span><strong className="text-xl tabular-nums">{money(total)}</strong></div>
    <div className="flex flex-wrap gap-2"><button className={button} disabled={!canPurchase(items,props.cart)} onClick={()=>props.onAddGroup(placement,items.map(item=>item.productId))}>Thêm sản phẩm đã chọn</button><button className={secondary} disabled={!group.valid || !canPurchase(group.items,props.cart)} onClick={()=>props.onAddGroup(placement)}>Thêm cả nhóm</button></div>
  </article>;
}

export function ProductRecommendations({ layout, productId, ...props }: SharedProps & { layout: CustomerActiveLayout | null; productId: string }) {
  if (!layout || layout.status !== 'ACTIVE') return null;
  const together = getProductPlacements(layout, productId, 'FBT');
  const extra = getProductPlacements(layout, productId, 'CROSS_SELL');
  const seen = new Set<string>();
  const cross = extra.flatMap(placement=>resolvePlacement(placement,props.products).items.filter(item=>{
    if(item.productId===productId || seen.has(item.productId) || !item.product) return false;
    seen.add(item.productId); return true;
  }).map(item=>({placement,item})));
  return <div className="space-y-8">
    {together.length>0 && <section aria-label="Thường mua cùng"><h3 className="text-2xl font-semibold">Thường mua cùng</h3>{together.map(placement=><FrequentlyTogether key={`${layout.id}:${layout.version}:${productId}:${placement.id}`} {...props} placement={placement} />)}</section>}
    {cross.length>0 && <section aria-label="Có thể bạn cần thêm"><h3 className="text-2xl font-semibold">Có thể bạn cần thêm</h3><div className="mt-5 grid gap-4 sm:grid-cols-2">{cross.map(({placement,item})=><article key={item.productId} className="min-w-0 rounded-2xl border border-[#dfe6dc] p-4"><ItemRow item={item} cart={props.cart} onOpenProduct={props.onOpenProduct} /><button className={`${button} mt-3 w-full`} disabled={!canPurchase([item],props.cart)} onClick={()=>props.onAddGroup(placement,[item.productId])}>Thêm vào giỏ <Plus size={17}/></button></article>)}</div></section>}
  </div>;
}
