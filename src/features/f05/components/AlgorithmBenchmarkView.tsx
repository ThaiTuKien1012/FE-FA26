import { useCallback, useEffect, useState } from 'react';
import { authService } from '../../../services/authService';
import { algorithmName, miningButton, miningErrorMessage } from '../f05.display';
import { watchMiningRequest } from '../f05.progress';
import type { MiningProgress } from '../f05.progress';
import type { MiningReader } from '../f05.reader';
import type { Algorithm } from '../f05.types';
import { MiningHistoryView } from './MiningHistoryView';
import { MiningBenchmarkView } from './MiningBenchmarkView';
interface Props {
  reader:MiningReader; requestId:number|null; runId:number|null;
  onRequest:(id:number|null)=>void; onRun:(requestId:number,runId:number)=>void;
  onCompare:()=>void; onChooseAlgorithm:(algorithm:Algorithm)=>void;
}
export function AlgorithmBenchmarkView({reader,requestId,runId,onRequest,onRun,onCompare,onChooseAlgorithm}:Props){
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
  return <div className="space-y-5">
    <section className="rounded-2xl border border-[#E7E2D8] bg-white p-5">
      <p className="text-sm text-[#6D7974]">Choose an existing request to inspect measured results. For a two-algorithm comparison, run Compare Algorithms on the same frozen snapshot. MATCH confirms equal canonical results; it does not declare a faster algorithm.</p>
      <button type="button" className={`${miningButton} mt-4`} onClick={onCompare}>Run a comparison</button>
    </section>
    <MiningHistoryView benchmarkPicker reader={reader} requestId={requestId} selectionError="" onSelect={onRequest}/>
    {requestId!==null&&<section aria-label="Benchmark selection" className="rounded-2xl border border-[#E7E2D8] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Request #{requestId} benchmark</h2><button type="button" className={miningButton} disabled={!current} onClick={()=>setRevision(r=>r+1)}>Refresh comparison</button></div>
      {!current?<p role="status" className="mt-4 text-sm">Loading benchmark request and runs...</p>:current.error?<p role="alert" className="mt-4 text-sm text-red-800">{current.error}</p>:data&&<>
        {data.request.algorithms.length===1&&<p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">This request used one algorithm. Run a comparison to evaluate both algorithms under the same settings.</p>}
        {data.runs.length===0?<p className="mt-4 text-sm">No algorithm runs are available yet. Refresh comparison to check again.</p>:
          <div role="group" aria-label="Benchmark run" className="mt-4 flex flex-wrap gap-2">{data.runs.map(run=><button type="button" key={run.runId} aria-pressed={selected?.runId===run.runId} className={miningButton} onClick={()=>onRun(data.request.requestId,run.runId)}>{algorithmName(run.algorithm)} · Run #{run.runId}</button>)}</div>}
        {runId!==null&&!selected&&<p role="alert" className="mt-4 text-sm text-red-800">This run does not belong to the selected request.</p>}
        {readError?<p role="alert" className="mt-4 text-sm text-red-800">{readError} Use Refresh comparison to try again.</p>:
          selected&&<MiningBenchmarkView key={selected.runId} reader={reader} request={data.request} runs={data.runs} selectedRun={selected} onReadError={onReadError} onChooseAlgorithm={onChooseAlgorithm}/>}
      </>}
    </section>}
  </div>;
}
