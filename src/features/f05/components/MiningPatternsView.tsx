import { formatMiningNumber } from '../f05.display';
import { analysisErrorMessage, analysisFailure, analysisRoundingNote } from '../f05.presentation';
import { AnalysisPages } from './AnalysisPages';
import { useEffect, useState } from 'react';
import { authService } from '../../../services/authService';
import { f05Api, F05ApiError } from '../f05.api';
import { miningButton } from '../f05.display';
import type { Page, PatternView, RunView } from '../f05.types';

interface Props { compact?: boolean; showRoundingNote?: boolean; run: RunView; onReadError: (error: unknown) => void; }

export function MiningPatternsView({ run, onReadError, showRoundingNote=true }: Props) {
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
      setResult({ key, token, error: analysisErrorMessage(error) });
      onReadError(error);
    });
    return () => controller.abort();
  }, [run.runId, run.status, page, pageSize, key, token, onReadError]);

  if (run.status !== 'COMPLETED') return <section aria-label="Mining patterns" className="mt-4 rounded-xl border border-[#E7E2D8] p-4 text-sm"><h4 className="font-semibold">Results unavailable</h4><p className="mt-2 text-[#6D7974]">{run.status==='FAILED'||run.status==='TIMED_OUT'?analysisFailure(run.failureCode,run.failureMessage):'Product combinations are available only after the analysis completes.'}</p></section>;
  const data=current?.data,note=analysisRoundingNote(run);
  return <section aria-labelledby="f05-patterns-title" className="mt-5 rounded-xl border border-[#E7E2D8] bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><h4 id="f05-patterns-title" className="text-lg font-semibold">Product Combinations</h4><button type="button" className={miningButton} disabled={!current} onClick={()=>setRevision(value=>value+1)}>Refresh Results</button></div><p data-utility-note className="mt-2 text-sm text-[#6D7974]">Utility Score reflects weighted product value, not revenue, profit, or purchase frequency.</p>
    {showRoundingNote&&note&&<p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{note}</p>}
    {!current?<p role="status" className="mt-4 text-sm text-[#6D7974]">Loading product combinations...</p>:current.error?<p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{current.error} Use Refresh Results to try again.</p>:data&&<>
      {data.items.length===0?<p className="mt-4 rounded-lg bg-[#FAF8F5] p-4 text-sm text-[#6D7974]">{data.totalElements===0?'This analysis completed with no product combinations. Zero product combinations is a valid result; System Admin can review Minimum Utility for future analyses.':'No product combinations were returned on this page. Refresh to check the results.'}</p>:<>
        <div className="mt-4 hidden rounded-lg border border-[#E7E2D8] md:block"><table className="f05-store-table" aria-label="Product combinations"><colgroup><col style={{width:'10%'}}/><col style={{width:'65%'}}/><col style={{width:'25%'}}/></colgroup><thead><tr>{['Rank','Products','Utility Score'].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{data.items.map((pattern,index)=><tr key={pattern.patternId}><td>{page*pageSize+index+1}</td><th scope="row">{products(pattern.productIds)}</th><td className="tabular-nums">{formatMiningNumber(pattern.utility)}</td></tr>)}</tbody></table></div>
        <ul aria-label="Product combination cards" className="mt-4 grid gap-2 md:hidden">{data.items.map((pattern,index)=><li key={pattern.patternId} className="min-w-0 rounded-lg border border-[#E7E2D8] p-3 text-sm"><p className="text-xs text-[#6D7974]">Combination #{page*pageSize+index+1}</p><p className="mt-1 break-words font-medium">{products(pattern.productIds)}</p><p className="mt-2 tabular-nums"><span className="text-xs text-[#6D7974]">Utility Score </span>{formatMiningNumber(pattern.utility)}</p></li>)}</ul>
      </>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#6D7974]"><span>{formatMiningNumber(data.totalElements)} product combinations</span><label>Rows per page <select aria-label="Pattern rows per page" value={pageSize} onChange={event=>{setPageSize(Number(event.target.value));setPage(0);}} className="ml-2 rounded-lg border border-[#E7E2D8] bg-white px-2 py-1">{[10,20,50,100].map(size=><option key={size} value={size}>{size}</option>)}</select></label></div>
      <AnalysisPages page={data} label="Product combination" onPage={setPage} />
    </>}
  </section>;
}
