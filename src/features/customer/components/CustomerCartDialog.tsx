import type { RefObject } from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { useCustomerCart } from '../hooks/useCustomerCart';
import { CustomerCartContents } from './CustomerCartContents';

export function CustomerCartDialog({ dialogRef, storeName, state, onLogin, onFullCart }: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  storeName: string;
  state: ReturnType<typeof useCustomerCart>;
  onLogin: () => void;
  onFullCart?: () => void;
}) {
  const close = () => dialogRef.current?.close();
  return <dialog ref={dialogRef} aria-labelledby="customer-cart-title"
    className="fm-dialog fm-cart-dialog fixed inset-0 m-auto max-h-[90dvh] w-[min(650px,calc(100%_-_32px))] overflow-auto rounded-[18px] border-0 bg-white p-0 text-[#212529] shadow-xl backdrop:bg-[#03272470] backdrop:backdrop-blur-[4px]"
    onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="relative p-7 max-[580px]:px-5">
      <button type="button" autoFocus onClick={close} aria-label="Đóng giỏ hàng" className="absolute top-3 right-3 rounded-full p-2 text-[#65796d] hover:bg-[#f5f8f5]"><X size={21} /></button>
      <h2 id="customer-cart-title" className="pr-6 text-2xl font-semibold tracking-tight">Giỏ hàng ({state.count})</h2>
      <p className="mb-5 mt-1 text-sm text-[#65796d]">{storeName}</p>
      <CustomerCartContents state={state} onLogin={onLogin} />
      {onFullCart && <button onClick={() => { close(); onFullCart(); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#088178] px-4 py-3 text-sm font-semibold text-white hover:bg-[#06685f]">Mở trang giỏ hàng<ArrowRight size={16} /></button>}
    </div>
  </dialog>;
}
