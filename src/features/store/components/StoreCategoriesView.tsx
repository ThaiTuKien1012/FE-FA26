import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, RefreshCw } from 'lucide-react';
import type { ActiveNavScreen } from '../../../types/mining';
import { canManageCatalog, f02ErrorMessage, storeApi, type F02Category, type F02Status } from '../store.api';
import { categoryRequest } from '../f02.forms';
import { F02Dialog } from './F02Dialog';
import { categoryTableRows, emptyCategoryFilters, nextTableSort, tablePage, type CategoryFilters, type CategorySortKey, type TableSort } from '../f02.tables';
import { F02FilterSummary, F02TableFrame, F02TableHeader, F02TablePagination, F02TableEmpty } from './F02Table';

const categoryViewStateKey = 'f02-categories-view-state';
const readCategoryViewState = () => { try { return JSON.parse(sessionStorage.getItem(categoryViewStateKey) || '{}') as { page?: number; filters?: CategoryFilters; sort?: TableSort<CategorySortKey> | null }; } catch { return {}; } };
export const StoreCategoriesView: React.FC<{ onNavigate?: (screen: ActiveNavScreen) => void }> = () => {
  const canManage = canManageCatalog();
  const [categories, setCategories] = useState<F02Category[]>([]), [form, setForm] = useState({ name: '', status: 'ACTIVE' as F02Status });
  const [editing, setEditing] = useState<F02Category | null>(null), [open, setOpen] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [formError, setFormError] = useState(''), [success, setSuccess] = useState('');
  const restored = readCategoryViewState();
  const [page, setPage] = useState(restored.page ?? 0), pending = useRef(false), version = useRef(0);
  const [filters, setFilters] = useState<CategoryFilters>({ ...emptyCategoryFilters, ...restored.filters, id: '' });
  const [sort, setSort] = useState<TableSort<CategorySortKey> | null>(restored.sort ?? null);
  const matching = useMemo(() => categoryTableRows(categories, filters, sort), [categories, filters, sort]);
  const totalPages = Math.max(Math.ceil(matching.length / 10), 1), visibleCategories = tablePage(matching, page);
  const filter = (key: keyof CategoryFilters, value: string) => { setFilters(current => ({ ...current, [key]: value })); setPage(0); };
  const sortColumn = (by: string) => { setSort(current => nextTableSort(current, by as CategorySortKey)); setPage(0); };
  const clearFilters = () => { setFilters(emptyCategoryFilters); setPage(0); };
  const load = async () => {
    const current = ++version.current;
    setLoading(true); setError('');
    try { const cats = await storeApi.listCategories(); if (current === version.current) setCategories(cats); }
    catch (e) { if (current === version.current) setError(f02ErrorMessage(e)); }
    finally { if (current === version.current) setLoading(false); }
  };
  useEffect(() => { void load(); return () => { ++version.current; }; }, []);
  useEffect(() => { sessionStorage.setItem(categoryViewStateKey, JSON.stringify({ page, filters, sort })); }, [page, filters, sort]);
  useEffect(() => { if (!loading && page >= totalPages) setPage(Math.max(totalPages - 1, 0)); }, [page, totalPages, loading]);
  const mutate = async (action: () => Promise<void>) => {
    if (pending.current || !canManage) return;
    pending.current = true; setBusy(true); setError(''); setFormError(''); setSuccess('');
    try { await action(); } catch (e) { if (open) setFormError(f02ErrorMessage(e)); else setError(f02ErrorMessage(e)); }
    finally { pending.current = false; setBusy(false); }
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(async () => { const body = categoryRequest(form); if (editing) await storeApi.updateCategory(editing.id, body); else await storeApi.createCategory(body); setOpen(false); setSuccess(editing ? 'Category updated successfully.' : 'Category created successfully.'); await load(); });
  };
  return <div className="f02-category-view mx-auto max-w-5xl space-y-6 text-[#191c1b]">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-semibold">Category Management</h1><p className="mt-1 text-[#6d7974]">Manage categories available to this store.</p></div><div className="flex gap-2"><button aria-label="Refresh categories" disabled={busy || loading} onClick={() => void load()} className="rounded-lg border border-[#e7e2d8] bg-white p-3 text-[#1e3a2f] disabled:opacity-40"><RefreshCw className="h-4 w-4" /></button>{canManage && <button disabled={busy || loading} onClick={() => { setEditing(null); setForm({ name: '', status: 'ACTIVE' }); setFormError(''); setSuccess(''); setOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a2f] px-4 py-2 font-semibold text-white disabled:opacity-40"><Plus className="h-4 w-4" /> Add category</button>}</div></div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error} <button disabled={busy || loading} onClick={() => void load()} className="underline">Retry categories</button></p>}
    {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">{success}</p>}
    <div className="f02-toolbar" role="search" aria-label="Category filters">
      <label className="f02-toolbar-search">Search<input aria-label="Search category name" placeholder="Search category name" disabled={busy} value={filters.name} onChange={e => filter('name', e.target.value)} /></label>
      <label>Status<select aria-label="Filter category status" disabled={busy} value={filters.status} onChange={e => filter('status', e.target.value)}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
      <F02FilterSummary active={Boolean(filters.name || filters.status)} onClearAll={clearFilters} />
    </div>
    <F02TableFrame label="Categories" loading={loading} hasData={categories.length > 0}>
      <table className="f02-data-table" style={{ minWidth: 680, '--f02-row-height': '64px' } as React.CSSProperties}>
        <colgroup><col style={{ width: 100 }} /><col /><col style={{ width: 170 }} />{canManage && <col style={{ width: 112 }} />}</colgroup>
        <thead><tr>
          <F02TableHeader label="ID" column="id" sort={sort} onSort={sortColumn} numeric disabled={busy} />
          <F02TableHeader label="Name" column="name" sort={sort} onSort={sortColumn} disabled={busy} />
          <F02TableHeader label="Status" column="status" sort={sort} onSort={sortColumn} disabled={busy} />
          {canManage && <th scope="col">Actions</th>}
        </tr></thead>
        <tbody>{visibleCategories.map(category => <tr key={category.id}>
          <td className="f02-numeric font-mono">{category.id}</td>
          <td><span className="f02-cell-text font-semibold" title={category.name}>{category.name}</span></td>
          <td><button disabled={!canManage || busy || loading} onClick={() => void mutate(async () => { await storeApi.updateCategoryStatus(category.id, category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'); setSuccess('Category status updated successfully.'); await load(); })} aria-label={'Change status for ' + category.name} className={'f02-status-button rounded-full px-2.5 py-1 text-xs font-semibold disabled:cursor-default ' + (category.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>{category.status === 'ACTIVE' ? 'Active' : 'Inactive'}{canManage && <ChevronDown className="h-3.5 w-3.5" />}</button></td>
          {canManage && <td><div className="f02-cell-actions"><button disabled={busy || loading} onClick={() => void mutate(async () => { const detail = await storeApi.getCategory(category.id); setEditing(detail); setForm({ name: detail.name, status: detail.status }); setFormError(''); setOpen(true); })} className="text-[#1e3a2f] hover:underline">Edit</button></div></td>}
        </tr>)}<F02TableEmpty columns={canManage ? 4 : 3} message={!visibleCategories.length ? loading ? 'Loading categories...' : error ? 'Category data is unavailable. Please retry.' : categories.length ? 'No matching categories.' : 'No categories yet. Add a category to organize your products.' : undefined} /></tbody>
      </table>
    </F02TableFrame>
    <F02TablePagination label="Categories" page={page} totalPages={totalPages} total={matching.length} count={visibleCategories.length} disabled={busy || loading} onPage={setPage} />
    {open && canManage && <F02Dialog title={editing ? 'Edit category' : 'Add category'} busy={busy} onClose={() => setOpen(false)}><form onSubmit={save}><fieldset disabled={busy} className="space-y-4">{editing && <p className="text-sm text-[#6d7974]">Category ID: <strong>{editing.id}</strong> (read-only)</p>}{formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{formError}</p>}<label className="block">Category name<input aria-label="Category name" autoFocus required maxLength={150} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-[#e7e2d8] bg-white p-2" /></label><label className="block">Status<select aria-label="Category status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as F02Status })} className="mt-1 w-full rounded-lg border border-[#e7e2d8] bg-white p-2"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-[#e7e2d8] px-4 py-2">Cancel</button><button className="rounded-lg bg-[#1e3a2f] px-4 py-2 font-semibold text-white">{busy ? 'Saving…' : 'Save category'}</button></div></fieldset></form></F02Dialog>}
  </div>;
};
