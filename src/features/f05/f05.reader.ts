import { f05Api } from './f05.api';
import { f05SystemApi } from './f05.system.api';
import type { BenchmarkView, Page, RequestView, RunView, SnapshotView } from './f05.types';

export interface MiningReader {
  scopeKey: string;
  kind: 'store' | 'system';
  listSnapshots(page: number, pageSize: number, signal?: AbortSignal): Promise<Page<SnapshotView>>;
  listRequests(page: number, pageSize: number, signal?: AbortSignal): Promise<Page<RequestView>>;
  getRequest(requestId: number, signal?: AbortSignal): Promise<RequestView>;
  listRuns(requestId: number, signal?: AbortSignal): Promise<RunView[]>;
  getRun?(runId: number, signal?: AbortSignal): Promise<RunView>;
  getBenchmark?(runId: number, signal?: AbortSignal): Promise<BenchmarkView>;
}
export const storeMiningReader: MiningReader = {
  kind:'store', scopeKey:'own-store',
  listSnapshots:(...args)=>f05Api.listSnapshots(...args),
  listRequests:(...args)=>f05Api.listRequests(...args),
  getRequest:(...args)=>f05Api.getRequest(...args),
  listRuns:(...args)=>f05Api.listRuns(...args),
  getRun:(...args)=>f05Api.getRun(...args)
};
export function systemMiningReader(storeId: number): MiningReader {
  return {
    kind:'system', scopeKey:`system-store:${storeId}`,
    listSnapshots:(...args)=>f05SystemApi.listSnapshots(storeId,...args),
    listRequests:(...args)=>f05SystemApi.listRequests(storeId,...args),
    getRequest:(...args)=>f05SystemApi.getRequest(storeId,...args),
    listRuns:(...args)=>f05SystemApi.listRuns(storeId,...args),
    // There is no administrative GET run endpoint. Details come from the run list.
    getBenchmark:(...args)=>f05SystemApi.getBenchmark(storeId,...args)
  };
}
