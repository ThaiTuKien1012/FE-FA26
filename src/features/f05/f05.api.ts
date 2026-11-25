import { authService } from '../../services/authService';
import { validateRequestKey } from './f05.http';
import { isMiningProgressView, isPatternView, isRequestView, isRunView, isSnapshotView } from './f05.read-contracts';
import { F05ApiError, miningId, miningPage, miningPagination, miningRequest, requireMiningRole } from './f05.http';
import type { MiningProgressView, StoreMiningRequest, Page, PatternView, RequestView, RunView, SnapshotView } from './f05.types';
export { F05ApiError } from './f05.http';

// Store-scoped reads; only Merchandiser may submit. Benchmark routes are retired.
function read<T>(path: string, signal?: AbortSignal) {
  requireMiningRole(false);
  return miningRequest<T>(`/api/mining${path}`, { signal });
}
const ownStore = (storeId: number) => authService.getCurrentUser()?.storeId == null || authService.getCurrentUser()?.storeId === storeId;
export const f05Api = {
  async getProductLabel(id: number, signal?: AbortSignal): Promise<string> {
    requireMiningRole(false);
    const product=await miningRequest<{id:number;name:string}>(`/api/products/${miningId(id,true)}`,{signal});
    if(product.id!==id || typeof product.name!=='string' || !product.name.trim()) throw new F05ApiError(200,'Product name unavailable.');
    return product.name;
  },
  async createRequest(payload: StoreMiningRequest): Promise<RequestView> {
    requireMiningRole(false);
    if (authService.getCurrentUser()?.role !== 'Merchandiser') throw new F05ApiError(403, 'Only a Merchandiser can submit mining for their Store.');
    validateRequestKey(payload?.requestKey); miningId(payload?.snapshotId, true);
    if (Object.keys(payload).sort().join(',') !== 'requestKey,snapshotId') throw new F05ApiError(400, 'Send only requestKey and snapshotId. Store and EFIM policy come from the backend.');
    const {requestKey,snapshotId}=payload;
    const result=await miningRequest<RequestView>('/api/mining/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestKey,snapshotId})});
    const store=authService.getCurrentUser()?.storeId;
    if (!isRequestView(result) || result.snapshotId!==snapshotId || result.storeId!==store || result.requestKey.toLowerCase()!==requestKey.toLowerCase() || result.algorithms.length!==1 || result.algorithms[0]!=='EFIM' || result.comparisonStatus!=='NOT_REQUESTED') throw new F05ApiError(202,'The submission response could not be verified. Check history and retain the same request key.');
    return result;
  },
  async getProgress(requestId: number, signal?: AbortSignal): Promise<MiningProgressView> {
    const result=await read<MiningProgressView>(`/requests/${miningId(requestId)}/progress`,signal);
    if (!isMiningProgressView(result) || result.requestId!==requestId || result.storeId!==authService.getCurrentUser()?.storeId) throw new F05ApiError(200,'Invalid or mismatched mining progress.');
    return result;
  },
  async listSnapshots(page = 0, pageSize = 20, signal?: AbortSignal): Promise<Page<SnapshotView>> {
    const result = await read<Page<SnapshotView>>(`/snapshots?${miningPagination(page, pageSize)}`, signal);
    miningPage<SnapshotView>(result, page, pageSize, value => isSnapshotView(value) && ownStore(value.storeId));
    if (new Set(result.items.map(x => x.storeId)).size > 1) throw new F05ApiError(200, 'Snapshots from multiple Stores were rejected.');
    return result;
  },
  async listRequests(page = 0, pageSize = 20, signal?: AbortSignal): Promise<Page<RequestView>> {
    const result = await read<Page<RequestView>>(`/requests?${miningPagination(page, pageSize)}`, signal);
    miningPage<RequestView>(result, page, pageSize, value => isRequestView(value) && ownStore(value.storeId));
    if (new Set(result.items.map(x => x.storeId)).size > 1) throw new F05ApiError(200, 'Requests from multiple Stores were rejected.');
    return result;
  },
  async getRequest(requestId: number, signal?: AbortSignal): Promise<RequestView> {
    const result = await read<RequestView>(`/requests/${miningId(requestId)}`, signal);
    if (!isRequestView(result) || result.requestId !== requestId || !ownStore(result.storeId)) throw new F05ApiError(200, 'Invalid or mismatched request details.');
    return result;
  },
  async listRuns(requestId: number, signal?: AbortSignal): Promise<RunView[]> {
    const result = await read<RunView[]>(`/requests/${miningId(requestId)}/runs`, signal);
    if (!Array.isArray(result) || !result.every(r => isRunView(r) && r.requestId === requestId && ownStore(r.storeId)) ||
        new Set(result.map(r => r.runId)).size !== result.length) throw new F05ApiError(200, 'Invalid or mismatched algorithm runs.');
    return result;
  },
  async getRun(runId: number, signal?: AbortSignal): Promise<RunView> {
    const result = await read<RunView>(`/runs/${miningId(runId)}`, signal);
    if (!isRunView(result) || result.runId !== runId || !ownStore(result.storeId)) throw new F05ApiError(200, 'Invalid or mismatched run details.');
    return result;
  },
  async listPatterns(runId: number, page = 0, pageSize = 20, signal?: AbortSignal): Promise<Page<PatternView>> {
    const result = await read<Page<PatternView>>(`/runs/${miningId(runId)}/patterns?${miningPagination(page, pageSize)}`, signal);
    miningPage<PatternView>(result, page, pageSize, x => isPatternView(x) && x.runId === runId);
    if (new Set(result.items.map(x => x.patternId)).size !== result.items.length) throw new F05ApiError(200, 'Duplicate patterns were rejected.');
    return result;
  }
};
