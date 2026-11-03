import type { F03FrozenConfiguration, F03Snapshot } from '../f03/f03.api';

// DTO numbers use JavaScript numbers. The F05 client rejects unsafe long values
// and decimals that would change during JSON parsing/serialization, rather than rounding.

export type Algorithm = 'HUI_MINER' | 'EFIM';
export type MinUtilMode = 'PERCENTAGE' | 'ABSOLUTE';
export type RequestStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type RunStatus = RequestStatus | 'TIMED_OUT';
export type ComparisonStatus = 'NOT_REQUESTED' | 'PENDING' | 'MATCH' | 'FAILED' | 'BLOCKED';

export interface Page<T> {
  items: T[];
  /** Zero-based backend page index. */
  page: number;
  /** Backend accepts 1..100; defaults to 20. */
  pageSize: number;
  totalElements: number;
}

export interface SnapshotView extends Omit<F03Snapshot, 'configuration'> {
  /** The DTO includes this field; historical snapshot metadata can be null. */
  configuration: F03FrozenConfiguration | null;
}

export interface ManualMiningRequest {
  storeId: number;
  /** Caller-supplied UUID, stable for replays of the same intended submission. */
  requestKey: string;
  snapshotId: number;
  compareAlgorithms: boolean;
}

export interface StoreView { storeId: number; name: string; }
export interface MiningConfiguration {
  version: number;
  algorithm: Algorithm | null;
  minUtilMode: MinUtilMode | null;
  minUtilValue: number | null;
  changedBy: number | null;
  changedAt: string | null;
}
export interface MiningConfigurationUpdate {
  algorithm: Algorithm;
  minUtilMode: MinUtilMode;
  minUtilValue: number;
  expectedVersion: number;
}

export interface RequestView {
  requestId: number;
  storeId: number;
  requestedBy: number;
  requestKey: string;
  snapshotId: number;
  algorithms: Algorithm[];
  minUtilMode: MinUtilMode;
  minUtilValue: number;
  minUtilSpmf: number;
  effectiveMinUtility: number;
  status: RequestStatus;
  comparisonStatus: ComparisonStatus;
  snapshotHash: string;
  inputHash: string;
  conversionVersion: string;
  utilityScale: number;
  roundingMode: string;
  divisor: number;
  totalScaledUtility: number;
  transactionCount: number;
  distinctItems: number;
  inputBytes: number;
  snapshot: SnapshotView;
  createdAt: string;
}

export interface RunView {
  runId: number;
  requestId: number;
  storeId: number;
  snapshotId: number;
  algorithm: Algorithm;
  attemptNo: number;
  libraryVersion: string;
  status: RunStatus;
  minUtilSpmf: number;
  inputHash: string;
  conversionVersion: string;
  startedAt: string | null;
  completedAt: string | null;
  runtimeMillis: number | null;
  memoryMiB: number | null;
  memoryMethod: string;
  runtimeMethod: string;
  environment: string | null;
  patternCount: number | null;
  failureCode: string | null;
  failureMessage: string | null;
}

export interface PatternView {
  patternId: number;
  runId: number;
  productIds: number[];
  /** Frozen weighted utility; supplied by the backend. */
  utility: number;
  utilitySpmf: number;
  patternSize: number;
  /** Not measured by the current backend; always null. */
  supportCount: number | null;
}

export interface BenchmarkView {
  run: RunView;
  snapshotHash: string;
  transactionCount: number;
  distinctItems: number;
  inputBytes: number;
  divisor: number;
  utilityScale: number;
  effectiveMinUtility: number;
  comparisonStatus: ComparisonStatus;
  repetitionPolicy: string;
}
