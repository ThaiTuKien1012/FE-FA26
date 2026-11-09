import { useEffect, useState, useSyncExternalStore } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { miningButton, miningInput, miningPrimaryButton } from '../../f05/f05.display';
import { parseMiningId } from '../../f05/f05.numbers';
import { RecommendationBrowser } from '../f06.browse';
import type { BrowseFilters, RecommendationBrowseState } from '../f06.browse';
import { REC_TYPES, REVIEW_STATUSES } from '../f06.validation';
import { F06RankedSource } from './F06RankedSource';
import { F06RecommendationTable } from './F06RecommendationTable';
import { F06RecommendationDetails } from './F06RecommendationDetails';
import { recommendationLabel } from './F06ReadShared';

export function F06DashboardContent({ state, workflow }: { state: RecommendationBrowseState; workflow: RecommendationBrowser }) {
  const [snapshot, setSnapshot] = useState('');
  const [type, setType] = useState<BrowseFilters['type'] | ''>('');
  const [reviewStatus, setReviewStatus] = useState<BrowseFilters['reviewStatus'] | ''>('');
  const [pageSize, setPageSize] = useState('20');
  const [inputError, setInputError] = useState('');
  useEffect(() => {
    setSnapshot(state.filters.snapshotId === undefined ? '' : String(state.filters.snapshotId));
    setType(state.filters.type ?? ''); setReviewStatus(state.filters.reviewStatus ?? '');
    setPageSize(String(state.filters.pageSize ?? 20)); setInputError('');
  }, [state.filters]);
  const compact = state.role === 'Store Admin';
  const ranked = !compact && state.mode === 'ranked';
  const data = state.list;
  if (state.role !== 'Merchandiser' && state.role !== 'Store Admin') return <p role="alert" className="text-sm text-red-800">This role cannot access recommendations.</p>;
  return <section aria-labelledby="f06-dashboard-title" className="min-w-0 rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="f06-dashboard-title" className="text-xl font-semibold">{compact ? 'Recommendations' : ranked ? 'Suggestions from this mining run' : 'All Recommendations'}</h2>{!compact && <><p className="mt-2 max-w-2xl text-sm leading-6 text-[#6D7974]">Explore product suggestions and check whether they can be used.</p><p className="mt-1 max-w-2xl text-xs leading-5 text-[#6D7974]">{ranked ? 'Ranked by Mining Run shows system priorities within one run. Rank can change as stock changes.' : 'All Recommendations shows the latest saved suggestions first. Utility scores from different snapshots are not a global ranking.'}</p></>}</div>
      <button type="button" className={miningButton} disabled={state.loading || ranked && state.miningRunId === null} onClick={() => void workflow.refresh(compact)}><RefreshCw aria-hidden="true" className="mr-2 inline h-4 w-4" />Refresh</button></div>
    {!compact && <div role="group" aria-label="Recommendation ordering" className="mt-5 flex flex-wrap gap-2"><button type="button" aria-pressed={!ranked} className={`${miningButton} aria-pressed:border-[#356B54] aria-pressed:bg-[#EDF5F0]`} onClick={() => workflow.setMode('history')}>All Recommendations</button><button type="button" aria-pressed={ranked} className={`${miningButton} aria-pressed:border-[#356B54] aria-pressed:bg-[#EDF5F0]`} onClick={() => workflow.setMode('ranked')}>Ranked by Mining Run</button></div>}
    {!compact && <div className="mt-5 rounded-xl bg-[#EDF5F0] p-4 text-sm leading-6 text-[#1E3A2F]"><strong>{compact ? 'Ready to use means approved and currently eligible.' : 'Ready to use = approved and still usable.'}</strong>{!compact && <p>A review decision and stock status are separate. An approved suggestion may no longer be usable if its products or stock have changed.</p>}</div>}
    {ranked && <F06RankedSource state={state} workflow={workflow} />}
    <form aria-label="Recommendation filters" className={compact ? 'mt-4 border-y border-[#E7E2D8] py-4' : 'mt-5 rounded-xl border border-[#E7E2D8] p-4'} onSubmit={event => {
      event.preventDefault();
      try {
        const snapshotId = !compact && snapshot.trim() ? parseMiningId(snapshot.trim()) : undefined;
        if (snapshotId !== undefined && snapshotId > 2147483647) throw new Error('Enter a snapshot number from 1 to 2147483647.');
        setInputError('');
        void workflow.applyFilters({ snapshotId, type: type || undefined, reviewStatus: reviewStatus || undefined, pageSize: compact ? 20 : Number(pageSize) });
      } catch (error) { setInputError(error instanceof Error ? error.message : 'Check the filters.'); }
    }}>
      <div className={compact ? 'grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]' : 'grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-4'}>
        {!compact && <label className="text-xs font-semibold" htmlFor="f06-filter-snapshot">Snapshot<input id="f06-filter-snapshot" inputMode="numeric" value={snapshot} onChange={event => setSnapshot(event.target.value)} placeholder="All snapshots" className={miningInput + (compact ? ' h-10' : '')} /></label>}
        <label className="text-xs font-semibold" htmlFor="f06-filter-type">Recommendation type<select id="f06-filter-type" value={type} onChange={event => setType(event.target.value as typeof type)} className={miningInput + (compact ? ' h-10' : '')}><option value="">All types</option>{REC_TYPES.map(option => <option key={option} value={option}>{recommendationLabel(option)}</option>)}</select></label>
        <label className="text-xs font-semibold" htmlFor="f06-filter-review">Review status<select id="f06-filter-review" value={reviewStatus} onChange={event => setReviewStatus(event.target.value as typeof reviewStatus)} className={miningInput + (compact ? ' h-10' : '')}><option value="">All review statuses</option>{REVIEW_STATUSES.map(option => <option key={option} value={option}>{recommendationLabel(option)}</option>)}</select></label>
        {!compact && <label className="text-xs font-semibold" htmlFor="f06-filter-size">Items per page<select id="f06-filter-size" value={pageSize} onChange={event => setPageSize(event.target.value)} className={miningInput + (compact ? ' h-10' : '')}>{[10, 20, 50, 100].map(size => <option key={size}>{size}</option>)}</select></label>}
        {compact && <div className="flex gap-2 sm:col-span-2 xl:col-span-1"><button type="submit" className={miningPrimaryButton + ' h-10 min-w-28 flex-1 justify-center'}>Apply Filters</button><button type="button" className={miningButton + ' h-10 min-w-28 flex-1 justify-center'} onClick={() => void workflow.applyFilters({ pageSize: 20 })}>Reset Filters</button></div>}
      </div>
      {!compact && <div className="mt-4 flex flex-wrap gap-2"><button type="submit" className={miningPrimaryButton}>Apply Filters</button><button type="button" className={miningButton} onClick={() => void workflow.applyFilters({ pageSize: 20 })}>Reset Filters</button></div>}
      {inputError && <p role="alert" className="mt-3 text-sm text-red-800">{inputError}</p>}
    </form>
    {state.loading ? <p role="status" className="mt-6 flex items-center gap-2 text-sm text-[#6D7974]"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading recommendations...</p> : state.error ? <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"><p className="whitespace-pre-wrap break-words">{state.error}</p><p className="mt-2">Adjust filters or refresh to try again manually.</p></div> : ranked && state.miningRunId === null ?
      <p className="mt-5 rounded-xl bg-[#FAF8F5] p-5 text-sm text-[#6D7974]">Select a completed mining run to view its ranked recommendations.</p> : data && <>
        <div className="mt-5 flex flex-wrap justify-between gap-2 text-xs text-[#6D7974]"><span>{data.totalElements} matching recommendations{ranked && ` · Run #${state.miningRunId}`}</span><span>{data.ordering === 'CREATED_DESC' ? 'All recommendations · Newest first' : 'Selected run · System ranking'}</span></div>
        {!data.items.length ? <p className="mt-4 rounded-xl bg-[#FAF8F5] p-5 text-sm text-[#6D7974]">No recommendations match these filters.</p> : <><F06RecommendationTable compact={compact} data={data} names={compact ? { ...state.listNames, ...state.names } : state.names} onOpen={id => void workflow.openDetail(id)} /><p className="mt-3 text-xs leading-5 text-[#6D7974]">{compact ? 'Utility Score is not revenue. Open Details for evidence and the current availability check.' : 'N/A means not available or not applicable. Utility Score is not revenue. Open details for the full explanation and the latest availability check.'}</p></>}
        <nav aria-label="Recommendation pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6D7974]"><span>Page {data.page + 1} of {Math.max(1, Math.ceil(data.totalElements / data.pageSize))}</span><div className="flex gap-2"><button type="button" className={miningButton} disabled={data.page === 0} onClick={() => void workflow.setPage(data.page - 1)}>Previous recommendations</button><button type="button" className={miningButton} disabled={(data.page + 1) * data.pageSize >= data.totalElements} onClick={() => void workflow.setPage(data.page + 1)}>Next recommendations</button></div></nav>
      </>}
    {state.detailId !== null && <F06RecommendationDetails key={state.detailId} state={state} workflow={workflow} />}
  </section>;
}

export function F06DashboardView() {
  const [workflow] = useState(() => new RecommendationBrowser());
  const state = useSyncExternalStore(workflow.subscribe, workflow.getSnapshot, workflow.getSnapshot);
  useEffect(() => { workflow.start(); return workflow.stop; }, [workflow]);
  return <F06DashboardContent state={state} workflow={workflow} />;
}
