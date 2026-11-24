import { useRef, useState } from 'react';
import { F02ApiError, f02ErrorMessage, storeApi, type F02Product } from '../store.api';
import { notifyProductDeleted } from '../f02.catalog-changes';
import { F02Dialog } from './F02Dialog';

export function ProductDeleteDialog({ product, onClose, onDeleted, onNotFound }: {
  product: F02Product;
  onClose: () => void;
  onDeleted: () => void;
  onNotFound: () => void;
}) {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const notFound = error instanceof F02ApiError && error.status === 404;
  const conflict = error instanceof F02ApiError && error.status === 409 &&
    (error.code === 'PRODUCT_HAS_SELLABLE_STOCK' || error.code === 'PRODUCT_IN_LIVE_CAMPAIGN') ? error : null;

  async function confirm() {
    if (pending.current || notFound) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await storeApi.deleteProduct(product.id);
      notifyProductDeleted(product.id);
      onDeleted();
    } catch (error) {
      setError(error);
      if (error instanceof F02ApiError && error.status === 404) onNotFound();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <F02Dialog title="Xóa sản phẩm?" busy={busy} onClose={onClose}>
    <p className="text-sm"><strong>{product.name}</strong> · SKU: {product.sku}</p>
    <p className="mt-2 text-sm text-[#6d7974]">Sản phẩm sẽ biến mất khỏi danh mục và các lựa chọn mới. Lịch sử vẫn được giữ.</p>
    {error != null && <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      <p>{conflict?.reason || f02ErrorMessage(error)}</p>
      {conflict && conflict.campaigns.length > 0 && <ul className="mt-2 list-disc pl-5">
        {conflict.campaigns.map(campaign => <li key={campaign.campaignId}>Campaign #{campaign.campaignId} · {campaign.status}</li>)}
      </ul>}
    </div>}
    <div className="mt-5 flex justify-end gap-2">
      <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-[#e7e2d8] px-4 py-2 text-sm">Hủy</button>
      <button type="button" disabled={busy || notFound} onClick={() => void confirm()} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? 'Đang xóa…' : 'Xóa sản phẩm'}
      </button>
    </div>
  </F02Dialog>;
}
