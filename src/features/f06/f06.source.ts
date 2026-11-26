import { authService } from '../../services/authService';
import { f05Api } from '../f05/f05.api';
import { sameMiningInput } from '../f05/f05.conversion';
import type { RequestView, RunView } from '../f05/f05.types';
import { F06ApiError } from './f06.api';
import { recommendationInteger } from './f06.validation';

export interface RecommendationSource { request: RequestView; run: RunView }

/** Resolve a historical run directly; the first history page is not an ownership check. */
export async function readRecommendationSource(runId: number, signal: AbortSignal): Promise<RecommendationSource> {
  recommendationInteger(runId, 'miningRunId');
  const store = authService.getCurrentUser()?.storeId;
  const run = await f05Api.getRun(runId, signal);
  signal.throwIfAborted();
  if (run.runId !== runId || run.storeId !== store) throw new F06ApiError(404, 'This analysis is unavailable for your Store.');
  if (run.status !== 'COMPLETED') throw new F06ApiError(409, 'Choose an analysis with completed results.');
  const request = await f05Api.getRequest(run.requestId, signal);
  signal.throwIfAborted();
  if (request.requestId !== run.requestId || request.storeId !== store || request.snapshotId !== run.snapshotId ||
      !request.algorithms.includes(run.algorithm) || !sameMiningInput(request, run)) {
    throw new F06ApiError(200, 'The saved analysis source could not be verified. Refresh or choose another analysis.');
  }
  return { request, run };
}
