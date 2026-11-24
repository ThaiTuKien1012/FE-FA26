import { authService } from '../../services/authService';

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

export interface Placement {
  productId: number;
  recommendationId: number | null;
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

export interface CampaignReport {
  reportId: number;
  campaignId: number;
  snapshotId: number;
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
    hitRate?: Metric;
    bundleConversion?: Metric;
    capturedUtility?: Metric;
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
  campaign: CampaignView | null;
  layout: LayoutView | null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authService.request(path, {
    ...init,
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : typeof data?.message === 'string' ? data.message : `Request failed (${response.status})`;
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return data as T;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const f07f08Api = {
  policy: () => request<LayoutPolicy>('/api/layouts/policy'),
  recommendations: (snapshotId: number) => request<Page<RecommendationOption>>(`/api/layouts/recommendations?snapshotId=${encodeURIComponent(snapshotId)}&page=0&pageSize=100`),
  layouts: (campaignId?: number) => request<Page<LayoutSummary>>(`/api/layouts?page=0&pageSize=100${campaignId ? `&campaignId=${campaignId}` : ''}`),
  layout: (id: number) => request<LayoutView>(`/api/layouts/${id}`),
  preview: (id: number) => request<LayoutView>(`/api/layouts/${id}/preview`),
  savePlacements: (id: number, expectedVersion: number, recommendationIds: number[]) => request<LayoutView>(`/api/layouts/${id}/placements`, json('PUT', { expectedVersion, recommendationIds })),
  ready: (id: number, expectedVersion: number) => request<LayoutView>(`/api/layouts/${id}/ready`, json('POST', { expectedVersion })),
  campaigns: () => request<Page<CampaignView>>('/api/campaigns?page=0&pageSize=100'),
  campaign: (id: number) => request<CampaignView>(`/api/campaigns/${id}`),
  createCampaign: (name: string, snapshotId: number, recommendationIds: number[]) => request<CampaignView>('/api/campaigns', json('POST', { name, snapshotId, recommendationIds })),
  decision: (id: number, expectedVersion: number, decision: 'KEEP_A' | 'CHOOSE_B', reportId?: number) => request<CampaignView>(`/api/campaigns/${id}/decision`, json('PUT', { expectedVersion, decision, ...(reportId ? { reportId } : {}) })),
  simulate: (id: number, body: { expectedCampaignVersion: number; expectedLayoutAVersion: number; expectedLayoutBVersion: number; rangeStart: string; rangeEnd: string }) => request<CampaignReport>(`/api/campaigns/${id}/simulations`, json('POST', body)),
  reports: (id: number) => request<Page<CampaignReport>>(`/api/campaigns/${id}/reports?page=0&pageSize=100`),
  publish: (id: number, expectedVersion: number) => request<CampaignView>(`/api/campaigns/${id}/publish`, json('POST', { expectedVersion })),
  withdraw: (id: number, expectedVersion: number) => request<CampaignView>(`/api/campaigns/${id}/withdraw`, json('POST', { expectedVersion })),
  activate: (id: number, expectedVersion: number) => request<CampaignView>(`/api/campaigns/${id}/activate`, json('POST', { expectedVersion })),
  end: (id: number, expectedVersion: number) => request<CampaignView>(`/api/campaigns/${id}/end`, json('POST', { expectedVersion })),
  rollback: (id: number, expectedVersion: number) => request<CampaignView>(`/api/campaigns/${id}/rollback`, json('POST', { expectedVersion })),
  activeLayout: () => request<ActiveLayout>('/api/storefront/active-layout')
};
