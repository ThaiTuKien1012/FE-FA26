import type { RecExpiryPage, RecGenerationResult, RecPage, RecPolicy, RecView } from './f06.types';
import { INT32_MAX, REC_TYPES, REVIEW_STATUSES } from './f06.validation';

// Shape/number checks only. Business evidence, eligibility and ranking belong to
// the backend; never derive or repair any returned field here.
type Check = (value: unknown) => boolean;
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const shape = (fields: Record<string, Check>): Check => value => object(value) && Object.entries(fields).every(([key, check]) => check(value[key]));
const array = (check: Check): Check => value => Array.isArray(value) && value.every(check);
const nullable = (check: Check): Check => value => value === null || check(value);
const text: Check = value => typeof value === 'string';
const bool: Check = value => typeof value === 'boolean';
const integer = (min: number, max = Number.MAX_SAFE_INTEGER): Check => value => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const id = integer(1);
const int32Id = integer(1, INT32_MAX);
const count = integer(0);
const int32Count = integer(0, INT32_MAX);
const decimal: Check = value => typeof value === 'number' && Number.isFinite(value);
const oneOf = (values: readonly string[]): Check => value => typeof value === 'string' && values.includes(value);
const strings = array(text);
const recType = oneOf(REC_TYPES);
const reviewStatus = oneOf(REVIEW_STATUSES);
const eligibilityStatus = oneOf(['ELIGIBLE', 'NEEDS_RECHECK', 'INELIGIBLE']);
const policy = shape({
  version: id, maxBundleSize: integer(2, 256), minSupportCount: int32Id,
  minSupportRatio: decimal, minConfidence: decimal, minimumSellableQuantity: int32Id, ruleVersion: text
});
const eligibility = shape({
  status: eligibilityStatus, checkedAt: text, asOfDate: text, timeZone: text, warnings: strings, fingerprint: text,
  products: array(shape({ productId: int32Id, productStatus: text, sellableQuantity: count,
    status: eligibilityStatus, expiryPriorityScore: nullable(decimal), expiryStatus: text, expiryPushDays: int32Count, warnings: strings }))
});
const evidence = shape({
  totalTransactions: int32Count, supportCount: nullable(int32Count), supportRatio: nullable(decimal),
  anchorSupportCount: nullable(int32Count), confidence: nullable(decimal), status: text
});
const source = shape({
  runId: id, patternId: id, requestId: id, snapshotId: int32Id, algorithm: text, libraryVersion: text,
  conversionVersion: text, inputHash: text, sourceHash: text, matrixHash: text, minUtilMode: text,
  minUtilValue: decimal, minUtilSpmf: int32Id, effectiveMinUtility: decimal, patternUtility: decimal, analysisDate: text
});
const review = shape({
  oldStatus: reviewStatus, newStatus: reviewStatus, reviewedBy: int32Id, reviewedAt: text,
  reason: text, resultingVersion: id, eligibilityCheck: eligibility
});
const view = shape({
  recommendationId: id, storeId: int32Id, snapshotId: int32Id, type: recType, productIds: array(int32Id),
  anchorProductId: nullable(int32Id), utility: decimal, reviewStatus, version: id, ruleVersion: text,
  policy, evidence, generationEligibility: eligibility, currentEligibility: eligibility,
  inventoryChanged: bool, readyForConsumption: bool, sources: array(source), explanation: strings,
  reviewHistory: array(review), reviewedBy: nullable(int32Id), reviewedAt: nullable(text),
  reviewReason: nullable(text), createdAt: text, rank: nullable(int32Id)
});
const generation = shape({
  miningRunId: id, snapshotId: int32Id, policyVersion: id, ruleVersion: text,
  createdCount: int32Count, reusedCount: int32Count, recommendationIds: array(id),
  skipped: array(shape({ patternId: id, type: recType, anchorProductId: nullable(int32Id), reason: text }))
});
const page = shape({ page: int32Count, pageSize: integer(1, 100), totalElements: count });
const recPage = shape({ items: array(view), ordering: oneOf(['CREATED_DESC', 'RANKED_WITHIN_SOURCE_RUN']) });
const expiryPage = shape({
  asOfDate: text, timeZone: text, checkedAt: text, warnings: strings,
  items: array(shape({ productId: int32Id, batchId: int32Id, expiryDate: text, daysRemaining: count,
    remainingQuantity: count, expiryPushDays: int32Count, pushRequired: bool, checkedAt: text, status: text, warnings: strings }))
});
export const isRecPolicy = (value: unknown): value is RecPolicy => policy(value);
export const isRecView = (value: unknown): value is RecView => view(value);
export const isRecGenerationResult = (value: unknown): value is RecGenerationResult => generation(value);
export const isRecPage = (value: unknown): value is RecPage => page(value) && recPage(value);
export const isRecExpiryPage = (value: unknown): value is RecExpiryPage => page(value) && expiryPage(value);
