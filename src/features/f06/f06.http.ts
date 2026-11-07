import { authService } from '../../services/authService';
import { parseSafeMiningJson } from '../f05/f05.numbers';

export class F06ApiError extends Error {
  constructor(public readonly status: number | null, message: string) {
    super(message);
    this.name = 'F06ApiError';
  }
}

export function requireRecommendationRole(action: 'read' | 'review' | 'config' = 'read'): void {
  const user = authService.getCurrentUser();
  if (!user || !authService.getToken()) throw new F06ApiError(401, 'Please sign in to access recommendations.');
  const allowed = action === 'review' ? user.role === 'Merchandiser' : action === 'config'
    ? user.role === 'Store Admin' : user.role === 'Merchandiser' || user.role === 'Store Admin';
  if (!allowed) throw new F06ApiError(403, 'This recommendation operation is not available to your role.');
}

/** Fence results across login/logout, but allow normal access-token rotation. */
export const recommendationSession = () => authService.getSessionId() || authService.getToken();
export function assertRecommendationSession(session: string | null): void {
  if (recommendationSession() !== session) throw new F06ApiError(401, 'The active session changed. Reload data for the current session.');
}

/** Use the same authenticated transport as F05. httpClient discards HTTP status,
 * so parse locally without changing shared HTTP/session behavior. No retries,
 * cached Store data, token persistence or business calculations are added here.
 */
export async function recommendationRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = recommendationSession();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  const token = authService.getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  init.signal?.throwIfAborted();
  let response: Response;
  let body: string;
  try {
    response = await authService.request(`/api/recommendations${path}`, { ...init, headers });
    body = await response.text();
  } catch {
    init.signal?.throwIfAborted();
    throw new F06ApiError(null, 'Unable to read the recommendation service response. A submitted change may already have persisted; reload its state before deciding whether to retry.');
  }
  init.signal?.throwIfAborted();
  assertRecommendationSession(session);
  let data: unknown;
  try { data = response.ok ? parseSafeMiningJson(body) : JSON.parse(body); }
  catch (error) {
    if (response.ok) throw new F06ApiError(response.status, error instanceof Error ? error.message : 'Invalid recommendation JSON.');
  }
  if (!response.ok) {
    const fallback: Record<number, string> = {
      400: 'Invalid recommendation parameters.',
      401: 'Please sign in again.',
      403: 'Access denied for this role or Store.',
      404: 'The recommendation or source is unavailable for this Store.',
      409: 'Source, version, review state or current eligibility conflict. Reload the relevant data before making a new decision.'
    };
    const envelope = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    const detail = [envelope.error, envelope.message].find(v => typeof v === 'string' && v.trim());
    throw new F06ApiError(response.status, typeof detail === 'string' ? detail : fallback[response.status] || `Request failed (HTTP ${response.status}).`);
  }
  return data as T;
}
