/** Same-origin HTTPS (or localhost), modern browsers with Web Locks + BroadcastChannel.
 * Credentials are kept in sessionStorage so a Vite hot reload does not log the user out.
 * Web Locks serialize cookie rotation; the channel transfers credentials to waiting/new tabs.
 */
export interface TokenCredentials {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  csrfToken?: string;
}
interface Credentials extends TokenCredentials { expiresAt: number; refreshAt: number; }
interface Coordination { epoch: string; signedOut: boolean; retryAt?: number; }
export interface SessionState<U> {
  status: 'recovering' | 'authenticated' | 'anonymous' | 'offline';
  user: U | null;
  expiresAt: number | null;
  attention: boolean;
  busy: boolean;
  notice: string;
  noticeKind: 'message' | 'success';
}
export class SessionError extends Error {
  constructor(public status: number | null, message: string) { super(message); }
}
const META_KEY = 'paspm_session_coordination';
const CREDENTIALS_KEY = 'paspm_session_credentials';
export const INACTIVITY_MS = 15 * 60 * 1000;
// Opt in only on the Vite development server. Production builds replace DEV
// with false and remove the fast-popup branches, even if the flag is supplied.
const DEV_TIMEOUT_TEST = import.meta.env?.DEV === true && import.meta.env.SESSION_DEV_SERVER === true && import.meta.env.VITE_SESSION_TIMEOUT_TEST === 'true';
const DEV_INACTIVITY_MS = 30000;
const DEV_PROMPT_MS = 60000;
const LOCK_NAME = 'paspm-auth-cookie';
const CHANNEL_NAME = 'paspm-auth-session';
const freshEpoch = () => crypto.randomUUID();
// Pending logout is not an error. Older tabs may still send these UI messages;
// never retain them as persistent notices or promote them to confirmed success.
const cleanSessionNotice = (notice: string) => ['Signed out.', 'Signing out...', 'Signing out…'].includes(notice.trim()) ? '' : notice;

export class AuthSession<U> {
  private credentials: Credentials | null = null;
  private state: SessionState<U> = { status: 'recovering', user: null, expiresAt: null, attention: false, busy: false, notice: '', noticeKind: 'message' };
  private listeners = new Set<() => void>();
  private refreshPromise: Promise<void> | null = null;
  private restorePromise: Promise<void> | null = null;
  private logoutPromise: Promise<{ confirmed: boolean }> | null = null;
  private channel: BroadcastChannel | null = null;
  private epoch = '';
  private lastActivity: number;
  private lastActivitySent = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private activityCleanup: (() => void) | undefined;
  private syncWaiters = new Map<string, () => void>();

