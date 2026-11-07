import { authService, type AuthUser } from '../../services/authService';
import { f05Api, F05ApiError } from '../f05/f05.api';
import type { Page, RequestView, RunView } from '../f05/f05.types';
import { f06Api, F06ApiError } from './f06.api';
import type { RecListParams, RecPage, RecView } from './f06.types';
import { INT32_MAX, REC_TYPES, REVIEW_STATUSES, recommendationInteger } from './f06.validation';

export type BrowseFilters = Pick<RecListParams, 'snapshotId' | 'type' | 'reviewStatus' | 'pageSize'>;
export interface RecommendationBrowseState {
  role: AuthUser['role'] | null;
  mode: 'history' | 'ranked';
  filters: BrowseFilters;
  page: number;
  miningRunId: number | null;
  list: RecPage | null;
  loading: boolean;
  error: string;
  detailId: number | null;
  detail: RecView | null;
  detailLoading: boolean;
  detailError: string;
  names: Record<number, string>;
  namesLoading: boolean;
  namesUnavailable: boolean;
  requests: Page<RequestView> | null;
  requestPage: number;
  requestsLoading: boolean;
  requestsError: string;
  request: RequestView | null;
  runs: RunView[];
  runsLoading: boolean;
  runsError: string;
}
const scopeKey = () => {
  const user = authService.getCurrentUser();
  return JSON.stringify([authService.getSessionId() || authService.getToken(), user?.id, user?.storeId, user?.role]);
};
const initial = (): RecommendationBrowseState => ({
  role: authService.getCurrentUser()?.role ?? null, mode: 'history', filters: { pageSize: 20 }, page: 0,
  miningRunId: null, list: null, loading: false, error: '', detailId: null, detail: null, detailLoading: false, detailError: '',
  names: {}, namesLoading: false, namesUnavailable: false, requests: null, requestPage: 0, requestsLoading: false,
  requestsError: '', request: null, runs: [], runsLoading: false, runsError: ''
});
export function recommendationReadError(error: unknown, ranked = false): string {
  if (!(error instanceof F06ApiError) && !(error instanceof F05ApiError)) return error instanceof Error ? error.message : 'Unable to load data. Refresh to try again manually.';
  const advice: Record<number, string> = {
    400: 'Check the filters and IDs.', 401: 'Sign in again or complete session recovery.',
    403: 'Access is denied for this role or Store.', 404: 'This record is unavailable for your Store.',
    409: ranked ? 'Narrow the type or review status filters; ranked views have a 10,000-candidate limit.' : 'Refresh and check the current source state.'
  };
  return `${error.message} ${error.status === null ? 'Check your connection and refresh manually.' : `(HTTP ${error.status}) ${advice[error.status] || ''}`}`.trim();
}

/** Existing F02 GET, used only for optional names in an open detail. Its current
 * storeApi wrapper has no AbortSignal, so use the same authenticated transport
 * with cancellation here. IDs remain visible when names cannot be resolved.
 */
export async function readRecommendationProductNames(ids: number[], signal: AbortSignal): Promise<Record<number, string>> {
  const names: Record<number, string> = {};
  const unique = [...new Set(ids)];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, unique.length) }, async () => {
    while (next < unique.length && !signal.aborted) {
      const id = unique[next++];
      try {
        const response = await authService.request(`/api/products/${id}`, { signal, headers: { Accept: 'application/json' } });
        const product: unknown = response.ok ? await response.json() : null;
        signal.throwIfAborted();
        if (product && typeof product === 'object' && 'id' in product && product.id === id &&
            'name' in product && typeof product.name === 'string' && product.name.trim()) names[id] = product.name;
      } catch { signal.throwIfAborted(); }
    }
  }));
  signal.throwIfAborted();
  return names;
}

type ReadKind = 'list' | 'detail' | 'names' | 'requests' | 'runs';
/** Read-only state for one mounted dashboard. No mutation, polling, client
 * ranking or cached cross-Store data. Every late result is context-fenced.
 */
