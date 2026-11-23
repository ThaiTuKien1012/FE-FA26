import type { SortDirection } from './f02.tables';

const productSortFields = ['name', 'sku', 'category', 'costPrice', 'sellingPrice', 'status', 'requiresExpiry', 'stockQuantity'] as const;
type ProductSortField = typeof productSortFields[number];
export interface ProductViewState {
  page: number; query: string; status: string; categoryId: string; sortBy: ProductSortField; sortDirection: SortDirection;
}

/** Migrate retired Unit sorting without discarding the saved page or filters. */
export function restoreProductViewState(raw: string | null): ProductViewState {
  let saved: Record<string, unknown> = {};
  try { const value = JSON.parse(raw || '{}'); if (value && typeof value === 'object' && !Array.isArray(value)) saved = value; } catch { /* Invalid preferences do not affect product data. */ }
  return {
    page: Number.isSafeInteger(saved.page) && Number(saved.page) >= 0 ? Number(saved.page) : 0,
    query: typeof saved.query === 'string' ? saved.query : '',
    status: saved.status === 'ACTIVE' || saved.status === 'INACTIVE' ? saved.status : '',
    categoryId: typeof saved.categoryId === 'string' ? saved.categoryId : '',
    sortBy: productSortFields.includes(saved.sortBy as ProductSortField) ? saved.sortBy as ProductSortField : 'name',
    sortDirection: saved.sortDirection === 'desc' ? 'desc' : 'asc'
  };
}