  constructor(private mapUser: (data: any) => U, private now: () => number = Date.now) {
    this.lastActivity = this.now();
    try {
      localStorage.removeItem('retailspace_auth_token');
      localStorage.removeItem('retailspace_auth_user');
      const cached = JSON.parse(sessionStorage.getItem(CREDENTIALS_KEY) || 'null');
      if (cached?.accessToken && cached?.expiresAt > this.now()) this.credentials = cached as Credentials;
      else sessionStorage.removeItem(CREDENTIALS_KEY);
    } catch { /* Storage may be disabled. */ }
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getToken = () => this.credentials?.accessToken ?? null;
  // Stable across rotation, changes on login/logout. Used to reject responses for another user.
  getSessionId = () => this.epoch;
  getCurrentUser = (): U | null => this.state.user;
  isInactive = () => this.now() - this.lastActivity >= (DEV_TIMEOUT_TEST ? DEV_INACTIVITY_MS : INACTIVITY_MS);
  private update(patch: Partial<SessionState<U>>) {
    this.state = { ...this.state, ...patch };
    // React may replace subscriptions during a synchronous render. Notify only
    // the current snapshot so newly registered listeners cannot extend this cycle.
    [...this.listeners].forEach(listener => listener());
  }
  private meta(): Coordination {
    try { return JSON.parse(localStorage.getItem(META_KEY) || 'null') || { epoch: '', signedOut: false }; }
    catch { return { epoch: this.epoch, signedOut: false }; }
  }
  private writeMeta(value: Coordination) {
    // Without shared metadata/logout fencing, fail closed instead of racing cookie rotation.
    localStorage.setItem(META_KEY, JSON.stringify(value));
  }
  private start() {
    if (this.channel || typeof window === 'undefined') return;
    if (!navigator.locks || typeof BroadcastChannel === 'undefined') throw new SessionError(null, 'Session recovery is unavailable. Use an up-to-date browser and open the app on HTTPS or localhost.');
    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.epoch = this.meta().epoch;
    this.channel.onmessage = ({ data }) => {
      const meta = this.meta();
      if (data.type === 'sync') {
        if (this.credentials && this.state.user && !meta.signedOut && this.epoch === meta.epoch) {
          this.channel?.postMessage({ type: 'credentials', request: data.request, epoch: this.epoch, credentials: this.credentials, user: this.state.user, activity: this.lastActivity });
        }
      } else if (data.type === 'credentials' && !meta.signedOut && data.epoch === meta.epoch) {
        // A delayed broadcast must never replace newer credentials or resurrect local logout.
        if (!this.credentials || data.epoch !== this.epoch || data.credentials.expiresAt > this.credentials.expiresAt) {
          this.epoch = data.epoch;
          this.credentials = data.credentials;
          this.update({ user: data.user, expiresAt: data.credentials.expiresAt, ...(data.request ? {} : { status: 'authenticated' as const, attention: false, notice: '' }) });
          this.lastActivity = Math.max(this.lastActivity, Math.min(this.now(), data.activity || 0));
          this.schedule();
        }
        if (data.request) this.syncWaiters.get(data.request)?.();
      } else if (data.type === 'signed-out' && meta.signedOut) {
        if (data.epoch && data.epoch !== meta.epoch) return;
        // A duplicate or legacy message must not replace a warning, reset a
        // current toast, or resurrect a confirmation that was already dismissed.
        if (this.state.status === 'anonymous' && (this.epoch === meta.epoch || (typeof data.notice === 'string' && !cleanSessionNotice(data.notice)))) return;
        this.epoch = meta.epoch;
        this.clearLocal(typeof data.notice === 'string' ? data.notice : 'You have been signed out in another tab.', data.noticeKind === 'success' ? 'success' : 'message');
      } else if (data.type === 'activity' && data.epoch === this.epoch) {
        this.lastActivity = Math.max(this.lastActivity, Math.min(this.now(), data.at));
        this.schedule();
      }
    };
  }
  private async lock<T>(work: () => Promise<T>): Promise<T> {
    this.start();
    if (!globalThis.navigator?.locks) throw new SessionError(null, 'Secure session coordination is unavailable. Open this app on HTTPS or localhost in a supported browser.');
    // No expiring localStorage lease: suspended tabs could outlive one and reuse a token.
    return navigator.locks.request(LOCK_NAME, work);
  }
  private async syncPeers() {
    if (!this.channel) return;
    const request = freshEpoch();
    await new Promise<void>(resolve => {
      const timer = setTimeout(() => { this.syncWaiters.delete(request); resolve(); }, 100);
      this.syncWaiters.set(request, () => { clearTimeout(timer); this.syncWaiters.delete(request); resolve(); });
      this.channel!.postMessage({ type: 'sync', request });
    });
  }
  private csrf() {
    // Cookies are authoritative when another tab has just rotated them.
    const cookies = typeof document === 'undefined' ? '' : document.cookie;
    for (const name of ['__Host-PASPM-CSRF', 'PASPM-CSRF']) {
      const value = cookies.split(';').map(c => c.trim()).find(c => c.startsWith(name + '='));
      if (value) return decodeURIComponent(value.slice(name.length + 1));
    }
    return this.credentials?.csrfToken || '';
  }
  private async raw(path: string, init: RequestInit = {}) {
    try { return await fetch(path, { ...init, credentials: 'include', cache: 'no-store', signal: init.signal ?? AbortSignal.timeout(20000) }); }
    catch { throw new SessionError(null, 'Could not reach the server. Check your connection and try again.'); }
  }
  private async tokenResponse(response: Response, startedAt: number): Promise<Credentials> {
    if (!response.ok) {
      const messages: Record<number, string> = {
        401: 'Your session has ended or your account access changed. Please sign in again.',
        403: 'Session verification failed (CSRF). Please sign in again if retrying does not help.',
        429: 'Too many session requests. Please wait before trying again.'
      };
      throw new SessionError(response.status, messages[response.status] || 'The session service is unavailable. Please try again.');
    }
    const data = await response.json().catch(() => null);
    if (!data || typeof data.accessToken !== 'string' || !data.accessToken || data.tokenType !== 'Bearer' ||
        !Number.isFinite(data.expiresIn) || data.expiresIn <= 0 ||
        (data.csrfToken !== null && data.csrfToken !== undefined && typeof data.csrfToken !== 'string')) {
      throw new SessionError(null, 'The server returned invalid session credentials. Please sign in again.');
    }
    const ttl = data.expiresIn * 1000;
    // Request start is conservative: network latency cannot extend the server's lifetime.
    return { accessToken: data.accessToken, expiresIn: data.expiresIn, tokenType: data.tokenType, csrfToken: typeof data.csrfToken === 'string' ? data.csrfToken : undefined,
      expiresAt: startedAt + ttl, refreshAt: startedAt + ttl - Math.min(60000, Math.max(5000, ttl * 0.1)) };
  }
  private async validate(credentials: Credentials): Promise<U> {
    const response = await this.raw('/api/auth/me', { headers: { Authorization: `Bearer ${credentials.accessToken}` } });
    if (!response.ok) throw new SessionError(response.status, response.status === 401 || response.status === 403 ? 'Your account session is no longer available. Please sign in again.' : 'Could not verify your account. Please try again.');
    return this.mapUser(await response.json());
  }
  private accept(credentials: Credentials, user: U, epoch: string) {
    if (this.meta().signedOut || this.meta().epoch !== epoch) throw new SessionError(401, 'Your session changed. Please sign in again.');
    this.credentials = credentials;
    try { sessionStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials)); } catch { /* Storage may be disabled. */ }
    this.epoch = epoch;
    this.update({ status: 'authenticated', user, expiresAt: credentials.expiresAt, notice: '', attention: false });
    this.channel?.postMessage({ type: 'credentials', epoch, credentials, user, activity: this.lastActivity });
    this.schedule();
  }
  async authenticate(path: '/api/auth/login' | '/api/auth/google', body: unknown): Promise<U> {
    this.dismissSuccessNotice();
    return this.lock(async () => {
      const before = this.meta().epoch;
      const startedAt = this.now();
      const response = await this.raw(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new SessionError(response.status, data.error || (response.status === 429 ? 'Too many sign-in requests. Please wait and try again.' : 'Sign-in failed. Check your credentials and account status.'));
      }
      const credentials = await this.tokenResponse(response, startedAt);
      const user = await this.validate(credentials);
      if (this.meta().epoch !== before) throw new SessionError(401, 'Sign-in was cancelled because the session changed.');
      const epoch = freshEpoch();
      this.writeMeta({ epoch, signedOut: false });
      this.lastActivity = this.now();
      this.accept(credentials, user, epoch);
      return user;
    });
  }
  restore = (): Promise<void> => {
    if (this.restorePromise) return this.restorePromise;
    this.update({ status: 'recovering', notice: '' });
    let attemptEpoch = this.meta().epoch;
    this.restorePromise = this.lock(async () => {
      const meta = this.meta();
      if (meta.signedOut) { this.clearLocal(this.state.notice, this.state.noticeKind); return; }
      if (!meta.epoch) this.writeMeta({ epoch: freshEpoch(), signedOut: false });
      this.epoch = this.meta().epoch;
      attemptEpoch = this.epoch;
      await this.syncPeers();
      if (this.credentials && this.credentials.expiresAt > this.now()) {
        const user = await this.validate(this.credentials);
        this.accept(this.credentials, user, this.epoch);
      } else if (this.csrf()) {
        await this.rotate(this.epoch);
      } else this.clearLocal('');
    }).catch(error => {
      if (this.meta().epoch !== attemptEpoch || this.meta().signedOut) return;
      if (error instanceof SessionError && (error.status === 401 || error.status === 403)) this.endLocal(error.message);
      else this.update({ status: 'offline', user: null, notice: this.message(error) });
    }).finally(() => { this.restorePromise = null; });
    return this.restorePromise;
  };
  private message(error: unknown) { return error instanceof Error ? error.message : 'Unable to verify the session. Please try again.'; }
  private async rotate(epoch: string) {
    const meta = this.meta();
    if (meta.signedOut || meta.epoch !== epoch) throw new SessionError(401, 'Your session changed. Please sign in again.');
    if ((meta.retryAt || 0) > this.now()) throw new SessionError(429, 'Please wait before retrying session recovery.');
    const startedAt = this.now();
    try {
      const response = await this.raw('/api/auth/refresh', { method: 'POST', headers: { 'X-CSRF-Token': this.csrf() } });
      const credentials = await this.tokenResponse(response, startedAt);
      const user = await this.validate(credentials);
      this.accept(credentials, user, epoch);
    } catch (error) {
      if (this.meta().epoch === epoch && !this.meta().signedOut) this.writeMeta({ ...meta, retryAt: this.now() + (error instanceof SessionError && error.status === 429 ? 15 * 60000 : 30000) });
      throw error;
    }
  }
  refresh = (explicit = false, rejectedToken?: string): Promise<void> => {
    if (this.refreshPromise) return this.refreshPromise;
    if (!explicit && this.state.attention) return Promise.reject(new SessionError(401, 'Confirm Stay signed in to continue.'));
    const epoch = this.epoch;
    const originalToken = rejectedToken ?? this.getToken();
    if (explicit) this.lastActivity = this.now();
    this.update({ busy: true });
    this.refreshPromise = this.lock(async () => {
      if (this.meta().signedOut || this.meta().epoch !== epoch) throw new SessionError(401, 'Your session changed.');
      await this.syncPeers();
      if (this.getToken() !== originalToken && this.credentials && this.credentials.refreshAt > this.now()) {
        const user = await this.validate(this.credentials);
        this.accept(this.credentials, user, epoch);
      } else await this.rotate(epoch);
      if (explicit) this.lastActivity = this.now();
    }).catch(error => {
      if (this.meta().epoch === epoch && !this.meta().signedOut) {
        if (error instanceof SessionError && error.status === 401) this.endLocal(error.message);
        else this.update({ attention: true, notice: this.message(error) });
      }
      throw error;
    }).finally(() => { this.refreshPromise = null; this.update({ busy: false }); this.schedule(); });
    return this.refreshPromise;
  };
  private clearLocal(notice: string, noticeKind: SessionState<U>['noticeKind'] = 'message') {
    notice = cleanSessionNotice(notice);
    this.credentials = null;
    try { sessionStorage.removeItem(CREDENTIALS_KEY); } catch { /* Storage may be disabled. */ }
    clearTimeout(this.timer);
    this.update({ status: 'anonymous', user: null, expiresAt: null, attention: false, busy: false, notice, noticeKind });
  }
  dismissSuccessNotice = () => {
    if (this.state.noticeKind === 'success') this.update({ notice: '', noticeKind: 'message' });
  };
  endLocal = (notice = '', noticeKind: SessionState<U>['noticeKind'] = 'message') => {
    notice = cleanSessionNotice(notice);
    this.epoch = freshEpoch();
    try { this.writeMeta({ epoch: this.epoch, signedOut: true }); } catch { /* Still clear memory. */ }
    this.clearLocal(notice, noticeKind);
    this.channel?.postMessage({ type: 'signed-out', epoch: this.epoch, notice, noticeKind });
  };
  updateAvatar = (avatarUrl: string) => {
    if (this.state.user) this.update({ user: { ...this.state.user, avatarUrl } });
  };
  logout = (all = false): Promise<{ confirmed: boolean }> => {
    if (this.logoutPromise) return this.logoutPromise;
    let credentials = this.credentials;
    // Fence pending refresh immediately, including across tabs and future page reloads.
    this.endLocal();
    const epoch = this.epoch;
    this.logoutPromise = this.lock(async () => {
      if (!credentials) throw new SessionError(401, 'No access credentials are available.');
      // Logout is never intercepted/replayed. Renew beforehand only if its Bearer has expired.
      if (credentials.expiresAt <= this.now()) {
        const startedAt = this.now();
        credentials = await this.tokenResponse(await this.raw('/api/auth/refresh', { method: 'POST', headers: { 'X-CSRF-Token': this.csrf() } }), startedAt);
      }
      const response = await this.raw(all ? '/api/auth/logout-all' : '/api/auth/logout', {
        method: 'POST', headers: { Authorization: `Bearer ${credentials.accessToken}`, 'X-CSRF-Token': this.csrf() || credentials.csrfToken }
      });
      if (!response.ok) throw new SessionError(response.status, 'Server revocation was not confirmed.');
      if (this.meta().epoch === epoch) this.endLocal(all ? 'Signed out from all devices.' : 'Signed out successfully.', 'success');
      return { confirmed: true };
    }).catch(() => {
      if (this.meta().epoch === epoch) this.endLocal('Signed out locally. Server-side revocation was not confirmed; the server session may remain active until revoked or expired.');
      return { confirmed: false };
    }).finally(() => { this.logoutPromise = null; });
    return this.logoutPromise;
  };
  /** Preserve Response semantics and caller-specific parsing. Never replay any write. */
  request = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const signal = init.signal ?? (input instanceof Request ? input.signal : undefined);
    signal?.throwIfAborted();
    const url = new URL(input instanceof Request ? input.url : String(input), typeof location === 'undefined' ? 'http://localhost' : location.origin);
    const origin = typeof location === 'undefined' ? 'http://localhost' : location.origin;
    const excluded = /^\/api\/auth\/(login|google$|refresh|logout(?:-all)?$|register|otp|activate|password-reset)/.test(url.pathname);
    if (url.origin !== origin || !url.pathname.startsWith('/api/') || excluded) return fetch(input, init);
    const epoch = this.epoch;
    if (this.credentials && this.credentials.expiresAt <= this.now()) {
      this.checkActivity();
      if (!this.state.attention) {
        try { await this.refresh(); } catch (error) {
          return Response.json({ error: this.state.notice || 'Session recovery is required.' }, { status: error instanceof SessionError ? error.status || 503 : 503 });
        }
      } else return Response.json({ error: 'Please confirm Stay signed in before continuing.' }, { status: 401 });
    }
    if (epoch !== this.epoch) return Response.json({ error: 'The active session changed. Please reload before continuing.' }, { status: 401 });
    const token = this.getToken();
    const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined));
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const options = { ...init, headers, credentials: 'include' as RequestCredentials };
    signal?.throwIfAborted();
    const response = await fetch(input, options);
    const method = (init.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const expiryFailure = response.status === 401 && token && (
      (this.credentials?.expiresAt ?? Infinity) <= this.now() ||
      /error="invalid_token"/i.test(response.headers.get('WWW-Authenticate') || '')
    );
    if (!expiryFailure || epoch !== this.epoch || this.state.attention) return response;
    try { await this.refresh(false, token); } catch { return response; }
    // Even a 401 on a write may be emitted after side effects by a proxy/service: no replay.
    if (!['GET', 'HEAD'].includes(method)) return response;
    signal?.throwIfAborted();
    if (epoch !== this.epoch) return response;
    headers.set('Authorization', `Bearer ${this.getToken()}`);
    const retried = await fetch(input, { ...options, headers });
    if (retried.status === 401 && epoch === this.epoch) this.endLocal('Your account session is no longer available. Please sign in again.');
    return retried;
  };
  checkActivity = () => {
    if (!this.credentials || this.state.status !== 'authenticated' || this.state.attention || this.state.busy) return;
    if (DEV_TIMEOUT_TEST && this.isInactive()) {
      // Exercise the production dialog/actions without inventing a token expiry.
      if (this.now() - this.lastActivity >= DEV_PROMPT_MS) this.update({ attention: true, notice: '' });
      return;
    }
    if (this.now() < this.credentials.refreshAt) return;
    if (this.isInactive()) this.update({ attention: true, notice: '' });
    else if (typeof document === 'undefined' || document.visibilityState === 'visible') void this.refresh().catch(() => {});
  };
  private schedule() {
    clearTimeout(this.timer);
    if (!this.activityCleanup || !this.credentials || this.state.attention || this.state.status !== 'authenticated') return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    const deadline = DEV_TIMEOUT_TEST
      ? (this.isInactive() ? this.lastActivity + DEV_PROMPT_MS : Math.min(this.credentials.refreshAt, this.lastActivity + DEV_INACTIVITY_MS))
      : this.credentials.refreshAt;
    this.timer = setTimeout(() => { this.checkActivity(); this.schedule(); }, Math.min(30000, Math.max(1000, deadline - this.now())));
  }
  startActivity = () => {
    this.activityCleanup?.();
    const activity = () => {
      // Evaluate sleep/wake inactivity BEFORE accepting new input; an open prompt is sticky.
      this.checkActivity();
      if (this.state.attention || this.now() - this.lastActivity < 1000) return;
      this.lastActivity = this.now();
      if (this.lastActivity - this.lastActivitySent >= (DEV_TIMEOUT_TEST ? 1000 : 10000)) {
        this.lastActivitySent = this.lastActivity;
        this.channel?.postMessage({ type: 'activity', epoch: this.epoch, at: this.lastActivity });
      }
      this.schedule();
    };
    const wake = () => {
      if (this.state.status !== 'authenticated') return;
      const meta = this.meta();
      // The storage fence can arrive before the logout result broadcast. Clear
      // access silently; the eventual result owns its success/error notification.
      if (meta.signedOut) { this.clearLocal(''); return; }
      if (meta.epoch !== this.epoch) { this.clearLocal('Your session changed in another tab. Please sign in again.'); return; }
      this.checkActivity(); this.schedule();
    };
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];
    events.forEach(event => window.addEventListener(event, activity, { passive: true }));
    window.addEventListener('focus', wake);
    window.addEventListener('pageshow', wake);
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('storage', wake);
    this.activityCleanup = () => {
      clearTimeout(this.timer);
      events.forEach(event => window.removeEventListener(event, activity));
      window.removeEventListener('focus', wake); window.removeEventListener('pageshow', wake);
      document.removeEventListener('visibilitychange', wake); window.removeEventListener('storage', wake);
      this.activityCleanup = undefined;
    };
    this.schedule();
    return this.activityCleanup;
  };
  dispose() {
    this.activityCleanup?.();
    this.channel?.close(); this.channel = null;
    this.listeners.clear();
  }
}
