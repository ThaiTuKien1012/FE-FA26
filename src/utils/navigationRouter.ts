import { ActiveNavScreen } from '../types/mining';

export const SCREEN_TO_PATH: Record<ActiveNavScreen, string> = {
  'login': '/login',
  'register': '/register',
  'activate': '/activate',
  'profile': '/profile',
  'customer-storefront': '/storefront',

  // Merchandiser Screens
  'merchandiser-recommendations': '/merchandiser/recommendations',
  'merchandiser-approve': '/merchandiser/approve',
  'merchandiser-campaign-draft': '/merchandiser/campaign-draft',
  'merchandiser-campaign-status': '/merchandiser/campaign-status',
  'merchandiser-utility-profile': '/merchandiser/utility-profile',
  'merchandiser-refine-criteria': '/merchandiser/refine-criteria',
  'merchandiser-ab-simulation': '/merchandiser/ab-simulation',
  'merchandiser-compare-simulation': '/merchandiser/compare-simulation',
  'merchandiser-keep-layout-a': '/merchandiser/keep-layout-a',

  // Store Admin Screens
  'store-inventory': '/store/inventory',
  'store-edit-product': '/store/edit-product',
  'store-transactions': '/store/transactions',
  'store-validation-issues': '/store/validation-issues',
  'store-campaigns': '/store/campaigns',
  'store-reports': '/store/reports',
  'store-ab-report': '/store/ab-report',

  // System Admin Screens
  'overview': '/admin/overview',
  'setup': '/admin/setup',
  'results': '/admin/results',
  'failure': '/admin/failure',
  'benchmark': '/admin/benchmark',
  'users': '/admin/users',
  'api-connections': '/admin/api-connections'
};

// Reverse map for quick lookup
const PATH_TO_SCREEN: Record<string, ActiveNavScreen> = Object.entries(SCREEN_TO_PATH).reduce(
  (acc, [screen, path]) => {
    acc[path.toLowerCase()] = screen as ActiveNavScreen;
    // Also support trailing slashes or hyphenated direct paths
    acc[path.toLowerCase() + '/'] = screen as ActiveNavScreen;
    acc['/' + screen.toLowerCase()] = screen as ActiveNavScreen;
    acc['/' + screen.toLowerCase() + '/'] = screen as ActiveNavScreen;
    return acc;
  },
  {} as Record<string, ActiveNavScreen>
);

/**
 * Returns the URL path for a given screen ID
 */
export function getPathForScreen(screen: ActiveNavScreen): string {
  return SCREEN_TO_PATH[screen] || `/${screen}`;
}

/**
 * Parses current window pathname and returns the matching screen ID
 */
export function getScreenFromPathname(pathname: string): ActiveNavScreen | null {
  const normalized = pathname.trim().toLowerCase();
  if (normalized === '' || normalized === '/') {
    return null;
  }
  return PATH_TO_SCREEN[normalized] || null;
}

/**
 * Synchronize browser URL bar using HTML5 History API without page reload
 */
export function syncBrowserUrl(screen: ActiveNavScreen, replace = false) {
  if (typeof window === 'undefined') return;
  const targetPath = getPathForScreen(screen);
  const currentPath = window.location.pathname;

  if (currentPath !== targetPath) {
    if (replace) {
      window.history.replaceState({ screen }, '', targetPath);
    } else {
      window.history.pushState({ screen }, '', targetPath);
    }
  }
}
