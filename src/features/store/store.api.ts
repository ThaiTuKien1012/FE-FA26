import { authService } from '../../services/authService';

export type F02Status = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export interface F02Category { id: number; name: string; status: F02Status; }
export interface F02Product {
  id: number; sku: string; name: string; unit: string; requiresExpiry: boolean;
  category: F02Category | null; sellingPrice: number; costPrice: number;
  status: F02Status; stockQuantity: number;
}
export interface F02ProductPage { content: F02Product[]; page: number; pageSize: number; totalElements: number; totalPages: number; }
export interface F02Batch { id: number; productId: number; batchCode: string; receivedAt: string; expiryDate?: string | null; initialQuantity: number; remainingQuantity: number; status: F02Status; }
export interface F02InventorySummary { productId: number; totalQuantity: number; sellableQuantity: number; expiredQuantity: number; blockedQuantity: number; expiringSoonQuantity: number; }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = authService.getToken();
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || data?.message || `Request failed (${response.status})`);
  return data as T;
}

export const storeApi = {
  listCategories: () => request<F02Category[]>('/api/categories'),
  getCategory: (id: number) => request<F02Category>(`/api/categories/${id}`),
  listProducts: (params: Record<string, string | number | undefined> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
    return request<F02ProductPage>(`/api/products${query.toString() ? `?${query}` : ''}`);
  },
  getProduct: (id: number) => request<F02Product>(`/api/products/${id}`),
  createProduct: (body: Omit<F02Product, 'id' | 'category' | 'stockQuantity'> & { categoryId?: number }) => request<F02Product>('/api/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id: number, body: Omit<F02Product, 'id' | 'category' | 'stockQuantity'> & { categoryId?: number }) => request<F02Product>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateProductStatus: (id: number, status: F02Status) => request<F02Product>(`/api/products/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  createCategory: (body: { name: string; status: F02Status }) => request<F02Category>('/api/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id: number, body: { name: string; status: F02Status }) => request<F02Category>(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateCategoryStatus: (id: number, status: F02Status) => request<F02Category>(`/api/categories/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  listBatches: (productId: number) => request<F02Batch[]>(`/api/products/${productId}/batches`),
  createBatch: (productId: number, body: { batchCode: string; receivedAt: string; expiryDate?: string; initialQuantity: number }) => request<F02Batch>(`/api/products/${productId}/batches`, { method: 'POST', body: JSON.stringify(body) }),
  getBatch: (id: number) => request<F02Batch>(`/api/inventory-batches/${id}`),
  updateBatch: (id: number, body: { remainingQuantity?: number; status?: F02Status }) => request<F02Batch>(`/api/inventory-batches/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getSummary: (productId: number) => request<F02InventorySummary>(`/api/products/${productId}/inventory-summary?expiringWithinDays=7`)
};
