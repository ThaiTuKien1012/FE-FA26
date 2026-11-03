import { isPatternView, isRequestView, isRunView, isSnapshotView } from './f05.read-contracts';
import { F05ApiError, miningId, miningPage, miningPagination, miningRequest, requireMiningRole } from './f05.http';
import type { Page, PatternView, RequestView, RunView, SnapshotView } from './f05.types';
export { F05ApiError } from './f05.http';

// Store users have read-only access. The retired POST and benchmark routes are absent.
function read<T>(path: string, signal?: AbortSignal) {
  requireMiningRole(false);
  return miningRequest<T>(`/api/mining${path}`, { signal });
}
export const f05Api = {
  async listSnapshots(page = 0, pageSize = 20, signal?: AbortSignal): Promise<Page<SnapshotView>> {
    const result = await read<Page<SnapshotView>>(`/snapshots?${miningPagination(page, pageSize)}`, signal);
    miningPage<SnapshotView>(result, page, pageSize, isSnapshotView);
    if (new Set(result.items.map(x => x.storeId)).size > 1) throw new F05ApiError(200, 'Snapshots from multiple Stores were rejected.');
    return result;
  },
  async listRequests(page = 0, pageSize = 20, signal?: AbortSignal): Promise<Page<RequestView>> {
    const result = await read<Page<RequestView>>(`/requests?${miningPagination(page, pageSize)}`, signal);
    miningPage<RequestView>(result, page, pageSize, isRequestView);
    if (new Set(result.items.map(x => x.storeId)).size > 1) throw new F05ApiError(200, 'Requests from multiple Stores were rejected.');
    return result;
  },
  async getRequest(requestId: number, signal?: AbortSignal): Promise<RequestView> {
    const result = await read<RequestView>(`/requests/${miningId(requestId)}`, signal);
    if (!isRequestView(result) || result.requestId !== requestId) throw new F05ApiError(200, 'Invalid or mismatched request details.');
    return result;
  },
  async listRuns(requestId: number, signal?: AbortSignal): Promise<RunView[]> {
    const result = await read<RunView[]>(`/requests/${miningId(requestId)}/runs`, signal);
    if (!Array.isArray(result) || !result.every(r => isRunView(r) && r.requestId === requestId) ||
        new Set(result.map(r => r.runId)).size !== result.length) throw new F05ApiError(200, 'Invalid or mismatched algorithm runs.');
    return result;
  },
  async getRun(runId: number, signal?: AbortSignal): Promise<RunView> {
    const result = await read<RunView>(`/runs/${miningId(runId)}`, signal);
    if (!isRunView(result) || result.runId !== runId) throw new F05ApiError(200, 'Invalid or mismatched run details.');
    return result;
  },
  async listPatterns(runId: number, page = 0, pageSize = 20, signal?: AbortSignal): Promise<Page<PatternView>> {
    const result = await read<Page<PatternView>>(`/runs/${miningId(runId)}/patterns?${miningPagination(page, pageSize)}`, signal);
    miningPage<PatternView>(result, page, pageSize, x => isPatternView(x) && x.runId === runId);
    if (new Set(result.items.map(x => x.patternId)).size !== result.items.length) throw new F05ApiError(200, 'Duplicate patterns were rejected.');
    return result;
  }
};
