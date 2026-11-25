import { storeAdminCopy as copy, storeAdminMessage } from '../../../utils/storeAdminCopy';
import { miningDate, miningButton, miningInput } from '../../f05/f05.display';
import type { RecommendationBrowseState, RecommendationBrowser } from '../f06.browse';
import { formatDate, formatDateRange } from '../../../utils/dateTime';
import { F06Pages } from './F06Pages';
import { recommendationLabel } from './F06ReadShared';

export function F06RankedSource({ state, workflow, onSelectRun, onChooseAnalysis }: { state: RecommendationBrowseState; workflow: RecommendationBrowser;onSelectRun?:(id:number)=>void;onChooseAnalysis?:()=>void }) {
  const requests = state.requests;
  if(state.sourceLoading)return null;
  if(state.sourceRun)return <section data-selected-run={state.sourceRun.runId} data-selected-snapshot={state.sourceRun.snapshotId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] p-4" aria-label="Selected analysis"><div><h3 className="font-semibold">Selected analysis</h3><p className="mt-1 text-sm text-[#57534E]">Sales period: {state.request&&formatDateRange(state.request.snapshot.rangeStart,state.request.snapshot.rangeEnd)}</p><p className="mt-1 text-xs text-[#6D7974]">Analysis date: {state.request?formatDate(state.request.snapshot.asOfDate):'Not recorded'}</p></div><button type="button" disabled={state.reviewPending} className={miningButton} onClick={()=>onChooseAnalysis?onChooseAnalysis():void workflow.loadRequests(0)}>Change Analysis</button></section>;
  return <section aria-labelledby="f06-ranked-source-title" className="mt-5 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="f06-ranked-source-title" className="font-semibold">Choose Analysis</h3><button type="button" className={miningButton} disabled={state.requestsLoading} onClick={() => void workflow.loadRequests()}>Refresh Analyses</button></div>
    <p className="mt-2 text-xs leading-5 text-[#6D7974]">Choose completed results from a saved analysis. This does not run a new analysis or generate suggestions.</p>
    {state.requestsLoading ? <p role="status" className="mt-4 text-sm text-[#6D7974]">{copy('Loading source requests...','Loading analyses...')}</p> : state.requestsError ? <p role="alert" className="mt-4 text-sm text-red-800">{storeAdminMessage(state.requestsError)}</p> : requests && <>
      {!requests.items.length ? <p className="mt-4 text-sm text-[#6D7974]">No source requests are available for your Store.</p> : <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="f06-ranked-request" className="text-xs font-semibold">Analysis</label><select id="f06-ranked-request" className={miningInput} value={state.request?.requestId ?? ''} onChange={event => void workflow.selectRequest(Number(event.target.value))}><option value="" disabled>Select an analysis</option>{requests.items.map(request => <option key={request.requestId} value={request.requestId}>{formatDateRange(request.snapshot.rangeStart,request.snapshot.rangeEnd)} - Saved {miningDate(request.createdAt)}</option>)}</select></div>
        <div><label htmlFor="f06-ranked-run" className="text-xs font-semibold">Completed results</label><select id="f06-ranked-run" className={miningInput} disabled={state.runsLoading || !state.runs.some(run => run.status === 'COMPLETED')} value={state.miningRunId ?? ''} onChange={event => onSelectRun?onSelectRun(Number(event.target.value)):void workflow.selectRun(Number(event.target.value))}><option value="" disabled>Select completed results</option>{state.runs.map((run,index) => <option key={run.runId} value={run.runId} disabled={run.status !== 'COMPLETED'}>Result {index+1} - {recommendationLabel(run.status)}</option>)}</select></div>
      </div>}
      <F06Pages data={requests} label="sources" busy={state.requestsLoading} onPage={page=>void workflow.loadRequests(page)} />    </>}
    {state.runsLoading && <p role="status" className="mt-3 text-sm text-[#6D7974]">{copy('Loading source runs...','Loading analysis results...')}</p>}
    {state.runsError && <div role="alert" className="mt-3 text-sm text-red-800"><p>{storeAdminMessage(state.runsError)}</p>{state.request&&<button type="button" className={`${miningButton} mt-2`} onClick={() => void workflow.selectRequest(state.request!.requestId)}>Retry Results</button>}</div>}
    {state.request && !state.runsLoading && !state.runsError && !state.runs.some(run => run.status === 'COMPLETED') && <p className="mt-3 text-sm text-amber-900">No completed results are available for this analysis.</p>}
  </section>;
}
