import { storeAdminMessage } from '../../utils/storeAdminCopy';
import { authService } from '../../services/authService';

export type F02Status = 'ACTIVE' | 'INACTIVE';
export type F02BatchStatus = 'ACTIVE' | 'BLOCKED';
export type F02BatchEffectiveStatus = F02BatchStatus | 'EXPIRED';
export interface F02Category { id: number; name: string; status: F02Status; }
export interface F02Product {
  id: number; sku: string; name: string; unit: string; requiresExpiry: boolean;
  category: F02Category | null; sellingPrice: number; costPrice: number;
  status: F02Status; stockQuantity: number;
}
export type F02ProductRequest = Omit<F02Product, 'id' | 'sku' | 'category' | 'stockQuantity'> & { categoryId?: number | null; confirmSimilarName?: boolean };
export interface F02ProductPage { content: F02Product[]; page: number; pageSize: number; totalElements: number; totalPages: number; }
export interface F02BatchCreateRequest { receivedAt: string; expiryDate?: string | null; initialQuantity: number; pushDay?: string | null; }
export interface F02BatchPatchRequest { remainingQuantity?: number; status?: F02BatchStatus; pushDay?: string | null; expiryDate?: string | null; }
export interface F02Batch extends F02BatchCreateRequest { id: number; productId: number; readonly batchCode: string; expiryDate: string | null; pushDay: string | null; remainingQuantity: number; status: F02BatchStatus; effectiveStatus: F02BatchEffectiveStatus; daysToExpiry: number | null; warnings: 'MISSING_PUSH_DAY'[]; createdAt: string; updatedAt: string; }
export interface F02InventorySummary { productId: number; totalQuantity: number; sellableQuantity: number; expiredQuantity: number; blockedQuantity: number; expiringSoonQuantity: number; batchesMissingPushDay: number; }

export const canManageCatalog = () => authService.getCurrentUser()?.role === 'Store Admin';

export interface ProductDeleteCampaign { campaignId: number; status: 'PUBLISHED' | 'ACTIVE' }
export class F02ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public reason?: string, public campaigns: ProductDeleteCampaign[] = []) { super(message); }
}

export const needsProductNameConfirmation = (error: unknown) => error instanceof F02ApiError && error.status === 409 && error.code === 'PRODUCT_NAME_CONFIRMATION_REQUIRED';

export function f02ErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unable to complete the request. Please try again.';
  if (error instanceof TypeError && /fetch|network|load failed/i.test(message)) return 'Unable to connect to the server. Please check your connection and try again.';
  if (/Cannot require expiry while a batch has no expiry date/i.test(message)) return 'Cannot enable expiry tracking because some existing batches have no expiry date.';
  if (/pushDay must be on or before expiryDate/i.test(message)) return 'Push Day must be on or before the expiry date.';
  return storeAdminMessage(message);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const role = authService.getCurrentUser()?.role;
  const catalogRead = (!init.method || init.method === 'GET') && /^\/api\/(products|categories)(\/\d+)?(\?|$)/.test(path);
  if (!role) throw new F02ApiError(401, 'Your session has ended. Please sign in again.');
  if (!canManageCatalog() && !(role === 'Merchandiser' && catalogRead)) throw new F02ApiError(403, 'You do not have permission to perform this action.');
  const token = authService.getToken();
  const response = await authService.request(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) }
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fallback: Record<number, string> = { 400: 'Please check the information and try again.', 401: 'Your session has ended. Please sign in again.', 403: 'You do not have permission to perform this action.', 404: 'This item was not found in your store.', 409: 'This change conflicts with existing data. Please review and try again.' };
    const campaigns = Array.isArray(data?.campaigns) ? data.campaigns.filter((campaign: ProductDeleteCampaign | null) =>
      campaign && Number.isSafeInteger(campaign.campaignId) && (campaign.status === 'ACTIVE' || campaign.status === 'PUBLISHED')) : [];
    throw new F02ApiError(response.status, data?.error || data?.message || fallback[response.status] || 'Unable to complete the request. Please try again.',
      data?.code, typeof data?.reason === 'string' ? data.reason : undefined, campaigns);
  }
  return data as T;
}

// Select only writable contract fields, even when the caller holds a response object.
const productBody = ({ name, categoryId, unit, requiresExpiry, sellingPrice, costPrice, status, confirmSimilarName }: F02ProductRequest) =>
  JSON.stringify({ name, categoryId, unit, requiresExpiry, sellingPrice, costPrice, status, confirmSimilarName });

export const storeApi = {
  listCategories: () => request<F02Category[]>('/api/categories'),
  getCategory: (id: number) => request<F02Category>(`/api/categories/${id}`),
  listProducts: (params: Record<string, string | number | undefined> = {}) => {
    const query = new URLSearchParams();
    ['search', 'categoryId', 'status', 'page', 'pageSize', 'sortBy', 'sortDirection'].forEach(key => { const value = params[key]; if (value !== undefined && value !== '') query.set(key, String(value)); });
    return request<F02ProductPage>(`/api/products${query.toString() ? `?${query}` : ''}`);
  },
  deleteProduct: (id: number) => request<void>(`/api/products/${id}`, { method: 'DELETE' }),
  getProduct: (id: number) => request<F02Product>(`/api/products/${id}`),
  createProduct: (body: F02ProductRequest) => request<F02Product>('/api/products', { method: 'POST', body: productBody(body) }),
  updateProduct: (id: number, body: F02ProductRequest) => request<F02Product>(`/api/products/${id}`, { method: 'PUT', body: productBody(body) }),
  updateProductStatus: (id: number, status: F02Status) => request<F02Product>(`/api/products/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  createCategory: (body: { name: string; status: F02Status }) => request<F02Category>('/api/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id: number, body: { name: string; status: F02Status }) => request<F02Category>(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateCategoryStatus: (id: number, status: F02Status) => request<F02Category>(`/api/categories/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  listBatches: (productId: number) => request<F02Batch[]>(`/api/products/${productId}/batches`),
  createBatch: (productId: number, { receivedAt, expiryDate, initialQuantity, pushDay }: F02BatchCreateRequest) => request<F02Batch>(`/api/products/${productId}/batches`, { method: 'POST', body: JSON.stringify({ receivedAt, expiryDate, initialQuantity, pushDay }) }),
  getBatch: (id: number) => request<F02Batch>(`/api/inventory-batches/${id}`),
  updateBatch: async (id: number, { remainingQuantity, status, pushDay, expiryDate }: F02BatchPatchRequest) => {
    if (remainingQuantity == null && status == null && pushDay == null && expiryDate == null) throw new F02ApiError(400, 'Choose at least one batch field to update. Use Clear Push Day or Clear Expiry Date to remove a date.');
    return request<F02Batch>(`/api/inventory-batches/${id}`, { method: 'PATCH', body: JSON.stringify({ remainingQuantity, status, pushDay, expiryDate }) });
  },
  clearExpiryDate: (id: number) => request<F02Batch>(`/api/inventory-batches/${id}/expiry-date`, { method: 'DELETE' }),
  clearPushDay: (id: number) => request<F02Batch>(`/api/inventory-batches/${id}/push-day`, { method: 'DELETE' }),
  getSummary: (productId: number) => request<F02InventorySummary>(`/api/products/${productId}/inventory-summary?expiringWithinDays=7`)
};
