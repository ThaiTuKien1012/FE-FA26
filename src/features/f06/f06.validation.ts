import { F06ApiError } from './f06.http';
import type { RecGenerateRequest, RecPolicyRequest, RecReviewRequest } from './f06.types';

export const REC_TYPES = ['BUNDLE', 'CROSS_SELL', 'FBT', 'BANNER'] as const;
export const REVIEW_STATUSES = ['PENDING_REVIEW', 'APPROVED', 'REJECTED'] as const;
export const INT32_MAX = 2147483647;

export function recommendationInteger(value: number, name: string, min = 1, max = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new F06ApiError(400, `${name} must be an integer in ${min}..${max}.`);
  return value;
}
export function recommendationFields(value: unknown, allowed: readonly string[]): void {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k))) {
    throw new F06ApiError(400, 'Unsupported recommendation request fields.');
  }
}
/** Validate fractional units without multiplying binary floating-point values. */
function ratio(value: number, name: string): void {
  if (typeof value !== 'number' || !/^(?:0(?:\.\d{1,6})?|1(?:\.0{1,6})?)$/.test(String(value))) {
    throw new F06ApiError(400, `${name} must be in 0..1 with at most six fractional digits.`);
  }
}
export function validateGeneration(request: RecGenerateRequest): void {
  recommendationFields(request, ['miningRunId', 'types']);
  recommendationInteger(request.miningRunId, 'miningRunId');
  if (!Array.isArray(request.types) || request.types.length < 1 || request.types.length > 4 ||
      !request.types.every(type => REC_TYPES.includes(type)) || new Set(request.types).size !== request.types.length) {
    throw new F06ApiError(400, 'Select one to four unique recommendation types.');
  }
}
export function validateReview(request: RecReviewRequest): void {
  recommendationFields(request, ['expectedVersion', 'reason']);
  recommendationInteger(request.expectedVersion, 'expectedVersion');
  if (typeof request.reason !== 'string' || !request.reason.trim() || request.reason.length > 1000) {
    throw new F06ApiError(400, 'A nonblank review reason of at most 1000 characters is required.');
  }
}
export function validatePolicy(request: RecPolicyRequest): void {
  recommendationFields(request, ['expectedVersion', 'maxBundleSize', 'minSupportCount', 'minSupportRatio', 'minConfidence', 'minimumSellableQuantity']);
  recommendationInteger(request.expectedVersion, 'expectedVersion');
  recommendationInteger(request.maxBundleSize, 'maxBundleSize', 2, 256);
  recommendationInteger(request.minSupportCount, 'minSupportCount', 1, INT32_MAX);
  recommendationInteger(request.minimumSellableQuantity, 'minimumSellableQuantity', 1, INT32_MAX);
  ratio(request.minSupportRatio, 'minSupportRatio');
  ratio(request.minConfidence, 'minConfidence');
}
