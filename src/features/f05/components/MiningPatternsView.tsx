import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { authService } from '../../../services/authService';
import { f05Api, F05ApiError } from '../f05.api';
import { miningButton, miningErrorMessage } from '../f05.display';
import type { Page, PatternView, RunView } from '../f05.types';

interface Props { run: RunView; onReadError: (error: unknown) => void; }

export function MiningPatternsView({ run, onReadError }: Props) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [revision, setRevision] = useState(0);
  const token = authService.getToken();
  const key = `${run.runId}:${run.status}:${page}:${pageSize}:${revision}`;
  const [result, setResult] = useState<{ key: string; token: string | null; data?: Page<PatternView>; error?: string } | null>(null);
  const current = result?.key === key && result.token === token ? result : null;

  useEffect(() => {
    if (run.status !== 'COMPLETED') return;
    const controller = new AbortController();
    void f05Api.listPatterns(run.runId, page, pageSize, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      if (authService.getToken() !== token) throw new F05ApiError(401, 'The active session changed. Refresh results for the current session.');
      const lastPage = Math.max(0, Math.ceil(data.totalElements / pageSize) - 1);
      if (page > lastPage) { setPage(lastPage); return; }
      setResult({ key, token, data });
    }).catch(error => {
      if (controller.signal.aborted) return;
      setResult({ key, token, error: miningErrorMessage(error) });
      onReadError(error);
    });
    return () => controller.abort();
  }, [run.runId, run.status, page, pageSize, key, token, onReadError]);

  if (run.status !== 'COMPLETED') return <section aria-label="Mining patterns" className="mt-4 rounded-xl border border-[#E7E2D8] bg-white p-4 text-sm">
    <h4 className="font-semibold">Patterns unavailable · Run {run.status}</h4>
    <p className="mt-2 text-[#6D7974]">Patterns are shown only for COMPLETED runs. Pending, failed or timed-out output is not presented as a successful result.</p>
  </section>;
  const data = current?.data;
  const pages = data ? Math.max(1, Math.ceil(data.totalElements / pageSize)) : 1;
  return <section aria-labelledby="f05-patterns-title" className="mt-4 rounded-xl border border-[#E7E2D8] bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h4 id="f05-patterns-title" className="text-lg font-semibold">Patterns · Run #{run.runId}</h4><p className="mt-2 text-sm text-[#6D7974]">Utility is frozen weighted utility, not revenue or profit. Product IDs and row order come from the backend.</p></div>
      <button type="button" className={miningButton} disabled={!current} onClick={() => setRevision(value => value + 1)}><RefreshCw aria-hidden="true" className="mr-2 inline h-4 w-4" />Refresh patterns</button>
    </div>
    {!current ? <p role="status" className="mt-4 flex items-center gap-2 text-sm text-[#6D7974]"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading patterns...</p> : current.error ?
      <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{current.error} Use Refresh patterns to retry manually.</div> : data && <>
        {data.items.length === 0 ? <p className="mt-4 rounded-lg bg-[#FAF8F5] p-4 text-sm text-[#6D7974]">{data.totalElements === 0 ? 'This completed run returned no patterns. Zero patterns is a valid mining result.' : 'No patterns were returned on this page. Refresh to check the results.'}</p> :
          <div className="mt-4 max-h-[28rem] overflow-auto rounded-lg border border-[#E7E2D8]"><table className="w-full text-left text-sm">
            <caption className="sr-only">High utility patterns for run {run.runId}</caption><thead className="sticky top-0 bg-[#FAF8F5] text-xs text-[#6D7974]"><tr>{['Pattern ID', 'Product IDs', 'Frozen weighted utility', 'Pattern size', 'Support count'].map(label => <th scope="col" key={label} className="whitespace-nowrap p-3">{label}</th>)}</tr></thead>
            <tbody>{data.items.map(pattern => <tr key={pattern.patternId} className="border-t border-[#E7E2D8]"><th scope="row" className="p-3 font-medium">#{pattern.patternId}</th><td className="p-3">{pattern.productIds.join(', ')}</td><td className="p-3">{pattern.utility}</td><td className="p-3">{pattern.patternSize}</td><td className="p-3">{pattern.supportCount === null ? 'Not measured' : pattern.supportCount}</td></tr>)}</tbody>
          </table></div>}
        <nav aria-label="Pattern pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6D7974]">
          <p>Page {data.page + 1} of {pages} · {data.totalElements} patterns</p>
          <label className="flex items-center gap-2">Rows per page<select aria-label="Pattern rows per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(0); }} className="rounded-lg border border-[#E7E2D8] bg-white px-2 py-1.5">{[10, 20, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
          <div className="flex gap-2"><button type="button" disabled={page === 0} className={miningButton} onClick={() => setPage(page - 1)}>Previous patterns</button><button type="button" disabled={page + 1 >= pages} className={miningButton} onClick={() => setPage(page + 1)}>Next patterns</button></div>
        </nav>
        <p className="mt-3 text-xs text-[#6D7974]">Pagination changes the displayed rows only. It never changes minimum utility.</p>
      </>}
  </section>;
}
