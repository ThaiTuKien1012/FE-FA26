import { useRef } from 'react';
import { ArrowRightLeft, Megaphone, PackagePlus, ShoppingBasket } from 'lucide-react';
import type { RecType } from '../f06.types';
import { REC_TYPES } from '../f06.validation';
import { recommendationTypeCopy } from '../f06.presentation';

const icons={BUNDLE:PackagePlus,CROSS_SELL:ArrowRightLeft,FBT:ShoppingBasket,BANNER:Megaphone};
export function F06TypeTabs({value,disabled,onChange}:{value:RecType;disabled:boolean;onChange:(type:RecType)=>void}) {
  const buttons=useRef<Partial<Record<RecType,HTMLButtonElement|null>>>({});
  return <div role="tablist" aria-label="Recommendation types" className="grid grid-cols-2 gap-2 sm:grid-cols-4" onKeyDown={event=>{
    if(disabled||!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
    event.preventDefault();const index=REC_TYPES.indexOf(value),next=event.key==='Home'?0:event.key==='End'?REC_TYPES.length-1:(index+(event.key==='ArrowRight'?1:-1)+REC_TYPES.length)%REC_TYPES.length;
    onChange(REC_TYPES[next]);buttons.current[REC_TYPES[next]]?.focus();
  }}>{REC_TYPES.map(type=>{const Icon=icons[type];return <button key={type} ref={node=>{buttons.current[type]=node;}} id={'f06-type-'+type} type="button" role="tab" aria-label={recommendationTypeCopy[type].title} aria-selected={value===type} aria-controls="f06-type-panel" tabIndex={value===type?0:-1} disabled={disabled} onClick={()=>onChange(type)} className="flex min-h-16 min-w-0 items-center justify-center gap-2 rounded-xl border border-[#E1E6DF] bg-white px-2 py-3 text-center text-xs font-semibold text-[#6D7974] transition-colors hover:border-[#356B54] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54] disabled:opacity-50 aria-selected:border-[#1E3A2F] aria-selected:bg-[#1E3A2F] aria-selected:text-white sm:text-sm"><Icon aria-hidden="true" className="h-5 w-5 shrink-0"/><span>{recommendationTypeCopy[type].title}</span></button>;})}</div>;
}
