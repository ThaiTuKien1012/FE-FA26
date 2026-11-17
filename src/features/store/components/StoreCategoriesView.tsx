import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, RefreshCw } from 'lucide-react';
import type { ActiveNavScreen } from '../../../types/mining';
import { canManageCatalog, f02ErrorMessage, storeApi, type F02Category, type F02Status } from '../store.api';
import { categoryRequest } from '../f02.forms';
import { F02Dialog } from './F02Dialog';

const categoryViewStateKey = 'f02-categories-view-state';
const readCategoryViewState = () => { try { return JSON.parse(sessionStorage.getItem(categoryViewStateKey) || '{}') as { page?: number }; } catch { return {}; } };
export const StoreCategoriesView: React.FC<{ onNavigate?: (screen: ActiveNavScreen) => void }> = () => {
  const canManage = canManageCatalog();
  const [categories, setCategories] = useState<F02Category[]>([]), [form, setForm] = useState({ name: '', status: 'ACTIVE' as F02Status });
  const [editing, setEditing] = useState<F02Category | null>(null), [open, setOpen] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [formError, setFormError] = useState(''), [success, setSuccess] = useState('');
  const [page, setPage] = useState(readCategoryViewState().page ?? 0), pending = useRef(false), version = useRef(0), tableScrollY = useRef(0);
  const pageSize = 10, totalPages = Math.max(Math.ceil(categories.length / pageSize), 1), visibleCategories = categories.slice(page * pageSize, (page + 1) * pageSize);
  const load = async () => {
    const current = ++version.current;
    setLoading(true); setError('');
    try { const cats = await storeApi.listCategories(); if (current === version.current) setCategories(cats); }
    catch (e) { if (current === version.current) setError(f02ErrorMessage(e)); }
    finally { if (current === version.current) setLoading(false); }
  };
  useEffect(() => { void load(); return () => { ++version.current; }; }, []);
  useEffect(() => { const saveScroll = () => { tableScrollY.current = window.scrollY; }; window.addEventListener('scroll', saveScroll, { passive: true }); return () => window.removeEventListener('scroll', saveScroll); }, []);
  useEffect(() => { sessionStorage.setItem(categoryViewStateKey, JSON.stringify({ page })); }, [page]);
  useEffect(() => { if (tableScrollY.current > 0) requestAnimationFrame(() => window.scrollTo({ top: tableScrollY.current, behavior: 'auto' })); }, [page]);
  useEffect(() => { if (page >= totalPages) setPage(Math.max(totalPages - 1, 0)); }, [page, totalPages]);
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
  return <div className="mx-auto max-w-5xl space-y-6 text-[#191c1b]">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-semibold">Category Management</h1><p className="mt-1 text-[#6d7974]">Manage categories available to this store.</p></div><div className="flex gap-2"><button aria-label="Refresh categories" disabled={busy || loading} onClick={() => void load()} className="rounded-lg border border-[#e7e2d8] bg-white p-3 text-[#1e3a2f] disabled:opacity-40"><RefreshCw className="h-4 w-4" /></button>{canManage && <button disabled={busy || loading} onClick={() => { setEditing(null); setForm({ name: '', status: 'ACTIVE' }); setFormError(''); setSuccess(''); setOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a2f] px-4 py-2 font-semibold text-white disabled:opacity-40"><Plus className="h-4 w-4" /> Add category</button>}</div></div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error} <button disabled={busy || loading} onClick={() => void load()} className="underline">Retry categories</button></p>}
    {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">{success}</p>}
    <div className="overflow-x-auto rounded-2xl border border-[#e7e2d8] bg-white shadow-sm">{loading ? <p role="status" className="p-10 text-center text-[#6d7974]">Loading categories…</p> : error ? <p className="p-10 text-center text-[#6d7974]">Category data is unavailable. Please retry.</p> : !categories.length ? <p className="p-10 text-center text-[#6d7974]">No categories yet. Add a category to organize your products.</p> : <table className="w-full min-w-[480px] text-left text-sm"><thead className="bg-[#faf8f5] text-xs uppercase text-[#89938f]"><tr><th className="p-4">ID</th><th className="p-4">Name</th><th className="p-4">Status</th>{canManage && <th className="p-4">Actions</th>}</tr></thead><tbody>{visibleCategories.map(c => <tr key={c.id} className="border-t border-[#eee7df]"><td className="p-4 font-mono">{c.id}</td><td className="p-4 font-semibold">{c.name}</td><td className="p-4"><button disabled={!canManage || busy} onClick={() => void mutate(async () => { await storeApi.updateCategoryStatus(c.id, c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'); setSuccess('Category status updated successfully.'); await load(); })} aria-label={`Change status for ${c.name}`} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold disabled:cursor-default ${c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{c.status === 'ACTIVE' ? 'Active' : 'Inactive'}{canManage && <ChevronDown className="h-3.5 w-3.5" />}</button></td>{canManage && <td className="p-4"><button disabled={busy} onClick={() => void mutate(async () => { const detail = await storeApi.getCategory(c.id); setEditing(detail); setForm({ name: detail.name, status: detail.status }); setFormError(''); setOpen(true); })} className="text-[#1e3a2f] hover:underline">Edit</button></td>}</tr>)}</tbody></table>}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e7e2d8] bg-white px-4 py-3 text-sm text-[#6d7974]"><span>Showing page {page + 1} of {totalPages} · 10 categories per page</span><div aria-label="Category pagination" className="flex max-w-full items-center gap-1 overflow-x-auto"><button disabled={busy || loading || page === 0} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-[#e7e2d8] px-3 py-1.5 disabled:opacity-40">Previous</button>{Array.from({ length: totalPages }, (_, index) => <button key={index} disabled={busy || loading} aria-current={page === index ? 'page' : undefined} onClick={() => setPage(index)} className={`min-w-8 rounded-lg border px-2 py-1.5 ${page === index ? 'border-[#1e3a2f] bg-[#1e3a2f] text-white' : 'border-[#e7e2d8]'}`}>{index + 1}</button>)}<button disabled={busy || loading || page + 1 >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-[#e7e2d8] px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
    {open && canManage && <F02Dialog title={editing ? 'Edit category' : 'Add category'} busy={busy} onClose={() => setOpen(false)}><form onSubmit={save}><fieldset disabled={busy} className="space-y-4">{formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{formError}</p>}<label className="block">Category name<input aria-label="Category name" autoFocus required maxLength={150} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-[#e7e2d8] bg-white p-2" /></label><label className="block">Status<select aria-label="Category status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as F02Status })} className="mt-1 w-full rounded-lg border border-[#e7e2d8] bg-white p-2"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-[#e7e2d8] px-4 py-2">Cancel</button><button className="rounded-lg bg-[#1e3a2f] px-4 py-2 font-semibold text-white">{busy ? 'Saving…' : 'Save category'}</button></div></fieldset></form></F02Dialog>}
  </div>;
};
