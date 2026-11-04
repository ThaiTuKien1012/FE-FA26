import { useEffect, useState } from 'react';
import { authService } from '../../../services/authService';
import { f05SystemApi } from '../f05.system.api';
import { miningButton, miningErrorMessage } from '../f05.display';
import type { Page, StoreView } from '../f05.types';
interface Props { storeId:number|null; locked:boolean; onSelect:(store:StoreView)=>void; }
export function MiningStorePicker({storeId,locked,onSelect}:Props) {
  const [page,setPage]=useState(0); const [revision,setRevision]=useState(0);
  const token=authService.getToken();
  const key=`${page}:${revision}`;
  const [result,setResult]=useState<{key:string;token:string|null;data?:Page<StoreView>;error?:string}|null>(null);
  const current=result?.key===key && result.token===token ? result:null;
  useEffect(()=>{
    const c=new AbortController();
    void f05SystemApi.listStores(page,20,c.signal).then(data=>{
      if(c.signal.aborted||authService.getToken()!==token)return;
      const last=Math.max(0,Math.ceil(data.totalElements/data.pageSize)-1);
      if(page>last){setPage(last);return;}
      setResult({key,token,data});
    }).catch(e=>{if(!c.signal.aborted)setResult({key,token,error:miningErrorMessage(e)});});
    return ()=>c.abort();
  },[page,key,token]);
  const data=current?.data;
  const multiplePages=Boolean(data&&data.totalElements>data.pageSize);
  return <section aria-labelledby="mining-stores-title" className="rounded-2xl border border-[#E7E2D8] bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="mining-stores-title" className="text-base font-semibold">Select Store</h2><p className="mt-1 text-sm text-[#6D7974]">Select a store to view its mining activity and results.</p></div>
      <button type="button" className={miningButton} disabled={!current} onClick={()=>setRevision(r=>r+1)}>Refresh Stores</button>
    </div>
    {!current?<p role="status" className="mt-4 text-sm text-[#6D7974]">Loading Stores...</p>:current.error?<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{current.error}</p>:data&&<>
      <div role="group" aria-label="Store selection" className="mt-4 flex max-h-52 flex-wrap gap-2 overflow-auto">
        {data.items.length===0&&<p className="text-sm text-[#6D7974]">No Stores were returned.</p>}
        {data.items.map(store=><button type="button" key={store.storeId} disabled={locked} aria-pressed={store.storeId===storeId} onClick={()=>onSelect(store)} className={miningButton+' inline-flex items-center gap-2 '+(storeId===store.storeId?'border-[#356B54] bg-[#EDF5F0] ring-1 ring-[#356B54]/20':'')}><span>{store.name}</span>{' '}<span className="text-xs font-normal text-[#6D7974]">#{store.storeId}</span></button>)}
      </div>
      {multiplePages&&<nav aria-label="Store pages" className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E7E2D8] pt-3 text-xs text-[#6D7974]">
        <span>Page {page+1} · {data.totalElements} Stores</span><div className="flex gap-2"><button type="button" className={miningButton} disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous Stores</button><button type="button" className={miningButton} disabled={(page+1)*data.pageSize>=data.totalElements} onClick={()=>setPage(p=>p+1)}>Next Stores</button></div>
      </nav>}
    </>}
    {locked&&<p className="mt-3 text-xs text-amber-900">Store selection is locked while a submission is pending. Resolve or explicitly discard that attempt first.</p>}
  </section>;
}
