import {useEffect,useId,useRef,type ReactNode} from 'react';
import {X} from 'lucide-react';

export const historyButton='inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE4DC] bg-white px-3 text-sm font-semibold text-[#365543] transition hover:border-[#BDCEC1] hover:bg-[#F3F7F3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54] disabled:cursor-not-allowed disabled:opacity-50';
export function SystemHistoryDialog({title,subtitle,summary,headerIcon,children,footer,onClose,compact=false}:{title:string;subtitle?:string;summary?:ReactNode;headerIcon?:ReactNode;children:ReactNode;footer?:ReactNode;onClose:()=>void;compact?:boolean}){
 const id=useId(),dialog=useRef<HTMLDialogElement>(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  const node=dialog.current,previous=document.activeElement instanceof HTMLElement?document.activeElement:null,overflow=document.body.style.overflow;
  const cancel=(event:Event)=>{event.preventDefault();close.current();};
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close.current();return;}
   if(event.key!=='Tab'||!node?.open)return;
   const controls=[...node.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length&&el.checkVisibility());
   const first=controls[0],last=controls.at(-1);
   if(!first){event.preventDefault();node.focus();}else if(!node.contains(document.activeElement)||(event.shiftKey?document.activeElement===first:document.activeElement===last)){event.preventDefault();(event.shiftKey?last:first)?.focus();}
  };
  node?.showModal();document.body.style.overflow='hidden';node?.addEventListener('cancel',cancel);document.addEventListener('keydown',key,true);
  return()=>{node?.removeEventListener('cancel',cancel);document.removeEventListener('keydown',key,true);node?.close();document.body.style.overflow=overflow;const target=previous?.isConnected?previous:compact?document.querySelector<HTMLElement>('[data-history-store-trigger]'):null;target?.focus({preventScroll:true});};
 },[]);
 return <dialog ref={dialog} tabIndex={-1} aria-modal="true" aria-labelledby={id} aria-describedby={subtitle?id+'-subtitle':undefined} className={'fixed inset-0 m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-2xl border border-[#E3E7DE] bg-white p-0 text-[#191C1B] shadow-[0_20px_80px_rgba(20,37,27,0.22)] backdrop:bg-[#14251B]/45 backdrop:backdrop-blur-[2px] open:flex sm:max-h-[calc(100dvh-3rem)] '+(compact?'max-w-[580px]':'max-w-[1040px]')}>
  <header className={'flex shrink-0 items-start justify-between gap-3 border-b p-5 sm:px-6 '+(compact?'border-[#E7EADF]':'border-[#1D3C30] bg-[#1D3C30] text-white')}>
   {headerIcon&&<span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDF4E9] text-[#456A3E]">{headerIcon}</span>}
   <div className="min-w-0 flex-1"><h2 id={id} className="text-xl font-semibold tracking-tight">{title}</h2>{subtitle&&<p id={id+'-subtitle'} className={'mt-1 break-words text-sm leading-5 '+(compact?'text-[#6D7974]':'text-[#D6E4DB]')}>{subtitle}</p>}{summary&&<div className="mt-3">{summary}</div>}</div>
   <button type="button" autoFocus aria-label={compact?'Close store picker':'Close analysis details'} onClick={onClose} className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 '+(compact?'text-[#7B8876] transition hover:bg-[#F1F4ED] hover:text-[#365D3E] focus-visible:outline-[#356B54]':'text-white hover:bg-white/10 focus-visible:outline-white')}><X aria-hidden="true" className="h-5 w-5"/></button>
  </header>
  <div data-system-history-body className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:px-6">{children}</div>
  {footer&&<footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-[#E7EADF] bg-[#FAFCF7] px-5 py-4 sm:px-6">{footer}</footer>}
 </dialog>;
}
