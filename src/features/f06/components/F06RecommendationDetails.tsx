import { storeAdminCopy as copy, storeAdminMessage } from '../../../utils/storeAdminCopy';
import { formatDate } from '../../../utils/dateTime';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Clock3, RefreshCw, X, XCircle } from 'lucide-react';
import { miningButton, miningDate } from '../../f05/f05.display';
import type { EligibilityEvidence, RecView } from '../f06.types';
import type { RecommendationBrowseState, RecommendationBrowser } from '../f06.browse';
import { F06ProductImage } from './F06ProductImage';
import { crossSellDirection, recommendationRationale } from '../f06.presentation';
import { F06ReviewForm } from './F06ReviewForm';
import { friendlyAnalysisText } from '../../f05/f05.presentation';
import { RecommendationBadge, RecommendationFields, RecommendationProduct, RecommendationRuleSummary, recommendationLabel as label, recommendationPercent as percent, recommendationValue as value, recommendationYesNo as yesNo, recommendationReadiness, recommendationAvailability, recommendationNumber } from './F06ReadShared';

export function F06EligibilityCheck({ title, check, names = {}, technical = true }: { title: string; check: EligibilityEvidence; names?: Record<number, string>; technical?: boolean }) {
  return <section className="min-w-0 rounded-xl border border-[#E7E2D8] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="font-semibold">{title}</h4><RecommendationBadge status={check.status} /></div>
    <p className="mt-2 text-sm text-[#57534E]">{recommendationAvailability(check.status)}</p>
    <p className="mt-2 break-words text-xs leading-5 text-[#6D7974]">Checked {miningDate(check.checkedAt)} · Store date {formatDate(check.asOfDate)} · {check.timeZone}</p>
    {check.warnings.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-4 text-sm leading-6 text-amber-900">{check.warnings.map((warning, index) => <li key={index}>{friendlyAnalysisText(warning)}</li>)}</ul>}
    <h5 className="mb-2 mt-4 text-xs font-semibold text-[#6D7974]">Product availability ({check.products.length})</h5>
    <ul className="grid max-h-96 gap-3 overflow-y-auto sm:grid-cols-2">{check.products.map(product => <li key={product.productId} className="min-w-0 rounded-xl bg-[#FAF8F5] p-3 text-sm">
      <p className="mb-2 break-words"><RecommendationProduct id={product.productId} names={names} /></p><RecommendationBadge status={product.status} />
      <p className="mt-2 text-xs leading-5">{label(product.productStatus)} · Sellable units: <strong>{value(product.sellableQuantity)}</strong></p><p className="mt-1 text-xs leading-5 text-[#6D7974]">Expiry check: {label(product.expiryStatus)}</p>
      {product.warnings.length > 0 && <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-900">{product.warnings.map((warning, index) => <li key={index}>{friendlyAnalysisText(warning)}</li>)}</ul>}
      <details className="mt-2 text-xs text-[#6D7974]"><summary className="cursor-pointer">Expiry details</summary><p className="mt-2">{check.scoringVersion ? 'Expiry risk score' : 'Legacy expiry priority'}: {value(product.expiryPriorityScore)}{'expiryPushDays' in product && <> · Historical reminder days: {value(product.expiryPushDays)}</>}</p></details>
    </li>)}</ul>
    {technical && <details className="mt-3 text-xs text-[#6D7974]"><summary className="cursor-pointer">Technical stock reference</summary><p className="mt-2">Scoring version: {check.scoringVersion ?? 'Legacy V1 (recorded evidence)'}</p><p className="mt-2 break-all">{check.fingerprint}</p></details>}
  </section>;
}

function SourceDetails({ children }: { children: ReactNode }) {
  return <details className="rounded-xl border border-[#E7E2D8] p-4"><summary className="cursor-pointer text-sm font-semibold text-[#356B54]">Source Details</summary><div className="mt-4 space-y-5">{children}</div></details>;
}

export function F06RecommendationDetailContent({ item, names = {}, images = {}, compact = false, technical = true, reviewContent }: { compact?:boolean;technical?:boolean;item:RecView;names?:Record<number,string>;images?:Record<number,string>;reviewContent?:ReactNode }) {
  const direction = crossSellDirection(item);
  const confidenceApplies = direction !== null;
  const shoppingFields: [string, ReactNode][] = [['Historical utility', compact ? recommendationNumber(item.utility) : value(item.utility)], ['Shopping evidence', label(item.evidence.status)], ['Historical transactions', value(item.evidence.totalTransactions)], ['Bought together (orders)', value(item.evidence.supportCount)], ['Frequency', percent(item.evidence.supportRatio)]];
  if (confidenceApplies) shoppingFields.push(['Starting-product transactions', value(item.evidence.anchorSupportCount)], ['Confidence', percent(item.evidence.confidence)]);
  return <div className="space-y-7">
    <section aria-label="Recommendation summary" className="rounded-xl bg-[#FAF8F5] p-4 sm:p-5">
      <h3 className="text-lg font-semibold">Products</h3><p className="mt-2 text-sm text-[#6D7974]">{label(item.type)} · Recommendation #{item.recommendationId}</p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><dt className="mb-2 text-xs text-[#6D7974]">Review status</dt><dd><RecommendationBadge status={item.reviewStatus} /></dd></div>
        <div><dt className="mb-2 text-xs text-[#6D7974]">Availability</dt><dd><RecommendationBadge status={item.currentEligibility.status} /></dd></div>

      </dl>
      <p data-readiness={item.readyForConsumption?'ready':'not-ready'} className="mt-4 rounded-lg border border-[#E7E2D8] bg-white p-3 text-sm leading-6">{recommendationReadiness(item)}</p>
      <p className="mt-3 text-xs leading-5 text-[#6D7974]">Approval does not publish a promotion or reserve stock. Availability may change later.</p>
      <ul aria-label="Products in this suggestion" className="mt-5 grid max-h-80 gap-3 overflow-y-auto text-sm sm:grid-cols-2">{item.productIds.map(id=><li key={id} className="flex min-w-0 items-center gap-3 rounded-xl border border-[#E7E2D8] bg-white p-3"><div className="w-16 shrink-0"><F06ProductImage id={id} name={names[id]??'Product #'+id} imageUrl={images[id]} /></div><div className="min-w-0 break-words"><RecommendationProduct id={id} names={names}/>{direction&&<small className="mt-1 block text-[#356B54]">{id===direction.anchor?'Starting product':'Suggest alongside'}</small>}</div></li>)}</ul>
      {direction && <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-xl border border-[#CADACF] bg-[#EDF5F0] p-3"><h4 className="text-xs font-semibold text-[#356B54]">When customers buy</h4><p className="mt-2"><RecommendationProduct id={direction.anchor} names={names} /></p></div>
        <div className="rounded-xl border border-[#E7E2D8] bg-white p-3"><h4 className="text-xs font-semibold text-[#356B54]">Suggest adding</h4><ul aria-label="Suggested cross-sell targets" className="mt-2 space-y-1">{direction.targets.map(id => <li key={id}><RecommendationProduct id={id} names={names} /></li>)}</ul></div></div>}
    </section>
    {item.seasonEnded && <section aria-label="Ended season warning" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><h3 className="font-semibold">Season ended</h3><ul className="mt-2 space-y-1">{item.endedSeasons.map(season => <li key={season.seasonId} className="break-words">{season.name} · Ended {formatDate(season.endDate)}</li>)}</ul><p className="mt-2">This suggestion uses historical season data. Check its current availability before use.</p></section>}
    <section data-evidence-status={item.evidence.status}><h3 className="text-lg font-semibold">Why this was suggested</h3><p data-recommendation-rationale className="mt-3 rounded-xl bg-[#EDF5F0] p-4 text-sm leading-6 text-[#243B30]">{recommendationRationale(item,names)}</p><p className="mb-4 mt-3 text-sm leading-6 text-[#6D7974]">{copy('Historical utility is the frozen weighted value from the original analysis. Compare it only within the same analysis context; it is not revenue, profit, a price, purchase probability or a sales forecast.','Historical utility is a saved analysis score, not revenue, profit, a price, purchase probability or a sales forecast. Compare it only within the same analysis.')}</p>
      <div className="rounded-xl border border-[#E7E2D8] p-4"><RecommendationFields fields={shoppingFields} /></div>
      <p className="mt-3 text-xs leading-5 text-[#6D7974]">Frequency is the share of past transactions containing this group. Confidence, where applicable, describes co-purchases relative to the starting product. These describe past behaviour, not guaranteed future sales. N/A means not available or not applicable.</p>
      <details className="mt-3 text-sm"><summary className="cursor-pointer font-medium">{technical?'Full system explanation':'Full explanation'}</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#57534E]">{item.explanation.map((line, index) => <li key={index} className="break-words">{technical?line:friendlyAnalysisText(line)}</li>)}</ul></details>
    </section>
    <section><h3 className="text-lg font-semibold">Product Availability</h3><p className="mb-4 mt-2 text-sm leading-6 text-[#6D7974]">Availability includes product status, sellable stock, expiry and required information. Available products still need a review decision. An approved suggestion may become unavailable later.</p>
      <F06EligibilityCheck title="Current availability" check={item.currentEligibility} names={names} technical={technical} />
      <div className="my-4"><RecommendationFields fields={[["Availability check changed", yesNo(item.inventoryChanged)]]} /></div>
      <p className="text-xs leading-5 text-[#6D7974]">The check can change with stock, product information or the store date. No inventory is reserved.</p>
    </section>

    {reviewContent}
    <section><h3 className="mb-4 text-lg font-semibold">Review History</h3><RecommendationFields fields={[
      ['Last reviewed by', item.reviewedBy === null ? 'N/A' : `User #${item.reviewedBy}`], ['Last reviewed at', item.reviewedAt === null ? 'N/A' : miningDate(item.reviewedAt)], ['Review reason', value(item.reviewReason)]
    ]} />{!item.reviewHistory.length ? <p className="mt-4 rounded-xl bg-[#FAF8F5] p-4 text-sm text-[#6D7974]">No review decision has been recorded yet.</p> : <ol className="ml-2 mt-5 border-l border-[#E7E2D8]">{item.reviewHistory.map((review, index) => {
      const Icon = review.newStatus === 'APPROVED' ? CheckCircle2 : review.newStatus === 'REJECTED' ? XCircle : Clock3;
      return <li key={`${review.resultingVersion}:${index}`} className="relative pb-6 pl-6 last:pb-0"><span className="absolute -left-2.5 top-0 bg-white"><Icon aria-hidden="true" className="h-5 w-5 text-[#356B54]" /></span>
        <p className="text-sm font-semibold">{label(review.oldStatus)} → {label(review.newStatus)}</p><p className="mt-2 text-xs text-[#6D7974]">User #{review.reviewedBy} · <time dateTime={review.reviewedAt}>{miningDate(review.reviewedAt)}</time> · Version {review.resultingVersion}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm">{review.reason}</p><details className="mt-3"><summary className="cursor-pointer text-sm font-medium">Stock check at review</summary><div className="mt-3"><F06EligibilityCheck title="Stock at the time of review" check={review.eligibilityCheck} names={names} technical={technical} /></div></details>
      </li>;
    })}</ol>}</section>
    <SourceDetails>
    <section><h3 className="mb-4 text-lg font-semibold">Rules Applied</h3><RecommendationRuleSummary policy={item.policy} />
      <p className="mt-3 text-xs leading-5 text-[#6D7974]">These are the saved rules for this suggestion. Later store rule changes do not rewrite it.</p>
      <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium">Rule and record references</summary><div className="mt-3"><RecommendationFields fields={[
        ['Product references', item.productIds.map(id=>'Product #'+id).join(', ')], ['Rule version', item.ruleVersion], ['Policy version', value(item.policy.version)], ['Recommendation version', value(item.version)], ['Created', miningDate(item.createdAt)]
      ]} /></div></details>
    </section>
    <section><h3 className="text-lg font-semibold">Additional Evidence</h3><p className="mt-2 text-sm leading-6 text-[#6D7974]">Saved analyses and creation-time stock checks explain where this suggestion came from. They are separate from today’s availability.</p>
      <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium">Availability when created</summary><div className="mt-3"><F06EligibilityCheck title="Availability at creation" check={item.generationEligibility} names={names} technical={technical} /></div></details>
      <div className="mt-3 space-y-3">{item.sources.map(source => <details key={`${source.runId}:${source.patternId}`} className="rounded-xl border border-[#E7E2D8] p-4">
        <summary className="cursor-pointer text-sm font-semibold">{copy('Mining run','Analysis run')} #{source.runId} · {source.algorithm === 'HUI_MINER' ? 'HUI-Miner' : source.algorithm} · {formatDate(source.analysisDate)}</summary><div className="mt-4"><RecommendationFields fields={[
          ['Shopping data snapshot', `#${source.snapshotId}`], ['Analysis date', formatDate(source.analysisDate)], ['Product combination', `Pattern #${source.patternId}`], ['Historical utility', value(source.patternUtility)]
        ]} /><details className="mt-4 text-xs"><summary className="cursor-pointer font-medium">Technical source references</summary><div className="mt-3"><RecommendationFields fields={[
          ['Request', `#${source.requestId}`], ['Library version', source.libraryVersion], ['Conversion version', source.conversionVersion], ['Minimum utility mode', source.minUtilMode],
          ['Minimum utility value', value(source.minUtilValue)], ['SPMF threshold', value(source.minUtilSpmf)], ['Effective minimum utility', value(source.effectiveMinUtility)],
          ['Input hash', source.inputHash], ['Source hash', source.sourceHash], ['Matrix hash', source.matrixHash]
        ]} /></div></details></div></details>)}</div>{!item.sources.length && <p className="mt-2 text-sm text-[#6D7974]">No source records returned.</p>}
    </section>
    </SourceDetails>
  </div>;
}

