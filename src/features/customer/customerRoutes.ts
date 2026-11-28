import { isStoreSlug } from './customer.api';

export function customerPath(slug: string | null, productId: string | null = null): string {
  const path = productId ? `/product/${encodeURIComponent(productId)}` : '/storefront';
  return slug ? path + '?' + new URLSearchParams({ store: slug }) : path;
}

export function customerCartPath(slug: string | null): string {
  return '/cart' + (isStoreSlug(slug) ? '?' + new URLSearchParams({ store: slug }) : '');
}

export function customerLoginPath(slug: string | null, productId: string | null = null, cart = false): string {
  if (!isStoreSlug(slug)) return '/login';
  const query = new URLSearchParams({ returnStore: slug });
  if (productId) query.set('returnProduct', productId);
  if (cart) query.set('returnCart', '1');
  return '/login?' + query;
}

export function customerLoginTarget(pathname: string, search: string) {
  if (pathname !== '/login') return null;
  const params = new URLSearchParams(search);
  const slug = params.get('returnStore');
  const product = params.get('returnProduct');
  if (!isStoreSlug(slug)) return null;
  const productId = product && /^[1-9]\d{0,9}$/.test(product) && Number(product) <= 2147483647 ? product : null;
  return { slug, productId, ...(params.get('returnCart') === '1' ? { cart: true as const } : {}) };
}
