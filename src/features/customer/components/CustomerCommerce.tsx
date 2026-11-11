import React from 'react';
import { ArrowUpRight, Heart, Package, ShoppingCart } from 'lucide-react';
import type { CustomerDisplayProduct } from '../customer.types';
import { formatCustomerPrice as money } from '../data/customerCatalog';

export type { CustomerDisplayProduct } from '../customer.types';
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

export function AddToCartButton({ onClick, quantity = 0 }: { onClick: () => void; quantity?: number }) {
  return (
    <button className="fm-add-cart flex min-h-8 w-full items-center justify-center gap-[7px] rounded-full border-0 bg-[#088178] px-[10px] py-2 text-[10px] text-white hover:bg-[#06685f] max-[800px]:gap-[5px] max-[800px]:p-[7px] max-[800px]:text-[9px] max-[580px]:min-h-[29px] max-[580px]:p-[6px]" onClick={onClick}>
      <ShoppingCart size={14} />Add to Cart
      {quantity > 0 && <span className="fm-in-cart grid size-4 min-w-4 place-items-center rounded-full bg-white/20 text-[8px]">{quantity}</span>}
    </button>
  );
}

export function ProductCard({ product, saved, quantity, onSave, onOpen, onAdd }: {
  product: CustomerDisplayProduct; saved: boolean; quantity: number;
  onSave: () => void; onOpen: () => void; onAdd: () => void;
}) {
  return (
    <article className="fm-product min-w-0 rounded-[15px] border border-white bg-white p-1 max-[580px]:rounded-xl max-[580px]:p-[3px]">
      <div className="fm-product-picture relative h-[220px] overflow-hidden rounded-xl bg-[#f5f5f5] max-[1100px]:h-[195px] max-[800px]:h-40 max-[580px]:h-[170px] max-[580px]:rounded-[9px] max-[360px]:h-[150px]">
        <button className={`fm-favorite absolute top-2 right-2 z-1 grid size-7 place-items-center rounded-full border border-[#dfe4e1] hover:bg-[#fff2ef] hover:text-[#c6564b] max-[580px]:top-[6px] max-[580px]:right-[6px] max-[580px]:size-[25px] ${saved ? 'bg-[#fff2ef] text-[#c6564b]' : 'bg-[#f9faf8] text-[#78837d]'}`} aria-label={`${saved ? 'Unsave' : 'Save'} ${product.name}`} aria-pressed={saved} onClick={onSave}>
          <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
        </button>
        <button className="fm-picture-button group flex size-full items-center justify-center border-0 bg-transparent p-[23px] max-[1100px]:p-[18px] max-[800px]:px-[10px] max-[580px]:px-3 max-[580px]:pt-[22px] max-[580px]:pb-3" onClick={onOpen} aria-label={`View ${product.name}`}>
          {product.image ? <img className="size-full object-contain drop-shadow-[0_5px_3px_#152c1c0c] transition-transform duration-250 group-hover:scale-[1.06]" src={product.image} alt={product.name} loading="lazy" /> : <Package className="size-16 text-[#9daea5]" aria-label="Product image unavailable" />}
        </button>
      </div>
      <div className="fm-product-copy px-2 pt-[11px] pb-[6px] max-[800px]:px-[5px] max-[800px]:pt-[10px] max-[800px]:pb-[5px] max-[580px]:pt-[9px]">
        <div className="fm-product-brand flex items-center justify-between gap-[7px] text-[9px] text-[#088178] max-[800px]:text-[8px]">
          {product.brand || product.category}<span className="text-[8px] text-[#a0a7a4] max-[580px]:text-[6px]">{product.unit || 'item'}</span>
        </div>
        <h3 className="mt-[7px] mb-2 text-xs leading-normal font-semibold max-[1100px]:min-h-[33px] max-[1100px]:text-[11px] max-[800px]:min-h-[30px] max-[800px]:text-[10px] max-[580px]:min-h-[33px] max-[580px]:text-[11px]">
          <button className="border-0 bg-transparent p-0 text-left hover:text-[#088178]" onClick={onOpen}>{product.name}</button>
        </h3>
        <div className="fm-product-price mb-[11px] flex items-baseline gap-1 max-[580px]:mb-[9px]">
          <strong className="text-[15px] font-bold max-[1100px]:text-sm max-[800px]:text-xs max-[580px]:text-[13px]">{money(product.priceVnd)}</strong>
          <span className="text-[9px] text-[#8e9692] max-[800px]:text-[8px]">/ {product.unit || 'item'}</span>
        </div>
        <AddToCartButton onClick={onAdd} quantity={quantity} />
      </div>
    </article>
  );
}
