import { parseF03Json, decimalBody, type F03Decimal } from './f03.decimal';
import { authService } from '../../services/authService';

export const W2 = 'W2_EXPIRY_SEASON_V1' as const;
export interface WeightV2 { scoringVersion: typeof W2; alpha: F03Decimal; beta: F03Decimal; lambda: F03Decimal; salesWindowDays: number; version: number; }
export interface LambdaV2 { scoringVersion: typeof W2; lambdaMax: F03Decimal; version: number; }
export type F03Config = WeightV2;
export type F03Policy = LambdaV2;
export type WeightUpdate = Pick<WeightV2, 'alpha' | 'beta' | 'lambda' | 'salesWindowDays'>;
export interface F03ConfigView { config: WeightV2; lambdaPolicy: LambdaV2; lambdaValid: boolean; }
export interface SeasonRequest { name: string; startDate: string; endDate: string; weight: F03Decimal; }
export interface SeasonView extends SeasonRequest { seasonId: number; storeId: number; version: number; productCount: number; activeToday: boolean; createdBy: number; updatedBy: number; createdAt: string; updatedAt: string; }
export interface Page<T> { items: T[]; page: number; pageSize: number; totalElements: number; }
export type SeasonPage = Page<SeasonView>;
export interface SeasonProduct { productId: number; sku: string; name: string; status: 'ACTIVE' | 'INACTIVE'; assignedBy: number; assignedAt: string; deleted: boolean; }
export type SeasonProductPage = Page<SeasonProduct>;
export interface SeasonCopy extends SeasonRequest { seasonId: number; version: number; productIds: number[]; }
export interface RiskBatch { batchId: number; pushDay: string | null; expiryDate: string | null; remainingQuantity: number; daysToPush: number | null; expectedSoldQuantity: F03Decimal | null; riskQuantity: F03Decimal | null; eligible: boolean; warnings: string[]; }
export interface FefoEvidence { scoringVersion: typeof W2; asOfDate: string; reason: string; salesWindowDays: number; unitsSold: number; dailySalesRate: F03Decimal; riskQuantity: F03Decimal; eligibleQuantity: number; score: F03Decimal; batches: RiskBatch[]; warnings: string[]; }
export interface DueBatch { productId: number; batchId: number; pushDay: string; expiryDate: string | null; daysToPush: number; remainingQuantity: number; }
export type F03PushBatch = DueBatch;
export interface F03PushPage extends Page<DueBatch> { asOfDate: string; timeZone: string; warnings: string[]; }
export interface F03Scores { productId: number; expiryRisk: F03Decimal; seasonWeight: F03Decimal; seasonId: number | null; weightValue: F03Decimal | null; expiryStatus: string; expiryEvidence: FefoEvidence; batchesMissingPushDay: number[]; activeSeasons: SeasonCopy[]; asOfDate: string; timeZone: string; configVersion: number; scoringVersion: typeof W2; lambdaValid: boolean; ready: boolean; warnings: string[]; }

