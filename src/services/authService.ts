import { AuthSession, SessionError } from './authSession';
import { SystemRole } from '../types/users';
import { ActiveNavScreen } from '../types/mining';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  avatarText: string;
  storeId?: number | null;
  avatarUrl?: string | null;
  department: string;
  defaultScreen: ActiveNavScreen;
  allowedScreens: ActiveNavScreen[];
}

export interface LoginCredentials {
  email: string;
  password?: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password?: string;
  roleKey: 'store-admin' | 'system-admin' | 'merchandiser' | 'customer';
  phone?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
  redirectScreen?: ActiveNavScreen;
}

export const ROLE_PERMISSIONS: Record<SystemRole, { department: string; defaultScreen: ActiveNavScreen; allowedScreens: ActiveNavScreen[] }> = {
  'Store Admin': {
    department: 'Store Operations & Inventory',
    defaultScreen: 'store-inventory',
    allowedScreens: [
      'store-inventory',
      'store-edit-product',
      'store-categories',
      'store-batches',
      'f04-import-transactions',
      'f04-import-history',
      'f04-transactions',
      'f03-utility',
      'f03-configuration', 'f03-product-scores', 'f03-snapshots',
      'f05-mining',
      'f06-recommendations',
      'profile'
    ]
  },
  'System Admin': {
    department: 'Platform Administration & System Engineering',
    defaultScreen: 'overview',
    allowedScreens: [
      'overview',
      'setup',
      'results',
      'failure',
      'benchmark',
      'f05-mining',
      'users',
      'admin-run-mining',
      'admin-mining-history',
      'lambda-policy',
      'profile'
    ]
  },
  'Merchandiser': {
    department: 'Retail Merchandising Planner',
    defaultScreen: 'merchandiser-recommendations',
    allowedScreens: [
      'f04-import-history',
      'f04-transactions',
      'f03-configuration',
      'f03-product-scores',
      'f03-preview',
      'f03-utility',
      'f03-configuration', 'f03-product-scores', 'f03-preview', 'f03-snapshots', 'f03-snapshot-detail', 'f03-snapshot-matrix',
      'f05-mining',
      'f06-recommendations',
      'profile'
    ]
  },
  'End-Customer': {
    department: 'Retail Loyalty Customer',
    defaultScreen: 'customer-storefront',
    allowedScreens: [
      'customer-storefront',
      'profile'
    ]
  }
};

export interface ScreenOwnerInfo {
  primaryRole: SystemRole;
  roleKey: 'store-admin' | 'system-admin' | 'merchandiser' | 'customer';
  title: string;
  allowedRoles: SystemRole[];
}

