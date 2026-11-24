import { subscribeToProductDeletion } from '../f02.catalog-changes';
import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search } from 'lucide-react';
import { f02ErrorMessage, storeApi, type F02Product } from '../store.api';

export function ProductSelector({ value, onSelect, onClear, disabled = false }: { value: F02Product | null; onSelect: (product: F02Product) => void; onClear?: () => void; disabled?: boolean }) {
  const id = useId(), root = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
  const version = useRef(0), pending = useRef(false), activeOption = useRef<HTMLLIElement>(null);
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [rows, setRows] = useState<F02Product[]>([]);
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [nextPage, setNextPage] = useState(0), [hasMore, setHasMore] = useState(false), [active, setActive] = useState(-1);
  const [revision, setRevision] = useState(0);
  const close = () => { ++version.current; pending.current = false; setOpen(false); setActive(-1); };
  const load = async (page: number, currentVersion: number) => {
    if (pending.current) return;
    pending.current = true; setLoading(true); setError('');
    try {
      const result = await storeApi.listProducts({ search: query.trim(), page, pageSize: 20 });
      if (currentVersion !== version.current) return;
      setRows(current => page === 0 ? result.content : [...new Map([...current, ...result.content].map(p => [p.id, p])).values()]);
      setNextPage(page + 1); setHasMore(page + 1 < result.totalPages);
    } catch (e) { if (currentVersion === version.current) setError(f02ErrorMessage(e)); }
    finally { if (currentVersion === version.current) { pending.current = false; setLoading(false); } }
  };
  useEffect(() => {
    if (!open || disabled) return;
    const current = ++version.current;
    pending.current = false; setRows([]); setNextPage(0); setHasMore(false); setError(''); setLoading(true); setActive(-1);
    const timer = window.setTimeout(() => { void load(0, current); }, 300);
    return () => { window.clearTimeout(timer); ++version.current; pending.current = false; };
  }, [open, query, disabled, revision]);
  useEffect(() => subscribeToProductDeletion(id => {
    ++version.current; pending.current = false;
    if (value?.id === id) onClear?.();
    setRows(current => current.filter(row => row.id !== id));
    setRevision(current => current + 1);
  }), [value, onClear]);
  useEffect(() => { if (disabled) close(); }, [disabled]);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  useEffect(() => { activeOption.current?.scrollIntoView({ block: 'nearest' }); }, [active]);
  const expand = () => { if (!disabled && !open) { setQuery(''); setOpen(true); } };
  const choose = (product: F02Product) => { onSelect(product); close(); input.current?.focus(); };
  const keyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) { expand(); return; }
      if (rows.length) setActive(current => event.key === 'ArrowDown' ? Math.min(current + 1, rows.length - 1) : current <= 0 ? rows.length - 1 : current - 1);
    } else if (event.key === 'Enter' && open) { event.preventDefault(); if (rows[active]) choose(rows[active]); }
    else if (event.key === 'Tab') { /* Allow focus to reach Load more before leaving the selector. */ }
  };
  return <div ref={root} className="relative min-w-0" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close(); }}>
    <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[#315445]">Select product</label>
    <div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#89938f]" />
      <input id={id} ref={input} role="combobox" aria-label="Select product" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={open && rows[active] ? `${id}-option-${rows[active].id}` : undefined} autoComplete="off" placeholder="Search by product name or SKU" title={value ? `${value.sku} — ${value.name}` : undefined} disabled={disabled} value={open ? query : value?.sku || ''} onFocus={expand} onClick={expand} onKeyDown={keyDown} onChange={e => { ++version.current; pending.current = false; setLoading(true); setRows([]); setActive(-1); setQuery(e.target.value); setOpen(true); }} className="h-11 w-full rounded-lg border border-[#e7e2d8] bg-white pl-9 pr-10 text-sm outline-none focus:border-[#315445] focus:ring-2 focus:ring-[#e5f3eb] disabled:opacity-50" />
      {loading && open ? <Loader2 aria-hidden="true" className="pointer-events-none absolute right-3 top-3 h-4 w-4 animate-spin text-[#6d7974]" /> : <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[#89938f]" />}
    </div>
    {open && <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto overscroll-contain rounded-xl border border-[#e7e2d8] bg-white shadow-lg">
      <ul id={`${id}-list`} role="listbox" aria-label="Products" aria-busy={loading} className="p-1">{rows.map((product, index) => <li key={product.id} id={`${id}-option-${product.id}`} ref={active === index ? activeOption : undefined} role="option" aria-selected={value?.id === product.id} onPointerDown={event => event.preventDefault()} onMouseMove={() => setActive(index)} onClick={() => choose(product)} className={`flex cursor-pointer items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-sm ${active === index ? 'bg-[#eaf2ec]' : 'hover:bg-[#faf8f5]'}`}>
        <div className="min-w-0"><span className="block text-xs text-[#6d7974] [overflow-wrap:anywhere]">{product.sku}{product.category ? ` · ${product.category.name}` : ''}</span><span className="mt-0.5 block font-medium text-[#191c1b] [overflow-wrap:anywhere]">{product.name}</span></div>{value?.id === product.id && <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[#315445]" />}
      </li>)}</ul>
      {loading && <p role="status" className="px-4 py-3 text-sm text-[#6d7974]">{rows.length ? 'Loading more products…' : 'Loading products…'}</p>}
      {!loading && !error && !rows.length && <p role="status" className="px-4 py-3 text-sm text-[#6d7974]">No matching products</p>}
      {error && <div role="alert" className="px-4 py-3 text-sm text-red-700">{error}<button type="button" onClick={() => void load(nextPage, version.current)} className="ml-2 rounded px-2 py-1 font-medium underline focus-visible:ring-2">Retry products</button></div>}
      {hasMore && !error && <button type="button" disabled={loading} onClick={() => void load(nextPage, version.current)} className="w-full border-t border-[#eee7df] px-4 py-3 text-sm font-medium text-[#315445] hover:bg-[#f2f6f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#315445] disabled:opacity-40">Load more products</button>}
      <span className="sr-only" aria-live="polite">{!loading && !error ? `${rows.length} products shown` : ''}</span>
    </div>}
  </div>;
}
