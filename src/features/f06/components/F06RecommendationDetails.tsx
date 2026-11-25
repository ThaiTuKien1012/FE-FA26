import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { formatDate } from '../../../utils/dateTime';
import { miningButton, miningDate } from '../../f05/f05.display';
import type { EligibilityEvidence, RecView } from '../f06.types';
import type { RecommendationBrowseState, RecommendationBrowser } from '../f06.browse';
import { crossSellDirection, productNames, recommendationRationale, recommendationPurchaseEvidence, recommendationWarning, recommendationTypeCopy } from '../f06.presentation';
import { F06ProductImage } from './F06ProductImage';
import { F06ReviewForm } from './F06ReviewForm';
import { RecommendationBadge, RecommendationFields, recommendationLabel as label, recommendationNumber, recommendationPercent, recommendationReadiness } from './F06ReadShared';

export function F06EligibilityCheck({title,check,names={}}:{title:string;check:EligibilityEvidence;names?:Record<number,string>;technical?:boolean}) {
  return <section className="min-w-0 rounded-xl border border-[#E7E2D8] p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">{title}</h4><RecommendationBadge status={check.status}/></div>
    <p className="mt-2 text-xs text-[#6D7974]">Checked {miningDate(check.checkedAt)}. Store date {formatDate(check.asOfDate)} ({check.timeZone}).</p>
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">{check.products.map(product=><li key={product.productId} className="min-w-0 rounded-xl bg-[#FAF8F5] p-3 text-sm"><h5 className="break-words font-semibold">{names[product.productId]||'Product name unavailable'}</h5><div className="mt-2"><RecommendationBadge status={product.status}/></div><p className="mt-2 text-xs">Sellable stock: <strong>{recommendationNumber(product.sellableQuantity)}</strong></p><p className="mt-1 text-xs text-[#6D7974]">{label(product.productStatus)}. Expiry: {label(product.expiryStatus)}.</p>{product.warnings.length>0&&<ul className="mt-2 space-y-1 text-xs text-amber-900">{product.warnings.map((warning,index)=><li key={index}>{recommendationWarning(warning,names)}</li>)}</ul>}<details className="mt-2 text-xs text-[#6D7974]"><summary className="cursor-pointer">Expiry information</summary><p className="mt-2">Expiry risk: {recommendationNumber(product.expiryPriorityScore)}{'expiryPushDays' in product&&<>. Saved reminder period: {product.expiryPushDays} days.</>}</p></details></li>)}</ul>
    {check.warnings.length>0&&<details className="mt-3 text-sm text-amber-900"><summary className="cursor-pointer">Availability notes ({check.warnings.length})</summary><ul className="mt-2 list-disc space-y-1 pl-4">{check.warnings.map((warning,index)=><li key={index}>{recommendationWarning(warning,names)}</li>)}</ul></details>}
  </section>;
}

export function F06RecommendationDetailContent({item,names={},images={},reviewContent}:{compact?:boolean;technical?:boolean;item:RecView;names?:Record<number,string>;images?:Record<number,string>;reviewContent?:ReactNode}) {
  const direction=crossSellDirection(item),evidence=recommendationPurchaseEvidence(item,names);
  const fields:[string,ReactNode][]=[['Total analyzed transactions',evidence.countsAvailable?recommendationNumber(item.evidence.totalTransactions):'Unavailable'],['Transactions containing all products',evidence.countsAvailable?recommendationNumber(item.evidence.supportCount):'Unavailable'],['Purchase frequency',evidence.groupPercent??'Unavailable']];
  if(direction)fields.push(['Transactions containing the starting product',evidence.countsAvailable?recommendationNumber(item.evidence.anchorSupportCount):'Unavailable'],['Add-on purchase rate',evidence.directionalAvailable?recommendationPercent(item.evidence.confidence):'Unavailable']);
  return <div className="space-y-5">
    <section aria-label="Recommendation summary" className="rounded-xl bg-[#FAF8F5] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-semibold">{recommendationTypeCopy[item.type].title}</h3><RecommendationBadge status={item.reviewStatus}/></div><p data-recommendation-rationale className="mt-3 break-words text-base font-medium leading-7 text-[#243B30]">{recommendationRationale(item,names)}</p>
      <ul aria-label="Products in this suggestion" className="mt-4 grid gap-3 sm:grid-cols-2">{item.productIds.map(id=><li key={id} className="flex min-w-0 items-center gap-3 rounded-xl border border-[#E7E2D8] bg-white p-3"><div className="w-14 shrink-0"><F06ProductImage id={id} name={names[id]||'Product name unavailable'} imageUrl={images[id]}/></div><div className="min-w-0 break-words text-sm font-semibold">{names[id]||'Product name unavailable'}{direction&&<small className="mt-1 block font-normal text-[#356B54]">{id===direction.anchor?'Starting product':'Suggested addition'}</small>}</div></li>)}</ul>
      {direction&&<div aria-label="Cross-sell direction" className="mt-3 rounded-lg bg-[#EDF5F0] p-3 text-sm"><strong>{names[direction.anchor]||'Starting product'}</strong><span aria-hidden="true"> to </span><span aria-label="Suggested cross-sell targets">{productNames(direction.targets,names)}</span></div>}
      <p data-readiness={item.readyForConsumption?'ready':'not-ready'} className="mt-3 rounded-lg border border-[#E7E2D8] bg-white p-3 text-sm">{recommendationReadiness(item)}</p>
    </section>
    <section aria-label="Historical purchase evidence" data-evidence-status={item.evidence.status}><h3 className="text-lg font-semibold">Why this recommendation?</h3><p className="mt-3 text-sm leading-6">{evidence.groupSentence}</p><div className="mt-3 rounded-xl border border-[#E7E2D8] p-4"><RecommendationFields fields={fields}/></div>{direction&&<p className="mt-3 text-sm leading-6">{evidence.directionalSentence}</p>}<p className="mt-2 text-xs leading-5 text-[#6D7974]">These figures describe the saved analysis dataset, not all current sales. Past purchases do not guarantee future sales.</p></section>
    <section><h3 className="mb-3 text-lg font-semibold">Product Availability</h3><F06EligibilityCheck title="Current availability" check={item.currentEligibility} names={names}/>{item.inventoryChanged&&<p className="mt-2 text-xs text-amber-900">Availability has changed since this suggestion was created. Use the latest check above.</p>}</section>
    {item.seasonEnded&&<section aria-label="Ended season warning" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><h3 className="font-semibold">Historical season has ended</h3><ul className="mt-2 space-y-1">{item.endedSeasons.map(season=><li key={season.seasonId}>{season.name}: ended {formatDate(season.endDate)}</li>)}</ul><p className="mt-2">The saved suggestion is retained. Check its current availability before use.</p></section>}
    {reviewContent}
    {item.reviewStatus!=='PENDING_REVIEW'&&<section aria-label="Saved decision" className="rounded-xl border border-[#CADACF] bg-[#EDF5F0] p-4"><h3 className="font-semibold">Saved decision</h3><p className="mt-2 text-sm">{label(item.reviewStatus)}{item.reviewedAt&&<> on {miningDate(item.reviewedAt)}</>}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.reviewReason||'No reason was recorded.'}</p></section>}
    <details className="rounded-xl border border-[#E7E2D8] p-4"><summary className="cursor-pointer text-sm font-semibold">Additional analysis evidence</summary><div className="mt-4 space-y-4 text-sm"><RecommendationFields fields={[
      ['Historical utility',recommendationNumber(item.utility)],['Saved analysis date',item.sources[0]?formatDate(item.sources[0].analysisDate):'Not recorded'],['Availability at creation',label(item.generationEligibility.status)]
    ]}/><p className="text-xs leading-5 text-[#6D7974]">Historical utility is a saved priority score. It is not revenue, profit, a discount or a forecast.</p><details><summary className="cursor-pointer font-medium">Availability when created</summary><div className="mt-3"><F06EligibilityCheck title="Saved availability" check={item.generationEligibility} names={names}/></div></details></div></details>
    <details className="rounded-xl border border-[#E7E2D8] p-4"><summary className="cursor-pointer text-sm font-semibold">Review history ({item.reviewHistory.length})</summary>{!item.reviewHistory.length?<p className="mt-3 text-sm text-[#6D7974]">No review decision has been recorded yet.</p>:<ol className="mt-4 space-y-4">{item.reviewHistory.map((review,index)=><li key={index} className="border-l-2 border-[#CADACF] pl-4"><p className="text-sm font-semibold">{label(review.oldStatus)} to {label(review.newStatus)}</p><p className="mt-1 text-xs text-[#6D7974]">{miningDate(review.reviewedAt)}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{review.reason}</p><details className="mt-2 text-sm"><summary className="cursor-pointer">Availability at review</summary><div className="mt-3"><F06EligibilityCheck title="Saved review availability" check={review.eligibilityCheck} names={names}/></div></details></li>)}</ol>}</details>
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
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Tab'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&node?.open){
        const controls=[...node.querySelectorAll<HTMLElement>('button:not(:disabled),textarea:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')].filter(control=>control.getClientRects().length>0);
        const first=controls[0],last=controls.at(-1),focused=document.activeElement;
        if(!node.contains(focused)||(event.shiftKey?focused===first:focused===last)){event.preventDefault();(event.shiftKey?last:first)?.focus();}
      }
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeRef.current();}
    };
    node?.addEventListener('cancel',cancel);document.addEventListener('keydown',keydown,true);node?.showModal();document.body.style.overflow='hidden';
    return()=>{document.removeEventListener('keydown',keydown,true);node?.removeEventListener('cancel',cancel);node?.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();else document.getElementById('f06-library-tab')?.focus();};
  },[]);
  return <dialog ref={dialog} data-recommendation-detail={state.detailId} aria-labelledby="f06-detail-title" aria-modal="true" className="fixed inset-0 m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-[1000px] overflow-y-auto rounded-2xl border border-[#E7E2D8] bg-white p-0 text-[#191C1B] shadow-xl backdrop:bg-black/30">
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E7E2D8] bg-white p-4 sm:px-6"><div><h2 id="f06-detail-title" className="text-xl font-semibold">Recommendation details</h2>{state.role==='Store Admin'&&<p className="mt-1 text-xs text-[#6D7974]">Read-only</p>}</div><button type="button" aria-label="Close recommendation details" autoFocus disabled={state.reviewPending} className="rounded-lg p-2 hover:bg-[#EDF5F0] focus-visible:outline-2 disabled:opacity-50" onClick={close}><X aria-hidden="true" className="h-5 w-5"/></button></header>
    {discard&&<div role="alert" aria-label="Unsaved review" className="sticky top-20 z-10 mx-4 mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Keep your unfinished review?</p><p className="mt-1">Your reason has not been submitted.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" autoFocus className={miningButton} onClick={resumeReview}>Keep Editing</button><button type="button" className={miningButton} onClick={()=>workflow.closeDetail()}>Discard & Close</button></div></div>}
    <div className="space-y-5 p-5 sm:p-6"><button type="button" className={miningButton} disabled={state.detailLoading || state.reviewPending} onClick={() => void workflow.openDetail(state.detailId!, false, true)}><RefreshCw aria-hidden="true" className="mr-2 inline h-4 w-4" />Refresh details</button>
      {state.reviewError && <p role="alert" className="whitespace-pre-wrap break-words rounded-xl bg-red-50 p-4 text-sm text-red-800">{state.reviewError}</p>}
      {state.reviewNotice && <p role="status" className="rounded-xl bg-[#EDF5F0] p-4 text-sm text-[#1E3A2F]">{state.reviewNotice}</p>}
      {state.role==='Merchandiser'&&state.reviewedId===state.detailId&&state.detail?.reviewStatus!=='PENDING_REVIEW'&&<div className="flex flex-wrap gap-2"><button type="button" className={miningButton} disabled={state.nextLoading||state.detailLoading} onClick={()=>void workflow.reviewNext()}>{state.nextLoading?'Finding next suggestion...':'Review Next'}</button><button type="button" className={miningButton} onClick={close}>Back to Recommendations</button></div>}
      {state.nextError&&<p role="alert" className="text-sm text-red-800">{state.nextError}</p>}
      {state.nextMessage&&<p role="status" className="text-sm text-[#6D7974]">{state.nextMessage}</p>}
      {state.detailLoading ? <p role="status" className="text-sm text-[#6D7974]">Loading recommendation details...</p> : state.detailError ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{state.detailError}</p> : state.detail && <>
        {state.namesLoading && <p role="status" className="text-xs text-[#6D7974]">Loading product names...</p>}
        {state.namesUnavailable && <p className="text-xs text-[#6D7974]">Some product names are unavailable. The saved product records are retained.</p>}
        <F06RecommendationDetailContent compact={state.role==='Store Admin'} technical={false} item={state.detail} names={state.names} images={state.images} reviewContent={<F06ReviewForm state={state} workflow={workflow} reason={draft} onReasonChange={setDraft}/>}/>
      </>}
    </div>
  </dialog>;
}
