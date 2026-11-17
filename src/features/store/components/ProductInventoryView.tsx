import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Ban, Check, ChevronDown, Package, Plus, RefreshCw, Search, X, type LucideIcon } from 'lucide-react';
import { canManageCatalog, f02ErrorMessage, storeApi, type F02Category, type F02Product, type F02Status } from '../store.api';
import { emptyProductForm, money, productRequest, type ProductForm } from '../f02.forms';
import { F02Dialog } from './F02Dialog';

const inputClass = 'mt-1 w-full rounded-lg border border-[#e7e2d8] bg-white p-2 outline-none focus:border-[#1e3a2f]';
export const productForm = (p: F02Product): ProductForm => ({ sku: p.sku, name: p.name, categoryId: p.category ? String(p.category.id) : '', unit: p.unit, requiresExpiry: p.requiresExpiry, sellingPrice: String(p.sellingPrice), costPrice: String(p.costPrice), status: p.status });

export function ProductFields({ form, categories, onChange }: { form: ProductForm; categories: F02Category[]; onChange: (form: ProductForm) => void }) {
  const unitOptionsId = useId();
  return <>
    <div className="grid gap-3 sm:grid-cols-2"><label>SKU<input aria-label="SKU" autoFocus required maxLength={80} value={form.sku} onChange={e => onChange({ ...form, sku: e.target.value })} className={inputClass} /></label><label>Unit<input aria-label="Unit" list={unitOptionsId} aria-describedby={`${unitOptionsId}-help`} required maxLength={40} value={form.unit} onChange={e => onChange({ ...form, unit: e.target.value })} className={inputClass} /><datalist id={unitOptionsId}>{['Piece', 'Box', 'Pack', 'Bottle', 'Bag'].map(unit => <option key={unit} value={unit} />)}</datalist><span id={`${unitOptionsId}-help`} className="mt-1 block text-xs text-[#6d7974]">Choose a suggestion or enter your own unit.</span></label></div>
    <label className="block">Product name<input aria-label="Product name" required maxLength={180} value={form.name} onChange={e => onChange({ ...form, name: e.target.value })} className={inputClass} /></label>
    <div className="grid gap-3 sm:grid-cols-2"><label>Category<select aria-label="Category" value={form.categoryId} onChange={e => onChange({ ...form, categoryId: e.target.value })} className={inputClass}><option value="">No category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}{c.status === 'INACTIVE' ? ' (Inactive)' : ''}</option>)}</select></label><label>Status<select aria-label="Product status" value={form.status} onChange={e => onChange({ ...form, status: e.target.value as F02Status })} className={inputClass}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label></div>
    <div className="grid gap-3 sm:grid-cols-2"><label>Selling price<input aria-label="Selling price" type="number" min="0" step="any" required value={form.sellingPrice} onChange={e => onChange({ ...form, sellingPrice: e.target.value })} className={inputClass} /></label><label>Cost price<input aria-label="Cost price" type="number" min="0" step="any" required value={form.costPrice} onChange={e => onChange({ ...form, costPrice: e.target.value })} className={inputClass} /></label></div>
    {form.sellingPrice.trim() && form.costPrice.trim() && Number(form.sellingPrice) < Number(form.costPrice) && <p className="text-sm text-[#6d7974]">The selling price is below the cost price. You can still save this product.</p>}
    <label className="flex items-center gap-2"><input aria-label="Requires expiry tracking" type="checkbox" checked={form.requiresExpiry} onChange={e => onChange({ ...form, requiresExpiry: e.target.checked })} className="accent-[#1e3a2f]" /> Requires expiry date for batches</label>
    <p className="text-xs text-[#6d7974]">Stock is calculated from inventory batches and includes blocked and expired stock. Manage batches separately to adjust stock and Push Days.</p>
  </>;
}

