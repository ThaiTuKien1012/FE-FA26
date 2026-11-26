import { authService } from '../../services/authService';
import { parseSafeMiningJson } from '../f05/f05.numbers';
import type { CampaignReport, Page } from '../f07f08/f07f08.api';
import { periodError } from './f11.model';
import type { AdditionFilter, BundleAdditions, SnapshotUtility } from './f11.types';
export class DashboardApiError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}
const scope = () => { const user = authService.getCurrentUser(); return JSON.stringify([authService.getSessionId(), user?.id, user?.storeId, user?.role]); };
async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const user = authService.getCurrentUser();
  if (!user) throw new DashboardApiError(401, 'Please sign in.');
  if (!['Merchandiser', 'Store Admin'].includes(user.role)) throw new DashboardApiError(403, 'Store staff access required.');
  const initialScope = scope();
  const response = await authService.request(path, { signal });
  const raw = await response.text();
  signal?.throwIfAborted();
  if (!response.ok) {
    let body: { error?: string; code?: string } = {};
    try { body = JSON.parse(raw); } catch { /* Gateways may return HTML. */ }
    throw new DashboardApiError(response.status, body.error || `Request failed (${response.status})`, body.code);
  }
  if (scope() !== initialScope) throw new DashboardApiError(401, 'The active session changed.');
  return parseSafeMiningJson(raw) as T;
}
function positiveId(value: number) { if (!Number.isSafeInteger(value) || value <= 0) throw new DashboardApiError(400, 'Invalid resource ID.'); }
export const f11Api = {
  async snapshots(page = 0, pageSize = 20, signal?: AbortSignal): Promise<Page<SnapshotUtility>> {
    if (!Number.isSafeInteger(page) || page < 0 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new DashboardApiError(400, 'Invalid pagination.');
    return request(`/api/dashboard/snapshot-utilities?page=${page}&pageSize=${pageSize}`, signal);
  },
  async additions(filter: AdditionFilter = {}, signal?: AbortSignal): Promise<BundleAdditions> {
    const query = new URLSearchParams();
    if (filter.from !== undefined || filter.to !== undefined) {
      const error = periodError(filter.from ?? '', filter.to ?? '');
      if (error) throw new DashboardApiError(400, error);
      query.set('from', filter.from!); query.set('to', filter.to!);
    }
    if (filter.campaignId !== undefined) { positiveId(filter.campaignId); query.set('campaignId', String(filter.campaignId)); }
    return request('/api/dashboard/bundle-additions' + (query.size ? `?${query}` : ''), signal);
  },
  async report(id: number, signal?: AbortSignal): Promise<CampaignReport> {
    positiveId(id);
    return request(`/api/campaign-reports/${id}`, signal);
  },
};
