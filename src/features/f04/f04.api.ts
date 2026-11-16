import { authService } from '../../services/authService';
import { canReadImports, f04Scope } from './f04.session';
import type {
  F04Page,
  ImportError,
  ImportSummary,
  ImportProgress,
  TransactionFilters,
  TransactionView
} from './f04.types';

export class F04ApiError extends Error {
  /** A null status indicates that no HTTP response could be read. */
  constructor(public readonly status: number | null, message: string) {
    super(message);
    this.name = 'F04ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const scope = f04Scope();
  const token = authService.getToken();
  if (!authService.getCurrentUser() || !token) throw new F04ApiError(401, 'Please sign in to access transactions.');
  if (!canReadImports()) throw new F04ApiError(403, 'Access is limited to Store Admin and Merchandiser accounts.');
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  let body: string;
  try {
    response = await authService.request(path, { ...init, headers });
    body = await response.text();
  } catch {
    init.signal?.throwIfAborted();
    throw new F04ApiError(null, 'Unable to connect to the server or read its response. Please check your connection and try again.');
  }
  init.signal?.throwIfAborted();
  if (scope !== f04Scope()) throw new F04ApiError(401, 'The active session or Store changed. Reload data before continuing.');

  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    if (response.ok) {
      throw new F04ApiError(response.status, 'The server returned an invalid JSON response.');
    }
  }

  if (!response.ok) {
    let message = `Request failed (HTTP ${response.status})`;
    if (data && typeof data === 'object') {
      const error = data as { error?: unknown; message?: unknown };
      if (typeof error.error === 'string' && error.error.trim()) message = error.error;
      else if (typeof error.message === 'string' && error.message.trim()) message = error.message;
    }
    throw new F04ApiError(response.status, message);
  }

  return data as T;
}

function validateProgress(value: ImportProgress): ImportProgress {
  if (!value || !Number.isSafeInteger(value.importBatchId) || value.importBatchId <= 0 ||
      !['RECEIVING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED'].includes(value.status) ||
      !Number.isSafeInteger(value.processedCount) || value.processedCount < 0 ||
      !(value.totalCount === null || Number.isSafeInteger(value.totalCount) && value.totalCount >= 0) ||
      !(value.progressPercent === null || Number.isInteger(value.progressPercent) && value.progressPercent >= 0 && value.progressPercent <= 100)) {
    throw new F04ApiError(202, 'The server returned unreadable import progress. Check Import History before submitting again.');
  }
  return value;
}

// The backend derives Store scope from the JWT and enforces endpoint roles.
export const f04Api = {
  uploadCsvAsync: async (file: File, key: string, signal?: AbortSignal): Promise<ImportProgress> => {
    if (authService.getCurrentUser()?.role !== 'Store Admin') throw new F04ApiError(403, 'Only Store Admin can import transactions.');
    if (!/^[A-Za-z0-9._:-]{1,128}$/.test(key)) throw new F04ApiError(400, 'Invalid import request key.');
    const body = new FormData();
    body.append('file', file);
    const result = await request<ImportProgress>('/api/transactions/imports/csv/async', {
      method: 'POST', headers: { 'Idempotency-Key': key }, body, signal
    });
    return validateProgress(result);
  },

  getImportProgress: async (id: number, signal?: AbortSignal): Promise<ImportProgress> => {
    const result = validateProgress(await request<ImportProgress>(`/api/transactions/imports/${id}/progress`, { signal }));
    if (result.importBatchId !== id) throw new F04ApiError(200, 'The import response did not match the requested batch.');
    return result;
  },
  /** STORE_ADMIN only. Inspect the returned counters even when HTTP is 201. */
  uploadCsv: async (file: File): Promise<ImportSummary> => {
    const user = authService.getCurrentUser();
    if (!user) throw new F04ApiError(401, 'Please sign in before importing transactions.');
    if (user.role !== 'Store Admin') {
      throw new F04ApiError(403, 'Only Store Admin can import transactions.');
    }
    const body = new FormData();
    body.append('file', file);
    // The browser supplies Content-Type together with the multipart boundary.
    return request<ImportSummary>('/api/transactions/imports/csv', { method: 'POST', body });
  },

  // Read endpoints allow STORE_ADMIN and MERCHANDISER.
  listImports: (page = 0, pageSize = 20): Promise<F04Page<ImportSummary>> =>
    request<F04Page<ImportSummary>>(`/api/transactions/imports?page=${page}&pageSize=${pageSize}`),

  getImport: (id: number, signal?: AbortSignal): Promise<ImportSummary> =>
    request<ImportSummary>(`/api/transactions/imports/${id}`, { signal }),

  getImportErrors: (id: number, page = 0, pageSize = 100): Promise<F04Page<ImportError>> =>
    request<F04Page<ImportError>>(`/api/transactions/imports/${id}/errors?page=${page}&pageSize=${pageSize}`),

  listTransactions: ({ status, from, to, page = 0, pageSize = 20 }: TransactionFilters = {}): Promise<F04Page<TransactionView>> => {
    const query = new URLSearchParams();
    Object.entries({ status, from, to, page, pageSize }).forEach(([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, String(value));
    });
    return request<F04Page<TransactionView>>(`/api/transactions?${query}`);
  },

  getTransaction: (id: number): Promise<TransactionView> =>
    request<TransactionView>(`/api/transactions/${id}`)
};
