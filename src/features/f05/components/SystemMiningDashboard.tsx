import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../../../services/authService';
import { algorithmName, formatMiningNumber, formatThreshold, miningButton, miningDate, miningErrorMessage } from '../f05.display';
import type { MiningReader } from '../f05.reader';
import type { MiningConfiguration, Page, RequestView } from '../f05.types';
import { SystemAnalysisList } from './SystemAnalysisList';
interface Props {
  config:MiningConfiguration|null; loading:boolean; error:string; reader:MiningReader|null; storeSelector?:ReactNode;
  onRefresh:()=>void; onConfigure:()=>void; onRequest:(id:number)=>void;
}
export function SystemMiningDashboard({config,loading,error,reader,storeSelector,onRefresh,onConfigure,onRequest}:Props){
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
        <div><h2 id="dashboard-global-config" className="text-lg font-semibold">Current Mining Configuration</h2><p className="mt-1 text-sm text-[#6D7974]">Applies to all stores</p></div>
        <button type="button" className={miningButton} disabled={loading} onClick={()=>{onRefresh();setRevision(v=>v+1);}}>Refresh Overview</button>
      </div>
      {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <dl aria-busy={loading} className="mt-5 grid gap-5 sm:grid-cols-3">
        <div><dt className="text-xs text-[#6D7974]">Algorithm</dt><dd className="mt-2 font-semibold">{loading?'Loading...':!config?'Unavailable':config.algorithm?algorithmName(config.algorithm):'Unavailable'}</dd></div>
        <div><dt className="text-xs text-[#6D7974]">Minimum Utility</dt><dd className="mt-2 break-words font-semibold">{loading?'Loading...':!config?'Unavailable':config.minUtilValue!==null?formatThreshold(config.minUtilValue,config.minUtilMode!):'Not configured'}</dd></div>
        <div><dt className="text-xs text-[#6D7974]">Configuration Status</dt><dd className="mt-2 font-semibold">{loading?'Loading...':!config?'Unavailable':config.version===0?'Not Configured':'Configured'}</dd></div>
      </dl>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E7E2D8] pt-4">
        <p className="text-xs text-[#6D7974]">Configuration Version: {loading?'Loading...':config?formatMiningNumber(config.version):'Unavailable'}{config?.changedAt&&<> · Updated {miningDate(config.changedAt, false)}</>}</p>
        <button type="button" className="text-sm font-semibold text-[#356B54] underline underline-offset-4" onClick={onConfigure}>Manage Settings</button>
      </div>
      {config?.version===0&&<p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Mining settings haven't been configured yet. Configure the minimum utility to allow stores to start new analyses.</p>}
    </section>
    {storeSelector}
    <section aria-labelledby="recent-mining-title" className="overflow-hidden rounded-2xl border border-[#E7E2D8] bg-white">
      <div className="p-5 sm:p-6"><h2 id="recent-mining-title" className="text-lg font-semibold">Recent Analyses</h2>
        <p className="mt-1 text-sm text-[#6D7974]">{!reader?'Choose a store to see its recent analyses.':current?.data?`${formatMiningNumber(current.data.totalElements)} ${current.data.totalElements===1?'analysis':'analyses'} for this store${current.data.totalElements>current.data.items.length?` · Latest ${current.data.items.length} shown`:''}.`:'Analysis activity for the selected store.'}</p></div>
      {reader&&(!current?<p role="status" className="px-5 pb-5 text-sm text-[#6D7974]">Loading recent analyses...</p>:current.error?<p role="alert" className="mx-5 mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{current.error} Use Refresh Overview to try again.</p>:current.data&&
        (current.data.items.length===0?<p className="px-5 pb-5 text-sm text-[#6D7974]">No analyses have been recorded for this store yet.</p>:<SystemAnalysisList recent items={current.data.items} onSelect={onRequest}/>))}
    </section>
  </div>;
}
