import {useEffect,useId,useRef,type ReactNode} from 'react';
import {Store,X} from 'lucide-react';
import type {StoreStatus} from './storeManagement.api';

export const panel='rounded-2xl border border-[#E7E2D8] bg-white';
export const primary='inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E3A2F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2D604A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54] disabled:cursor-not-allowed disabled:opacity-50';
export const secondary='inline-flex items-center justify-center gap-2 rounded-xl border border-[#E7E2D8] bg-white px-4 py-2 text-sm font-semibold text-[#1E3A2F] hover:bg-[#EDF5F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54] disabled:cursor-not-allowed disabled:opacity-50';
export const field='w-full rounded-xl border border-[#E7E2D8] bg-white px-3 py-2.5 text-sm font-normal text-[#191C1B] outline-none focus:border-[#356B54] focus:ring-2 focus:ring-[#356B54]/20 disabled:bg-[#F6F7F4]';
export const errorMessage=(error:unknown)=>error instanceof Error?error.message:'Something went wrong. Please try again.';
export function ErrorNotice({message,retry}:{message:string;retry?:()=>void}){
 return <div role="alert" className="rounded-xl border border-[#FFDAD6] bg-[#FDF3F2] p-3 text-sm text-[#962626]">{message}{retry&&<button type="button" className="ml-3 rounded font-semibold underline focus-visible:outline-2" onClick={retry}>Retry</button>}</div>;
}
export function StoreStatusBadge({status}:{status:StoreStatus}){
 return <span className={'inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold '+(status==='ACTIVE'?'bg-[#E5F3EB] text-[#1E3A2F]':'bg-[#FBECE0] text-[#954A17]')}>{status==='ACTIVE'?'Active':'Inactive'}</span>;
}
export function StoreDialog({title,subtitle,busy,onClose,children,formLayout=false}:{title:string;subtitle?:string;busy:boolean;onClose:()=>void;children:ReactNode;formLayout?:boolean}){
 const titleId=useId(),descriptionId=useId();
 const ref=useRef<HTMLDialogElement>(null),close=useRef({busy,onClose});close.current={busy,onClose};
 useEffect(()=>{
  const node=ref.current,previous=document.activeElement instanceof HTMLElement?document.activeElement:null,overflow=document.body.style.overflow;
  const cancel=(e:Event)=>{e.preventDefault();if(!close.current.busy)close.current.onClose();};
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(!close.current.busy)close.current.onClose();}if(e.key==='Tab'&&node?.open){const controls=[...node.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href],select:not(:disabled),textarea:not(:disabled)')].filter(el=>el.getClientRects().length),first=controls[0],last=controls.at(-1);if(!first){e.preventDefault();node.focus();}else if(!node.contains(document.activeElement)||(e.shiftKey?document.activeElement===first:document.activeElement===last)){e.preventDefault();(e.shiftKey?last:first)?.focus();}}};
  node?.addEventListener('cancel',cancel);document.addEventListener('keydown',key,true);node?.showModal();document.body.style.overflow='hidden';
  return()=>{node?.removeEventListener('cancel',cancel);document.removeEventListener('keydown',key,true);node?.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
 },[]);
 return <dialog ref={ref} tabIndex={-1} aria-label={title} aria-labelledby={titleId} aria-describedby={subtitle?descriptionId:undefined} aria-modal="true"
  className={'fixed inset-0 m-auto flex-col overflow-hidden rounded-2xl border bg-white p-0 text-[#191C1B] open:flex '+(formLayout?'max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-[580px] border-[#E3E7DE] shadow-[0_20px_80px_rgba(20,37,27,0.22)] backdrop:bg-[#14251B]/45 backdrop:backdrop-blur-[2px] sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100%-3rem)]':'max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[640px] border-[#E7E2D8] shadow-xl backdrop:bg-[#1E3A2F]/30')}>
  <header className={'flex shrink-0 items-start gap-3 border-b px-5 '+(formLayout?'border-[#E7EADF] py-5 sm:px-6':'justify-between border-[#E7E2D8] py-4')}>
   {formLayout&&<span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDF4E9] text-[#456A3E]"><Store aria-hidden="true" className="h-5 w-5"/></span>}
   <div className={formLayout?'min-w-0 flex-1':undefined}><h2 id={titleId} className={'text-xl font-semibold '+(formLayout?'tracking-tight':'')}>{title}</h2>{subtitle&&<p id={descriptionId} className="mt-1 text-sm leading-5 text-[#6D7974]">{subtitle}</p>}</div>
   <button type="button" autoFocus aria-label="Close dialog" disabled={busy} onClick={onClose} className={formLayout?'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#7B8876] transition hover:bg-[#F1F4ED] hover:text-[#365D3E] focus-visible:outline-2 focus-visible:outline-[#356B54] disabled:opacity-40':'rounded-lg p-1.5 hover:bg-[#EDF5F0] focus-visible:outline-2 disabled:opacity-50'}><X aria-hidden="true" className="h-5 w-5"/></button>
  </header>{children}
 </dialog>;
}
