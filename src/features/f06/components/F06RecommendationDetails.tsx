import { useEffect, useRef, type ReactNode } from 'react';
import { CheckCircle2, Clock3, RefreshCw, X, XCircle } from 'lucide-react';
import { miningButton, miningDate } from '../../f05/f05.display';
import type { RecEligibility, RecView } from '../f06.types';
import type { RecommendationBrowseState, RecommendationBrowser } from '../f06.browse';
import { RecommendationBadge, RecommendationFields, RecommendationProduct, RecommendationRuleSummary, recommendationLabel as label, recommendationPercent as percent, recommendationValue as value, recommendationYesNo as yesNo, recommendationReadiness, recommendationAvailability } from './F06ReadShared';

export function F06EligibilityCheck({ title, check, names = {} }: { title: string; check: RecEligibility; names?: Record<number, string> }) {
  return <section className="min-w-0 rounded-xl border border-[#E7E2D8] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="font-semibold">{title}</h4><RecommendationBadge status={check.status} /></div>
    <p className="mt-2 text-sm text-[#57534E]">{recommendationAvailability(check.status)}</p>
    <p className="mt-2 break-words text-xs leading-5 text-[#6D7974]">Checked {miningDate(check.checkedAt)} · Store date {check.asOfDate} · {check.timeZone}</p>
    {check.warnings.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-4 text-sm leading-6 text-amber-900">{check.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
    <h5 className="mb-2 mt-4 text-xs font-semibold text-[#6D7974]">Product availability ({check.products.length})</h5>
    <ul className="grid max-h-96 gap-3 overflow-y-auto sm:grid-cols-2">{check.products.map(product => <li key={product.productId} className="min-w-0 rounded-xl bg-[#FAF8F5] p-3 text-sm">
      <p className="mb-2 break-words"><RecommendationProduct id={product.productId} names={names} /></p><RecommendationBadge status={product.status} />
      <p className="mt-2 text-xs leading-5">{label(product.productStatus)} · Sellable units: <strong>{value(product.sellableQuantity)}</strong></p><p className="mt-1 text-xs leading-5 text-[#6D7974]">Expiry check: {label(product.expiryStatus)}</p>
      {product.warnings.length > 0 && <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-900">{product.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
      <details className="mt-2 text-xs text-[#6D7974]"><summary className="cursor-pointer">Expiry details</summary><p className="mt-2">Priority: {value(product.expiryPriorityScore)} · Reminder days: {value(product.expiryPushDays)}</p></details>
    </li>)}</ul>
    <details className="mt-3 text-xs text-[#6D7974]"><summary className="cursor-pointer">Technical stock reference</summary><p className="mt-2 break-all">{check.fingerprint}</p></details>
  </section>;
}

export function F06RecommendationDetailContent({ item, names = {} }: { item: RecView; names?: Record<number, string> }) {
  const confidenceApplies = item.type === 'CROSS_SELL' || item.evidence.confidence !== null;
  const shoppingFields: [string, ReactNode][] = [['Utility Score', value(item.utility)], ['Shopping evidence', label(item.evidence.status)], ['Historical transactions', value(item.evidence.totalTransactions)], ['Bought together (orders)', value(item.evidence.supportCount)], ['Frequency', percent(item.evidence.supportRatio)]];
  if (confidenceApplies) shoppingFields.push(['Starting-product transactions', value(item.evidence.anchorSupportCount)], ['Confidence', percent(item.evidence.confidence)]);
  return <div className="space-y-7">
    <section aria-label="Recommendation summary" className="rounded-xl bg-[#FAF8F5] p-4 sm:p-5">
      <h3 className="text-lg font-semibold">Recommendation Overview</h3><p className="mt-2 text-sm text-[#6D7974]">{label(item.type)} · Recommendation #{item.recommendationId}</p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        <div><dt className="mb-2 text-xs text-[#6D7974]">Review status</dt><dd><RecommendationBadge status={item.reviewStatus} /></dd></div>
        <div><dt className="mb-2 text-xs text-[#6D7974]">Availability</dt><dd><RecommendationBadge status={item.currentEligibility.status} /></dd></div>
        <div><dt className="mb-2 text-xs text-[#6D7974]">Ready status</dt><dd data-readiness={item.readyForConsumption ? 'ready' : 'not-ready'} className={`font-semibold ${item.readyForConsumption ? 'text-emerald-800' : 'text-[#57534E]'}`}>{item.readyForConsumption ? 'Ready to use' : 'Not ready'}</dd></div>
      </dl>
      <p className="mt-4 rounded-lg border border-[#E7E2D8] bg-white p-3 text-sm leading-6">{recommendationReadiness(item)}</p>
      <p className="mt-3 text-xs leading-5 text-[#6D7974]">Ready to use means approved and still eligible. Approval alone is not enough: product availability can change after review.</p>
      <h4 className="mt-5 text-sm font-semibold">Products in this suggestion</h4><ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{item.productIds.map(id => <li key={id} className="min-w-0 break-words rounded-lg border border-[#E7E2D8] bg-white p-3"><RecommendationProduct id={id} names={names} /></li>)}</ul>
      {item.type === 'CROSS_SELL' && <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><div><h4 className="text-xs text-[#6D7974]">Starting product (anchor)</h4><p className="mt-2"><RecommendationProduct id={item.anchorProductId} names={names} /></p></div>
        <div><h4 className="text-xs text-[#6D7974]">Products to suggest alongside it</h4><ul aria-label="Suggested cross-sell targets" className="mt-2 space-y-1">{item.productIds.filter(id => id !== item.anchorProductId).map(id => <li key={id}><RecommendationProduct id={id} names={names} /></li>)}</ul></div></div>}
    </section>
    <section data-evidence-status={item.evidence.status}><h3 className="text-lg font-semibold">Why This Was Suggested</h3><p className="mb-4 mt-2 text-sm leading-6 text-[#6D7974]">This product group came from past shopping patterns. Its Utility Score helps compare suggestions from the same data; it is not revenue, a price or purchase probability.</p>
      <div className="rounded-xl border border-[#E7E2D8] p-4"><RecommendationFields fields={shoppingFields} /></div>
      <p className="mt-3 text-xs leading-5 text-[#6D7974]">Frequency is the share of past transactions containing this group. Confidence, where applicable, describes co-purchases relative to the starting product. These describe past behaviour, not guaranteed future sales. N/A means not available or not applicable.</p>
      <details className="mt-3 text-sm"><summary className="cursor-pointer font-medium">Full system explanation</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#57534E]">{item.explanation.map((line, index) => <li key={index} className="break-words">{line}</li>)}</ul></details>
    </section>
    <section><h3 className="text-lg font-semibold">Can This Be Used Now?</h3><p className="mb-4 mt-2 text-sm leading-6 text-[#6D7974]">Availability includes product status, sellable stock, expiry and required information. An approved suggestion can become not eligible later.</p>
      <F06EligibilityCheck title="Current availability" check={item.currentEligibility} names={names} />
      <div className="my-4"><RecommendationFields fields={[["Inventory changed", yesNo(item.inventoryChanged)]]} /></div>
      <p className="text-xs leading-5 text-[#6D7974]">The check can change with stock, product information or the store date. No inventory is reserved.</p>
    </section>
    <section><h3 className="mb-4 text-lg font-semibold">Rules Applied</h3><RecommendationRuleSummary policy={item.policy} />
      <p className="mt-3 text-xs leading-5 text-[#6D7974]">These are the saved rules for this suggestion. Later store rule changes do not rewrite it.</p>
      <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium">Rule and record references</summary><div className="mt-3"><RecommendationFields fields={[
        ['Rule version', item.ruleVersion], ['Policy version', value(item.policy.version)], ['Recommendation version', value(item.version)], ['Created', miningDate(item.createdAt)]
      ]} /></div></details>
    </section>
    <section><h3 className="text-lg font-semibold">Additional Evidence</h3><p className="mt-2 text-sm leading-6 text-[#6D7974]">Saved analyses and creation-time stock checks explain where this suggestion came from. They are separate from today’s availability.</p>
      <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium">Availability when created</summary><div className="mt-3"><F06EligibilityCheck title="Availability at creation" check={item.generationEligibility} names={names} /></div></details>
      <div className="mt-3 space-y-3">{item.sources.map(source => <details key={`${source.runId}:${source.patternId}`} className="rounded-xl border border-[#E7E2D8] p-4">
        <summary className="cursor-pointer text-sm font-semibold">Mining run #{source.runId} · {source.algorithm === 'HUI_MINER' ? 'HUI-Miner' : source.algorithm} · {source.analysisDate}</summary><div className="mt-4"><RecommendationFields fields={[
          ['Shopping data snapshot', `#${source.snapshotId}`], ['Analysis date', source.analysisDate], ['Product combination', `Pattern #${source.patternId}`], ['Utility Score', value(source.patternUtility)]
        ]} /><details className="mt-4 text-xs"><summary className="cursor-pointer font-medium">Technical source references</summary><div className="mt-3"><RecommendationFields fields={[
          ['Request', `#${source.requestId}`], ['Library version', source.libraryVersion], ['Conversion version', source.conversionVersion], ['Minimum utility mode', source.minUtilMode],
          ['Minimum utility value', value(source.minUtilValue)], ['SPMF threshold', value(source.minUtilSpmf)], ['Effective minimum utility', value(source.effectiveMinUtility)],
          ['Input hash', source.inputHash], ['Source hash', source.sourceHash], ['Matrix hash', source.matrixHash]
        ]} /></div></details></div></details>)}</div>{!item.sources.length && <p className="mt-2 text-sm text-[#6D7974]">No source records returned.</p>}
    </section>
    <section><h3 className="mb-4 text-lg font-semibold">Review History</h3><RecommendationFields fields={[
      ['Last reviewed by', item.reviewedBy === null ? 'N/A' : `User #${item.reviewedBy}`], ['Last reviewed at', item.reviewedAt === null ? 'N/A' : miningDate(item.reviewedAt)], ['Review reason', value(item.reviewReason)]
    ]} />{!item.reviewHistory.length ? <p className="mt-4 rounded-xl bg-[#FAF8F5] p-4 text-sm text-[#6D7974]">No review decision has been recorded yet.</p> : <ol className="ml-2 mt-5 border-l border-[#E7E2D8]">{item.reviewHistory.map((review, index) => {
      const Icon = review.newStatus === 'APPROVED' ? CheckCircle2 : review.newStatus === 'REJECTED' ? XCircle : Clock3;
      return <li key={`${review.resultingVersion}:${index}`} className="relative pb-6 pl-6 last:pb-0"><span className="absolute -left-2.5 top-0 bg-white"><Icon aria-hidden="true" className="h-5 w-5 text-[#356B54]" /></span>
        <p className="text-sm font-semibold">{label(review.oldStatus)} → {label(review.newStatus)}</p><p className="mt-2 text-xs text-[#6D7974]">User #{review.reviewedBy} · <time dateTime={review.reviewedAt}>{miningDate(review.reviewedAt)}</time> · Version {review.resultingVersion}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm">{review.reason}</p><details className="mt-3"><summary className="cursor-pointer text-sm font-medium">Stock check at review</summary><div className="mt-3"><F06EligibilityCheck title="Stock at the time of review" check={review.eligibilityCheck} names={names} /></div></details>
      </li>;
    })}</ol>}</section>
  </div>;
}

