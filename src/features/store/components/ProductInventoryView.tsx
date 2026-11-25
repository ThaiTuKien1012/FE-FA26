import { ProductDeleteDialog } from './ProductDeleteDialog';
import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Package, Plus, RefreshCw, X, type LucideIcon } from 'lucide-react';
import { ProductTableHeader } from '../../../components/common/ProductTableHeader';
import { canManageCatalog, f02ErrorMessage, storeApi, type F02Category, type F02Product, type F02Status } from '../store.api';
import { emptyProductForm, money, productRequest, type ProductForm, IMAGE_URL_MAX, DESCRIPTION_MAX } from '../f02.forms';
import { F02Dialog } from './F02Dialog';
import { ProductNameConfirmation, useProductSave } from './ProductNameConfirmation';
import { F02FilterSummary, F02TableFrame, F02TablePagination, F02TableEmpty } from './F02Table';
import { ProductUnitInput, productUnitScope, rememberProductUnit } from './ProductUnitInput';
import { nextTableSort, type SortDirection } from '../f02.tables';
import { restoreProductViewState } from '../f02.product-view';
import { useProductStats } from '../f02.product-stats';
import { GeneratedCodeField } from './GeneratedCodeField';

const inputClass = 'mt-1 w-full rounded-lg border border-[#e7e2d8] bg-white p-2 outline-none focus:border-[#1e3a2f]';
export const productForm = (p: F02Product): ProductForm => ({ name: p.name, categoryId: p.category ? String(p.category.id) : '', unit: p.unit, requiresExpiry: p.requiresExpiry, sellingPrice: String(p.sellingPrice), costPrice: String(p.costPrice), status: p.status, imageUrl: p.imageUrl ?? '', description: p.description ?? '' });

export function ProductFields({ form, categories, onChange, product }: { form: ProductForm; categories: F02Category[]; onChange: (form: ProductForm) => void; product?: F02Product | null }) {
  return <>
    <GeneratedCodeField label="SKU" code={product?.sku} />
    {product && <p className="text-sm text-[#6d7974]">Product ID: <strong>{product.id}</strong> (read-only)</p>}
    <ProductUnitInput value={form.unit} onChange={unit => onChange({ ...form, unit })} />
    <label className="block">Product name *<input aria-label="Product name" required maxLength={180} value={form.name} onChange={e => onChange({ ...form, name: e.target.value })} className={inputClass} /></label>
    <div className="grid gap-3 sm:grid-cols-2"><label>Category<select aria-label="Category" value={form.categoryId} onChange={e => onChange({ ...form, categoryId: e.target.value })} className={inputClass}><option value="">No category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}{c.status === 'INACTIVE' ? ' (Inactive)' : ''}</option>)}</select></label><label>Status *<select aria-label="Product status" value={form.status} onChange={e => onChange({ ...form, status: e.target.value as F02Status })} className={inputClass}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label></div>
    <div className="grid gap-3 sm:grid-cols-2"><label>Cost price *<input aria-label="Cost price" type="number" min="0" step="any" required value={form.costPrice} onChange={e => onChange({ ...form, costPrice: e.target.value })} className={inputClass} /></label><label>Selling price *<input aria-label="Selling price" type="number" min="0" step="any" required value={form.sellingPrice} onChange={e => onChange({ ...form, sellingPrice: e.target.value })} className={inputClass} /></label></div>
    {form.sellingPrice.trim() && form.costPrice.trim() && Number(form.sellingPrice) < Number(form.costPrice) && <p className="text-sm text-[#6d7974]">The selling price is below the cost price. You can still save this product.</p>}
    <label title={form.requiresExpiry ? 'Expiry date required for every batch' : 'Expiry date optional for batches'} className="flex items-center gap-2"><input aria-label="Requires expiry tracking" type="checkbox" checked={form.requiresExpiry} onChange={e => onChange({ ...form, requiresExpiry: e.target.checked })} className="accent-[#1e3a2f]" /> Expiry tracking</label>
    <label className="block">Image URL<input aria-label="Image URL" type="url" inputMode="url" maxLength={IMAGE_URL_MAX} placeholder="https://…" value={form.imageUrl} onChange={e => onChange({ ...form, imageUrl: e.target.value })} className={inputClass} /></label>
    <label className="block">Description<textarea aria-label="Description" maxLength={DESCRIPTION_MAX} rows={3} value={form.description} onChange={e => onChange({ ...form, description: e.target.value })} className={inputClass} /></label>
    <p className="text-xs text-[#6d7974]">Image URL and description are shown on the public storefront. Use a full http(s) link; image upload is not supported. Leave empty to show none.</p>
    <p className="text-xs text-[#6d7974]">Stock is calculated from inventory batches and includes blocked and expired stock. Manage batches separately to adjust stock and Push Days.</p>
  </>;
}

