import { storeAdminMessage } from '../../../utils/storeAdminCopy';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { formatDateRange } from '../../../utils/dateTime';
import { algorithmName, formatMiningNumber, miningButton, miningPrimaryButton, miningDate } from '../f05.display';
import { authService } from '../../../services/authService';
import { openRunRecommendations } from '../../f06/f06.navigation';
import { analysisFailure, analysisRoundingNote, friendlyAnalysisText } from '../f05.presentation';
import type { MiningProgress } from '../f05.progress';
import { MiningPatternsView } from './MiningPatternsView';
import { MiningProgressCard } from './MiningProgressCard';
import { MiningStatusBadge } from './MiningStatusBadge';
import { sameMiningInput } from '../f05.conversion';

export function initialCompletedRunId(data: MiningProgress): number | null {
  return data.runs.find(run => run.status === 'COMPLETED' && run.runId === data.progress.currentRunId)?.runId
    ?? data.runs.find(run => run.status === 'COMPLETED')?.runId ?? null;
}

export function recommendationRun(data: MiningProgress, selectedRunId: number | null) {
  const {request,runs,runDetail}=data,user=authService.getCurrentUser();
  return runDetail?.status==='COMPLETED' && runDetail.runId===selectedRunId &&
    runDetail.requestId===request.requestId && runDetail.snapshotId===request.snapshotId &&
    request.algorithms.includes(runDetail.algorithm) && sameMiningInput(request,runDetail) &&
    runs.some(run=>run.runId===runDetail.runId && run.status==='COMPLETED' && run.algorithm===runDetail.algorithm && run.requestId===request.requestId && run.snapshotId===request.snapshotId && run.storeId===request.storeId && sameMiningInput(request,run)) &&
    runDetail.storeId===user?.storeId && request.storeId===user?.storeId &&
    (user?.role==='Merchandiser'||user?.role==='Store Admin') ? runDetail : null;
}

