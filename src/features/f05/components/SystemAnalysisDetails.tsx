import {useEffect,useState,type ReactNode} from 'react';
import {RefreshCw} from 'lucide-react';
import {authService} from '../../../services/authService';
import {formatDateRange} from '../../../utils/dateTime';
import {F05ApiError} from '../f05.api';
import {algorithmName,formatMiningNumber,formatThreshold,miningDate} from '../f05.display';
import {isRequestActive,watchMiningRequest,type MiningProgress} from '../f05.progress';
import type {MiningReader} from '../f05.reader';
import type {RunView} from '../f05.types';
import {MiningStatusBadge} from './MiningStatusBadge';
import {MiningProgressCard} from './MiningProgressCard';
import {SystemHistoryDialog,historyButton} from './SystemHistoryDialog';

function Value({label,children}:{label:string;children:ReactNode}){return <div className="min-w-0"><dt className="text-xs text-[#6D7974]">{label}</dt><dd className="mt-1 break-words text-sm font-medium [overflow-wrap:anywhere]">{children}</dd></div>;}

export function systemAnalysisFailure(run?:Pick<RunView,'status'|'failureCode'|'failureMessage'>):string{
 const reason=(run?.failureCode??'')+' '+(run?.failureMessage??'');
 if(run?.status==='TIMED_OUT'||/TIMED_OUT|TIMEOUT|time limit/i.test(reason))return 'The analysis took too long and was stopped. Review the sales period and settings with a Merchandiser at the store before trying again.';
 if(/MEMORY|HEAP/i.test(reason))return 'The analysis exceeded the available memory. Ask a Merchandiser at the store to use a smaller sales period.';
 if(/OUTPUT_LIMIT/i.test(reason))return 'The analysis found more results than could be saved. Review the analysis settings before trying again.';
 if(/INT32|TWU|OVERFLOW|CAPACITY|INPUT_LIMIT|SNAPSHOT/i.test(reason))return 'The selected data could not be processed. Review the sales period and saved snapshot with a Merchandiser at the store.';
 if(/SPMF|JAVA|PROCESS|RUNTIME|ENVIRONMENT/i.test(reason))return 'The analysis service could not finish processing. Check the service before asking a Merchandiser at the store to try again.';
 return 'The analysis could not be completed. Refresh Details to check for updates, or ask support to review the analysis.';
}
export function systemAnalysisReadError(error:unknown):string{
 if(error instanceof F05ApiError){
  if(error.status===401)return 'Your session has ended. Sign in again to view this analysis.';
  if(error.status===403)return 'You do not have access to this analysis.';
  if(error.status===404)return 'This analysis or selected result is unavailable. Close this dialog and refresh history.';
  if(error.status===200)return 'The response could not be read safely. No values were used. Refresh Details or ask support to review the analysis.';
 }
 return 'The analysis could not be loaded. Check your connection and the analysis service, then use Refresh Details to try again.';
}
export function SystemAnalysisContent({data}:{data:MiningProgress}){
 const {request,runs,progress}=data,failed=runs.filter(run=>run.status==='FAILED'||run.status==='TIMED_OUT');
 const resultDescription=request.status==='PENDING'||request.status==='RUNNING'?'Results will appear as processing finishes.':runs.length===0?'No results were recorded for this analysis.':'Product groups found by this analysis.';
 const card='min-w-0 rounded-xl border border-[#E7EADF] bg-[#F8F9F6] p-4 sm:p-5';
 return <div className="space-y-5">
  <section aria-label="Analysis information"><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
   <Value label="Sales Period">{formatDateRange(request.snapshot.rangeStart,request.snapshot.rangeEnd)}</Value><Value label="Source Snapshot">Snapshot #{request.snapshotId}</Value><Value label="Created On">{miningDate(request.createdAt,false)}</Value><Value label="Analysis Method">{request.algorithms.map(algorithmName).join(', ')}</Value><Value label="Minimum Utility">{formatThreshold(request.minUtilValue,request.minUtilMode)}</Value>
  </dl></section>
  <MiningProgressCard simple progress={progress} snapshotId={request.snapshotId}/>
  <section aria-label="Analysis Results"><h3 className="text-base font-semibold">Analysis Results</h3>
   <div data-system-analysis-results className="mt-3 grid auto-rows-fr gap-4 sm:grid-cols-2">
    <article data-result-card="transactions" className={card}><h4 className="text-sm font-medium text-[#59685F]">Transactions Analyzed</h4><p className="mt-3 break-words text-3xl font-semibold tracking-tight tabular-nums text-[#1E3A2F]">{formatMiningNumber(request.transactionCount)}</p><p className="mt-2 text-xs leading-5 text-[#6D7974]">Sales transactions included in this analysis.</p></article>
    <article data-result-card="combinations" className={card}><h4 className="text-sm font-medium text-[#59685F]">Product Combinations</h4>
     {runs.length>1?<><p className="mt-2 text-xs leading-5 text-[#6D7974]">Separate results for each run; counts may overlap.</p><dl className="mt-3 space-y-3">{runs.map(run=><div key={run.runId} className="flex flex-wrap items-center justify-between gap-2"><dt className="min-w-0 text-xs text-[#59685F]">{algorithmName(run.algorithm)} / Run #{run.runId}</dt><dd className="break-words text-2xl font-semibold tabular-nums text-[#1E3A2F]">{formatMiningNumber(run.patternCount)}</dd></div>)}</dl></>:<><p className="mt-3 break-words text-3xl font-semibold tracking-tight tabular-nums text-[#1E3A2F]">{runs.length?formatMiningNumber(runs[0].patternCount):'Not recorded'}</p><p className="mt-2 text-xs leading-5 text-[#6D7974]">{resultDescription}</p></>}
    </article>
   </div>
  </section>
  {(request.status==='FAILED'||failed.length>0)&&<section role="alert" aria-label={request.status==='FAILED'?'Analysis could not be completed':'Some results are unavailable'} className="space-y-2 rounded-xl border border-[#EBD7D3] bg-[#FBEEEB] p-4 text-sm leading-6 text-[#874B42]">
   <h3 className="font-semibold">{request.status==='FAILED'?'Analysis could not be completed':'Some results are unavailable'}</h3>{failed.length?failed.map(run=><p key={run.runId}>{runs.length>1&&<span className="font-semibold">{algorithmName(run.algorithm)} / Run #{run.runId}: </span>}{systemAnalysisFailure(run)}</p>):<p>{systemAnalysisFailure()}</p>}
  </section>}
 </div>;
}
export function SystemAnalysisDetails({reader,requestId,selectedRunId,storeName,onClose,onUpdated,onReadError}:{reader:MiningReader;requestId:number;selectedRunId:number|null;storeName:string|null;onClose:()=>void;onUpdated:(data:MiningProgress['request'])=>void;onReadError:(error:unknown)=>void}){
 const [revision,setRevision]=useState(0),token=authService.getSessionId()||authService.getToken(),key=JSON.stringify([reader.scopeKey,requestId,selectedRunId,revision,token]);
 const [result,setResult]=useState<{key:string;data?:MiningProgress;error?:string}|null>(null),current=result?.key===key?result:null;
 useEffect(()=>watchMiningRequest(requestId,data=>{setResult({key,data});onUpdated(data.request);},error=>{setResult({key,error:systemAnalysisReadError(error)});onReadError(error);},selectedRunId,reader),[reader,requestId,selectedRunId,key,onUpdated,onReadError]);
 return <SystemHistoryDialog title={'Analysis #'+requestId} subtitle={storeName??'Store name unavailable'} summary={current?.data&&<MiningStatusBadge friendly kind="request" status={current.data.request.status}/>} onClose={onClose} footer={<><button type="button" className={historyButton} disabled={!current} onClick={()=>setRevision(n=>n+1)}><RefreshCw aria-hidden="true" className="h-4 w-4"/>Refresh Details</button><button type="button" className={historyButton} onClick={onClose}>Close</button></>}>
  {!current?<p role="status" className="text-sm text-[#6D7974]">Loading analysis...</p>:current.error?<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{current.error}</p>:current.data&&<><p className="mb-4 text-xs text-[#6D7974]">{isRequestActive(current.data.request)?'Progress updates automatically while this analysis is running.':'This analysis has finished. Automatic updates have stopped.'}</p><SystemAnalysisContent data={current.data}/></>}
 </SystemHistoryDialog>;
}
