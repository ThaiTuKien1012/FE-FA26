import {useCallback,useEffect,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {authService} from '../../../services/authService';
import {F05ApiError} from '../f05.api';
import {miningErrorMessage} from '../f05.display';
import type {MiningReader} from '../f05.reader';
import type {Page,RequestView,StoreView} from '../f05.types';
import {SystemHistoryStorePicker} from './SystemHistoryStorePicker';
import {SystemHistoryList} from './SystemHistoryList';
import {SystemAnalysisDetails} from './SystemAnalysisDetails';
import {historyButton} from './SystemHistoryDialog';

function History({reader,storeName,requestId,runId,onSelect}:{reader:MiningReader;storeName:string|null;requestId:number|null;runId:number|null;onSelect:(id:number|null,runId?:number|null)=>void}){
 const [page,setPage]=useState(0),[revision,setRevision]=useState(0),[accessError,setAccessError]=useState('');
 const token=authService.getSessionId()||authService.getToken(),key=JSON.stringify([reader.scopeKey,page,revision,token]);
 const [result,setResult]=useState<{key:string;data?:Page<RequestView>;error?:string}|null>(null),current=result?.key===key?result:null;
 useEffect(()=>{
  const c=new AbortController();void reader.listRequests(page,20,c.signal).then(data=>{
   if(c.signal.aborted||(authService.getSessionId()||authService.getToken())!==token)return;
   const last=Math.max(0,Math.ceil(data.totalElements/data.pageSize)-1);if(page>last){setPage(last);return;}setResult({key,data});
  }).catch(error=>{if(!c.signal.aborted)setResult({key,error:miningErrorMessage(error)});});return()=>c.abort();
 },[reader,page,key,token]);
 const onUpdated=useCallback((request:RequestView)=>{setResult(previous=>previous?.data?{...previous,data:{...previous.data,items:previous.data.items.map(item=>item.requestId===request.requestId?request:item)}}:previous);},[]);
 const onReadError=useCallback((error:unknown)=>{if(error instanceof F05ApiError&&(error.status===401||error.status===403))setAccessError(miningErrorMessage(error));},[]);
 const error=accessError||current?.error,data=accessError?undefined:current?.data,loading=!current&&!accessError;
 const pages=data?Math.max(1,Math.ceil(data.totalElements/data.pageSize)):1;
 return <>
  <section aria-labelledby="f05-history-title" className="overflow-hidden rounded-2xl border border-[#E7E2D8] bg-white shadow-[0_1px_3px_rgba(30,58,47,0.04)]">
   <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E7E2D8] p-5 sm:p-6"><div><h2 id="f05-history-title" className="text-lg font-semibold">Analysis History</h2><p className="mt-1 text-sm text-[#6D7974]">{storeName?'Analyses for '+storeName+', newest first.':'Analyses for the selected store, newest first.'}</p></div><button type="button" disabled={loading} className={historyButton} onClick={()=>{setAccessError('');setRevision(n=>n+1);}}><RefreshCw aria-hidden="true" className="h-3.5 w-3.5"/>Refresh history</button></header>
   {loading?<p role="status" className="px-5 py-8 text-sm text-[#6D7974] sm:px-6">Loading analysis history...</p>:error?<p role="alert" className="m-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error} Use Refresh history to try again manually.</p>:data&&<>
    {!data.items.length?<p className="px-5 py-8 text-sm text-[#6D7974] sm:px-6">No analyses have been recorded for this store yet.</p>:<SystemHistoryList items={data.items} selectedId={requestId} onSelect={onSelect}/>}
    <footer className="flex flex-col gap-3 border-t border-[#E7E2D8] bg-[#FDFEFB] px-5 py-4 text-xs text-[#6D7974] sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><p>Showing {data.items.length?data.page*data.pageSize+1:0}–{data.items.length?data.page*data.pageSize+data.items.length:0} of {data.totalElements.toLocaleString('en-US')} analyses</p><p className="mt-1 text-[#8A9689]">Page {data.page+1} of {pages}</p></div>{pages>1&&<nav aria-label="Mining history pages" className="flex flex-wrap gap-2"><button type="button" className={historyButton} disabled={page===0} onClick={()=>setPage(n=>n-1)}>Previous analyses</button><button type="button" className={historyButton} disabled={page+1>=pages} onClick={()=>setPage(n=>n+1)}>Next analyses</button></nav>}</footer>
   </>}
  </section>
  {requestId!==null&&!error&&<SystemAnalysisDetails key={reader.scopeKey+':'+requestId} reader={reader} requestId={requestId} selectedRunId={runId} storeName={storeName} onClose={()=>onSelect(null)} onUpdated={onUpdated} onReadError={onReadError}/>}
 </>;
}
export function SystemMiningHistory({storeId,reader,requestId,runId,onSelectStore,onSelect}:{storeId:number|null;reader:MiningReader|null;requestId:number|null;runId:number|null;onSelectStore:(store:StoreView)=>void;onSelect:(id:number|null,runId?:number|null)=>void}){
 const [selected,setSelected]=useState<StoreView|null>(null),resolved=selected?.storeId===storeId?selected:null;
 const onResolved=useCallback((store:StoreView)=>setSelected(store),[]);
 return <div className="space-y-6"><SystemHistoryStorePicker storeId={storeId} onSelect={onSelectStore} onResolved={onResolved}/>{reader?<History key={reader.scopeKey} reader={reader} storeName={resolved?.name??null} requestId={requestId} runId={runId} onSelect={onSelect}/>:<p className="text-sm text-[#6D7974]">Select a store to view its mining history.</p>}</div>;
}
