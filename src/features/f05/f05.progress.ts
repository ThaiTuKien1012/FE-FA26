import { authService } from '../../services/authService';
import { F05ApiError } from './f05.api';
import { storeMiningReader } from './f05.reader';
import type { MiningReader } from './f05.reader';
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
  runId: number | null = null,
  reader: MiningReader = storeMiningReader
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
      const request = await reader.getRequest(requestId, controller.signal);
      if (stopped) return;
      checkSession();
      const runs = await reader.listRuns(requestId, controller.signal);
      if (stopped) return;
      checkSession();
      if (runs.some(run => run.storeId !== request.storeId || run.snapshotId !== request.snapshotId || !request.algorithms.includes(run.algorithm))) {
        throw new F05ApiError(200, 'The returned runs do not belong to the selected request and store. No details were displayed.');
      }
      let runDetail: RunView | null = null;
      if (runId !== null) {
        if (!runs.some(run => run.runId === runId)) throw new F05ApiError(404, 'This run is not part of the selected request.');
        runDetail = reader.getRun ? await reader.getRun(runId, controller.signal) : runs.find(run => run.runId===runId)!;
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
