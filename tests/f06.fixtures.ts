import type { RecEligibility, RecExpiryPage, RecGenerationResult, RecPolicy, RecPolicyRequest, RecView } from '../src/features/f06/f06.types';

// Test-only wire fixtures. No runtime service imports these values.
export const policy: RecPolicy = {
  version: 1, maxBundleSize: 4, minSupportCount: 2, minSupportRatio: 0.05,
  minConfidence: 0.5, minimumSellableQuantity: 1, ruleVersion: 'F06_RULES_V1_1'
};
export const policyRequest: RecPolicyRequest = {
  expectedVersion: 1, maxBundleSize: 4, minSupportCount: 2, minSupportRatio: 0.05,
  minConfidence: 0.5, minimumSellableQuantity: 1
};
export function eligibility(status: RecEligibility['status'] = 'ELIGIBLE'): RecEligibility {
  return {
    status, products: [31, 32].map(productId => ({ productId, productStatus: 'ACTIVE',
      sellableQuantity: 10, status, expiryPriorityScore: null, expiryStatus: 'MISSING_METADATA',
      expiryPushDays: 7, warnings: ['Missing expiry metadata'] })),
    checkedAt: '2026-11-06T17:00:01Z', asOfDate: '2026-11-07', timeZone: 'Asia/Ho_Chi_Minh',
    warnings: ['Missing expiry metadata'], fingerprint: 'fixture-fingerprint'
  };
}
export function recommendation(overrides: Partial<RecView> = {}): RecView {
  return {
    recommendationId: 62, storeId: 1, snapshotId: 2, type: 'BUNDLE', productIds: [31, 32],
    anchorProductId: null, utility: 40.123456, reviewStatus: 'PENDING_REVIEW', version: 1,
    ruleVersion: policy.ruleVersion, policy: { ...policy },
    evidence: { totalTransactions: 6, supportCount: 2, supportRatio: 0.333333,
      anchorSupportCount: null, confidence: null, status: 'AVAILABLE' },
    generationEligibility: eligibility(), currentEligibility: eligibility(), inventoryChanged: false,
    readyForConsumption: false, sources: [{ runId: 42, patternId: 82, requestId: 17, snapshotId: 2,
      algorithm: 'HUI_MINER', libraryVersion: 'SPMF_2.67a', conversionVersion: 'F03_SCALE6_GCD_INT32_DENSE_V1',
      inputHash: 'input', sourceHash: 'source', matrixHash: 'matrix', minUtilMode: 'ABSOLUTE',
      minUtilValue: 1, minUtilSpmf: 1, effectiveMinUtility: 10, patternUtility: 40.123456, analysisDate: '2026-10-20' }],
    explanation: ['Frozen utility, independent live eligibility'], reviewHistory: [],
    reviewedBy: null, reviewedAt: null, reviewReason: null, createdAt: '2026-10-20T14:19:53Z', rank: null,
    ...overrides
  };
}
export const generation: RecGenerationResult = {
  miningRunId: 42, snapshotId: 2, policyVersion: 1, ruleVersion: policy.ruleVersion,
  createdCount: 1, reusedCount: 0, recommendationIds: [62],
  skipped: [{ patternId: 83, type: 'BUNDLE', anchorProductId: null, reason: 'PATTERN_REQUIRES_AT_LEAST_TWO_PRODUCTS' }]
};
export function expiryPage(): RecExpiryPage {
  return {
    items: [{ productId: 31, batchId: 31, expiryDate: '2026-11-12', daysRemaining: 5,
      remainingQuantity: 10, expiryPushDays: 7, pushRequired: true,
      checkedAt: '2026-11-06T17:00:01Z', status: 'AVAILABLE', warnings: [] }],
    page: 0, pageSize: 20, totalElements: 1, asOfDate: '2026-11-07',
    timeZone: 'Asia/Ho_Chi_Minh', checkedAt: '2026-11-06T17:00:01Z', warnings: ['Product 32: missing required expiry metadata']
  };
}
