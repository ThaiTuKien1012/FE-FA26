import { StoreAnalysisList } from './StoreAnalysisList';
import { AnalysisPages } from './AnalysisPages';
import { analysisErrorMessage } from '../f05.presentation';
import { useCallback, useEffect, useState } from 'react';
import { History, Loader2, RefreshCw } from 'lucide-react';
import { authService } from '../../../services/authService';
import { F05ApiError } from '../f05.api';
import { storeMiningReader } from '../f05.reader';
import type { MiningReader } from '../f05.reader';
import { miningButton, miningErrorMessage } from '../f05.display';
import type { Page, RequestView } from '../f05.types';
import { RequestDetails } from './RequestDetails';
import { SystemAnalysisList } from './SystemAnalysisList';

interface Props {
  compact?: boolean;
  reader?: MiningReader;
  onOpenBenchmark?: (requestId:number,runId:number)=>void;
  benchmarkPicker?: boolean;
  requestId: number | null;
  selectionError: string;
  onSelect: (requestId: number | null) => void;
}

export function MiningHistoryView({ requestId, selectionError, onSelect, reader=storeMiningReader, onOpenBenchmark, benchmarkPicker=false, compact=false }: Props) {
  const system=reader.kind==='system';
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [accessError, setAccessError] = useState('');
  const [result, setResult] = useState<{ page: number; revision: number; token: string | null; data?: Page<RequestView>; error?: string } | null>(null);
  const token = (authService.getSessionId() || authService.getToken());
  const current = result?.page === page && result.revision === revision && result.token === token ? result : null;

  useEffect(() => {
    const controller = new AbortController();
    void reader.listRequests(page, 20, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      if ((authService.getSessionId() || authService.getToken()) !== token) throw new F05ApiError(401, 'The active session changed. Refresh history for the current session.');
      const lastPage = Math.max(0, Math.ceil(data.totalElements / data.pageSize) - 1);
      if (page > lastPage) { setPage(lastPage); return; }
      setResult({ page, revision, token, data });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ page, revision, token, error: reader.kind==='store'?analysisErrorMessage(error):miningErrorMessage(error) });
    });
    return () => controller.abort();
  }, [page, revision, token, reader]);

  const onUpdated = useCallback((request: RequestView) => {
    // Update only the matching history row from a real details response. Do not poll the list.
    setResult(previous => previous?.data ? { ...previous, data: { ...previous.data, items: previous.data.items.map(item => item.requestId === request.requestId ? request : item) } } : previous);
  }, []);
  const onReadError = useCallback((error: unknown) => {
    if (error instanceof F05ApiError && (error.status === 401 || error.status === 403)) setAccessError(reader.kind==='store'?analysisErrorMessage(error):miningErrorMessage(error));
  }, []);
  const refresh = () => { setAccessError(''); setRevision(value => value + 1); };
  const data = accessError ? undefined : current?.data;
  const error = accessError || current?.error;
  const loading = !current && !accessError;
  const totalPages = data ? Math.max(1, Math.ceil(data.totalElements / data.pageSize)) : 1;

  return <div className="space-y-5">
    <section aria-labelledby="f05-history-title" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 id="f05-history-title" className="flex items-center gap-2 text-xl font-semibold"><History aria-hidden="true" className="h-5 w-5 text-[#356B54]" />{system?'Analyses':'Analysis History'}</h2><p className="mt-2 text-sm text-[#6D7974]">{system?'Analyses for the selected store, newest first.':'Analyses for your store, newest first.'}</p></div>
        <button type="button" disabled={loading} onClick={refresh} className={miningButton}><RefreshCw aria-hidden="true" className="mr-2 inline h-4 w-4" />Refresh history</button>
      </div>
      {loading ? <p role="status" className="mt-6 flex items-center gap-2 text-sm text-[#6D7974]"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading mining history...</p> : error ?
        <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{error}</p><p className="mt-2">Use Refresh history to try again manually.</p></div> : data && <>
          {data.items.length === 0 ? <p className="mt-5 rounded-xl bg-[#FAF8F5] p-5 text-sm text-[#6D7974]">{system?'No analyses have been recorded for this store yet.':'No analyses have been recorded for this store yet.'}</p> :
            <div className={system ? "mt-5 overflow-hidden rounded-xl border border-[#E7E2D8]" : "mt-5"}>{system ? <SystemAnalysisList items={data.items} selectedId={requestId} onSelect={onSelect} /> : <StoreAnalysisList items={data.items} selectedId={requestId} onSelect={onSelect} />}</div>}
          {system&&data.items.length>0&&<nav aria-label="Mining history pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6D7974]">
            <span>Page {data.page + 1} of {totalPages} · {data.totalElements} {system?'analyses':'requests'}</span><div className="flex gap-2"><button type="button" disabled={page === 0} className={miningButton} onClick={() => setPage(page - 1)}>{system?'Previous analyses':'Previous requests'}</button><button type="button" disabled={page + 1 >= totalPages} className={miningButton} onClick={() => setPage(page + 1)}>{system?'Next analyses':'Next requests'}</button></div>
          </nav>}
          {!system&&<AnalysisPages page={data} label="Analysis History" onPage={setPage} />}
        </>}
    </section>
    {selectionError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{selectionError}</div>}
    {!benchmarkPicker && requestId !== null && !error && <>
      {system && !compact && <div className="flex justify-end"><button type="button" className={miningButton} onClick={() => onSelect(null)}>{system?'Close analysis details':'Close request details'}</button></div>}
      <RequestDetails onClose={!system ? () => onSelect(null) : undefined} compact={compact||!system} key={`${reader.scopeKey}:${requestId}`} reader={reader} requestId={requestId} onUpdated={onUpdated} onReadError={onReadError} onOpenBenchmark={onOpenBenchmark} />
    </>}
  </div>;
}
