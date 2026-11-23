import type { MiningNumber } from './f05.precision';
import type { F03FrozenConfiguration, F03Snapshot } from '../f03/f03.api';

// IDs and paging remain safe integers; decimal and long metadata retain exact values.

export type Algorithm = 'HUI_MINER' | 'EFIM';
export type MinUtilMode = 'PERCENTAGE' | 'ABSOLUTE';
export type RequestStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type RunStatus = RequestStatus | 'TIMED_OUT';
export type ComparisonStatus = 'NOT_REQUESTED' | 'PENDING' | 'MATCH' | 'FAILED' | 'BLOCKED';
export type ConversionMode = 'LOSSLESS' | 'WHOLE_UNIT_HALF_UP';
export interface MiningConversionMetadata {
  /** Additive response fields; absent on pre-2026-11-19 API responses. */
  conversionMode?: ConversionMode | null;
  roundingUnit?: MiningNumber | null;
}

export interface Page<T> {
  items: T[];
  /** Zero-based backend page index. */
  page: number;
  /** Backend accepts 1..100; defaults to 20. */
  pageSize: number;
  totalElements: number;
}

export interface SnapshotView extends Omit<F03Snapshot<MiningNumber>, 'configuration'> {
  /** The DTO includes this field; historical snapshot metadata can be null. */
  configuration: F03FrozenConfiguration | null;
}

export interface StoreMiningRequest {
  requestKey: string;
  snapshotId: number;
}
export interface SystemMiningRequest extends StoreMiningRequest {
  storeId: number;
}
/** New writes are EFIM-only; Algorithm remains a legacy read enum. */
export type ManualMiningRequest = SystemMiningRequest;

export interface StoreView { storeId: number; name: string; }
export interface MiningConfiguration {
  version: number;
  algorithm: 'EFIM';
  minUtilMode: MinUtilMode | null;
  minUtilValue: MiningNumber | null;
  changedBy: number | null;
  changedAt: string | null;
}
export interface MiningConfigurationUpdate {
  minUtilMode: MinUtilMode;
  minUtilValue: MiningNumber;
  expectedVersion: number;
}

export interface MiningProgressView {
  requestId: number;
  storeId: number;
  status: RequestStatus;
  stage: 'LEGACY' | 'QUEUED' | 'RUNNING' | 'SAVING' | 'COMPARING' | 'COMPLETED' | 'FAILED';
  stageStartedAt: string | null;
  currentRunId: number | null;
  algorithm: Algorithm | null;
  attemptNo: number;
  completedSteps: number;
  totalSteps: number;
  percent: number;
  elapsedMs: MiningNumber | null;
  timeoutMs: MiningNumber | null;
  comparisonStatus: ComparisonStatus;
}

export interface RequestView extends MiningConversionMetadata {
  requestId: number;
  storeId: number;
  requestedBy: number;
  requestKey: string;
  snapshotId: number;
  algorithms: Algorithm[];
  minUtilMode: MinUtilMode;
  minUtilValue: MiningNumber;
  minUtilSpmf: number;
  effectiveMinUtility: MiningNumber;
  status: RequestStatus;
  comparisonStatus: ComparisonStatus;
  snapshotHash: string;
  inputHash: string;
  conversionVersion: string;
  utilityScale: number;
  roundingMode: string;
  divisor: MiningNumber;
  totalScaledUtility: MiningNumber;
  transactionCount: number;
  distinctItems: number;
  inputBytes: number;
  snapshot: SnapshotView;
  createdAt: string;
}

export interface RunView extends MiningConversionMetadata {
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
  runtimeMillis: MiningNumber | null;
  memoryMiB: MiningNumber | null;
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
  /** Backend analysis utility: exact for lossless input, whole-unit for fallback. */
  utility: MiningNumber;
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
  divisor: MiningNumber;
  utilityScale: number;
  effectiveMinUtility: MiningNumber;
  comparisonStatus: ComparisonStatus;
  repetitionPolicy: string;
}
