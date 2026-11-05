import type { F03ConfigView, F03MatrixPage, F03Scores, F03Snapshot } from '../src/features/f03/f03.api';

export const configView: F03ConfigView = {
  config: { enableStock: true, enableExpiry: true, enableSeason: true, alpha: 0.5, beta: 0.2, gamma: 0.3, lambda: 0.4, expiryWindowDays: null, version: 7, scoringVersion: 'v1.2' },
  lambdaPolicy: { lambdaMin: 0, lambdaMax: 0.5, version: 3 }, lambdaValid: true
};
export const scores: F03Scores = {
  productId: 1, stockPriorityScore: 0.4, seasonalPriorityScore: 0.2, expiryScore: 1, weightValue: 1.184,
  expiryStatus: 'PUSH_REQUIRED', expiryEvidence: { expiryPushDays: 10, earliestEligibleExpiryDate: '2026-11-10', daysRemaining: 5, asOfDate: '2026-11-05', reason: 'WITHIN_THRESHOLD', batches: [] },
  expiryPushDays: 10, asOfDate: '2026-11-05', timeZone: 'Asia/Ho_Chi_Minh', configVersion: 7, lambdaValid: true, ready: true, warnings: []
};
export function matrix(page = 0): F03MatrixPage {
  return {
    items: Array.from({ length: page === 0 ? 20 : 1 }, (_, i) => ({ transactionId: page * 20 + i + 1, productId: 1, algorithmItemId: 1, quantity: 2, baseUtility: 10.123456,
      stockScore: 0.4, expiryScore: 1, seasonalScore: 0.2, expiryStatus: 'PUSH_REQUIRED', weightValue: 1.184, weightedUtility: 11.986172, transactionUtility: 11.986172, expiryEvidence: scores.expiryEvidence })),
    page, pageSize: 20, totalElements: 21, totalWeightedUtility: 251.709612, sourceHash: 'fixture-source', matrixHash: 'fixture-matrix', ready: true, warnings: [],
    configuration: { config: { ...configView.config }, lambdaPolicy: { ...configView.lambdaPolicy }, effectiveCoefficients: { alpha: 0.5, beta: 0.2, gamma: 0.3 }, analysisDate: '2026-11-05', source: 'F04_DATABASE_V1', utilityScale: 6, roundingMode: 'HALF_UP', itemMapping: 'PRODUCT_ID_V1', timeZone: 'Asia/Ho_Chi_Minh' }
  };
}
export function snapshot(id = 21): F03Snapshot {
  const result = matrix();
  return { snapshotId: id, storeId: 1, createdBy: 2, rangeStart: '2026-10-01', rangeEnd: '2026-10-31', asOfDate: '2026-11-05',
    configuration: result.configuration, sourceHash: result.sourceHash, matrixHash: result.matrixHash, totalWeightedUtility: result.totalWeightedUtility!, roundingScale: 6, status: 'READY', createdAt: '2026-11-05T02:00:00Z', warnings: [] };
}
