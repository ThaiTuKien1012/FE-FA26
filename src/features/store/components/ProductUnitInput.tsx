import React, { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { ChevronDown } from 'lucide-react';
import { authService } from '../../../services/authService';
import { storeApi } from '../store.api';
import { ProductUnitCache, uniqueUnits, type UnitSuggestions } from '../f02.units';

const cache = new ProductUnitCache();
export const productUnitScope = () => { const user = authService.getCurrentUser(); return `${authService.getSessionId()}:${user?.id}:${user?.storeId}`; };
let lastScope = productUnitScope();
authService.subscribe(() => { const next = productUnitScope(); if (next !== lastScope) { cache.clear(); lastScope = next; } });
export const rememberProductUnit = (unit: string, expectedScope: string) => { if (authService.getCurrentUser() && productUnitScope() === expectedScope) cache.remember(expectedScope, unit); };

export function ProductUnitInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId(), wrapper = useRef<HTMLDivElement>(null);
  const session = useSyncExternalStore(authService.subscribe, authService.getSnapshot, authService.getSnapshot), currentScope = productUnitScope();
  const [result, setResult] = useState<{ scope: string; data: UnitSuggestions } | null>(null);
  const [loading, setLoading] = useState(true), [open, setOpen] = useState(false), [all, setAll] = useState(false), [active, setActive] = useState(-1), [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true; setLoading(true);
    if (!session.user) { setResult(null); setLoading(false); return; }
    void cache.load(currentScope, storeApi.listProducts, retry > 0).then(data => { if (live) { setResult({ scope: currentScope, data }); setLoading(false); } });
    return () => { live = false; };
  }, [currentScope, retry]);
  const data = result?.scope === currentScope ? result.data : null;
  const options = uniqueUnits([...(data?.units || []), ...(data && !data.units.length ? ['Piece', 'Box', 'Pack', 'Bottle', 'Bag'] : [])]);
  const matches = options.filter(unit => all || unit.toLocaleLowerCase('vi').includes(value.trim().toLocaleLowerCase('vi')));
  useEffect(() => {
    const option = wrapper.current?.querySelector<HTMLElement>('[role=option][aria-selected=true]'), list = option?.parentElement;
    if (!option || !list) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
  }, [active, open, all]);
  const choose = (unit: string) => { if (wrapper.current?.closest('fieldset[disabled]')) return; onChange(unit); setOpen(false); setActive(-1); };
  return <div ref={wrapper} className="f02-unit-field" onBlur={event => { if (!wrapper.current?.contains(event.relatedTarget as Node)) { setOpen(false); setActive(-1); } }}>
    <label htmlFor={id}>Unit *</label><div className="f02-unit-control"><input id={id} aria-label="Unit" role="combobox" aria-autocomplete="list" aria-expanded={open && matches.length > 0} aria-controls={`${id}-options`} aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined} aria-describedby={`${id}-help`} autoComplete="off" required maxLength={40} value={value} onFocus={() => setOpen(true)} onChange={event => { onChange(event.target.value); setAll(false); setOpen(true); setActive(-1); }} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); setActive(-1); }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setAll(true); setActive(index => options.length ? Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))) : -1); }
      if (event.key === 'Enter' && open && active >= 0 && matches[active]) { event.preventDefault(); choose(matches[active]); }
    }} /><button type="button" aria-label="Show unit suggestions" aria-controls={`${id}-options`} onClick={() => { setAll(true); setOpen(current => !current); setActive(-1); }}><ChevronDown size={16} /></button></div>
    {open && matches.length > 0 && <ul id={`${id}-options`} role="listbox" aria-label="Previous units" className="f02-unit-options">{matches.map((unit, index) => <li key={unit} id={`${id}-option-${index}`} role="option" aria-selected={active === index} onMouseDown={event => event.preventDefault()} onClick={() => choose(unit)}>{unit}</li>)}</ul>}
    <span id={`${id}-help`} className="mt-1 block text-xs text-[#6d7974]">{loading ? 'Loading units used in this store…' : data?.failed ? 'Some previous units could not be loaded. Enter any unit.' : data && !data.complete ? `Suggestions cover ${data.loaded.toLocaleString('en-GB')} of ${data.total.toLocaleString('en-GB')} products. Enter any unit.` : 'Choose a previous unit or enter a new one.'}</span>
    {data?.failed && <button type="button" className="text-xs underline" onClick={() => setRetry(count => count + 1)}>Retry unit suggestions</button>}
  </div>;
}
