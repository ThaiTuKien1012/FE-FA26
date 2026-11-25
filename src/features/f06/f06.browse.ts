import { authService, type AuthUser } from '../../services/authService';
import { f05Api, F05ApiError } from '../f05/f05.api';
import { recommendationProductImage } from './f06.products';
import { sameMiningInput } from '../f05/f05.conversion';
import { readRecommendationSource } from './f06.source';
import { recommendationError } from './f06.errors';
import type { Page, RequestView, RunView } from '../f05/f05.types';
import { f06Api, F06ApiError } from './f06.api';
import type { RecListParams, RecPage, RecView } from './f06.types';
import { INT32_MAX, REC_TYPES, REVIEW_STATUSES, recommendationInteger, validateReview } from './f06.validation';

export interface ReviewConfirmation { id: number; expectedVersion: number; reason: string; action: 'approve' | 'reject'; }

export type BrowseFilters = Pick<RecListParams, 'snapshotId' | 'type' | 'reviewStatus' | 'pageSize'>;
export interface RecommendationBrowseState {
  role: AuthUser['role'] | null;
  mode: 'history' | 'ranked';
  filters: BrowseFilters;
  page: number;
  miningRunId: number | null;
  sourceRun: RunView | null;
  sourceLoading: boolean;
  list: RecPage | null;
  loading: boolean;
  error: string;
  detailId: number | null;
  detail: RecView | null;
  detailLoading: boolean;
  detailError: string;
  names: Record<number, string>;
  listNames: Record<number, string>;
  images?: Record<number, string>;
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
  reviewConfirmation: ReviewConfirmation | null;
  reviewPending: boolean;
  reviewNeedsRefresh: boolean;
  reviewError: string;
  reviewNotice: string;
  reviewedId: number | null;
  nextLoading: boolean;
  nextError: string;
  nextMessage: string;
}
const scopeKey = () => {
  const user = authService.getCurrentUser();
  return JSON.stringify([authService.getSessionId() || authService.getToken(), user?.id, user?.storeId, user?.role]);
};
const initial = (): RecommendationBrowseState => ({
  role: authService.getCurrentUser()?.role ?? null, mode: 'ranked', filters: { pageSize: 20,type:'BUNDLE' }, page: 0,
  sourceRun: null, sourceLoading: false,
  miningRunId: null, list: null, loading: false, error: '', detailId: null, detail: null, detailLoading: false, detailError: '',
  names: {}, listNames: {}, images: {}, namesLoading: false, namesUnavailable: false, requests: null, requestPage: 0, requestsLoading: false,
  requestsError: '', request: null, runs: [], runsLoading: false, runsError: '',
  reviewConfirmation: null, reviewPending: false, reviewNeedsRefresh: false, reviewError: '', reviewNotice: '',
  reviewedId:null,nextLoading:false,nextError:'',nextMessage:''
});
export function recommendationReadError(error:unknown,_ranked=false):string { return recommendationError(error); }

/** Existing own-Store F02 GET, used for optional names in details and the Store Admin list. Its current
 * storeApi wrapper has no AbortSignal, so use the same authenticated transport
 * with cancellation here. Unresolved names have an honest presentation fallback.
 */
export async function readRecommendationProductNames(ids: number[], signal: AbortSignal, cache?: Map<number, string | null>, images?: Map<number,string>): Promise<Record<number, string>> {
  const names: Record<number, string> = {};
  const unique = [...new Set(ids)];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, unique.length) }, async () => {
    while (next < unique.length && !signal.aborted) {
      const id = unique[next++];
      if (cache?.has(id)) { const name = cache.get(id); if (name) names[id] = name; continue; }
      try {
        const response = await authService.request(`/api/products/${id}`, { signal, headers: { Accept: 'application/json' } });
        const product: unknown = response.ok ? await response.json() : null;
        signal.throwIfAborted();
        if (product && typeof product === 'object' && 'id' in product && product.id === id &&
            'name' in product && typeof product.name === 'string' && product.name.trim()) {
          const image=recommendationProductImage('imageUrl' in product?product.imageUrl:undefined);
          if(image)images?.set(id,image);else images?.delete(id);
          names[id] = product.name;
          cache?.set(id, product.name);
        } else if (response.status === 404) cache?.set(id, null);
        // Bound this mounted, Store/session-scoped presentation cache.
        if (cache && cache.size > 500) { const oldest=cache.keys().next().value!;cache.delete(oldest);images?.delete(oldest); }
      } catch { signal.throwIfAborted(); }
    }
  }));
  signal.throwIfAborted();
  return names;
}

