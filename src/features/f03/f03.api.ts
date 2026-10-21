import { authService } from '../../services/authService';

export interface F03Config {
  enableStock: boolean;
  enableExpiry: boolean;
  enableSeason: boolean;
  alpha: number;
  beta: number;
  gamma: number;
  lambda: number;
  /** Legacy Store setting. It is deprecated and has no scoring effect in v1.2. */
  expiryWindowDays: number | null;
  version: number;
  scoringVersion: string;
}
export interface F03Policy { lambdaMin: number; lambdaMax: number; version: number; }
export interface F03ConfigView { config: F03Config; lambdaPolicy: F03Policy; lambdaValid: boolean; }

export interface F03PushBatch {
  productId: number;
  batchId: number;
  expiryDate: string;
  remainingQuantity: number;
  expiryPushDays: number;
  daysRemaining: number;
  pushRequired: boolean;
  pushRequiredQuantity: number;
  asOfDate: string;
}

export interface F03ExpiryEvidence {
  expiryPushDays: number;
  earliestEligibleExpiryDate: string | null;
  daysRemaining: number | null;
  asOfDate: string;
  reason: string;
  batches: F03PushBatch[];
}

export interface F03PushPage {
  items: F03PushBatch[];
  page: number;
  pageSize: number;
  totalElements: number;
  asOfDate: string;
  timeZone: string;
  warnings: string[];
}

export interface F03Scores {
  productId: number;
  stockPriorityScore: number | null;
  seasonalPriorityScore: number | null;
  expiryScore: number | null;
  weightValue: number | null;
  expiryStatus: string;
  expiryEvidence: F03ExpiryEvidence | null;
  expiryPushDays: number;
  asOfDate: string;
  timeZone: string;
  configVersion: number;
  lambdaValid: boolean;
  ready: boolean;
  warnings: string[];
}

export interface F03FrozenConfiguration {
  config: F03Config;
  lambdaPolicy: F03Policy;
  effectiveCoefficients: { alpha: number; beta: number; gamma: number };
  analysisDate: string;
  source: string;
  utilityScale: number;
  roundingMode: string;
  itemMapping: string;
  timeZone: string | null;
}

export interface F03MatrixItem {
  transactionId: number;
  productId: number;
  algorithmItemId: number;
  quantity: number;
  baseUtility: number;
  stockScore: number | null;
  expiryScore: number | null;
  seasonalScore: number | null;
  expiryStatus: string;
  weightValue: number | null;
  weightedUtility: number | null;
  transactionUtility: number | null;
  expiryEvidence: F03ExpiryEvidence | null;
}

export interface F03MatrixPage {
  items: F03MatrixItem[];
  page: number;
  pageSize: number;
  totalElements: number;
  totalWeightedUtility: number | null;
  sourceHash: string;
  matrixHash: string;
  warnings: string[];
  ready: boolean;
  configuration?: F03FrozenConfiguration;
}

export interface F03Snapshot {
  snapshotId: number;
  storeId: number;
  createdBy: number;
  rangeStart: string;
  rangeEnd: string;
  asOfDate: string;
  configuration?: F03FrozenConfiguration;
  sourceHash: string;
  matrixHash: string;
  totalWeightedUtility: number;
  roundingScale: number;
  status: string;
  createdAt: string;
  warnings: string[];
}

export class F03ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'F03ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = authService.getToken();
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new F03ApiError(response.status, data?.error || data?.message || `Request failed (${response.status})`);
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
  getExpiryPushBatches: (params: { productId?: number; asOfDate?: string; page?: number; pageSize?: number } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, String(value));
    });
    return request<F03PushPage>(`/api/utility/expiry-push-batches${query.toString() ? `?${query}` : ''}`);
  },
  preview: (body: { rangeStart: string; rangeEnd: string; asOfDate: string; page?: number; pageSize?: number }) => request<F03MatrixPage>('/api/utility/preview', { method: 'POST', body: JSON.stringify(body) }),
  createSnapshot: (body: { rangeStart: string; rangeEnd: string; asOfDate: string }) => request<F03Snapshot>('/api/utility/snapshots', { method: 'POST', body: JSON.stringify(body) }),
  getSnapshot: (id: number) => request<F03Snapshot>(`/api/utility/snapshots/${id}`),
  getMatrix: (id: number, page = 0, pageSize = 20) => request<F03MatrixPage>(`/api/utility/snapshots/${id}/matrix?page=${page}&pageSize=${pageSize}`)
};
