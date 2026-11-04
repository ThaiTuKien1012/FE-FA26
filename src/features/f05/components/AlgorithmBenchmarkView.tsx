import { useCallback, useEffect, useState } from 'react';
import { authService } from '../../../services/authService';
import { algorithmName, miningButton, miningErrorMessage, miningInput } from '../f05.display';
import { watchMiningRequest } from '../f05.progress';
import type { MiningProgress } from '../f05.progress';
import type { MiningReader } from '../f05.reader';
import { MiningHistoryView } from './MiningHistoryView';
import { MiningBenchmarkView } from './MiningBenchmarkView';
interface Props {
  reader:MiningReader; requestId:number|null; runId:number|null;
  onRequest:(id:number|null)=>void; onRun:(requestId:number,runId:number)=>void; onCompare:()=>void;
}
export function AlgorithmBenchmarkView({reader,requestId,runId,onRequest,onRun,onCompare}:Props){
  const [revision,setRevision]=useState(0);const token=authService.getToken();
  const key=reader.scopeKey+':'+requestId+':'+revision;
  const [result,setResult]=useState<{key:string;token:string|null;data?:MiningProgress;error?:string}|null>(null);
  const current=result?.key===key&&result.token===token?result:null;
  const [readError,setReadError]=useState('');
  const onReadError=useCallback((error:unknown)=>setReadError(miningErrorMessage(error)),[]);
  useEffect(()=>{
    if(requestId===null)return;
    setReadError('');
    return watchMiningRequest(requestId,data=>setResult({key,token,data}),e=>setResult({key,token,error:miningErrorMessage(e)}),null,reader);
  },[requestId,key,token,reader]);
  const data=current?.data;
  const selected=data?.runs.find(run=>run.runId===runId)??(runId===null?data?.runs[0]:undefined);
  const bothRuns=Boolean(data&&data.request.algorithms.length===2&&data.runs.length===2&&new Set(data.runs.map(r=>r.algorithm)).size===2);
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-3xl text-sm leading-relaxed text-[#6D7974]">Choose a request below to review its measured performance. Comparison uses the same frozen snapshot and threshold for both algorithms.</p><button type="button" className={miningButton} onClick={onCompare}>Run a comparison</button></div>
    <MiningHistoryView benchmarkPicker reader={reader} requestId={requestId} selectionError="" onSelect={onRequest}/>
    {requestId!==null&&<section aria-label="Benchmark selection" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-medium">Request #{requestId}</p><button type="button" className={miningButton} disabled={!current} onClick={()=>setRevision(r=>r+1)}>Refresh comparison</button></div>
      {!current?<p role="status" className="rounded-xl border border-[#E7E2D8] bg-white p-5 text-sm text-[#6D7974]">Loading benchmark request and runs...</p>:current.error?<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{current.error}</p>:data&&<>
        {data.request.algorithms.length===1&&<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">This request used one algorithm. Run a comparison to evaluate both algorithms under the same settings.</p>}
        {data.runs.length===0?<p className="rounded-xl border border-[#E7E2D8] bg-white p-5 text-sm text-[#6D7974]">No algorithm runs are available yet. Refresh comparison to check again.</p>:
          !bothRuns&&data.runs.length>1&&<label className="block max-w-sm text-sm font-medium">Algorithm Run<select aria-label="Benchmark run" className={miningInput} value={selected?.runId??''} onChange={e=>onRun(data.request.requestId,Number(e.target.value))}><option value="" disabled>Select a run</option>{data.runs.map(run=><option key={run.runId} value={run.runId}>{algorithmName(run.algorithm)} · Run #{run.runId}</option>)}</select></label>}
        {runId!==null&&!selected&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">This run does not belong to the selected request.</p>}
        {readError?<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{readError} Use Refresh comparison to try again.</p>:
          selected&&<MiningBenchmarkView key={selected.runId} reader={reader} request={data.request} runs={data.runs} selectedRun={selected} onReadError={onReadError}/>}
      </>}
    </section>}
  </div>;
}