const productViewStateKey = 'f02-products-view-state';
const readProductViewState = () => { try { return restoreProductViewState(sessionStorage.getItem(productViewStateKey)); } catch { return restoreProductViewState(null); } };
export const ProductInventoryView: React.FC<{ onOpenProduct?: (id: number) => void }> = ({ onOpenProduct }) => {
  const canManage = canManageCatalog(), restoredState = readProductViewState(), unitScope = productUnitScope();
  const stats = useProductStats();
  const [products, setProducts] = useState<F02Product[]>([]), [categories, setCategories] = useState<F02Category[]>([]);
  const [page, setPage] = useState(restoredState.page ?? 0), [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<string>(restoredState.sortBy);
  const [sortDirection, setSortDirection] = useState<SortDirection>(restoredState.sortDirection === 'desc' ? 'desc' : 'asc');
  const sort = (field: string) => { const next = nextTableSort({ by: sortBy, direction: sortDirection }, field); setSortBy(next.by); setSortDirection(next.direction); setPage(0); };
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;
  const [query, setQuery] = useState(restoredState.query ?? ''), [status, setStatus] = useState(restoredState.status ?? ''), [categoryId, setCategoryId] = useState(restoredState.categoryId ?? '');
  const requestVersion = useRef(0), pending = useRef(false);
  const [loading, setLoading] = useState(true), [statusBusy, setBusy] = useState(false), [loadError, setLoadError] = useState(''), [formError, setFormError] = useState('');
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [form, setForm] = useState(emptyProductForm), [editing, setEditing] = useState<F02Product | null>(null), [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<F02Product | null>(null);
  const productSave = useProductSave(async (saved, wasEditing) => {
    rememberProductUnit(saved.unit, unitScope);
    setEditing(saved); setForm(productForm(saved)); setShowForm(false);
    setNotice({ type: 'success', text: `${wasEditing ? 'Product updated' : 'Product created'} successfully. SKU: ${saved.sku} · ID ${saved.id}` });
    await Promise.all([load(), stats.refresh()]);
  });
  const busy = statusBusy || productSave.saving;
  const load = async () => {
    const version = ++requestVersion.current;
    setLoading(true); setLoadError('');
    try {
      const [result, cats] = await Promise.all([storeApi.listProducts({ search: query, status: status || undefined, categoryId: categoryId || undefined, page, pageSize, sortBy, sortDirection }), storeApi.listCategories()]);
      if (version !== requestVersion.current) return;
      setProducts(result.content); setTotalElements(result.totalElements); setTotalPages(Math.max(result.totalPages, 1)); setCategories(cats);
      if (page >= Math.max(result.totalPages, 1)) setPage(Math.max(result.totalPages - 1, 0));
    } catch (e) { if (version === requestVersion.current) setLoadError(f02ErrorMessage(e)); }
    finally { if (version === requestVersion.current) setLoading(false); }
  };
  useEffect(() => { try { sessionStorage.setItem(productViewStateKey, JSON.stringify({ page, query, status, categoryId, sortBy, sortDirection })); } catch { /* Catalog remains usable if preferences cannot be saved. */ } }, [page, query, status, categoryId, sortBy, sortDirection]);
  useEffect(() => { void load(); return () => { ++requestVersion.current; }; }, [query, status, categoryId, page, sortBy, sortDirection]);
  const statCards: Array<[string, number | undefined, LucideIcon, string]> = [['TOTAL PRODUCTS', stats.values?.total, Package, 'text-[#1e3a2f]'], ['ACTIVE PRODUCTS', stats.values?.active, Check, 'text-[#059669]'], ['INACTIVE PRODUCTS', stats.values?.inactive, AlertTriangle, 'text-[#b45309]']];
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (pending.current || !canManage) return;
    setFormError(''); setNotice(null); productSave.clearError();
    try { await productSave.submit(editing?.id, productRequest(form, categories)); }
    catch (e) { setFormError(f02ErrorMessage(e)); }
  };
  const toggleStatus = async (p: F02Product) => {
    if (pending.current || !canManage) return;
    pending.current = true; setBusy(true); setNotice(null);
    try { await storeApi.updateProductStatus(p.id, p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'); setNotice({ type: 'success', text: 'Product status updated successfully.' }); await Promise.all([load(), stats.refresh()]); }
    catch (e) { setNotice({ type: 'error', text: f02ErrorMessage(e) }); }
    finally { pending.current = false; setBusy(false); }
  };
  const clearFilters = () => { setQuery(''); setCategoryId(''); setStatus(''); setPage(0); };
  const editProduct = (product: F02Product) => { setEditing(product); setForm(productForm(product)); setFormError(''); productSave.clearError(); setNotice(null); setShowForm(true); };
  const statusButton = (product: F02Product) => <button disabled={!canManage || busy || loading} onClick={() => void toggleStatus(product)} aria-label={'Change status for ' + product.name} title={'Change status for ' + product.name} className={'f02-status-button rounded-full px-2 py-1 text-xs font-semibold disabled:cursor-default ' + (product.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>{product.status === 'ACTIVE' ? 'Active' : 'Inactive'}</button>;
  const editButton = (product: F02Product) => canManage && <button disabled={busy || loading} onClick={() => editProduct(product)} aria-label={'Edit ' + product.name} title={'Edit ' + product.name} className="f02-product-edit">Edit</button>;
  const detailButton = (product: F02Product) => canManage && onOpenProduct && <button type="button" disabled={busy || loading}
    onClick={() => onOpenProduct(product.id)} aria-label={'Chi tiết ' + product.name} className="min-h-5 whitespace-nowrap text-xs font-semibold text-[#1e3a2f] underline-offset-2 hover:underline disabled:opacity-40">Chi tiết</button>;
  const deleteButton = (product: F02Product) => canManage && <button type="button" disabled={busy || loading}
    onClick={() => setDeleting(product)} aria-label={'Xóa sản phẩm ' + product.name} className="min-h-5 whitespace-nowrap text-xs font-semibold text-red-700 underline-offset-2 hover:underline disabled:opacity-40">Xóa</button>;
  const refreshDeleted = (id: number) => {
    setProducts(current => current.filter(product => product.id !== id));
    void Promise.all([load(), stats.refresh()]);
  };
  const emptyMessage = loading ? 'Loading products...' : loadError ? 'Product data is unavailable. Please retry.' : query || status || categoryId ? 'No matching products.' : 'This store has no products yet.';
  return <div className="f02-product-view f02-wide-table-view mx-auto max-w-[1680px] space-y-6 bg-[#faf8f5] text-[#191c1b]">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-semibold tracking-tight">Product Management</h1><p className="mt-1 text-[#6d7974]">Manage your store's products and pricing.</p></div><div className="flex gap-2"><button aria-label="Refresh products" disabled={busy || loading || stats.loading} onClick={() => void Promise.all([load(), stats.refresh()])} className="rounded-lg border border-[#e7e2d8] bg-white p-3 text-[#1e3a2f] shadow-sm disabled:opacity-40"><RefreshCw className="h-4 w-4" /></button>{canManage && <button disabled={busy || loading || Boolean(loadError)} onClick={() => { setEditing(null); setForm(emptyProductForm); setFormError(''); productSave.clearError(); setNotice(null); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a2f] px-4 py-2 font-semibold text-white shadow-sm disabled:opacity-40"><Plus className="h-4 w-4" /> Add product</button>}</div></div>
    {notice && <div role={notice.type === 'error' ? 'alert' : 'status'} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}><span>{notice.text}</span><button aria-label="Dismiss message" onClick={() => setNotice(null)}><X className="h-4 w-4" /></button></div>}
    {loadError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{loadError} {products.length > 0 && <span>Showing the previous results. </span>}<button disabled={loading || busy} onClick={() => void load()} className="ml-2 underline">Retry products</button></p>}
    <section aria-label="Store product statistics" aria-busy={stats.loading}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{statCards.map(([label, value, Icon, iconColor]) => <div key={label} className="min-w-0 rounded-2xl border border-[#e7e2d8] bg-white p-5 shadow-sm"><Icon className={`mb-3 h-5 w-5 ${iconColor}`} /><div className="text-xs font-semibold uppercase tracking-wide text-[#89938f]">{label}</div><div className={'mt-1 flex min-h-9 items-center font-bold ' + (!stats.loading && value === undefined ? 'text-base' : 'text-3xl')} data-product-stat={label}>{stats.loading ? '—' : value === undefined ? 'Unavailable' : value.toLocaleString('en-GB')}</div></div>)}</div>
      {stats.error && <p role="alert" className="mt-2 text-sm text-red-700">Product statistics are unavailable. {stats.error} <button disabled={busy || stats.loading} onClick={() => void stats.refresh()} className="underline">Retry statistics</button></p>}
    </section>
    <div className="f02-toolbar" role="search" aria-label="Product filters">
      <label className="f02-toolbar-search">Search<input aria-label="Search name or SKU" disabled={busy} value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} placeholder="Search name or SKU" /></label>
      <label>Category<select aria-label="Filter by category" disabled={busy} value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(0); }}><option value="">All categories</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label>Status<select aria-label="Filter by status" disabled={busy} value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
      <F02FilterSummary active={Boolean(query || categoryId || status)} onClearAll={clearFilters} />
    </div>
    <div className="f02-product-responsive"><F02TableFrame label="Products" loading={loading} hasData={products.length > 0}>
      <table className="f02-data-table f02-product-table" style={{ '--f02-row-height': '76px' } as React.CSSProperties}>
        <colgroup>{(canManage ? [14, 18, 13, 10, 10, 9, 8, 9, 9] : [15, 21, 14, 11, 11, 10, 8, 10]).map((width, index) => <col key={index} style={{ width: width + '%' }} />)}</colgroup>
        <thead><tr>{([['SKU', 'sku', 'SKU'], ['Product', 'name', 'Product name'], ['Category', 'category', 'Category'], ['Cost', 'costPrice', 'Cost price'], ['Selling', 'sellingPrice', 'Selling price'], ['Expiry', 'requiresExpiry', 'Expiry tracking'], ['Stock', 'stockQuantity', 'Total stock'], ['Status', 'status', 'Status']] as const).map(([label, field, description]) => <ProductTableHeader key={field} label={label} description={description} column={field} sort={{ by: sortBy, direction: sortDirection }} onSort={sort} disabled={busy} />)}{canManage && <th scope="col">Actions</th>}</tr></thead>
        <tbody>{products.map(product => <tr key={product.id}>
          <td className="font-mono text-xs"><span className="f02-product-sku" title={product.sku}>{product.sku}</span></td>
          <td><span className="f02-cell-text font-semibold" title={product.name}>{product.name}</span><span className="f02-product-unit" title={'Unit: ' + product.unit}>{product.unit}</span></td>
          <td><span className="f02-cell-text" title={product.category?.name || 'Uncategorized'}>{product.category?.name || 'Uncategorized'}</span></td>
          <td className="f02-numeric"><span className="f02-cell-amount" title={money(product.costPrice)}>{money(product.costPrice)}</span></td>
          <td className="f02-numeric"><span className="f02-cell-amount" title={money(product.sellingPrice)}>{money(product.sellingPrice)}</span></td>
          <td><span className="f02-cell-text" title={product.requiresExpiry ? 'Expiry required' : 'Expiry optional'}>{product.requiresExpiry ? 'Expiry required' : 'Expiry optional'}</span></td>
          <td className="f02-numeric font-semibold"><span className="f02-cell-amount" title={product.stockQuantity.toLocaleString('en-GB')}>{product.stockQuantity.toLocaleString('en-GB')}</span></td>
          <td>{statusButton(product)}</td>{canManage && <td><div className="grid justify-items-start gap-0.5">{editButton(product)}<div className="flex gap-2">{detailButton(product)}{deleteButton(product)}</div></div></td>}
        </tr>)}<F02TableEmpty columns={canManage ? 9 : 8} message={!products.length ? emptyMessage : undefined} /></tbody>
      </table>
      <div className="f02-product-cards" aria-label="Product cards">{products.map(product => <article key={product.id} className="f02-product-card">
        <div className="f02-product-card-heading"><span className="f02-product-sku font-mono" title={product.sku}>{product.sku}</span>{editButton(product)}</div>
        <h2 className="f02-cell-text font-semibold" title={product.name}>{product.name}</h2><span className="f02-product-unit">{product.unit}</span>
        <dl><div><dt>Category</dt><dd className="f02-cell-text" title={product.category?.name || 'Uncategorized'}>{product.category?.name || 'Uncategorized'}</dd></div><div><dt>Cost price</dt><dd>{money(product.costPrice)}</dd></div><div><dt>Selling price</dt><dd>{money(product.sellingPrice)}</dd></div><div><dt>Expiry</dt><dd>{product.requiresExpiry ? 'Expiry required' : 'Expiry optional'}</dd></div><div><dt>Total stock</dt><dd>{product.stockQuantity.toLocaleString('en-GB')}</dd></div><div><dt>Status</dt><dd>{statusButton(product)}</dd></div></dl>
        {canManage && <div className="mt-2 flex gap-4">{detailButton(product)}{deleteButton(product)}</div>}
      </article>)}{!products.length && <p className="f02-empty-card-message">{emptyMessage}</p>}</div>
    </F02TableFrame></div>
    <F02TablePagination label="Products" page={page} totalPages={totalPages} total={totalElements} count={products.length} disabled={busy || loading} onPage={setPage} />
    {deleting && canManage && <ProductDeleteDialog product={deleting} onClose={() => setDeleting(null)}
      onDeleted={() => { refreshDeleted(deleting.id); setDeleting(null); setNotice({ type: 'success', text: 'Đã xóa sản phẩm.' }); }}
      onNotFound={() => { void Promise.all([load(), stats.refresh()]); }} />}
    {showForm && canManage && <F02Dialog title={editing ? 'Edit product' : 'Add product'} busy={busy} onClose={() => setShowForm(false)}><form onSubmit={submit}><fieldset disabled={busy || Boolean(productSave.confirmation)} className="space-y-4">{(formError || productSave.error) && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{formError || productSave.error}</p>}<ProductFields form={form} categories={categories} onChange={setForm} product={editing} /><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-[#e7e2d8] px-4 py-2">Cancel</button><button className="rounded-lg bg-[#1e3a2f] px-4 py-2 font-semibold text-white disabled:opacity-40">{busy ? 'Saving…' : 'Save product'}</button></div></fieldset></form></F02Dialog>}
    <ProductNameConfirmation save={productSave} />
  </div>;
};
