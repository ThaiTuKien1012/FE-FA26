import type { RequestView, RunView } from './f05.types';

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';
const id = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const numeric = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
const nullableNumber = (value: unknown) => value === null || numeric(value);
const nullableString = (value: unknown) => value === null || typeof value === 'string';
const algorithm = (value: unknown) => value === 'HUI_MINER' || value === 'EFIM';

export function isRequestView(value: unknown): value is RequestView {
  if (!object(value) || !object(value.snapshot)) return false;
  return id(value.requestId) && id(value.storeId) && id(value.snapshotId) &&
    value.snapshot.snapshotId === value.snapshotId && value.snapshot.storeId === value.storeId &&
    Array.isArray(value.algorithms) && value.algorithms.length >= 1 && value.algorithms.length <= 2 &&
    new Set(value.algorithms).size === value.algorithms.length && value.algorithms.every(algorithm) &&
    ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'].includes(String(value.status)) &&
    ['NOT_REQUESTED', 'PENDING', 'MATCH', 'FAILED', 'BLOCKED'].includes(String(value.comparisonStatus)) &&
    (value.minUtilMode === 'PERCENTAGE' || value.minUtilMode === 'ABSOLUTE') &&
    [value.minUtilValue, value.minUtilSpmf, value.effectiveMinUtility, value.transactionCount, value.distinctItems].every(numeric) &&
    typeof value.createdAt === 'string' && typeof value.snapshot.rangeStart === 'string' && typeof value.snapshot.rangeEnd === 'string';
}

export function isRunView(value: unknown): value is RunView {
  if (!object(value)) return false;
  return [value.runId, value.requestId, value.storeId, value.snapshotId].every(id) && algorithm(value.algorithm) &&
    ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMED_OUT'].includes(String(value.status)) &&
    [value.startedAt, value.completedAt, value.environment, value.failureCode, value.failureMessage].every(nullableString) &&
    [value.runtimeMillis, value.memoryMiB, value.patternCount].every(nullableNumber) &&
    typeof value.libraryVersion === 'string' && numeric(value.attemptNo) &&
    typeof value.memoryMethod === 'string' && typeof value.runtimeMethod === 'string' &&
    typeof value.inputHash === 'string' && typeof value.conversionVersion === 'string';
}
