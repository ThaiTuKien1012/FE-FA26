import { useEffect, useRef } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { miningButton, miningDate } from '../../f05/f05.display';
import type { RecEligibility, RecView } from '../f06.types';
import type { RecommendationBrowseState, RecommendationBrowser } from '../f06.browse';
import { RecommendationBadge, RecommendationFields, RecommendationProduct, recommendationValue as value, recommendationYesNo as yesNo } from './F06ReadShared';

export function F06EligibilityCheck({ title, check }: { title: string; check: RecEligibility }) {
  return <section className="min-w-0 rounded-xl border border-[#E7E2D8] p-4">
    <h3 className="font-semibold">{title}</h3><div className="mt-3"><RecommendationBadge status={check.status} /></div>
    <p className="mt-3 break-words text-xs text-[#6D7974]">Checked: {miningDate(check.checkedAt)} · Store date {check.asOfDate} · {check.timeZone}</p>
    {check.warnings.length > 0 && <ul className="mt-3 space-y-1 text-xs text-amber-900">{check.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
    <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><caption className="sr-only">{title} product evidence</caption>
      <thead className="bg-[#FAF8F5] text-[#6D7974]"><tr>{['Product', 'Product status', 'Sellable quantity', 'Eligibility', 'Expiry score / status', 'Push days'].map(label => <th scope="col" className="p-2 font-medium" key={label}>{label}</th>)}</tr></thead>
      <tbody>{check.products.map(product => <tr key={product.productId} className="border-t border-[#E7E2D8] align-top"><td className="p-2">#{product.productId}</td><td className="p-2">{product.productStatus}</td><td className="p-2">{value(product.sellableQuantity)}</td><td className="p-2"><RecommendationBadge status={product.status} /></td><td className="p-2">{value(product.expiryPriorityScore)}<span className="mt-1 block">{product.expiryStatus}</span>{product.warnings.map((warning, index) => <span className="mt-1 block text-amber-900" key={index}>{warning}</span>)}</td><td className="p-2">{value(product.expiryPushDays)}</td></tr>)}</tbody>
    </table></div>
    <details className="mt-3 text-xs text-[#6D7974]"><summary className="cursor-pointer">Inventory fingerprint</summary><p className="mt-2 break-all">{check.fingerprint}</p></details>
  </section>;
}

export function F06RecommendationDetailContent({ item, names = {} }: { item: RecView; names?: Record<number, string> }) {
  return <div className="space-y-6">
    <div className="flex flex-wrap gap-2"><RecommendationBadge status={item.type} /><RecommendationBadge status={item.reviewStatus} /><RecommendationBadge status={item.currentEligibility.status} /></div>
    <div className="rounded-xl bg-[#FAF8F5] p-4"><RecommendationFields fields={[
      ['Review status', item.reviewStatus], ['Current eligibility', item.currentEligibility.status],
      ['Ready for consumption', yesNo(item.readyForConsumption)], ['Inventory changed', yesNo(item.inventoryChanged)]
    ]} /><p className="mt-4 text-xs leading-5 text-[#6D7974]">Approval and current readiness are separate. Eligibility can change after generation or review. This check does not reserve inventory.</p></div>
    <section aria-label="Recommendation products"><h3 className="font-semibold">Products</h3><ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{item.productIds.map(id => <li key={id} className="min-w-0 break-words rounded-lg border border-[#E7E2D8] p-3"><RecommendationProduct id={id} names={names} /></li>)}</ul>
      {item.type === 'CROSS_SELL' && <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><div><h4 className="text-xs text-[#6D7974]">Anchor product</h4><p className="mt-2"><RecommendationProduct id={item.anchorProductId} names={names} /></p></div>
        <div><h4 className="text-xs text-[#6D7974]">Suggested targets</h4><ul aria-label="Suggested cross-sell targets" className="mt-2 space-y-1">{item.productIds.filter(id => id !== item.anchorProductId).map(id => <li key={id}><RecommendationProduct id={id} names={names} /></li>)}</ul></div></div>}
    </section>
    <section><h3 className="font-semibold">Historical evidence</h3><p className="mb-4 mt-2 text-xs leading-5 text-[#6D7974]">Utility is the frozen weighted utility of the source. It is not revenue or purchase probability. Ratios are server values.</p>
      <RecommendationFields fields={[
        ['Historical utility', value(item.utility)], ['Evidence status', item.evidence.status], ['Total transactions', value(item.evidence.totalTransactions)],
        ['Support count', value(item.evidence.supportCount)], ['Support ratio', value(item.evidence.supportRatio)],
        ['Anchor support count', value(item.evidence.anchorSupportCount)], ['Confidence', value(item.evidence.confidence)]
      ]} />
    </section>
    <F06EligibilityCheck title="Current eligibility" check={item.currentEligibility} />
    <F06EligibilityCheck title="Generation eligibility" check={item.generationEligibility} />
    <section><h3 className="mb-4 font-semibold">Captured rule &amp; policy</h3><RecommendationFields fields={[
      ['Rule version', item.ruleVersion], ['Policy version', value(item.policy.version)], ['Recommendation version', value(item.version)],
      ['Snapshot', `#${item.snapshotId}`], ['Maximum bundle size', value(item.policy.maxBundleSize)], ['Minimum support count', value(item.policy.minSupportCount)],
      ['Minimum support ratio', value(item.policy.minSupportRatio)], ['Minimum confidence', value(item.policy.minConfidence)],
      ['Minimum sellable quantity', value(item.policy.minimumSellableQuantity)], ['Created', miningDate(item.createdAt)]
    ]} /></section>
    <section><h3 className="font-semibold">Source mining runs</h3><div className="mt-3 space-y-3">{item.sources.map(source => <details key={`${source.runId}:${source.patternId}`} className="rounded-xl border border-[#E7E2D8] p-4">
      <summary className="cursor-pointer text-sm font-semibold">Run #{source.runId} · {source.algorithm} · Pattern #{source.patternId}</summary><div className="mt-4"><RecommendationFields fields={[
        ['Request', `#${source.requestId}`], ['Snapshot', `#${source.snapshotId}`], ['Analysis date', source.analysisDate],
        ['Library version', source.libraryVersion], ['Conversion version', source.conversionVersion], ['Minimum utility mode', source.minUtilMode],
        ['Minimum utility value', value(source.minUtilValue)], ['SPMF threshold', value(source.minUtilSpmf)],
        ['Effective minimum utility', value(source.effectiveMinUtility)], ['Pattern utility', value(source.patternUtility)],
        ['Input hash', source.inputHash], ['Source hash', source.sourceHash], ['Matrix hash', source.matrixHash]
      ]} /></div></details>)}</div>{!item.sources.length && <p className="mt-2 text-sm text-[#6D7974]">No source records returned.</p>}</section>
    <section><h3 className="font-semibold">Explanation</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#57534E]">{item.explanation.map((line, index) => <li key={index} className="break-words">{line}</li>)}</ul></section>
    <section><h3 className="mb-4 font-semibold">Review history</h3><RecommendationFields fields={[
      ['Last reviewed by', item.reviewedBy === null ? '—' : `User #${item.reviewedBy}`], ['Last reviewed at', item.reviewedAt === null ? '—' : miningDate(item.reviewedAt)], ['Review reason', value(item.reviewReason)]
    ]} />{!item.reviewHistory.length ? <p className="mt-4 text-sm text-[#6D7974]">No review decisions recorded.</p> : <ol className="mt-4 space-y-3">{item.reviewHistory.map((review, index) => <li key={`${review.resultingVersion}:${index}`} className="rounded-xl border border-[#E7E2D8] p-4">
      <p className="text-sm font-semibold">{review.oldStatus} → {review.newStatus}</p><p className="mt-2 text-xs text-[#6D7974]">User #{review.reviewedBy} · {miningDate(review.reviewedAt)} · Version {review.resultingVersion}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm">{review.reason}</p><details className="mt-3"><summary className="cursor-pointer text-sm font-medium">Eligibility at review</summary><div className="mt-3"><F06EligibilityCheck title="Historical review check" check={review.eligibilityCheck} /></div></details>
    </li>)}</ol>}</section>
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
    <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#E7E2D8] bg-white p-5 sm:p-6"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#356B54]">Read-only details</p><h2 id="f06-detail-title" className="mt-1 text-xl font-semibold">Recommendation #{state.detailId}</h2></div><button type="button" aria-label="Close recommendation details" autoFocus className="rounded-lg p-2 text-[#57534E] hover:bg-[#EDF5F0] focus-visible:outline-2" onClick={workflow.closeDetail}><X aria-hidden="true" className="h-5 w-5" /></button></div>
    <div className="space-y-5 p-5 sm:p-6"><button type="button" className={miningButton} disabled={state.detailLoading} onClick={() => void workflow.openDetail(state.detailId!)}><RefreshCw aria-hidden="true" className="mr-2 inline h-4 w-4" />Refresh details</button>
      {state.detailLoading ? <p role="status" className="text-sm text-[#6D7974]">Loading recommendation details...</p> : state.detailError ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{state.detailError}</p> : state.detail && <>
        {state.namesLoading && <p role="status" className="text-xs text-[#6D7974]">Loading product names...</p>}
        {state.namesUnavailable && <p className="text-xs text-[#6D7974]">Some product names are unavailable. Product IDs are retained.</p>}
        <F06RecommendationDetailContent item={state.detail} names={state.names} />
      </>}
    </div>
  </dialog>;
}
