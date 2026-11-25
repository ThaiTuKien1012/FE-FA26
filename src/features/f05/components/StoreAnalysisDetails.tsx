import { storeAdminMessage } from '../../../utils/storeAdminCopy';
import { useEffect, useRef } from 'react';
import { formatDateRange } from '../../../utils/dateTime';
import { algorithmName, formatMiningNumber, miningButton, miningPrimaryButton, miningDate } from '../f05.display';
import { authService } from '../../../services/authService';
import { openRunRecommendations } from '../../f06/f06.navigation';
import { analysisFailure, analysisRoundingNote, friendlyAnalysisText } from '../f05.presentation';
import type { MiningProgress } from '../f05.progress';
import { MiningPatternsView } from './MiningPatternsView';
import { MiningProgressCard } from './MiningProgressCard';
import { MiningStatusBadge } from './MiningStatusBadge';

export function StoreAnalysisContent({ data, selectedRunId, onRun, onReadError }: { data: MiningProgress; selectedRunId: number | null; onRun: (id: number | null) => void; onReadError: (error: unknown) => void }) {
  const {request, runs, progress, runDetail} = data;
  const note = analysisRoundingNote(request);
  const user=authService.getCurrentUser();
  const canView=runDetail?.status==='COMPLETED'&&runDetail.runId===selectedRunId&&runDetail.requestId===request.requestId&&runDetail.snapshotId===request.snapshotId&&runs.some(run=>run.runId===runDetail.runId&&run.status==='COMPLETED')&&runDetail.storeId===user?.storeId&&request.storeId===user?.storeId&&(user?.role==='Merchandiser'||user?.role==='Store Admin');
  return <>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="font-medium">Snapshot #{request.snapshotId}<span className="mt-1 block text-sm font-normal text-[#6D7974]">{formatDateRange(request.snapshot.rangeStart, request.snapshot.rangeEnd)}</span></p><MiningStatusBadge friendly kind="request" status={request.status} /></div>
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-[#6D7974]">Created At</dt><dd className="mt-1">{miningDate(request.createdAt, false)}</dd></div>{request.status==='COMPLETED'&&runs.length===1&&runs[0].status==='COMPLETED'&&runs[0].patternCount!==null&&<div><dt className="text-xs text-[#6D7974]">Product combinations found</dt><dd className="mt-1 font-semibold">{formatMiningNumber(runs[0].patternCount)}</dd></div>}</dl>
    {note && <p className="mt-4 rounded-lg bg-[#FAF8F5] p-3 text-sm text-[#6D7974]">{storeAdminMessage(note)}</p>}
    <MiningProgressCard simple progress={progress} snapshotId={request.snapshotId} />
    {request.snapshot.warnings.length > 0 && <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium text-amber-900">Snapshot warnings ({request.snapshot.warnings.length})</summary><ul className="mt-2 list-disc space-y-2 pl-5">{request.snapshot.warnings.map((warning,index)=><li className="break-words" key={index}>{friendlyAnalysisText(warning)}</li>)}</ul></details>}
    <h3 className="mt-5 font-semibold">Analysis Results</h3>
    {!runs.length ? <p className="mt-3 text-sm text-[#6D7974]">{request.status==='COMPLETED'?'No saved results are available for this historical analysis.':request.status==='FAILED'?'This analysis failed before results were saved. Refresh Details or contact System Admin.':'Results will appear when the analysis finishes.'}</p> : <div data-store-run-grid className="mt-3 grid gap-3">{runs.map(run=><article key={run.runId} className="min-w-0 rounded-xl border border-[#E7E2D8] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="font-medium">{runs.length>1||run.algorithm==='HUI_MINER'?algorithmName(run.algorithm)+' results':'Product combinations'}</h4><MiningStatusBadge friendly kind="run" status={run.status} /></div>
      {run.status==='COMPLETED'&&run.patternCount!==null&&<p className="mt-2 text-sm">{formatMiningNumber(run.patternCount)} product combinations found</p>}
      {(run.status==='FAILED'||run.status==='TIMED_OUT')&&<p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{analysisFailure(run.failureCode,run.failureMessage)}</p>}
      {run.status==='COMPLETED'&&<button type="button" data-analysis-run={run.runId} aria-expanded={selectedRunId===run.runId} className={miningButton+' mt-3'} onClick={()=>onRun(selectedRunId===run.runId?null:run.runId)}>{selectedRunId===run.runId?'Hide Results':'View Results'}</button>}
    </article>)}</div>}
    {runDetail && <MiningPatternsView compact showRoundingNote={false} key={runDetail.runId} run={runDetail} onReadError={onReadError} />}
    {canView&&<div className="mt-5 flex justify-end border-t border-[#E7E2D8] pt-4"><button type="button" className={miningPrimaryButton} onClick={()=>openRunRecommendations(runDetail!.runId)}>View Recommendations</button></div>}
  </>;
}

export function StoreAnalysisDetails({ data, error, loading, selectedRunId, onRun, onRefresh, onClose, onReadError }: { data?: MiningProgress; error?: string; loading: boolean; selectedRunId: number | null; onRun: (id: number | null) => void; onRefresh: () => void; onClose?: () => void; onReadError: (error: unknown) => void }) {
  const title=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{title.current?.focus({preventScroll:true});title.current?.scrollIntoView({block:'start'});},[]);
  return <section aria-labelledby="f05-details-title" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 ref={title} tabIndex={-1} id="f05-details-title" className="text-xl font-semibold">Analysis Overview{data?' · Analysis #'+data.request.requestId:''}</h2><div className="flex flex-wrap gap-2"><button type="button" className={miningButton} disabled={loading} onClick={onRefresh}>Refresh Details</button>{onClose&&<button type="button" className={miningButton} onClick={onClose}>Close Details</button>}</div></div>
    {loading?<p role="status" className="mt-4 text-sm text-[#6D7974]">Loading analysis...</p>:error?<p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{storeAdminMessage(error)} Updates have stopped. Use Refresh Details to try again.</p>:data&&<StoreAnalysisContent data={data} selectedRunId={selectedRunId} onRun={onRun} onReadError={onReadError} />}
  </section>;
}