export function StoreAnalysisContent({ data, selectedRunId, onRun, onReadError }: { data: MiningProgress; selectedRunId: number | null; onRun: (id: number | null) => void; onReadError: (error: unknown) => void }) {
  const {request, runs, progress, runDetail} = data;
  const note = analysisRoundingNote(request);
  const completedRuns=runs.filter(run=>run.status==='COMPLETED');
  return <>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="font-medium">Snapshot #{request.snapshotId}<span className="mt-1 block text-sm font-normal text-[#6D7974]">{formatDateRange(request.snapshot.rangeStart, request.snapshot.rangeEnd)}</span></p><MiningStatusBadge friendly kind="request" status={request.status} /></div>
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-[#6D7974]">Created At</dt><dd className="mt-1">{miningDate(request.createdAt, false)}</dd></div>{request.status==='COMPLETED'&&runs.length===1&&runs[0].status==='COMPLETED'&&runs[0].patternCount!==null&&<div><dt className="text-xs text-[#6D7974]">Product combinations found</dt><dd className="mt-1 font-semibold">{formatMiningNumber(runs[0].patternCount)}</dd></div>}</dl>
    {note && <p className="mt-4 rounded-lg bg-[#FAF8F5] p-3 text-sm text-[#6D7974]">{storeAdminMessage(note)}</p>}
    <MiningProgressCard simple progress={progress} snapshotId={request.snapshotId} />
    {request.snapshot.warnings.length > 0 && <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium text-amber-900">Snapshot warnings ({request.snapshot.warnings.length})</summary><ul className="mt-2 list-disc space-y-2 pl-5">{request.snapshot.warnings.map((warning,index)=><li className="break-words" key={index}>{friendlyAnalysisText(warning)}</li>)}</ul></details>}
    {completedRuns.length>1&&<label className="mt-5 block text-sm font-semibold" htmlFor="f05-result-run">Analysis result<select id="f05-result-run" className="mt-2 block w-full rounded-lg border border-[#E7E2D8] bg-white px-3 py-2 font-normal sm:w-auto" value={selectedRunId??''} onChange={event=>onRun(Number(event.target.value))}><option value="" disabled>Select a result</option>{completedRuns.map(run=><option key={run.runId} value={run.runId}>{algorithmName(run.algorithm)} · Run #{run.runId}</option>)}</select></label>}
    {runs.length===1&&runs[0].algorithm==='HUI_MINER'&&<p className="mt-5 text-sm text-[#6D7974]">{algorithmName(runs[0].algorithm)} results</p>}
    {!runs.length&&<p className="mt-3 text-sm text-[#6D7974]">{request.status==='COMPLETED'?'No saved results are available for this historical analysis.':request.status==='FAILED'?'This analysis failed before results were saved. Refresh Details or contact System Admin.':'Results will appear when the analysis finishes.'}</p>}
    {runs.filter(run=>run.status==='FAILED'||run.status==='TIMED_OUT').map(run=><p key={run.runId} role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{runs.length>1&&algorithmName(run.algorithm)+': '}{analysisFailure(run.failureCode,run.failureMessage)}</p>)}
    {runDetail && <MiningPatternsView compact showRoundingNote={false} key={runDetail.runId} run={runDetail} onReadError={onReadError} />}
  </>;
}

export function StoreAnalysisDetails({ data, error, loading, selectedRunId, onRun, onRefresh, onClose, onReadError }: { data?: MiningProgress; error?: string; loading: boolean; selectedRunId: number | null; onRun: (id: number | null) => void; onRefresh: () => void; onClose?: () => void; onReadError: (error: unknown) => void }) {
  const dialog=useRef<HTMLDialogElement>(null),closeRef=useRef(onClose);closeRef.current=onClose;
  useEffect(()=>{
    const node=dialog.current,previous=document.activeElement instanceof HTMLElement?document.activeElement:null,overflow=document.body.style.overflow;
    const cancel=(event:Event)=>{event.preventDefault();closeRef.current?.();};
    const keydown=(event:KeyboardEvent)=>{
      if(event.key!=='Tab'||!node?.open||event.ctrlKey||event.altKey||event.metaKey)return;
      const controls=[...node.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')].filter(control=>control.getClientRects().length>0);
      const first=controls[0],last=controls.at(-1),focused=document.activeElement;
      if(!node.contains(focused)||(event.shiftKey?focused===first:focused===last)){event.preventDefault();(event.shiftKey?last:first)?.focus();}
    };
    node?.addEventListener('cancel',cancel);document.addEventListener('keydown',keydown,true);node?.showModal();document.body.style.overflow='hidden';
    return()=>{node?.removeEventListener('cancel',cancel);document.removeEventListener('keydown',keydown,true);node?.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus({preventScroll:true});};
  },[]);
  const run=!loading&&!error&&data?recommendationRun(data,selectedRunId):null;
  return <dialog ref={dialog} aria-modal="true" aria-labelledby="f05-details-title" className="fixed inset-0 m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-[#E7E2D8] bg-white p-0 text-[#191C1B] shadow-xl backdrop:bg-black/30 open:flex">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#E7E2D8] bg-white p-4 sm:px-6"><h2 id="f05-details-title" className="text-xl font-semibold">Analysis Overview{data?' · Analysis #'+data.request.requestId:''}</h2><div className="flex items-center gap-2"><button type="button" className={miningButton} disabled={loading} onClick={onRefresh}>Refresh Details</button><button type="button" autoFocus aria-label="Close analysis details" className="rounded-lg p-2 hover:bg-[#EDF5F0] focus-visible:outline-2 focus-visible:outline-[#356B54]" onClick={onClose}><X aria-hidden="true" className="h-5 w-5"/></button></div></header>
    <div data-analysis-body className="min-h-0 overflow-y-auto p-4 sm:p-6">{loading?<p role="status" className="text-sm text-[#6D7974]">Loading analysis...</p>:error?<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{storeAdminMessage(error)} Updates have stopped. Use Refresh Details to try again.</p>:data&&<StoreAnalysisContent data={data} selectedRunId={selectedRunId} onRun={onRun} onReadError={onReadError} />}</div>
    {run&&<footer className="flex shrink-0 justify-end border-t border-[#E7E2D8] bg-white p-4 sm:px-6"><button type="button" className={miningPrimaryButton} onClick={()=>openRunRecommendations(run.runId)}>View Recommendations</button></footer>}
  </dialog>;
}
