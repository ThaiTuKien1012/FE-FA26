import { f05Api } from './f05.api';
import { f05SystemApi } from './f05.system.api';
import type { MiningProgressView, Page, RequestView, RunView, SnapshotView } from './f05.types';

export interface MiningReader {
  scopeKey: string;
  kind: 'store' | 'system';
  listSnapshots(page: number, pageSize: number, signal?: AbortSignal): Promise<Page<SnapshotView>>;
  listRequests(page: number, pageSize: number, signal?: AbortSignal): Promise<Page<RequestView>>;
  getRequest(requestId: number, signal?: AbortSignal): Promise<RequestView>;
  listRuns(requestId: number, signal?: AbortSignal): Promise<RunView[]>;
  getRun?(runId: number, signal?: AbortSignal): Promise<RunView>;
  getProgress(requestId: number, signal?: AbortSignal): Promise<MiningProgressView>;
}
export const storeMiningReader: MiningReader = {
  kind:'store', scopeKey:'own-store',
  listSnapshots:(...args)=>f05Api.listSnapshots(...args),
  listRequests:(...args)=>f05Api.listRequests(...args),
  getRequest:(...args)=>f05Api.getRequest(...args),
  listRuns:(...args)=>f05Api.listRuns(...args),
  getRun:(...args)=>f05Api.getRun(...args),
  getProgress:(...args)=>f05Api.getProgress(...args)
};
export function systemMiningReader(storeId: number): MiningReader {
  return {
    kind:'system', scopeKey:`system-store:${storeId}`,
    listSnapshots:(...args)=>f05SystemApi.listSnapshots(storeId,...args),
    listRequests:(...args)=>f05SystemApi.listRequests(storeId,...args),
    getRequest:(...args)=>f05SystemApi.getRequest(storeId,...args),
    listRuns:(...args)=>f05SystemApi.listRuns(storeId,...args),
    // There is no administrative GET run endpoint. Details come from the run list.
    getProgress:(...args)=>f05SystemApi.getProgress(storeId,...args)
  };
}
