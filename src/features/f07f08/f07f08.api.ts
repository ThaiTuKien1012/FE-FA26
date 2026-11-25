import { authService } from '../../services/authService';
import { parseSafeMiningJson } from '../f05/f05.numbers';

export type LayoutRole = 'A' | 'B';
export type LayoutStatus = 'DRAFT' | 'READY' | 'ARCHIVED';
export type CampaignStatus = 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'ENDED';
export type RecommendationType = 'BUNDLE' | 'CROSS_SELL' | 'FBT' | 'BANNER';

export interface ZonePolicy {
  zone: string;
  recommendationType: RecommendationType | null;
  maxBlocks: number | null;
  maxProducts: number | null;
}

export interface LayoutPolicy {
  utilityScoreLabel: string;
  utilityScoreDefinition: string;
  capacityPolicy: string;
  zones: ZonePolicy[];
}

export interface RecommendationOption {
  recommendationId: number;
  snapshotId: number;
  type: RecommendationType;
  productIds: number[];
  utility: number;
  version: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalElements: number;
}

export interface LayoutSummary {
  layoutId: number;
  campaignId: number;
  snapshotId: number;
  role: LayoutRole;
  status: LayoutStatus;
  version: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlacementRequest {
  productId: number;
  zone: RecommendationType;
  blockNo: number;
  position: number;
  sourceRecommendationId: number | null;
}

export interface Placement {
  productId: number;
  recommendationId: number | null;
  sourceRecommendationId: number | null;
  recommendationType: RecommendationType | null;
  sku: string;
  productName: string;
  zone: string;
  blockNo: number;
  position: number;
  snapshotWeightedUtility: number;
  valid: boolean;
  validationErrors: string[];
}

export interface LayoutView extends LayoutSummary {
  weightedUtilityScore: number | null;
  equalSizeBaselineScore: number | null;
  equalSizeProductCount: number | null;
  priorityCoverage: number | null;
  priorityCoverageDenominator: number;
  valid: boolean;
  validationErrors: string[];
  placements: Placement[];
}

export interface CampaignView {
  campaignId: number;
  snapshotId: number;
  name: string;
  status: CampaignStatus;
  version: number;
  layoutAId: number;
  layoutBId: number;
  selectedLayoutId: number | null;
  decision: 'KEEP_A' | 'CHOOSE_B' | null;
  decisionReportId: number | null;
  createdAt: string;
  publishedAt: string | null;
  activatedAt: string | null;
  endedAt: string | null;
  reportIds: number[];
}

export type CampaignSummary = Omit<CampaignView, 'reportIds' | 'layoutAId' | 'layoutBId'> & {
  layoutAId: number | null;
  layoutBId: number | null;
};

export interface CampaignReport {
  reportId: number;
  campaignId: number;
  snapshotId: number;
  createdBy: number;
  rangeStart: string;
  rangeEnd: string;
  sourceNamespace: string;
  datasetHash: string;
  evaluationCount: number;
  simulated: boolean;
  algorithmVersion: string;
  assumptions: Record<string, unknown>;
  layouts: Array<{
    layoutId: number;
    layoutVersion: number;
    role: LayoutRole;
    hitRate: Metric;
    bundleConversion: Metric;
    capturedUtility: Metric;
    priorityCoverage: number | null;
    priorityCoverageDenominator: number | null;
  }>;
  createdAt: string;
}

export interface Metric {
  numerator: number;
  denominator: number;
  rate: number | null;
}

export interface ActiveLayout {
  defaultLayout: boolean;
  campaign: CampaignSummary | null;
  layout: LayoutView | null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = authService.getCurrentUser();
  const write = init.method && init.method !== 'GET';
  const adminAction = /\/(activate|end|rollback)$/.test(path);
  if (!user || !['Merchandiser', 'Store Admin'].includes(user.role)) throw new Error('Please sign in with a Store staff account.');
  if (write && user.role !== (adminAction ? 'Store Admin' : 'Merchandiser')) throw new Error('This action is not available to your role.');
  const scope = JSON.stringify([authService.getSessionId(), user.id, user.storeId, user.role]);
  const response = await authService.request(path, {
    ...init,
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}) }
  });
  const body = await response.text();
  const current = authService.getCurrentUser();
  init.signal?.throwIfAborted();
  if (scope !== JSON.stringify([authService.getSessionId(), current?.id, current?.storeId, current?.role])) throw new Error('Your session changed. Reload the current Store.');
  let data: any;
  try { data = response.ok ? parseSafeMiningJson(body) : JSON.parse(body); }
  catch (error) { if (response.ok) throw error; data = {}; }
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : typeof data?.message === 'string' ? data.message : `Request failed (${response.status})`;
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return data as T;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export interface LayoutSnapshot { snapshotId: number; status: string; rangeStart: string; rangeEnd: string; asOfDate: string; }
export interface SnapshotProductOption {
  productId: number;
  sku: string;
  productName: string;
  productStatus: string;
  deleted: boolean;
  sellableQuantity: number;
  snapshotWeightedUtility: number;
  eligible: boolean;
  validationErrors: string[];
}

