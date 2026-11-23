import { storeAdminCopy as copy, storeAdminMessage } from '../../../utils/storeAdminCopy';
import { algorithmName, miningButton, miningInput } from '../../f05/f05.display';
import type { RecommendationBrowseState, RecommendationBrowser } from '../f06.browse';
import { formatDate, formatDateRange } from '../../../utils/dateTime';
import { F06Pages } from './F06Pages';
import { recommendationLabel } from './F06ReadShared';

export function F06RankedSource({ state, workflow }: { state: RecommendationBrowseState; workflow: RecommendationBrowser }) {
  const requests = state.requests;
  return <section aria-labelledby="f06-ranked-source-title" className="mt-5 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="f06-ranked-source-title" className="font-semibold">Choose the analysis to explore</h3><button type="button" className={miningButton} disabled={state.requestsLoading} onClick={() => void workflow.loadRequests()}>{copy('Refresh source requests','Refresh Analyses')}</button></div>
    <p className="mt-2 text-xs leading-5 text-[#6D7974]">{copy('Choose completed results from an analysis to explore its saved suggestions. Older analyses remain available. Selecting results does not run mining or generate suggestions.','Choose completed analysis results to view saved suggestions; this does not start a new analysis.')}</p>
    {state.requestsLoading ? <p role="status" className="mt-4 text-sm text-[#6D7974]">{copy('Loading source requests...','Loading analyses...')}</p> : state.requestsError ? <p role="alert" className="mt-4 text-sm text-red-800">{storeAdminMessage(state.requestsError)}</p> : requests && <>
      {!requests.items.length ? <p className="mt-4 text-sm text-[#6D7974]">No source requests are available for your Store.</p> : <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="f06-ranked-request" className="text-xs font-semibold">Analysis</label><select id="f06-ranked-request" className={miningInput} value={state.request?.requestId ?? ''} onChange={event => void workflow.selectRequest(Number(event.target.value))}><option value="" disabled>Select an analysis</option>{requests.items.map(request => <option key={request.requestId} value={request.requestId}>{formatDate(request.snapshot.asOfDate)} · {formatDateRange(request.snapshot.rangeStart,request.snapshot.rangeEnd)} · Snapshot #{request.snapshotId} / Analysis #{request.requestId}</option>)}</select></div>
        <div><label htmlFor="f06-ranked-run" className="text-xs font-semibold">{copy('Completed mining run','Completed analysis results')}</label><select id="f06-ranked-run" className={miningInput} disabled={state.runsLoading || !state.runs.some(run => run.status === 'COMPLETED')} value={state.miningRunId ?? ''} onChange={event => void workflow.selectRun(Number(event.target.value))}><option value="" disabled>Select a completed run</option>{state.runs.map(run => <option key={run.runId} value={run.runId} disabled={run.status !== 'COMPLETED'}>Run #{run.runId} · {algorithmName(run.algorithm)} · Snapshot #{run.snapshotId} · {recommendationLabel(run.status)}</option>)}</select></div>
      </div>}
      <F06Pages data={requests} label="sources" busy={state.requestsLoading} onPage={page=>void workflow.loadRequests(page)} />    </>}
    {state.runsLoading && <p role="status" className="mt-3 text-sm text-[#6D7974]">{copy('Loading source runs...','Loading analysis results...')}</p>}
    {state.runsError && <div role="alert" className="mt-3 text-sm text-red-800"><p>{storeAdminMessage(state.runsError)}</p><button type="button" className={`${miningButton} mt-2`} onClick={() => void workflow.selectRequest(state.request!.requestId)}>Retry source runs</button></div>}
    {state.request && !state.runsLoading && !state.runsError && !state.runs.some(run => run.status === 'COMPLETED') && <p className="mt-3 text-sm text-amber-900">No completed runs are available for this request.</p>}
  </section>;
}
