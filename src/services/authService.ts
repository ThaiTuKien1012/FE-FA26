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

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
  redirectScreen?: ActiveNavScreen;
}

export const MOCK_ACCOUNTS: Record<string, AuthUser & { defaultPassword: string; description: string }> = {
  'store-admin': {
    id: 'usr-store-admin',
    name: 'Lan Nguyen',
    email: 'store.admin@retailspace.demo',
    defaultPassword: 'admin123',
    role: 'Store Admin',
    avatarText: 'SA',
    department: 'Store Operations & Inventory',
    description: 'Manages products, inventory stock, POS transactions, and retail reporting',
    defaultScreen: 'store-inventory',
    allowedScreens: [
      'store-inventory',
      'store-edit-product',
      'store-campaigns',
      'store-transactions',
      'store-validation-issues',
      'store-reports',
      'store-ab-report'
    ]
  },
  'system-admin': {
    id: 'usr-system-admin',
    name: 'Kenji Takahashi',
    email: 'admin@retailspace.demo',
    defaultPassword: 'admin123',
    role: 'System Admin',
    avatarText: 'KT',
    department: 'Platform Engineering & Mining Service',
    description: 'Configures High-Utility Itemset Mining (HUI-Miner/EFIM), RBAC & integrations',
    defaultScreen: 'overview',
    allowedScreens: [
      'overview',
      'setup',
      'results',
      'failure',
      'benchmark',
      'users',
      'api-connections'
    ]
  },
  'merchandiser': {
    id: 'usr-merchandiser',
    name: 'Minh Tran',
    email: 'merchandiser@retailspace.demo',
    defaultPassword: 'admin123',
    role: 'Merchandiser',
    avatarText: 'ME',
    department: 'Retail Planner',
    description: 'Review mining-derived product groups and approve them for layout planning',
    defaultScreen: 'merchandiser-recommendations',
    allowedScreens: [
      'merchandiser-recommendations',
      'merchandiser-approve'
    ]
  },
  'customer': {
    id: 'usr-customer',
    name: 'Quynh Le',
    email: 'customer@retailspace.demo',
    defaultPassword: 'admin123',
    role: 'End-Customer',
    avatarText: 'CU',
    department: 'Retail Loyalty Customer',
    description: 'Explores store catalog, personalized basket pairings, and checkout kiosk',
    defaultScreen: 'customer-storefront',
    allowedScreens: [
      'customer-storefront'
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
  'store-transactions': {
    primaryRole: 'Store Admin',
    roleKey: 'store-admin',
    title: 'Transactions Data Center',
    allowedRoles: ['Store Admin']
  },
  'store-validation-issues': {
    primaryRole: 'Store Admin',
    roleKey: 'store-admin',
    title: 'Validation Issues Log',
    allowedRoles: ['Store Admin']
  },
  'store-reports': {
    primaryRole: 'Store Admin',
    roleKey: 'store-admin',
    title: 'Retail Performance Reports',
    allowedRoles: ['Store Admin']
  },
  'store-ab-report': {
    primaryRole: 'Store Admin',
    roleKey: 'store-admin',
    title: 'A/B Test Report (O07)',
    allowedRoles: ['Store Admin']
  },

  // Store Operations & Campaigns
  'store-campaigns': {
    primaryRole: 'Store Admin',
    roleKey: 'store-admin',
    title: 'Campaign Activation Review',
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
  }
};

const STORAGE_KEY_USER = 'retailspace_auth_user';
const STORAGE_KEY_TOKEN = 'retailspace_auth_token';

class MockAuthService {
  private currentUser: AuthUser | null = null;

  constructor() {
    this.restoreSession();
  }

  private restoreSession() {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
      }
    } catch {
      this.currentUser = null;
    }
  }

  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Mock login API simulation with asynchronous delay
   */
  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Artificial latency for realistic mock API call (300ms)
    await new Promise((resolve) => setTimeout(resolve, 350));

    const emailInput = credentials.email.trim().toLowerCase();
    
    // Find matching mock account
    const matchedAccount = Object.values(MOCK_ACCOUNTS).find(
      (acc) => acc.email.toLowerCase() === emailInput
    );

    if (!matchedAccount) {
      return {
        success: false,
        error: `Account with email "${credentials.email}" was not found. Please select one of the 4 demo roles below.`
      };
    }

    // Check password if provided (for demo ease, accept defaultPassword or any non-empty input if testing)
    if (credentials.password && credentials.password !== matchedAccount.defaultPassword && credentials.password !== '123456') {
      return {
        success: false,
        error: 'Invalid password. (Hint: Demo password is "admin123" for all roles).'
      };
    }

    const { defaultPassword, description, ...userProfile } = matchedAccount;
    const token = `mock-jwt-token-${userProfile.role.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;

    this.currentUser = userProfile;

    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userProfile));
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
    } catch {
      // storage unavailable fallback
    }

    return {
      success: true,
      token,
      user: userProfile,
      redirectScreen: userProfile.defaultScreen
    };
  }

  /**
   * Quick 1-click login for demo purposes
   */
  public async quickLogin(roleKey: 'store-admin' | 'system-admin' | 'merchandiser' | 'customer'): Promise<AuthResponse> {
    const account = MOCK_ACCOUNTS[roleKey];
    if (!account) {
      return { success: false, error: 'Unknown role' };
    }
    return this.login({ email: account.email, password: account.defaultPassword });
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

export const authService = new MockAuthService();