const productViewStateKey = 'f02-products-view-state';
const readProductViewState = () => { try { return JSON.parse(sessionStorage.getItem(productViewStateKey) || '{}') as { page?: number; query?: string; status?: string; categoryId?: string }; } catch { return {}; } };
export const ProductInventoryView: React.FC<{ onNavigate?: (screen: any) => void }> = () => {
  const canManage = canManageCatalog(), restoredState = readProductViewState();
  const [products, setProducts] = useState<F02Product[]>([]), [categories, setCategories] = useState<F02Category[]>([]);
  const [page, setPage] = useState(restoredState.page ?? 0), [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;
  const [query, setQuery] = useState(restoredState.query ?? ''), [status, setStatus] = useState(restoredState.status ?? ''), [categoryId, setCategoryId] = useState(restoredState.categoryId ?? '');
  const tableScrollY = useRef(0), requestVersion = useRef(0), pending = useRef(false);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [loadError, setLoadError] = useState(''), [formError, setFormError] = useState('');
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [form, setForm] = useState(emptyProductForm), [editing, setEditing] = useState<F02Product | null>(null), [showForm, setShowForm] = useState(false);
  const load = async () => {
    const version = ++requestVersion.current;
    setLoading(true); setLoadError('');
    try {
      const [result, cats] = await Promise.all([storeApi.listProducts({ search: query, status: status || undefined, categoryId: categoryId || undefined, page, pageSize }), storeApi.listCategories()]);
      if (version !== requestVersion.current) return;
      setProducts(result.content); setTotalPages(Math.max(result.totalPages, 1)); setCategories(cats);
      if (page >= Math.max(result.totalPages, 1)) setPage(Math.max(result.totalPages - 1, 0));
    } catch (e) { if (version === requestVersion.current) setLoadError(f02ErrorMessage(e)); }
    finally { if (version === requestVersion.current) setLoading(false); }
  };
  useEffect(() => { sessionStorage.setItem(productViewStateKey, JSON.stringify({ page, query, status, categoryId })); }, [page, query, status, categoryId]);
  useEffect(() => { if (!loading && tableScrollY.current > 0) requestAnimationFrame(() => window.scrollTo({ top: tableScrollY.current, behavior: 'auto' })); }, [page, loading]);
  useEffect(() => { void load(); return () => { ++requestVersion.current; }; }, [query, status, categoryId, page]);
  const stats = useMemo(() => ({ total: products.length, active: products.filter(p => p.status === 'ACTIVE').length, inactive: products.filter(p => p.status === 'INACTIVE').length, noStock: products.filter(p => p.stockQuantity === 0).length }), [products]);
  const statCards: Array<[string, number, LucideIcon, string]> = [['Products · current page', stats.total, Package, 'text-[#1e3a2f]'], ['Active · current page', stats.active, Check, 'text-[#059669]'], ['Inactive · current page', stats.inactive, AlertTriangle, 'text-[#b45309]'], ['Out of stock · current page', stats.noStock, Ban, 'text-[#dc2626]']];
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (pending.current || !canManage) return;
    pending.current = true; setBusy(true); setFormError(''); setNotice(null);
    try {
      const body = productRequest(form, categories);
      if (editing) await storeApi.updateProduct(editing.id, body); else await storeApi.createProduct(body);
      setShowForm(false); setNotice({ type: 'success', text: editing ? 'Product updated successfully.' : 'Product created successfully.' }); await load();
    } catch (e) { setFormError(f02ErrorMessage(e)); }
    finally { pending.current = false; setBusy(false); }
  };
  const toggleStatus = async (p: F02Product) => {
    if (pending.current || !canManage) return;
    pending.current = true; setBusy(true); setNotice(null);
    try { await storeApi.updateProductStatus(p.id, p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'); setNotice({ type: 'success', text: 'Product status updated successfully.' }); await load(); }
    catch (e) { setNotice({ type: 'error', text: f02ErrorMessage(e) }); }
    finally { pending.current = false; setBusy(false); }
  };
  return <div className="mx-auto max-w-7xl space-y-6 bg-[#faf8f5] text-[#191c1b]">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-semibold tracking-tight">Product Management</h1><p className="mt-1 text-[#6d7974]">Manage your store's products, pricing, status, and stock information.</p></div><div className="flex gap-2"><button aria-label="Refresh products" disabled={busy || loading} onClick={() => void load()} className="rounded-lg border border-[#e7e2d8] bg-white p-3 text-[#1e3a2f] shadow-sm disabled:opacity-40"><RefreshCw className="h-4 w-4" /></button>{canManage && <button disabled={busy || loading || Boolean(loadError)} onClick={() => { setEditing(null); setForm(emptyProductForm); setFormError(''); setNotice(null); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a2f] px-4 py-2 font-semibold text-white shadow-sm disabled:opacity-40"><Plus className="h-4 w-4" /> Add product</button>}</div></div>
    {notice && <div role={notice.type === 'error' ? 'alert' : 'status'} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}><span>{notice.text}</span><button aria-label="Dismiss message" onClick={() => setNotice(null)}><X className="h-4 w-4" /></button></div>}
    {loadError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{loadError} <button disabled={loading || busy} onClick={() => void load()} className="ml-2 underline">Retry products</button></p>}
    {!loadError && <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">{statCards.map(([label, value, Icon, iconColor]) => <div key={label} className="rounded-2xl border border-[#e7e2d8] bg-white p-5 shadow-sm"><Icon className={`mb-3 h-5 w-5 ${iconColor}`} /><div className="text-xs font-semibold uppercase tracking-wide text-[#89938f]">{label}</div><div className="mt-1 text-3xl font-bold">{loading ? '—' : value}</div></div>)}</div>}
    <div className="flex flex-wrap gap-3 rounded-xl border border-[#e7e2d8] bg-white p-4 shadow-sm"><div className="relative min-w-0 flex-1 basis-60"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[#89938f]" /><input aria-label="Search name or SKU" disabled={busy} value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} placeholder="Search name or SKU" className="w-full rounded-lg border border-[#e7e2d8] bg-[#faf8f5] px-9 py-2 outline-none focus:border-[#1e3a2f]" /></div><select aria-label="Filter by category" disabled={busy} value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(0); }} className="max-w-full rounded-lg border border-[#e7e2d8] bg-[#faf8f5] px-3 py-2"><option value="">All categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select aria-label="Filter by status" disabled={busy} value={status} onChange={e => { setStatus(e.target.value); setPage(0); }} className="rounded-lg border border-[#e7e2d8] bg-[#faf8f5] px-3 py-2"><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div>
    <div className="overflow-hidden rounded-xl border border-[#e7e2d8] bg-white shadow-sm">{loading ? <p role="status" className="p-10 text-center text-[#6d7974]">Loading products…</p> : loadError ? <p className="p-10 text-center text-[#6d7974]">Product data is unavailable. Please retry.</p> : products.length === 0 ? <p className="p-10 text-center text-[#6d7974]">{query || status || categoryId ? 'No products match the current filters.' : 'This store has no products yet.'}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-[#faf8f5] text-xs uppercase text-[#89938f]"><tr>{['SKU', 'Product', 'Category', 'Selling price', 'Cost price', 'Total stock', 'Status', ...(canManage ? ['Actions'] : [])].map(label => <th key={label} className="p-4">{label}</th>)}</tr></thead><tbody>{products.map(p => <tr key={p.id} className="border-t border-[#eee7df] hover:bg-[#fcfaf7]"><td className="p-4 font-mono">{p.sku}</td><td className="p-4 font-semibold"><div>{p.name}</div><div className="text-xs font-normal text-[#89938f]">{p.unit}</div></td><td className="p-4">{p.category?.name || 'Uncategorized'}</td><td className="whitespace-nowrap p-4">{money(p.sellingPrice)}</td><td className="whitespace-nowrap p-4">{money(p.costPrice)}</td><td className="p-4 font-semibold">{p.stockQuantity.toLocaleString('en-GB')}</td><td className="p-4"><button disabled={!canManage || busy} onClick={() => void toggleStatus(p)} aria-label={`Change status for ${p.name}`} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold disabled:cursor-default ${p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{p.status === 'ACTIVE' ? 'Active' : 'Inactive'}{canManage && <ChevronDown className="h-3.5 w-3.5" />}</button></td>{canManage && <td className="p-4"><button disabled={busy} onClick={() => { setEditing(p); setForm(productForm(p)); setFormError(''); setNotice(null); setShowForm(true); }} className="text-[#1e3a2f] hover:underline">Edit</button></td>}</tr>)}</tbody></table></div>}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e7e2d8] bg-white px-4 py-3 text-sm text-[#6d7974]"><span>Showing page {page + 1} of {totalPages} · 10 products per page</span><div aria-label="Product pagination" className="flex max-w-full items-center gap-1 overflow-x-auto"><button disabled={busy || loading || page === 0} onClick={() => { tableScrollY.current = window.scrollY; setPage(p => p - 1); }} className="rounded-lg border border-[#e7e2d8] px-3 py-1.5 disabled:opacity-40">Previous</button>{Array.from({ length: totalPages }, (_, index) => <button key={index} aria-current={page === index ? 'page' : undefined} disabled={busy || loading} onClick={() => { tableScrollY.current = window.scrollY; setPage(index); }} className={`min-w-8 rounded-lg border px-2 py-1.5 ${page === index ? 'border-[#1e3a2f] bg-[#1e3a2f] text-white' : 'border-[#e7e2d8]'}`}>{index + 1}</button>)}<button disabled={busy || loading || page + 1 >= totalPages} onClick={() => { tableScrollY.current = window.scrollY; setPage(p => p + 1); }} className="rounded-lg border border-[#e7e2d8] px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
    {showForm && canManage && <F02Dialog title={editing ? 'Edit product' : 'Add product'} busy={busy} onClose={() => setShowForm(false)}><form onSubmit={submit}><fieldset disabled={busy} className="space-y-4">{formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{formError}</p>}<ProductFields form={form} categories={categories} onChange={setForm} /><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-[#e7e2d8] px-4 py-2">Cancel</button><button className="rounded-lg bg-[#1e3a2f] px-4 py-2 font-semibold text-white">{busy ? 'Saving…' : 'Save product'}</button></div></fieldset></form></F02Dialog>}
  </div>;
};
