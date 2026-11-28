import { useState } from 'react';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { formatCustomerMoney as money } from '../customerMoney';
import type { useCustomerCart } from '../hooks/useCustomerCart';

export function CustomerCartContents({ state, onLogin }: {
  state: ReturnType<typeof useCustomerCart>;
  onLogin: () => void;
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  return (
      <div className="fm-cart-content" aria-busy={state.pending}>
        {state.message && <p role="status" className="mb-3 rounded-lg bg-[#f5f8f5] px-3 py-2 text-xs text-[#436858]">{state.message}</p>}
        {state.pending && <p role="status" className="mb-3 text-xs text-[#65796d]">Đang tải giỏ hàng…</p>}
        {state.signInRequired
          ? <button onClick={onLogin} className="text-xs font-semibold text-[#088178] underline">Đăng nhập</button>
          : state.needsReload && !state.pending && <button onClick={() => void state.load()}
            className="text-xs font-semibold text-[#088178] underline">Tải lại giỏ hàng</button>}
        {state.cart?.items.length === 0 && <p className="flex items-center gap-2 py-4 text-sm text-[#65796d]"><ShoppingCart size={18} />Giỏ hàng đang trống.</p>}
        {!!state.cart?.items.length && <ul className="divide-y divide-[#e7eeea]">
          {state.cart.items.map(line => {
            const name = line.name ?? 'Sản phẩm không còn bán';
            return <li key={line.itemId} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {line.imageUrl && <img src={line.imageUrl} alt="" className="size-11 shrink-0 rounded-lg bg-[#f5f8f5] object-contain" />}
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">{name}</p>
                  <p className="text-xs text-[#65796d]">{money(line.unitPrice)}{line.unit ? ` / ${line.unit}` : ''}</p>
                  {line.addedFromBundle && <p className="mt-1 text-xs text-[#088178]">Thêm từ gói sản phẩm</p>}
                  {line.state !== 'AVAILABLE' && <p className="text-xs text-[#65796d]">{line.state === 'OUT_OF_STOCK' ? 'Hết hàng' : 'Không còn bán'}</p>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex items-center rounded-lg border border-[#dce6df]">
                  <button type="button" className="p-2 disabled:opacity-40" aria-label={`Giảm số lượng ${name}`}
                    disabled={state.blocked || line.quantity === 1} onClick={() => void state.mutate({ kind: 'quantity', itemId: line.itemId, quantity: line.quantity - 1 })}><Minus size={14} /></button>
                  <span className="min-w-5 text-center text-xs tabular-nums">{line.quantity}</span>
                  <button type="button" className="p-2 disabled:opacity-40" aria-label={`Tăng số lượng ${name}`}
                    disabled={state.blocked || line.quantity >= 99 || line.state !== 'AVAILABLE'} onClick={() => void state.mutate({ kind: 'quantity', itemId: line.itemId, quantity: line.quantity + 1 })}><Plus size={14} /></button>
                </div>
                <button type="button" className="p-2 text-[#65796d] hover:text-[#c6564b] disabled:opacity-40"
                  aria-label={`Xóa ${name}`} disabled={state.blocked}
                  onClick={() => void state.mutate({ kind: 'remove', itemId: line.itemId })}><Trash2 size={16} /></button>
                <strong className="text-xs tabular-nums">{money(line.lineTotal)}</strong>
              </div>
            </li>;
          })}
        </ul>}
        {!!state.cart?.items.length && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7eeea] pt-4">
          <p className="text-xs text-[#65796d]">Tối đa 99 đơn vị mỗi sản phẩm.</p>
          {!confirmClear ? <button type="button" disabled={state.blocked} onClick={() => setConfirmClear(true)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#a04d35] hover:bg-[#fff3ef] disabled:opacity-40"><Trash2 size={15} />Xóa toàn bộ</button>
            : <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Xác nhận xóa giỏ hàng">
              <span className="text-sm">Xóa tất cả sản phẩm?</span>
              <button disabled={state.blocked} className="rounded-lg bg-[#a04d35] px-3 py-2 text-sm text-white disabled:opacity-40" onClick={() => { setConfirmClear(false); void state.mutate({ kind: 'clear' }); }}>Xác nhận xóa</button>
              <button className="rounded-lg border border-[#dce6df] px-3 py-2 text-sm" onClick={() => setConfirmClear(false)}>Hủy</button>
            </div>}
        </div>}
        {state.cart && <div className="mt-3 flex items-center justify-between border-t border-[#e7eeea] pt-4">
          <span className="text-sm">Tạm tính</span><strong className="text-lg text-[#088178]">{money(state.cart.subtotal)}</strong>
        </div>}
        {state.cart?.subtotal === null && <p className="mt-3 text-sm text-[#a04d35]">Có sản phẩm chưa có giá hoặc không còn bán. Hãy kiểm tra lại các dòng trong giỏ.</p>}
      </div>
  );
}
