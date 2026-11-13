import { CUSTOMER_STORES, rememberCustomerStore } from '../features/customer/data/customerStores';
import type { AuthUser, LoginCredentials, AuthResponse, ROLE_PERMISSIONS } from '../services/auth.api-adapter';
import type { SessionState } from '../services/authSession';
import type { SystemRole } from '../types/users';
import type { ActiveNavScreen } from '../types/mining';

export const DEMO_PERSONA_KEY = 'paspm.demo.persona.v1';
export const DEMO_ROLES: SystemRole[] = ['System Admin', 'Store Admin', 'Merchandiser', 'End-Customer'];
const unavailable = async (..._args: unknown[]) => ({ success: false, message: 'Demo Mode uses local personas. Email, credentials and account security changes are unavailable.' });

/** Deliberately independent of AuthSession: never reads real credentials or starts session coordination. */
export class DemoAuthService {
  private listeners = new Set<() => void>();
  private state: SessionState<AuthUser>;
  private revision = 0;
  private avatars: Record<string, string> = {};
  constructor(private permissions: typeof ROLE_PERMISSIONS) {
    let role: SystemRole = 'Merchandiser';
    let storeId = 1;
    try {
      const saved = JSON.parse(localStorage.getItem(DEMO_PERSONA_KEY) || 'null');
      if (saved?.version === 1 && DEMO_ROLES.includes(saved.role) && CUSTOMER_STORES.some((_, index) => index + 1 === saved.storeId)) { role = saved.role; storeId = saved.storeId;
        if (saved.avatars && typeof saved.avatars === 'object') this.avatars = Object.fromEntries(Object.entries(saved.avatars).filter(([, value]) => typeof value === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(value))) as Record<string, string>; }
    } catch { /* Disabled storage or incompatible demo schema uses deterministic defaults. */ }
    rememberCustomerStore(CUSTOMER_STORES[storeId - 1].id);
    this.state = { status: 'authenticated', user: this.user(role, storeId), expiresAt: null, attention: false, busy: false, notice: '', noticeKind: 'message' };
  }
  private user(role: SystemRole, storeId: number): AuthUser {
    const defaultScreen: ActiveNavScreen = role === 'Merchandiser' || role === 'Store Admin' ? 'merchandising-mock' : role === 'End-Customer' ? 'customer-home' : 'overview';
    return { id: `demo-${role}-${storeId}`, avatarUrl: this.avatars[`${role}-${storeId}`] ?? null, name: `Demo ${role}`, email: 'persona@demo.invalid', role, avatarText: role === 'End-Customer' ? 'CU' : role.split(' ').map(s => s[0]).join(''), storeId, ...this.permissions[role], allowedScreens:[...this.permissions[role].allowedScreens,...(role==='Merchandiser'?['merchandiser-recommendations','merchandiser-approve'] as ActiveNavScreen[]:[])], defaultScreen };
  }
  selectPersona = (role: SystemRole, storeId = this.state.user?.storeId ?? 1, remount = true) => {
    if (!DEMO_ROLES.includes(role) || !CUSTOMER_STORES.some((_, index) => index + 1 === storeId)) throw new Error('Choose a supported demo persona and store.');
    rememberCustomerStore(CUSTOMER_STORES[storeId - 1].id);
    const user = this.user(role, storeId);
    try { localStorage.setItem(DEMO_PERSONA_KEY, JSON.stringify({ version: 1, role, storeId, avatars: this.avatars })); } catch { /* In-memory demo still works. */ }
    this.state = { ...this.state, status: 'authenticated', user, notice: '' };
    if (remount) this.revision++;
    [...this.listeners].forEach(listener => listener());
    return user;
  };
  /** Shopping changes context in place: preserve the current route and open application. */
  selectCustomerStore = (fixtureId: string) => {
    const storeId = CUSTOMER_STORES.findIndex(store => store.id === fixtureId) + 1;
    if (!storeId) throw new Error('Unknown demo store.');
    if (this.state.user?.role !== 'End-Customer') return;
    if (this.state.user.storeId !== storeId) this.selectPersona('End-Customer', storeId, false);
  };
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getCurrentUser = () => this.state.user;
  getSessionId = () => `demo-${this.revision}`;
  getToken = () => 'demo-local-persona';
  isAuthenticated = () => true;
  isScreenAllowed = (user: AuthUser | null, screen: ActiveNavScreen) => !!user && user.allowedScreens.includes(screen);
  request = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const { demoRequest } = await import('../features/demo/demo.api');
    return demoRequest(input, init, { role: this.state.user!.role, storeId: this.state.user!.storeId });
  };
  restore = async () => {};
  refresh = async (..._args: unknown[]) => {};
  startActivity = () => () => {};
  dispose = () => {};
  dismissSuccessNotice = () => {};
  endLocal = (..._args: unknown[]) => {};
  logout = async (..._args: unknown[]) => ({ confirmed: true });
  updateAvatar = (_avatarUrl: string) => {};
  login = async (_credentials: LoginCredentials): Promise<AuthResponse> => ({ success: true, user: this.state.user!, redirectScreen: this.state.user!.defaultScreen });
  loginGoogle = async (_idToken: string): Promise<AuthUser> => { throw new Error('Google sign-in is unavailable in Demo Mode. Use the persona selector.'); };
  requestRegistration = unavailable;
  verifyOtp = unavailable;
  resendOtp = unavailable;
  completeRegistration = unavailable;
  activateAccount = unavailable;
  changePassword = unavailable;
  requestPasswordReset = unavailable;
  confirmPasswordReset = unavailable;
  getMe = async (): Promise<any> => { const u = this.state.user!; return { userId: u.role === 'System Admin' ? 1 : (u.storeId ?? 1) * 10 + (u.role === 'Merchandiser' ? 1 : u.role === 'End-Customer' ? 2 : 0), avatarUrl: u.avatarUrl, name: u.name, email: u.email, storeId: u.storeId, roleCode: { 'System Admin': 'SYSTEM_ADMIN', 'Store Admin': 'STORE_ADMIN', Merchandiser: 'MERCHANDISER', 'End-Customer': 'END_CUSTOMER' }[u.role], status: 'ACTIVE', emailVerified: true }; };
  uploadAvatar = async (file: File): Promise<any> => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error('Choose a PNG, JPEG or WebP image under 2 MB.');
    const avatar = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Unable to read image.')); reader.readAsDataURL(file);
    });
    const user = this.state.user!;
    this.avatars[`${user.role}-${user.storeId}`] = avatar;
    this.selectPersona(user.role, user.storeId ?? 1);
    return this.getMe();
  };
  deleteAvatar = async (): Promise<any> => {
    const user = this.state.user!;
    delete this.avatars[`${user.role}-${user.storeId}`];
    this.selectPersona(user.role, user.storeId ?? 1);
    return this.getMe();
  };
}
