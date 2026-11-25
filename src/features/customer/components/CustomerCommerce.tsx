import { useState } from 'react';
import { ArrowUpRight, Loader2, Package, Store } from 'lucide-react';
import { publicImageUrl } from '../customer.api';
import type { CustomerDisplayProduct } from '../customer.types';
import { unitLabel } from '../data/customerLocale';
import { APP_BRAND } from '../../../app/branding';

export const containerClass = 'mx-auto w-[calc(100%_-_80px)] max-w-[1280px] max-[1100px]:w-[calc(100%_-_56px)] max-[800px]:w-[calc(100%_-_40px)] max-[580px]:w-[calc(100%_-_32px)]';
export const formatCustomerPrice = (price: number) => `${new Intl.NumberFormat('vi-VN').format(price)} ₫`;
export const customerButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#088178] px-5 py-2 text-sm font-medium text-white hover:bg-[#06685f] disabled:cursor-default disabled:opacity-40';

export function ProductImage({ product, className = '' }: { product: CustomerDisplayProduct; className?: string }) {
  const url = publicImageUrl(product.imageUrl);
  const [failedUrl, setFailedUrl] = useState<string>();
  return url && url !== failedUrl ? <img src={url} alt={product.name} loading="lazy" className={`object-contain ${className}`} onError={() => setFailedUrl(url)} /> : <div className={`grid place-items-center text-[#8fa99c] ${className}`} role="img" aria-label="Chưa có ảnh sản phẩm"><Package size={48} strokeWidth={1.2} /></div>;
}
export function ProductCard({ product, onOpen }: { product: CustomerDisplayProduct; onOpen: () => void }) {
  return <article className="fm-product min-w-0 rounded-2xl border border-[#e8eeea] bg-white p-2 text-[#212529]">
    <button onClick={onOpen} aria-label={`Xem ${product.name}`} className="group block w-full text-left">
      <div className="fm-product-picture flex h-48 items-center justify-center rounded-xl bg-[#f5f8f5] p-5 max-[580px]:h-36"><ProductImage product={product} className="size-full transition-transform group-hover:scale-105" /></div>
      <div className="px-2 py-3"><p className="text-xs text-[#6c8578]">{product.category?.name || 'Chưa phân loại'}</p><h3 className="mt-2 min-h-10 text-sm font-semibold leading-5">{product.name}</h3><p className="mt-3 flex flex-wrap items-baseline gap-1"><strong className="text-base text-[#176a55]">{formatCustomerPrice(product.sellingPrice)}</strong><span className="text-xs text-[#7c8e84]">/ {unitLabel(product.unit)}</span></p>
      <p className={`mt-2 text-xs ${product.availability === 'AVAILABLE' ? 'text-[#088178]' : 'text-[#96664d]'}`}>{product.availability === 'AVAILABLE' ? 'Có hàng' : 'Tạm hết hàng'}</p><span className="mt-4 flex items-center gap-2 text-xs font-medium text-[#088178]">Xem chi tiết<ArrowUpRight size={14} /></span></div>
    </button>
  </article>;
}
export function PublicState({ loading, error, empty, onRetry }: { loading?: boolean; error?: string; empty?: string; onRetry?: () => void }) {
  return <div className="my-4 flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border border-[#e0eae4] bg-[#f6faf7] p-6 text-center text-sm text-[#567365]" role={error ? 'alert' : 'status'}>
    {loading ? <><Loader2 size={24} className="animate-spin" />Đang tải…</> : <><Store size={24} /><p>{error || empty}</p>{error && onRetry && <button className={customerButton} onClick={onRetry}>Thử lại</button>}</>}
  </div>;
}
export function CustomerFooter() {
  return <footer className="mt-12 bg-[#032724] py-8 text-[#b8d0c4]"><div className={`${containerClass} flex flex-wrap justify-between gap-3`}><strong className="text-xl text-white">{APP_BRAND.name}</strong><p className="text-sm">Khám phá cửa hàng và sản phẩm.</p></div></footer>;
}