export const SCREEN_OWNER_MAP: Partial<Record<ActiveNavScreen, ScreenOwnerInfo>> = {
  'f06-recommendations': {
    primaryRole: 'Merchandiser',
    roleKey: 'merchandiser',
    title: 'Recommendations',
    allowedRoles: ['Merchandiser', 'Store Admin']
  },
  // Store Admin Core Modules
  'store-inventory': {
    primaryRole: 'Store Admin',
    roleKey: 'store-admin',
    title: 'Product Management',
    allowedRoles: ['Store Admin']
  },
  'store-edit-product': {
    primaryRole: 'Store Admin',
    roleKey: 'store-admin',
    title: 'Edit Product Details',
    allowedRoles: ['Store Admin']
  },
  'store-categories': {
    primaryRole: 'Store Admin',
    roleKey: 'store-admin',
    title: 'Category Management',
    allowedRoles: ['Store Admin']
  },
  'store-batches': {
    primaryRole: 'Store Admin',
    roleKey: 'store-admin',
    title: 'Inventory Batches',
    allowedRoles: ['Store Admin']
  },
  'f04-import-transactions': {
    primaryRole: 'Store Admin',
    roleKey: 'store-admin',
    title: 'Import Transactions',
    allowedRoles: ['Store Admin']
  },
  'f04-import-history': {
    primaryRole: 'Store Admin',
    roleKey: 'store-admin',
    title: 'Import History',
    allowedRoles: ['Store Admin', 'Merchandiser']
  },
  'f04-transactions': {
    primaryRole: 'Store Admin',
    roleKey: 'store-admin',
    title: 'Sales Transactions',
    allowedRoles: ['Store Admin', 'Merchandiser']
  },

  // Merchandiser Modules (Recommendations & Approval Review)
  'merchandiser-recommendations': {
    primaryRole: 'Merchandiser',
    roleKey: 'merchandiser',
    title: 'Recommendations Dashboard',
    allowedRoles: ['Merchandiser']
  },
  'merchandiser-approve': {
    primaryRole: 'Merchandiser',
    roleKey: 'merchandiser',
    title: 'Review & Approve Product Group',
    allowedRoles: ['Merchandiser']
  },
  'merchandiser-campaign-draft': {
    primaryRole: 'Merchandiser',
    roleKey: 'merchandiser',
    title: 'Campaign Draft & Publish',
    allowedRoles: ['Merchandiser']
  },
  'merchandiser-campaign-status': {
    primaryRole: 'Merchandiser',
    roleKey: 'merchandiser',
    title: 'Published / Waiting Campaign Status',
    allowedRoles: ['Merchandiser']
  },
  'merchandiser-utility-profile': {
    primaryRole: 'Merchandiser',
    roleKey: 'merchandiser',
    title: 'Utility Profile & Priority Weights',
    allowedRoles: ['Merchandiser']
  },
  'merchandiser-refine-criteria': {
    primaryRole: 'Merchandiser',
    roleKey: 'merchandiser',
    title: 'Rework / Refine Criteria',
    allowedRoles: ['Merchandiser']
  },
  'merchandiser-ab-simulation': {
    primaryRole: 'Merchandiser',
    roleKey: 'merchandiser',
    title: 'A/B Simulation Setup',
    allowedRoles: ['Merchandiser']
  },
  'merchandiser-compare-simulation': {
    primaryRole: 'Merchandiser',
    roleKey: 'merchandiser',
    title: 'Compare A/B Simulation',
    allowedRoles: ['Merchandiser']
  },
  'merchandiser-keep-layout-a': {
    primaryRole: 'Merchandiser',
    roleKey: 'merchandiser',
    title: 'Keep Layout A Review',
    allowedRoles: ['Merchandiser']
  },

  // F03 Utility Profiling screens
  'f03-utility': { primaryRole: 'Merchandiser', roleKey: 'merchandiser', title: 'Utility Planner', allowedRoles: ['Store Admin', 'Merchandiser'] },
  'f03-expiry-window': { primaryRole: 'Store Admin', roleKey: 'store-admin', title: 'Expiry Window', allowedRoles: ['Store Admin'] },
  'f03-configuration': { primaryRole: 'Merchandiser', roleKey: 'merchandiser', title: 'Utility Configuration', allowedRoles: ['Store Admin', 'Merchandiser'] },
  'f03-product-scores': { primaryRole: 'Merchandiser', roleKey: 'merchandiser', title: 'Product Priority Scores', allowedRoles: ['Store Admin', 'Merchandiser'] },
  'f03-preview': { primaryRole: 'Merchandiser', roleKey: 'merchandiser', title: 'Utility Preview', allowedRoles: ['Merchandiser'] },
  'f03-snapshots': { primaryRole: 'Merchandiser', roleKey: 'merchandiser', title: 'Utility Snapshots', allowedRoles: ['Store Admin', 'Merchandiser'] },
  'f03-snapshot-detail': { primaryRole: 'Merchandiser', roleKey: 'merchandiser', title: 'Snapshot Detail', allowedRoles: ['Merchandiser'] },
  'f03-snapshot-matrix': { primaryRole: 'Merchandiser', roleKey: 'merchandiser', title: 'Snapshot Matrix', allowedRoles: ['Merchandiser'] },

  // F05 uses administrative writes and Store-scoped read-only access.
  'f05-mining': {
    primaryRole: 'System Admin',
    roleKey: 'system-admin',
    title: 'High Utility Mining',
    allowedRoles: ['System Admin', 'Merchandiser', 'Store Admin']
  },

  // System Admin Core Modules
  'admin-run-mining': { primaryRole: 'System Admin', roleKey: 'system-admin', title: 'Run Mining', allowedRoles: ['System Admin'] },
  'admin-mining-history': { primaryRole: 'System Admin', roleKey: 'system-admin', title: 'Mining History', allowedRoles: ['System Admin'] },
  'lambda-policy': { primaryRole: 'System Admin', roleKey: 'system-admin', title: 'Lambda Policy', allowedRoles: ['System Admin'] },
  'overview': {
    primaryRole: 'System Admin',
    roleKey: 'system-admin',
    title: 'Dashboard',
    allowedRoles: ['System Admin']
  },
  'setup': {
    primaryRole: 'System Admin',
    roleKey: 'system-admin',
    title: 'Algorithm Configuration',
    allowedRoles: ['System Admin']
  },
  'results': {
    primaryRole: 'System Admin',
    roleKey: 'system-admin',
    title: 'Mining Run Results',
    allowedRoles: ['System Admin']
  },
  'failure': {
    primaryRole: 'System Admin',
    roleKey: 'system-admin',
    title: 'Mining Run Failure & Diagnostics',
    allowedRoles: ['System Admin']
  },
  'benchmark': {
    primaryRole: 'System Admin',
    roleKey: 'system-admin',
    title: 'HUI-Miner vs EFIM Benchmark',
    allowedRoles: ['System Admin']
  },
  'users': {
    primaryRole: 'System Admin',
    roleKey: 'system-admin',
    title: 'Accounts & Roles (RBAC)',
    allowedRoles: ['System Admin']
  },

  // Customer Module
  'customer-storefront': {
    primaryRole: 'End-Customer',
    roleKey: 'customer',
    title: 'Storefront Self-Service Kiosk',
    allowedRoles: ['End-Customer']
  },

  // Public / Authentication
  'login': {
    primaryRole: 'Store Admin',
    roleKey: 'store-admin',
    title: 'User Authentication',
    allowedRoles: ['Store Admin', 'System Admin', 'Merchandiser', 'End-Customer']
  },
  'forgot-password': {
    primaryRole: 'Store Admin',
    roleKey: 'store-admin',
    title: 'Password Recovery',
    allowedRoles: ['Store Admin', 'System Admin', 'Merchandiser', 'End-Customer']
  },
  'register': {
    primaryRole: 'Store Admin',
    roleKey: 'store-admin',
    title: 'User Registration',
    allowedRoles: ['Store Admin', 'System Admin', 'Merchandiser', 'End-Customer']
  },
  'activate': {
    primaryRole: 'Store Admin',
    roleKey: 'store-admin',
    title: 'Account Activation',
    allowedRoles: ['Store Admin', 'System Admin', 'Merchandiser', 'End-Customer']
  },
  'profile': {
    primaryRole: 'System Admin',
    roleKey: 'system-admin',
    title: 'Account Profile & Security',
    allowedRoles: ['Store Admin', 'System Admin', 'Merchandiser', 'End-Customer']
  }
};

