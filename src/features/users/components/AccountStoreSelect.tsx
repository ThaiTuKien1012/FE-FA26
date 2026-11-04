import { useEffect, useState } from 'react';
import { accountRequest } from '../account-management';
import { AccountSelect } from './AccountSelect';

interface StoreOption {storeId:number;name:string;}
interface StorePage {items:StoreOption[];page:number;pageSize:number;totalElements:number;}
interface Props {value:string;disabled:boolean;required?:boolean;onChange:(value:string)=>void;className:string;}
export function AccountStoreSelect({value,disabled,required=true,onChange,className}:Props) {
  const [page,setPage]=useState(0),[revision,setRevision]=useState(0);
  const [names,setNames]=useState<Record<string,string>>({});
  const [result,setResult]=useState<{key:string;data?:StorePage;error?:string}|null>(null);
  const key=page+':'+revision,current=result?.key===key?result:null;
  useEffect(()=>{
    const c=new AbortController();
    void accountRequest(`/api/system/stores?page=${page}&pageSize=20`,{signal:c.signal}).then(value=>{
      const data=value as StorePage;
      if(!data||!Array.isArray(data.items)||data.page!==page||data.pageSize!==20||!Number.isSafeInteger(data.totalElements)||data.totalElements<0||
        data.items.length>20||data.items.length>data.totalElements||new Set(data.items.map(s=>s?.storeId)).size!==data.items.length||!data.items.every(s=>s&&Number.isInteger(s.storeId)&&s.storeId>0&&s.storeId<=2147483647&&typeof s.name==='string'))throw new Error('The store list could not be verified. Please refresh it.');
      if(c.signal.aborted)return;
      const last=Math.min(100000,Math.max(0,Math.ceil(data.totalElements/20)-1));
      if(page>last){setPage(last);return;}
      setNames(old=>({...old,...Object.fromEntries(data.items.map(s=>[String(s.storeId),s.name]))}));setResult({key,data});
    }).catch(e=>{if(!c.signal.aborted)setResult({key,error:e instanceof Error?e.message:'Unable to load stores.'});});
    return()=>c.abort();
  },[page,key]);
  const selectedOutsidePage=Boolean(value&&!current?.data?.items.some(s=>String(s.storeId)===value));
  return <div>
    <label htmlFor="account-assigned-store" className="text-sm font-medium text-[#405447]">Assigned Store</label>
    <AccountSelect id="account-assigned-store" aria-label="Assigned Store" required={required} value={value} disabled={disabled||!current?.data} onChange={e=>onChange(e.target.value)} className={className}>
      <option value="">{!current?'Loading stores...':'Select a store'}</option>
      {selectedOutsidePage&&<option value={value}>{names[value]??`Current Store #${value}`}</option>}
      {current?.data?.items.map(store=><option key={store.storeId} value={String(store.storeId)}>{store.name} · #{store.storeId}</option>)}
    </AccountSelect>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#6D7974]">
      <p>{!current?<span role="status">Loading available stores...</span>:current.error?<span role="alert">{current.error}</span>:current.data?.items.length===0?'No stores are available. A Store Admin or Merchandiser needs a valid Store assignment.':'Required for Store Admin and Merchandiser accounts.'}</p>
      <button type="button" disabled={disabled||!current} onClick={()=>setRevision(n=>n+1)} className="rounded font-medium text-[#356B54] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-[#356B54] disabled:opacity-50">{current?.error?'Retry stores':'Refresh stores'}</button>
    </div>
    {current?.data&&current.data.totalElements>20&&<nav aria-label="Assigned Store pages" className="mt-3 flex items-center justify-between gap-3 text-xs text-[#6D7974]"><span>Page {page+1} of {Math.ceil(current.data.totalElements/20)}</span><div className="flex gap-3"><button type="button" disabled={disabled||page===0} onClick={()=>setPage(p=>p-1)} className="rounded px-2 py-1 font-medium text-[#356B54] focus-visible:outline-2 focus-visible:outline-[#356B54] disabled:opacity-40">Previous stores</button><button type="button" disabled={disabled||page>=100000||(page+1)*20>=current.data.totalElements} onClick={()=>setPage(p=>p+1)} className="rounded px-2 py-1 font-medium text-[#356B54] focus-visible:outline-2 focus-visible:outline-[#356B54] disabled:opacity-40">Next stores</button></div></nav>}
  </div>;
}
