import { ActiveNavScreen } from '../types/mining';
import { getCustomerStoreId, storefrontPath } from '../features/customer/data/customerStores';

export const SCREEN_TO_PATH: Partial<Record<ActiveNavScreen, string>> = {
  'login': '/login',
  'forgot-password': '/forgot-password',
  'register': '/register',
  'activate': '/activate',
  'profile': '/profile',
  'f05-mining': '/mining',
  'f06-recommendations': '/recommendations',
  'f07-f08-workspace': '/layouts-campaigns',
  'customer-storefront': '/storefront',
  'customer-home': '/customer-home',
  'customer-product': '/product',

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
  'f03-utility': '/f03/utility',
  'f03-expiry-window': '/f03/expiry-window',
  'f03-configuration': '/f03/configuration',
  'f03-seasons': '/f03/seasons',
  'f03-product-scores': '/f03/product-scores',
  'f03-preview': '/f03/preview',
  'f03-snapshots': '/f03/snapshots',
  'f03-snapshot-detail': '/f03/snapshot/detail',
  'f03-snapshot-matrix': '/f03/snapshot/matrix',

  // Store Admin Screens
  'store-inventory': '/store/inventory',
  'store-edit-product': '/store/edit-product',
  'store-categories': '/store/categories',
  'store-batches': '/store/batches',
  'f04-import-transactions': '/store/transactions/import',
  'f04-import-history': '/store/transactions/history',
  'f04-transactions': '/store/transactions',

  // System Admin Screens
  'overview': '/admin/overview',
  'admin-run-mining': '/admin/mining/run',
  'admin-mining-history': '/admin/mining/history',
  'lambda-policy': '/admin/lambda-policy',
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

// Legacy F03 links remain valid; the singular action now opens the snapshot tab.
// Existing bookmarks open the API-backed F07 workspace.
for (const path of ['/store/layout', '/store/layout/', '/store-layout', '/store-layout/']) PATH_TO_SCREEN[path] = 'f07-f08-workspace';
PATH_TO_SCREEN['/f03/snapshot'] = 'f03-snapshots';
PATH_TO_SCREEN['/f03/snapshot/'] = 'f03-snapshots';
PATH_TO_SCREEN['/f03-snapshot'] = 'f03-snapshots';
// The retired expiry-window editor now opens the live Product Weights workspace.
for (const path of ['/f03/expiry-window', '/f03/expiry-window/', '/f03-expiry-window', '/f03-expiry-window/']) PATH_TO_SCREEN[path] = 'f03-product-scores';

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
  if (/^\/storefront\/[^/]+\/products\/[^/]+\/?$/.test(normalized)) return 'customer-product';
  if (/^\/storefront\/[^/]+\/?$/.test(normalized)) return 'customer-storefront';
  if (/^\/product\/[^/]+\/?$/.test(normalized)) return 'customer-product';
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
  if (screen === 'customer-product' && getCustomerProductId(window.location.pathname)) return;
  const slug = screen === 'customer-storefront' ? getCustomerStoreId() : '';
  const targetPath = slug ? storefrontPath(slug) : getPathForScreen(screen);
  const currentPath = window.location.pathname;

  if (currentPath !== targetPath) {
    if (replace) {
      window.history.replaceState({ screen }, '', targetPath);
    } else {
      window.history.pushState({ screen }, '', targetPath);
    }
  }
}

export function getCustomerProductId(pathname: string): string | null {
  const match = /^\/product\/([^/]+)\/?$/.exec(pathname) || /^\/storefront\/[^/]+\/products\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return null; }
}
