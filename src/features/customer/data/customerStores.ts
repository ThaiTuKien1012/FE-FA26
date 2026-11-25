const STORE_STORAGE_KEY = 'retailspace_public_store_slug';

export function storeSlugFromPath(path: string): string | null {
  const match = /^\/storefront\/([^/]+)(?:\/products\/[^/]+)?\/?$/.exec(path);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return null; }
}
export function getCustomerStoreId(): string {
  if (typeof window === 'undefined') return '';
  const slug = storeSlugFromPath(window.location.pathname);
  if (slug) return slug;
  try { return sessionStorage.getItem(STORE_STORAGE_KEY) || ''; } catch { return ''; }
}
export function rememberCustomerStore(slug: string): void {
  try { sessionStorage.setItem(STORE_STORAGE_KEY, slug); } catch { /* Selection also lives in the current URL. */ }
}
export const storefrontPath = (slug: string) => `/storefront/${encodeURIComponent(slug)}`;
export const productPath = (slug: string, productId: string) => `${storefrontPath(slug)}/products/${encodeURIComponent(productId)}`;
