import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Loader2 } from 'lucide-react';
import { authService } from '../../../services/authService';
import { miningButton, miningPrimaryButton } from '../../f05/f05.display';
import { RecommendationGeneration } from '../f06.generate';
import { REC_TYPES } from '../f06.validation';
import { recommendationTypeCopy } from '../f06.presentation';
import { F06GenerationSummary } from './F06GenerationResult';
import { F06DashboardContent } from './F06DashboardView';
import { RecommendationBrowser } from '../f06.browse';
import type { RecommendationSource } from '../f06.source';
import type { RecGenerationResult } from '../f06.types';
import { openRunRecommendations, useRecommendationLocation } from '../f06.navigation';
import { RecommendationRuleSummary } from './F06ReadShared';

export function F06GenerationPanel({ source, onGenerated, onPendingChange }: { source:RecommendationSource;onGenerated:(result:RecGenerationResult)=>void;onPendingChange:(pending:boolean)=>void }) {
  const [workflow]=useState(()=>new RecommendationGeneration());
  const state=useSyncExternalStore(workflow.subscribe,workflow.getSnapshot,workflow.getSnapshot);
  const reported=useRef(state.result);
  useEffect(()=>{workflow.start(source);return workflow.stop;},[workflow,source]);
  useEffect(()=>{onPendingChange(state.pending);},[state.pending,onPendingChange]);
  useEffect(()=>{if(state.result&&state.result!==reported.current){reported.current=state.result;onGenerated(state.result);}},[state.result,onGenerated]);
  const selectedRun=state.runs.find(run=>run.runId===state.selectedRunId&&run.status==='COMPLETED');
  return <section aria-labelledby="f06-generate-title" className="rounded-2xl border border-[#E7E2D8] bg-white">
    <header className="border-b border-[#E7E2D8] p-4 sm:p-5"><h2 id="f06-generate-title" className="text-xl font-semibold">Generate new suggestions</h2><p className="mt-2 text-sm text-[#6D7974]">Choose the types to generate from your selected analysis. Existing review decisions are kept.</p></header>
    <div className="space-y-4 p-4 sm:p-5">
      <form id="f06-generate-form" aria-label="Generate recommendations" onSubmit={event => { event.preventDefault(); void workflow.generate(); }}>
        <p id="f06-types-help" className="mb-3 text-sm leading-6 text-[#6D7974]">Choose how you'd like to use the product patterns found in your sales analysis. A product group may qualify for more than one recommendation type.</p>
        <fieldset disabled={state.pending} aria-describedby="f06-types-help f06-types-result-help" className="grid gap-3 sm:grid-cols-2"><legend id="f06-types-title" className="mb-3 font-semibold">Choose recommendation types</legend>{REC_TYPES.map(type => <div key={type} className={'min-w-0 rounded-xl border p-3 '+(state.types.includes(type)?'border-[#356B54] bg-[#EDF5F0]':'border-[#E7E2D8]')}><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" value={type} checked={state.types.includes(type)} onChange={() => workflow.toggleType(type)} className="mt-1 h-4 w-4 shrink-0 accent-[#356B54]" /><span><span className="block text-sm font-semibold">{recommendationTypeCopy[type].title}</span><span className="mt-1 block text-xs leading-5 text-[#6D7974]">{recommendationTypeCopy[type].description}</span></span></label></div>)}</fieldset>
        <p id="f06-types-result-help" className="mt-3 text-xs leading-5 text-[#6D7974]">Select one or more types. Results depend on the recorded patterns and store rules; some selected types may produce no suggestions.</p>
        {!state.types.length && <p role="alert" className="mt-3 text-sm text-amber-900">Select at least one recommendation format.</p>}
        <details className="mt-4 rounded-xl border border-[#E7E2D8] p-3 text-sm"><summary className="cursor-pointer font-medium">Store rules · Read-only</summary><div className="mt-3">{state.policyLoading?<p role="status">Loading store rules...</p>:state.policyError?<p role="alert" className="text-red-800">{state.policyError}</p>:state.policy&&<RecommendationRuleSummary policy={state.policy} />}<button type="button" className={miningButton+' mt-3'} disabled={state.policyLoading || state.pending} onClick={()=>void workflow.refreshPolicy()}>Refresh Rules</button></div></details>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E7E2D8] pt-4"><p className="max-w-md text-xs leading-5 text-[#6D7974]">Suggestions still need review. Existing decisions are kept when suggestions are reused.</p><button type="submit" className={miningPrimaryButton+' w-full justify-center sm:w-auto'} disabled={state.pending || !selectedRun || !state.types.length || state.runsLoading || state.historyLoading}>{state.pending&&<Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />}{state.pending?'Generating recommendations...':'Generate recommendations'}</button></div>
        {state.pending&&<p role="status" className="mt-3 text-sm text-[#6D7974]">Saving suggestions from the selected results. Please keep this page open.</p>}
        {state.generationError&&<p role="alert" className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.generationError}</p>}
      </form>
    </div>
  </section>;
}

function RecommendationsWorkspace({ merchant, location }: { merchant:boolean;location:ReturnType<typeof useRecommendationLocation> }) {
  const [tab,setTab]=useState<'library'|'generate'>('library'),[busy,setBusy]=useState(false);
  const [workflow]=useState(()=>new RecommendationBrowser());
  const state=useSyncExternalStore(workflow.subscribe,workflow.getSnapshot,workflow.getSnapshot);
  const [notice,setNotice]=useState<RecGenerationResult|null>(null);
  useEffect(()=>{workflow.start(false);return workflow.stop;},[workflow]);
  useEffect(()=>{
    setTab('library');setBusy(false);setNotice(null);
    if(location.runId!==null)void workflow.selectSource(location.runId);
    else void workflow.loadRequests(0);
  },[location.runId,location.error,workflow]);
  const source=state.sourceRun&&state.request?{run:state.sourceRun,request:state.request}:null;
  const stableSource=useRef(source);
  if(source?.run!==stableSource.current?.run||source?.request!==stableSource.current?.request)stableSource.current=source;
  const generated=(result:RecGenerationResult)=>{
    if(result.miningRunId!==state.sourceRun?.runId)return;
    setNotice(result);setTab('library');setBusy(false);void workflow.applyFilters({pageSize:20},true);
    requestAnimationFrame(()=>document.getElementById('f06-library-tab')?.focus());
  };
  const choose=(next:'library'|'generate')=>{if(!busy&&!state.reviewPending&&(next==='library'||source&&merchant))setTab(next);};
  return <div className="mx-auto max-w-6xl space-y-5 text-[#191C1B]">
    <header><h1 id="f06-library-tab" tabIndex={-1} className="text-2xl font-semibold sm:text-3xl">Recommendations</h1><p className="mt-2 text-sm text-[#6D7974]">{merchant ? 'Explore product suggestions and manage review decisions.' : 'View product suggestions, review decisions and current availability.'}</p></header>
    {tab==='generate'&&<button id="f06-generate-back" type="button" className={miningButton} disabled={busy} onClick={()=>choose('library')}>Back to Recommendations</button>}
    {location.error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{location.error}</p>}
    {location.runId!==null&&state.error&&!source&&!state.sourceLoading&&<button type="button" className={miningButton} onClick={()=>void workflow.selectSource(location.runId!)}>Retry Analysis</button>}
    <div id="f06-browse-panel" hidden={tab!=='library'}>{notice&&notice.miningRunId===state.miningRunId&&<F06GenerationSummary result={notice}/>}<F06DashboardContent state={state} workflow={workflow} generationAttempted={notice?.miningRunId===state.miningRunId} onSelectRun={openRunRecommendations} onChooseAnalysis={()=>openRunRecommendations(null)} onGenerate={()=>choose('generate')}/></div>
    {merchant&&tab==='generate'&&stableSource.current&&<div id="f06-generate-panel"><F06GenerationPanel key={state.miningRunId} source={stableSource.current} onGenerated={generated} onPendingChange={setBusy} /></div>}
  </div>;
}

export function F06WorkspaceView() {
  const user = useSyncExternalStore(authService.subscribe, authService.getCurrentUser, authService.getCurrentUser);
  const location=useRecommendationLocation();
  if (user?.role !== 'Merchandiser' && user?.role !== 'Store Admin') return null;
  return <RecommendationsWorkspace key={JSON.stringify([user.id,user.role,user.storeId,authService.getSessionId(),location.runId,location.error])} location={location} merchant={user.role==='Merchandiser'} />;
}
