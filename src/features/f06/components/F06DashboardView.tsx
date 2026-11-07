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
  const ranked = state.mode === 'ranked';
  const data = state.list;
  if (state.role !== 'Merchandiser' && state.role !== 'Store Admin') return <p role="alert" className="text-sm text-red-800">This role cannot access recommendations.</p>;
  return <section aria-labelledby="f06-dashboard-title" className="min-w-0 rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="f06-dashboard-title" className="text-xl font-semibold">{ranked ? 'Ranked recommendations' : 'Recommendation history'}</h2><p className="mt-2 text-sm text-[#6D7974]">{ranked ? 'Server ranking within the selected source run, before pagination.' : 'Newest recommendations first. Each utility value belongs to its source snapshot.'}</p></div>
      <button type="button" className={miningButton} disabled={state.loading || ranked && state.miningRunId === null} onClick={() => void workflow.refresh()}><RefreshCw aria-hidden="true" className="mr-2 inline h-4 w-4" />Refresh recommendations</button></div>
    <div role="group" aria-label="Recommendation ordering" className="mt-5 flex flex-wrap gap-2"><button type="button" aria-pressed={!ranked} className={`${miningButton} aria-pressed:border-[#356B54] aria-pressed:bg-[#EDF5F0]`} onClick={() => workflow.setMode('history')}>Recommendation history</button><button type="button" aria-pressed={ranked} className={`${miningButton} aria-pressed:border-[#356B54] aria-pressed:bg-[#EDF5F0]`} onClick={() => workflow.setMode('ranked')}>Ranked by mining run</button></div>
    {ranked && <F06RankedSource state={state} workflow={workflow} />}
    <form aria-label="Recommendation filters" className="mt-5 rounded-xl border border-[#E7E2D8] p-4" onSubmit={event => {
      event.preventDefault();
      try {
        const snapshotId = snapshot.trim() ? parseMiningId(snapshot.trim()) : undefined;
        if (snapshotId !== undefined && snapshotId > 2147483647) throw new Error('Snapshot ID must be a positive int32.');
        setInputError('');
        void workflow.applyFilters({ snapshotId, type: type || undefined, reviewStatus: reviewStatus || undefined, pageSize: Number(pageSize) });
      } catch (error) { setInputError(error instanceof Error ? error.message : 'Check the filters.'); }
    }}>
      <div className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-semibold" htmlFor="f06-filter-snapshot">Snapshot ID<input id="f06-filter-snapshot" inputMode="numeric" value={snapshot} onChange={event => setSnapshot(event.target.value)} placeholder="All snapshots" className={miningInput} /></label>
        <label className="text-xs font-semibold" htmlFor="f06-filter-type">Type<select id="f06-filter-type" value={type} onChange={event => setType(event.target.value as typeof type)} className={miningInput}><option value="">All types</option>{REC_TYPES.map(option => <option key={option}>{option}</option>)}</select></label>
        <label className="text-xs font-semibold" htmlFor="f06-filter-review">Review status<select id="f06-filter-review" value={reviewStatus} onChange={event => setReviewStatus(event.target.value as typeof reviewStatus)} className={miningInput}><option value="">All review statuses</option>{REVIEW_STATUSES.map(option => <option key={option}>{option}</option>)}</select></label>
        <label className="text-xs font-semibold" htmlFor="f06-filter-size">Page size<select id="f06-filter-size" value={pageSize} onChange={event => setPageSize(event.target.value)} className={miningInput}>{[10, 20, 50, 100].map(size => <option key={size}>{size}</option>)}</select></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2"><button type="submit" className={miningPrimaryButton}>Apply filters</button><button type="button" className={miningButton} onClick={() => void workflow.applyFilters({ pageSize: 20 })}>Clear filters</button></div>
      {inputError && <p role="alert" className="mt-3 text-sm text-red-800">{inputError}</p>}
    </form>
    {state.loading ? <p role="status" className="mt-6 flex items-center gap-2 text-sm text-[#6D7974]"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading recommendations...</p> : state.error ? <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"><p className="whitespace-pre-wrap break-words">{state.error}</p><p className="mt-2">Adjust filters or refresh to try again manually.</p></div> : ranked && state.miningRunId === null ?
      <p className="mt-5 rounded-xl bg-[#FAF8F5] p-5 text-sm text-[#6D7974]">Select a completed mining run to view its ranked recommendations.</p> : data && <>
        <div className="mt-5 flex flex-wrap justify-between gap-2 text-xs text-[#6D7974]"><span>{data.totalElements} matching recommendations{ranked && ` · Run #${state.miningRunId}`}</span><span>{data.ordering === 'CREATED_DESC' ? 'History · Newest first' : 'Ranked within source run'}</span></div>
        {!data.items.length ? <p className="mt-4 rounded-xl bg-[#FAF8F5] p-5 text-sm text-[#6D7974]">No recommendations match these filters.</p> : <><F06RecommendationTable data={data} onOpen={id => void workflow.openDetail(id)} /><p className="mt-3 text-xs text-[#6D7974]">Scroll horizontally for all columns. Open details for products, source evidence and current eligibility.</p></>}
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
