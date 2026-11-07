import { authService, type AuthUser } from '../../services/authService';
import { f05Api, F05ApiError } from '../f05/f05.api';
import type { Page, RequestView, RunView } from '../f05/f05.types';
import { f06Api, F06ApiError } from './f06.api';
import type { RecGenerationResult, RecPolicy, RecType } from './f06.types';
import { REC_TYPES } from './f06.validation';

export interface GenerationState {
  role: AuthUser['role'] | null;
  page: number;
  history: Page<RequestView> | null;
  historyLoading: boolean;
  historyError: string;
  request: RequestView | null;
  runs: RunView[];
  runsLoading: boolean;
  runsError: string;
  selectedRunId: number | null;
  types: RecType[];
  policy: RecPolicy | null;
  policyLoading: boolean;
  policyError: string;
  pending: boolean;
  result: RecGenerationResult | null;
  resultTypes: RecType[];
  generationError: string;
}
const context = () => {
  const user = authService.getCurrentUser();
  return JSON.stringify([authService.getSessionId() || authService.getToken(), user?.id, user?.storeId, user?.role]);
};
const readable = (role: GenerationState['role']) => role === 'Merchandiser' || role === 'Store Admin';
const initial = (): GenerationState => ({
  role: authService.getCurrentUser()?.role ?? null, page: 0, history: null, historyLoading: false, historyError: '',
  request: null, runs: [], runsLoading: false, runsError: '', selectedRunId: null, types: ['BUNDLE'],
  policy: null, policyLoading: false, policyError: '', pending: false, result: null, resultTypes: [], generationError: ''
});

export function generationErrorMessage(error: unknown): string {
  if (!(error instanceof F06ApiError) && !(error instanceof F05ApiError)) return error instanceof Error ? error.message : 'The request could not be completed. Try again manually.';
  const help: Record<number, string> = {
    400: 'Check your selection.', 401: 'Please sign in again or complete session recovery.',
    403: 'Your role or Store does not have access.', 404: 'This source is unavailable for your Store.',
    409: 'Refresh the source and review your selection before trying again manually.'
  };
  return `${error.message}${error.status === null ? ' Check your connection. A submitted change may already have persisted.' : ` (HTTP ${error.status}) ${help[error.status] || ''}`}`.trim();
}

/** Owns one visible workflow, never a background job. All writes are explicit.
 * Separate abort controllers cancel superseded reads; context fences also drop
 * late responses from servers/mocks that do not honor abort.
 */
