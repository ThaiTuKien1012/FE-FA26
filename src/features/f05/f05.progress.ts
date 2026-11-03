import { authService } from '../../services/authService';
import { f05Api, F05ApiError } from './f05.api';
import type { RequestView, RunView } from './f05.types';

export interface MiningProgress {
  request: RequestView;
  runs: RunView[];
  runDetail: RunView | null;
}

export const isRequestActive = (request: RequestView) => request.status === 'PENDING' || request.status === 'RUNNING';

/** One sequential read cycle at a time. The next cycle starts 1.5 seconds after
 * the previous one completes. All errors stop polling until an explicit Refresh.
 */
export function watchMiningRequest(
  requestId: number,
  onUpdate: (progress: MiningProgress) => void,
  onError: (error: unknown) => void,
  runId: number | null = null
): () => void {
  const controller = new AbortController();
  const token = authService.getToken();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
    controller.abort();
  };
  const checkSession = () => {
    if (authService.getToken() !== token) throw new F05ApiError(401, 'The active session changed. Refresh to load data for the current session.');
  };
  const cycle = async () => {
    try {
      checkSession();
      const request = await f05Api.getRequest(requestId, controller.signal);
      if (stopped) return;
      checkSession();
      const runs = await f05Api.listRuns(requestId, controller.signal);
      if (stopped) return;
      checkSession();
      if (runs.some(run => run.storeId !== request.storeId || run.snapshotId !== request.snapshotId || !request.algorithms.includes(run.algorithm))) {
        throw new F05ApiError(200, 'The returned runs do not belong to the selected request and store. No details were displayed.');
      }
      let runDetail: RunView | null = null;
      if (runId !== null) {
        if (!runs.some(run => run.runId === runId)) throw new F05ApiError(404, 'This run is not part of the selected request.');
        runDetail = await f05Api.getRun(runId, controller.signal);
        if (stopped) return;
        checkSession();
        if (runDetail.requestId !== requestId || runDetail.storeId !== request.storeId || runDetail.snapshotId !== request.snapshotId) {
          throw new F05ApiError(200, 'The returned run does not belong to the selected request and store.');
        }
      }
      onUpdate({ request, runs, runDetail });
      if (!stopped && isRequestActive(request)) timer = setTimeout(() => void cycle(), 1500);
    } catch (error) {
      if (stopped) return;
      stop();
      onError(error);
    }
  };
  void cycle();
  return stop;
}
