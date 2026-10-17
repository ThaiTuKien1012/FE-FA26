import { authService } from '../../services/authService';

export interface F03Config { enableStock: boolean; enableExpiry: boolean; enableSeason: boolean; alpha: number; beta: number; gamma: number; lambda: number; expiryWindowDays: number; version: number; scoringVersion: string; }
export interface F03Policy { lambdaMin: number; lambdaMax: number; version: number; }
export interface F03ConfigView { config: F03Config; lambdaPolicy: F03Policy; lambdaValid: boolean; }
export interface F03Scores { productId: number; stockPriorityScore: number | null; seasonalPriorityScore: number | null; }
export interface F03MatrixItem { transactionId: number; productId: number; algorithmItemId: number; quantity: number; baseUtility: number; stockScore: number | null; expiryScore: number | null; seasonalScore: number | null; expiryStatus: string; weightValue: number | null; weightedUtility: number | null; transactionUtility: number | null; }
export interface F03MatrixPage { items: F03MatrixItem[]; page: number; pageSize: number; totalElements: number; totalWeightedUtility: number | null; sourceHash: string; matrixHash: string; warnings: string[]; ready: boolean; configuration?: unknown; }
export interface F03Snapshot { snapshotId: number; storeId: number; createdBy: number; rangeStart: string; rangeEnd: string; asOfDate: string; totalWeightedUtility: number; status: string; createdAt: string; configuration?: unknown; }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = authService.getToken();
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || data?.message || `Request failed (${response.status})`);
  return data as T;
}

export const f03Api = {
  getPolicy: () => request<F03Policy>('/api/system/utility/lambda-policy'),
  updatePolicy: (body: { lambdaMin: number; lambdaMax: number }) => request<F03Policy>('/api/system/utility/lambda-policy', { method: 'PUT', body: JSON.stringify(body) }),
  getConfig: () => request<F03ConfigView>('/api/utility/config'),
  updateConfig: (body: Omit<F03Config, 'expiryWindowDays' | 'version' | 'scoringVersion'>) => request<F03ConfigView>('/api/utility/config', { method: 'PUT', body: JSON.stringify(body) }),
  updateExpiryWindow: (expiryWindowDays: number) => request<F03ConfigView>('/api/utility/config/expiry-window', { method: 'PUT', body: JSON.stringify({ expiryWindowDays }) }),
  getScores: (id: number) => request<F03Scores>(`/api/utility/products/${id}/scores`),
  updateScores: (id: number, body: { stockPriorityScore?: number; seasonalPriorityScore?: number }) => request<F03Scores>(`/api/utility/products/${id}/scores`, { method: 'PATCH', body: JSON.stringify(body) }),
  preview: (body: { rangeStart: string; rangeEnd: string; asOfDate: string; page?: number; pageSize?: number }) => request<F03MatrixPage>('/api/utility/preview', { method: 'POST', body: JSON.stringify(body) }),
  createSnapshot: (body: { rangeStart: string; rangeEnd: string; asOfDate: string }) => request<F03Snapshot>('/api/utility/snapshots', { method: 'POST', body: JSON.stringify(body) }),
  getSnapshot: (id: number) => request<F03Snapshot>(`/api/utility/snapshots/${id}`),
  getMatrix: (id: number, page = 0, pageSize = 20) => request<F03MatrixPage>(`/api/utility/snapshots/${id}/matrix?page=${page}&pageSize=${pageSize}`)
};
