import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { authService } from '../../../services/authService';
import { miningButton } from '../../f05/f05.display';
import { F06GenerationSummary } from './F06GenerationResult';
import { F06DashboardContent } from './F06DashboardView';
import { RecommendationBrowser } from '../f06.browse';
import type { RecommendationSource } from '../f06.source';
import type { RecGenerationResult } from '../f06.types';
import { openRunRecommendations, useRecommendationLocation } from '../f06.navigation';
import { F06GenerationPanel } from './F06GenerationModal';
import { F06AnalysisPicker } from './F06AnalysisPicker';
export { F06GenerationPanel } from './F06GenerationModal';
import { F06ExpiryProvider, useF06Expiry } from './F06ExpiryContext';
import { F06ExpiryNotice } from './F06ExpiryPriority';
import { F06ExpiryPanel, F06RulesPanel, F06StoreRulesButton } from './F06Utilities';

function RecommendationsWorkspace({ merchant, location }: { merchant:boolean;location:ReturnType<typeof useRecommendationLocation> }) {
  const [generateOpen,setGenerateOpen]=useState(false),[busy,setBusy]=useState(false),[choosing,setChoosing]=useState(false),[generationIssue,setGenerationIssue]=useState('');
  const [rulesOpen,setRulesOpen]=useState(false),expiry=useF06Expiry();
  const [workflow]=useState(()=>new RecommendationBrowser());
  const state=useSyncExternalStore(workflow.subscribe,workflow.getSnapshot,workflow.getSnapshot);
  const [notice,setNotice]=useState<RecGenerationResult|null>(null);
  useEffect(()=>{workflow.start(false);return workflow.stop;},[workflow]);
  useEffect(()=>{
    setGenerateOpen(false);setChoosing(false);setBusy(false);setNotice(null);setGenerationIssue('');
    if(location.runId!==null)void workflow.selectSource(location.runId);
    else void workflow.loadRequests(0);
  },[location.runId,location.error,workflow]);
  const source=state.sourceRun&&state.request?{run:state.sourceRun,request:state.request}:null;
  const stableSource=useRef(source);
  if(source?.run!==stableSource.current?.run||source?.request!==stableSource.current?.request)stableSource.current=source;
  const generated=(result:RecGenerationResult)=>{
    if(result.miningRunId!==state.sourceRun?.runId)return;
    setNotice(result);setGenerateOpen(false);setBusy(false);setGenerationIssue('');void workflow.applyFilters({pageSize:20},true);
    requestAnimationFrame(()=>document.getElementById('f06-library-tab')?.focus());
  };
  const openGeneration=()=>{if(!busy&&!state.reviewPending&&source&&merchant)setGenerateOpen(true);};
  const checkSaved=()=>{setGenerateOpen(false);setBusy(false);setGenerationIssue('Generation was not confirmed. Saved recommendations are being checked. Review the library before trying again.');void workflow.refresh(false,false,true).then(()=>{if(workflow.getSnapshot().sourceRun?.runId===state.sourceRun?.runId)setGenerationIssue(workflow.getSnapshot().runTotal===null?'Generation was not confirmed. Saved recommendations could not be checked. Refresh the library before trying again.':'Generation was not confirmed. Saved recommendations were checked. Review the library before trying again.');});};
  return <div className="mx-auto max-w-6xl space-y-5 text-[#191C1B]">
    <header className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h1 id="f06-library-tab" tabIndex={-1} className="text-2xl font-semibold sm:text-3xl">Recommendations</h1><p className="mt-2 text-sm text-[#6D7974]">{merchant ? 'Explore product suggestions and manage review decisions.' : 'View product suggestions, review decisions and current availability.'}</p></div><div data-f06-tools className="flex min-w-0 flex-wrap items-center gap-2"><F06StoreRulesButton merchant={merchant} onClick={()=>setRulesOpen(true)}/></div></header>
    <F06ExpiryNotice/>
    {location.error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{location.error}</p>}
    {location.runId!==null&&state.error&&!source&&!state.sourceLoading&&<button type="button" className={miningButton} onClick={()=>void workflow.selectSource(location.runId!)}>Retry Analysis</button>}
    {generationIssue&&<p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{generationIssue}</p>}
    {choosing&&<F06AnalysisPicker onCancel={()=>setChoosing(false)} onSelectRun={id=>{setChoosing(false);openRunRecommendations(id);}}/>}
    <div id="f06-browse-panel" hidden={choosing}>{notice&&notice.miningRunId===state.miningRunId&&<F06GenerationSummary result={notice}/>}<F06DashboardContent state={state} workflow={workflow} generationAttempted={notice?.miningRunId===state.miningRunId} onSelectRun={openRunRecommendations} onChooseAnalysis={()=>setChoosing(true)} onGenerate={openGeneration}/></div>
    {merchant&&generateOpen&&stableSource.current&&<F06GenerationPanel key={state.miningRunId} source={stableSource.current} onGenerated={generated} onPendingChange={setBusy} onClose={()=>{setGenerateOpen(false);setBusy(false);}} onCheckSaved={checkSaved}/>}
    {rulesOpen&&<F06RulesPanel onClose={()=>setRulesOpen(false)}/>}
    {expiry?.alertsOpen&&<F06ExpiryPanel onClose={expiry.closeAlerts} analysisSelected={!!source}/>}
  </div>;
}

export function F06WorkspaceView() {
  const user = useSyncExternalStore(authService.subscribe, authService.getCurrentUser, authService.getCurrentUser);
  const location=useRecommendationLocation();
  if (user?.role !== 'Merchandiser' && user?.role !== 'Store Admin') return null;
  const scope=JSON.stringify([user.id,user.role,user.storeId,authService.getSessionId()]);
  return <F06ExpiryProvider key={scope}><RecommendationsWorkspace key={JSON.stringify([scope,location.runId,location.error])} location={location} merchant={user.role==='Merchandiser'} /></F06ExpiryProvider>;
}
