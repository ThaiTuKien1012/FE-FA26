import type { BenchmarkView, PatternView, RequestView, RunView } from './f05.types';

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';
const id = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const numeric = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
const nullableNumber = (value: unknown) => value === null || numeric(value);
const nullableString = (value: unknown) => value === null || typeof value === 'string';
const algorithm = (value: unknown) => value === 'HUI_MINER' || value === 'EFIM';
const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const nonnegative = (value: unknown) => numeric(value) && (value as number) >= 0;

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

export function isPatternView(value: unknown): value is PatternView {
  if (!object(value)) return false;
  return id(value.patternId) && id(value.runId) && Array.isArray(value.productIds) && value.productIds.length > 0 &&
    value.productIds.every(productId => id(productId) && productId <= 2147483647) &&
    new Set(value.productIds).size === value.productIds.length && value.patternSize === value.productIds.length &&
    nonnegative(value.utility) && count(value.utilitySpmf) &&
    (value.supportCount === null || count(value.supportCount));
}

export function isBenchmarkView(value: unknown): value is BenchmarkView {
  if (!object(value) || !isRunView(value.run)) return false;
  return typeof value.snapshotHash === 'string' && value.snapshotHash.length > 0 &&
    [value.transactionCount, value.distinctItems, value.inputBytes, value.utilityScale].every(count) &&
    id(value.divisor) && nonnegative(value.effectiveMinUtility) &&
    id(value.run.minUtilSpmf) && (value.run.runtimeMillis === null || count(value.run.runtimeMillis)) &&
    (value.run.memoryMiB === null || nonnegative(value.run.memoryMiB)) &&
    (value.run.patternCount === null || count(value.run.patternCount)) &&
    ['NOT_REQUESTED', 'PENDING', 'MATCH', 'FAILED', 'BLOCKED'].includes(String(value.comparisonStatus)) &&
    typeof value.repetitionPolicy === 'string' && value.repetitionPolicy.length > 0;
}
