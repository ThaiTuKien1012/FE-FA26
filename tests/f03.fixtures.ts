import { W2, type F03ConfigView, type F03MatrixPage, type F03Scores, type F03Snapshot, type SeasonView, type LegacyFrozenConfiguration } from '../src/features/f03/f03.api';

export const configView: F03ConfigView = {
  config: { alpha: 0.6, beta: 0.4, lambda: 0.3, salesWindowDays: 30, version: 7, scoringVersion: W2 },
  lambdaPolicy: { lambdaMax: 0.5, version: 3, scoringVersion: W2 }, lambdaValid: true
};
export const season: SeasonView = { seasonId: 1, storeId: 1, name: 'Holiday', startDate: '2026-11-01', endDate: '2026-12-31', weight: 0.8, version: 2, productCount: 0, activeToday: true, createdBy: 2, updatedBy: 2, createdAt: '2026-11-01T02:00:00Z', updatedAt: '2026-11-05T02:00:00Z' };
export const scores: F03Scores = {
  productId: 1, expiryRisk: 0.25, seasonWeight: 0.8, seasonId: 1, weightValue: 1.14, expiryStatus: 'PUSH_DAY_REACHED',
  expiryEvidence: { scoringVersion: W2, asOfDate: '2026-11-05', reason: 'FEFO_RISK', salesWindowDays: 30, unitsSold: 60, dailySalesRate: 2, riskQuantity: 5, eligibleQuantity: 20, score: 0.25, batches: [{ batchId: 9, pushDay: '2026-11-03', expiryDate: '2026-11-20', daysToPush: -2, expectedSoldQuantity: 0, riskQuantity: 5, remainingQuantity: 5, eligible: true, warnings: [] }], warnings: [] },
  batchesMissingPushDay: [], activeSeasons: [{ seasonId: 1, name: 'Holiday', startDate: '2026-11-01', endDate: '2026-12-31', weight: 0.8, version: 2, productIds: [1] }],
  asOfDate: '2026-11-05', timeZone: 'Asia/Ho_Chi_Minh', configVersion: 7, scoringVersion: W2, lambdaValid: true, ready: true, warnings: []
};
export function matrix(page = 0): F03MatrixPage {
  return {
    items: Array.from({ length: page === 0 ? 20 : 1 }, (_, i) => ({ transactionId: page * 20 + i + 1, productId: 1, algorithmItemId: 1, quantity: 2, baseUtility: 10.123456,
      stockScore: null, expiryScore: null, seasonalScore: null, expiryRisk: 0.25, seasonWeight: 0.8, seasonId: 1, expiryStatus: 'PUSH_DAY_REACHED', weightValue: 1.14, weightedUtility: 11.54074, transactionUtility: 11.54074, expiryEvidence: scores.expiryEvidence })),
    page, pageSize: 20, totalElements: 21, totalWeightedUtility: 242.35554, sourceHash: 'fixture-source', matrixHash: 'fixture-matrix', ready: true, warnings: [],
    configuration: { config: { ...configView.config }, lambdaPolicy: { ...configView.lambdaPolicy }, effectiveCoefficients: { alpha: 0.6, beta: 0.4 }, analysisDate: '2026-11-05', source: 'F04_DATABASE_V1', utilityScale: 6, roundingMode: 'HALF_UP', weightScale: 2, weightRoundingMode: 'HALF_UP', seasons: scores.activeSeasons, itemMapping: 'PRODUCT_ID_V1', timeZone: 'Asia/Ho_Chi_Minh' }
  };
}
export function snapshot(id = 21): F03Snapshot {
  const result = matrix();
  if (typeof result.totalWeightedUtility !== "number") throw new Error("This shared fixture uses a safe numeric total.");
  return { snapshotId: id, storeId: 1, createdBy: 2, rangeStart: '2026-10-01', rangeEnd: '2026-10-31', asOfDate: '2026-11-05',
    configuration: result.configuration, sourceHash: result.sourceHash, matrixHash: result.matrixHash, totalWeightedUtility: result.totalWeightedUtility!, roundingScale: 6, status: 'READY', createdAt: '2026-11-05T02:00:00Z', warnings: [] };
}
export function legacyMatrix(scoringVersion: 'F03_LINEAR_V1' | 'EXPIRY_PRODUCT_EARLIEST_BATCH_BINARY_V1' = 'F03_LINEAR_V1'): F03MatrixPage {
  const frozen: LegacyFrozenConfiguration = { config: { enableStock: true, enableExpiry: true, enableSeason: true, alpha: 0.5, beta: 0.2, gamma: 0.3, lambda: 0.4, expiryWindowDays: 10, version: 3, scoringVersion }, lambdaPolicy: { lambdaMin: 0, lambdaMax: 0.5, version: 1 }, effectiveCoefficients: { alpha: 0.5, beta: 0.2, gamma: 0.3 }, analysisDate: '2026-10-15', source: 'F04_DATABASE_V1', utilityScale: 6, roundingMode: 'HALF_UP', itemMapping: 'PRODUCT_ID_V1', timeZone: 'Asia/Ho_Chi_Minh' };
  return { ...matrix(), configuration: frozen, items: [{ ...matrix().items[0], stockScore: 0.4, expiryScore: 1, seasonalScore: null, expiryRisk: null, seasonWeight: null, seasonId: null, weightValue: 1.16, weightedUtility: 11.743209, transactionUtility: 11.743209, expiryEvidence: { expiryPushDays: 10, earliestEligibleExpiryDate: '2026-10-20', daysRemaining: 5, asOfDate: '2026-10-15', reason: 'WITHIN_THRESHOLD', batches: [] } }], totalElements: 1, totalWeightedUtility: 11.743209, matrixHash: 'frozen-legacy-hash' };
}
