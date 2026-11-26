import {useRef,useEffect,useState} from 'react';
import {miningDate,miningButton,formatMiningNumber} from '../../f05/f05.display';
import type {RecommendationBrowseState,RecommendationBrowser} from '../f06.browse';
import {formatDateRange} from '../../../utils/dateTime';
import {F06Pages} from './F06Pages';
import {recommendationLabel} from './F06ReadShared';
import {analysisTimestamp,F06AnalysisSummary} from './F06AnalysisSummary';

export function F06RankedSource({state,workflow,onSelectRun,onChooseAnalysis}:{state:RecommendationBrowseState;workflow:RecommendationBrowser;onSelectRun?:(id:number)=>void;onChooseAnalysis?:()=>void}){
 const sequence=useRef(0),[selecting,setSelecting]=useState(false);
 useEffect(()=>()=>{sequence.current++;},[]);
 if(state.sourceLoading)return null;
 if(state.sourceRun&&state.request)return <F06AnalysisSummary request={state.request} run={state.sourceRun} disabled={state.reviewPending} onChange={()=>onChooseAnalysis?onChooseAnalysis():void workflow.loadRequests(0)}/>;
 const chooseRun=(id:number)=>onSelectRun?onSelectRun(id):void workflow.selectRun(id);
 const chooseRequest=async(id:number)=>{
  if(selecting||state.runsLoading)return;
  const version=++sequence.current;setSelecting(true);
  try{await workflow.selectRequest(id);const current=workflow.getSnapshot();if(version!==sequence.current||current.request?.requestId!==id||current.runsError)return;const completed=current.runs.filter(run=>run.status==='COMPLETED');if(completed.length===1)chooseRun(completed[0].runId);}
  finally{if(version===sequence.current)setSelecting(false);}
 };
 return <section aria-labelledby="f06-ranked-source-title" className="space-y-4">
  <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="f06-ranked-source-title" className="text-xl font-semibold">Choose an Analysis</h2><p className="mt-1 text-sm text-[#6D7974]">Select a completed sales analysis to explore its recommendations.</p></div><button type="button" className={miningButton} disabled={state.requestsLoading||selecting} onClick={()=>void workflow.loadRequests()}>Refresh Analyses</button></header>
  {state.requestsLoading?<p role="status" className="text-sm text-[#6D7974]">Loading analyses...</p>:state.requestsError?<p role="alert" className="text-sm text-red-800">{state.requestsError}</p>:state.requests&&<>
   {!state.requests.items.length?<p className="rounded-xl bg-[#FAF8F5] p-4 text-sm text-[#6D7974]">No saved analyses are available for your Store.</p>:<ul aria-label="Saved analyses" className="space-y-2">{state.requests.items.map(request=><li key={request.requestId} data-analysis-id={request.requestId} className={'flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border p-4 '+(state.request?.requestId===request.requestId?'border-[#B8CDBE] bg-[#F4F8F3]':'border-[#E7E2D8] bg-white')}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[#243B30]">Analysis #{request.requestId}</h3><span className="text-xs text-[#6D7974]">{recommendationLabel(request.status)}</span></div><p className="mt-1 break-words text-sm text-[#53665B]">Sales period: {formatDateRange(request.snapshot.rangeStart,request.snapshot.rangeEnd)}</p><p className="mt-1 text-xs text-[#6D7974]">Created on: {analysisTimestamp(request.createdAt)}</p></div><button type="button" data-select-analysis={request.requestId} aria-label={'Select Analysis #'+request.requestId} disabled={selecting||state.runsLoading} className={miningButton+' shrink-0'} onClick={()=>void chooseRequest(request.requestId)}>Select Analysis</button></li>)}</ul>}
   <F06Pages data={state.requests} label="sources" busy={state.requestsLoading||selecting} onPage={page=>void workflow.loadRequests(page)}/>
  </>}
  {state.runsLoading&&<p role="status" className="text-sm text-[#6D7974]">Loading completed results...</p>}
  {state.runsError&&<div role="alert" className="space-y-2 text-sm text-red-800"><p>{state.runsError}</p>{state.request&&<button type="button" className={miningButton} onClick={()=>void chooseRequest(state.request!.requestId)}>Retry Results</button>}</div>}
  {state.request&&!state.runsLoading&&!state.runsError&&<section aria-label="Completed results" className="space-y-3 rounded-xl bg-[#FAF8F5] p-4"><h3 className="text-sm font-semibold">Analysis #{state.request.requestId} results</h3>{!state.runs.some(run=>run.status==='COMPLETED')?<p className="text-sm text-[#6D7974]">No completed results are available for this analysis.</p>:<><p className="text-xs text-[#6D7974]">Choose the completed result you want to use.</p><ul className="grid gap-2 sm:grid-cols-2">{state.runs.filter(run=>run.status==='COMPLETED').map(run=><li key={run.runId}><button type="button" data-select-run={run.runId} className="w-full rounded-lg border border-[#DDE5DF] bg-white p-3 text-left hover:border-[#356B54] focus-visible:outline-2 focus-visible:outline-[#356B54]" onClick={()=>chooseRun(run.runId)}><strong className="block text-sm">{analysisTimestamp(run.completedAt)!=='Not recorded'?'Completed '+analysisTimestamp(run.completedAt):'Completion time not recorded'}</strong><span className="mt-1 block text-sm text-[#53665B]">{run.patternCount===null?'Product combinations not recorded':formatMiningNumber(run.patternCount)+' product combinations'}</span><small className="mt-1 block text-[#6D7974]">Result #{run.runId}</small></button></li>)}</ul></>}
  </section>}
 </section>;
}
