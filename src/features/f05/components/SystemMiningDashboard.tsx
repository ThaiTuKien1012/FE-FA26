import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../../../services/authService';
import { algorithmName, formatMiningNumber, formatThreshold, miningButton, miningDate, miningErrorMessage, miningPrimaryButton } from '../f05.display';
import type { MiningReader } from '../f05.reader';
import type { MiningConfiguration, Page, RequestView } from '../f05.types';
import { MiningStatusBadge } from './MiningStatusBadge';
interface Props {
  config:MiningConfiguration|null; loading:boolean; error:string; reader:MiningReader|null; storeSelector?:ReactNode;
  onRefresh:()=>void; onConfigure:()=>void; onRun:()=>void; onBenchmark?:()=>void; onRequest:(id:number)=>void;
}
export function SystemMiningDashboard({config,loading,error,reader,storeSelector,onRefresh,onConfigure,onRun,onBenchmark,onRequest}:Props){
  const [revision,setRevision]=useState(0);const token=(authService.getSessionId() || authService.getToken());
  const scope=reader?.scopeKey??'none';
  const [result,setResult]=useState<{scope:string;revision:number;token:string|null;data?:Page<RequestView>;error?:string}|null>(null);
  const current=result?.scope===scope&&result.revision===revision&&result.token===token?result:null;
  useEffect(()=>{
    if(!reader)return;
    const c=new AbortController();
    void reader.listRequests(0,5,c.signal).then(data=>{
      if(!c.signal.aborted&&(authService.getSessionId() || authService.getToken())===token)setResult({scope,revision,token,data});
    }).catch(e=>{if(!c.signal.aborted)setResult({scope,revision,token,error:miningErrorMessage(e)});});
    return()=>c.abort();
  },[reader,scope,revision,token]);
  return <div className="space-y-5">
    <section aria-labelledby="dashboard-global-config" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 id="dashboard-global-config" className="text-lg font-semibold">Global Mining Configuration</h2><p className="mt-1 text-sm text-[#6D7974]">Applies to all stores</p></div>
        <button type="button" className={miningButton} onClick={()=>{onRefresh();setRevision(v=>v+1);}}>Refresh dashboard</button>
      </div>
      {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <dl aria-busy={loading} className="mt-5 grid gap-5 sm:grid-cols-2">
        <div><dt className="text-sm text-[#6D7974]">Default Algorithm</dt><dd className="mt-2 text-2xl font-semibold">{loading?'Loading...':!config?'Unavailable':config.algorithm?algorithmName(config.algorithm):'Not configured'}</dd></div>
        <div><dt className="text-sm text-[#6D7974]">Minimum Utility</dt><dd className="mt-2 break-words text-2xl font-semibold">{loading?'Loading...':!config?'Unavailable':config.minUtilValue!==null?formatThreshold(config.minUtilValue,config.minUtilMode!):'Not configured'}</dd></div>
      </dl>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E7E2D8] pt-4">
        <div className="text-xs text-[#6D7974]"><p className="font-medium text-[#191C1B]">Configuration Version: {loading?'Loading...':config?formatMiningNumber(config.version):'Unavailable'}</p><p className="mt-1">Configuration Version tracks saved changes. Previous mining results remain unchanged.</p></div>
        <button type="button" className="text-sm font-semibold text-[#356B54] underline underline-offset-4" onClick={onConfigure}>Manage Configuration</button>
      </div>
      {config?.version===0&&<p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">No global mining configuration has been saved. Open Algorithm Configuration before running mining.</p>}
    </section>
    {storeSelector}
    <section aria-labelledby="recent-mining-title" className="overflow-hidden rounded-2xl border border-[#E7E2D8] bg-white">
      <div className="p-5 sm:p-6"><h2 id="recent-mining-title" className="text-lg font-semibold">Recent Mining Activity</h2>
        <p className="mt-1 text-sm text-[#6D7974]">{!reader?'Choose a Store to see its latest mining requests.':current?.data?`${formatMiningNumber(current.data.totalElements)} ${current.data.totalElements===1?'request':'requests'} for this store${current.data.totalElements>current.data.items.length?` · Latest ${current.data.items.length} shown`:''}.`:'Mining activity for the selected store.'}</p></div>
      {reader&&(!current?<p role="status" className="px-5 pb-5 text-sm text-[#6D7974]">Loading recent mining activity...</p>:current.error?<p role="alert" className="mx-5 mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{current.error} Use Refresh dashboard to try again.</p>:current.data&&
        (current.data.items.length===0?<p className="px-5 pb-5 text-sm text-[#6D7974]">This store has no mining requests yet. Run mining after a Merchandiser prepares a snapshot.</p>:
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Recent mining activity for the selected Store</caption><thead className="border-y border-[#E7E2D8] bg-[#FAF8F5] text-xs text-[#6D7974]"><tr>{['Request','Snapshot','Algorithms','Created','Status',''].map(label=><th scope="col" className="whitespace-nowrap px-5 py-3 font-medium" key={label}>{label||'Action'}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#E7E2D8]">{current.data.items.map(request=><tr key={request.requestId}><th scope="row" className="px-5 py-4 font-semibold">#{request.requestId}</th><td className="px-5 py-4">#{request.snapshotId}</td><td className="whitespace-nowrap px-5 py-4">{request.algorithms.map(algorithmName).join(', ')}</td><td className="whitespace-nowrap px-5 py-4 text-[#6D7974]">{miningDate(request.createdAt)}</td><td className="px-5 py-4"><MiningStatusBadge friendly kind="request" status={request.status}/></td><td className="px-5 py-4"><button type="button" className="whitespace-nowrap font-semibold text-[#356B54] underline-offset-4 hover:underline" aria-label={`View details for request #${request.requestId}`} onClick={()=>onRequest(request.requestId)}>View Details</button></td></tr>)}</tbody>
        </table></div>))}
    </section>
    <div className="flex flex-wrap gap-3"><button type="button" className={miningPrimaryButton} onClick={onRun}>Run Mining</button>{onBenchmark&&<button type="button" className={miningButton} onClick={onBenchmark}>Algorithm Benchmark</button>}</div>
  </div>;
}
