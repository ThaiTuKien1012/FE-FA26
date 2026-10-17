import { SystemRole } from '../types/users';
import { ActiveNavScreen } from '../types/mining';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  avatarText: string;
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
      'users',
      'api-connections',
      'profile'
    ]
  },
  'Merchandiser': {
    department: 'Retail Merchandising Planner',
    defaultScreen: 'merchandiser-recommendations',
    allowedScreens: [
      'merchandiser-recommendations',
      'merchandiser-approve',
      'merchandiser-campaign-draft',
      'merchandiser-campaign-status',
      'merchandiser-utility-profile',
      'merchandiser-refine-criteria',
      'merchandiser-ab-simulation',
      'merchandiser-compare-simulation',
      'merchandiser-keep-layout-a',
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

export const SCREEN_OWNER_MAP: Record<ActiveNavScreen, ScreenOwnerInfo> = {
  // Store Admin Core Modules
  'store-inventory': {
    primaryRole: 'Store Admin',
    roleKey: 'store-admin',
    title: 'Products & Inventory',
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

  // System Admin Core Modules
  'overview': {
    primaryRole: 'System Admin',
    roleKey: 'system-admin',
    title: 'Mining Service Overview',
    allowedRoles: ['System Admin']
  },
  'setup': {
    primaryRole: 'System Admin',
    roleKey: 'system-admin',
    title: 'Mining Algorithm Setup',
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
  'api-connections': {
    primaryRole: 'System Admin',
    roleKey: 'system-admin',
    title: 'External API Connections',
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

const STORAGE_KEY_USER = 'retailspace_auth_user';
const STORAGE_KEY_TOKEN = 'retailspace_auth_token';

class AuthService {
  private currentUser: AuthUser | null = null;

  constructor() {
    this.restoreSession();
  }

  private restoreSession() {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const permissions = ROLE_PERMISSIONS[parsed.role as SystemRole];
        if (permissions) {
          parsed.allowedScreens = permissions.allowedScreens;
          parsed.defaultScreen = permissions.defaultScreen;
          parsed.department = parsed.department || permissions.department;
        }
        this.currentUser = parsed;
      }
    } catch {
      this.currentUser = null;
    }
  }

  public getCurrentUser(): AuthUser | null {
    if (this.currentUser) {
      const permissions = ROLE_PERMISSIONS[this.currentUser.role];
      if (permissions) {
        this.currentUser.allowedScreens = permissions.allowedScreens;
      }
    }
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public isScreenAllowed(user: AuthUser | null, screen: ActiveNavScreen): boolean {
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.role];
    const allowed = permissions ? permissions.allowedScreens : user.allowedScreens;
    return allowed.includes(screen);
  }

  public getToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY_TOKEN);
    } catch {
      return null;
    }
  }

  /**
   * Real backend login: POST /api/auth/login -> GET /api/auth/me
   */
  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const emailInput = credentials.email.trim();
    const passwordInput = credentials.password || '';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });

      if (res.ok) {
        const tokenData = await res.json();
        const token = tokenData.accessToken;

        // Fetch /api/auth/me using the token
        const meRes = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (meRes.ok) {
          const meData = await meRes.json();
          const roleMapping: Record<string, { role: SystemRole; department: string; defaultScreen: ActiveNavScreen; allowedScreens: ActiveNavScreen[] }> = {
            'SYSTEM_ADMIN': {
              role: 'System Admin',
              department: 'Platform Administration & System Engineering',
              defaultScreen: 'overview',
              allowedScreens: ['overview', 'setup', 'results', 'failure', 'benchmark', 'users', 'api-connections', 'profile']
            },
            'STORE_ADMIN': {
              role: 'Store Admin',
              department: 'Store Operations & Inventory',
              defaultScreen: 'store-inventory',
              allowedScreens: ['store-inventory', 'store-edit-product', 'store-categories', 'store-batches', 'profile']
            },
            'MERCHANDISER': {
              role: 'Merchandiser',
              department: 'Retail Merchandising Planner',
              defaultScreen: 'merchandiser-recommendations',
              allowedScreens: ['merchandiser-recommendations', 'merchandiser-approve', 'merchandiser-campaign-draft', 'merchandiser-campaign-status', 'merchandiser-utility-profile', 'merchandiser-refine-criteria', 'merchandiser-ab-simulation', 'merchandiser-compare-simulation', 'merchandiser-keep-layout-a', 'profile']
            },
            'END_CUSTOMER': {
              role: 'End-Customer',
              department: 'Retail Loyalty Customer',
              defaultScreen: 'customer-storefront',
              allowedScreens: ['customer-storefront', 'profile']
            }
          };

          const matched = roleMapping[meData.roleCode] || roleMapping['SYSTEM_ADMIN'];
          const initials = meData.name 
            ? meData.name.trim().split(/\s+/).map((s: string) => s[0]).join('').slice(0, 2).toUpperCase() 
            : 'AD';

          const authUser: AuthUser = {
            id: `usr-${meData.userId}`,
            name: meData.name || meData.email,
            email: meData.email,
            role: matched.role,
            avatarText: initials,
            department: matched.department,
            defaultScreen: matched.defaultScreen,
            allowedScreens: matched.allowedScreens
          };

          this.currentUser = authUser;
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(authUser));
          localStorage.setItem(STORAGE_KEY_TOKEN, token);

          return {
            success: true,
            token,
            user: authUser,
            redirectScreen: authUser.defaultScreen
          };
        }
      }
    } catch {
      // Backend unavailable or fetch failed
    }

    return {
      success: false,
      error: 'Unable to sign in. Please check your email, password, or server connection.'
    };
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
      const res = await fetch('/api/auth/me', {
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

  /**
   * Logout user and clear tokens
   */
  public logout(): void {
    this.currentUser = null;
    try {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    } catch {
      // Ignore
    }
  }
}

export const authService = new AuthService();
