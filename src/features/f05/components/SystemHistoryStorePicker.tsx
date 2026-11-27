import {useEffect,useRef,useState} from 'react';
import {CheckCircle2,ChevronDown,RefreshCw,Search,Store} from 'lucide-react';
import {authService} from '../../../services/authService';
import {getStoreDetail} from '../../storeManagement/storeManagement.api';
import {f05SystemApi} from '../f05.system.api';
import {F05ApiError} from '../f05.api';
import {miningErrorMessage} from '../f05.display';
import type {Page,StoreView} from '../f05.types';
import {SystemHistoryDialog,historyButton} from './SystemHistoryDialog';

const pickerCloseButton='inline-flex h-11 items-center justify-center rounded-xl border border-[#D7E0D3] bg-white px-4 text-sm font-semibold text-[#47613D] transition hover:bg-[#F2F6EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54] disabled:cursor-not-allowed disabled:opacity-50';
export function SystemHistoryStoreRows({items,storeId,onSelect}:{items:StoreView[];storeId:number|null;onSelect:(store:StoreView)=>void}){
 return <ul aria-label="Store selection" className="mt-3 space-y-2.5">{items.map(store=>{
  const selected=store.storeId===storeId;
  return <li key={store.storeId} aria-current={selected?'true':undefined} className={'flex items-center justify-between gap-3 rounded-xl border p-3 sm:px-4 '+(selected?'border-[#B9CEB5] bg-[#F2F7EE]':'border-[#DDE4DC] bg-white')}>
   <div className="min-w-0"><p className="break-words text-sm font-semibold text-[#263C2E]">{store.name}</p>{selected&&<p className="mt-1 text-xs font-medium text-[#356B54]">Currently viewing</p>}</div>
   {selected?<span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#356B54]"><CheckCircle2 aria-hidden="true" className="h-4 w-4"/>Selected</span>:<button type="button" aria-label={'Select Store '+store.name} className={historyButton+' shrink-0'} onClick={()=>onSelect(store)}>Select Store</button>}
  </li>;
 })}</ul>;
}

export function SystemHistoryStorePicker({storeId,onSelect,onResolved}:{storeId:number|null;onSelect:(store:StoreView)=>void;onResolved:(store:StoreView)=>void}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[page,setPage]=useState(0),[revision,setRevision]=useState(0);
 const token=authService.getSessionId()||authService.getToken(),q=query.trim(),key=JSON.stringify([page,q,revision]);
 const previousQuery=useRef('');
 const [result,setResult]=useState<{key:string;token:string|null;data?:Page<StoreView>;error?:string}|null>(null);
 const [selected,setSelected]=useState<{token:string|null;store?:StoreView;id:number;revision:number;error?:string}|null>(null);
 const current=result?.key===key&&result.token===token?result:null,data=current?.data;
 useEffect(()=>{
  const c=new AbortController(),debounce=q!==''&&q!==previousQuery.current;previousQuery.current=q;
  const read=()=>void f05SystemApi.listStores(page,20,c.signal,q).then(data=>{
   if(c.signal.aborted||(authService.getSessionId()||authService.getToken())!==token)return;
   const last=Math.max(0,Math.ceil(data.totalElements/data.pageSize)-1);if(page>last){setPage(last);return;}
   setResult({key,token,data});
  }).catch(error=>{if(!c.signal.aborted)setResult({key,token,error:miningErrorMessage(error)});});
  const timer=debounce?window.setTimeout(read,350):undefined;if(!debounce)read();return()=>{window.clearTimeout(timer);c.abort();};
 },[key,page,q,token]);
 const listed=data?.items.find(store=>store.storeId===storeId);
 // A deep-linked/inactive Store may not occur in the active-only selectable page.
 useEffect(()=>{
  if(storeId===null||!current||current.error)return;
  const cached=selected?.id===storeId&&selected.revision===revision&&selected.token===token;
  if(listed){if(!cached||selected.store!==listed)setSelected({id:storeId,revision,token,store:listed});return;}
  if(cached)return;
  const c=new AbortController();void getStoreDetail(storeId,c.signal).then(store=>{
   if(c.signal.aborted||(authService.getSessionId()||authService.getToken())!==token)return;
   if(store.storeId!==storeId||typeof store.name!=='string')throw new F05ApiError(200,'Store information does not match the selected Store. Use Retry Stores to try again.');
   setSelected({id:storeId,revision,token,store});
  }).catch(error=>{if(!c.signal.aborted)setSelected({id:storeId,revision,token,error:miningErrorMessage(error)});});return()=>c.abort();
 },[storeId,Boolean(current),current?.error,listed,selected,revision,token]);
 const resolved=listed??(selected?.id===storeId&&selected.token===token?selected.store:undefined);
 useEffect(()=>{if(resolved)onResolved(resolved);},[resolved,onResolved]);
 const selectedError=selected?.id===storeId&&selected.token===token&&selected.revision===revision?selected.error:undefined;
 const reload=()=>setRevision(n=>n+1);
 const openPicker=()=>{reload();setOpen(true);};
 const choose=(store:StoreView)=>{onResolved(store);onSelect(store);setOpen(false);};
 return <>
  <section aria-label="Selected Store" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-[0_1px_3px_rgba(30,58,47,0.04)] sm:px-6">
   <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EDF4E9] text-[#456A3E]"><Store aria-hidden="true" className="h-5 w-5"/></span><div className="min-w-0"><p className="text-xs font-medium text-[#6D7974]">Selected Store</p><h2 className="mt-1 break-words text-base font-semibold text-[#263C2E]">{storeId===null?'No store selected':resolved?.name??(selectedError||current?.error?'Store name unavailable':'Store selected')}</h2></div></div>
    <button type="button" data-history-store-trigger aria-haspopup="dialog" aria-expanded={open} className={historyButton} onClick={openPicker}>Change Store<ChevronDown aria-hidden="true" className="h-4 w-4"/></button>
   </div>
  </section>
  {open&&<SystemHistoryDialog compact title="Choose a Store" subtitle="Select a store to view its analysis history." headerIcon={<Store aria-hidden="true" className="h-5 w-5"/>} onClose={()=>setOpen(false)} footer={<button type="button" className={pickerCloseButton} onClick={()=>setOpen(false)}>Close</button>}>
   <label htmlFor="system-history-store-search" className="text-sm font-medium text-[#405447]">Search stores</label><div className="relative mt-2"><Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#87958B]"/><input id="system-history-store-search" type="search" value={query} placeholder="Search by store name" onChange={event=>{setQuery(event.target.value);setPage(0);}} className="h-11 w-full rounded-xl border border-[#DDE4DC] bg-white pl-10 pr-3.5 text-sm text-[#243C2D] outline-none transition focus:border-[#689477] focus:ring-2 focus:ring-[#356B54]/10"/></div>
   <section aria-labelledby="system-history-available-stores" className="mt-4"><h3 id="system-history-available-stores" className="text-sm font-semibold text-[#2E4733]">Available Stores</h3>
   {!current?<p role="status" className="mt-4 text-sm text-[#6D7974]">Loading stores...</p>:<>
    {(current.error||selectedError)&&<div role="alert" className="mt-4 space-y-3 rounded-xl bg-red-50 p-3 text-sm text-red-800"><p>{current.error||selectedError}</p><button type="button" className={historyButton} onClick={reload}><RefreshCw aria-hidden="true" className="h-3.5 w-3.5"/>Retry Stores</button></div>}
    {data&&<>
    {!data.items.length?<p className="py-5 text-sm text-[#6D7974]">No stores match your search.</p>:<SystemHistoryStoreRows items={data.items} storeId={storeId} onSelect={choose}/>}
    {data.totalElements>data.pageSize&&<nav aria-label="Store pages" className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E7E2D8] pt-3 text-xs text-[#6D7974]"><span>Page {data.page+1} of {Math.ceil(data.totalElements/data.pageSize)}</span><div className="flex gap-2"><button type="button" className={historyButton} disabled={page===0} onClick={()=>setPage(n=>n-1)}>Previous Stores</button><button type="button" className={historyButton} disabled={(page+1)*data.pageSize>=data.totalElements} onClick={()=>setPage(n=>n+1)}>Next Stores</button></div></nav>}
   </>}
   </>}
   </section>
  </SystemHistoryDialog>}
 </>;
}
