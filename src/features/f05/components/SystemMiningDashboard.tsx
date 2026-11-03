import { useEffect, useState } from 'react';
import { authService } from '../../../services/authService';
import { algorithmName, miningButton, miningDate, miningErrorMessage } from '../f05.display';
import type { MiningReader } from '../f05.reader';
import type { MiningConfiguration, Page, RequestView } from '../f05.types';
import { MiningStatusBadge } from './MiningStatusBadge';
interface Props {
  config:MiningConfiguration|null; loading:boolean; error:string; reader:MiningReader|null;
  onRefresh:()=>void; onConfigure:()=>void; onRun:()=>void; onRequest:(id:number)=>void;
}
export function SystemMiningDashboard({config,loading,error,reader,onRefresh,onConfigure,onRun,onRequest}:Props){
  const [revision,setRevision]=useState(0);const token=authService.getToken();
  const scope=reader?.scopeKey??'none';
  const [result,setResult]=useState<{scope:string;revision:number;token:string|null;data?:Page<RequestView>;error?:string}|null>(null);
  const current=result?.scope===scope&&result.revision===revision&&result.token===token?result:null;
  useEffect(()=>{
    if(!reader)return;
    const c=new AbortController();
    void reader.listRequests(0,5,c.signal).then(data=>{
      if(!c.signal.aborted&&authService.getToken()===token)setResult({scope,revision,token,data});
    }).catch(e=>{if(!c.signal.aborted)setResult({scope,revision,token,error:miningErrorMessage(e)});});
    return()=>c.abort();
  },[reader,scope,revision,token]);
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2"><button type="button" className={miningButton} onClick={()=>{onRefresh();setRevision(v=>v+1);}}>Refresh dashboard</button><button type="button" className={miningButton} onClick={onConfigure}>Configure algorithm</button><button type="button" className={miningButton} onClick={onRun}>Start mining</button></div>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <section aria-label="Current mining policy" className="grid gap-4 sm:grid-cols-3">
      {[['Active algorithm',loading?'Loading...':!config?'Unavailable':config.algorithm?algorithmName(config.algorithm):'Not configured'],
        ['Minimum utility',loading?'Loading...':!config?'Unavailable':config.minUtilValue!==null?String(config.minUtilValue)+(config.minUtilMode==='PERCENTAGE'?'%':' frozen utility units'):'Not configured'],
        ['Policy version',loading?'Loading...':config?String(config.version):'Unavailable']].map(([label,value])=><article key={label} className="rounded-2xl border border-[#E7E2D8] bg-white p-5"><h2 className="text-sm text-[#6D7974]">{label}</h2><p className="mt-3 break-words text-2xl font-semibold">{value}</p></article>)}
    </section>
    {config?.version===0&&<p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No global mining policy has been saved. Open Algorithm Configuration before running mining.</p>}
    <section aria-labelledby="recent-mining-title" className="rounded-2xl border border-[#E7E2D8] bg-white p-5">
      <h2 id="recent-mining-title" className="text-xl font-semibold">Recent mining requests</h2>
      {!reader?<p className="mt-3 text-sm text-[#6D7974]">Choose a Store to see its latest mining requests.</p>:
        !current?<p role="status" className="mt-3 text-sm">Loading recent mining requests...</p>:
        current.error?<p role="alert" className="mt-3 text-sm text-red-800">{current.error}</p>:
        current.data&&<><p className="mt-3 text-sm text-[#6D7974]">{current.data.totalElements} requests for the selected Store. Showing the latest {current.data.items.length}.</p>
          {current.data.items.length===0?<p className="mt-4 text-sm">This Store has no mining requests yet.</p>:
          <ul className="mt-4 divide-y divide-[#E7E2D8]">{current.data.items.map(request=><li key={request.requestId} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div><p className="font-semibold">Request #{request.requestId} · Snapshot #{request.snapshotId}</p><p className="mt-1 text-xs text-[#6D7974]">{miningDate(request.createdAt)} · {request.algorithms.map(algorithmName).join(', ')}</p></div>
            <div className="flex items-center gap-3"><MiningStatusBadge kind="request" status={request.status}/><button type="button" className={miningButton} onClick={()=>onRequest(request.requestId)}>Open request #{request.requestId}</button></div>
          </li>)}</ul>}</>}
    </section>
  </div>;
}
