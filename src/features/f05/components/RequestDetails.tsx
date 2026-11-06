import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { algorithmName, formatMiningNumber, formatThreshold, MATCH_DESCRIPTION, miningButton, miningDate, miningErrorMessage } from '../f05.display';
import { isRequestActive, watchMiningRequest } from '../f05.progress';
import type { MiningProgress } from '../f05.progress';
import type { RequestView, RunView } from '../f05.types';
import { MiningStatusBadge } from './MiningStatusBadge';
import { MiningRunResults } from './MiningRunResults';
import { authService } from '../../../services/authService';
import { storeMiningReader } from '../f05.reader';
import type { MiningReader } from '../f05.reader';

interface Props {
  reader?: MiningReader;
  onOpenBenchmark?: (requestId:number,runId:number)=>void;
  requestId: number;
  onUpdated: (request: RequestView) => void;
  onReadError: (error: unknown) => void;
}

function RunMeasurements({ run }: { run: RunView }) {
  return <>
    <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
      <div><dt className="text-xs text-[#6D7974]">Started</dt><dd className="mt-1">{miningDate(run.startedAt)}</dd></div>
      <div><dt className="text-xs text-[#6D7974]">Completed</dt><dd className="mt-1">{miningDate(run.completedAt)}</dd></div>
      {run.patternCount !== null && <div><dt className="text-xs text-[#6D7974]">Pattern count</dt><dd className="mt-1">{run.patternCount}</dd></div>}
      {run.runtimeMillis !== null && <div><dt className="text-xs text-[#6D7974]">Measured runtime</dt><dd className="mt-1">{run.runtimeMillis} ms</dd></div>}
      {run.memoryMiB !== null && <div><dt className="text-xs text-[#6D7974]">Measured Java heap</dt><dd className="mt-1">{run.memoryMiB} MiB</dd></div>}
    </dl>
    {(run.failureCode !== null || run.failureMessage !== null) && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      {run.failureCode !== null && <p className="break-words font-semibold">{run.failureCode}</p>}
      {run.failureMessage !== null && <p className="mt-1 whitespace-pre-wrap break-words">{run.failureMessage}</p>}
    </div>}
  </>;
}

