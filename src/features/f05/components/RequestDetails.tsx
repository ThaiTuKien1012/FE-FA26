import { StoreAnalysisDetails } from './StoreAnalysisDetails';
import { analysisErrorMessage } from '../f05.presentation';
import { MiningConversionDetails } from './MiningConversionDetails';
import { MiningProgressCard } from './MiningProgressCard';
import { formatDateRange } from '../../../utils/dateTime';
import { useEffect, useState } from 'react';
import { algorithmName, formatMiningNumber, formatThreshold, MATCH_DESCRIPTION, miningButton, miningDate, miningErrorMessage } from '../f05.display';
import { isRequestActive, watchMiningRequest } from '../f05.progress';
import type { MiningProgress } from '../f05.progress';
import type { RequestView } from '../f05.types';
import { MiningStatusBadge } from './MiningStatusBadge';
import { authService } from '../../../services/authService';
import { storeMiningReader } from '../f05.reader';
import type { MiningReader } from '../f05.reader';

interface Props {
  compact?: boolean;
  onClose?: () => void;
  reader?: MiningReader;
  onOpenBenchmark?: (requestId:number,runId:number)=>void;
  requestId: number;
  onUpdated: (request: RequestView) => void;
  onReadError: (error: unknown) => void;
}

export function RequestDetails({ requestId, onUpdated, onReadError, reader=storeMiningReader, onClose }: Props) {
  const [runId, setRunId] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  const token=(authService.getSessionId() || authService.getToken());
  const [result, setResult] = useState<{ key: string; token: string | null; data?: MiningProgress; error?: string } | null>(null);
  const key = `${reader.scopeKey}:${requestId}:${runId}:${revision}`;
  const current = result?.key === key && result.token===token ? result : null;

  useEffect(() => {
    const stop = watchMiningRequest(requestId, data => {
      setResult({ key, token, data });
      onUpdated(data.request);
    }, error => {
      setResult({ key, token, error: reader.kind==='store'?analysisErrorMessage(error):miningErrorMessage(error) });
      onReadError(error);
    }, runId, reader);
    return stop;
  }, [requestId, runId, key, token, reader, onUpdated, onReadError]);

  const data = current?.data;
  const request = data?.request;
  if (reader.kind === 'store') return <StoreAnalysisDetails data={data} error={current?.error} loading={!current} selectedRunId={runId} onRun={setRunId} onRefresh={() => setRevision(value => value + 1)} onClose={onClose} onReadError={onReadError} />;
  if(reader.kind==='system')return <section aria-labelledby="f05-details-title" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="f05-details-title" className="text-lg font-semibold">Analysis Details{request?' #'+request.requestId:''}</h2><button type="button" className={miningButton} disabled={!current} onClick={()=>setRevision(value=>value+1)}>Refresh details</button></div>
    {!current?<p role="status" className="mt-5 text-sm text-[#6D7974]">Loading analysis and execution details...</p>:current.error?<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{current.error} Updates have stopped. Use Refresh details to try again.</p>:request&&data&&<>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm"><span className="flex items-center gap-2">Analysis Status <MiningStatusBadge friendly kind="request" status={request.status}/></span></div>
      <MiningProgressCard progress={data.progress} snapshotId={request.snapshotId} />
      <dl className="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div><dt className="text-xs text-[#6D7974]">Snapshot</dt><dd className="mt-1 font-semibold">#{request.snapshotId}</dd></div>
        <div><dt className="text-xs text-[#6D7974]">Sales Period</dt><dd className="mt-1">{formatDateRange(request.snapshot.rangeStart, request.snapshot.rangeEnd)}</dd></div>
        <div><dt className="text-xs text-[#6D7974]">Algorithms</dt><dd className="mt-1">{request.algorithms.map(algorithmName).join(', ')}</dd></div>
        <div><dt className="text-xs text-[#6D7974]">Minimum Utility</dt><dd className="mt-1 break-words">{formatThreshold(request.minUtilValue,request.minUtilMode)}</dd></div>
        <div><dt className="text-xs text-[#6D7974]">Transactions / Distinct Items</dt><dd className="mt-1">{formatMiningNumber(request.transactionCount)} / {formatMiningNumber(request.distinctItems)}</dd></div>
        <div><dt className="text-xs text-[#6D7974]">Submitted At</dt><dd className="mt-1">{miningDate(request.createdAt, false)}</dd></div>
      </dl>
      <p className="mt-4 text-xs text-[#6D7974]">{isRequestActive(request)?'Progress updates automatically while this analysis is running.':'This analysis has finished. Automatic updates have stopped.'}</p>
      <details className="mt-4 border-t border-[#E7E2D8] pt-3 text-sm"><summary className="cursor-pointer font-medium">Technical Details</summary><dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2"><div><dt>Request ID</dt><dd>#{request.requestId}</dd></div><div><dt>Historical comparison status</dt><dd><MiningStatusBadge kind="comparison" status={request.comparisonStatus}/></dd></div></dl>{request.comparisonStatus==='MATCH'&&<p className="mt-3 text-xs text-[#6D7974]">{MATCH_DESCRIPTION}</p>}<MiningConversionDetails value={request} /><dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2"><div><dt className="text-[#6D7974]">Request key</dt><dd className="mt-1 break-all">{request.requestKey}</dd></div><div><dt className="text-[#6D7974]">SPMF threshold</dt><dd className="mt-1">{formatMiningNumber(request.minUtilSpmf)}</dd></div><div><dt className="text-[#6D7974]">Effective Minimum Utility</dt><dd className="mt-1">{formatMiningNumber(request.effectiveMinUtility)} analysis utility units</dd></div><div><dt className="text-[#6D7974]">Snapshot / input hash</dt><dd className="mt-1 break-all font-mono">{request.snapshotHash}<br/>{request.inputHash}</dd></div><div><dt className="text-[#6D7974]">Conversion / utility scale / divisor</dt><dd className="mt-1 break-words">{request.conversionVersion} / {request.utilityScale} / {formatMiningNumber(request.divisor)} · Total scaled utility: {formatMiningNumber(request.totalScaledUtility)}</dd></div></dl></details>
      <h3 className="mt-5 border-t border-[#E7E2D8] pt-5 font-semibold">Execution Details</h3>
      {data.runs.length===0?<p className="mt-3 text-sm text-[#6D7974]">No executions are available yet.</p>:<div className={data.runs.length===1?'mt-3':'mt-3 grid gap-4 lg:grid-cols-2'}>{data.runs.map(run=><article key={run.runId} className="min-w-0 rounded-xl border border-[#E7E2D8] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-semibold">{algorithmName(run.algorithm)}</h4><p className="mt-1 text-xs text-[#6D7974]">Run #{run.runId}</p></div><MiningStatusBadge friendly kind="run" status={run.status}/></div>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm"><div><dt className="text-xs text-[#6D7974]">Runtime</dt><dd className="mt-1 font-semibold tabular-nums">{run.runtimeMillis===null?'Not measured':formatMiningNumber(run.runtimeMillis)+' ms'}</dd></div><div><dt className="text-xs text-[#6D7974]">Patterns</dt><dd className="mt-1 font-semibold tabular-nums">{formatMiningNumber(run.patternCount)}</dd></div><div><dt className="text-xs text-[#6D7974]">Java Heap</dt><dd className="mt-1 font-semibold tabular-nums">{run.memoryMiB===null?'Not measured':formatMiningNumber(run.memoryMiB,2)+' MiB'}</dd></div></dl>
        {(run.failureCode!==null||run.failureMessage!==null)&&<p className="mt-4 break-words rounded-xl bg-red-50 p-3 text-sm text-red-800">{run.failureCode} {run.failureMessage}</p>}
        <button type="button" aria-pressed={runId===run.runId} onClick={()=>setRunId(runId===run.runId?null:run.runId)} className={miningButton+' mt-4'}>{runId===run.runId?'Hide run details':'View run #'+run.runId}</button>
      </article>)}</div>}
      {data.runDetail&&<div className="mt-4 rounded-xl border border-[#CADACF] bg-[#F3F8F4] p-4">
        <details className="text-sm"><summary className="cursor-pointer font-semibold">Run #{data.runDetail.runId} · Technical Details</summary><MiningConversionDetails value={data.runDetail} /><dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
          <div><dt className="text-[#6D7974]">Started / Completed</dt><dd className="mt-1">{miningDate(data.runDetail.startedAt, false)} / {miningDate(data.runDetail.completedAt, false)}</dd></div>
          <div><dt className="text-[#6D7974]">Library version / Attempt</dt><dd className="mt-1">{data.runDetail.libraryVersion} / {data.runDetail.attemptNo}</dd></div>
          <div><dt className="text-[#6D7974]">Conversion version</dt><dd className="mt-1">{data.runDetail.conversionVersion}</dd></div>
          <div><dt className="text-[#6D7974]">Runtime method</dt><dd className="mt-1 break-words">{data.runDetail.runtimeMethod}</dd></div>
          <div><dt className="text-[#6D7974]">Memory method</dt><dd className="mt-1 break-words">{data.runDetail.memoryMethod}</dd></div>
          <div><dt className="text-[#6D7974]">Environment</dt><dd className="mt-1 break-words">{data.runDetail.environment??'Not available'}</dd></div>
        </dl></details>
      </div>}
    </>}
  </section>;
  return null;
}
