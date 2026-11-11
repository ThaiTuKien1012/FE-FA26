import type { RefObject } from 'react';
import { Check, Heart, Minus, Package, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import { formatCustomerPrice as money } from '../data/customerCatalog';
import { PillButton, type CustomerDisplayProduct } from './CustomerCommerce';

interface CustomerShoppingDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  dialogMode: 'product' | 'cart';
  selectedProduct: CustomerDisplayProduct | null;
  storeName: string;
  cart: Record<string, number>;
  cartProducts: CustomerDisplayProduct[];
  cartCount: number;
  cartTotal: number;
  saved: string[];
  addToCart: (product: CustomerDisplayProduct) => void;
  toggleSaved: (id: string) => void;
  updateQuantity: (id: string, difference: number) => void;
  closeDialog: () => void;
  onCartAction: () => void;
  scrollTo: (id: string) => void;
  cartActionLabel?: string;
}

const iconButtonClass = 'relative flex items-center justify-center border-0 bg-transparent p-[7px] max-[580px]:p-[5px]';

export function CustomerShoppingDialog({ dialogRef, dialogMode, selectedProduct, storeName, cart, cartProducts, cartCount, cartTotal, saved, addToCart, toggleSaved, updateQuantity, closeDialog, onCartAction, scrollTo, cartActionLabel = 'Continue to Store' }: CustomerShoppingDialogProps) {
  return (
      <dialog ref={dialogRef} className={`fm-dialog fixed inset-0 m-auto max-h-[90dvh] w-[min(720px,calc(100%_-_32px))] overflow-auto rounded-[18px] border-0 bg-white p-0 text-[#212529] shadow-[0_20px_70px_#03272440] backdrop:bg-[#03272470] backdrop:backdrop-blur-[4px] ${dialogMode === 'cart' ? 'fm-cart-dialog max-w-[570px] open:block' : 'open:grid open:grid-cols-2 max-[580px]:open:grid-cols-1'}`} aria-labelledby="fm-dialog-title" onClick={event => { if (event.target === event.currentTarget) closeDialog(); }}>
        <button className="absolute top-[10px] right-[10px] z-2 flex items-center justify-center rounded-full border-0 bg-[#ffffffc9] p-[7px] max-[580px]:p-[5px]" aria-label="Close dialog" onClick={closeDialog}><X size={22} /></button>
        {dialogMode === 'product' && selectedProduct && <>
          <div className="fm-dialog-picture grid place-items-center bg-[#f5f5f5] px-[15px] py-[30px] max-[580px]:p-3">{selectedProduct.image ? <img className="h-80 w-full object-contain max-[580px]:h-[220px]" src={selectedProduct.image} alt={selectedProduct.name} /> : <Package className="my-20 size-16 text-[#9daea5]" aria-label="Product image unavailable" />}</div>
          <div className="px-7 pt-[50px] pb-[30px] max-[580px]:p-[26px]"><span className="text-[9px] text-[#088178]">{selectedProduct.brand || selectedProduct.category}</span><h2 className="my-[14px] text-[26px] leading-[1.3] font-[650] tracking-[-0.6px] max-[580px]:text-[23px]" id="fm-dialog-title">{selectedProduct.name}</h2><p className="text-xs text-[#8d9692]">{selectedProduct.category} · {selectedProduct.unit || 'item'}</p><strong className="mt-[23px] block text-[28px] max-[580px]:mt-[15px] max-[580px]:text-[25px]">{money(selectedProduct.priceVnd)}</strong><p className="mt-[14px] mb-6 text-[10px] leading-[1.8] text-[#8b9791]">Demo product at {storeName}. Price shown for this design preview.</p><PillButton onClick={() => addToCart(selectedProduct)}>Add to Demo Cart</PillButton>
            {cart[selectedProduct.id] > 0 && <p className="mt-3 flex items-center gap-[5px] text-[10px] text-[#088178]" role="status"><Check size={13} />{cart[selectedProduct.id]} in your demo cart</p>}
            <button className="mt-[13px] flex items-center justify-center gap-[7px] border-0 bg-transparent py-[5px] text-[11px] text-[#81988b] hover:text-[#032724]" onClick={() => toggleSaved(selectedProduct.id)}><Heart size={16} fill={saved.includes(selectedProduct.id) ? 'currentColor' : 'none'} />{saved.includes(selectedProduct.id) ? 'Saved to Wishlist' : 'Save to Wishlist'}</button>
          </div>
        </>}
        {dialogMode === 'cart' && <div className="fm-cart-content p-[34px] max-[580px]:px-[23px] max-[580px]:py-[30px]">
          <span className="text-[8px] tracking-[1.5px] text-[#088178]">YOUR EVERYDAY BAG · {storeName}</span><h2 className="my-3 text-[27px] font-[650] tracking-[-0.7px] max-[580px]:text-[23px]" id="fm-dialog-title">Your Shopping Cart <span className="text-[17px] text-[#9aa59f]">({cartCount})</span></h2><p className="text-[10px] leading-[1.8] text-[#8b9791]">This demo cart belongs to {storeName}. No order will be placed.</p>
          {cartProducts.length ? <>
            <div className="mt-[22px]">
              {cartProducts.map(product => <article className="fm-cart-item flex items-start gap-[15px] border-t border-[#e9eded] py-4 max-[580px]:gap-[11px]" key={product.id}>
                <div className="grid h-25 w-20 shrink-0 place-items-center rounded-lg bg-[#f5f5f5] max-[580px]:h-[90px] max-[580px]:w-[63px]">{product.image ? <img className="size-full object-contain" src={product.image} alt={product.name} /> : <Package className="size-8 text-[#9daea5]" aria-label="Product image unavailable" />}</div>
                <div className="flex-1"><span className="text-[9px] text-[#088178]">{product.brand || product.category}</span><h3 className="mt-1 mb-2 text-xs font-semibold max-[580px]:text-[11px]">{product.name}</h3><strong className="text-[13px]">{money(product.priceVnd * cart[product.id])}</strong><div className="mt-[10px] flex w-fit items-center overflow-hidden rounded-full border border-[#e4ebe5]"><button className="flex bg-[#f5f8f5] px-[9px] py-[6px] text-[#088178]" aria-label={`Decrease ${product.name}`} onClick={() => updateQuantity(product.id, -1)}><Minus size={13} /></button><span className="min-w-7 text-center text-[11px]">{cart[product.id]}</span><button className="flex bg-[#f5f8f5] px-[9px] py-[6px] text-[#088178]" aria-label={`Increase ${product.name}`} onClick={() => updateQuantity(product.id, 1)}><Plus size={13} /></button></div></div>
                <button className={iconButtonClass} aria-label={`Remove ${product.name} from cart`} onClick={() => updateQuantity(product.id, -cart[product.id])}><Trash2 size={16} /></button>
              </article>)}
            </div>
            <div className="fm-cart-total flex items-center justify-between border-t border-[#e9eded] py-5 text-[13px]"><span>Subtotal</span><strong className="text-[23px]">{money(cartTotal)}</strong></div><PillButton fullWidth onClick={() => { closeDialog(); onCartAction(); }}>{cartActionLabel}</PillButton>
          </> : <div className="flex flex-col items-center px-0 pt-[38px] pb-5 text-center text-[#81998e]"><ShoppingCart size={38} /><h3 className="mt-[14px] mb-[6px] text-[18px] font-semibold text-[#032724]">Your basket is waiting</h3><p className="mb-[23px] text-[11px]">Discover fresh favorites and add a little goodness.</p><PillButton onClick={() => { closeDialog(); scrollTo('fm-products'); }}>Explore Products</PillButton></div>}
        </div>}
      </dialog>
  );
}
