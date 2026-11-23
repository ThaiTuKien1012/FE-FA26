import { useEffect, useId, useRef } from 'react';
import { ArrowRightLeft, ArrowUpRight, Megaphone, PackagePlus, ShoppingBasket, X } from 'lucide-react';
import type { RecView } from '../f06.types';
import { crossSellDirection } from '../f06.presentation';
import { RecommendationBadge, recommendationLabel, recommendationPercent } from './F06ReadShared';

const typeIcons={BUNDLE:PackagePlus,CROSS_SELL:ArrowRightLeft,FBT:ShoppingBasket,BANNER:Megaphone};

/** Every option is an independent saved recommendation, in Backend order. */
export function F06RecommendationOptions({ items, names={}, onSelect }: { items:readonly RecView[];names?:Record<number,string>;onSelect:(id:number)=>void }) {
  const product=(id:number)=>names[id]??'Product #'+id;
  return <ul aria-label="Recommendation types" className="mt-4 space-y-3">{items.map((item,index)=>{
    const Icon=typeIcons[item.type],direction=crossSellDirection(item);
    return <li key={item.recommendationId+':'+index}><button type="button" data-candidate-id={item.recommendationId} data-rank={item.rank??undefined} aria-label={'View '+recommendationLabel(item.type)+' recommendation #'+item.recommendationId+' ('+recommendationLabel(item.reviewStatus)+', '+recommendationLabel(item.currentEligibility.status)+')'} onClick={()=>onSelect(item.recommendationId)} className="w-full rounded-xl border border-[#E1E6DF] bg-white p-4 text-left transition-colors hover:border-[#356B54] hover:bg-[#F4F8F3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54]">
      <span className="flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-2 font-semibold text-[#243B30]"><Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#356B54]" />{recommendationLabel(item.type)}</span><RecommendationBadge status={item.reviewStatus} /></span>
      <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#6D7974]">Current availability <RecommendationBadge status={item.currentEligibility.status} /></span>
      {direction&&<span className="mt-2 block break-words text-xs font-medium text-[#356B54]">From {direction.anchor===null?'Starting product unavailable':product(direction.anchor)} → {direction.targets.map(product).join(', ')} · Confidence {recommendationPercent(item.evidence.confidence)}</span>}
      <span className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs"><span className="text-[#7A857D]">Suggestion #{item.recommendationId}{item.rank!==null&&' · Rank '+item.rank}</span><span className="inline-flex items-center gap-1 font-semibold text-[#1E3A2F]">View Details<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></span></span>
    </button></li>;
  })}</ul>;
}

export function F06RecommendationGroupDetails({ items, names={}, returnFocus, onClose, onSelect }: { items:readonly RecView[];names?:Record<number,string>;returnFocus:HTMLButtonElement;onClose:()=>void;onSelect:(id:number)=>void }) {
  const dialog=useRef<HTMLDialogElement>(null),close=useRef<HTMLButtonElement>(null),titleId=useId();
  useEffect(()=>{
    const node=dialog.current,overflow=document.body.style.overflow;
    const trapFocus=(event:KeyboardEvent)=>{
      if(event.key!=='Tab'||!node?.open)return;
      const controls=[...node.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')].filter(control=>control.getClientRects().length>0);
      const first=controls[0],last=controls.at(-1),focused=document.activeElement;
      if(!node.contains(focused)||(event.shiftKey?focused===first:focused===last)){
        event.preventDefault();(event.shiftKey?last:first)?.focus();
      }
    };
    document.addEventListener('keydown',trapFocus,true);
    node?.showModal();document.body.style.overflow='hidden';close.current?.focus({preventScroll:true});
    return()=>{document.removeEventListener('keydown',trapFocus,true);node?.close();document.body.style.overflow=overflow;if(returnFocus.isConnected)returnFocus.focus({preventScroll:true});};
  },[returnFocus]);
  const title=items[0].productIds.map(id=>names[id]??'Product #'+id).join(' + ');
  return <dialog ref={dialog} aria-labelledby={titleId} aria-modal="true" data-recommendation-group-dialog onCancel={event=>{event.preventDefault();onClose();}} className="fixed inset-0 m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto rounded-2xl border border-[#E7E2D8] bg-white p-0 text-[#191C1B] shadow-xl backdrop:bg-black/30">
    <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#E7E2D8] bg-white p-5"><h2 id={titleId} title={title} className="line-clamp-3 min-w-0 break-words text-xl font-semibold">{title}</h2><button ref={close} type="button" autoFocus aria-label="Close product group details" onClick={onClose} className="shrink-0 rounded-lg p-2 hover:bg-[#EDF5F0] focus-visible:outline-2"><X aria-hidden="true" className="h-5 w-5" /></button></header>
    <section className="p-5"><h3 className="font-semibold">Recommendation types</h3><F06RecommendationOptions items={items} names={names} onSelect={onSelect} /></section>
  </dialog>;
}
