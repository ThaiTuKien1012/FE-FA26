import { formatDate, formatDateRange } from '../../../utils/dateTime';
import { algorithmName, formatMiningNumber, miningButton, miningDate, miningInput } from '../../f05/f05.display';
import { MiningStatusBadge } from '../../f05/components/MiningStatusBadge';
import { analysisRoundingNote } from '../../f05/f05.presentation';
import type { GenerationState, RecommendationGeneration } from '../f06.generate';
import { F06Pages } from './F06Pages';

export function F06RunPicker({ state, workflow }: { state: GenerationState; workflow: RecommendationGeneration }) {
  const history=state.history, canGenerate=state.role==='Merchandiser';
  return <section aria-labelledby="f06-source-title" className="rounded-xl border border-[#E7E2D8] p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 id="f06-source-title" className="font-semibold">1. Select completed mining results</h3><button type="button" className={miningButton} disabled={state.historyLoading||state.pending} onClick={()=>void workflow.refreshHistory()}>Refresh requests</button></div>
    {state.historyLoading||!history&&!state.historyError?<p role="status" className="mt-3 text-sm text-[#6D7974]">Loading saved analyses...</p>:state.historyError?<p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.historyError} Refresh requests to try again.</p>:history&&<>
      {!history.items.length?<p className="mt-3 text-sm text-[#6D7974]">No mining requests are available for your Store. Complete an analysis in F05 before generating suggestions.</p>:<div className="mt-3"><label htmlFor="f06-request" className="text-xs font-semibold">Analysis</label><select id="f06-request" className={miningInput} disabled={state.pending} value={state.request?.requestId??''} onChange={event=>void workflow.selectRequest(Number(event.target.value))}><option value="" disabled>Select an analysis</option>{history.items.map(request=><option key={request.requestId} value={request.requestId}>{formatDate(request.snapshot.asOfDate)} · {formatDateRange(request.snapshot.rangeStart,request.snapshot.rangeEnd)} · Snapshot #{request.snapshotId} / Analysis #{request.requestId}</option>)}</select></div>}
      <F06Pages data={history} label="requests" busy={state.pending} onPage={page=>void workflow.refreshHistory(page)} />
    </>}
    {state.request&&<div className="mt-3 border-t border-[#E7E2D8] pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-[#6D7974]">Choose a completed result below, even if another result in the analysis failed.</p><button type="button" className={miningButton} disabled={state.runsLoading||state.pending} onClick={()=>void workflow.selectRequest(state.request!.requestId)}>Refresh runs</button></div>
      {analysisRoundingNote(state.request)&&<p className="mt-2 text-xs text-[#6D7974]">{analysisRoundingNote(state.request)}</p>}
      {state.runsLoading?<p role="status" className="mt-3 text-sm">Loading saved results...</p>:state.runsError?<p role="alert" className="mt-3 text-sm text-red-800">{state.runsError} Use Refresh runs to try again.</p>:<>
        {!state.runs.some(run=>run.status==='COMPLETED')&&<p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No completed runs are available for this analysis. Choose another analysis or refresh later.</p>}
        <fieldset disabled={state.pending} className="mt-3 grid gap-2 sm:grid-cols-2"><legend className="sr-only">Saved mining results</legend>{state.runs.map(run=><label key={run.runId} className={'flex min-w-0 items-start gap-3 rounded-lg border p-3 '+(state.selectedRunId===run.runId?'border-[#356B54] bg-[#EDF5F0]':'border-[#E7E2D8]')}>{canGenerate&&<input type="radio" name="f06-run" aria-label={'Select run #'+run.runId} checked={state.selectedRunId===run.runId} disabled={run.status!=='COMPLETED'} onChange={()=>workflow.selectRun(run.runId)} className="mt-1 h-4 w-4 shrink-0 accent-[#356B54]" />}<span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">{algorithmName(run.algorithm)} results</span><MiningStatusBadge friendly kind="run" status={run.status} /></span><span className="mt-2 block text-xs text-[#6D7974]">{run.patternCount===null?'Product count unavailable':formatMiningNumber(run.patternCount)+' product combinations'} · Completed {run.completedAt===null?'Not recorded':miningDate(run.completedAt)}</span></span></label>)}</fieldset>
      </>}
      <details className="mt-3 text-xs text-[#6D7974]"><summary className="cursor-pointer">Source references</summary><p className="mt-2">Analysis #{state.request.requestId} · Snapshot #{state.request.snapshotId}</p><p className="mt-1">{state.runs.map(run=>algorithmName(run.algorithm)+' #'+run.runId).join(' · ')}</p></details>
    </div>}
  </section>;
}
