import { Loader2, RefreshCw } from 'lucide-react';
import { algorithmName, miningButton, miningDate, miningInput } from '../../f05/f05.display';
import { MiningStatusBadge } from '../../f05/components/MiningStatusBadge';
import type { GenerationState, RecommendationGeneration } from '../f06.generate';

export function F06RunPicker({ state, workflow }: { state: GenerationState; workflow: RecommendationGeneration }) {
  const canGenerate = state.role === 'Merchandiser';
  const history = state.history;
  const totalPages = history ? Math.max(1, Math.ceil(history.totalElements / history.pageSize)) : 1;
  return <section aria-labelledby="f06-source-title" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="f06-source-title" className="text-xl font-semibold">1. Mining source</h2><p className="mt-2 text-sm text-[#6D7974]">Browse requests for your Store, then {canGenerate ? 'choose a completed run' : 'inspect its algorithm runs'}.</p></div>
      <button type="button" className={miningButton} disabled={state.historyLoading || state.pending} onClick={() => void workflow.refreshHistory()}><RefreshCw aria-hidden="true" className="mr-2 inline h-4 w-4" />Refresh requests</button>
    </div>
    {state.historyLoading || !history && !state.historyError ? <p role="status" className="mt-5 flex items-center gap-2 text-sm text-[#6D7974]"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading mining requests...</p> : state.historyError ?
      <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{state.historyError}<p className="mt-2">Use Refresh requests to try again manually.</p></div> : history && <>
        {!history.items.length ? <p className="mt-5 rounded-xl bg-[#FAF8F5] p-5 text-sm text-[#6D7974]">No mining requests are available for your Store.</p> : <div className="mt-5">
          <label htmlFor="f06-request" className="text-sm font-semibold">Mining request</label>
          <select id="f06-request" className={miningInput} disabled={state.pending} value={state.request?.requestId ?? ''} onChange={event => void workflow.selectRequest(Number(event.target.value))}>
            <option value="" disabled>Select a request</option>
            {history.items.map(request => <option key={request.requestId} value={request.requestId}>Request #{request.requestId} · Snapshot #{request.snapshotId} · Request: {request.status} · Comparison: {request.comparisonStatus}</option>)}
          </select>
        </div>}
        <nav aria-label="Recommendation source request pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6D7974]">
          <span>Page {history.page + 1} of {totalPages} · {history.totalElements} requests</span>
          <div className="flex gap-2"><button type="button" className={miningButton} disabled={state.pending || state.page === 0} onClick={() => void workflow.refreshHistory(state.page - 1)}>Previous requests</button><button type="button" className={miningButton} disabled={state.pending || state.page + 1 >= totalPages} onClick={() => void workflow.refreshHistory(state.page + 1)}>Next requests</button></div>
        </nav>
      </>}
    {state.request && <div className="mt-5 border-t border-[#E7E2D8] pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Request #{state.request.requestId}</h3><button type="button" className={miningButton} disabled={state.runsLoading || state.pending} onClick={() => void workflow.selectRequest(state.request!.requestId)}>Refresh runs</button></div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm"><span>Request status <MiningStatusBadge kind="request" status={state.request.status} /></span><span>Comparison status <MiningStatusBadge kind="comparison" status={state.request.comparisonStatus} /></span></div>
      <p className="mt-3 text-sm text-[#6D7974]">Snapshot #{state.request.snapshotId} · {state.request.snapshot.rangeStart} to {state.request.snapshot.rangeEnd}</p>
      <p className="mt-2 text-xs text-[#6D7974]">A completed run can be used even when the request comparison failed.</p>
      {state.runsLoading ? <p role="status" className="mt-4 text-sm text-[#6D7974]">Loading algorithm runs...</p> : state.runsError ?
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{state.runsError}</p> : <>
          {!state.runs.some(run => run.status === 'COMPLETED') && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No completed runs are available for this request. Choose another request or refresh runs later.</p>}
          <fieldset className="mt-4 grid gap-3 sm:grid-cols-2" disabled={state.pending}>
            <legend className="mb-3 text-sm font-semibold">Algorithm runs</legend>
            {state.runs.map(run => <label key={run.runId} className={`flex min-w-0 items-start gap-3 rounded-xl border p-4 ${state.selectedRunId === run.runId ? 'border-[#356B54] bg-[#EDF5F0]' : 'border-[#E7E2D8]'} ${run.status === 'COMPLETED' && canGenerate ? 'cursor-pointer' : 'text-[#6D7974]'}`}>
              {canGenerate && <input type="radio" name="f06-run" aria-label={`Select run #${run.runId}`} checked={state.selectedRunId === run.runId} disabled={run.status !== 'COMPLETED'} onChange={() => workflow.selectRun(run.runId)} className="mt-1 h-4 w-4 shrink-0 accent-[#356B54]" />}
              <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-[#191C1B]">Run #{run.runId} · {algorithmName(run.algorithm)}</span><MiningStatusBadge kind="run" status={run.status} /></span>
                <span className="mt-2 block text-sm">Snapshot #{run.snapshotId} · Attempt {run.attemptNo}</span>
                <span className="mt-1 block text-xs">Patterns: {run.patternCount === null ? 'Not recorded' : run.patternCount}</span>
                <span className="mt-1 block text-xs">Completed: {miningDate(run.completedAt)}</span>
                {canGenerate && run.status !== 'COMPLETED' && <span className="mt-2 block text-xs">Only completed runs can be selected.</span>}
              </span>
            </label>)}
          </fieldset>
        </>}
    </div>}
  </section>;
}
