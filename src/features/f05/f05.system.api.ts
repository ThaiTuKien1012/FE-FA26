import { F05ApiError, miningId, miningPage, miningPagination, miningRequest, requireMiningRole, validateRequestKey } from './f05.http';
import { parseMinUtilInput } from './f05.numbers';
import { isMiningProgressView, isMiningConfiguration, isRequestView, isRunView, isSnapshotView } from './f05.read-contracts';
import type { MiningProgressView, ManualMiningRequest, MiningConfiguration, MiningConfigurationUpdate, Page, RequestView, RunView, SnapshotView, StoreView } from './f05.types';

function request<T>(path: string, init?: RequestInit) {
  requireMiningRole(true);
  return miningRequest<T>(path, init);
}
function storePath(storeId: number) { return `/api/system/mining/stores/${miningId(storeId, true)}`; }
export function validateManualRequest(payload: ManualMiningRequest): void {
  if (!payload || typeof payload !== 'object') throw new F05ApiError(400, 'Invalid manual mining payload.');
  validateRequestKey(payload.requestKey);
  miningId(payload.storeId, true); miningId(payload.snapshotId, true);
  if (Object.keys(payload).sort().join(',') !== 'requestKey,snapshotId,storeId') throw new F05ApiError(400, 'Send only storeId, snapshotId and requestKey for EFIM mining.');
}
export function validateConfiguration(payload: MiningConfigurationUpdate): void {
  if (!payload || Object.keys(payload).sort().join(',') !== 'expectedVersion,minUtilMode,minUtilValue' ||
      !Number.isSafeInteger(payload.expectedVersion) || payload.expectedVersion < 0 || payload.expectedVersion >= Number.MAX_SAFE_INTEGER) {
    throw new F05ApiError(400, 'Use a safe nonnegative configuration version and the current EFIM threshold contract.');
  }
  if (typeof payload.minUtilValue !== 'number' || !Number.isFinite(payload.minUtilValue)) throw new F05ApiError(400, 'Minimum utility must be a JSON number.');
  try { parseMinUtilInput(String(payload.minUtilValue), payload.minUtilMode); }
  catch (e) { throw new F05ApiError(400, e instanceof Error ? e.message : 'Invalid minimum utility.'); }
}
export const f05SystemApi = {
  async listStores(page = 0, pageSize = 20, signal?: AbortSignal): Promise<Page<StoreView>> {
    const result = await request<Page<StoreView>>(`/api/system/stores?${miningPagination(page,pageSize,100000)}`, { signal });
    miningPage<StoreView>(result,page,pageSize,x => {
      const s = x as StoreView | null;
      return Boolean(s && Number.isInteger(s.storeId) && s.storeId > 0 && s.storeId <= 2147483647 && typeof s.name === 'string');
    });
    if (new Set(result.items.map(s => s.storeId)).size !== result.items.length) throw new F05ApiError(200,'Duplicate Stores were rejected.');
    return result;
  },
  async getConfiguration(signal?: AbortSignal): Promise<MiningConfiguration> {
    const result = await request<MiningConfiguration>('/api/system/mining/config', { signal });
    if (!isMiningConfiguration(result)) throw new F05ApiError(200, 'Invalid mining configuration. Refresh before saving or submitting.');
    return result;
  },
  async updateConfiguration(payload: MiningConfigurationUpdate): Promise<MiningConfiguration> {
    validateConfiguration(payload);
    const { minUtilMode, minUtilValue, expectedVersion } = payload;
    const result = await request<MiningConfiguration>('/api/system/mining/config', {
      method:'PUT', headers:{ 'Content-Type':'application/json' },
      body:JSON.stringify({minUtilMode,minUtilValue,expectedVersion})
    });
    if (!isMiningConfiguration(result) || result.version !== expectedVersion+1 || result.algorithm !== 'EFIM' ||
        result.minUtilMode !== minUtilMode || result.minUtilValue !== minUtilValue) throw new F05ApiError(200,'The saved configuration response could not be verified. Refresh configuration before another action.');
    return result;
  },
  async listSnapshots(storeId: number, page = 0, pageSize = 20, signal?: AbortSignal): Promise<Page<SnapshotView>> {
    const result = await request<Page<SnapshotView>>(`${storePath(storeId)}/snapshots?${miningPagination(page,pageSize)}`,{signal});
    miningPage<SnapshotView>(result,page,pageSize,x => isSnapshotView(x) && x.storeId===storeId);
    return result;
  },
  async createRequest(payload: ManualMiningRequest): Promise<RequestView> {
    requireMiningRole(true);
    // Temporary Product Owner UI policy; Backend still supports administrative POST.
    // Keep this boundary closed for stale callers as well as hidden controls.
    void payload;
    throw new F05ApiError(403, 'Manual analysis is disabled for System Admin in this Frontend. A Merchandiser can run analysis for their Store.');
  },
  async listRequests(storeId: number, page = 0, pageSize = 20, signal?: AbortSignal): Promise<Page<RequestView>> {
    const result = await request<Page<RequestView>>(`${storePath(storeId)}/requests?${miningPagination(page,pageSize)}`,{signal});
    miningPage<RequestView>(result,page,pageSize,x => isRequestView(x) && x.storeId===storeId);
    return result;
  },
  async getRequest(storeId: number, requestId: number, signal?: AbortSignal): Promise<RequestView> {
    const result = await request<RequestView>(`${storePath(storeId)}/requests/${miningId(requestId)}`,{signal});
    if (!isRequestView(result) || result.storeId!==storeId || result.requestId!==requestId) throw new F05ApiError(200,'The request does not match the selected Store.');
    return result;
  },
  async listRuns(storeId: number, requestId: number, signal?: AbortSignal): Promise<RunView[]> {
    const result = await request<RunView[]>(`${storePath(storeId)}/requests/${miningId(requestId)}/runs`,{signal});
    if (!Array.isArray(result) || !result.every(r => isRunView(r) && r.storeId===storeId && r.requestId===requestId) ||
        new Set(result.map(r => r.runId)).size!==result.length) throw new F05ApiError(200,'Algorithm runs do not match the selected Store/request.');
    return result;
  },
  async getProgress(storeId: number, requestId: number, signal?: AbortSignal): Promise<MiningProgressView> {
    const result = await request<MiningProgressView>(`${storePath(storeId)}/requests/${miningId(requestId)}/progress`, {signal});
    if (!isMiningProgressView(result) || result.storeId!==storeId || result.requestId!==requestId) throw new F05ApiError(200,'Progress does not match the selected Store/request.');
    return result;
  }
};
