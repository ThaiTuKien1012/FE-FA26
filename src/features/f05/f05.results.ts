import { F05ApiError } from './f05.api';
import type { BenchmarkView, RequestView, RunView } from './f05.types';

export const COLD_RUN_POLICY = 'ONE_COLD_RUN_PER_ALGORITHM_NO_WARMUP_SEQUENTIAL_SAME_LIMITS';
export const HEAP_METHOD = 'SPMF_SAMPLED_JAVA_HEAP_MIB_NOT_RSS';
export const WALL_TIME_METHOD = 'CHILD_JVM_WALL_TIME_INCLUDING_STARTUP_AND_IO_EXCLUDING_INPUT_PREPARATION';

/** Verify immutable input provenance before displaying a run's benchmark. */
export function assertBenchmarkContext(benchmark: BenchmarkView, request: RequestView, expectedRun: RunView): void {
  const run = benchmark.run;
  if (run.runId !== expectedRun.runId || run.algorithm !== expectedRun.algorithm ||
      run.requestId !== request.requestId || run.storeId !== request.storeId || run.snapshotId !== request.snapshotId ||
      !request.algorithms.includes(run.algorithm) || run.inputHash !== request.inputHash ||
      run.minUtilSpmf !== request.minUtilSpmf || run.conversionVersion !== request.conversionVersion ||
      benchmark.snapshotHash !== request.snapshotHash || benchmark.transactionCount !== request.transactionCount ||
      benchmark.distinctItems !== request.distinctItems || benchmark.inputBytes !== request.inputBytes ||
      benchmark.divisor !== request.divisor || benchmark.utilityScale !== request.utilityScale ||
      benchmark.effectiveMinUtility !== request.effectiveMinUtility) {
    throw new F05ApiError(200, 'Benchmark provenance does not match the selected request/run. No measurements were displayed.');
  }
}

/** No winner, speedup percentage or benchmark success is inferred from counts. */
export function assessBenchmarkComparison(request: RequestView, benchmarks: BenchmarkView[]): { comparable: boolean; message: string } {
  const unavailable = (message: string) => ({ comparable: false, message });
  if (request.algorithms.length === 1) return unavailable('One algorithm was requested. No two-algorithm comparison was requested (NOT_REQUESTED).');
  if (benchmarks.length !== 2 || new Set(benchmarks.map(item => item.run.algorithm)).size !== 2) {
    return unavailable('Both algorithm benchmarks are required before making a comparison.');
  }
  try {
    benchmarks.forEach(item => assertBenchmarkContext(item, request, item.run));
  } catch {
    return unavailable('Benchmark provenance does not match the selected request. No comparison is available.');
  }
  if (request.status !== 'COMPLETED' || benchmarks.some(item => item.run.status !== 'COMPLETED')) {
    return unavailable('The request and both runs must complete successfully before a performance comparison is available.');
  }
  if (request.comparisonStatus !== 'MATCH' || benchmarks.some(item => item.comparisonStatus !== 'MATCH')) {
    return unavailable('Canonical equivalence is not confirmed by MATCH. FAILED, BLOCKED or pending comparisons are not successful comparisons.');
  }
  const [first, second] = benchmarks;
  const sameInput = (['snapshotHash', 'transactionCount', 'distinctItems', 'inputBytes', 'divisor', 'utilityScale', 'effectiveMinUtility', 'repetitionPolicy'] as const)
    .every(key => first[key] === second[key]);
  const sameRunConditions = (['requestId', 'storeId', 'snapshotId', 'inputHash', 'minUtilSpmf', 'conversionVersion', 'libraryVersion', 'attemptNo', 'memoryMethod', 'runtimeMethod', 'environment'] as const)
    .every(key => first.run[key] === second.run[key]);
  if (!sameInput || !sameRunConditions || !first.run.environment?.trim() || !first.run.inputHash.trim() ||
      first.run.memoryMethod !== HEAP_METHOD || first.run.runtimeMethod !== WALL_TIME_METHOD || first.repetitionPolicy !== COLD_RUN_POLICY) {
    return unavailable('Input, threshold, conversion, methodology or environment is incompatible or unavailable. Measurements may be inspected individually; no performance comparison is made.');
  }
  if (benchmarks.some(item => item.run.runtimeMillis === null || item.run.memoryMiB === null || item.run.patternCount === null)) {
    return unavailable('Measurements are not available for both runs. No performance comparison is made.');
  }
  return { comparable: true, message: 'The backend reports MATCH for canonical itemsets and utilities, with compatible execution conditions. These are two single cold-run observations, not a general performance ranking.' };
}
