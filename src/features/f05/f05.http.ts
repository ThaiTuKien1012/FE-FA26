import { authService } from '../../services/authService';
import { F05NumberError, parseSafeMiningJson } from './f05.numbers';

export class F05ApiError extends Error {
  constructor(public readonly status: number | null, message: string) {
    super(message);
    this.name = 'F05ApiError';
  }
}

export function requireMiningRole(system: boolean): void {
  const user = authService.getCurrentUser();
  if (!user || !authService.getToken()) throw new F05ApiError(401, 'Please sign in to access mining.');
  if (system ? user.role !== 'System Admin' : user.role !== 'Merchandiser' && user.role !== 'Store Admin') {
    throw new F05ApiError(403, 'This mining operation is not available to your role.');
  }
}

export async function miningRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = authService.getToken();
  const sessionId = authService.getSessionId() || token;
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  init.signal?.throwIfAborted();
  let response: Response;
  let body: string;
  try {
    response = await authService.request(path, { ...init, headers });
    body = await response.text();
  } catch {
    init.signal?.throwIfAborted();
    throw new F05ApiError(null, 'Unable to connect to the mining service or read its response.');
  }
  init.signal?.throwIfAborted();
  if ((authService.getSessionId() || authService.getToken()) !== sessionId) throw new F05ApiError(401, 'The active session changed. Reload data for the current session.');
  let data: unknown;
  try { data = response.ok ? parseSafeMiningJson(body) : JSON.parse(body); }
  catch (error) {
    if (response.ok) throw new F05ApiError(response.status, error instanceof F05NumberError ? error.message : 'The server returned invalid or empty JSON.');
  }
  if (!response.ok) {
    const fallback: Record<number, string> = {
      400: 'Invalid mining parameters.', 401: 'Please sign in again.', 403: 'Access denied for this role or Store.',
      404: 'The Store, snapshot or mining resource was not found.', 409: 'Configuration version or request key conflict.',
      503: 'The mining service or SPMF runtime is unavailable.'
    };
    const envelope = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    const detail = [envelope.error, envelope.message].find(v => typeof v === 'string' && v.trim());
    throw new F05ApiError(response.status, typeof detail === 'string' ? detail : fallback[response.status] || `Request failed (HTTP ${response.status}).`);
  }
  return data as T;
}

export function miningPagination(page: number, pageSize: number, maxPage = 2147483647): string {
  if (!Number.isInteger(page) || page < 0 || page > maxPage || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new F05ApiError(400, `page must be in 0..${maxPage} and pageSize in 1..100.`);
  }
  return new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString();
}
export function miningId(id: number, int32 = false): number {
  if (!Number.isSafeInteger(id) || id < 1 || (int32 && id > 2147483647)) throw new F05ApiError(400, 'IDs must be positive safe integers within the backend range.');
  return id;
}
export function miningPage<T>(data: unknown, page: number, pageSize: number, valid: (item: unknown) => boolean): asserts data is import('./f05.types').Page<T> {
  const p = data as import('./f05.types').Page<unknown> | null;
  if (!p || !Array.isArray(p.items) || p.page !== page || p.pageSize !== pageSize ||
      !Number.isSafeInteger(p.totalElements) || p.totalElements < 0 || p.items.length > pageSize ||
      p.totalElements < p.items.length || !p.items.every(valid)) {
    throw new F05ApiError(200, 'The server returned an invalid or mismatched page. No data was displayed.');
  }
}
export function validateRequestKey(key: string): void {
  if (typeof key !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
    throw new F05ApiError(400, 'requestKey must be a UUID.');
  }
}
