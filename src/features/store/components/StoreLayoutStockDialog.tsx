import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { type F02Batch, type F02Product, storeApi } from '../store.api';

type Props = { product: F02Product; onClose: () => void; onUpdated: () => Promise<void> };

export function StoreLayoutStockDialog({ product, onClose, onUpdated }: Props) {
  const [batches, setBatches] = useState<F02Batch[]>([]);
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const load = async () => {
    const rows = await storeApi.listBatches(product.id);
    setBatches(rows);
    setQuantities(Object.fromEntries(rows.map(batch => [batch.id, String(batch.remainingQuantity)])));
  };

  useEffect(() => {
    let active = true;
    storeApi.listBatches(product.id)
      .then(rows => {
        if (!active) return;
        setBatches(rows);
        setQuantities(Object.fromEntries(rows.map(batch => [batch.id, String(batch.remainingQuantity)])));
      })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Không thể tải các lô hàng.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [product.id]);

  const saveBatch = async (batch: F02Batch) => {
    const next = Number(quantities[batch.id]);
    if (!Number.isSafeInteger(next) || next < 0 || next > batch.initialQuantity) {
      setError(`Số còn lại phải từ 0 đến ${batch.initialQuantity}.`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await storeApi.updateBatch(batch.id, { remainingQuantity: next });
      await Promise.all([load(), onUpdated()]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể cập nhật tồn kho.'); }
    finally { setSaving(false); }
  };

  const addBatch = async (event: React.FormEvent) => {
    event.preventDefault();
    const count = Number(quantity);
    if (!Number.isSafeInteger(count) || count <= 0 || !batchCode.trim()) {
      setError('Nhập mã lô và số lượng nguyên dương.');
      return;
    }
    if (product.requiresExpiry && !expiryDate) {
      setError('Sản phẩm này cần ngày hết hạn.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await storeApi.createBatch(product.id, {
        batchCode: batchCode.trim(), receivedAt: new Date().toISOString(),
        expiryDate: expiryDate || undefined, initialQuantity: count,
      });
      setBatchCode('');
      setQuantity('');
      setExpiryDate('');
      await Promise.all([load(), onUpdated()]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể thêm lô hàng.'); }
    finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#182A35]/55 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={`Chỉnh tồn kho ${product.name}`} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-[#263B4A]">Chỉnh số lượng tồn kho</h2><p className="mt-1 text-sm text-[#71808A]">{product.name} · {product.sku}</p></div><button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-1 text-[#71808A] hover:bg-[#F5F7F8]"><X className="h-5 w-5" /></button></div>
      <p className="mt-4 rounded-xl bg-[#F5F7F8] px-3 py-2 text-sm text-[#314A5E]">Tồn kho hiện tại: <strong>{product.stockQuantity}</strong>. Số tồn được tính từ các lô hàng của sản phẩm.</p>
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="mt-5 space-y-2"><h3 className="text-sm font-bold text-[#263B4A]">Các lô hàng</h3>{loading ? <p className="text-sm text-[#71808A]">Đang tải...</p> : batches.length ? batches.map(batch => <div key={batch.id} className="flex flex-wrap items-end gap-2 rounded-xl border border-[#E7E2D8] p-3"><div className="min-w-[150px] flex-1"><strong className="text-sm text-[#263B4A]">{batch.batchCode}</strong><p className="text-xs text-[#71808A]">Ban đầu {batch.initialQuantity} · {batch.status}{batch.expiryDate ? ` · HSD ${batch.expiryDate}` : ''}</p></div><label className="text-xs text-[#52636D]">Số còn lại<input type="number" min="0" max={batch.initialQuantity} step="1" value={quantities[batch.id] ?? ''} onChange={event => setQuantities(current => ({ ...current, [batch.id]: event.target.value }))} className="mt-1 block w-24 rounded-lg border border-[#CDD7DE] px-2 py-2 text-sm" /></label><button type="button" disabled={saving || quantities[batch.id] === String(batch.remainingQuantity)} onClick={() => void saveBatch(batch)} className="rounded-lg bg-[#263B4A] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Lưu lô</button></div>) : <p className="text-sm text-[#71808A]">Chưa có lô hàng. Thêm lô bên dưới để nhập tồn kho.</p>}</div>
      <form onSubmit={event => void addBatch(event)} className="mt-5 space-y-3 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] p-4"><h3 className="text-sm font-bold text-[#263B4A]">Nhập thêm hàng</h3><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-[#52636D]">Mã lô<input required maxLength={80} value={batchCode} onChange={event => setBatchCode(event.target.value)} placeholder="VD: NHAP-2026-01" className="mt-1 block w-full rounded-lg border border-[#CDD7DE] bg-white px-3 py-2 text-sm" /></label><label className="text-xs text-[#52636D]">Số lượng nhập<input required type="number" min="1" step="1" value={quantity} onChange={event => setQuantity(event.target.value)} className="mt-1 block w-full rounded-lg border border-[#CDD7DE] bg-white px-3 py-2 text-sm" /></label></div><label className="block text-xs text-[#52636D]">Ngày hết hạn {product.requiresExpiry ? '(bắt buộc)' : '(nếu có)'}<input type="date" required={product.requiresExpiry} value={expiryDate} onChange={event => setExpiryDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-[#CDD7DE] bg-white px-3 py-2 text-sm" /></label><button type="submit" disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-[#263B4A] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><Plus className="h-4 w-4" />Thêm lô hàng</button></form>
    </div>
  </div>;
}
