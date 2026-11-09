import { algorithmName, miningButton, miningInput } from '../../f05/f05.display';
import type { RecommendationBrowseState, RecommendationBrowser } from '../f06.browse';
import { recommendationLabel } from './F06ReadShared';

export function F06RankedSource({ state, workflow }: { state: RecommendationBrowseState; workflow: RecommendationBrowser }) {
  const requests = state.requests;
  return <section aria-labelledby="f06-ranked-source-title" className="mt-5 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="f06-ranked-source-title" className="font-semibold">Choose the analysis to explore</h3><button type="button" className={miningButton} disabled={state.requestsLoading} onClick={() => void workflow.loadRequests()}>Refresh source requests</button></div>
    <p className="mt-2 text-xs leading-5 text-[#6D7974]">Each mining run analyses saved shopping data. Choose a completed run to see its suggestions in the system’s priority order. A failed algorithm comparison does not block a completed run.</p>
    {state.requestsLoading ? <p role="status" className="mt-4 text-sm text-[#6D7974]">Loading source requests...</p> : state.requestsError ? <p role="alert" className="mt-4 text-sm text-red-800">{state.requestsError}</p> : requests && <>
      {!requests.items.length ? <p className="mt-4 text-sm text-[#6D7974]">No source requests are available for your Store.</p> : <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="f06-ranked-request" className="text-xs font-semibold">Analysis request</label><select id="f06-ranked-request" className={miningInput} value={state.request?.requestId ?? ''} onChange={event => void workflow.selectRequest(Number(event.target.value))}><option value="" disabled>Select a request</option>{requests.items.map(request => <option key={request.requestId} value={request.requestId}>Request #{request.requestId} · Snapshot #{request.snapshotId} · Request: {recommendationLabel(request.status)} / Comparison: {recommendationLabel(request.comparisonStatus)}</option>)}</select></div>
        <div><label htmlFor="f06-ranked-run" className="text-xs font-semibold">Completed mining run</label><select id="f06-ranked-run" className={miningInput} disabled={state.runsLoading || !state.runs.some(run => run.status === 'COMPLETED')} value={state.miningRunId ?? ''} onChange={event => void workflow.selectRun(Number(event.target.value))}><option value="" disabled>Select a completed run</option>{state.runs.map(run => <option key={run.runId} value={run.runId} disabled={run.status !== 'COMPLETED'}>Run #{run.runId} · {algorithmName(run.algorithm)} · Snapshot #{run.snapshotId} · {recommendationLabel(run.status)}</option>)}</select></div>
      </div>}
      <nav aria-label="Ranked source request pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#6D7974]"><span>Page {requests.page + 1} · {requests.totalElements} requests</span><div className="flex gap-2"><button type="button" className={miningButton} disabled={requests.page === 0} onClick={() => void workflow.loadRequests(requests.page - 1)}>Previous sources</button><button type="button" className={miningButton} disabled={(requests.page + 1) * requests.pageSize >= requests.totalElements} onClick={() => void workflow.loadRequests(requests.page + 1)}>Next sources</button></div></nav>
    </>}
    {state.runsLoading && <p role="status" className="mt-3 text-sm text-[#6D7974]">Loading source runs...</p>}
    {state.runsError && <div role="alert" className="mt-3 text-sm text-red-800"><p>{state.runsError}</p><button type="button" className={`${miningButton} mt-2`} onClick={() => void workflow.selectRequest(state.request!.requestId)}>Retry source runs</button></div>}
    {state.request && !state.runsLoading && !state.runsError && !state.runs.some(run => run.status === 'COMPLETED') && <p className="mt-3 text-sm text-amber-900">No completed runs are available for this request.</p>}
  </section>;
}
