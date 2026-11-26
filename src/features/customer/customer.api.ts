import { authService } from '../../services/authService';
import type { BundleAddResult, BundleComponent, CartView, ProductQuery, StoreHome, StoreProduct,
  StoreProductPage, StoreSummary } from './customer.types';

type Transport = (url: string, init?: RequestInit) => Promise<Response>;

export class CustomerApiError extends Error {
  constructor(readonly status: number | null, readonly code?: string, readonly components?: BundleComponent[]) {
    super(customerErrorMessage({ status, code }));
  }
}

export function customerErrorMessage({ status, code }: { status: number | null; code?: string }): string {
  if (status === 409) {
    switch (code) {
      case 'CART_VERSION_CONFLICT': return 'Giỏ hàng đã thay đổi. Hãy kiểm tra lại trước khi thực hiện lại.';
      case 'CART_QUANTITY_LIMIT': return 'Mỗi sản phẩm được thêm tối đa 99 đơn vị. Giỏ hàng chưa thay đổi.';
      case 'INSUFFICIENT_SELLABLE_STOCK': return 'Sản phẩm không đủ tồn kho. Giỏ hàng chưa thay đổi.';
      case 'BUNDLE_ADD_REJECTED': return 'Không thể thêm sản phẩm nào trong gói. Giỏ hàng chưa thay đổi.';
      case 'BUNDLE_UNAVAILABLE': return 'Gói sản phẩm đã thay đổi. Hãy kiểm tra lại cửa hàng.';
    }
  }
  switch (status) {
    case 400: return 'Yêu cầu chưa hợp lệ.';
    case 401: return 'Vui lòng đăng nhập để sử dụng giỏ hàng.';
    case 403: return 'Tài khoản này không có quyền sử dụng giỏ hàng.';
    case 404: return 'Không tìm thấy nội dung yêu cầu.';
    case null: return 'Không kết nối được. Vui lòng thử lại.';
    default: return 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại.';
  }
}

const longFields = new Set(['cartId', 'itemId', 'version']);

function readCartJson(body: string): unknown {
  const parse = JSON.parse as (source: string, reviver: (key: string, value: unknown,
    context?: { source?: string }) => unknown) => unknown;
  return parse(body, (key, value, context) => {
    if (!longFields.has(key) || value === null) return value;
    const source = context?.source ?? (Number.isSafeInteger(value) ? String(value) : '');
    if (typeof value !== 'number' || !/^\d{1,19}$/.test(source) || BigInt(source) > 9223372036854775807n) {
      throw new Error('Cart int64 cannot be represented safely');
    }
    return source;
  });
}

function componentsOf(value: unknown): BundleComponent[] | undefined {
  if (!Array.isArray(value) || value.some(item => !item || !Number.isSafeInteger(item.productId)
    || !Number.isSafeInteger(item.requested) || !Number.isSafeInteger(item.added)
    || item.productId < 1 || item.requested < 1 || item.added < 0 || item.added > item.requested)) return undefined;
  return value;
}

async function read<T>(transport: Transport, path: string, init?: RequestInit, cart = false): Promise<T> {
  let response: Response;
  try {
    response = await transport(path, init);
  } catch (error) {
    if (init?.signal?.aborted) throw error;
    throw new CustomerApiError(null);
  }
  let payload: unknown;
  try {
    const body = await response.text();
    payload = cart && response.ok ? readCartJson(body) : JSON.parse(body);
  } catch {
    // Keep HTTP status even if an error response has no JSON body.
    if (response.ok) throw new CustomerApiError(502);
  }
  if (!response.ok) {
    const details = payload as { code?: unknown; components?: unknown } | null;
    throw new CustomerApiError(response.status,
      typeof details?.code === 'string' ? details.code : undefined, componentsOf(details?.components));
  }
  return payload as T;
}

export function isStoreSlug(slug: string | null): slug is string {
  return slug !== null && slug.length <= 50 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

const root = '/api/storefront';
const storePath = (slug: string) => `${root}/${encodeURIComponent(slug)}`;

type PublicStore = Omit<StoreSummary, 'iconUrl' | 'bannerUrl'> & Partial<Pick<StoreSummary, 'iconUrl' | 'bannerUrl'>>;

// Relative media paths use the same origin and /api proxy as the storefront requests.
function storeImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `/${value.replace(/^\/+/, '')}`;
}

function normalizeStore(store: PublicStore): StoreSummary {
  return { ...store, iconUrl: storeImageUrl(store.iconUrl), bannerUrl: storeImageUrl(store.bannerUrl) };
}

export function createCustomerApi(publicRequest: Transport, cartRequest: Transport) {
  function write<T>(slug: string, suffix: string, method: 'POST' | 'PATCH' | 'DELETE', version: string,
      body: object | undefined, signal?: AbortSignal) {
    const headers: Record<string, string> = { 'If-Match': `"${version}"` };
    if (body) headers['Content-Type'] = 'application/json';
    return read<T>(cartRequest, `${storePath(slug)}/cart${suffix}`,
      { method, headers, body: body ? JSON.stringify(body) : undefined, signal }, true);
  }
  return {
    async stores(signal?: AbortSignal) {
      const stores = await read<PublicStore[]>(publicRequest, `${root}/stores`, { signal });
      return stores.map(normalizeStore);
    },
    async home(slug: string, signal?: AbortSignal): Promise<StoreHome> {
      const home = await read<Omit<StoreHome, 'store'> & { store: PublicStore }>(
        publicRequest, `${storePath(slug)}/home`, { signal });
      return { ...home, store: normalizeStore(home.store) };
    },
    products(slug: string, filters: ProductQuery, signal?: AbortSignal) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== '') params.set(key, String(value));
      const query = params.size ? `?${params}` : '';
      return read<StoreProductPage>(publicRequest, `${storePath(slug)}/products${query}`, { signal });
    },
    product: (slug: string, id: number, signal?: AbortSignal) =>
      read<StoreProduct>(publicRequest, `${storePath(slug)}/products/${id}`, { signal }),
    getCart: (slug: string, signal?: AbortSignal) =>
      read<CartView>(cartRequest, `${storePath(slug)}/cart`, { signal }, true),
    addItem: (slug: string, version: string, productId: number, quantity: number, signal?: AbortSignal) =>
      write<CartView>(slug, '/items', 'POST', version, { productId, quantity }, signal),
    changeQuantity: (slug: string, version: string, itemId: string, quantity: number, signal?: AbortSignal) =>
      write<CartView>(slug, `/items/${encodeURIComponent(itemId)}`, 'PATCH', version, { quantity }, signal),
    removeItem: (slug: string, version: string, itemId: string, signal?: AbortSignal) =>
      write<CartView>(slug, `/items/${encodeURIComponent(itemId)}`, 'DELETE', version, undefined, signal),
    async addBundle(slug: string, version: string, bundleKey: string, signal?: AbortSignal) {
      const result = await write<BundleAddResult>(slug, '/bundles', 'POST', version, { bundleKey }, signal);
      if (!componentsOf(result?.components)) throw new CustomerApiError(502);
      return result;
    },
  };
}

export const customerApi = createCustomerApi(
  (path, init) => fetch(path, { ...init, credentials: 'omit' }),
  (path, init) => authService.request(path, init),
);
