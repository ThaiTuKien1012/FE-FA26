import { useState } from 'react';
import { Gift, Plus, Trash2, X } from 'lucide-react';
import type { F02Product } from '../store.api';
import { comboFacts, type ComboPlan } from '../storeLayoutCombos';
import { illustratedPackshot, layoutImageFor } from '../storeLayoutMockCatalog';

function ItemImage({ product }: { product: F02Product }) {
  const [failed, setFailed] = useState(false);
  return <img src={failed ? illustratedPackshot(product) : layoutImageFor(product)} alt="" className="h-11 w-11 object-contain" onError={() => setFailed(true)} />;
}

type Props = {
  draft: ComboPlan;
  products: F02Product[];
  exists: boolean;
  error: string;
  onChange: (draft: ComboPlan) => void;
  onSave: (approve: boolean) => void;
  onDismiss: () => void;
  onClose: () => void;
};

export function StoreLayoutComboDialog({ draft, products, exists, error, onChange, onSave, onDismiss, onClose }: Props) {
  const facts = comboFacts(draft, products);
  const nameError = error === 'Vui lòng nhập tên combo.';
  const formatPrice = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
  const updateItem = (index: number, patch: Partial<ComboPlan['items'][number]>) => {
    const items = draft.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
    onChange({ ...draft, items });
  };

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#182A35]/55 p-4" onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="combo-dialog-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[22px] border border-[#E7E2D8] bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div><span className="inline-flex items-center gap-1 rounded-full bg-[#F7EEFC] px-2.5 py-1 text-[11px] font-bold text-[#785291]"><Gift className="h-3.5 w-3.5" />{draft.source === 'auto' ? 'Hệ thống đề xuất' : 'Combo tự tạo'}</span><h2 id="combo-dialog-title" className="mt-2 text-xl font-extrabold text-[#263B4A]">{exists ? 'Xem và chỉnh combo' : 'Tạo combo'}</h2><p className="mt-1 text-xs text-[#71808A]">Chọn các món muốn bán cùng nhau và đặt giá cho combo.</p></div>
        <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-2 text-[#71808A] hover:bg-[#F5F7F8]"><X className="h-5 w-5" /></button>
      </div>

      <label className="mt-5 block text-xs font-bold text-[#314A5E]">Tên combo
        <input autoFocus={!exists} required aria-invalid={nameError} aria-describedby={nameError ? 'combo-name-error' : undefined} value={draft.name} onChange={event => onChange({ ...draft, name: event.target.value })} maxLength={100} placeholder="Ví dụ: Combo bữa sáng" className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm font-normal outline-none focus:border-[#8B61A0] ${nameError ? 'border-rose-400' : 'border-[#D9E0E5]'}`} />
      </label>
      {nameError && <p id="combo-name-error" role="alert" className="mt-1 text-xs text-rose-700">{error}</p>}

      <div className="mt-5 flex items-center justify-between"><h3 className="text-sm font-bold text-[#263B4A]">Sản phẩm trong combo</h3><span className="text-xs text-[#71808A]">Ít nhất 2 món khác nhau</span></div>
      <div className="mt-2 space-y-2">
        {draft.items.map((item, index) => {
          const product = facts.items[index]?.product;
          return <div key={index} className="flex items-center gap-2 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] p-2">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white">{product ? <ItemImage product={product} /> : <Gift className="h-5 w-5 text-[#A6B2B8]" />}</span>
            <select aria-label={`Sản phẩm ${index + 1}`} value={item.productId} onChange={event => updateItem(index, { productId: Number(event.target.value) })} className="min-w-0 flex-1 rounded-lg border border-[#D9E0E5] bg-white px-2 py-2 text-xs">
              <option value={0}>Chọn sản phẩm</option>
              {products.map(option => <option key={option.id} value={option.id}>{option.name} · {option.sku}</option>)}
            </select>
            <label className="text-[10px] font-semibold text-[#52636D]">SL<input type="number" min={1} max={99} step={1} value={item.quantity} onChange={event => updateItem(index, { quantity: Number(event.target.value) })} className="mt-1 block w-16 rounded-lg border border-[#D9E0E5] bg-white px-2 py-2 text-xs" /></label>
            <button type="button" disabled={draft.items.length <= 2} onClick={() => onChange({ ...draft, items: draft.items.filter((_, itemIndex) => itemIndex !== index) })} aria-label={`Bỏ món ${index + 1}`} className="rounded-lg p-2 text-[#8C9AA2] hover:text-rose-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
          </div>;
        })}
      </div>
      <button type="button" disabled={draft.items.length >= 12} onClick={() => onChange({ ...draft, items: [...draft.items, { productId: 0, quantity: 1 }] })} className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#785291] hover:bg-[#F7EEFC] disabled:opacity-40"><Plus className="h-4 w-4" />Thêm món</button>

      <div className="mt-4 grid gap-3 rounded-xl bg-[#F5F7F8] p-4 sm:grid-cols-2">
        <div><p className="text-xs text-[#71808A]">Tổng giá khi mua lẻ</p><strong className="text-sm text-[#263B4A]">{facts.subtotal === null ? 'Chưa có giá' : formatPrice(facts.subtotal)}</strong></div>
        <div><p className="text-xs text-[#71808A]">Tối đa có thể bán</p><strong className={`text-sm ${facts.stock > 0 ? 'text-[#336B50]' : 'text-[#B65A37]'}`}>{facts.valid ? `${facts.stock} combo` : 'Chọn đủ món'}</strong></div>
      </div>
      <label className="mt-4 block text-xs font-bold text-[#314A5E]">Giá combo
        <input type="number" min={1} step={1000} value={draft.price ?? ''} onChange={event => onChange({ ...draft, price: event.target.value === '' ? null : Number(event.target.value) })} placeholder="Nhập giá trước khi duyệt" className="mt-1.5 w-full rounded-xl border border-[#D9E0E5] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#8B61A0]" />
      </label>
      {facts.subtotal !== null && draft.price !== null && draft.price > 0 && draft.price < facts.subtotal && <p className="mt-1 text-xs text-[#336B50]">Tiết kiệm {formatPrice(facts.subtotal - draft.price)} so với mua lẻ.</p>}
      {error && !nameError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      {facts.stock === 0 && facts.valid && <p className="mt-3 text-xs text-[#B65A37]">Ít nhất một món đã hết hàng. Có thể lưu đề xuất, nhưng cần bổ sung hàng trước khi duyệt.</p>}

      <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-[#E7E2D8] pt-4">
        <div>{exists && <button type="button" onClick={onDismiss} className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">{draft.source === 'auto' ? 'Bỏ qua đề xuất' : 'Gỡ combo'}</button>}</div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => onSave(false)} className="rounded-lg border border-[#D9E0E5] bg-white px-3 py-2 text-xs font-bold text-[#314A5E]">Lưu đề xuất</button><button type="button" onClick={() => onSave(true)} className="rounded-lg bg-[#263B4A] px-3 py-2 text-xs font-bold text-white">Duyệt combo</button></div>
      </div>
    </div>
  </div>;
}
