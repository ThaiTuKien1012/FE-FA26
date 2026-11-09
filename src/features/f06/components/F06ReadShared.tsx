import type { ReactNode } from 'react';
import type { EligibilityStatus, RecPolicy, RecView } from '../f06.types';

export const recommendationValue = (value: string | number | null | undefined) => value == null ? 'N/A' : String(value);
export const recommendationYesNo = (value: boolean) => value ? 'Yes' : 'No';
const labels: Record<string, string> = {
  BUNDLE: 'Bundle', CROSS_SELL: 'Cross-sell', FBT: 'Frequently bought together', BANNER: 'Banner',
  APPROVED: 'Approved', REJECTED: 'Rejected', PENDING_REVIEW: 'Pending review',
  ELIGIBLE: 'Eligible', INELIGIBLE: 'Not eligible', NEEDS_RECHECK: 'Needs recheck',
  AVAILABLE: 'Available', EVIDENCE_UNAVAILABLE: 'Shopping evidence unavailable', ZERO_ANCHOR_SUPPORT: 'No recorded purchases of the starting product',
  NOT_APPLICABLE: 'N/A', NO_SELLABLE_BATCH: 'No sellable stock', MISSING_METADATA: 'Missing expiry information', UNAVAILABLE: 'Unavailable',
  ACTIVE: 'Active', INACTIVE: 'Inactive', BLOCKED: 'Blocked', COMPLETED: 'Completed', FAILED: 'Failed',
  RUNNING: 'Running', PENDING: 'Pending', TIMED_OUT: 'Timed out', MATCH: 'Matched', NOT_REQUESTED: 'Not compared'
};
export const recommendationLabel = (value: string) => labels[value] ?? value;
export const recommendationAvailability = (status: EligibilityStatus) => ({
  ELIGIBLE: 'Current selling conditions are met.', INELIGIBLE: 'Current selling conditions are not met.',
  NEEDS_RECHECK: 'Product availability needs a recheck.'
})[status];

/** Explain the server decision without replacing readyForConsumption or
 * recalculating eligibility. Rejected decisions are never called pending.
 */
export function recommendationReadiness(item: Pick<RecView, 'readyForConsumption' | 'reviewStatus' | 'currentEligibility'>): string {
  if (item.readyForConsumption) return 'Approved and currently eligible.';
  const availability = item.currentEligibility.status;
  const review = item.reviewStatus === 'REJECTED' ? 'Rejected' : item.reviewStatus === 'APPROVED' ? 'Approved' : 'Awaiting approval';
  if (availability === 'INELIGIBLE') return `${review}; current selling conditions are not met.`;
  if (availability === 'NEEDS_RECHECK') return `${review}; product availability needs a recheck.`;
  if (item.reviewStatus === 'REJECTED') return 'Rejected; this suggestion is not approved for use.';
  if (item.reviewStatus !== 'APPROVED') return 'Awaiting approval. Products are currently eligible.';
  return 'Not ready according to the latest check. Refresh details before use.';
}

/** Display only: shift decimal digits without binary multiplication/rounding.
 * Never change the API value or use the percentage to re-evaluate a rule.
 */
export function recommendationPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  const [, sign, whole, fraction = '', exponent = '0'] = String(value).match(/^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i)!;
  const digits = whole + fraction;
  const point = whole.length + Number(exponent) + 2;
  const shifted = point <= 0 ? `0.${'0'.repeat(-point)}${digits}` : point >= digits.length
    ? digits + '0'.repeat(point - digits.length) : `${digits.slice(0, point)}.${digits.slice(point)}`;
  const [integer, decimal = ''] = shifted.split('.');
  const tail = decimal.replace(/0+$/, '');
  return `${sign}${integer.replace(/^0+(?=\d)/, '')}${tail ? `.${tail}` : ''}%`;
}
export function RecommendationBadge({ status }: { status: string }) {
  const color = status === 'APPROVED' || status === 'ELIGIBLE' ? 'bg-emerald-50 text-emerald-800' :
    status === 'REJECTED' || status === 'INELIGIBLE' ? 'bg-red-50 text-red-800' :
    status === 'PENDING_REVIEW' || status === 'NEEDS_RECHECK' ? 'bg-amber-50 text-amber-900' : 'bg-[#F3F5F4] text-[#57534E]';
  return <span data-status={status} className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{recommendationLabel(status)}</span>;
}
export function RecommendationFields({ fields }: { fields: [string, ReactNode][] }) {
  return <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">{fields.map(([label, value]) =>
    <div key={label} className="min-w-0"><dt className="text-xs text-[#6D7974]">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium">{value}</dd></div>)}</dl>;
}
export function RecommendationProduct({ id, names = {} }: { id: number | null; names?: Record<number, string> }) {
  return id === null ? <>N/A</> : names[id] ? <><span className="font-semibold">{names[id]}</span><span className="ml-1 text-xs font-normal text-[#6D7974]">#{id}</span></> : <span className="font-medium">Product #{id}</span>;
}

export function RecommendationRuleSummary({ policy }: { policy: RecPolicy }) {
  return <RecommendationFields fields={[
    ['Bundle size', `Up to ${policy.maxBundleSize} products per bundle.`],
    ['Frequently bought together', `At least ${policy.minSupportCount} transactions and ${recommendationPercent(policy.minSupportRatio)} of past transactions.`],
    ['Cross-sell confidence', `At least ${recommendationPercent(policy.minConfidence)} in past shopping data.`],
    ['Stock per product', `At least ${policy.minimumSellableQuantity} sellable unit(s) per product.`]
  ]} />;
}
