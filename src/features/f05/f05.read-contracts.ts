import type { BenchmarkView, MiningConfiguration, PatternView, RequestView, RunView, SnapshotView } from './f05.types';
import { parseMinUtilInput } from './f05.numbers';

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';
const id = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const numeric = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
const nullableNumber = (value: unknown) => value === null || numeric(value);
const nullableString = (value: unknown) => value === null || typeof value === 'string';
const algorithm = (value: unknown) => value === 'HUI_MINER' || value === 'EFIM';
const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const nonnegative = (value: unknown) => numeric(value) && (value as number) >= 0;

export function isSnapshotView(value: unknown): value is SnapshotView {
  if (!object(value)) return false;
  return [value.snapshotId,value.storeId,value.createdBy].every(v => id(v) && (v as number)<=2147483647) &&
    ['rangeStart','rangeEnd','asOfDate','sourceHash','matrixHash','createdAt'].every(k => typeof value[k]==='string') &&
    value.status==='READY' && nonnegative(value.totalWeightedUtility) && count(value.roundingScale) &&
    Array.isArray(value.warnings) && value.warnings.every(w => typeof w==='string') &&
    (value.configuration===null || (object(value.configuration) && object(value.configuration.config) &&
      typeof value.configuration.analysisDate==='string' && typeof value.configuration.config.scoringVersion==='string'));
}

export function isMiningConfiguration(value: unknown): value is MiningConfiguration {
  if (!object(value) || !count(value.version)) return false;
  if (value.version===0) return [value.algorithm,value.minUtilMode,value.minUtilValue,value.changedBy,value.changedAt].every(v => v===null);
  if (!algorithm(value.algorithm) || (value.minUtilMode!=='PERCENTAGE' && value.minUtilMode!=='ABSOLUTE') ||
      typeof value.minUtilValue!=='number' || !id(value.changedBy) || typeof value.changedAt!=='string') return false;
  try { parseMinUtilInput(String(value.minUtilValue),value.minUtilMode); return true; } catch { return false; }
}

export function isRequestView(value: unknown): value is RequestView {
  if (!object(value) || !object(value.snapshot)) return false;
  return id(value.requestId) && id(value.storeId) && id(value.snapshotId) &&
    [value.storeId,value.snapshotId,value.requestedBy].every(v => id(v) && (v as number)<=2147483647) &&
    typeof value.requestKey==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.requestKey) &&
    value.snapshot.snapshotId === value.snapshotId && value.snapshot.storeId === value.storeId &&
    Array.isArray(value.algorithms) && value.algorithms.length >= 1 && value.algorithms.length <= 2 &&
    new Set(value.algorithms).size === value.algorithms.length && value.algorithms.every(algorithm) &&
    ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'].includes(String(value.status)) &&
    ['NOT_REQUESTED', 'PENDING', 'MATCH', 'FAILED', 'BLOCKED'].includes(String(value.comparisonStatus)) &&
    (value.minUtilMode === 'PERCENTAGE' || value.minUtilMode === 'ABSOLUTE') &&
    numeric(value.minUtilValue) && (value.minUtilValue as number)>0 &&
    (value.minUtilMode!=='PERCENTAGE' || (value.minUtilValue as number)<=100) &&
    id(value.minUtilSpmf) && (value.minUtilSpmf as number)<=2147483647 && nonnegative(value.effectiveMinUtility) &&
    [value.transactionCount,value.distinctItems,value.inputBytes,value.utilityScale,value.totalScaledUtility].every(count) && id(value.divisor) &&
    [value.snapshotHash,value.inputHash,value.conversionVersion,value.roundingMode].every(v => typeof v==='string' && v.length>0) &&
    typeof value.createdAt === 'string' && typeof value.snapshot.rangeStart === 'string' && typeof value.snapshot.rangeEnd === 'string';
}

export function isRunView(value: unknown): value is RunView {
  if (!object(value)) return false;
  return [value.runId, value.requestId, value.storeId, value.snapshotId].every(id) && algorithm(value.algorithm) &&
    ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMED_OUT'].includes(String(value.status)) &&
    [value.startedAt, value.completedAt, value.environment, value.failureCode, value.failureMessage].every(nullableString) &&
    (value.runtimeMillis===null || count(value.runtimeMillis)) &&
    (value.patternCount===null || count(value.patternCount)) &&
    (value.memoryMiB===null || nonnegative(value.memoryMiB)) &&
    id(value.minUtilSpmf) && (value.minUtilSpmf as number)<=2147483647 &&
    typeof value.libraryVersion === 'string' && id(value.attemptNo) &&
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
