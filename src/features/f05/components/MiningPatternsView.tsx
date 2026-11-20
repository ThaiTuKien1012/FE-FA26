import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { authService } from '../../../services/authService';
import { f05Api, F05ApiError } from '../f05.api';
import { miningButton, miningErrorMessage } from '../f05.display';
import type { Page, PatternView, RunView } from '../f05.types';

interface Props { compact?: boolean; run: RunView; onReadError: (error: unknown) => void; }

export function MiningPatternsView({ run, onReadError, compact=false }: Props) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [revision, setRevision] = useState(0);
  const token = (authService.getSessionId() || authService.getToken());
  const key = `${run.runId}:${run.status}:${page}:${pageSize}:${revision}`;
  const [result, setResult] = useState<{ key: string; token: string | null; data?: Page<PatternView>; error?: string } | null>(null);
  const current = result?.key === key && result.token === token ? result : null;

  const [labels,setLabels]=useState<{key:string;names:Record<number,string>}>({key:'',names:{}});
  const labelKey=JSON.stringify([token,run.storeId,key]);
  useEffect(()=>{
    const controller=new AbortController(),ids=[...new Set(current?.data?.items.flatMap(p=>p.productIds)??[])].slice(0,100),names:Record<number,string>={};
    let index=0;
    const worker=async()=>{while(index<ids.length&&!controller.signal.aborted){const id=ids[index++];try{names[id]=await f05Api.getProductLabel(id,controller.signal);}catch(e){if(e instanceof F05ApiError&&(e.status===401||e.status===403))controller.abort();}}};
    void Promise.all(Array.from({length:Math.min(4,ids.length)},worker)).then(()=>{if(!controller.signal.aborted&&(authService.getSessionId()||authService.getToken())===token)setLabels({key:labelKey,names});});
    return()=>controller.abort();
  },[labelKey,current?.data,token]);
  const names=labels.key===labelKey?labels.names:{};
  const products=(ids:number[])=>ids.map(id=>names[id]?names[id]+' (#'+id+')':'Product #'+id).join(', ');

  useEffect(() => {
  if (run.status !== 'COMPLETED') return;
    const controller = new AbortController();
    void f05Api.listPatterns(run.runId, page, pageSize, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      if ((authService.getSessionId() || authService.getToken()) !== token) throw new F05ApiError(401, 'The active session changed. Refresh results for the current session.');
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
      <div><h4 id="f05-patterns-title" className="text-lg font-semibold">{compact ? 'Discovered Product Combinations' : `Discovered Product Combinations · Run #${run.runId}`}</h4><p className="mt-2 text-sm text-[#6D7974]">{run.conversionMode === 'WHOLE_UNIT_HALF_UP' ? 'Scores come from the accepted whole-unit analysis input. The saved F03 snapshot is unchanged. Utility scores are not revenue or profit.' : 'Utility scores come from the saved analysis; they are not revenue or profit. Product IDs and row order come from the backend.'}</p></div>
      <button type="button" className={miningButton} disabled={!current} onClick={() => setRevision(value => value + 1)}><RefreshCw aria-hidden="true" className="mr-2 inline h-4 w-4" />Refresh patterns</button>
    </div>
    {!current ? <p role="status" className="mt-4 flex items-center gap-2 text-sm text-[#6D7974]"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading patterns...</p> : current.error ?
      <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{current.error} Use Refresh patterns to retry manually.</div> : data && <>
        {data.items.length === 0 ? <p className="mt-4 rounded-lg bg-[#FAF8F5] p-4 text-sm text-[#6D7974]">{data.totalElements === 0 ? 'This completed run returned no patterns. Zero patterns is a valid mining result; the minimum utility threshold may be high. Ask System Admin to review it for future requests.' : 'No patterns were returned on this page. Refresh to check the results.'}</p> :
          <div className="mt-4 max-h-[28rem] overflow-auto rounded-lg border border-[#E7E2D8]"><table className="w-full text-left text-sm">
            <caption className="sr-only">High utility patterns for run {run.runId}</caption><thead className="sticky top-0 bg-[#FAF8F5] text-xs text-[#6D7974]"><tr>{(compact ? ['Rank', 'Products', 'Utility Score', 'Evidence'] : ['Rank', 'Pattern ID', 'Products', 'Utility Score', 'Pattern size', 'Support count']).map(label => <th scope="col" key={label} className="whitespace-nowrap p-3">{label}</th>)}</tr></thead>
            <tbody>{data.items.map((pattern,index) => <tr key={pattern.patternId} className="border-t border-[#E7E2D8]"><td className="p-3 tabular-nums">{page*pageSize+index+1}</td>{compact ? <><th scope="row" className="p-3 font-medium">{products(pattern.productIds)}</th><td className="p-3 tabular-nums">{pattern.utility.toLocaleString('en-US', { maximumSignificantDigits: 21 })}</td><td className="p-3"><details className="text-xs"><summary className="cursor-pointer text-[#356B54]">Details</summary><dl className="mt-3 space-y-2"><div><dt className="text-[#6D7974]">Pattern</dt><dd>#{pattern.patternId}</dd></div><div><dt className="text-[#6D7974]">Products</dt><dd>{pattern.patternSize}</dd></div><div><dt className="text-[#6D7974]">Support</dt><dd>{pattern.supportCount === null ? 'Not measured' : pattern.supportCount}</dd></div></dl></details></td></> : <><th scope="row" className="p-3 font-medium">#{pattern.patternId}</th><td className="p-3">{products(pattern.productIds)}</td><td className="p-3">{pattern.utility}</td><td className="p-3">{pattern.patternSize}</td><td className="p-3">{pattern.supportCount === null ? 'Not measured' : pattern.supportCount}</td></>}</tr>)}</tbody>
          </table></div>}
        <nav aria-label="Pattern pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6D7974]">
          <p>Page {data.page + 1} of {pages} · {data.totalElements} patterns</p>
          <label className="flex items-center gap-2">Rows per page<select aria-label="Pattern rows per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(0); }} className="rounded-lg border border-[#E7E2D8] bg-white px-2 py-1.5">{[10, 20, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
          <div className="flex gap-2"><button type="button" disabled={page === 0} className={miningButton} onClick={() => setPage(page - 1)}>Previous patterns</button><button type="button" disabled={page + 1 >= pages} className={miningButton} onClick={() => setPage(page + 1)}>Next patterns</button></div>
        </nav>
        <p className="mt-3 text-xs text-[#6D7974]">Run #{run.runId} · Snapshot #{run.snapshotId} · {run.algorithm} · Pattern count: {run.patternCount ?? 'Not measured'}</p><p className="mt-3 text-xs text-[#6D7974]">Pagination changes the displayed rows only. It never changes minimum utility.</p>
      </>}
  </section>;
}
