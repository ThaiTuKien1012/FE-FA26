import { storeAdminCopy as copy, storeAdminMessage } from '../../../utils/storeAdminCopy';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { miningButton, miningInput, miningPrimaryButton } from '../../f05/f05.display';
import { parseMiningId } from '../../f05/f05.numbers';
import { RecommendationBrowser } from '../f06.browse';
import type { BrowseFilters, RecommendationBrowseState } from '../f06.browse';
import { REC_TYPES, REVIEW_STATUSES } from '../f06.validation';
import { F06Pages } from './F06Pages';
import { F06RankedSource } from './F06RankedSource';
import { F06RecommendationTable } from './F06RecommendationTable';
import { F06RecommendationDetails } from './F06RecommendationDetails';
import { recommendationLabel } from './F06ReadShared';
import { F06ExpiryPanel, F06RulesPanel } from './F06Utilities';

export function F06DashboardContent({ state, workflow }: { state: RecommendationBrowseState; workflow: RecommendationBrowser }) {
  const [snapshot, setSnapshot] = useState('');
  const [type, setType] = useState<BrowseFilters['type'] | ''>('');
  const [reviewStatus, setReviewStatus] = useState<BrowseFilters['reviewStatus'] | ''>('');
  const [pageSize, setPageSize] = useState('20');
  const [inputError, setInputError] = useState('');
  const [grouped,setGrouped]=useState(true);
  const [utilityPanel, setUtilityPanel] = useState<'rules' | 'expiry' | null>(null);
  useEffect(() => {
    setSnapshot(state.filters.snapshotId === undefined ? '' : String(state.filters.snapshotId));
    setType(state.filters.type ?? ''); setReviewStatus(state.filters.reviewStatus ?? '');
    setPageSize(String(state.filters.pageSize ?? 20)); setInputError('');
  }, [state.filters]);
  const compact = state.role === 'Store Admin';
  const ranked = state.mode === 'ranked';
  const data = state.list;
  if (state.role !== 'Merchandiser' && state.role !== 'Store Admin') return <p role="alert" className="text-sm text-red-800">This role cannot access recommendations.</p>;
  return <section aria-labelledby="f06-dashboard-title" className="min-w-0 rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="f06-dashboard-title" className="text-xl font-semibold">{ranked ? 'Suggestions from this analysis' : 'Recommendation Library'}</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-[#6D7974]">{ranked?'Recommendations from this analysis are prioritized using product availability and historical analysis results.':'Browse previously generated recommendations, newest first.'}</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" className={miningButton} onClick={() => setUtilityPanel('rules')}>{'Store Rules'}</button><button type="button" className={miningButton} onClick={() => setUtilityPanel('expiry')}>Expiry Alerts</button><button type="button" className={miningButton} disabled={state.loading || ranked && state.miningRunId === null} onClick={() => void workflow.refresh(true)}><RefreshCw aria-hidden="true" className="mr-2 inline h-4 w-4" />Refresh</button></div></div>
    <div className="mt-4 flex flex-wrap items-end justify-between gap-3"><label className="text-xs font-semibold" htmlFor="f06-analysis-scope">Analysis scope<select id="f06-analysis-scope" className={miningInput} value={ranked?'ranked':'history'} onChange={event=>workflow.setMode(event.target.value as 'ranked'|'history')}><option value="history">All saved suggestions</option><option value="ranked">From a selected analysis</option></select></label><div role="group" aria-label="Library view" className="flex flex-wrap gap-2"><button type="button" aria-pressed={grouped} className={miningButton+' aria-pressed:border-[#356B54] aria-pressed:bg-[#EDF5F0]'} onClick={()=>setGrouped(true)}>Product groups</button><button type="button" aria-pressed={!grouped} className={miningButton+' aria-pressed:border-[#356B54] aria-pressed:bg-[#EDF5F0]'} onClick={()=>setGrouped(false)}>All suggestions</button></div></div>
    {!compact&&<p className="mt-3 text-xs text-[#6D7974]">Approved suggestions must also be currently eligible. Utility scores from different snapshots are not a global ranking.</p>}
    {ranked && <F06RankedSource state={state} workflow={workflow} />}
    <form aria-label="Recommendation filters" className={compact ? 'mt-4 border-y border-[#E7E2D8] py-4' : 'mt-5 rounded-xl border border-[#E7E2D8] p-4'} onSubmit={event => {
      event.preventDefault();
      try {
        const snapshotId = snapshot.trim() ? parseMiningId(snapshot.trim()) : undefined;
        if (snapshotId !== undefined && snapshotId > 2147483647) throw new Error('Enter a snapshot number from 1 to 2147483647.');
        setInputError('');
        void workflow.applyFilters({ snapshotId, type: type || undefined, reviewStatus: reviewStatus || undefined, pageSize: Number(pageSize) });
      } catch (error) { setInputError(error instanceof Error ? error.message : 'Check the filters.'); }
    }}>
      <div className={'grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4'}>
        {<label className="text-xs font-semibold" htmlFor="f06-filter-snapshot">Snapshot<input id="f06-filter-snapshot" inputMode="numeric" value={snapshot} onChange={event => setSnapshot(event.target.value)} placeholder="All snapshots" className={miningInput + (compact ? ' h-10' : '')} /></label>}
        <label className="text-xs font-semibold" htmlFor="f06-filter-type">Recommendation type<select id="f06-filter-type" value={type} onChange={event => setType(event.target.value as typeof type)} className={miningInput + (compact ? ' h-10' : '')}><option value="">All types</option>{REC_TYPES.map(option => <option key={option} value={option}>{recommendationLabel(option)}</option>)}</select></label>
        <label className="text-xs font-semibold" htmlFor="f06-filter-review">Review status<select id="f06-filter-review" value={reviewStatus} onChange={event => setReviewStatus(event.target.value as typeof reviewStatus)} className={miningInput + (compact ? ' h-10' : '')}><option value="">All review statuses</option>{REVIEW_STATUSES.map(option => <option key={option} value={option}>{recommendationLabel(option)}</option>)}</select></label>
        {<label className="text-xs font-semibold" htmlFor="f06-filter-size">Items per page<select id="f06-filter-size" value={pageSize} onChange={event => setPageSize(event.target.value)} className={miningInput + (compact ? ' h-10' : '')}>{[10, 20, 50, 100].map(size => <option key={size}>{size}</option>)}</select></label>}

      </div>
      {<div className="mt-4 flex flex-wrap gap-2"><button type="submit" className={miningPrimaryButton}>Apply Filters</button><button type="button" className={miningButton} onClick={() => void workflow.applyFilters({ pageSize: 20 })}>Reset Filters</button></div>}
      {inputError && <p role="alert" className="mt-3 text-sm text-red-800">{inputError}</p>}
    </form>
    {state.loading ? <p role="status" className="mt-6 flex items-center gap-2 text-sm text-[#6D7974]"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading recommendations...</p> : state.error ? <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"><p className="whitespace-pre-wrap break-words">{storeAdminMessage(state.error)}</p><p className="mt-2">Adjust filters or refresh to try again manually.</p></div> : ranked && state.miningRunId === null ?
      <p className="mt-5 rounded-xl bg-[#FAF8F5] p-5 text-sm text-[#6D7974]">{copy('Select a completed mining run to view its ranked recommendations.','Choose a completed analysis to view its recommendations.')}</p> : data && <>
        <div className="mt-5 flex flex-wrap justify-between gap-2 text-xs text-[#6D7974]"><span>{data.totalElements} matching recommendations{ranked && ` · Run #${state.miningRunId}`}</span><span>{data.ordering === 'CREATED_DESC' ? 'All recommendations · Newest first' : 'Selected run · System ranking'}</span></div>
        {grouped&&data.items.length>0&&<p className="mt-3 text-xs leading-5 text-[#6D7974]">{copy('Groups combine adjacent suggestions with the same saved context on this page only. Other types or directions may appear elsewhere. All suggestions shows every candidate in server order.','Related suggestions are grouped on this page. Choose All suggestions to view them separately.')}</p>}
        {!data.items.length ? <p className="mt-4 rounded-xl bg-[#FAF8F5] p-5 text-sm text-[#6D7974]">No recommendations match these filters.</p> : <><F06RecommendationTable compact={compact} grouped={grouped} data={data} images={state.images} names={{ ...state.listNames, ...state.names }} onOpen={id => void workflow.openDetail(id)} /><p className="mt-3 text-xs leading-5 text-[#6D7974]">{compact ? 'Historical utility is an analysis score, not revenue. View Details shows past sales and current availability.' : 'N/A means not available or not applicable. Historical utility is not revenue. Open details for the full explanation and the latest availability check.'}</p></>}
        <F06Pages data={data} label="recommendations" onPage={page=>void workflow.setPage(page)} />      </>}
    {state.detailId !== null && <F06RecommendationDetails key={state.detailId} state={state} workflow={workflow} />}
    {utilityPanel === 'rules' && <F06RulesPanel onClose={() => setUtilityPanel(null)} />}
    {utilityPanel === 'expiry' && <F06ExpiryPanel onClose={() => setUtilityPanel(null)} />}
  </section>;
}

export function F06DashboardView({ refreshRevision = 0, analysisSelection }: { refreshRevision?: number;analysisSelection?:{runId:number;revision:number} }) {
  const [workflow] = useState(() => new RecommendationBrowser());
  const state = useSyncExternalStore(workflow.subscribe, workflow.getSnapshot, workflow.getSnapshot);
  useEffect(() => { workflow.start(); return workflow.stop; }, [workflow]);
  const refreshed = useRef(refreshRevision);
  useEffect(()=>{if(analysisSelection)void workflow.showGeneratedResults(analysisSelection.runId);},[analysisSelection,workflow]);
  useEffect(()=>{if(refreshRevision!==refreshed.current){refreshed.current=refreshRevision;void workflow.refresh(true,true);}},[refreshRevision,workflow]);
  return <F06DashboardContent state={state} workflow={workflow} />;
}
