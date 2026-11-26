import { useEffect, useState } from 'react';
import { miningButton, miningPrimaryButton } from '../../f05/f05.display';
import type { RecommendationBrowseState, RecommendationBrowser } from '../f06.browse';
import { recommendationLabel } from './F06ReadShared';

interface ReviewProps {state:RecommendationBrowseState;workflow:RecommendationBrowser;reason:string;}
export function F06ReviewActions({state,workflow,reason}:ReviewProps){
  const detail=state.detail;
  if(state.role!=='Merchandiser'||!detail||detail.reviewStatus!=='PENDING_REVIEW')return null;
  const valid=!!reason.trim()&&reason.length<=1000,eligible=detail.currentEligibility.status==='ELIGIBLE';
  if(state.reviewConfirmation)return <><button type="button" className={miningButton} disabled={state.reviewPending} onClick={()=>{workflow.cancelReview();requestAnimationFrame(()=>document.getElementById('f06-review-reason')?.focus());}}>Back to review</button><button id="f06-confirm-decision" type="button" aria-describedby="f06-review-confirmation" className={miningPrimaryButton} disabled={state.reviewPending||state.reviewNeedsRefresh||state.detailLoading||(state.reviewConfirmation.action==='approve'&&!eligible)} onClick={()=>void workflow.confirmReview()}>{state.reviewPending?'Saving decision...':state.reviewConfirmation.action==='approve'?'Confirm Approval':'Confirm Rejection'}</button></>;
  return <><button type="button" aria-describedby="f06-review-reason-help" className={miningButton} disabled={!valid||state.reviewPending||state.reviewNeedsRefresh||state.detailLoading} onClick={()=>workflow.prepareReview('reject',reason)}>Reject</button><button type="button" aria-describedby="f06-review-reason-help" className={miningPrimaryButton} disabled={!valid||!eligible||state.reviewPending||state.reviewNeedsRefresh||state.detailLoading} onClick={()=>workflow.prepareReview('approve',reason)}>Approve</button></>;
}
export function F06ReviewForm({state,workflow,reason:controlledReason,onReasonChange,footerActions=false}:{state:RecommendationBrowseState;workflow:RecommendationBrowser;reason?:string;onReasonChange?:(value:string)=>void;footerActions?:boolean}){
  const [localReason,setLocalReason]=useState('');
  const reason=controlledReason??localReason,setReason=onReasonChange??setLocalReason;
  const confirmation=state.reviewConfirmation;
  useEffect(()=>{if(confirmation)document.getElementById('f06-confirm-decision')?.focus();},[confirmation]);
  const detail=state.detail;
  if(state.role!=='Merchandiser'||!detail||detail.reviewStatus!=='PENDING_REVIEW')return null;
  const eligible=detail.currentEligibility.status==='ELIGIBLE';
  return <section aria-labelledby="f06-review-title" className="border-t border-[#E7E2D8] pt-4">
    <h3 id="f06-review-title" className="text-base font-semibold">Your Decision</h3>
    <p className="mt-2 text-xs text-[#6D7974]">Your decision cannot be changed after confirmation.</p>
    {!eligible&&<p className="mt-2 text-xs text-amber-900">Approval is unavailable: {recommendationLabel(detail.currentEligibility.status).toLowerCase()}. Check Current Availability above. You may still reject this suggestion.</p>}
    {state.reviewNeedsRefresh&&<p role="alert" className="mt-2 text-sm text-red-800">Refresh details successfully before making another decision.</p>}
    {confirmation?<div id="f06-review-confirmation" aria-label="Confirm recommendation review" className="mt-3 space-y-2 rounded-lg bg-[#FAF8F5] p-3"><h4 className="text-sm font-semibold">{confirmation.action==='approve'?'Approve this recommendation?':'Reject this recommendation?'}</h4><p className="whitespace-pre-wrap break-words text-sm">{confirmation.reason}</p><p className="text-xs text-[#6D7974]">This decision is final. Approval does not publish a campaign or reserve inventory.</p></div>:<div className="mt-3"><label htmlFor="f06-review-reason" className="text-sm font-medium">Reason for your decision *</label><textarea id="f06-review-reason" required rows={2} maxLength={1000} placeholder="Enter a short reason for approving or rejecting this recommendation." value={reason} disabled={state.reviewPending||state.reviewNeedsRefresh} onChange={event=>setReason(event.target.value)} className="mt-2 w-full rounded-lg border border-[#E7E2D8] bg-white p-3 text-sm focus:border-[#356B54] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EDF5F0]" aria-describedby="f06-review-reason-help"/><p id="f06-review-reason-help" className="mt-1 text-xs text-[#6D7974]">Required - {reason.length}/1000 characters</p></div>}
    {!footerActions&&<div className="mt-3 flex flex-wrap justify-end gap-2"><F06ReviewActions state={state} workflow={workflow} reason={reason}/></div>}
  </section>;
}