export function F06RecommendationDetails({ state, workflow }: { state: RecommendationBrowseState; workflow: RecommendationBrowser }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = dialog.current;
    node?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { node?.close(); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={dialog} aria-labelledby="f06-detail-title" aria-modal="true" onCancel={event => { event.preventDefault(); workflow.closeDetail(); }} className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-3xl overflow-y-auto border-l border-[#E7E2D8] bg-white p-0 text-[#191C1B] shadow-xl backdrop:bg-black/30">
    <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#E7E2D8] bg-white p-5 sm:p-6"><div><p className="text-xs font-semibold text-[#356B54]">Product suggestion · Read-only details</p><h2 id="f06-detail-title" className="mt-1 text-xl font-semibold">Recommendation #{state.detailId}</h2></div><button type="button" aria-label="Close recommendation details" autoFocus className="rounded-lg p-2 text-[#57534E] hover:bg-[#EDF5F0] focus-visible:outline-2" onClick={workflow.closeDetail}><X aria-hidden="true" className="h-5 w-5" /></button></div>
    <div className="space-y-5 p-5 sm:p-6"><button type="button" className={miningButton} disabled={state.detailLoading} onClick={() => void workflow.openDetail(state.detailId!)}><RefreshCw aria-hidden="true" className="mr-2 inline h-4 w-4" />Refresh details</button>
      {state.detailLoading ? <p role="status" className="text-sm text-[#6D7974]">Loading recommendation details...</p> : state.detailError ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{state.detailError}</p> : state.detail && <>
        {state.namesLoading && <p role="status" className="text-xs text-[#6D7974]">Loading product names...</p>}
        {state.namesUnavailable && <p className="text-xs text-[#6D7974]">Some product names are unavailable. Product references are shown instead.</p>}
        <F06RecommendationDetailContent item={state.detail} names={state.names} />
      </>}
    </div>
  </dialog>;
}