export class RecommendationGeneration {
  private state = initial();
  private scope = context();
  private listeners = new Set<() => void>();
  private unsubscribeAuth: (() => void) | null = null;
  private started = false;
  private historyRead: AbortController | null = null;
  private runsRead: AbortController | null = null;
  private policyRead: AbortController | null = null;
  private submission: AbortController | null = null;
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<GenerationState>) {
    this.state = { ...this.state, ...patch };
    [...this.listeners].forEach(listener => listener());
  }
  private cancel() {
    [this.historyRead, this.runsRead, this.policyRead, this.submission].forEach(controller => controller?.abort());
  }
  private current(controller: AbortController, scope: string) {
    return this.started && !controller.signal.aborted && this.scope === scope && context() === scope;
  }
  private syncContext = () => {
    if (context() === this.scope) return;
    this.cancel();
    this.scope = context();
    this.state = initial();
    this.update({});
    if (readable(this.state.role) && authService.getToken()) { void this.refreshHistory(); void this.refreshPolicy(); }
  };
  start = () => {
    if (this.started) return;
    this.started = true;
    this.scope = context();
    this.unsubscribeAuth = authService.subscribe(this.syncContext);
    this.state = initial();
    this.update({});
    if (readable(this.state.role) && authService.getToken()) { void this.refreshHistory(); void this.refreshPolicy(); }
  };
  stop = () => {
    this.started = false;
    this.cancel();
    this.unsubscribeAuth?.();
    this.unsubscribeAuth = null;
  };
  refreshHistory = async (page = this.state.page) => {
    if (!this.started || !readable(this.state.role) || this.state.pending || context() !== this.scope) return;
    if (!Number.isInteger(page) || page < 0) return;
    this.historyRead?.abort(); this.runsRead?.abort();
    const controller = this.historyRead = new AbortController(), scope = this.scope;
    this.update({ page, history: null, historyLoading: true, historyError: '', request: null, runs: [],
      runsLoading: false, runsError: '', selectedRunId: null, result: null, resultTypes: [], generationError: '' });
    try {
      const history = await f05Api.listRequests(page, 20, controller.signal);
      if (!this.current(controller, scope)) return;
      const storeId = authService.getCurrentUser()?.storeId;
      if (storeId != null && history.items.some(item => item.storeId !== storeId)) throw new F06ApiError(200, 'Mismatched Store data was rejected.');
      const last = Math.max(0, Math.ceil(history.totalElements / history.pageSize) - 1);
      if (page > last) { await this.refreshHistory(last); return; }
      this.update({ history, historyLoading: false });
    } catch (error) {
      if (this.current(controller, scope)) this.update({ historyLoading: false, historyError: generationErrorMessage(error) });
    }
  };
  selectRequest = async (requestId: number) => {
    if (!this.started || this.state.pending || context() !== this.scope) return;
    const selected = this.state.history?.items.find(item => item.requestId === requestId);
    if (!selected) return;
    this.runsRead?.abort();
    const controller = this.runsRead = new AbortController(), scope = this.scope;
    this.update({ request: selected, runs: [], runsLoading: true, runsError: '', selectedRunId: null, result: null, resultTypes: [], generationError: '' });
    try {
      const [request, runs] = await Promise.all([f05Api.getRequest(requestId, controller.signal), f05Api.listRuns(requestId, controller.signal)]);
      if (!this.current(controller, scope)) return;
      if (request.storeId !== selected.storeId || request.snapshotId !== selected.snapshotId ||
          runs.some(run => run.storeId !== request.storeId || run.snapshotId !== request.snapshotId)) {
        throw new F06ApiError(200, 'Mismatched mining source was rejected. Refresh requests.');
      }
      this.update({ request, runs, runsLoading: false });
    } catch (error) {
      if (this.current(controller, scope)) this.update({ runsLoading: false, runsError: generationErrorMessage(error) });
    }
  };
  refreshPolicy = async () => {
    if (!this.started || !readable(this.state.role) || context() !== this.scope) return;
    this.policyRead?.abort();
    const controller = this.policyRead = new AbortController(), scope = this.scope;
    this.update({ policy: null, policyLoading: true, policyError: '' });
    try {
      const policy = await f06Api.getConfig(controller.signal);
      if (this.current(controller, scope)) this.update({ policy, policyLoading: false });
    } catch (error) {
      if (this.current(controller, scope)) this.update({ policyLoading: false, policyError: generationErrorMessage(error) });
    }
  };
  selectRun = (runId: number) => {
    if (this.state.pending || this.state.role !== 'Merchandiser' || context() !== this.scope) return;
    if (!this.state.runs.some(run => run.runId === runId && run.status === 'COMPLETED')) return;
    this.update({ selectedRunId: runId, result: null, resultTypes: [], generationError: '' });
  };
  toggleType = (type: RecType) => {
    if (this.state.pending || this.state.role !== 'Merchandiser' || !REC_TYPES.includes(type)) return;
    this.update({ types: this.state.types.includes(type) ? this.state.types.filter(value => value !== type) : [...this.state.types, type],
      result: null, resultTypes: [], generationError: '' });
  };
  generate = async () => {
    if (!this.started || this.state.pending || context() !== this.scope) return;
    if (this.state.role !== 'Merchandiser') return;
    const run = this.state.runs.find(item => item.runId === this.state.selectedRunId);
    if (!run || run.status !== 'COMPLETED') { this.update({ generationError: 'Choose a completed mining run.' }); return; }
    if (!this.state.types.length) { this.update({ generationError: 'Select at least one recommendation type.' }); return; }
    const types = [...this.state.types];
    const controller = this.submission = new AbortController(), scope = this.scope;
    // Set pending synchronously, before any await: repeated clicks share no write.
    this.update({ pending: true, result: null, resultTypes: types, generationError: '' });
    try {
      const result = await f06Api.generate({ miningRunId: run.runId, types }, controller.signal);
      if (this.current(controller, scope)) this.update({ pending: false, result });
    } catch (error) {
      if (this.current(controller, scope)) this.update({ pending: false, generationError: generationErrorMessage(error) });
    }
  };
}
