import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {ArrowLeftRight,Image,Loader2,PackagePlus,ShoppingBasket,X} from 'lucide-react';
import {miningButton,miningPrimaryButton} from '../../f05/f05.display';
import {RecommendationGeneration} from '../f06.generate';
import {REC_TYPES} from '../f06.validation';
import type {RecommendationSource} from '../f06.source';
import type {RecGenerationResult,RecType} from '../f06.types';
import {F06AnalysisSummary} from './F06AnalysisSummary';
const types:Record<RecType,{label:string;description:string;Icon:typeof PackagePlus}>={
 BUNDLE:{label:'Bundle',description:'Offer products together as a bundle.',Icon:PackagePlus},CROSS_SELL:{label:'Cross-sell',description:'Suggest additional products to customers.',Icon:ArrowLeftRight},FBT:{label:'Frequently Bought Together',description:'Show products that customers often purchase together.',Icon:ShoppingBasket},BANNER:{label:'Banner',description:'Highlight products in promotional banners.',Icon:Image}
};
export function F06GenerationPanel({source,onGenerated,onPendingChange,onClose,onCheckSaved}:{source:RecommendationSource;onGenerated:(result:RecGenerationResult)=>void;onPendingChange:(pending:boolean)=>void;onClose:()=>void;onCheckSaved:()=>void}){
 const [workflow]=useState(()=>new RecommendationGeneration()),state=useSyncExternalStore(workflow.subscribe,workflow.getSnapshot,workflow.getSnapshot);
 const dialog=useRef<HTMLDialogElement>(null),reported=useRef(state.result),[guard,setGuard]=useState(false),guardButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{workflow.start(source);return workflow.stop;},[workflow,source]);
 useEffect(()=>{if(guard)guardButton.current?.focus();},[guard]);
 useEffect(()=>{onPendingChange(state.pending);},[state.pending,onPendingChange]);
 useEffect(()=>{if(state.result&&state.result!==reported.current){reported.current=state.result;onGenerated(state.result);}},[state.result,onGenerated]);
 const close=()=>{if(state.pending)return;if(state.needsRecheck){setGuard(true);return;}onClose();};
 const closeRef=useRef(close);closeRef.current=close;
 useEffect(()=>{
  const node=dialog.current,previous=document.activeElement instanceof HTMLElement?document.activeElement:null,overflow=document.body.style.overflow;
  const cancel=(event:Event)=>{event.preventDefault();closeRef.current();};
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeRef.current();}if(event.key==='Tab'&&node?.open){const controls=[...node.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length>0),first=controls[0],last=controls.at(-1);if(!first){event.preventDefault();node.focus();}else if(!node.contains(document.activeElement)||(event.shiftKey?document.activeElement===first:document.activeElement===last)){event.preventDefault();(event.shiftKey?last:first)?.focus();}}};
  node?.addEventListener('cancel',cancel);document.addEventListener('keydown',key,true);node?.showModal();document.body.style.overflow='hidden';
  return()=>{node?.removeEventListener('cancel',cancel);document.removeEventListener('keydown',key,true);node?.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
 },[]);
 const valid=state.selectedRunId===source.run.runId&&source.run.status==='COMPLETED';
 return <dialog ref={dialog} tabIndex={-1} aria-modal="true" aria-labelledby="f06-generate-title" aria-describedby="f06-generate-description" className="fixed inset-0 m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E7E2D8] bg-white p-0 text-[#191C1B] shadow-xl backdrop:bg-black/30 open:flex">
  <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#E7E2D8] p-4 sm:px-5"><div><h2 id="f06-generate-title" className="text-lg font-semibold">Generate Recommendations</h2><p id="f06-generate-description" className="mt-1 text-sm text-[#6D7974]">Choose the types of recommendations you want to generate.</p></div><button type="button" autoFocus aria-label="Close generation dialog" disabled={state.pending} onClick={close} className="rounded-lg p-2 hover:bg-[#EDF5F0] focus-visible:outline-2 disabled:opacity-50"><X aria-hidden="true" className="h-4 w-4"/></button></header>
  <div data-generation-body className="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-5">
   <F06AnalysisSummary compact request={source.request} run={source.run}/>
   <form id="f06-generate-form" aria-label="Generate recommendations" onSubmit={event=>{event.preventDefault();void workflow.generate();}}>
    <fieldset disabled={state.pending||state.needsRecheck} className="grid items-stretch gap-3 sm:auto-rows-fr sm:grid-cols-2"><legend className="sr-only">Recommendation types</legend>{REC_TYPES.map(type=>{const {label,description,Icon}=types[type];return <label key={type} data-generation-type={type} className={'flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-3 '+(state.types.includes(type)?'border-[#7EAA8C] bg-[#EDF5F0]':'border-[#E7E2D8] bg-white')}><input type="checkbox" value={type} checked={state.types.includes(type)} onChange={()=>workflow.toggleType(type)} className="mt-1 h-4 w-4 shrink-0 accent-[#356B54]"/><span className="min-w-0"><span className="flex items-center gap-2 text-sm font-semibold"><Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#527461]"/>{label}</span><span className="mt-1 block text-xs leading-5 text-[#6D7974]">{description}</span></span></label>;})}</fieldset>
    {!state.types.length&&<p role="alert" className="mt-3 text-sm text-amber-900">Select at least one recommendation type.</p>}
   </form>
   <p className="text-xs leading-5 text-[#6D7974]">Recommendations will follow your store's current rules and remain subject to review.</p>
   {state.policyError&&<p role="alert" className="text-sm text-red-800">{state.policyError}</p>}
   {state.pending&&<p role="status" className="flex items-center gap-2 text-sm text-[#53665B]"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none"/>Generating recommendations... Please keep this dialog open.</p>}
   {state.generationError&&<p role="alert" className="whitespace-pre-wrap break-words text-sm text-red-800">{state.generationError}</p>}
   {guard&&<div role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">Check saved recommendations before trying again.</p><p className="mt-1 text-xs">The request may already have saved recommendations. No automatic retry was made.</p><div className="mt-3 flex flex-wrap gap-2"><button ref={guardButton} type="button" className={miningButton} onClick={()=>setGuard(false)}>Keep Dialog Open</button></div></div>}
  </div>
  <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#E7E2D8] bg-white p-3 sm:px-5"><button type="button" className={miningButton} disabled={state.pending} onClick={close}>Cancel</button>{state.needsRecheck?<button type="button" className={miningPrimaryButton} onClick={onCheckSaved}>Check Saved Recommendations</button>:<button type="submit" form="f06-generate-form" className={miningPrimaryButton} disabled={state.pending||!state.types.length||!valid||state.runsLoading||state.historyLoading}>{state.pending?'Generating recommendations...':'Generate Recommendations'}</button>}</footer>
 </dialog>;
}
