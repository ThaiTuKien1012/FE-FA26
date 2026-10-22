import { authService } from '../../services/authService';
import type {
  F04Page,
  ImportError,
  ImportSummary,
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
  const token = authService.getToken();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  let body: string;
  try {
    response = await fetch(path, { ...init, headers });
    body = await response.text();
  } catch {
    throw new F04ApiError(null, 'Unable to connect to the server or read its response. Please check your connection and try again.');
  }

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

// The backend derives Store scope from the JWT and enforces endpoint roles.
export const f04Api = {
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

  getImport: (id: number): Promise<ImportSummary> =>
    request<ImportSummary>(`/api/transactions/imports/${id}`),

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
