import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { formatDate } from '../../../utils/dateTime';
import { miningButton, miningDate } from '../../f05/f05.display';
import type { EligibilityEvidence, RecView } from '../f06.types';
import type { RecommendationBrowseState, RecommendationBrowser } from '../f06.browse';
import { crossSellDirection, productNames, recommendationRationale, recommendationPurchaseEvidence, recommendationWarning, recommendationTypeCopy } from '../f06.presentation';
import { detailAvailabilityChanges, detailPercentage } from '../f06.details.presentation';
import { F06ProductImage } from './F06ProductImage';
import { F06ReviewActions, F06ReviewForm } from './F06ReviewForm';
import { F06SellingPriority } from './F06ExpiryPriority';
import { RecommendationBadge, RecommendationFields, recommendationLabel as label, recommendationNumber, recommendationPercent } from './F06ReadShared';

function AvailabilityWarnings({check,names}:{check:EligibilityEvidence;names:Record<number,string>}){
  const productMessages=new Set(check.products.flatMap(product=>product.warnings.flatMap(message=>[message,`Product ${product.productId}: ${message}`])));
  const messages=[...new Set(check.warnings)].filter(message=>!productMessages.has(message));
  return messages.length>0?<ul className="mt-2 space-y-1 text-xs text-amber-900">{messages.map(message=><li key={message}>{recommendationWarning(message,names)}</li>)}</ul>:null;
}
export function F06EligibilityCheck({title,check,names={},children}:{title:string;check:EligibilityEvidence;names?:Record<number,string>;technical?:boolean;children?:ReactNode}){
  return <section aria-label={title} className="min-w-0 border-t border-[#E7E2D8] pt-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-semibold">{title}</h3><RecommendationBadge status={check.status}/></div>
    <p className="mt-1 text-xs text-[#6D7974]">Checked {miningDate(check.checkedAt)}</p>
    <ul className="mt-3 divide-y divide-[#E7E2D8]">{check.products.map(product=><li key={product.productId} className="py-3 first:pt-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-2 text-sm"><div className="min-w-0 flex-1"><h4 className="break-words font-medium">{names[product.productId]||'Product name unavailable'}</h4><p className="mt-1 text-xs text-[#6D7974]">Sellable stock: <strong className="text-[#243B30]">{recommendationNumber(product.sellableQuantity)} {product.sellableQuantity===1?'unit':'units'} available</strong></p></div>{(check.products.some(value=>value.status!==check.status))&&<RecommendationBadge status={product.status}/>}</div>
      {product.productStatus!=='ACTIVE'&&<p className="mt-1 text-xs text-amber-900">{label(product.productStatus)} product</p>}
      {product.warnings.length>0&&<ul className="mt-2 space-y-1 text-xs text-amber-900">{[...new Set(product.warnings)].map(message=><li key={message}>{recommendationWarning(message,names)}</li>)}</ul>}
      {product.expiryStatus==='MISSING_METADATA'&&!product.warnings.length&&<p className="mt-2 text-xs text-amber-900">Required expiry information needs checking.</p>}
    </li>)}</ul><AvailabilityWarnings check={check} names={names}/>{children}
  </section>;
}
function HistoricalAvailability({title,check,names}:{title:string;check:EligibilityEvidence;names:Record<number,string>}){
  return <div className="space-y-2 text-xs"><h4 className="font-semibold">{title}</h4><p>{label(check.status)} - {miningDate(check.checkedAt)}</p><ul className="space-y-2">{check.products.map(product=><li key={product.productId} className="break-words"><span className="font-medium">{names[product.productId]||'Product name unavailable'}</span>: {recommendationNumber(product.sellableQuantity)} sellable {product.sellableQuantity===1?'unit':'units'}; {label(product.status).toLowerCase()}.{'expiryPushDays' in product&&<span> Saved reminder period: {product.expiryPushDays} days.</span>}{product.expiryStatus!=='NOT_APPLICABLE'&&product.expiryPriorityScore!==null&&<span> Saved expiry priority: {recommendationNumber(product.expiryPriorityScore)}.</span>}{product.warnings.length>0&&<ul className="mt-1 space-y-1 text-amber-900">{[...new Set(product.warnings)].map(message=><li key={message}>{recommendationWarning(message,names)}</li>)}</ul>}</li>)}</ul><AvailabilityWarnings check={check} names={names}/></div>;
}
function Percent({value}:{value:Parameters<typeof detailPercentage>[0]}){const percent=detailPercentage(value);return <span title={'Recorded value: '+percent.exact}>{percent.display}</span>;}
export function F06RecommendationDetailContent({item,names={},images={},reviewContent,savedNotice}:{compact?:boolean;technical?:boolean;item:RecView;names?:Record<number,string>;images?:Record<number,string>;reviewContent?:ReactNode;savedNotice?:string}){
  const direction=crossSellDirection(item),evidence=recommendationPurchaseEvidence(item,names),single=item.productIds.length===1;
  const count=evidence.countsAvailable?recommendationNumber(item.evidence.supportCount):'Unavailable';
  const fields:[string,ReactNode][]=[[single?'Transactions containing this product':'Bought together',evidence.countsAvailable?count+(single?'':' transactions'):'Unavailable'],['Purchase frequency',evidence.countsAvailable&&item.evidence.supportRatio!==null?<Percent value={item.evidence.supportRatio}/>:'Unavailable']];
  if(direction)fields.push(['Add-on purchase rate',evidence.directionalAvailable?<Percent value={item.evidence.confidence}/>:'Unavailable']);
  const changes=detailAvailabilityChanges(item,names);
  return <div data-readiness={item.readyForConsumption?'ready':'not-ready'} className="space-y-5">
    <section aria-label="Recommendation summary"><h3 className="text-sm font-semibold text-[#356B54]">{recommendationTypeCopy[item.type].title}</h3><p data-recommendation-rationale className="mt-2 break-words text-base font-medium leading-7 text-[#243B30]">{recommendationRationale(item,names)}</p>
      <ul aria-label="Products in this suggestion" className={'mt-3 grid gap-3 '+(single?'':'sm:grid-cols-2')}>{item.productIds.map(id=><li key={id} className="flex min-w-0 items-center gap-3 rounded-lg bg-[#FAF8F5] p-3"><div className="w-12 shrink-0"><F06ProductImage compactFallback id={id} name={names[id]||'Product name unavailable'} imageUrl={images[id]}/></div><div className="min-w-0 break-words text-sm font-medium">{names[id]||'Product name unavailable'}{direction&&<small className="mt-1 block font-normal text-[#356B54]">{id===direction.anchor?'Starting product':'Suggested addition'}</small>}</div></li>)}</ul>
      {direction&&<p aria-label="Cross-sell direction" className="mt-2 break-words text-xs text-[#6D7974]"><strong>{names[direction.anchor]||'Starting product'}</strong><span aria-hidden="true"> to </span><span aria-label="Suggested cross-sell targets">{productNames(direction.targets,names)}</span></p>}
    </section>
    <section aria-label="Historical purchase evidence" data-evidence-status={item.evidence.status} className="border-t border-[#E7E2D8] pt-4"><h3 className="text-base font-semibold">Why this recommendation?</h3><p className="mt-2 text-sm leading-6">{evidence.countsAvailable?`${single?'Purchased':'Purchased together'} in ${count} of ${recommendationNumber(item.evidence.totalTransactions)} analyzed transactions.`:'Historical purchase data is unavailable.'}</p><div className="mt-3"><RecommendationFields fields={fields}/></div>{direction&&<p className="mt-3 text-xs leading-5 text-[#6D7974]">{evidence.directionalAvailable?`${recommendationNumber(item.evidence.anchorSupportCount)} analyzed transactions contained ${names[direction.anchor]||'the starting product'}. The add-on purchase rate is the share that also contained ${productNames(direction.targets,names)}.`:'Directional purchase data is unavailable.'}</p>}<p className="mt-3 text-xs text-[#6D7974]">Based on historical purchases, not a sales forecast.</p></section>
    <F06EligibilityCheck title="Current Availability" check={item.currentEligibility} names={names}>
      {item.inventoryChanged&&<div className={'mt-3 text-xs leading-5 '+(item.currentEligibility.status==='ELIGIBLE'?'text-[#6D7974]':'text-amber-900')}>{changes.length?<ul className="space-y-1">{changes.map(message=><li key={message}>{message}</li>)}</ul>:<p>Availability checked against current inventory.</p>}</div>}
      <div className="mt-3 empty:hidden"><F06SellingPriority ids={item.productIds} names={names}/></div>
      {item.seasonEnded&&<aside aria-label="Ended season warning" className="mt-3 text-xs leading-5 text-amber-900"><p className="font-semibold">Historical season has ended</p><ul>{item.endedSeasons.map(season=><li key={season.seasonId}>{season.name}: ended {formatDate(season.endDate)}</li>)}</ul><p>The saved suggestion is retained. Check its current availability before use.</p></aside>}
    </F06EligibilityCheck>
    {reviewContent}
    {item.reviewStatus!=='PENDING_REVIEW'&&<section aria-label="Saved Decision" className="border-t border-[#E7E2D8] pt-4"><h3 className="text-base font-semibold">Saved Decision</h3><p className={'mt-2 text-sm font-semibold '+(item.reviewStatus==='REJECTED'?'text-red-800':'text-[#315445]')}>{label(item.reviewStatus)}{item.reviewedAt&&<span className="ml-2 font-normal text-[#6D7974]">{miningDate(item.reviewedAt)}</span>}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">Reason: {item.reviewReason||'No reason was recorded.'}</p><p role="status" className="mt-2 text-xs text-[#6D7974]">{item.reviewStatus==='APPROVED'&&item.readyForConsumption?'Approved and ready for layout.':(item.reviewStatus==='APPROVED'?'Saved approval is not currently ready for Layout. Check Current Availability.':savedNotice??'Recommendation rejected. Your decision has been saved.')}</p></section>}
    <details className="border-t border-[#E7E2D8] pt-3"><summary className="cursor-pointer text-sm font-semibold">More Details</summary><div className="mt-3 space-y-4 text-sm"><RecommendationFields fields={[
      ['Historical utility',recommendationNumber(item.utility)],['Analysis date',item.sources[0]?formatDate(item.sources[0].analysisDate):'Not recorded'],
      ['Total analyzed transactions',evidence.countsAvailable?recommendationNumber(item.evidence.totalTransactions):'Unavailable'],['Recorded purchase frequency',evidence.countsAvailable?recommendationPercent(item.evidence.supportRatio):'Unavailable'],
      ...(direction?[['Recorded add-on purchase rate',evidence.directionalAvailable?recommendationPercent(item.evidence.confidence):'Unavailable'] as [string,ReactNode]]:[])
    ]}/><p className="text-xs text-[#6D7974]">Utility Score represents weighted product value, not revenue or profit.</p><HistoricalAvailability title="Availability when created" check={item.generationEligibility} names={names}/>
      {item.currentEligibility.products.some(product=>product.expiryStatus!=='NOT_APPLICABLE'&&product.expiryPriorityScore!==null&&/[1-9]/.test(String(product.expiryPriorityScore)))&&<div className="space-y-1 text-xs text-[#6D7974]"><p className="font-medium">Current expiry measurements</p>{item.currentEligibility.products.filter(product=>product.expiryStatus!=='NOT_APPLICABLE'&&product.expiryPriorityScore!==null&&/[1-9]/.test(String(product.expiryPriorityScore))).map(product=><p key={product.productId}>{names[product.productId]||'Product name unavailable'}: {recommendationNumber(product.expiryPriorityScore)}</p>)}<p>These measurements alone do not confirm that a batch has reached its Push Day.</p></div>}
    </div></details>
    <details className="border-t border-[#E7E2D8] pt-3"><summary className="cursor-pointer text-sm font-semibold">Review History ({item.reviewHistory.length})</summary>{!item.reviewHistory.length?<p className="mt-2 text-xs text-[#6D7974]">No review decision has been recorded yet.</p>:<ol className="mt-3 space-y-4">{item.reviewHistory.map((review,index)=><li key={index} className="space-y-2 border-l-2 border-[#E7E2D8] pl-3"><p className="text-sm font-medium">{label(review.oldStatus)} to {label(review.newStatus)} <span className="font-normal text-[#6D7974]">- {miningDate(review.reviewedAt)}</span></p><p className="whitespace-pre-wrap break-words text-sm">{review.reason}</p><HistoricalAvailability title="Availability at review" check={review.eligibilityCheck} names={names}/></li>)}</ol>}</details>
  </div>;
}
export function F06RecommendationDetails({state,workflow}:{state:RecommendationBrowseState;workflow:RecommendationBrowser}){
  const dialog=useRef<HTMLDialogElement>(null),guard=useRef<HTMLButtonElement>(null);
  const [draft,setDraft]=useState(''),[discard,setDiscard]=useState(false);
  const resumeReview=()=>{setDiscard(false);requestAnimationFrame(()=>{const reason=dialog.current?.querySelector<HTMLTextAreaElement>('#f06-review-reason');if(reason&&!reason.disabled)reason.focus();else dialog.current?.querySelector<HTMLButtonElement>('[aria-label="Close recommendation details"]')?.focus();});};
  const close=()=>{if(state.reviewPending)return;if(discard){resumeReview();return;}if(draft.trim()&&state.role==='Merchandiser'&&state.detail?.reviewStatus!=='APPROVED'&&state.detail?.reviewStatus!=='REJECTED'){setDiscard(true);return;}workflow.closeDetail();};
  const closeRef=useRef(close);closeRef.current=close;
  useEffect(()=>{if(discard)guard.current?.focus();},[discard]);
  useEffect(()=>{
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null,node=dialog.current,overflow=document.body.style.overflow;
    const cancel=(event:Event)=>{event.preventDefault();closeRef.current();};
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Tab'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&node?.open){
        const controls=[...node.querySelectorAll<HTMLElement>('button:not(:disabled),textarea:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')].filter(control=>control.getClientRects().length>0);
        const first=controls[0],last=controls.at(-1),focused=document.activeElement;
        if(!first){event.preventDefault();node.focus();return;}
        if(!node.contains(focused)||(event.shiftKey?focused===first:focused===last)){event.preventDefault();(event.shiftKey?last:first)?.focus();}
      }
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeRef.current();}
    };
    node?.addEventListener('cancel',cancel);document.addEventListener('keydown',keydown,true);node?.showModal();document.body.style.overflow='hidden';
    return()=>{document.removeEventListener('keydown',keydown,true);node?.removeEventListener('cancel',cancel);node?.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();else document.getElementById('f06-library-tab')?.focus();};
  },[]);
  const reviewing=state.role==='Merchandiser'&&state.detail?.reviewStatus==='PENDING_REVIEW'&&!state.detailLoading&&!state.detailError;
  return <dialog ref={dialog} tabIndex={-1} data-recommendation-detail={state.detailId} aria-labelledby="f06-detail-title" aria-modal="true" className="fixed inset-0 m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-[960px] flex-col overflow-hidden rounded-2xl border border-[#E7E2D8] bg-white p-0 text-[#191C1B] shadow-xl backdrop:bg-black/30 open:flex">
    <header className="z-10 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#E7E2D8] bg-white p-4 sm:px-5"><div className="flex min-w-0 flex-wrap items-center gap-2"><h2 id="f06-detail-title" className="text-lg font-semibold">Recommendation Details</h2>{state.detail&&<RecommendationBadge status={state.detail.reviewStatus}/>}</div><div className="flex items-center gap-1"><button type="button" aria-label="Refresh details" title="Refresh details" disabled={state.detailLoading||state.reviewPending} className="rounded-lg p-2 text-[#356B54] hover:bg-[#EDF5F0] focus-visible:outline-2 disabled:opacity-50" onClick={()=>void workflow.openDetail(state.detailId!,false,true)}><RefreshCw aria-hidden="true" className={'h-4 w-4 '+(state.detailLoading?'animate-spin motion-reduce:animate-none':'')}/></button><button type="button" aria-label="Close recommendation details" title="Close" autoFocus disabled={state.reviewPending} className="rounded-lg p-2 hover:bg-[#EDF5F0] focus-visible:outline-2 disabled:opacity-50" onClick={close}><X aria-hidden="true" className="h-5 w-5"/></button></div></header>
    <div className="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-5" data-detail-body>
      {discard&&<div role="alert" aria-label="Unsaved review" className="sticky top-0 z-10 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">Keep your unfinished review?</p><p className="mt-1">Your reason has not been submitted.</p><div className="mt-3 flex flex-wrap gap-2"><button ref={guard} type="button" className={miningButton} onClick={resumeReview}>Keep Editing</button><button type="button" className={miningButton} onClick={()=>workflow.closeDetail()}>Discard & Close</button></div></div>}
      {state.reviewError&&<p role="alert" className="whitespace-pre-wrap break-words text-sm text-red-800">{state.reviewError}</p>}
      {state.reviewNotice&&(!state.detail||state.detail.reviewStatus==='PENDING_REVIEW')&&<p role="status" className="text-sm text-[#1E3A2F]">{state.reviewNotice}</p>}
      {state.nextError&&<p role="alert" className="text-sm text-red-800">{state.nextError}</p>}{state.nextMessage&&<p role="status" className="text-sm text-[#6D7974]">{state.nextMessage}</p>}
      {state.detailLoading?<p role="status" className="text-sm text-[#6D7974]">Loading recommendation details...</p>:state.detailError?<p role="alert" className="text-sm text-red-800">{state.detailError}</p>:state.detail&&<>
        {state.namesLoading&&<p role="status" className="text-xs text-[#6D7974]">Loading product names...</p>}{state.namesUnavailable&&<p className="text-xs text-[#6D7974]">Some product names are unavailable. The saved product records are retained.</p>}
        <F06RecommendationDetailContent item={state.detail} names={state.names} images={state.images} savedNotice={state.reviewNotice||undefined} reviewContent={state.role==='Store Admin'&&state.detail.reviewStatus==='PENDING_REVIEW'?<section aria-label="Your Decision" className="border-t border-[#E7E2D8] pt-4"><h3 className="text-base font-semibold">Your Decision</h3><p className="mt-2 text-sm text-[#6D7974]">Review decisions are managed by the Merchandiser.</p></section>:<F06ReviewForm footerActions state={state} workflow={workflow} reason={draft} onReasonChange={setDraft}/>}/>
      </>}
    </div>
    {reviewing?<footer aria-label="Decision actions" className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#E7E2D8] bg-white p-3 sm:px-5"><F06ReviewActions state={state} workflow={workflow} reason={draft}/></footer>:state.role==='Merchandiser'&&state.reviewedId===state.detailId&&state.detail?.reviewStatus!=='PENDING_REVIEW'&&<footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#E7E2D8] bg-white p-3 sm:px-5"><button type="button" className={miningButton} disabled={state.nextLoading||state.detailLoading} onClick={()=>void workflow.reviewNext()}>{state.nextLoading?'Finding next suggestion...':'Review Next'}</button><button type="button" className={miningButton} onClick={close}>Back to Recommendations</button></footer>}
  </dialog>;
}
