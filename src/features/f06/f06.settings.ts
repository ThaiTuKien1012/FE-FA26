import { authService, type AuthUser } from '../../services/authService';
import { f06Api, F06ApiError } from './f06.api';
import { readRecommendationProductNames, recommendationReadError } from './f06.browse';
import type { RecExpiryPage, RecPolicy, RecPolicyRequest } from './f06.types';
import { INT32_MAX, recommendationInteger, validatePolicy } from './f06.validation';

type Role = AuthUser['role'] | null;
const role = (): Role => authService.getCurrentUser()?.role ?? null;
const scope = () => { const user = authService.getCurrentUser(); return JSON.stringify([authService.getSessionId() || authService.getToken(), user?.id, user?.role, user?.storeId]); };

/** Local state only; every request and optional label is scoped to this mount,
 * user, Store and session. Never persists credentials or replays writes.
 */
abstract class ScopedF06<S extends { role: Role }> {
  protected state: S;
  private key = scope();
  private active = false;
  private unsubscribe: (() => void) | null = null;
  private jobs = new Map<string, AbortController>();
  private listeners = new Set<() => void>();
  constructor(private initial: () => S) { this.state = initial(); }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  protected update(patch: Partial<S>) { this.state = { ...this.state, ...patch }; [...this.listeners].forEach(listener => listener()); }
  protected allowed() { return this.active && this.key === scope() && !!authService.getToken() && (this.state.role === 'Merchandiser' || this.state.role === 'Store Admin'); }
  protected abort(...keys: string[]) { keys.forEach(key => this.jobs.get(key)?.abort()); }
  protected job(name: string) {
    this.abort(name); const controller = new AbortController(), key = this.key; this.jobs.set(name, controller);
    return { signal: controller.signal, current: () => this.allowed() && key === this.key && !controller.signal.aborted };
  }
  protected resetExtra() {}
  private reset() { this.jobs.forEach(job => job.abort()); this.key = scope(); this.resetExtra(); this.state = this.initial(); this.update({}); }
  protected abstract load(): Promise<void>;
  start = () => {
    if (this.active) return;
    this.active = true; this.reset();
    this.unsubscribe = authService.subscribe(() => { if (scope() !== this.key) { this.reset(); if (this.allowed()) void this.load(); } });
    if (this.allowed()) void this.load();
  };
  stop = () => { this.active = false; this.jobs.forEach(job => job.abort()); this.resetExtra(); this.unsubscribe?.(); this.unsubscribe = null; };
}

export interface RuleInputs { maxBundleSize: string; minSupportCount: string; supportPercent: string; confidencePercent: string; minimumSellableQuantity: string; }
/** Percentage input is shifted as decimal text before producing a JSON number.
 * 12.3456% becomes 0.123456, without binary multiplication/division or rounding.
 */