export function mapAuthUser(me: any): AuthUser {
  const roles: Record<string, SystemRole> = { SYSTEM_ADMIN: 'System Admin', STORE_ADMIN: 'Store Admin', MERCHANDISER: 'Merchandiser', END_CUSTOMER: 'End-Customer' };
  const role = roles[me?.roleCode];
  if (!role || me.status !== 'ACTIVE' || !me.emailVerified || !Number.isInteger(me.userId) || typeof me.email !== 'string') {
    throw new SessionError(401, 'Your account is unavailable or its role is unsupported. Please sign in again.');
  }
  const permissions = ROLE_PERMISSIONS[role];
  return { id: `usr-${me.userId}`, name: me.name || me.email, email: me.email, role,
    avatarText: (me.name || me.email).trim().split(/\s+/).map((part: string) => part[0]).join('').slice(0, 2).toUpperCase(),
    avatarUrl: me.avatarUrl, storeId: me.storeId, ...permissions,
    defaultScreen: role === 'Merchandiser' ? 'f03-configuration' : permissions.defaultScreen };
}

class AuthService extends AuthSession<AuthUser> {
  constructor() { super(mapAuthUser); }
  public isAuthenticated(): boolean { return this.getSnapshot().status === 'authenticated' && this.getCurrentUser() !== null; }
  public isScreenAllowed(user: AuthUser | null, screen: ActiveNavScreen): boolean {
    return !!user && !!ROLE_PERMISSIONS[user.role]?.allowedScreens.includes(screen);
  }
  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const user = await this.authenticate('/api/auth/login', { email: credentials.email.trim(), password: credentials.password || '' });
      return { success: true, user, redirectScreen: user.defaultScreen };
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Unable to sign in.' }; }
  }
  public async loginGoogle(idToken: string): Promise<AuthUser> {
    return this.authenticate('/api/auth/google', { idToken });
  }

  /**
   * Request OTP for registration (Backend: POST /api/auth/register)
   */
  public async requestRegistration(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 202 || res.ok) {
        const message = data.message === 'If the account is eligible, a verification email will be sent'
          ? 'If eligible, a verification code will be sent to your email.'
          : data.message;
        return { success: true, message: message || 'A verification code has been sent to your email.' };
      }
      return { success: false, message: data.error || 'Registration request failed.' };
    } catch {
      return { success: false, message: 'Unable to connect to the Backend server.' };
    }
  }

  /**
   * Verify OTP (Backend: POST /api/auth/otp/verify)
   */
  public async verifyOtp(email: string, otp: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { success: true, message: data.message || 'OTP verified successfully.' };
      }
      return { success: false, message: data.error || 'The OTP is invalid or has expired.' };
    } catch {
      return { success: false, message: 'Unable to connect to the Backend server.' };
    }
  }

  /**
   * Resend OTP (Backend: POST /api/auth/otp/resend)
   */
  public async resendOtp(email: string, purpose: 'SELF_REGISTER' | 'ADMIN_INVITE' = 'SELF_REGISTER'): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/auth/otp/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), purpose })
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 202 || res.ok) {
        const message = data.message === 'If the account is eligible, a verification email will be sent'
          ? 'If eligible, a new verification code will be sent to your email.'
          : data.message;
        return { success: true, message: message || 'A new OTP has been sent.' };
      }
      return { success: false, message: data.error || 'Please wait before requesting another OTP.' };
    } catch {
      return { success: false, message: 'Unable to connect to the Backend server.' };
    }
  }

  /**
   * Complete registration (Backend: POST /api/auth/register/complete)
   */
  public async completeRegistration(payload: { email: string; name: string; password: string }): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/auth/register/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload.email.trim().toLowerCase(),
          name: payload.name.trim(),
          password: payload.password
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { success: true, message: data.message || 'Account registration completed successfully.' };
      }
      return { success: false, message: data.error || 'Registration could not be completed. Please check your password.' };
    } catch {
      return { success: false, message: 'Unable to connect to the Backend server.' };
    }
  }

  /**
   * Activate invited account (Backend: POST /api/auth/activate)
   */
  public async activateAccount(payload: { email: string; otp: string; password: string }): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload.email.trim().toLowerCase(),
          otp: payload.otp.trim(),
          password: payload.password
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { success: true, message: data.message || 'Account activated successfully. You can sign in now.' };
      }
      return { success: false, message: data.error || 'Activation failed. Check the OTP and password requirements.' };
    } catch {
      return { success: false, message: 'Unable to connect to the Backend server.' };
    }
  }

  /**
   * Get current authenticated user details from Backend
   */
  public async getMe(): Promise<any> {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await this.request('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  public async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await this.request('/api/auth/password/change', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.getToken()}` }, body: JSON.stringify({ currentPassword, newPassword }) });
    const data = await res.json().catch(() => ({}));
    return { success: res.ok, message: data.message || data.error || (res.ok ? 'Password changed.' : 'Unable to change password.') };
  }

  public async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/password-reset/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    const data = await res.json().catch(() => ({}));
    return { success: res.ok, message: data.message || data.error || 'If the account is eligible, a verification code will be sent.' };
  }

  public async confirmPasswordReset(email: string, otp: string, password: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/password-reset/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp, password }) });
    const data = await res.json().catch(() => ({}));
    return { success: res.ok, message: data.message || data.error || (res.ok ? 'Password reset successfully.' : 'Unable to reset password.') };
  }

  public async uploadAvatar(file: File): Promise<any> {
    const form = new FormData(); form.append('file', file);
    const res = await this.request('/api/users/me/avatar', { method: 'PUT', headers: { Authorization: `Bearer ${this.getToken()}` }, body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Unable to upload avatar.');
    return data;
  }

  public async deleteAvatar(): Promise<any> {
    const res = await this.request('/api/users/me/avatar', { method: 'DELETE', headers: { Authorization: `Bearer ${this.getToken()}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Unable to remove avatar.');
    return data;
  }

}

export const authService = new AuthService();
