import { useEffect, useState, useSyncExternalStore } from 'react';
import { authService } from '../../../services/authService';
import { ArrowLeftRight, Loader2, Megaphone, Package, RefreshCw, ShoppingBasket, Sparkles, type LucideIcon } from 'lucide-react';
import { miningButton, miningPrimaryButton } from '../../f05/f05.display';
import { RecommendationGeneration, type GenerationState } from '../f06.generate';
import type { RecType } from '../f06.types';
import { F06GenerationResult } from './F06GenerationResult';
import { F06RunPicker } from './F06RunPicker';
import { F06DashboardView } from './F06DashboardView';
import { recommendationLabel, RecommendationRuleSummary } from './F06ReadShared';

const options: { type: RecType; title: string; description: string; icon: LucideIcon }[] = [
  { type: 'BUNDLE', title: 'Bundle', description: 'Group products that may work well together.', icon: Package },
  { type: 'CROSS_SELL', title: 'Cross-sell', description: 'Suggest other products alongside a selected product.', icon: ArrowLeftRight },
  { type: 'FBT', title: 'Frequently Bought Together', description: 'Find products that appeared together in past orders.', icon: ShoppingBasket },
  { type: 'BANNER', title: 'Banner', description: 'Highlight products that may be worth promoting.', icon: Megaphone }
];
function StoreRules({ state, workflow }: { state: GenerationState; workflow: RecommendationGeneration }) {
  return <section aria-labelledby="f06-policy-title" className="min-w-0 rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-sm sm:p-6">
    <div className="flex items-start justify-between gap-3"><div><p className="mb-2 text-xs font-semibold text-[#356B54]">Read-only · Your store</p><h2 id="f06-policy-title" className="text-xl font-semibold">Store Rules</h2><p className="mt-2 text-sm leading-6 text-[#6D7974]">These rules guide the suggestions. Each recommendation saves the rules applied when it is created.</p></div><button type="button" aria-label="Refresh store rules" className={miningButton} disabled={state.policyLoading || state.pending} onClick={() => void workflow.refreshPolicy()}><RefreshCw aria-hidden="true" className="h-4 w-4" /></button></div>
    {state.policyLoading || !state.policy && !state.policyError ? <p role="status" className="mt-4 text-sm text-[#6D7974]">Loading store rules...</p> : state.policyError ? <p role="alert" className="mt-4 break-words text-sm text-red-800">{state.policyError}</p> : state.policy && <div className="mt-5">
      <RecommendationRuleSummary policy={state.policy} />
      {state.result && state.result.policyVersion !== state.policy.version && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">This result used rules version {state.result.policyVersion}. The summary shows version {state.policy.version}. Open a recommendation’s details to see its saved rules.</p>}
      <details className="mt-5 border-t border-[#E7E2D8] pt-3 text-xs text-[#6D7974]"><summary className="cursor-pointer">Rule references</summary><p className="mt-2 break-words">Version {state.policy.version} · {state.policy.ruleVersion}</p></details>
    </div>}
  </section>;
}

function GenerationWorkspace() {
  const [tab, setTab] = useState<'generate' | 'recommendations'>('generate');
  const [workflow] = useState(() => new RecommendationGeneration());
  const state = useSyncExternalStore(workflow.subscribe, workflow.getSnapshot, workflow.getSnapshot);
  useEffect(() => { workflow.start(); return workflow.stop; }, [workflow]);
  const canGenerate = state.role === 'Merchandiser';
  if (!canGenerate && state.role !== 'Store Admin') return <div role="alert" className="rounded-xl bg-red-50 p-5 text-sm text-red-800">Recommendations are available to Merchandisers and Store Admins. Please sign in with an authorized account.</div>;
  const selectedRun = state.runs.find(run => run.runId === state.selectedRunId && run.status === 'COMPLETED');
  return <div className="mx-auto max-w-6xl space-y-6 text-[#191C1B]">
    <header>
      <h1 className="text-3xl font-semibold tracking-tight">Product Recommendations</h1>
      <p className="mt-2 max-w-3xl leading-7 text-[#6D7974]">Turn mining results into product suggestions you can review and use.</p>
      <p className="mt-3 text-sm font-semibold text-[#356B54]">{state.role}{!canGenerate && ' · Read-only access'}</p>
    </header>
    <div role="tablist" aria-label="Recommendation workspace" className="flex flex-wrap gap-2">
      <button type="button" id="f06-generate-tab" role="tab" aria-selected={tab === 'generate'} aria-controls="f06-generate-panel" disabled={state.pending} onClick={() => setTab('generate')} className={`${miningButton} aria-selected:border-[#356B54] aria-selected:bg-[#EDF5F0]`}>{canGenerate ? 'Create Recommendations' : 'Mining Results & Store Rules'}</button>
      <button type="button" id="f06-browse-tab" role="tab" aria-selected={tab === 'recommendations'} aria-controls="f06-browse-panel" disabled={state.pending} onClick={() => setTab('recommendations')} className={`${miningButton} aria-selected:border-[#356B54] aria-selected:bg-[#EDF5F0]`}>Browse Recommendations</button>
    </div>
    <div id="f06-generate-panel" role="tabpanel" aria-labelledby="f06-generate-tab" hidden={tab !== 'generate'} className="space-y-6">
      {canGenerate && <div className="rounded-xl bg-[#EDF5F0] px-5 py-4 text-sm leading-6 text-[#1E3A2F]"><strong>{state.result ? 'Your results are below.' : selectedRun ? 'Run selected. Choose formats and check your store rules.' : 'Start by choosing a completed mining run.'}</strong><p className="mt-1">Choose a run → Choose formats → Check store rules → See results</p></div>}
      <F06RunPicker state={state} workflow={workflow} />
      {canGenerate ? <form id="f06-generate-form" className="space-y-5" onSubmit={event => { event.preventDefault(); void workflow.generate(); }} aria-label="Generate recommendations">
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section aria-labelledby="f06-types-title" className="min-w-0 rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-sm sm:p-6">
            <h2 id="f06-types-title" className="text-xl font-semibold">2. Choose recommendation formats</h2>
            <p id="f06-types-help" className="mt-2 text-sm text-[#6D7974]">How would you like to present the product suggestions? Choose at least one.</p>
            <fieldset disabled={state.pending} aria-describedby="f06-types-help" className="mt-5 grid gap-3 sm:grid-cols-2">
              <legend className="sr-only">Recommendation formats</legend>
              {options.map(option => <label key={option.type} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${state.types.includes(option.type) ? 'border-[#356B54] bg-[#EDF5F0]' : 'border-[#E7E2D8]'}`}>
                <input type="checkbox" value={option.type} checked={state.types.includes(option.type)} onChange={() => workflow.toggleType(option.type)} className="mt-1 h-4 w-4 shrink-0 accent-[#356B54]" />
                <span className="min-w-0"><option.icon aria-hidden="true" className="mb-3 h-5 w-5 text-[#356B54]" /><span className="block text-sm font-semibold">{option.title}</span><span className="mt-2 block text-xs leading-5 text-[#6D7974]">{option.description}</span></span>
              </label>)}
            </fieldset>
            {!state.types.length && <p role="alert" className="mt-3 text-sm text-amber-900">Select at least one recommendation format.</p>}
          </section>
          <StoreRules state={state} workflow={workflow} />
        </div>
        <div className="rounded-2xl border border-[#CADACF] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4"><div className="min-w-0 text-sm"><p className="font-semibold">{selectedRun ? `Run #${selectedRun.runId} · ${selectedRun.algorithm === 'HUI_MINER' ? 'HUI-Miner' : 'EFIM'}` : 'Choose a completed run to continue'}</p><p className="mt-2 text-[#6D7974]">{state.types.length ? state.types.map(recommendationLabel).join(' · ') : 'No formats selected'}</p></div>
            <button type="submit" className={`${miningPrimaryButton} w-full justify-center sm:w-auto`} disabled={state.pending || !selectedRun || !state.types.length || state.runsLoading || state.historyLoading}>
              {state.pending ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Sparkles aria-hidden="true" className="mr-2 h-4 w-4" />}{state.pending ? 'Generating recommendations...' : 'Generate recommendations'}
            </button>
          </div>
          {state.pending && <p role="status" className="mt-3 text-sm text-[#6D7974]">Generation is in progress. Keep this page open to see the result.</p>}
          {state.generationError && <p role="alert" className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-red-50 p-4 text-sm text-red-800">{state.generationError}</p>}
          <p className="mt-4 text-xs leading-5 text-[#6D7974]">Uses the selected run’s saved shopping data. Suggestions are not automatically approved or published.</p>
        </div>
      </form> : <StoreRules state={state} workflow={workflow} />}
      {canGenerate && state.result && <F06GenerationResult result={state.result} types={state.resultTypes} onViewRecommendations={() => { setTab('recommendations'); document.getElementById('f06-browse-tab')?.focus(); }} />}
    </div>
    {tab === 'recommendations' && <div id="f06-browse-panel" role="tabpanel" aria-labelledby="f06-browse-tab"><F06DashboardView /></div>}
  </div>;
}

export function F06WorkspaceView() {
  const user = useSyncExternalStore(authService.subscribe, authService.getCurrentUser, authService.getCurrentUser);
  if (user?.role === 'Store Admin') return <div className="mx-auto max-w-6xl space-y-6 text-[#191C1B]">
    <header><h1 className="text-3xl font-semibold tracking-tight">Product Recommendations</h1><p className="mt-2 text-[#6D7974]">Monitor product suggestions and their current status.</p></header>
    <F06DashboardView key={`${user.id}:${user.storeId ?? ''}:${authService.getSessionId()}`} />
  </div>;
  return <GenerationWorkspace />;
}