export class RecommendationBrowser {
  private state = initial();
  private scope = scopeKey();
  private active = false;
  private unsubscribeAuth: (() => void) | null = null;
  private reads = new Map<ReadKind, AbortController>();
  private listeners = new Set<() => void>();
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<RecommendationBrowseState>) {
    this.state = { ...this.state, ...patch };
    [...this.listeners].forEach(listener => listener());
  }
  private allowed() {
    return this.active && this.scope === scopeKey() && !!authService.getToken() &&
      (this.state.role === 'Merchandiser' || this.state.role === 'Store Admin');
  }
  private abort(...kinds: ReadKind[]) { kinds.forEach(kind => this.reads.get(kind)?.abort()); }
  private begin(kind: ReadKind) {
    this.abort(kind);
    const controller = new AbortController();
    this.reads.set(kind, controller);
    const scope = this.scope;
    return { signal: controller.signal, current: () => this.allowed() && this.scope === scope && !controller.signal.aborted };
  }
  private checkStore(storeId: number) {
    const ownStore = authService.getCurrentUser()?.storeId;
    if (ownStore != null && storeId !== ownStore) throw new F06ApiError(200, 'Mismatched Store data was rejected.');
  }
  private syncContext = () => {
    if (scopeKey() === this.scope) return;
    this.abort('list', 'detail', 'names', 'requests', 'runs');
    this.scope = scopeKey();
    this.state = initial(); this.update({});
    if (this.allowed()) void this.refresh();
  };
  start = () => {
    if (this.active) return;
    this.active = true; this.scope = scopeKey();
    this.state = initial(); this.update({});
    this.unsubscribeAuth = authService.subscribe(this.syncContext);
    if (this.allowed()) void this.refresh();
  };
  stop = () => {
    this.active = false; this.abort('list', 'detail', 'names', 'requests', 'runs');
    this.unsubscribeAuth?.(); this.unsubscribeAuth = null;
  };
  setMode = (mode: RecommendationBrowseState['mode']) => {
    if (!this.allowed() || mode === this.state.mode) return;
    this.closeDetail(); this.abort('list', 'requests', 'runs');
    this.update({ mode, miningRunId: null, page: 0, list: null, error: '', loading: false,
      requests: null, requestPage: 0, requestsLoading: false, requestsError: '', request: null, runs: [], runsLoading: false, runsError: '' });
    if (mode === 'ranked') void this.loadRequests(0); else void this.refresh();
  };
  applyFilters = async (filters: BrowseFilters) => {
    if (!this.allowed()) return;
    try {
      if (filters.snapshotId !== undefined) recommendationInteger(filters.snapshotId, 'snapshotId', 1, INT32_MAX);
      recommendationInteger(filters.pageSize ?? 20, 'pageSize', 1, 100);
      if (filters.type !== undefined && !REC_TYPES.includes(filters.type) ||
          filters.reviewStatus !== undefined && !REVIEW_STATUSES.includes(filters.reviewStatus)) throw new F06ApiError(400, 'Unsupported recommendation filter.');
    } catch (error) { this.update({ error: recommendationReadError(error) }); return; }
    this.closeDetail();
    this.update({ filters: { ...filters, pageSize: filters.pageSize ?? 20 }, page: 0 });
    await this.refresh();
  };
  setPage = async (page: number) => {
    if (!this.allowed() || !Number.isInteger(page) || page < 0 || page > INT32_MAX) return;
    this.closeDetail(); this.update({ page }); await this.refresh();
  };
  refresh = async () => {
    if (!this.allowed()) return;
    this.closeDetail();
    const job = this.begin('list');
    if (this.state.mode === 'ranked' && this.state.miningRunId === null) { this.update({ list: null, loading: false, error: '' }); return; }
    const params: RecListParams = { ...this.state.filters, page: this.state.page,
      ...(this.state.mode === 'ranked' ? { miningRunId: this.state.miningRunId! } : {}) };
    this.update({ list: null, loading: true, error: '' });
    try {
      const list = await f06Api.list(params, job.signal);
      if (!job.current()) return;
      list.items.forEach(item => this.checkStore(item.storeId));
      const lastPage = Math.max(0, Math.ceil(list.totalElements / list.pageSize) - 1);
      if (list.page > lastPage) { this.update({ page: lastPage }); await this.refresh(); return; }
      this.update({ list, loading: false });
    } catch (error) { if (job.current()) this.update({ loading: false, error: recommendationReadError(error, this.state.mode === 'ranked') }); }
  };
  loadRequests = async (page = this.state.requestPage) => {
    if (!this.allowed() || this.state.mode !== 'ranked') return;
    this.closeDetail(); this.abort('list', 'runs');
    const job = this.begin('requests');
    this.update({ requestPage: page, requests: null, requestsLoading: true, requestsError: '',
      request: null, runs: [], runsLoading: false, runsError: '', miningRunId: null, page: 0, list: null, loading: false, error: '' });
    try {
      const requests = await f05Api.listRequests(page, 20, job.signal);
      if (!job.current()) return;
      requests.items.forEach(item => this.checkStore(item.storeId));
      const lastPage = Math.max(0, Math.ceil(requests.totalElements / requests.pageSize) - 1);
      if (page > lastPage) { await this.loadRequests(lastPage); return; }
      this.update({ requests, requestsLoading: false });
    } catch (error) { if (job.current()) this.update({ requestsLoading: false, requestsError: recommendationReadError(error) }); }
  };
  selectRequest = async (id: number) => {
    if (!this.allowed() || this.state.mode !== 'ranked') return;
    const request = this.state.requests?.items.find(item => item.requestId === id);
    if (!request) return;
    this.closeDetail(); this.abort('list');
    const job = this.begin('runs');
    this.update({ request, runs: [], runsLoading: true, runsError: '', miningRunId: null, page: 0, list: null, loading: false, error: '' });
    try {
      const runs = await f05Api.listRuns(id, job.signal);
      if (!job.current()) return;
      if (runs.some(run => run.storeId !== request.storeId || run.snapshotId !== request.snapshotId)) throw new F06ApiError(200, 'Mismatched mining source was rejected.');
      this.update({ runs, runsLoading: false });
    } catch (error) { if (job.current()) this.update({ runsLoading: false, runsError: recommendationReadError(error) }); }
  };
  selectRun = async (id: number) => {
    if (!this.allowed() || !this.state.runs.some(run => run.runId === id && run.status === 'COMPLETED')) return;
    this.update({ miningRunId: id, page: 0 }); await this.refresh();
  };
  openDetail = async (id: number) => {
    if (!this.allowed()) return;
    this.abort('names'); const job = this.begin('detail');
    this.update({ detailId: id, detail: null, detailLoading: true, detailError: '', names: {}, namesLoading: false, namesUnavailable: false });
    try {
      const detail = await f06Api.get(id, job.signal);
      if (!job.current()) return;
      this.checkStore(detail.storeId);
      this.update({ detail, detailLoading: false });
      const namesJob = this.begin('names');
      this.update({ namesLoading: true });
      const names = await readRecommendationProductNames(detail.productIds, namesJob.signal);
      if (namesJob.current()) this.update({ names, namesLoading: false, namesUnavailable: detail.productIds.some(productId => !names[productId]) });
    } catch (error) { if (job.current()) this.update({ detailLoading: false, detailError: recommendationReadError(error) }); }
  };
  closeDetail = () => {
    this.abort('detail', 'names');
    this.update({ detailId: null, detail: null, detailLoading: false, detailError: '', names: {}, namesLoading: false, namesUnavailable: false });
  };
}
