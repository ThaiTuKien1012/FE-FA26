import { authService } from '../../services/authService';
import { F05ApiError } from './f05.api';
import { storeMiningReader, type MiningReader } from './f05.reader';
import type { MiningProgressView, RequestView, RunView } from './f05.types';
export interface MiningProgress { request: RequestView; runs: RunView[]; runDetail: RunView | null; progress: MiningProgressView; }
export const isRequestActive = (request: Pick<RequestView, 'status'>) => request.status === 'PENDING' || request.status === 'RUNNING';
/** Sequential backend progress reads; no invented percentage, ETA or automatic retries. */
export function watchMiningRequest(requestId: number, onUpdate: (progress: MiningProgress) => void, onError: (error: unknown) => void, runId: number | null = null, reader: MiningReader = storeMiningReader): () => void {
  const controller = new AbortController();
  const identity = () => JSON.stringify([authService.getSessionId() || authService.getToken(), authService.getCurrentUser()?.id, authService.getCurrentUser()?.role, authService.getCurrentUser()?.storeId]);
  const scope = identity();
  let stopped = false, timer: ReturnType<typeof setTimeout> | undefined;
  let cached: Omit<MiningProgress, 'progress'> | undefined, transition = '';
  let unsubscribe = () => {};
  const stop = () => { stopped = true; if (timer !== undefined) clearTimeout(timer); controller.abort(); unsubscribe(); };
  const check = () => { if (identity() !== scope) throw new F05ApiError(401, 'The active session or Store changed. Refresh for the current session.'); };
  unsubscribe = authService.subscribe(() => { if (identity() !== scope && !stopped) { stop(); onError(new F05ApiError(401, 'The active session or Store changed.')); } });
  const cycle = async () => {
    try {
      check();
      const progress = await reader.getProgress(requestId, controller.signal);
      if (stopped) return; check();
      const nextTransition = JSON.stringify([progress.stage, progress.status, progress.currentRunId, progress.attemptNo, progress.comparisonStatus]);
      if (!cached || transition !== nextTransition || !isRequestActive(progress)) {
        const request = await reader.getRequest(requestId, controller.signal);
        if (stopped) return; check();
        const runs = await reader.listRuns(requestId, controller.signal);
        if (stopped) return; check();
        if (progress.storeId !== request.storeId || runs.some(run => run.storeId !== request.storeId || run.snapshotId !== request.snapshotId || !request.algorithms.includes(run.algorithm))) throw new F05ApiError(200, 'Mining progress/runs do not match this request and Store.');
        let runDetail: RunView | null = null;
        if (runId !== null) {
          if (!runs.some(run => run.runId === runId)) throw new F05ApiError(404, 'This run is not part of the selected request.');
          runDetail = reader.getRun ? await reader.getRun(runId, controller.signal) : runs.find(run => run.runId === runId)!;
          if (stopped) return; check();
          if (runDetail.requestId !== requestId || runDetail.storeId !== request.storeId || runDetail.snapshotId !== request.snapshotId || runDetail.algorithm !== runs.find(run => run.runId === runId)!.algorithm) throw new F05ApiError(200, 'The run does not belong to this request and Store.');
        }
        cached = { request, runs, runDetail }; transition = nextTransition;
      }
      if (cached.request.storeId !== progress.storeId) throw new F05ApiError(200, 'Progress belongs to a different Store.');
      onUpdate({ ...cached, request: { ...cached.request, status: progress.status, comparisonStatus: progress.comparisonStatus }, progress });
      if (!stopped && isRequestActive(progress)) timer = setTimeout(() => void cycle(), 1500); else stop();
    } catch (error) { if (!stopped) { stop(); onError(error); } }
  };
  void cycle(); return stop;
}
