import type { CustomerDisplayProduct, PublicStore, StorefrontHome, StorefrontProductPage } from './customer.types';

export class StorefrontApiError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'StorefrontApiError'; }
}

async function read<T>(path: string, signal?: AbortSignal): Promise<T> {
  // Public reads never attach staff credentials or trigger session refresh.
  const response = await fetch(`/api/storefront/${path}`, { credentials: 'omit', headers: { Accept: 'application/json' }, signal });
  const body = await response.text();
  signal?.throwIfAborted();
  let data: any;
  try { data = JSON.parse(body); }
  catch { throw new StorefrontApiError(response.status || 502, 'Dịch vụ cửa hàng trả về dữ liệu không hợp lệ.'); }
  if (!response.ok) throw new StorefrontApiError(response.status, typeof data?.error === 'string' ? data.error : 'Không tải được dữ liệu cửa hàng.');
  return data as T;
}

export interface ProductQuery {
  search?: string;
  categoryId?: number;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'sellingPrice';
  sortDirection?: 'asc' | 'desc';
}
const slugPath = (slug: string) => {
  if (!slug.trim()) throw new Error('Hãy chọn cửa hàng.');
  return encodeURIComponent(slug);
};
export const customerApi = {
  stores: (signal?: AbortSignal) => read<PublicStore[]>('stores', signal),
  home: (slug: string, signal?: AbortSignal) => read<StorefrontHome>(`${slugPath(slug)}/home`, signal),
  products: (slug: string, query: ProductQuery = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams({ page: String(query.page ?? 0), pageSize: String(query.pageSize ?? 20), sortBy: query.sortBy ?? 'name', sortDirection: query.sortDirection ?? 'asc' });
    if (query.search?.trim()) params.set('search', query.search.trim());
    if (query.categoryId !== undefined) params.set('categoryId', String(query.categoryId));
    return read<StorefrontProductPage>(`${slugPath(slug)}/products?${params}`, signal);
  },
  product: (slug: string, productId: string, signal?: AbortSignal) => {
    if (!/^[1-9]\d*$/.test(productId) || !Number.isSafeInteger(Number(productId))) throw new StorefrontApiError(404, 'Product not found');
    return read<CustomerDisplayProduct>(`${slugPath(slug)}/products/${encodeURIComponent(productId)}`, signal);
  },
};

export function storefrontError(error: unknown): string {
  if (error instanceof StorefrontApiError) {
    if (error.status === 404) return error.message === 'Product not found' ? 'Sản phẩm không còn được công khai tại cửa hàng này.' : 'Cửa hàng không tồn tại hoặc chưa được mở công khai.';
    if (error.status === 503) return 'Trang trưng bày của cửa hàng tạm thời chưa sẵn sàng. Vui lòng thử lại sau.';
  }
  return 'Không tải được dữ liệu cửa hàng. Vui lòng thử lại.';
}
export function publicImageUrl(value: string | null): string | undefined {
  if (!value) return undefined;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined; }
  catch { return undefined; }
}