// Frozen legacy JSON is read-only. It is never used as a live request DTO.
export interface LegacyWeightConfig { enableStock: boolean; enableExpiry: boolean; enableSeason: boolean; alpha: F03Decimal; beta: F03Decimal; gamma: F03Decimal; lambda: F03Decimal; expiryWindowDays: number | null; version: number; scoringVersion: string | null; }
export interface LegacyLambdaPolicy { lambdaMin: F03Decimal; lambdaMax: F03Decimal; version: number; }
export interface LegacyPushBatch { productId: number; batchId: number; expiryDate: string; remainingQuantity: number; expiryPushDays: number; daysRemaining: number; pushRequired: boolean; pushRequiredQuantity: number; asOfDate: string; }
export interface LegacyExpiryEvidence { expiryPushDays: number; earliestEligibleExpiryDate: string | null; daysRemaining: number | null; asOfDate: string; reason: string; batches: LegacyPushBatch[]; }
interface FrozenMetadata { analysisDate: string; source: string; utilityScale: number; roundingMode: string; itemMapping: string; timeZone: string | null; }
export interface FrozenV2 extends FrozenMetadata { config: WeightV2; lambdaPolicy: LambdaV2; effectiveCoefficients: { alpha: F03Decimal; beta: F03Decimal }; weightScale: number; weightRoundingMode: string; seasons: SeasonCopy[]; }
export interface LegacyFrozenConfiguration extends FrozenMetadata { config: LegacyWeightConfig; lambdaPolicy: LegacyLambdaPolicy; effectiveCoefficients: { alpha: F03Decimal; beta: F03Decimal; gamma: F03Decimal }; }
export type F03FrozenConfiguration = FrozenV2 | LegacyFrozenConfiguration;
export const isFrozenV2 = (value: F03FrozenConfiguration): value is FrozenV2 => value.config.scoringVersion === W2;
export const isFefoEvidence = (value: FefoEvidence | LegacyExpiryEvidence): value is FefoEvidence => 'scoringVersion' in value && value.scoringVersion === W2;
export interface F03MatrixItem { transactionId: number; productId: number; algorithmItemId: number; quantity: number; baseUtility: F03Decimal; stockScore: F03Decimal | null; expiryScore: F03Decimal | null; seasonalScore: F03Decimal | null; expiryStatus: string; weightValue: F03Decimal | null; weightedUtility: F03Decimal | null; transactionUtility: F03Decimal | null; expiryEvidence: FefoEvidence | LegacyExpiryEvidence | null; expiryRisk: F03Decimal | null; seasonWeight: F03Decimal | null; seasonId: number | null; }
export interface F03MatrixPage extends Page<F03MatrixItem> { totalWeightedUtility: F03Decimal | null; sourceHash: string; matrixHash: string; warnings: string[]; ready: boolean; configuration?: F03FrozenConfiguration | null; }
// Existing number-only consumers retain their model; F03 transport uses F03ExactSnapshot.
export interface F03Snapshot<TUtility = number> { snapshotId: number; storeId: number; createdBy: number; rangeStart: string; rangeEnd: string; asOfDate: string; configuration?: F03FrozenConfiguration | null; sourceHash: string; matrixHash: string; totalWeightedUtility: TUtility; roundingScale: number; status: string; createdAt: string; warnings: string[]; }
export type F03ExactSnapshot = F03Snapshot<F03Decimal>;
export type F03SnapshotPage = Page<F03ExactSnapshot>;
export class F03ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly code?: string) { super(message); this.name = 'F03ApiError'; }
}
export function f03Scope() { const user = authService.getCurrentUser(); return JSON.stringify([authService.getSessionId(), user?.id, user?.role, user?.storeId]); }
type Access = 'read' | 'merchant' | 'system';
async function request<T>(path: string, access: Access = 'read', init: RequestInit = {}, empty = false): Promise<T> {
  const role = authService.getCurrentUser()?.role;
  if (!role) throw new F03ApiError(401, 'Please sign in to continue.');
  const allowed = access === 'system' ? role === 'System Admin' : access === 'merchant' ? role === 'Merchandiser' : role === 'Merchandiser' || role === 'Store Admin';
  if (!allowed) throw new F03ApiError(403, 'Your account does not have permission to perform this action.');
  const scope = f03Scope(), token = authService.getToken();
  const response = await authService.request(path, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  const raw = await response.text();
  let data: any;
  let parseError: unknown;
  try { data = raw ? (response.ok ? parseF03Json(raw) : JSON.parse(raw)) : undefined; } catch (error) { parseError = error; }
  if (scope !== f03Scope()) throw new F03ApiError(401, 'The active session changed. Refresh before continuing.');
  if (!response.ok) {
    const fallback: Record<number, string> = { 400: 'Check the information and try again.', 401: 'Your session needs attention. Please sign in again.', 403: 'Access denied. Your account does not have permission.', 404: 'This item is unavailable in your store.', 405: 'This action is no longer supported.', 409: 'The data changed. Reload before trying again.' };
    throw new F03ApiError(response.status, data?.error || data?.message || fallback[response.status] || 'Unable to complete the request. Please try again.', data?.code);
  }
  if (response.ok && parseError) throw new F03ApiError(502, parseError instanceof Error ? parseError.message : 'Invalid F03 response.');
  if (empty) return undefined as T;
  if (!data || typeof data !== 'object') throw new F03ApiError(502, 'The server returned an unreadable response. Refresh to try again.');
  return data as T;
}
function requireVersion(version: unknown, live = false) {
  if (version === W2 || (!live && (version == null || version === 'F03_LINEAR_V1' || version === 'EXPIRY_PRODUCT_EARLIEST_BATCH_BINARY_V1'))) return;
  throw new F03ApiError(409, 'This scoring version is not supported. Contact your administrator before retrying.', 'UNSUPPORTED_SCORING_VERSION');
}
async function liveConfig(promise: Promise<F03ConfigView>) { const result = await promise; requireVersion(result.config?.scoringVersion, true); requireVersion(result.lambdaPolicy?.scoringVersion, true); return result; }
async function stored<T extends F03MatrixPage | F03ExactSnapshot>(promise: Promise<T>) { const result = await promise; if (result.configuration) requireVersion(result.configuration.config?.scoringVersion); return result; }
const query = (params: Record<string, string | number | undefined>) => { const q = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') q.set(key, String(value)); }); return q.toString() ? `?${q}` : ''; };
const period = ({ rangeStart, rangeEnd, asOfDate }: { rangeStart: string; rangeEnd: string; asOfDate: string }) => ({ rangeStart, rangeEnd, asOfDate });
const seasonBody = ({ name, startDate, endDate, weight }: SeasonRequest) => ({ name, startDate, endDate, weight });
export const f03Api = {
  getPolicy: async () => { const value = await request<LambdaV2>('/api/system/utility/lambda-policy', 'system'); requireVersion(value.scoringVersion, true); return value; },
  updatePolicy: async ({ lambdaMax }: { lambdaMax: F03Decimal }) => { const value = await request<LambdaV2>('/api/system/utility/lambda-policy', 'system', { method: 'PUT', body: decimalBody({ lambdaMax }, ['lambdaMax']) }); requireVersion(value.scoringVersion, true); return value; },
  getConfig: () => liveConfig(request<F03ConfigView>('/api/utility/config')),
  updateConfig: ({ alpha, beta, lambda, salesWindowDays }: WeightUpdate) => liveConfig(request<F03ConfigView>('/api/utility/config', 'merchant', { method: 'PUT', body: decimalBody({ alpha, beta, lambda, salesWindowDays }, ['alpha','beta','lambda']) })),
  getScores: async (id: number) => { const value = await request<F03Scores>(`/api/utility/products/${id}/scores`); requireVersion(value.scoringVersion, true); return value; },
  getExpiryPushBatches: (params: { productId?: number; asOfDate?: string; page?: number; pageSize?: number } = {}) => request<F03PushPage>(`/api/utility/expiry-push-batches${query({ productId: params.productId, asOfDate: params.asOfDate, page: params.page, pageSize: params.pageSize })}`),
  listSeasons: (page = 0, pageSize = 20) => request<SeasonPage>(`/api/utility/seasons${query({ page, pageSize })}`),
  getSeason: (id: number) => request<SeasonView>(`/api/utility/seasons/${id}`),
  createSeason: (body: SeasonRequest) => request<SeasonView>('/api/utility/seasons', 'merchant', { method: 'POST', body: decimalBody(seasonBody(body), ['weight']) }),
  updateSeason: (id: number, body: SeasonRequest & { expectedVersion: number }) => request<SeasonView>(`/api/utility/seasons/${id}`, 'merchant', { method: 'PUT', body: decimalBody({ ...seasonBody(body), expectedVersion: body.expectedVersion }, ['weight']) }),
  deleteSeason: (id: number) => request<void>(`/api/utility/seasons/${id}`, 'merchant', { method: 'DELETE' }, true),
  seasonProducts: (id: number, page = 0, pageSize = 20) => request<SeasonProductPage>(`/api/utility/seasons/${id}/products${query({ page, pageSize })}`),
  assignProduct: (id: number, productId: number) => request<void>(`/api/utility/seasons/${id}/products/${productId}`, 'merchant', { method: 'PUT' }, true),
  unassignProduct: (id: number, productId: number) => request<void>(`/api/utility/seasons/${id}/products/${productId}`, 'merchant', { method: 'DELETE' }, true),
  preview: (body: { rangeStart: string; rangeEnd: string; asOfDate: string; page?: number; pageSize?: number }) => stored(request<F03MatrixPage>('/api/utility/preview', 'merchant', { method: 'POST', body: JSON.stringify({ ...period(body), page: body.page, pageSize: body.pageSize }) })),
  createSnapshot: (body: { rangeStart: string; rangeEnd: string; asOfDate: string }) => stored(request<F03ExactSnapshot>('/api/utility/snapshots', 'merchant', { method: 'POST', body: JSON.stringify(period(body)) })),
  getSnapshot: (id: number) => stored(request<F03Snapshot>(`/api/utility/snapshots/${id}`, 'merchant')),
  listSnapshots: (page = 0, pageSize = 20) => request<F03SnapshotPage>(`/api/mining/snapshots?page=${page}&pageSize=${pageSize}`),
  getMatrix: (id: number, page = 0, pageSize = 20) => stored(request<F03MatrixPage>(`/api/utility/snapshots/${id}/matrix?page=${page}&pageSize=${pageSize}`, 'merchant')),
};
