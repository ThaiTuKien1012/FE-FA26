import type { ReactNode } from 'react';
import type { Decimal, EligibilityStatus, RecPolicy, RecType, RecView } from '../f06.types';
import { ExactRecommendationNumber, recommendationDecimalText } from '../f06.numbers';

export const recommendationValue = (value: string | Decimal | null | undefined) => value == null ? 'N/A' : String(value);
export const recommendationYesNo = (value: boolean) => value ? 'Yes' : 'No';
export const recommendationNumber = (value: Decimal | null | undefined) => {
  if (value == null) return 'N/A';
  if (!(value instanceof ExactRecommendationNumber)) return value.toLocaleString('en-US', { maximumSignificantDigits: 21 });
  const text = String(value);
  if (/[eE]/.test(text)) return text;
  const [whole, fraction] = text.split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction === undefined ? '' : '.' + fraction);
};
const labels: Record<string, string> = {
  BUNDLE: 'Bundle', CROSS_SELL: 'Cross-sell', FBT: 'Frequently bought together', BANNER: 'Banner',
  APPROVED: 'Approved', REJECTED: 'Rejected', PENDING_REVIEW: 'Needs review',
  ELIGIBLE: 'Available', INELIGIBLE: 'Unavailable', NEEDS_RECHECK: 'Needs checking',
  AVAILABLE: 'Available', EVIDENCE_UNAVAILABLE: 'Shopping evidence unavailable', ZERO_ANCHOR_SUPPORT: 'No recorded purchases of the starting product',
  NOT_APPLICABLE: 'N/A', NO_SELLABLE_BATCH: 'No sellable stock', MISSING_METADATA: 'Missing expiry information', UNAVAILABLE: 'Unavailable',
  ACTIVE: 'Active', INACTIVE: 'Inactive', BLOCKED: 'Blocked', COMPLETED: 'Completed', FAILED: 'Failed',
  RUNNING: 'Running', PENDING: 'Pending', TIMED_OUT: 'Timed out', MATCH: 'Matched', NOT_REQUESTED: 'Not compared'
};
export const recommendationLabel = (value: string) => labels[value] ?? value.replaceAll('_', ' ').toLowerCase();
export const recommendationAvailability = (status: EligibilityStatus) => ({
  ELIGIBLE: 'Current selling conditions are met.', INELIGIBLE: 'Current selling conditions are not met.',
  NEEDS_RECHECK: 'Product availability needs a recheck.'
})[status];

/** Explain the server decision without replacing readyForConsumption or
 * recalculating eligibility. Rejected decisions are never called pending.
 */
export function recommendationReadiness(item: Pick<RecView, 'readyForConsumption' | 'reviewStatus' | 'currentEligibility'>): string {
  if (item.readyForConsumption) return 'Approved and currently available. Recheck availability at the time of use.';
  const availability = item.currentEligibility.status;
  const review = item.reviewStatus === 'REJECTED' ? 'Rejected' : item.reviewStatus === 'APPROVED' ? 'Approved' : 'Awaiting approval';
  if (availability === 'INELIGIBLE') return `${review}; current selling conditions are not met.`;
  if (availability === 'NEEDS_RECHECK') return `${review}; product availability needs a recheck.`;
  if (item.reviewStatus === 'REJECTED') return 'Rejected; this suggestion is not approved for use.';
  if (item.reviewStatus !== 'APPROVED') return 'Awaiting approval. Products are currently available.';
  return 'Readiness could not be confirmed by the latest check. Refresh details before use.';
}

/** Display only: shift decimal digits without binary multiplication/rounding.
 * Never change the API value or use the percentage to re-evaluate a rule.
 */
export function recommendationPercent(value: Decimal | null | undefined): string {
  if (value == null || typeof value === 'number' && !Number.isFinite(value)) return 'N/A';
  if (value instanceof ExactRecommendationNumber) return recommendationDecimalText(value.source, 2).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') + '%';
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
  return <span data-status={status} className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{recommendationLabel(status)}</span>;
}
export function RecommendationFields({ fields }: { fields: [string, ReactNode][] }) {
  return <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">{fields.map(([label, value]) =>
    <div key={label} className="min-w-0"><dt className="text-xs text-[#6D7974]">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium">{value}</dd></div>)}</dl>;
}
export function RecommendationProduct({ id, names = {} }: { id: number | null; names?: Record<number, string> }) {
  return id === null ? <>N/A</> : names[id] ? <span className="font-semibold">{names[id]}</span> : <span className="font-medium">Product #{id}</span>;
}

export function RecommendationRuleSummary({ policy }: { policy: RecPolicy }) {
  return <RecommendationFields fields={[
    ['Bundle size', `Up to ${policy.maxBundleSize} products per bundle.`],
    ['Frequently bought together', `At least ${policy.minSupportCount} transactions and ${recommendationPercent(policy.minSupportRatio)} of past transactions.`],
    ['Cross-sell confidence', `At least ${recommendationPercent(policy.minConfidence)} in past shopping data.`],
    ['Stock per product', `At least ${policy.minimumSellableQuantity} sellable unit(s) per product.`]
  ]} />;
}

export function RecommendationTypeQualification({ type, policy }: { type: RecType; policy?: RecPolicy | null }) {
  const rules: Record<RecType, string[]> = {
    BUNDLE: [policy ? `At least 2 products, up to ${policy.maxBundleSize} under the loaded store rules.` : 'At least 2 products, up to the configured maximum bundle size.', 'No automatic discount or selling price.'],
    CROSS_SELL: ['One starting product and one or more suggested additions. Each starting product creates a separate candidate.', policy ? `Requires historical co-purchases and at least ${recommendationPercent(policy.minConfidence)} directional confidence under the loaded store rules.` : 'Requires historical co-purchases and the configured minimum directional confidence.'],
    FBT: ['At least 2 products with recorded historical co-purchases.', policy ? `At least ${recommendationNumber(policy.minSupportCount)} shared orders and ${recommendationPercent(policy.minSupportRatio)} of historical orders under the loaded store rules.` : 'Must meet the configured minimum shared orders and historical frequency.'],
    BANNER: ['May contain one product or a product group.', 'Does not create a banner image or publish a promotion.']
  };
  return <details className="mt-3 text-xs leading-5 text-[#57534E]"><summary className="cursor-pointer font-medium text-[#356B54]">How {type === 'FBT' ? 'Frequently Bought Together' : recommendationLabel(type)} qualifies</summary><ul className="mt-2 list-disc space-y-1 pl-4">{rules[type].map(line => <li key={line}>{line}</li>)}</ul></details>;
}