type ReadKind = 'next' | 'source' | 'list' | 'detail' | 'names' | 'listNames' | 'requests' | 'runs' | 'review';
/** State for one mounted dashboard. Reviews require an explicit confirmation.
 * No polling or client ranking. Every late result is context-fenced.
 */
export class RecommendationBrowser {
  private state = initial();
  private scope = scopeKey();
  private active = false;
  private unsubscribeAuth: (() => void) | null = null;
  private reads = new Map<ReadKind, AbortController>();
  private listeners = new Set<() => void>();
  private productNames = new Map<number, string | null>();
  private productImages = new Map<number,string>();
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
  private checkDetail(detail:RecView,type=this.state.filters.type) {
    this.checkStore(detail.storeId);
    const run=this.state.sourceRun;
    if(run&&(detail.type!==type||detail.snapshotId!==run.snapshotId||!detail.sources.some(source=>source.runId===run.runId&&source.snapshotId===run.snapshotId)))throw new F06ApiError(404,'Recommendation unavailable for the selected analysis.');
  }
  private decisionMessage(detail:RecView) {
    return detail.reviewStatus==='APPROVED'
      ? detail.readyForConsumption?'Approved and ready for layout.':'Recommendation approved. It is not currently ready for Layout. Check the latest product availability.'
      : 'Recommendation rejected. Your decision has been saved.';
  }
  private async loadDetailNames(detail:RecView) {
    const job=this.begin('names');this.update({namesLoading:true});
    try {
      const names=await readRecommendationProductNames(detail.productIds,job.signal,this.productNames,this.productImages);
      if(job.current()&&this.state.detailId===detail.recommendationId)this.update({names,listNames:{...this.state.listNames,...names},images:Object.fromEntries(this.productImages),namesLoading:false,namesUnavailable:detail.productIds.some(id=>!names[id])});
    } catch { if(job.current())this.update({namesLoading:false,namesUnavailable:true}); }
  }
  private syncContext = () => {
    if (scopeKey() === this.scope) return;
    this.abort('next','source', 'list', 'detail', 'names', 'listNames', 'requests', 'runs', 'review');
    this.productNames.clear(); this.productImages.clear();
    this.scope = scopeKey();
    this.state = initial(); this.update({});
    if (this.allowed()) void this.loadRequests(0);
  };
  start = (loadChoices = true) => {
    if (this.active) return;
    this.active = true; this.scope = scopeKey();
    this.productNames.clear(); this.productImages.clear();
    this.state = initial(); this.update({});
    this.unsubscribeAuth = authService.subscribe(this.syncContext);
    if (loadChoices && this.allowed()) void this.loadRequests(0);
  };
  stop = () => {
    this.active = false; this.abort('next','source', 'list', 'detail', 'names', 'listNames', 'requests', 'runs', 'review');
    this.productNames.clear(); this.productImages.clear();
    this.unsubscribeAuth?.(); this.unsubscribeAuth = null;
  };
  setMode = (mode: RecommendationBrowseState['mode']) => {
    // Legacy callers can choose an analysis, but cannot restore an unscoped Library.
    if (mode !== 'ranked' || !this.state.requests) void this.loadRequests(0);
  };
  applyFilters = async (filters: BrowseFilters) => {
    if (!this.allowed() || this.state.reviewPending) return;
    try {
      if (filters.snapshotId !== undefined) recommendationInteger(filters.snapshotId, 'snapshotId', 1, INT32_MAX);
      recommendationInteger(filters.pageSize ?? 20, 'pageSize', 1, 100);
      if (filters.type !== undefined && !REC_TYPES.includes(filters.type) ||
          filters.reviewStatus !== undefined && !REVIEW_STATUSES.includes(filters.reviewStatus)) throw new F06ApiError(400, 'Unsupported recommendation filter.');
    } catch (error) { this.update({ error: recommendationReadError(error) }); return; }
    this.closeDetail();
    this.update({ filters: { ...filters,type:filters.type??this.state.filters.type??'BUNDLE',pageSize:filters.pageSize??20 }, page: 0 });
    await this.refresh();
  };
  setPage = async (page: number) => {
    if (!this.allowed() || this.state.reviewPending || !Number.isInteger(page) || page < 0 || page > INT32_MAX) return;
    this.closeDetail(); this.update({ page }); await this.refresh();
  };
  refresh = async (refreshNames = false, preserveDetail = false) => {
    if (!this.allowed() || this.state.reviewPending) return;
    // Explicit refresh can pick up catalog renames; paging/filtering
    // reuses labels and does not repeat one F02 request for each row.
    if (refreshNames) {
      this.productNames.clear(); this.productImages.clear(); this.update({ listNames: {}, images:{} });
    }
    this.abort('listNames');
    if (!preserveDetail) this.closeDetail();
    const job = this.begin('list');
    if (!this.state.sourceRun || this.state.sourceRun.runId !== this.state.miningRunId) { this.update({ list: null, loading: false }); return; }
    const params: RecListParams = { ...this.state.filters,type:this.state.filters.type??'BUNDLE', page: this.state.page,
      miningRunId: this.state.sourceRun.runId };
    this.update({ list: null, loading: true, error: '' });
    try {
      const list = await f06Api.list(params, job.signal);
      if (!job.current()) return;
      list.items.forEach(item => this.checkStore(item.storeId));
      if (list.ordering !== 'RANKED_WITHIN_SOURCE_RUN' || list.items.some(item => item.type!==params.type||!item.sources.some(source => source.runId === params.miningRunId && source.snapshotId === this.state.sourceRun!.snapshotId))) throw new F06ApiError(200, 'Recommendations do not match the selected analysis.');
      const lastPage = Math.max(0, Math.ceil(list.totalElements / list.pageSize) - 1);
      if (list.page > lastPage) { this.update({ page: lastPage }); await this.refresh(false, preserveDetail); return; }
      this.update({ list, loading: false });
      void this.loadListNames(list);
    } catch (error) { if (job.current()) this.update({ loading: false, error: recommendationReadError(error, this.state.mode === 'ranked') }); }
  };
  private loadListNames = async (list: RecPage) => {
    const job = this.begin('listNames');
    try {
      const names = await readRecommendationProductNames(list.items.flatMap(item => item.productIds), job.signal, this.productNames, this.productImages);
      if (job.current() && this.state.list === list) this.update({ listNames: names, images:Object.fromEntries(this.productImages) });
    } catch { /* Optional labels never block results or replace IDs with invented names. */ }
  };
  showGeneratedResults = async (runId:number) => {
    await this.selectSource(runId);
  };
  selectSource = async (runId:number) => {
    if(!this.allowed())return;
    this.abort('review');this.update({reviewPending:false});
    this.closeDetail();this.abort('next','list','listNames','requests','runs','names');
    const job=this.begin('source');
    this.update({mode:'ranked',miningRunId:null,sourceRun:null,sourceLoading:true,page:0,filters:{pageSize:20,type:'BUNDLE'},request:null,runs:[],list:null,error:'',loading:false,requestsLoading:false,runsLoading:false,listNames:{},images:{}});
    try {
      const {request,run}=await readRecommendationSource(runId,job.signal);
      if(!job.current())return;
      this.update({request,runs:[run],sourceRun:run,miningRunId:run.runId,sourceLoading:false});
      await this.refresh();
    } catch(error) { if(job.current())this.update({sourceLoading:false,error:recommendationReadError(error)}); }
  };
  loadRequests = async (page = this.state.requestPage) => {
    if (!this.allowed() || this.state.mode !== 'ranked') return;
    this.abort('review');this.update({reviewPending:false});
    this.closeDetail(); this.abort('next','source', 'list', 'listNames', 'names', 'runs');
    const job = this.begin('requests');
    this.update({ requestPage: page, requests: null, requestsLoading: true, requestsError: '',
      request: null, runs: [], runsLoading: false, runsError: '', miningRunId: null, sourceRun:null,sourceLoading:false,page: 0, list: null, loading: false, error: '',listNames:{},images:{} });
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
    if (!this.allowed() || this.state.reviewPending || this.state.mode !== 'ranked') return;
    const request = this.state.requests?.items.find(item => item.requestId === id);
    if (!request) return;
    this.closeDetail(); this.abort('next','source','list','listNames','names');
    const job = this.begin('runs');
    this.update({ request, runs: [], runsLoading: true, runsError: '', miningRunId: null, sourceRun:null,sourceLoading:false,page: 0, list: null, loading: false, error: '' });
    try {
      const runs = await f05Api.listRuns(id, job.signal);
      if (!job.current()) return;
      if (runs.some(run => run.requestId !== request.requestId || run.storeId !== request.storeId || run.snapshotId !== request.snapshotId || !request.algorithms.includes(run.algorithm) || !sameMiningInput(request, run))) throw new F06ApiError(200, 'Mismatched mining source was rejected.');
      this.update({ runs, runsLoading: false });
    } catch (error) { if (job.current()) this.update({ runsLoading: false, runsError: recommendationReadError(error) }); }
  };
  selectRun = async (id: number) => {
    if (!this.allowed() || this.state.reviewPending || !this.state.runs.some(run => run.runId === id && run.status === 'COMPLETED')) return;
    await this.selectSource(id);
  };
  openDetail = async (id: number, retainReviewMessage = false, refreshNames = false) => {
    if (!this.allowed() || this.state.reviewPending) return;
    this.abort('next','listNames');
    if (refreshNames) { this.productNames.clear(); this.productImages.clear(); }
    this.abort('names'); const job = this.begin('detail');
    this.update({ detailId: id, detail: null, detailLoading: true, detailError: '', names: {}, namesLoading: false, namesUnavailable: false,
      reviewConfirmation: null,nextLoading:false,nextError:'',nextMessage:'',reviewedId:this.state.reviewedId===id?id:null, ...(retainReviewMessage ? {} : { reviewError: '', reviewNotice: '' }) });
    try {
      const detail = await f06Api.get(id, job.signal);
      if (!job.current()) return;
      this.checkDetail(detail);
      this.update({ detail, detailLoading: false, reviewNeedsRefresh: false });
      if(retainReviewMessage&&detail.reviewStatus!=='PENDING_REVIEW')this.update({reviewedId:id,reviewError:'',reviewNotice:this.decisionMessage(detail)});
      await this.loadDetailNames(detail);
    } catch (error) { if (job.current()) this.update({ detailLoading: false, detailError: recommendationReadError(error) }); }
  };
  closeDetail = () => {
    if (this.state.reviewPending) return;
    this.abort('next','detail', 'names', 'review');
    this.update({ detailId: null, detail: null, detailLoading: false, detailError: '', names: {}, namesLoading: false, namesUnavailable: false,
      reviewConfirmation: null, reviewNeedsRefresh: false, reviewError: '', reviewNotice: '',reviewedId:null,nextLoading:false,nextError:'',nextMessage:'' });
  };
  prepareReview = (action: ReviewConfirmation['action'], reason: string) => {
    if (!this.allowed() || this.state.role !== 'Merchandiser' || this.state.reviewPending || this.state.detailLoading || this.state.reviewNeedsRefresh) return;
    const detail = this.state.detail;
    if (!detail || detail.reviewStatus !== 'PENDING_REVIEW') return;
    try {
      validateReview({ expectedVersion: detail.version, reason });
      if (action === 'approve' && detail.currentEligibility.status !== 'ELIGIBLE') throw new F06ApiError(409, 'Approval requires eligible products. Rejection is still available.');
      this.update({ reviewConfirmation: { id: detail.recommendationId, expectedVersion: detail.version, reason, action }, reviewError: '', reviewNotice: '' });
    } catch (error) { this.update({ reviewConfirmation: null, reviewError: recommendationReadError(error) }); }
  };
  cancelReview = () => { if (!this.state.reviewPending) this.update({ reviewConfirmation: null }); };
  confirmReview = async () => {
    if (!this.allowed() || this.state.role !== 'Merchandiser' || this.state.reviewPending || this.state.reviewNeedsRefresh) return;
    const confirmation = this.state.reviewConfirmation, detail = this.state.detail;
    if (!confirmation || !detail || detail.recommendationId !== confirmation.id || detail.version !== confirmation.expectedVersion ||
        detail.reviewStatus !== 'PENDING_REVIEW' || confirmation.action === 'approve' && detail.currentEligibility.status !== 'ELIGIBLE') return;
    const job = this.begin('review');
    this.update({ reviewPending: true, reviewError: '', reviewNotice: '' });
    try {
      const result = await f06Api[confirmation.action](confirmation.id, { expectedVersion: confirmation.expectedVersion, reason: confirmation.reason }, job.signal);
      if (!job.current()) return;
      try { this.checkDetail(result); }
      catch { throw new F06ApiError(200, 'The returned decision could not be verified.'); }
      if(result.reviewStatus==='PENDING_REVIEW')throw new F06ApiError(200,'The decision could not be confirmed.');
      this.update({ detail: result, reviewPending: false, reviewConfirmation: null,
        reviewedId:result.recommendationId,reviewNotice:this.decisionMessage(result) });
      await this.refresh(false, true);
    } catch (error) {
      if (!job.current()) return;
      const reconcile = !(error instanceof F06ApiError) || error.status === null || error.status === 409 || error.status === 200 || error.status >= 500;
      this.update({ reviewPending: false, reviewConfirmation: null, reviewNeedsRefresh: reconcile,
        reviewError: `${recommendationError(error,'review')}${reconcile ? ' The submission was not confirmed. Checking the saved decision; no automatic retry was made.' : ''}` });
      if (reconcile) await this.openDetail(confirmation.id, true);
    }
  };
  reviewNext = async () => {
    const run=this.state.sourceRun,current=this.state.detail,type=this.state.filters.type;
    if(!this.allowed()||this.state.role!=='Merchandiser'||!run||!type||!current||current.reviewStatus==='PENDING_REVIEW'||this.state.reviewedId!==current.recommendationId||this.state.reviewPending||this.state.nextLoading)return;
    const job=this.begin('next'),seen=new Set<number>([current.recommendationId]);let checked=0;
    this.update({nextLoading:true,nextError:'',nextMessage:''});
    try {
      for(let page=0;page<2;page++) {
        const list=await f06Api.list({miningRunId:run.runId,type,reviewStatus:'PENDING_REVIEW',page,pageSize:20},job.signal);
        if(!job.current())return;
        if(list.ordering!=='RANKED_WITHIN_SOURCE_RUN')throw new F06ApiError(200,'Pending recommendation ordering could not be verified.');
        for(const item of list.items){this.checkDetail(item,type);if(item.reviewStatus!=='PENDING_REVIEW')throw new F06ApiError(200,'Pending list could not be verified.');}
        for(const item of list.items) {
          if(seen.has(item.recommendationId))continue;seen.add(item.recommendationId);
          if(checked++>=3)break;
          let candidate:RecView;
          try{candidate=await f06Api.get(item.recommendationId,job.signal);}
          catch(error){if(!job.current())return;if(error instanceof F06ApiError&&error.status===404)continue;throw error;}
          if(!job.current())return;this.checkDetail(candidate,type);
          if(candidate.reviewStatus!=='PENDING_REVIEW')continue;
          this.abort('detail','names');
          this.update({detailId:candidate.recommendationId,detail:candidate,detailLoading:false,detailError:'',names:{},namesUnavailable:false,reviewConfirmation:null,reviewNeedsRefresh:false,reviewError:'',reviewNotice:'',reviewedId:null,nextLoading:false,nextError:'',nextMessage:''});
          await this.loadDetailNames(candidate);return;
        }
        if((page+1)*list.pageSize>=list.totalElements) {
          this.update({nextLoading:false,nextMessage:list.totalElements===0?'No pending recommendations remain for this analysis and type.':'The pending suggestions changed while checking. Refresh Needs review and try again.'});return;
        }
        if(checked>=3)break;
      }
      this.update({nextLoading:false,nextMessage:'The pending suggestions changed while checking. Refresh Needs review and try again.'});
    } catch(error) { if(job.current())this.update({nextLoading:false,nextError:recommendationError(error)}); }
  };
}
