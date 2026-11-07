import { useEffect, useState, useSyncExternalStore } from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { miningButton, miningPrimaryButton } from '../../f05/f05.display';
import { RecommendationGeneration } from '../f06.generate';
import type { RecType } from '../f06.types';
import { F06GenerationResult } from './F06GenerationResult';
import { F06RunPicker } from './F06RunPicker';
import { F06DashboardView } from './F06DashboardView';

const options: { type: RecType; title: string; description: string }[] = [
  { type: 'BUNDLE', title: 'Bundle', description: 'Product groups within the configured bundle size.' },
  { type: 'CROSS_SELL', title: 'Cross-sell', description: 'Anchor-based suggestions that meet confidence rules.' },
  { type: 'FBT', title: 'Frequently bought together', description: 'Product groups that meet both support thresholds.' },
  { type: 'BANNER', title: 'Banner', description: 'Source product groups, including single products.' }
];

export function F06WorkspaceView() {
  const [tab, setTab] = useState<'generate' | 'recommendations'>('generate');
  const [workflow] = useState(() => new RecommendationGeneration());
  const state = useSyncExternalStore(workflow.subscribe, workflow.getSnapshot, workflow.getSnapshot);
  useEffect(() => { workflow.start(); return workflow.stop; }, [workflow]);
  const canGenerate = state.role === 'Merchandiser';
  if (!canGenerate && state.role !== 'Store Admin') return <div role="alert" className="rounded-xl bg-red-50 p-5 text-sm text-red-800">Recommendations are available to Merchandisers and Store Admins. Please sign in with an authorized account.</div>;
  const selectedRun = state.runs.find(run => run.runId === state.selectedRunId && run.status === 'COMPLETED');
  return <div className="mx-auto max-w-6xl space-y-6 text-[#191C1B]">
    <header>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#356B54]">Product analytics</p>
      <h1 className="text-3xl font-semibold">Recommendations</h1>
      <p className="mt-2 text-[#6D7974]">{tab === 'recommendations' ? 'Explore recommendations, historical evidence and current eligibility.' : canGenerate ? 'Create review candidates from a completed mining run.' : 'Inspect mining sources and current rules for your Store.'}</p>
      <p className="mt-3 text-sm font-semibold text-[#356B54]">{state.role}{!canGenerate && ' · Read-only access'}</p>
    </header>
    <div role="tablist" aria-label="Recommendation workspace" className="flex flex-wrap gap-2">
      <button type="button" id="f06-generate-tab" role="tab" aria-selected={tab === 'generate'} aria-controls="f06-generate-panel" disabled={state.pending} onClick={() => setTab('generate')} className={`${miningButton} aria-selected:border-[#356B54] aria-selected:bg-[#EDF5F0]`}>{canGenerate ? 'Generate' : 'Sources & policy'}</button>
      <button type="button" id="f06-browse-tab" role="tab" aria-selected={tab === 'recommendations'} aria-controls="f06-browse-panel" disabled={state.pending} onClick={() => setTab('recommendations')} className={`${miningButton} aria-selected:border-[#356B54] aria-selected:bg-[#EDF5F0]`}>Recommendations</button>
    </div>
    <div id="f06-generate-panel" role="tabpanel" aria-labelledby="f06-generate-tab" hidden={tab !== 'generate'} className="space-y-6">
    <F06RunPicker state={state} workflow={workflow} />
    <div className={`grid items-start gap-6 ${canGenerate ? 'lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]' : ''}`}>
      {canGenerate && <section aria-labelledby="f06-types-title" className="min-w-0 rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-sm sm:p-6">
        <h2 id="f06-types-title" className="text-xl font-semibold">2. Recommendation types</h2>
        <p id="f06-types-help" className="mt-2 text-sm text-[#6D7974]">Choose one or more types for the selected run.</p>
        <form className="mt-5" onSubmit={event => { event.preventDefault(); void workflow.generate(); }} aria-label="Generate recommendations">
          <fieldset disabled={state.pending} aria-describedby="f06-types-help" className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Recommendation types</legend>
            {options.map(option => <label key={option.type} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${state.types.includes(option.type) ? 'border-[#356B54] bg-[#EDF5F0]' : 'border-[#E7E2D8]'}`}>
              <input type="checkbox" value={option.type} checked={state.types.includes(option.type)} onChange={() => workflow.toggleType(option.type)} className="mt-1 h-4 w-4 shrink-0 accent-[#356B54]" />
              <span><span className="block text-sm font-semibold">{option.title}</span><span className="mt-1 block text-xs leading-5 text-[#6D7974]">{option.description}</span><span className="mt-2 block text-[10px] font-semibold tracking-wide text-[#356B54]">{option.type}</span></span>
            </label>)}
          </fieldset>
          {!state.types.length && <p role="alert" className="mt-3 text-sm text-amber-900">Select at least one recommendation type.</p>}
          <div className="mt-5 rounded-xl bg-[#FAF8F5] p-4 text-sm text-[#6D7974]">{selectedRun ? <>Selected: <span className="font-semibold text-[#191C1B]">Run #{selectedRun.runId} · {selectedRun.algorithm === 'HUI_MINER' ? 'HUI-Miner' : 'EFIM'}</span> · Snapshot #{selectedRun.snapshotId}</> : 'Choose a completed mining run above to continue.'}</div>
          <button type="submit" className={`${miningPrimaryButton} mt-5 w-full justify-center sm:w-auto`} disabled={state.pending || !selectedRun || !state.types.length || state.runsLoading || state.historyLoading}>
            {state.pending ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Sparkles aria-hidden="true" className="mr-2 h-4 w-4" />}{state.pending ? 'Generating recommendations...' : 'Generate recommendations'}
          </button>
          {state.pending && <p role="status" className="mt-3 text-sm text-[#6D7974]">Generation is in progress. Keep this page open to see the result.</p>}
          {state.generationError && <p role="alert" className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-red-50 p-4 text-sm text-red-800">{state.generationError}</p>}
          <p className="mt-4 text-xs leading-5 text-[#6D7974]">Uses existing frozen evidence. Recommendations are not automatically approved.</p>
        </form>
      </section>}
      <section aria-labelledby="f06-policy-title" className="min-w-0 rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="f06-policy-title" className="text-lg font-semibold">Current policy</h2><p className="mt-1 text-xs text-[#6D7974]">Read-only · Your Store</p></div><button type="button" aria-label="Refresh policy" className={miningButton} disabled={state.policyLoading || state.pending} onClick={() => void workflow.refreshPolicy()}><RefreshCw aria-hidden="true" className="h-4 w-4" /></button></div>
        {state.policyLoading || !state.policy && !state.policyError ? <p role="status" className="mt-4 text-sm text-[#6D7974]">Loading policy...</p> : state.policyError ? <p role="alert" className="mt-4 break-words text-sm text-red-800">{state.policyError}</p> : state.policy && <>
          <dl className="mt-5 space-y-3 text-sm">{[
            ['Policy version', state.policy.version], ['Maximum bundle size', state.policy.maxBundleSize],
            ['Minimum support count', state.policy.minSupportCount], ['Minimum support ratio', state.policy.minSupportRatio],
            ['Minimum confidence', state.policy.minConfidence], ['Minimum sellable quantity', state.policy.minimumSellableQuantity]
          ].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-x-4 gap-y-1"><dt className="text-[#6D7974]">{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl>
          <p className="mt-5 break-words border-t border-[#E7E2D8] pt-3 text-xs text-[#6D7974]">{state.policy.ruleVersion}</p>
        </>}
      </section>
    </div>
    {canGenerate && state.result && <F06GenerationResult result={state.result} types={state.resultTypes} />}
    </div>
    {tab === 'recommendations' && <div id="f06-browse-panel" role="tabpanel" aria-labelledby="f06-browse-tab"><F06DashboardView /></div>}
  </div>;
}