// Every picker follows server pagination rather than silently truncating at 100.
async function allPages<T>(path: string, signal?: AbortSignal): Promise<Page<T>> {
  const items: T[] = [];
  let result: Page<T>;
  let page = 0;
  do {
    result = await request<Page<T>>(`${path}${path.includes('?') ? '&' : '?'}page=${page++}&pageSize=100`, { signal });
    items.push(...result.items);
  } while (items.length < result.totalElements && result.items.length > 0);
  return { ...result, items, page: 0, pageSize: items.length };
}

export const f07f08Api = {
  policy: (signal?: AbortSignal) => request<LayoutPolicy>('/api/layouts/policy', { signal }),
  recommendations: (snapshotId: number, signal?: AbortSignal) => allPages<RecommendationOption>(`/api/layouts/recommendations?snapshotId=${encodeURIComponent(snapshotId)}`, signal),
  snapshots: (signal?: AbortSignal) => allPages<LayoutSnapshot>('/api/mining/snapshots', signal),
  snapshotProducts: (snapshotId: number, q: string, page: number, pageSize: number, signal?: AbortSignal) => {
    const query = new URLSearchParams({ snapshotId: String(snapshotId), q, page: String(page), pageSize: String(pageSize) });
    return request<Page<SnapshotProductOption>>(`/api/layouts/products?${query}`, { signal });
  },
  layouts: (campaignId?: number) => request<Page<LayoutSummary>>(`/api/layouts?page=0&pageSize=100${campaignId ? `&campaignId=${campaignId}` : ''}`),
  layout: (id: number, signal?: AbortSignal) => request<LayoutView>(`/api/layouts/${id}`, { signal }),
  preview: (id: number, signal?: AbortSignal) => request<LayoutView>(`/api/layouts/${id}/preview`, { signal }),
  savePlacements: (id: number, expectedVersion: number, placements: readonly PlacementRequest[]) =>
    request<LayoutView>(`/api/layouts/${id}/placements`, json('PUT', {
      expectedVersion,
      placements: placements.map(({ productId, zone, blockNo, position, sourceRecommendationId }) =>
        ({ productId, zone, blockNo, position, sourceRecommendationId })),
    })),
  ready: (id: number, expectedVersion: number) => request<LayoutView>(`/api/layouts/${id}/ready`, json('POST', { expectedVersion })),
  campaigns: (signal?: AbortSignal) => allPages<CampaignView>('/api/campaigns', signal),
  campaign: (id: number, signal?: AbortSignal) => request<CampaignView>(`/api/campaigns/${id}`, { signal }),
  createCampaign: (name: string, snapshotId: number, recommendationIds: number[]) => request<CampaignView>('/api/campaigns', json('POST', { name, snapshotId, recommendationIds })),
  decision: (id: number, expectedVersion: number, decision: 'KEEP_A' | 'CHOOSE_B', reportId?: number) => request<CampaignView>(`/api/campaigns/${id}/decision`, json('PUT', { expectedVersion, decision, ...(reportId ? { reportId } : {}) })),
  simulate: (id: number, body: { expectedCampaignVersion: number; expectedLayoutAVersion: number; expectedLayoutBVersion: number; rangeStart: string; rangeEnd: string }) => request<CampaignReport>(`/api/campaigns/${id}/simulations`, json('POST', body)),
  reports: (id: number, signal?: AbortSignal) => allPages<CampaignReport>(`/api/campaigns/${id}/reports`, signal),
  publish: (id: number, expectedVersion: number) => request<CampaignView>(`/api/campaigns/${id}/publish`, json('POST', { expectedVersion })),
  withdraw: (id: number, expectedVersion: number) => request<CampaignView>(`/api/campaigns/${id}/withdraw`, json('POST', { expectedVersion })),
  activate: (id: number, expectedVersion: number) => request<CampaignView>(`/api/campaigns/${id}/activate`, json('POST', { expectedVersion })),
  end: (id: number, expectedVersion: number) => request<CampaignView>(`/api/campaigns/${id}/end`, json('POST', { expectedVersion })),
  rollback: (id: number, expectedVersion: number) => request<ActiveLayout>(`/api/campaigns/${id}/rollback`, json('POST', { expectedVersion })),
  activeLayout: (signal?: AbortSignal) => request<ActiveLayout>('/api/storefront/active-layout', { signal })
};
