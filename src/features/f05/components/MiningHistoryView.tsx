import { useCallback, useEffect, useState } from 'react';
import { History, Loader2, RefreshCw } from 'lucide-react';
import { authService } from '../../../services/authService';
import { f05Api, F05ApiError } from '../f05.api';
import { algorithmName, miningButton, miningDate, miningErrorMessage } from '../f05.display';
import type { Page, RequestView } from '../f05.types';
import { MiningStatusBadge } from './MiningStatusBadge';
import { RequestDetails } from './RequestDetails';

interface Props {
  requestId: number | null;
  selectionError: string;
  onSelect: (requestId: number | null) => void;
}

export function MiningHistoryView({ requestId, selectionError, onSelect }: Props) {
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [accessError, setAccessError] = useState('');
  const [result, setResult] = useState<{ page: number; revision: number; token: string | null; data?: Page<RequestView>; error?: string } | null>(null);
  const token = authService.getToken();
  const current = result?.page === page && result.revision === revision && result.token === token ? result : null;

  useEffect(() => {
    const controller = new AbortController();
    void f05Api.listRequests(page, 20, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      if (authService.getToken() !== token) throw new F05ApiError(401, 'The active session changed. Refresh history for the current session.');
      const lastPage = Math.max(0, Math.ceil(data.totalElements / data.pageSize) - 1);
      if (page > lastPage) { setPage(lastPage); return; }
      setResult({ page, revision, token, data });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ page, revision, token, error: miningErrorMessage(error) });
    });
    return () => controller.abort();
  }, [page, revision, token]);

  const onUpdated = useCallback((request: RequestView) => {
    // Update only the matching history row from a real details response. Do not poll the list.
    setResult(previous => previous?.data ? { ...previous, data: { ...previous.data, items: previous.data.items.map(item => item.requestId === request.requestId ? request : item) } } : previous);
  }, []);
  const onReadError = useCallback((error: unknown) => {
    if (error instanceof F05ApiError && (error.status === 401 || error.status === 403)) setAccessError(miningErrorMessage(error));
  }, []);
  const refresh = () => { setAccessError(''); setRevision(value => value + 1); };
  const data = accessError ? undefined : current?.data;
  const error = accessError || current?.error;
  const loading = !current && !accessError;
  const totalPages = data ? Math.max(1, Math.ceil(data.totalElements / data.pageSize)) : 1;

  return <div className="space-y-5">
    <section aria-labelledby="f05-history-title" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 id="f05-history-title" className="flex items-center gap-2 text-xl font-semibold"><History aria-hidden="true" className="h-5 w-5 text-[#356B54]" />Mining request history</h2><p className="mt-2 text-sm text-[#6D7974]">Requests for your current store, newest first. Dates are shown in your local time.</p></div>
        <button type="button" disabled={loading} onClick={refresh} className={miningButton}><RefreshCw aria-hidden="true" className="mr-2 inline h-4 w-4" />Refresh history</button>
      </div>
      {loading ? <p role="status" className="mt-6 flex items-center gap-2 text-sm text-[#6D7974]"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading mining history...</p> : error ?
        <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{error}</p><p className="mt-2">Use Refresh history to try again manually.</p></div> : data && <>
          {data.items.length === 0 ? <p className="mt-5 rounded-xl bg-[#FAF8F5] p-5 text-sm text-[#6D7974]">No mining requests were returned for this store.</p> :
            <div className="mt-5 max-h-[28rem] overflow-auto rounded-xl border border-[#E7E2D8]">
              <table className="w-full text-left text-sm"><caption className="sr-only">Store mining requests</caption><thead className="sticky top-0 bg-[#FAF8F5] text-xs text-[#6D7974]"><tr>{['Request ID', 'Snapshot ID', 'Algorithms', 'Minimum utility', 'Request status', 'Comparison status', 'Created', 'Details'].map(label => <th key={label} scope="col" className="whitespace-nowrap p-3 font-semibold">{label}</th>)}</tr></thead>
                <tbody>{data.items.map(item => <tr key={item.requestId} className={`border-t border-[#E7E2D8] ${requestId === item.requestId ? 'bg-[#F3F8F4]' : ''}`}>
                  <th scope="row" className="p-3 font-semibold">#{item.requestId}</th><td className="p-3">#{item.snapshotId}</td><td className="p-3">{item.algorithms.map(algorithmName).join(', ')}</td>
                  <td className="p-3"><span className="block text-xs text-[#6D7974]">{item.minUtilMode}</span><span>{item.minUtilValue}{item.minUtilMode === 'PERCENTAGE' ? '%' : ''}</span></td>
                  <td className="p-3"><MiningStatusBadge kind="request" status={item.status} /></td><td className="p-3"><MiningStatusBadge kind="comparison" status={item.comparisonStatus} /></td>
                  <td className="whitespace-nowrap p-3"><time dateTime={item.createdAt}>{miningDate(item.createdAt)}</time></td>
                  <td className="p-3"><button type="button" className={`${miningButton} whitespace-nowrap`} aria-pressed={requestId === item.requestId} onClick={() => onSelect(item.requestId)}>View request #{item.requestId}</button></td>
                </tr>)}</tbody>
              </table>
            </div>}
          <nav aria-label="Mining history pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6D7974]">
            <span>Page {data.page + 1} of {totalPages} · {data.totalElements} requests</span><div className="flex gap-2"><button type="button" disabled={page === 0} className={miningButton} onClick={() => setPage(page - 1)}>Previous requests</button><button type="button" disabled={page + 1 >= totalPages} className={miningButton} onClick={() => setPage(page + 1)}>Next requests</button></div>
          </nav>
        </>}
    </section>
    {selectionError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{selectionError}</div>}
    {requestId !== null && !error && <>
      <div className="flex justify-end"><button type="button" className={miningButton} onClick={() => onSelect(null)}>Close request details</button></div>
      <RequestDetails key={requestId} requestId={requestId} onUpdated={onUpdated} onReadError={onReadError} />
    </>}
  </div>;
}
