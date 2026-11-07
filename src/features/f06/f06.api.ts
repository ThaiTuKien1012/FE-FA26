import { f05Api, F05ApiError } from '../f05/f05.api';
import { assertRecommendationSession, F06ApiError, recommendationRequest, recommendationSession, requireRecommendationRole } from './f06.http';
import { isRecExpiryPage, isRecGenerationResult, isRecPage, isRecPolicy, isRecView } from './f06.read-contracts';
import { INT32_MAX, REC_TYPES, REVIEW_STATUSES, recommendationFields, recommendationInteger, validateGeneration, validatePolicy, validateReview } from './f06.validation';
import type { RecExpiryPage, RecExpiryParams, RecGenerateRequest, RecGenerationResult, RecListParams, RecPage, RecPolicy, RecPolicyRequest, RecReviewRequest, RecView } from './f06.types';
export { F06ApiError } from './f06.http';

function assertResponse(valid: boolean): asserts valid {
  if (!valid) throw new F06ApiError(200, 'The server returned invalid or mismatched recommendation data. Reload before making a decision.');
}
function pagination(params: { page?: number; pageSize?: number }) {
  const page = recommendationInteger(params.page === undefined ? 0 : params.page, 'page', 0, INT32_MAX);
  const pageSize = recommendationInteger(params.pageSize === undefined ? 20 : params.pageSize, 'pageSize', 1, 100);
  return { page, pageSize, query: new URLSearchParams({ page: String(page), pageSize: String(pageSize) }) };
}
function matchingPage(result: RecPage | RecExpiryPage, page: number, pageSize: number): boolean {
  return result.page === page && result.pageSize === pageSize && result.items.length <= pageSize && result.totalElements >= result.items.length;
}
const json = (method: 'POST' | 'PUT', body: string, signal?: AbortSignal): RequestInit => ({
  method, headers: { 'Content-Type': 'application/json' }, body, signal
});
async function review(id: number, request: RecReviewRequest, action: 'approve' | 'reject', signal?: AbortSignal): Promise<RecView> {
  requireRecommendationRole('review');
  recommendationInteger(id, 'recommendationId');
  validateReview(request);
  const result = await recommendationRequest<unknown>(`/${id}/${action}`, json('POST', JSON.stringify(request), signal));
  assertResponse(isRecView(result) && result.recommendationId === id);
  return result;
}

export const f06Api = {
  /** Explicit user submission only. Preflight reads F05; it never starts mining.
   * The backend remains authoritative for frozen source validity and races.
   */
  async generate(request: RecGenerateRequest, signal?: AbortSignal): Promise<RecGenerationResult> {
    requireRecommendationRole('review');
    validateGeneration(request);
    const body = JSON.stringify(request);
    const runId = request.miningRunId;
    const session = recommendationSession();
    let run: Awaited<ReturnType<typeof f05Api.getRun>>;
    try { run = await f05Api.getRun(runId, signal); }
    catch (error) {
      signal?.throwIfAborted();
      if (error instanceof F05ApiError) throw new F06ApiError(error.status, error.message);
      throw error;
    }
    assertRecommendationSession(session);
    requireRecommendationRole('review');
    if (run.status !== 'COMPLETED') throw new F06ApiError(409, 'Only a COMPLETED mining run can generate recommendations.');
    const result = await recommendationRequest<unknown>('/generate', json('POST', body, signal));
    assertResponse(isRecGenerationResult(result) && result.miningRunId === runId && result.snapshotId === run.snapshotId);
    return result;
  },
  async list(params: RecListParams = {}, signal?: AbortSignal): Promise<RecPage> {
    requireRecommendationRole();
    recommendationFields(params, ['miningRunId', 'snapshotId', 'type', 'reviewStatus', 'page', 'pageSize']);
    const { page, pageSize, query } = pagination(params);
    if (params.miningRunId !== undefined) query.set('miningRunId', String(recommendationInteger(params.miningRunId, 'miningRunId')));
    if (params.snapshotId !== undefined) query.set('snapshotId', String(recommendationInteger(params.snapshotId, 'snapshotId', 1, INT32_MAX)));
    if (params.type !== undefined) {
      if (!REC_TYPES.includes(params.type)) throw new F06ApiError(400, 'Invalid recommendation type.');
      query.set('type', params.type);
    }
    if (params.reviewStatus !== undefined) {
      if (!REVIEW_STATUSES.includes(params.reviewStatus)) throw new F06ApiError(400, 'Invalid review status.');
      query.set('reviewStatus', params.reviewStatus);
    }
    const ordering = params.miningRunId === undefined ? 'CREATED_DESC' : 'RANKED_WITHIN_SOURCE_RUN';
    const result = await recommendationRequest<unknown>(`?${query}`, { signal });
    assertResponse(isRecPage(result) && matchingPage(result, page, pageSize) && result.ordering === ordering);
    return result;
  },
  async get(id: number, signal?: AbortSignal): Promise<RecView> {
    requireRecommendationRole();
    recommendationInteger(id, 'recommendationId');
    const result = await recommendationRequest<unknown>(`/${id}`, { signal });
    assertResponse(isRecView(result) && result.recommendationId === id);
    return result;
  },
  approve: (id: number, request: RecReviewRequest, signal?: AbortSignal) => review(id, request, 'approve', signal),
  reject: (id: number, request: RecReviewRequest, signal?: AbortSignal) => review(id, request, 'reject', signal),
  async getConfig(signal?: AbortSignal): Promise<RecPolicy> {
    requireRecommendationRole();
    const result = await recommendationRequest<unknown>('/config', { signal });
    assertResponse(isRecPolicy(result));
    return result;
  },
  async updateConfig(request: RecPolicyRequest, signal?: AbortSignal): Promise<RecPolicy> {
    requireRecommendationRole('config');
    validatePolicy(request);
    const result = await recommendationRequest<unknown>('/config', json('PUT', JSON.stringify(request), signal));
    assertResponse(isRecPolicy(result));
    return result;
  },
  /** Current Store-local date only; independent of F05 and recommendation review. */
  async listExpiryPush(params: RecExpiryParams = {}, signal?: AbortSignal): Promise<RecExpiryPage> {
    requireRecommendationRole();
    recommendationFields(params, ['productId', 'page', 'pageSize']);
    const { page, pageSize, query } = pagination(params);
    if (params.productId !== undefined) query.set('productId', String(recommendationInteger(params.productId, 'productId', 1, INT32_MAX)));
    const result = await recommendationRequest<unknown>(`/expiry-push?${query}`, { signal });
    assertResponse(isRecExpiryPage(result) && matchingPage(result, page, pageSize));
    return result;
  }
};
