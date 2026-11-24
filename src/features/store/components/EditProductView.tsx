import { ProductDeleteDialog } from './ProductDeleteDialog';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import type { ActiveNavScreen } from '../../../types/mining';
import { canManageCatalog, f02ErrorMessage, storeApi, type F02Category, type F02Product } from '../store.api';
import { emptyProductForm, productRequest } from '../f02.forms';
import { productUnitScope, rememberProductUnit } from './ProductUnitInput';
import { ProductFields, productForm } from './ProductInventoryView';
import { StoreBatchesView } from './StoreBatchesView';
import { ProductNameConfirmation, useProductSave } from './ProductNameConfirmation';

interface Props { productId?: string; onNavigate: (screen: ActiveNavScreen) => void; products?: unknown[]; onProductUpdated?: (product: any) => void; onProductDeleted?: (id: string) => void; }
export const EditProductView: React.FC<Props> = ({ productId, onNavigate, onProductUpdated, onProductDeleted }) => {
  const [product, setProduct] = useState<F02Product | null>(null), [categories, setCategories] = useState<F02Category[]>([]);
  const [form, setForm] = useState(emptyProductForm), [loading, setLoading] = useState(true), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteNotFound, setDeleteNotFound] = useState(false);
  const version = useRef(0), canManage = canManageCatalog();
  const id = Number(productId), unitScope = productUnitScope();
  const load = async () => {
    const current = ++version.current;
    setLoading(true); setError('');
    if (!Number.isSafeInteger(id) || id < 1) { setError('No product was selected. Return to the inventory list and choose a product.'); setLoading(false); return; }
    if (!canManage) { setLoading(false); return; }
    try { const [p, cats] = await Promise.all([storeApi.getProduct(id), storeApi.listCategories()]); if (current !== version.current) return; setProduct(p); setForm(productForm(p)); setCategories(cats); }
    catch (e) { if (current === version.current) setError(f02ErrorMessage(e)); }
    finally { if (current === version.current) setLoading(false); }
  };
  useEffect(() => { void load(); return () => { ++version.current; }; }, [id]);
  const refreshStock = async () => { const updated = await storeApi.getProduct(id); setProduct(updated); onProductUpdated?.(updated); };
  const productSave = useProductSave(updated => {
    rememberProductUnit(updated.unit, unitScope);
    setProduct(updated); setForm(productForm(updated)); onProductUpdated?.(updated); setSuccess('Product updated successfully.');
  });
  const saving = productSave.saving || Boolean(productSave.confirmation);
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!product || saving || !canManage) return;
    setError(''); setSuccess(''); productSave.clearError();
    try { await productSave.submit(product.id, productRequest(form, categories)); }
    catch (e) { setError(f02ErrorMessage(e)); }
  };
  if (!canManage) return <p role="alert" className="p-6">You do not have permission to edit products.</p>;
  return <div className="mx-auto max-w-6xl space-y-6 text-[#191c1b]">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><button onClick={() => onNavigate('store-inventory')} className="mb-2 inline-flex items-center gap-2 text-sm text-[#1e3a2f]"><ArrowLeft className="h-4 w-4" /> Back to inventory</button><h1 className="text-3xl font-semibold">Product details</h1><p className="mt-1 text-[#6d7974]">Manage catalog information and received stock.</p></div><button aria-label="Refresh product details" disabled={loading || saving} onClick={() => void load()} className="rounded-lg border p-2 disabled:opacity-40"><RefreshCw className="h-4 w-4" /></button></div>
    {(error || productSave.error) && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error || productSave.error}{!product && <button onClick={() => void load()} className="ml-2 underline">Retry product</button>}</p>}
    {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">{success}</p>}
    {loading ? <p role="status" className="rounded-xl bg-white p-10 text-center">Loading product…</p> : product && <>
      <div className="flex justify-end"><button type="button" disabled={saving}
        onClick={() => { setDeleteNotFound(false); setDeleteOpen(true); }}
        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700">Xóa sản phẩm</button></div>
      <form onSubmit={save} className="rounded-2xl border border-[#e7e2d8] bg-white p-6"><fieldset disabled={saving} className="space-y-4"><h2 className="text-xl font-semibold">Catalog information</h2><ProductFields form={form} categories={categories} onChange={setForm} product={product} /><div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><span className="text-sm text-[#6d7974]">Total stock: <strong>{product.stockQuantity.toLocaleString('en-GB')}</strong> (includes blocked and expired batches)</span><button className="rounded-lg disabled:opacity-40 bg-[#1e3a2f] px-4 py-2 font-semibold text-white">{saving ? 'Saving…' : 'Save changes'}</button></div></fieldset></form>
      {deleteOpen && <ProductDeleteDialog product={product} onNotFound={() => setDeleteNotFound(true)}
        onClose={() => { setDeleteOpen(false); if (deleteNotFound) onNavigate('store-inventory'); }}
        onDeleted={() => { onProductDeleted?.(String(product.id)); onNavigate('store-inventory'); }} />}
      <StoreBatchesView key={product.id} product={product} onInventoryChanged={refreshStock} />
    </>}
    <ProductNameConfirmation save={productSave} />
  </div>;
};