export function F06RecommendationDetails({ state, workflow }: { state:RecommendationBrowseState;workflow:RecommendationBrowser }) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [draft,setDraft]=useState(''),[discard,setDiscard]=useState(false);
  const resumeReview=()=>{setDiscard(false);requestAnimationFrame(()=>{const reason=dialog.current?.querySelector<HTMLTextAreaElement>('#f06-review-reason');if(reason&&!reason.disabled)reason.focus();else dialog.current?.querySelector<HTMLButtonElement>('[aria-label="Close recommendation details"]')?.focus();});};
  const close=()=>{if(state.reviewPending)return;if(discard){resumeReview();return;}if(draft.trim()&&state.role==='Merchandiser'&&state.detail?.reviewStatus!=='APPROVED'&&state.detail?.reviewStatus!=='REJECTED'){setDiscard(true);return;}workflow.closeDetail();};
  const closeRef=useRef(close);closeRef.current=close;
  useEffect(()=>{
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null,node=dialog.current,overflow=document.body.style.overflow;
    const cancel=(event:Event)=>{event.preventDefault();closeRef.current();};
    const keydown=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeRef.current();}};
    node?.addEventListener('cancel',cancel);document.addEventListener('keydown',keydown,true);node?.showModal();document.body.style.overflow='hidden';
    return()=>{document.removeEventListener('keydown',keydown,true);node?.removeEventListener('cancel',cancel);node?.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();else document.getElementById('f06-library-tab')?.focus();};
  },[]);
  return <dialog ref={dialog} aria-labelledby="f06-detail-title" aria-modal="true" className="fixed inset-0 m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-[1000px] overflow-y-auto rounded-2xl border border-[#E7E2D8] bg-white p-0 text-[#191C1B] shadow-xl backdrop:bg-black/30">
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E7E2D8] bg-white p-4 sm:px-6"><div><h2 id="f06-detail-title" className="text-xl font-semibold">Recommendation details</h2><p className="mt-1 text-xs text-[#6D7974]">Suggestion #{state.detailId} · {state.role==='Merchandiser'?'View & review':'Read-only'}</p></div><button type="button" aria-label="Close recommendation details" autoFocus disabled={state.reviewPending} className="rounded-lg p-2 hover:bg-[#EDF5F0] focus-visible:outline-2 disabled:opacity-50" onClick={close}><X aria-hidden="true" className="h-5 w-5"/></button></header>
    {discard&&<div role="alert" aria-label="Unsaved review" className="sticky top-20 z-10 mx-4 mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Keep your unfinished review?</p><p className="mt-1">Your reason has not been submitted.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" autoFocus className={miningButton} onClick={resumeReview}>Keep Editing</button><button type="button" className={miningButton} onClick={()=>workflow.closeDetail()}>Discard & Close</button></div></div>}
    <div className="space-y-5 p-5 sm:p-6"><button type="button" className={miningButton} disabled={state.detailLoading || state.reviewPending} onClick={() => void workflow.openDetail(state.detailId!, false, true)}><RefreshCw aria-hidden="true" className="mr-2 inline h-4 w-4" />Refresh details</button>
      {state.reviewError && <p role="alert" className="whitespace-pre-wrap break-words rounded-xl bg-red-50 p-4 text-sm text-red-800">{state.reviewError}</p>}
      {state.reviewNotice && <p role="status" className="rounded-xl bg-[#EDF5F0] p-4 text-sm text-[#1E3A2F]">{state.reviewNotice}</p>}
      {state.detailLoading ? <p role="status" className="text-sm text-[#6D7974]">Loading recommendation details...</p> : state.detailError ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{storeAdminMessage(state.detailError)}</p> : state.detail && <>
        {state.namesLoading && <p role="status" className="text-xs text-[#6D7974]">Loading product names...</p>}
        {state.namesUnavailable && <p className="text-xs text-[#6D7974]">Some product names are unavailable. Product references are shown instead.</p>}
        <F06RecommendationDetailContent compact={state.role==='Store Admin'} technical={false} item={state.detail} names={state.names} images={state.images} reviewContent={<F06ReviewForm state={state} workflow={workflow} reason={draft} onReasonChange={setDraft}/>}/>
      </>}
    </div>
  </dialog>;
}
