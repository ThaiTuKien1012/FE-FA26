import type { ReactNode, RefObject } from 'react';
import { Heart, Minus, Package, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import { formatCustomerPrice as money } from '../data/customerCatalog';
import type { CustomerDisplayProduct } from '../customer.types';
import { applyCartItems } from '../cartRules';

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
  demo?: boolean;
  children?: ReactNode;
}
export function CustomerShoppingDialog({ dialogRef, dialogMode, selectedProduct, storeName, cart, cartProducts, cartCount, cartTotal, saved, addToCart, toggleSaved, updateQuantity, closeDialog, onCartAction, scrollTo, cartActionLabel = 'Tiếp tục mua sắm', demo = true, children }: CustomerShoppingDialogProps) {
  const available = (product: CustomerDisplayProduct) => !!applyCartItems(cart,[{product,quantity:1}]);
  return <dialog ref={dialogRef} className="sf-dialog sf-shopping-dialog" aria-labelledby="fm-dialog-title">
    <button className="sf-close" aria-label="Đóng hộp thoại" onClick={closeDialog}><X size={22} /></button>
    {dialogMode === 'product' && selectedProduct && <><div className="sf-product-detail"><div className="sf-detail-image">{selectedProduct.image ? <img src={selectedProduct.image} alt={selectedProduct.name} width="420" height="420" /> : <Package size={64} />}</div><div className="sf-detail-copy"><span className="sf-eyebrow">{selectedProduct.brand || selectedProduct.category}</span><h2 id="fm-dialog-title">{selectedProduct.name}</h2><p>{selectedProduct.category} · {selectedProduct.unit || 'sản phẩm'}</p><strong className="sf-detail-price">{money(selectedProduct.priceVnd)}</strong><p>{selectedProduct.description || `Sản phẩm tại ${storeName}.`}</p><p className={available(selectedProduct) ? 'sf-stock' : 'sf-unavailable'}>{available(selectedProduct) ? `Còn ${selectedProduct.stockQuantity} ${selectedProduct.unit || 'sản phẩm'}` : 'Tạm hết hàng hoặc đã đủ số lượng trong giỏ'}</p><button className="sf-button" disabled={!available(selectedProduct)} onClick={() => addToCart(selectedProduct)}><ShoppingCart size={18} />Thêm vào giỏ</button>{cart[selectedProduct.id] > 0 && <p role="status">{cart[selectedProduct.id]} sản phẩm trong giỏ</p>}<button className="sf-save" aria-pressed={saved.includes(selectedProduct.id)} onClick={() => toggleSaved(selectedProduct.id)}><Heart size={18} fill={saved.includes(selectedProduct.id) ? 'currentColor' : 'none'} />{saved.includes(selectedProduct.id) ? 'Đã lưu sản phẩm' : 'Lưu sản phẩm'}</button></div></div>{children}</>}
    {dialogMode === 'product' && !selectedProduct && <><h2 id="fm-dialog-title">Sản phẩm chưa khả dụng</h2><p>Thông tin cửa hàng đang được cập nhật.</p></>}
    {dialogMode === 'cart' && <><span className="sf-eyebrow">{storeName}</span><h2 id="fm-dialog-title">Giỏ hàng của bạn ({cartCount})</h2><p>{demo ? 'Giỏ dùng thử. Chưa tạo đơn hàng hoặc thu tiền.' : 'Giá và tồn kho sẽ được xác nhận khi đặt hàng.'}</p>{cartProducts.length ? <><div>{cartProducts.map(product => <article className="sf-cart-item" key={product.id}><div className="sf-cart-image">{product.image ? <img src={product.image} alt={product.name} width="80" height="90" /> : <Package />}</div><div><h3>{product.name}</h3><strong>{money(product.priceVnd * cart[product.id])}</strong><div className="sf-quantity"><button aria-label={`Giảm ${product.name}`} onClick={() => updateQuantity(product.id,-1)}><Minus size={16} /></button><span>{cart[product.id]}</span><button aria-label={`Tăng ${product.name}`} disabled={!available(product)} onClick={() => updateQuantity(product.id,1)}><Plus size={16} /></button></div></div><button className="sf-remove" aria-label={`Xóa ${product.name}`} onClick={() => updateQuantity(product.id,-cart[product.id])}><Trash2 size={18} /></button></article>)}</div><p className="sf-total"><span>Tạm tính</span><strong>{money(cartTotal)}</strong></p>{demo ? <button className="sf-button" onClick={onCartAction}>{cartActionLabel}</button> : <p>Chức năng đặt hàng chưa khả dụng.</p>}</> : <div className="sf-empty"><ShoppingCart size={32} /><h3>Giỏ hàng đang trống</h3><button className="sf-button" onClick={() => { closeDialog(); scrollTo('shop-products'); }}>Khám phá sản phẩm</button></div>}</>}
  </dialog>;
}
