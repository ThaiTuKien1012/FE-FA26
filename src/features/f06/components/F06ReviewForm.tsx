import { useState } from 'react';
import { miningButton, miningPrimaryButton } from '../../f05/f05.display';
import type { RecommendationBrowseState, RecommendationBrowser } from '../f06.browse';
import { RecommendationBadge, RecommendationProduct, recommendationLabel } from './F06ReadShared';

export function F06ReviewForm({ state, workflow }: { state: RecommendationBrowseState; workflow: RecommendationBrowser }) {
  const [reason, setReason] = useState('');
  const detail = state.detail;
  if (state.role !== 'Merchandiser' || !detail || detail.reviewStatus !== 'PENDING_REVIEW') return null;
  const confirmation = state.reviewConfirmation;
  const valid = !!reason.trim() && reason.length <= 1000;
  const eligible = detail.currentEligibility.status === 'ELIGIBLE';
  return <section aria-labelledby="f06-review-title" className="rounded-xl border border-[#CADACF] bg-[#FAF8F5] p-4 sm:p-5">
    <h3 id="f06-review-title" className="text-lg font-semibold">Review this recommendation</h3>
    <p className="mt-2 text-sm leading-6 text-[#6D7974]">Record a decision for this suggestion. Approved and rejected decisions are final.</p>
    <div className="mt-3 flex flex-wrap gap-2"><RecommendationBadge status={detail.type} /><RecommendationBadge status={detail.reviewStatus} /><RecommendationBadge status={detail.currentEligibility.status} /></div>
    <ul className="mt-3 space-y-1 text-sm">{detail.productIds.map(id => <li key={id}><RecommendationProduct id={id} names={state.names} /></li>)}</ul>
    {detail.currentEligibility.warnings.length > 0 && <ul className="mt-3 space-y-1 text-sm text-amber-900">{detail.currentEligibility.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
    {!eligible && <p className="mt-3 text-sm text-amber-900">Approval is unavailable: {recommendationLabel(detail.currentEligibility.status).toLowerCase()}. Check the product availability below. You may still reject this suggestion.</p>}
    {state.reviewNeedsRefresh && <p role="alert" className="mt-3 text-sm text-red-800">Refresh details successfully before making another decision.</p>}
    {confirmation ? <div aria-label="Confirm recommendation review" className="mt-4 rounded-xl border border-[#CADACF] bg-white p-4">
      <h4 className="font-semibold">Confirm {confirmation.action === 'approve' ? 'approval' : 'rejection'}</h4>
      <p className="mt-2 text-sm">Recommendation #{confirmation.id} · Version {confirmation.expectedVersion}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm">{confirmation.reason}</p>
      <p className="mt-3 text-xs leading-5 text-[#6D7974]">The server checks the current version and availability again. Approval does not publish a campaign, change stock or reserve inventory.</p>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={miningPrimaryButton} disabled={state.reviewPending || state.reviewNeedsRefresh} onClick={() => void workflow.confirmReview()}>{state.reviewPending ? 'Saving decision...' : confirmation.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}</button><button type="button" className={miningButton} disabled={state.reviewPending} onClick={workflow.cancelReview}>Back to review</button></div>
    </div> : <div className="mt-4">
      <label htmlFor="f06-review-reason" className="text-sm font-semibold">Reason for your decision</label>
      <textarea id="f06-review-reason" rows={3} maxLength={1000} value={reason} disabled={state.reviewPending || state.reviewNeedsRefresh} onChange={event => setReason(event.target.value)} className="mt-2 w-full rounded-xl border border-[#E7E2D8] bg-white p-3 text-sm focus:border-[#356B54] focus:outline-none" aria-describedby="f06-review-reason-help" />
      <p id="f06-review-reason-help" className="mt-1 text-xs text-[#6D7974]">Required · {reason.length}/1000 characters</p>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={miningPrimaryButton} disabled={!valid || !eligible || state.reviewPending || state.reviewNeedsRefresh} onClick={() => workflow.prepareReview('approve', reason)}>Approve Recommendation</button><button type="button" className={miningButton} disabled={!valid || state.reviewPending || state.reviewNeedsRefresh} onClick={() => workflow.prepareReview('reject', reason)}>Reject Recommendation</button></div>
    </div>}
  </section>;
}
