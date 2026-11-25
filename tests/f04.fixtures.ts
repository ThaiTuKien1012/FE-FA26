import type { ImportProgress, ImportSummary } from '../src/features/f04/f04.types';
export const summary = (patch: Partial<ImportSummary> = {}): ImportSummary => ({
  importBatchId: 41, status: 'COMPLETED', filename: 'sales.csv', startedAt: '2026-11-12T00:00:00Z', finishedAt: '2026-11-12T00:01:00Z',
  totalCount: 1000, validCount: 1000, rejectedCount: 0, totalOrderCount: 500, acceptedOrderCount: 490, duplicateOrderCount: 10, rejectedOrderCount: 0, conflictOrderCount: 0, errorSummary: null, ...patch
});
export const progress = (patch: Partial<ImportProgress> = {}): ImportProgress => ({
  importBatchId: 41, status: 'QUEUED', stage: 'QUEUED', processedCount: 0, totalCount: 1000, progressPercent: 0,
  createdAt: '2026-11-12T00:00:00Z', startedAt: null, updatedAt: '2026-11-12T00:00:00Z', completedAt: null,
  statistics: { validCount: 0, rejectedCount: 0, totalOrderCount: 0, acceptedOrderCount: 0, rejectedOrderCount: 0, duplicateOrderCount: 0, conflictOrderCount: 0 }, errorSummary: null, ...patch
});