export function parseRulePercentage(input: string, name: string): number {
  const text = input.trim();
  if (!/^\d+(?:\.\d+)?$/.test(text)) throw new F06ApiError(400, `${name}: enter a percentage from 0 to 100 using a decimal point.`);
  const [wholeText, fraction = ''] = text.split('.');
  const whole = wholeText.replace(/^0+/, '') || '0';
  if (whole.length > 3 || BigInt(whole) > 100n || BigInt(whole) === 100n && /[1-9]/.test(fraction)) throw new F06ApiError(400, `${name} must be between 0% and 100%.`);
  const padded = whole.padStart(3, '0');
  const tail = (padded.slice(-2) + fraction).replace(/0+$/, '');
  if (tail.length > 6) throw new F06ApiError(400, `${name} supports at most four percentage decimal places (six in the backend ratio). No rounding was applied.`);
  return Number(`${padded.slice(0, -2)}${tail ? '.' + tail : ''}`);
}
function ratioPercent(value: number) {
  const [whole, fraction = ''] = String(value).split('.');
  const integer = String(BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2)));
  const tail = fraction.slice(2).replace(/0+$/, ''); return integer + (tail ? '.' + tail : '');
}
export function ruleInputs(policy: RecPolicy): RuleInputs {
  validatePolicy({ expectedVersion: policy.version, maxBundleSize: policy.maxBundleSize, minSupportCount: policy.minSupportCount,
    minSupportRatio: policy.minSupportRatio, minConfidence: policy.minConfidence, minimumSellableQuantity: policy.minimumSellableQuantity });
  return { maxBundleSize: String(policy.maxBundleSize), minSupportCount: String(policy.minSupportCount), supportPercent: ratioPercent(policy.minSupportRatio), confidencePercent: ratioPercent(policy.minConfidence), minimumSellableQuantity: String(policy.minimumSellableQuantity) };
}
function integerInput(input: string, name: string) {
  if (!/^[1-9]\d*$/.test(input.trim())) throw new F06ApiError(400, `${name} must be a positive whole number.`);
  return Number(input.trim());
}
export function parseRuleInputs(inputs: RuleInputs, expectedVersion: number): RecPolicyRequest {
  const request = { expectedVersion, maxBundleSize: integerInput(inputs.maxBundleSize, 'Maximum bundle size'), minSupportCount: integerInput(inputs.minSupportCount, 'Minimum support count'),
    minSupportRatio: parseRulePercentage(inputs.supportPercent, 'Minimum frequency'), minConfidence: parseRulePercentage(inputs.confidencePercent, 'Cross-sell confidence'),
    minimumSellableQuantity: integerInput(inputs.minimumSellableQuantity, 'Minimum sellable quantity') };
  validatePolicy(request); return request;
}
export interface RulesState { role: Role; policy: RecPolicy | null; draft: RuleInputs | null; latest: RecPolicy | null; loading: boolean; saving: boolean; needsReload: boolean; error: string; notice: string; }
const initialRules = (): RulesState => ({ role: role(), policy: null, draft: null, latest: null, loading: false, saving: false, needsReload: false, error: '', notice: '' });
export class RecommendationRules extends ScopedF06<RulesState> {
  constructor() { super(initialRules); }
  protected load = () => this.refresh();
  refresh = async () => {
    if (!this.allowed() || this.state.saving) return;
    const job = this.job('rules'); this.update({ loading: true });
    try {
      const policy = await f06Api.getConfig(job.signal); const draft = ruleInputs(policy);
      if (!job.current()) return;
      if (this.state.draft && this.state.policy) {
        const changed = policy.version !== this.state.policy.version || this.state.needsReload;
        this.update({ loading: false, latest: changed ? policy : null, needsReload: changed });
      } else this.update({ policy, draft, loading: false, needsReload: false, error: '' });
    } catch (error) { if (job.current()) this.update({ loading: false, error: recommendationReadError(error) }); }
  };
  edit = (field: keyof RuleInputs, value: string) => {
    if (!this.allowed() || this.state.role !== 'Store Admin' || !this.state.draft || this.state.saving) return;
    this.update({ draft: { ...this.state.draft, [field]: value }, notice: '' });
  };
  acceptLatest = (keepEdits: boolean) => {
    if (!this.allowed() || this.state.role !== 'Store Admin' || this.state.saving || !this.state.latest) return;
    this.update({ policy: this.state.latest, draft: keepEdits ? this.state.draft : ruleInputs(this.state.latest), latest: null, needsReload: false, error: '', notice: 'Current rules loaded. Review the form before choosing Save Changes.' });
  };
  save = async () => {
    if (!this.allowed() || this.state.role !== 'Store Admin' || this.state.saving || this.state.loading || this.state.needsReload || this.state.latest || !this.state.policy || !this.state.draft) return;
    let request: RecPolicyRequest;
    try { request = parseRuleInputs(this.state.draft, this.state.policy.version); }
    catch (error) { this.update({ error: recommendationReadError(error), notice: '' }); return; }
    const job = this.job('save'); this.update({ saving: true, error: '', notice: '' });
    try {
      const policy = await f06Api.updateConfig(request, job.signal); const draft = ruleInputs(policy);
      if (job.current()) this.update({ policy, draft, latest: null, saving: false, notice: 'Store rules saved successfully.', needsReload: false });
    } catch (error) {
      if (!job.current()) return;
      const reconcile = !(error instanceof F06ApiError) || error.status === null || error.status === 409 || error.status === 200 || error.status >= 500;
      this.update({ saving: false, needsReload: reconcile, error: `${recommendationReadError(error)}${reconcile ? ' Save was not confirmed. Your edits are retained. Compare the current rules below before saving again; no automatic retry was made.' : ''}` });
      if (reconcile) await this.refresh();
    }
  };
}

export interface ExpiryState { role: Role; productId?: number; page: number; pageSize: number; data: RecExpiryPage | null; loading: boolean; error: string; names: Record<number, string>; }
const initialExpiry = (): ExpiryState => ({ role: role(), page: 0, pageSize: 20, data: null, loading: false, error: '', names: {} });
export class RecommendationExpiry extends ScopedF06<ExpiryState> {
  private nameCache = new Map<number, string | null>();
  constructor() { super(initialExpiry); }
  protected resetExtra() { this.nameCache?.clear(); }
  protected load = () => this.refresh();
  applyFilter = async (productId?: number, pageSize = 20) => {
    if (!this.allowed()) return;
    try { if (productId !== undefined) recommendationInteger(productId, 'productId', 1, INT32_MAX); recommendationInteger(pageSize, 'pageSize', 1, 100); }
    catch (error) { this.update({ error: recommendationReadError(error) }); return; }
    this.update({ productId, pageSize, page: 0 }); await this.refresh();
  };
  setPage = async (page: number) => {
    if (!this.allowed()) return;
    try { recommendationInteger(page, 'page', 0, INT32_MAX); } catch { return; }
    this.update({ page }); await this.refresh();
  };
  refresh = async () => {
    if (!this.allowed()) return;
    this.abort('names'); const job = this.job('expiry');
    const { productId, page, pageSize } = this.state;
    this.update({ loading: true, data: null, names: {}, error: '' });
    try {
      const data = await f06Api.listExpiryPush({ ...(productId === undefined ? {} : { productId }), page, pageSize }, job.signal);
      if (!job.current()) return;
      const last = Math.max(0, Math.ceil(data.totalElements / data.pageSize) - 1);
      if (data.page > last) { this.update({ page: last }); await this.refresh(); return; }
      this.update({ data, loading: false });
      const namesJob = this.job('names');
      const names = await readRecommendationProductNames(data.items.map(item => item.productId), namesJob.signal, this.nameCache);
      if (namesJob.current()) this.update({ names });
    } catch (error) { if (job.current()) this.update({ loading: false, error: recommendationReadError(error) }); }
  };
}
