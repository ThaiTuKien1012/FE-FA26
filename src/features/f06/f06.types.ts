/** Wire numbers remain JSON numbers. The transport rejects unsafe integers and
 * decimals whose value would change on a JSON round trip; it never rounds them.
 * Dates are ISO dates; timestamps are ISO-8601 instants supplied by the server.
 */
export type Int32 = number;
export type Int64 = number;
export type Decimal = number;
export type RecType = 'BUNDLE' | 'CROSS_SELL' | 'FBT' | 'BANNER';
export type ReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
export type EligibilityStatus = 'ELIGIBLE' | 'NEEDS_RECHECK' | 'INELIGIBLE';

export interface RecGenerateRequest { miningRunId: Int64; types: RecType[]; }
export interface RecReviewRequest { expectedVersion: Int64; reason: string; }
export interface RecPolicyRequest {
  expectedVersion: Int64;
  maxBundleSize: Int32;
  minSupportCount: Int32;
  minSupportRatio: Decimal;
  minConfidence: Decimal;
  minimumSellableQuantity: Int32;
}
export interface RecPolicy extends Omit<RecPolicyRequest, 'expectedVersion'> {
  version: Int64;
  ruleVersion: string;
}
export interface RecTransactionEvidence {
  totalTransactions: Int32;
  supportCount: Int32 | null;
  supportRatio: Decimal | null;
  anchorSupportCount: Int32 | null;
  confidence: Decimal | null;
  status: string;
}
export interface RecProductEligibility {
  productId: Int32;
  productStatus: string;
  sellableQuantity: Int64;
  status: EligibilityStatus;
  expiryPriorityScore: Decimal | null;
  expiryStatus: string;
  expiryPushDays: Int32;
  warnings: string[];
}
export interface RecEligibility {
  status: EligibilityStatus;
  products: RecProductEligibility[];
  checkedAt: string;
  asOfDate: string;
  timeZone: string;
  warnings: string[];
  fingerprint: string;
}
export interface RecSource {
  runId: Int64;
  patternId: Int64;
  requestId: Int64;
  snapshotId: Int32;
  algorithm: string;
  libraryVersion: string;
  conversionVersion: string;
  inputHash: string;
  sourceHash: string;
  matrixHash: string;
  minUtilMode: string;
  minUtilValue: Decimal;
  minUtilSpmf: Int32;
  effectiveMinUtility: Decimal;
  patternUtility: Decimal;
  analysisDate: string;
}
export interface RecSkipped {
  patternId: Int64;
  type: RecType;
  anchorProductId: Int32 | null;
  reason: string;
}
export interface RecGenerationResult {
  miningRunId: Int64;
  snapshotId: Int32;
  policyVersion: Int64;
  ruleVersion: string;
  createdCount: Int32;
  reusedCount: Int32;
  recommendationIds: Int64[];
  skipped: RecSkipped[];
}
export interface RecReview {
  oldStatus: ReviewStatus;
  newStatus: ReviewStatus;
  reviewedBy: Int32;
  reviewedAt: string;
  reason: string;
  resultingVersion: Int64;
  eligibilityCheck: RecEligibility;
}
export interface RecView {
  recommendationId: Int64;
  storeId: Int32;
  snapshotId: Int32;
  type: RecType;
  productIds: Int32[];
  anchorProductId: Int32 | null;
  utility: Decimal;
  reviewStatus: ReviewStatus;
  version: Int64;
  ruleVersion: string;
  policy: RecPolicy;
  evidence: RecTransactionEvidence;
  generationEligibility: RecEligibility;
  currentEligibility: RecEligibility;
  inventoryChanged: boolean;
  readyForConsumption: boolean;
  sources: RecSource[];
  explanation: string[];
  reviewHistory: RecReview[];
  reviewedBy: Int32 | null;
  reviewedAt: string | null;
  reviewReason: string | null;
  createdAt: string;
  /** Server rank before pagination; null for history, detail and decisions. */
  rank: Int32 | null;
}
export interface RecPage {
  items: RecView[];
  page: Int32;
  pageSize: Int32;
  totalElements: Int64;
  ordering: 'CREATED_DESC' | 'RANKED_WITHIN_SOURCE_RUN';
}
export interface RecExpiryBatch {
  productId: Int32;
  batchId: Int32;
  expiryDate: string;
  daysRemaining: Int64;
  remainingQuantity: Int64;
  expiryPushDays: Int32;
  pushRequired: boolean;
  checkedAt: string;
  status: string;
  warnings: string[];
}
export interface RecExpiryPage {
  items: RecExpiryBatch[];
  page: Int32;
  pageSize: Int32;
  totalElements: Int64;
  asOfDate: string;
  timeZone: string;
  checkedAt: string;
  warnings: string[];
}
export interface RecListParams {
  miningRunId?: Int64;
  snapshotId?: Int32;
  type?: RecType;
  reviewStatus?: ReviewStatus;
  /** Zero-based, defaults to 0. */
  page?: Int32;
  /** 1..100, defaults to 20. */
  pageSize?: Int32;
}
export interface RecExpiryParams { productId?: Int32; page?: Int32; pageSize?: Int32; }