export function RequestDetails({ requestId, onUpdated, onReadError, reader=storeMiningReader, onOpenBenchmark }: Props) {
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
      setResult({ key, token, error: miningErrorMessage(error) });
      onReadError(error);
    }, runId, reader);
    return stop;
  }, [requestId, runId, key, token, reader, onUpdated, onReadError]);

  const data = current?.data;
  const request = data?.request;
  if(reader.kind==='system')return <section aria-labelledby="f05-details-title" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="f05-details-title" className="text-lg font-semibold">Request Details{request?' #'+request.requestId:''}</h2><button type="button" className={miningButton} disabled={!current} onClick={()=>setRevision(value=>value+1)}>Refresh details</button></div>
    {!current?<p role="status" className="mt-5 text-sm text-[#6D7974]">Loading request and algorithm runs...</p>:current.error?<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{current.error} Updates have stopped. Use Refresh details to try again.</p>:request&&data&&<>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm"><span className="flex items-center gap-2">Request Status <MiningStatusBadge friendly kind="request" status={request.status}/></span>{request.algorithms.length===2&&<span className="flex items-center gap-2">Comparison Result <MiningStatusBadge friendly kind="comparison" status={request.comparisonStatus}/></span>}</div>
      {request.comparisonStatus==='MATCH'&&<p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{MATCH_DESCRIPTION}</p>}
      <dl className="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div><dt className="text-xs text-[#6D7974]">Snapshot</dt><dd className="mt-1 font-semibold">#{request.snapshotId}</dd></div>
        <div><dt className="text-xs text-[#6D7974]">Sales Period</dt><dd className="mt-1">{request.snapshot.rangeStart} to {request.snapshot.rangeEnd}</dd></div>
        <div><dt className="text-xs text-[#6D7974]">Algorithms</dt><dd className="mt-1">{request.algorithms.map(algorithmName).join(', ')}</dd></div>
        <div><dt className="text-xs text-[#6D7974]">Minimum Utility</dt><dd className="mt-1 break-words">{formatThreshold(request.minUtilValue,request.minUtilMode)}</dd></div>
        <div><dt className="text-xs text-[#6D7974]">Transactions / Distinct Items</dt><dd className="mt-1">{formatMiningNumber(request.transactionCount)} / {formatMiningNumber(request.distinctItems)}</dd></div>
        <div><dt className="text-xs text-[#6D7974]">Created At</dt><dd className="mt-1">{miningDate(request.createdAt)}</dd></div>
      </dl>
      <p className="mt-4 text-xs text-[#6D7974]">{isRequestActive(request)?'Progress updates automatically while this request is running.':'This request has finished. Automatic updates have stopped.'}</p>
      <details className="mt-4 border-t border-[#E7E2D8] pt-3 text-sm"><summary className="cursor-pointer font-medium">Technical Details</summary><dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2"><div><dt className="text-[#6D7974]">SPMF threshold</dt><dd className="mt-1">{formatMiningNumber(request.minUtilSpmf)}</dd></div><div><dt className="text-[#6D7974]">Effective Minimum Utility</dt><dd className="mt-1">{formatMiningNumber(request.effectiveMinUtility)} frozen utility units</dd></div><div><dt className="text-[#6D7974]">Snapshot / input hash</dt><dd className="mt-1 break-all font-mono">{request.snapshotHash}<br/>{request.inputHash}</dd></div><div><dt className="text-[#6D7974]">Conversion / utility scale / divisor</dt><dd className="mt-1 break-words">{request.conversionVersion} / {request.utilityScale} / {formatMiningNumber(request.divisor)}</dd></div></dl></details>
      <h3 className="mt-5 border-t border-[#E7E2D8] pt-5 font-semibold">Algorithm Runs</h3>
      {data.runs.length===0?<p className="mt-3 text-sm text-[#6D7974]">No algorithm runs are available yet.</p>:<div className="mt-3 grid gap-4 lg:grid-cols-2">{data.runs.map(run=><article key={run.runId} className="min-w-0 rounded-xl border border-[#E7E2D8] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-semibold">{algorithmName(run.algorithm)}</h4><p className="mt-1 text-xs text-[#6D7974]">Run #{run.runId}</p></div><MiningStatusBadge friendly kind="run" status={run.status}/></div>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm"><div><dt className="text-xs text-[#6D7974]">Runtime</dt><dd className="mt-1 font-semibold tabular-nums">{run.runtimeMillis===null?'Not measured':formatMiningNumber(run.runtimeMillis)+' ms'}</dd></div><div><dt className="text-xs text-[#6D7974]">Patterns</dt><dd className="mt-1 font-semibold tabular-nums">{formatMiningNumber(run.patternCount)}</dd></div><div><dt className="text-xs text-[#6D7974]">Java Heap</dt><dd className="mt-1 font-semibold tabular-nums">{run.memoryMiB===null?'Not measured':formatMiningNumber(run.memoryMiB,2)+' MiB'}</dd></div></dl>
        {(run.failureCode!==null||run.failureMessage!==null)&&<p className="mt-4 break-words rounded-xl bg-red-50 p-3 text-sm text-red-800">{run.failureCode} {run.failureMessage}</p>}
        <button type="button" aria-pressed={runId===run.runId} onClick={()=>setRunId(runId===run.runId?null:run.runId)} className={miningButton+' mt-4'}>{runId===run.runId?'Hide run details':'View run #'+run.runId}</button>
      </article>)}</div>}
      {data.runDetail&&<div className="mt-4 rounded-xl border border-[#CADACF] bg-[#F3F8F4] p-4">
        <details className="text-sm"><summary className="cursor-pointer font-semibold">Run #{data.runDetail.runId} · Technical Details</summary><dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
          <div><dt className="text-[#6D7974]">Started / Completed</dt><dd className="mt-1">{miningDate(data.runDetail.startedAt)} / {miningDate(data.runDetail.completedAt)}</dd></div>
          <div><dt className="text-[#6D7974]">Library version / Attempt</dt><dd className="mt-1">{data.runDetail.libraryVersion} / {data.runDetail.attemptNo}</dd></div>
          <div><dt className="text-[#6D7974]">Conversion version</dt><dd className="mt-1">{data.runDetail.conversionVersion}</dd></div>
          <div><dt className="text-[#6D7974]">Runtime method</dt><dd className="mt-1 break-words">{data.runDetail.runtimeMethod}</dd></div>
          <div><dt className="text-[#6D7974]">Memory method</dt><dd className="mt-1 break-words">{data.runDetail.memoryMethod}</dd></div>
          <div><dt className="text-[#6D7974]">Environment</dt><dd className="mt-1 break-words">{data.runDetail.environment??'Not available'}</dd></div>
        </dl></details>
        <MiningRunResults key={data.runDetail.runId} reader={reader} request={request} runs={data.runs} run={data.runDetail} onReadError={onReadError} onOpenBenchmark={onOpenBenchmark}/>
      </div>}
    </>}
  </section>;
  return <section aria-labelledby="f05-details-title" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="f05-details-title" className="text-xl font-semibold">Request details{request ? ` #${request.requestId}` : ''}</h2>
      <button type="button" className={miningButton} disabled={!current} onClick={() => setRevision(value => value + 1)}><RefreshCw aria-hidden="true" className="mr-2 inline h-4 w-4" />Refresh details</button>
    </div>
    {!current ? <p role="status" className="mt-5 flex items-center gap-2 text-sm text-[#6D7974]"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading request and algorithm runs...</p> : current.error ?
      <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{current.error}</p><p className="mt-2">Updates have stopped. Use Refresh details to try again manually.</p></div> : request && data && <>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
          <p className="flex items-center gap-2"><span className="text-[#6D7974]">Request</span><MiningStatusBadge kind="request" status={request.status} /></p>
          <p className="flex items-center gap-2"><span className="text-[#6D7974]">Comparison</span><MiningStatusBadge kind="comparison" status={request.comparisonStatus} /></p>
        </div>
        <p className="mt-3 text-xs text-[#6D7974]">{isRequestActive(request) ? 'Auto-refreshing only this request and its runs, 1.5 seconds after each completed read.' : 'Request is terminal. Automatic updates have stopped.'}</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <section className="min-w-0 rounded-xl bg-[#FAF8F5] p-4"><h3 className="font-semibold">Frozen input</h3><dl className="mt-3 space-y-2 text-sm">
            <div><dt className="text-xs text-[#6D7974]">Snapshot</dt><dd>#{request.snapshotId}</dd></div>
            <div><dt className="text-xs text-[#6D7974]">Date range</dt><dd>{request.snapshot.rangeStart} to {request.snapshot.rangeEnd}</dd></div>
            <div><dt className="text-xs text-[#6D7974]">Algorithms</dt><dd>{request.algorithms.map(algorithmName).join(', ')}</dd></div>
            <div><dt className="text-xs text-[#6D7974]">Created (local time)</dt><dd><time dateTime={request.createdAt}>{miningDate(request.createdAt)}</time></dd></div>
          </dl></section>
          <section className="min-w-0 rounded-xl bg-[#FAF8F5] p-4"><h3 className="font-semibold">Minimum utility</h3><dl className="mt-3 space-y-2 text-sm">
            <div><dt className="text-xs text-[#6D7974]">Mode / value</dt><dd className="break-words">{request.minUtilMode} · {request.minUtilValue}{request.minUtilMode === 'PERCENTAGE' ? '%' : ' frozen utility units'}</dd></div>
            <div><dt className="text-xs text-[#6D7974]">minUtilSpmf</dt><dd>{request.minUtilSpmf}</dd></div>
            <div><dt className="text-xs text-[#6D7974]">Effective minimum utility</dt><dd className="break-all">{request.effectiveMinUtility}</dd></div>
          </dl><p className="mt-3 text-xs text-[#6D7974]">Thresholds are supplied by the backend.</p></section>
          <section className="min-w-0 rounded-xl bg-[#FAF8F5] p-4"><h3 className="font-semibold">Dataset</h3><dl className="mt-3 space-y-2 text-sm">
            <div><dt className="text-xs text-[#6D7974]">Transaction count</dt><dd>{request.transactionCount}</dd></div>
            <div><dt className="text-xs text-[#6D7974]">Distinct items</dt><dd>{request.distinctItems}</dd></div>
          </dl></section>
        </div>
        <h3 className="mt-6 text-lg font-semibold">Algorithm runs</h3>
        {data.runs.length === 0 ? <p className="mt-3 text-sm text-[#6D7974]">No runs were returned for this request.</p> : <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {data.runs.map(run => <article key={run.runId} className="min-w-0 rounded-xl border border-[#E7E2D8] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">{algorithmName(run.algorithm)} · Run #{run.runId}</h4><MiningStatusBadge kind="run" status={run.status} /></div>
            <RunMeasurements run={run} />
            <button type="button" aria-pressed={runId === run.runId} onClick={() => setRunId(runId === run.runId ? null : run.runId)} className={`${miningButton} mt-4`}>{runId === run.runId ? 'Hide run details' : `View run #${run.runId}`}</button>
          </article>)}
        </div>}
        {data.runDetail && <section aria-labelledby="f05-run-title" className="mt-5 rounded-xl border border-[#CADACF] bg-[#F3F8F4] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="f05-run-title" className="font-semibold">Run details #{data.runDetail.runId} · {algorithmName(data.runDetail.algorithm)}</h3><MiningStatusBadge kind="run" status={data.runDetail.status} /></div>
          <RunMeasurements run={data.runDetail} />
          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-[#6D7974]">Library version / attempt</dt><dd>{data.runDetail.libraryVersion} · {data.runDetail.attemptNo}</dd></div>
            <div><dt className="text-xs text-[#6D7974]">Conversion version</dt><dd>{data.runDetail.conversionVersion}</dd></div>
            <div><dt className="text-xs text-[#6D7974]">Runtime measurement method</dt><dd className="break-words">{data.runDetail.runtimeMethod}</dd></div>
            <div><dt className="text-xs text-[#6D7974]">Memory measurement method</dt><dd className="break-words">{data.runDetail.memoryMethod}</dd></div>
            {data.runDetail.environment !== null && <div className="sm:col-span-2"><dt className="text-xs text-[#6D7974]">Environment</dt><dd className="break-words">{data.runDetail.environment}</dd></div>}
          </dl>
          <MiningRunResults key={data.runDetail.runId} reader={reader} request={request} runs={data.runs} run={data.runDetail} onReadError={onReadError} onOpenBenchmark={onOpenBenchmark} />
        </section>}
      </>}
  </section>;
}
