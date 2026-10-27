import { authService } from '../../services/authService';
import { F05NumberError, parseMinUtilInput, parseSafeMiningJson } from './f05.numbers';
import { isRequestView, isRunView } from './f05.read-contracts';
import type {
  BenchmarkView,
  CreateRequest,
  Page,
  PatternView,
  RequestView,
  RunView,
  SnapshotView
} from './f05.types';

export class F05ApiError extends Error {
  /** A null status indicates that no HTTP response could be read. */
  constructor(public readonly status: number | null, message: string) {
    super(message);
    this.name = 'F05ApiError';
  }
}

const errorMessages: Record<number, string> = {
  400: 'Invalid mining request or pagination parameters.',
  401: 'Please sign in to access mining.',
  403: 'You do not have permission to perform this mining operation.',
  404: 'The mining resource or utility snapshot was not found.',
  409: 'The request key conflicts with another submission, or the frozen snapshot is unavailable.',
  503: 'The mining service is currently unavailable. Please try again later.'
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = authService.getToken();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  let body: string;
  init.signal?.throwIfAborted();
  try {
    response = await fetch(`/api/mining${path}`, { ...init, headers });
    body = await response.text();
  } catch {
    init.signal?.throwIfAborted();
    throw new F05ApiError(null, 'Unable to connect to the server or read its response. Please check your connection and try again.');
  }

  let data: unknown;
  try {
    data = response.ok ? parseSafeMiningJson(body) : JSON.parse(body);
  } catch (error) {
    if (response.ok) {
      throw new F05ApiError(response.status, error instanceof F05NumberError ? error.message : 'The server returned an invalid JSON response.');
    }
  }

  if (!response.ok) {
    let message = errorMessages[response.status] || `Request failed (HTTP ${response.status})`;
    if (data && typeof data === 'object') {
      const error = data as { error?: unknown; message?: unknown };
      if (typeof error.error === 'string' && error.error.trim()) message = error.error;
      else if (typeof error.message === 'string' && error.message.trim()) message = error.message;
    }
    throw new F05ApiError(response.status, message);
  }

  return data as T;
}

function pagination(page: number, pageSize: number): string {
  if (!Number.isInteger(page) || page < 0 || page > 2147483647 ||
      !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new F05ApiError(400, 'page must be a nonnegative int32 and pageSize an integer in 1..100.');
  }
  return new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString();
}

function identifier(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new F05ApiError(400, 'Request and run IDs must be positive safe integers. An unsafe long ID cannot be sent without a precision change.');
  }
  return value;
}

export function validateCreateRequest(payload: CreateRequest): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.requestKey)) {
    throw new F05ApiError(400, 'requestKey must be a UUID.');
  }
  if (!Number.isInteger(payload.snapshotId) || payload.snapshotId < 1 || payload.snapshotId > 2147483647) {
    throw new F05ApiError(400, 'snapshotId must be a positive int32.');
  }
  if (!Array.isArray(payload.algorithms) || payload.algorithms.length < 1 || payload.algorithms.length > 2 ||
      new Set(payload.algorithms).size !== payload.algorithms.length ||
      payload.algorithms.some(algorithm => algorithm !== 'HUI_MINER' && algorithm !== 'EFIM')) {
    throw new F05ApiError(400, 'Select one or two distinct supported algorithms.');
  }
  if (typeof payload.minUtilValue !== 'number' || !Number.isFinite(payload.minUtilValue)) {
    throw new F05ApiError(400, 'minUtilValue must be a positive JSON number.');
  }
  try {
    parseMinUtilInput(String(payload.minUtilValue), payload.minUtilMode);
  } catch (error) {
    throw new F05ApiError(400, error instanceof Error ? error.message : 'Invalid minimum utility.');
  }
}

// The backend enforces store scope and roles; the workspace exposes POST only to
// Merchandisers. Read the current JWT rather than relying on a cached session role.
export const f05Api = {
  listSnapshots: async (page = 0, pageSize = 20): Promise<Page<SnapshotView>> => {
    const result = await request<Page<SnapshotView>>(`/snapshots?${pagination(page, pageSize)}`);
    if (!result || !Array.isArray(result.items) || result.page !== page || result.pageSize !== pageSize ||
        !Number.isSafeInteger(result.totalElements) || result.totalElements < 0) {
      throw new F05ApiError(200, 'The server returned an invalid snapshot page.');
    }
    return result;
  },

  /** MERCHANDISER only. A 202 response describes durable async work, not necessarily success. */
  createRequest: async (payload: CreateRequest): Promise<RequestView> => {
    validateCreateRequest(payload);
    const { requestKey, snapshotId, algorithms, minUtilMode, minUtilValue } = payload;
    // Serialize only DTO fields, with no rounding, percentage conversion or generated key.
    // The backend remains authoritative for snapshot eligibility and idempotency.
    const result = await request<RequestView>('/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestKey, snapshotId, algorithms, minUtilMode, minUtilValue })
    });
    if (!result || !Number.isSafeInteger(result.requestId) || result.requestId < 1 || result.requestKey !== requestKey ||
        !['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'].includes(result.status)) {
      throw new F05ApiError(202, 'The submission response could not be verified. Keep the saved request key and retry the same submission.');
    }
    return result;
  },

  listRequests: async (page = 0, pageSize = 20, signal?: AbortSignal): Promise<Page<RequestView>> => {
    const result = await request<Page<RequestView>>(`/requests?${pagination(page, pageSize)}`, { signal });
    if (!result || !Array.isArray(result.items) || !result.items.every(isRequestView) ||
        result.page !== page || result.pageSize !== pageSize || !Number.isSafeInteger(result.totalElements) || result.totalElements < 0 ||
        new Set(result.items.map(item => item.storeId)).size > 1) {
      throw new F05ApiError(200, 'The server returned an invalid mining request page. No history data was displayed.');
    }
    return result;
  },

  getRequest: async (requestId: number, signal?: AbortSignal): Promise<RequestView> => {
    const result = await request<RequestView>(`/requests/${identifier(requestId)}`, { signal });
    if (!isRequestView(result) || result.requestId !== requestId) throw new F05ApiError(200, 'The server returned invalid or mismatched request details.');
    return result;
  },

  listRuns: async (requestId: number, signal?: AbortSignal): Promise<RunView[]> => {
    const result = await request<RunView[]>(`/requests/${identifier(requestId)}/runs`, { signal });
    if (!Array.isArray(result) || !result.every(run => isRunView(run) && run.requestId === requestId) ||
        new Set(result.map(run => run.runId)).size !== result.length) {
      throw new F05ApiError(200, 'The server returned invalid or mismatched algorithm runs.');
    }
    return result;
  },

  getRun: async (runId: number, signal?: AbortSignal): Promise<RunView> => {
    const result = await request<RunView>(`/runs/${identifier(runId)}`, { signal });
    if (!isRunView(result) || result.runId !== runId) throw new F05ApiError(200, 'The server returned invalid or mismatched run details.');
    return result;
  },

  listPatterns: async (runId: number, page = 0, pageSize = 20): Promise<Page<PatternView>> =>
    request<Page<PatternView>>(`/runs/${identifier(runId)}/patterns?${pagination(page, pageSize)}`),

  getBenchmark: async (runId: number): Promise<BenchmarkView> =>
    request<BenchmarkView>(`/runs/${identifier(runId)}/benchmark`)
};
