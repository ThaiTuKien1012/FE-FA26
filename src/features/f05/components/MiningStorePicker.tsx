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
  return <section aria-labelledby="mining-stores-title" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="mining-stores-title" className="text-lg font-semibold">Choose a Store</h2>
      <button type="button" className={miningButton} disabled={!current} onClick={()=>setRevision(r=>r+1)}>Refresh Stores</button>
    </div>
    <p className="mt-2 text-sm text-[#6D7974]">{storeId===null?'Select a Store to load its snapshots and mining history.':`Target Store #${storeId}. Store data is scoped to this selection.`}</p>
    {!current ? <p role="status" className="mt-4 text-sm">Loading Stores...</p> : current.error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{current.error}</p> :
      data && <><div role="group" aria-label="Store selection" className="mt-4 grid max-h-72 gap-2 overflow-auto sm:grid-cols-2">
        {data.items.length===0 && <p className="text-sm text-[#6D7974]">No Stores were returned.</p>}
        {data.items.map(store=><button type="button" key={store.storeId} disabled={locked} aria-pressed={store.storeId===storeId} onClick={()=>onSelect(store)} className={`${miningButton} text-left ${storeId===store.storeId?'border-[#356B54] bg-[#EDF5F0]':''}`}>{store.name} <span className="text-xs">#{store.storeId}</span></button>)}
      </div>
      <nav aria-label="Store pages" className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>Page {page+1} · {data.totalElements} Stores</span>
        <div className="flex gap-2"><button type="button" className={miningButton} disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous Stores</button><button type="button" className={miningButton} disabled={(page+1)*data.pageSize>=data.totalElements} onClick={()=>setPage(p=>p+1)}>Next Stores</button></div>
      </nav></>}
    {locked && <p className="mt-3 text-xs text-amber-900">Store selection is locked while a submission is pending. Resolve or explicitly discard that attempt first.</p>}
  </section>;
}
