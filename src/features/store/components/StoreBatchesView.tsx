import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info, Package, Plus, RefreshCw } from 'lucide-react';
import type { ActiveNavScreen } from '../../../types/mining';
import { canManageCatalog, f02ErrorMessage, storeApi, type F02Batch, type F02InventorySummary, type F02Product } from '../store.api';
import { batchCreateRequest, batchPatchRequest, batchPushState, emptyBatchForm, isExpired, isExpiringSoon, localDateTime, receivedDateTime, storeDate, storeTimeZone, validatePushDay } from '../f02.forms';
import { F02Dialog } from './F02Dialog';
import { F02Toast, type F02Notice } from './F02Toast';
import { ProductSelector } from './ProductSelector';

const inputClass = 'mt-1 w-full rounded-lg border border-[#e7e2d8] bg-white p-2 outline-none focus:border-[#1e3a2f]';
const buttonClass = 'min-h-10 rounded-lg border border-[#e7e2d8] bg-white px-3 py-2 text-sm text-[#1e3a2f] transition-colors hover:bg-[#f2f6f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315445] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40';

export const StoreBatchesView: React.FC<{ onNavigate?: (screen: ActiveNavScreen) => void; product?: F02Product; onInventoryChanged?: () => Promise<void> }> = ({ product, onInventoryChanged }) => {
  const canManage = canManageCatalog();
  const [selectedProduct, setSelectedProduct] = useState<F02Product | null>(product || null);
  const [batches, setBatches] = useState<F02Batch[]>([]), [summary, setSummary] = useState<F02InventorySummary | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState<F02Notice | null>(null);
  const [form, setForm] = useState(emptyBatchForm), [editing, setEditing] = useState<F02Batch | null>(null), [open, setOpen] = useState(false), [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false), pending = useRef(false), loadVersion = useRef(0), noticeId = useRef(0);
  const [today, setToday] = useState(() => storeDate());
  const productId = selectedProduct?.id;

  useEffect(() => { const timer = window.setInterval(() => setToday(storeDate()), 60000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (notice?.kind !== 'success') return;
    const timer = window.setTimeout(() => setNotice(current => current?.id === notice.id ? null : current), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const notify = (kind: F02Notice['kind'], text: string) => setNotice({ id: ++noticeId.current, kind, text });
  useEffect(() => { if (product) setSelectedProduct(product); }, [product]);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    if (!productId || !canManage) { setBatches([]); setSummary(null); return false; }
    setLoading(true); setError('');
    try {
      const [rows, stats] = await Promise.all([storeApi.listBatches(productId), storeApi.getSummary(productId)]);
      if (version === loadVersion.current) { setBatches(rows); setSummary(stats); return true; }
      return false;
    } catch (e) { if (version === loadVersion.current) setError(f02ErrorMessage(e)); return false; }
    finally { if (version === loadVersion.current) setLoading(false); }
  }, [productId, canManage]);
  useEffect(() => { setBatches([]); setSummary(null); setNotice(null); void load(); return () => { ++loadVersion.current; }; }, [load]);

  const runMutation = async (action: () => Promise<void>) => {
    if (pending.current || !canManage) return;
    pending.current = true; setBusy(true); setError(''); setFormError(''); setNotice(null);
    try { await action(); }
    catch (e) { if (open) setFormError(f02ErrorMessage(e)); else notify('error', f02ErrorMessage(e)); }
    finally { pending.current = false; setBusy(false); }
  };
  const refresh = async () => {
    setSummary(null);
    if (!await load()) setError(current => `Batch saved, but inventory could not be refreshed. ${current}`);
    try { await onInventoryChanged?.(); } catch (e) { setError(`The batch was saved, but product stock could not be refreshed. ${f02ErrorMessage(e)}`); }
  };
  const applyBatch = (updated: F02Batch) => setBatches(current => current.some(batch => batch.id === updated.id) ? current.map(batch => batch.id === updated.id ? updated : batch) : [updated, ...current]);
  const updateStatus = (batch: F02Batch) => void runMutation(async () => {
    const status = batch.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    const updated = await storeApi.updateBatch(batch.id, { status });
    if (updated.id !== batch.id || updated.status !== status) throw new Error('The server did not confirm the status change. Refresh batches and try again.');
    applyBatch(updated); await refresh();
    notify('success', status === 'BLOCKED' ? 'Batch blocked successfully.' : 'Batch unblocked successfully.');
  });
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    void runMutation(async () => {
      if (!selectedProduct) return;
      const updated = editing ? await storeApi.updateBatch(editing.id, batchPatchRequest(editing, form)) : await storeApi.createBatch(selectedProduct.id, batchCreateRequest(form, selectedProduct.requiresExpiry));
      applyBatch(updated); setOpen(false);
      await refresh();
      notify('success', editing ? 'Batch updated successfully.' : 'Inventory batch added successfully.');
    });
  };
  const editBatch = (batch: F02Batch) => void runMutation(async () => {
    const detail = await storeApi.getBatch(batch.id);
    setEditing(detail); setForm({ batchCode: detail.batchCode, receivedAt: localDateTime(new Date(detail.receivedAt)), expiryDate: detail.expiryDate || '', initialQuantity: String(detail.initialQuantity), remainingQuantity: String(detail.remainingQuantity), pushDay: detail.pushDay || '' });
    setFormError(''); setOpen(true);
  });
  const clearPushDay = () => void runMutation(async () => {
    if (!editing?.pushDay) return;
    const updated = await storeApi.clearPushDay(editing.id);
    applyBatch(updated); setEditing(updated); setForm(current => ({ ...current, pushDay: '' }));
    await refresh(); notify('success', 'Push Day cleared successfully.');
  });
  const pushError = validatePushDay(form.pushDay, form.expiryDate);
  const quantityError = /^(Quantity|Remaining quantity)/i.test(formError) ? formError : '';
  const codeError = /^Batch code/i.test(formError) ? formError : '';
  const receivedError = /valid received date/i.test(formError) ? formError : '';
  const expiryError = /enter an expiry date|expiry date is required/i.test(formError) ? formError : '';
  const pushSaveError = /Push Day|pushDay/i.test(formError) ? formError : '';
  const generalFormError = quantityError || codeError || receivedError || expiryError || pushSaveError ? '' : formError;
  const showMissingPushHint = selectedProduct?.requiresExpiry && !form.pushDay && !isExpired(form.expiryDate, today) && (editing ? editing.status === 'ACTIVE' && Number(form.remainingQuantity) > 0 : Number(form.initialQuantity) > 0);
  if (!canManage) return <p role="alert" className="p-6 text-[#6d7974]">You do not have permission to manage inventory batches.</p>;

  return <div className="mx-auto max-w-6xl space-y-6 text-[#191c1b]">
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div><h1 className="text-3xl font-semibold">Inventory Batches</h1><p className="mt-1 text-[#6d7974]">Manage received stock, expiry dates, and Push Days.</p></div>
      <div className="flex min-w-0 flex-1 flex-col items-end gap-2 sm:min-w-80">
        <div data-batch-actions className="flex gap-2"><button aria-label="Refresh batches" disabled={busy || loading || !productId} onClick={() => void load()} className={buttonClass}><RefreshCw className="h-4 w-4" /></button><button disabled={!selectedProduct || busy || loading} onClick={() => { setEditing(null); setForm(emptyBatchForm()); setFormError(''); setNotice(null); setOpen(true); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1e3a2f] px-4 py-2 font-semibold text-white disabled:opacity-40"><Plus className="h-4 w-4" /> Add batch</button></div>
        <div data-batch-toast-slot className="relative h-14 w-full max-w-md">{!open && <F02Toast notice={notice} onClose={() => setNotice(null)} />}</div>
      </div>
    </header>
    {!product && <ProductSelector value={selectedProduct} disabled={busy || open} onSelect={next => { if (next.id === productId) return; ++loadVersion.current; setLoading(true); setSelectedProduct(next); setOpen(false); }} />}
    {selectedProduct && <section aria-label="Currently viewing" className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e7e2d8] bg-white px-4 py-3">
      <div className="flex min-w-0 items-start gap-3"><Package aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-[#6d7974]" /><div className="min-w-0"><p className="text-xs text-[#6d7974]">Currently viewing</p><h2 className="mt-0.5 font-semibold text-[#191c1b] [overflow-wrap:anywhere]">{selectedProduct.name}</h2><p className="mt-0.5 text-xs text-[#6d7974] [overflow-wrap:anywhere]">SKU: {selectedProduct.sku}</p></div></div>
      <div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-[#f0f3ef] px-2 py-1 text-xs text-[#315445]">{selectedProduct.requiresExpiry ? 'Expiry tracking enabled' : 'No expiry tracking'}</span>{selectedProduct.status === 'INACTIVE' && <span className="text-xs text-[#6d7974]">Inactive product</span>}</div>
    </section>}
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error} <button disabled={busy || loading} onClick={() => void load()} className={buttonClass}>Retry batches</button></div>}
    {!loading && summary && <section aria-label="Inventory summary" className="space-y-2"><dl className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{[
      { label: 'Total stock', value: summary.totalQuantity, color: 'text-[#191c1b]', help: 'All remaining units, including expired and blocked stock.' },
      { label: 'Sellable', value: summary.sellableQuantity, color: 'text-[#315445]', help: 'Active stock with no expiry date or expiring after today.' },
      { label: 'Expired', value: summary.expiredQuantity, color: 'text-[#a44d4d]', help: 'Active stock expiring today or earlier.' },
      { label: 'Blocked', value: summary.blockedQuantity, color: 'text-[#8b6547]', help: 'Remaining units in blocked batches.' },
      { label: 'Expiring in 7 days', value: summary.expiringSoonQuantity, color: 'text-[#8b713a]', help: 'Sellable stock expiring in the next 7 days. Already included in Sellable.' },
    ].map(({ label, value, color, help }) => <div key={label} title={help} className={`flex min-w-0 flex-col justify-between rounded-xl border px-4 py-3 shadow-sm ${label === 'Expiring in 7 days' && value > 0 ? 'border-amber-200 bg-amber-50/50' : 'border-[#e7e2d8] bg-white'}`}><dt className="min-h-8 text-xs font-medium text-[#6d7974]">{label}</dt><dd className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value.toLocaleString('en-GB')}</dd></div>)}</dl><p className="text-xs text-[#6d7974]">Total includes expired and blocked stock. Expiring stock is already included in Sellable.</p></section>}
    {!loading && summary && summary.expiringSoonQuantity > 0 && <aside aria-label="Expiring stock" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-[#805f25]"><AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-medium">{summary.expiringSoonQuantity.toLocaleString('en-GB')} units expiring within 7 days</p><p className="mt-0.5 text-xs">Review the batches below to prioritize stock before expiry.</p></div></aside>}
    <div className="space-y-2"><p title={`Store time zone: ${storeTimeZone}. Batches expiring today are expired.`} className="flex items-center gap-1.5 text-xs text-[#6d7974]"><Info aria-hidden="true" className="h-3.5 w-3.5" />Expiry status follows the store's local date.</p>
    <div role="region" aria-label="Inventory batch table" tabIndex={0} className="overflow-x-auto rounded-xl border border-[#e7e2d8] bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315445]">{loading ? <p role="status" className="p-10 text-center text-[#6d7974]">Loading batches…</p> : !productId ? <p className="p-10 text-center text-[#6d7974]">Choose a product to view its batches.</p> : error && !batches.length ? <p className="p-10 text-center text-[#6d7974]">Batch data is unavailable. Please retry.</p> : !batches.length ? <p className="p-10 text-center text-[#6d7974]">No batches for this product yet. Add a batch to receive stock.</p> : <table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-[#faf8f5] text-xs uppercase text-[#89938f]"><tr>{['Batch code', 'Received', 'Expiry date', 'Push Day', 'Remaining / Initial', 'Status', 'Actions'].map((label, index) => <th key={label} className={`px-4 py-3 ${index === 4 ? 'text-right' : ''}`}>{label}</th>)}</tr></thead><tbody>{batches.map(batch => {
      const pushState = batchPushState(batch, today, selectedProduct?.requiresExpiry ?? false);
      return <tr key={batch.id} className="border-t border-[#eee7df] transition-colors hover:bg-[#fcfaf7] focus-within:bg-[#f7f9f5]">
        <td className="min-w-36 max-w-56 p-4 font-mono text-xs [overflow-wrap:anywhere]">{batch.batchCode}</td>
        <td className="whitespace-nowrap p-4 text-[#57534e]">{receivedDateTime(batch.receivedAt)}</td>
        <td className="whitespace-nowrap p-4">{batch.expiryDate || 'Not set'}{batch.status === 'ACTIVE' && isExpired(batch.expiryDate, today) ? <span className="mt-1 block text-xs font-medium text-red-700">Expired</span> : isExpiringSoon(batch, today) && <span className="mt-1 flex w-fit rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-[#805f25]">Expiring soon</span>}</td>
        <td className="min-w-44 p-4">{batch.pushDay || 'Not set'}{pushState && <span className={`mt-1 block text-xs ${pushState === 'reached' ? 'font-medium text-amber-700' : 'text-[#6d7974]'}`}>{pushState === 'reached' ? 'Push Day reached' : 'Set a Push Day for expiry-risk analysis.'}</span>}</td>
        <td className="whitespace-nowrap p-4 text-right tabular-nums"><span className="font-semibold">{batch.remainingQuantity.toLocaleString('en-GB')}</span><span className="text-[#89938f]"> / {batch.initialQuantity.toLocaleString('en-GB')}</span></td>
        <td className="p-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${batch.status === 'BLOCKED' ? 'bg-red-50 text-red-700' : 'bg-[#eaf2ec] text-[#315445]'}`}>{batch.status === 'ACTIVE' ? 'Active' : 'Blocked'}</span></td>
        <td className="p-4"><div className="flex items-center gap-3"><button disabled={busy || loading} onClick={() => editBatch(batch)} className={buttonClass}>Edit</button><button disabled={busy || loading} onClick={() => updateStatus(batch)} className={buttonClass}>{batch.status === 'BLOCKED' ? 'Unblock' : 'Block'}</button></div></td>
      </tr>;
    })}</tbody></table>}</div>
    </div>
    {open && <F02Dialog title={editing ? 'Edit inventory batch' : 'Add inventory batch'} busy={busy} onClose={() => setOpen(false)}>
      <form onSubmit={save} className="space-y-4"><fieldset disabled={busy} className="space-y-4">
        {editing && <div className="relative h-14"><F02Toast notice={notice} onClose={() => setNotice(null)} /></div>}
        {generalFormError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{generalFormError}</p>}
        {editing ? <><dl className="grid grid-cols-2 gap-3 rounded-lg bg-[#eaf0eb] p-3 text-sm"><div className="min-w-0"><dt>Batch code</dt><dd className="font-semibold [overflow-wrap:anywhere]">{editing.batchCode}</dd></div><div><dt>Received</dt><dd>{receivedDateTime(editing.receivedAt)}</dd></div><div><dt>Expiry date</dt><dd>{editing.expiryDate || 'Not set'}</dd></div><div><dt>Initial quantity</dt><dd>{editing.initialQuantity.toLocaleString('en-GB')}</dd></div></dl><p className="text-xs text-[#6d7974]">Received stock details cannot be changed.</p><label className="block text-sm">Remaining quantity<input aria-label="Remaining quantity" aria-invalid={Boolean(quantityError)} aria-describedby={quantityError ? 'f02-quantity-error' : undefined} autoFocus required type="number" min="0" step="1" max={editing.initialQuantity} value={form.remainingQuantity} onChange={e => { setFormError(''); setForm({ ...form, remainingQuantity: e.target.value }); }} className={inputClass} /></label>{quantityError && <p id="f02-quantity-error" role="alert" className="text-sm text-red-700">{quantityError}</p>}</> : <>
          <label className="block text-sm">Batch code<input aria-label="Batch code" aria-invalid={Boolean(codeError)} aria-describedby={codeError ? 'f02-code-error' : undefined} autoFocus required maxLength={80} value={form.batchCode} onChange={e => { setFormError(''); setForm({ ...form, batchCode: e.target.value }); }} className={inputClass} /></label>{codeError && <p id="f02-code-error" role="alert" className="text-sm text-red-700">{codeError}</p>}
          <label className="block text-sm">Received at (your local time)<input aria-label="Received at" aria-invalid={Boolean(receivedError)} aria-describedby={receivedError ? 'f02-received-error' : undefined} required type="datetime-local" value={form.receivedAt} onChange={e => { setFormError(''); setForm({ ...form, receivedAt: e.target.value }); }} className={inputClass} /></label>{receivedError && <p id="f02-received-error" role="alert" className="text-sm text-red-700">{receivedError}</p>}
          <label className="block text-sm">Expiry date{selectedProduct?.requiresExpiry ? ' (required)' : ' (optional)'}<input aria-label="Expiry date" aria-invalid={Boolean(expiryError)} aria-describedby={expiryError ? 'f02-expiry-error' : undefined} required={selectedProduct?.requiresExpiry} type="date" value={form.expiryDate} onChange={e => { setFormError(''); setForm({ ...form, expiryDate: e.target.value }); }} className={inputClass} /></label>{expiryError && <p id="f02-expiry-error" role="alert" className="text-sm text-red-700">{expiryError}</p>}
          <label className="block text-sm">Initial quantity<input aria-label="Initial quantity" aria-invalid={Boolean(quantityError)} aria-describedby={quantityError ? 'f02-quantity-error' : undefined} required type="number" min="1" max="2147483647" step="1" value={form.initialQuantity} onChange={e => { setFormError(''); setForm({ ...form, initialQuantity: e.target.value }); }} className={inputClass} /></label>{quantityError && <p id="f02-quantity-error" role="alert" className="text-sm text-red-700">{quantityError}</p>}
        </>}
        <label className="block text-sm">Push Day (optional)<input aria-label="Push Day" aria-invalid={Boolean(pushError || pushSaveError)} aria-describedby={`f02-push-help${pushError || pushSaveError ? ' f02-push-error' : ''}`} type="date" max={form.expiryDate || undefined} value={form.pushDay} onChange={e => { setFormError(''); setForm({ ...form, pushDay: e.target.value }); }} className={inputClass} /></label>
        <p id="f02-push-help" className="text-xs text-[#6d7974]">{selectedProduct?.requiresExpiry ? 'Choose the date when this batch should be prioritized before it expires. Used in expiry-risk analysis.' : 'Optional: choose a date to prioritize this batch. Expiry-risk analysis does not apply to this product.'}{showMissingPushHint && ' Without a Push Day, this batch may be excluded from expiry-risk calculations.'}</p>
        {(pushError || pushSaveError) && <p id="f02-push-error" role="alert" className="text-sm text-red-700">{pushError || pushSaveError}</p>}
        {editing?.pushDay && <button type="button" onClick={clearPushDay} className={buttonClass}>Clear Push Day</button>}
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className={buttonClass}>Cancel</button><button disabled={Boolean(pushError)} className="rounded-lg bg-[#1e3a2f] px-4 py-2 font-semibold text-white disabled:opacity-40">{busy ? 'Saving…' : 'Save batch'}</button></div>
      </fieldset></form>
    </F02Dialog>}
  </div>;
};
