import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Loader2 } from 'lucide-react';
import { authService } from '../../../services/authService';
import { miningButton, miningPrimaryButton } from '../../f05/f05.display';
import { RecommendationGeneration } from '../f06.generate';
import { REC_TYPES } from '../f06.validation';
import { recommendationTypeCopy } from '../f06.presentation';
import { F06GenerationResult } from './F06GenerationResult';
import { F06RunPicker } from './F06RunPicker';
import { F06DashboardView } from './F06DashboardView';
import { RecommendationRuleSummary, RecommendationTypeQualification } from './F06ReadShared';

export function F06GenerationPanel({ onViewLibrary, onGenerated, onPendingChange }: { onViewLibrary:(runId:number)=>void;onGenerated:()=>void;onPendingChange:(pending:boolean)=>void }) {
  const [workflow]=useState(()=>new RecommendationGeneration());
  const state=useSyncExternalStore(workflow.subscribe,workflow.getSnapshot,workflow.getSnapshot);
  const reported=useRef(state.result);
  useEffect(()=>{workflow.start();return workflow.stop;},[workflow]);
  useEffect(()=>{onPendingChange(state.pending);},[state.pending,onPendingChange]);
  useEffect(()=>{if(state.result&&state.result!==reported.current){reported.current=state.result;onGenerated();}},[state.result,onGenerated]);
  const selectedRun=state.runs.find(run=>run.runId===state.selectedRunId&&run.status==='COMPLETED');
  return <section aria-labelledby="f06-generate-title" className="rounded-2xl border border-[#E7E2D8] bg-white">
    <header className="border-b border-[#E7E2D8] p-4 sm:p-5"><h2 id="f06-generate-title" className="text-xl font-semibold">Generate new suggestions</h2><p className="mt-2 text-sm text-[#6D7974]">Use completed F05 results. Mining is not run again.</p><ol aria-label="Generation steps" className="mt-4 grid gap-2 text-xs text-[#356B54] sm:grid-cols-4">{['Choose analysis','Select types','Generate','View results'].map((step,index)=><li key={step} className="rounded-lg bg-[#F0F5EE] px-3 py-2"><span className="mr-2 font-semibold">{index+1}</span>{step}</li>)}</ol></header>
    <div className="space-y-4 p-4 sm:p-5">
      <F06RunPicker state={state} workflow={workflow} />
      <form id="f06-generate-form" aria-label="Generate recommendations" onSubmit={event => { event.preventDefault(); void workflow.generate(); }}>
        <p id="f06-types-help" className="mb-3 text-sm leading-6 text-[#6D7974]">Choose how you'd like to use the product patterns found in your sales analysis. A product group may qualify for more than one recommendation type.</p>
        <fieldset disabled={state.pending} aria-describedby="f06-types-help f06-types-result-help" className="grid gap-3 sm:grid-cols-2"><legend id="f06-types-title" className="mb-3 font-semibold">2. Choose recommendation types</legend>{REC_TYPES.map(type => <div key={type} className={'min-w-0 rounded-xl border p-3 '+(state.types.includes(type)?'border-[#356B54] bg-[#EDF5F0]':'border-[#E7E2D8]')}><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" value={type} checked={state.types.includes(type)} onChange={() => workflow.toggleType(type)} className="mt-1 h-4 w-4 shrink-0 accent-[#356B54]" /><span><span className="block text-sm font-semibold">{recommendationTypeCopy[type].title}</span><span className="mt-1 block text-xs leading-5 text-[#6D7974]">{recommendationTypeCopy[type].description}</span></span></label><RecommendationTypeQualification type={type} policy={state.policyLoading || state.policyError ? null : state.policy} /></div>)}</fieldset>
        <p id="f06-types-result-help" className="mt-3 text-xs leading-5 text-[#6D7974]">Select one or more types. Results depend on the recorded patterns and store rules; some selected types may produce no suggestions.</p>
        {!state.types.length && <p role="alert" className="mt-3 text-sm text-amber-900">Select at least one recommendation format.</p>}
        <details className="mt-4 rounded-xl border border-[#E7E2D8] p-3 text-sm"><summary className="cursor-pointer font-medium">Store rules · Read-only</summary><div className="mt-3">{state.policyLoading?<p role="status">Loading store rules...</p>:state.policyError?<p role="alert" className="text-red-800">{state.policyError}</p>:state.policy&&<RecommendationRuleSummary policy={state.policy} />}<button type="button" className={miningButton+' mt-3'} disabled={state.policyLoading || state.pending} onClick={()=>void workflow.refreshPolicy()}>Refresh Rules</button></div></details>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E7E2D8] pt-4"><p className="max-w-md text-xs leading-5 text-[#6D7974]">Suggestions still need review. Existing decisions are kept when suggestions are reused.</p><button type="submit" className={miningPrimaryButton+' w-full justify-center sm:w-auto'} disabled={state.pending || !selectedRun || !state.types.length || state.runsLoading || state.historyLoading}>{state.pending&&<Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />}{state.pending?'Generating recommendations...':'Generate recommendations'}</button></div>
        {state.pending&&<p role="status" className="mt-3 text-sm text-[#6D7974]">Saving suggestions from the selected results. Please keep this page open.</p>}
        {state.generationError&&<p role="alert" className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.generationError}</p>}
      </form>
      {state.result&&<F06GenerationResult result={state.result} types={state.resultTypes} onViewRecommendations={()=>onViewLibrary(state.result!.miningRunId)} />}
    </div>
  </section>;
}

function RecommendationsWorkspace({ merchant }: { merchant:boolean }) {
  const [tab,setTab]=useState<'library'|'generate'>('library'),[visited,setVisited]=useState(false),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
  const [analysisSelection,setAnalysisSelection]=useState<{runId:number;revision:number}>();
  const generated=useCallback(()=>setRevision(value=>value+1),[]);
  const showLibrary=(runId:number)=>{setAnalysisSelection(previous=>({runId,revision:(previous?.revision??0)+1}));setTab('library');requestAnimationFrame(()=>document.getElementById('f06-library-tab')?.focus());};
  const choose=(next:'library'|'generate')=>{if(busy)return;if(next==='generate')setVisited(true);setTab(next);};
  return <div className="mx-auto max-w-6xl space-y-5 text-[#191C1B]">
    <header><h1 className="text-2xl font-semibold sm:text-3xl">Recommendations</h1><p className="mt-2 text-sm text-[#6D7974]">Explore product suggestions and manage review decisions.</p></header>
    <nav role="tablist" aria-label="Recommendations" className="flex gap-2 border-b border-[#E7E2D8] pb-3" onKeyDown={event=>{if(busy||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=merchant&&(event.key==='End'||event.key==='ArrowRight'&&tab==='library'||event.key==='ArrowLeft'&&tab==='library')?'generate':'library';choose(next);document.getElementById(next==='generate'?'f06-generate-tab':'f06-library-tab')?.focus();}}>
      <button type="button" id="f06-library-tab" role="tab" aria-selected={tab==='library'} aria-controls="f06-browse-panel" tabIndex={tab==='library'?0:-1} disabled={busy} className={miningButton+' aria-selected:border-[#356B54] aria-selected:bg-[#EDF5F0]'} onClick={()=>choose('library')}>Library</button>
      {merchant&&<button type="button" id="f06-generate-tab" role="tab" aria-selected={tab==='generate'} aria-controls="f06-generate-panel" tabIndex={tab==='generate'?0:-1} disabled={busy} className={miningButton+' aria-selected:border-[#356B54] aria-selected:bg-[#EDF5F0]'} onClick={()=>choose('generate')}>Generate New</button>}
    </nav>
    <div id="f06-browse-panel" role="tabpanel" aria-labelledby="f06-library-tab" hidden={tab!=='library'}><F06DashboardView refreshRevision={revision} analysisSelection={analysisSelection} /></div>
    {merchant&&<div id="f06-generate-panel" role="tabpanel" aria-labelledby="f06-generate-tab" hidden={tab!=='generate'}>{visited&&<F06GenerationPanel onGenerated={generated} onPendingChange={setBusy} onViewLibrary={showLibrary} />}</div>}
  </div>;
}

export function F06WorkspaceView() {
  const user = useSyncExternalStore(authService.subscribe, authService.getCurrentUser, authService.getCurrentUser);
  if (user?.role !== 'Merchandiser' && user?.role !== 'Store Admin') return null;
  return <RecommendationsWorkspace key={JSON.stringify([user.id,user.role,user.storeId,authService.getSessionId()])} merchant={user.role==='Merchandiser'} />;
}
