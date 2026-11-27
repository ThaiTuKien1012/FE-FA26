import React from 'react';
import { ArrowUpRight, Heart, Package, ShoppingCart } from 'lucide-react';
import type { StoreProduct } from '../customer.types';
import { formatCustomerMoney as money } from '../customerMoney';
import { unitLabel } from '../data/customerLocale';

export const containerClass = 'mx-auto w-[calc(100%_-_80px)] max-w-[1280px] max-[1100px]:w-[calc(100%_-_56px)] max-[800px]:w-[calc(100%_-_40px)] max-[580px]:w-[calc(100%_-_32px)]';

type PillButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { compact?: boolean; fullWidth?: boolean };
export function PillButton({ children, compact = false, fullWidth = false, className = '', ...props }: PillButtonProps) {
  return (
    <button {...props} className={`fm-pill-button inline-flex items-center whitespace-nowrap rounded-full border-0 bg-[#088178] font-medium text-white hover:bg-[#06685f] ${fullWidth ? 'w-full justify-between' : 'justify-center'} ${compact ? 'min-h-[29px] gap-[15px] py-1 pr-[5px] pl-3 text-[9px] max-[580px]:min-h-6 max-[580px]:gap-2 max-[580px]:py-[3px] max-[580px]:pr-1 max-[580px]:pl-[9px] max-[580px]:text-[7px]' : 'min-h-9 gap-[18px] py-[6px] pr-[7px] pl-[17px] text-[10px] max-[580px]:min-h-[30px] max-[580px]:gap-[13px] max-[580px]:py-1 max-[580px]:pr-[5px] max-[580px]:pl-3 max-[580px]:text-[8px]'} ${className}`}>
      {children}
      <span className={`flex shrink-0 items-center justify-center rounded-full bg-white text-[#088178] ${compact ? 'size-[21px] max-[580px]:size-[18px]' : 'size-[25px] max-[580px]:size-[22px]'}`}><ArrowUpRight size={16} /></span>
    </button>
  );
}

export function SectionHeading({ id, title, children }: { id?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="fm-section-heading mb-[22px] flex items-center justify-between gap-[18px] max-[580px]:mb-[17px] max-[580px]:gap-[10px]">
      <h2 id={id} className="m-0 text-[29px] leading-[1.25] font-[650] tracking-[-1.1px] max-[800px]:text-[26px] max-[580px]:text-[23px] max-[580px]:tracking-[-0.9px]">{title}</h2>
      {children}
    </div>
  );
}

// `onAdd` is absent on the customer home: a cart belongs to one Store, so the home card opens the
// product in its Store instead of adding it. `storeLabel` names that Store.
export function ProductCard({ product, saved, quantity, onSave, onOpen, onAdd, blocked, storeLabel, productHref, showAvailability }: {
  product: StoreProduct; saved: boolean; quantity: number;
  onSave: () => void; onOpen: () => void; onAdd?: () => void; blocked?: boolean; storeLabel?: string;
  productHref?: string;
  showAvailability?: boolean;
}) {
  const unavailable = product.availability !== 'AVAILABLE';
  return (
    <article className="fm-product min-w-0 rounded-[15px] border border-white bg-white p-1 text-[#212529] max-[580px]:rounded-xl max-[580px]:p-[3px]">
      <div className="fm-product-picture relative h-[220px] overflow-hidden rounded-xl bg-[#f5f5f5] max-[1100px]:h-[195px] max-[800px]:h-40 max-[580px]:h-[170px] max-[360px]:h-[150px]">
        <button className={`fm-favorite absolute top-2 right-2 z-1 grid size-7 place-items-center rounded-full border border-[#dfe4e1] hover:bg-[#fff2ef] ${saved ? 'bg-[#fff2ef] text-[#c6564b]' : 'bg-[#f9faf8] text-[#78837d]'}`}
          aria-label={`${saved ? 'Bỏ lưu' : 'Lưu'} ${product.name}`} aria-pressed={saved} onClick={onSave}>
          <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
        </button>
        <button className="fm-picture-button group flex size-full items-center justify-center border-0 bg-transparent p-[23px] max-[1100px]:p-[18px] max-[580px]:px-3" onClick={onOpen} aria-label={`Xem ${product.name}`}>
          {product.imageUrl ? <img className="size-full object-contain transition-transform duration-250 group-hover:scale-[1.06]" src={product.imageUrl} alt={product.name} loading="lazy" />
            : <Package className="size-16 text-[#9daea5]" aria-label="Chưa có ảnh sản phẩm" />}
        </button>
      </div>
      <div className="fm-product-copy px-2 pt-[11px] pb-[6px]">
        <div className="fm-product-brand text-[9px] text-[#088178]">{product.category?.name}</div>
        {storeLabel && <div className="fm-product-store mt-0.5 text-[9px] text-[#8a9a90]">Bán tại {storeLabel}</div>}
        <h3 className="mt-[7px] mb-2 text-xs font-semibold">
          {productHref ? <a href={productHref} className="text-left hover:text-[#088178]" onClick={event => {
            if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
            event.preventDefault();
            onOpen();
          }}>{product.name}</a> : <button className="text-left hover:text-[#088178]" onClick={onOpen}>{product.name}</button>}
        </h3>
        {product.description && <p className="mb-2 line-clamp-2 text-xs text-[#65796d]">{product.description}</p>}
        <div className="fm-product-price mb-[11px] flex flex-wrap items-baseline gap-1">
          <strong className="text-[15px] font-bold max-[580px]:text-[13px]">{money(product.sellingPrice)}</strong>
          <span className="text-[9px] text-[#65796d]">/ {unitLabel(product.unit)}</span>
        </div>
        {showAvailability && <p className="mb-2 text-xs text-[#4d6658]">{unavailable ? 'Hết hàng' : 'Còn hàng'}</p>}
        {onAdd ? <button className="fm-add-cart flex min-h-8 w-full items-center justify-center gap-[7px] rounded-full bg-[#088178] px-2 py-2 text-[10px] text-white hover:bg-[#06685f] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={blocked || unavailable} onClick={onAdd} aria-label={showAvailability ? `Thêm ${product.name} vào giỏ` : undefined}>
          <ShoppingCart size={14} />{unavailable && !showAvailability ? 'Hết hàng' : 'Thêm vào giỏ'}
          {quantity > 0 && <span className="fm-in-cart grid size-4 place-items-center rounded-full bg-white/20 text-[8px]">{quantity}</span>}
        </button> : <button className="fm-view-product flex min-h-8 w-full items-center justify-center gap-[7px] rounded-full border border-[#088178] bg-white px-2 py-2 text-[10px] font-medium text-[#08755d] hover:bg-[#ecf7f1]"
          onClick={onOpen}>{unavailable ? 'Hết hàng · Xem sản phẩm' : 'Xem sản phẩm'}<ArrowUpRight size={14} /></button>}
      </div>
    </article>
  );
}
