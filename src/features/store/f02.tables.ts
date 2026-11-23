import type { F02Batch, F02Category } from './store.api';
import { storeDate } from './f02.forms';

export type SortDirection = 'asc' | 'desc';
export interface TableSort<K extends string = string> { by: K; direction: SortDirection; }
export interface ColumnFilterValue { text?: string; choice?: string; min?: string; max?: string; presence?: '' | 'set' | 'unset'; }
export const hasColumnFilter = (value: ColumnFilterValue) => Object.values(value).some(Boolean);
export function nextTableSort<K extends string>(current: TableSort<K> | null, by: K): TableSort<K> {
  return { by, direction: current?.by === by && current.direction === 'asc' ? 'desc' : 'asc' };
}

const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });
const searchable = (value: string) => value.trim().toLocaleLowerCase('vi').normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
const includesText = (value: string, search = '') => searchable(value).includes(searchable(search));
type CellValue = string | number | null;
export function sortTableRows<T extends { id: number }>(rows: readonly T[], direction: SortDirection, value: (row: T) => CellValue): T[] {
  return [...rows].sort((left, right) => {
    const a = value(left), b = value(right);
    // Missing dates are always last, including descending order. Ties always use ID ascending.
    if (a === null || b === null) return a === b ? left.id - right.id : a === null ? 1 : -1;
    const compared = typeof a === 'number' && typeof b === 'number' ? a - b : collator.compare(String(a), String(b));
    return compared * (direction === 'asc' ? 1 : -1) || left.id - right.id;
  });
}

export type CategorySortKey = 'id' | 'name' | 'status';
export interface CategoryFilters { id: string; name: string; status: string; }
export const emptyCategoryFilters: CategoryFilters = { id: '', name: '', status: '' };
export function categoryTableRows(rows: readonly F02Category[], filters: CategoryFilters, sort: TableSort<CategorySortKey> | null): F02Category[] {
  const matching = rows.filter(row => (!filters.id.trim() || String(row.id) === filters.id.trim()) && includesText(row.name, filters.name) && (!filters.status || row.status === filters.status));
  return sort ? sortTableRows(matching, sort.direction, row => row[sort.by]) : matching;
}

export type BatchSortKey = 'batchCode' | 'receivedAt' | 'expiryDate' | 'pushDay' | 'remainingQuantity' | 'initialQuantity' | 'status';
export type BatchFilters = Record<'batchCode' | 'receivedAt' | 'expiryDate' | 'pushDay' | 'remainingQuantity' | 'status', ColumnFilterValue>;
export const emptyBatchFilters = (): BatchFilters => ({ batchCode: {}, receivedAt: {}, expiryDate: {}, pushDay: {}, remainingQuantity: {}, status: {} });
function inRange(value: string | number, filter: ColumnFilterValue): boolean {
  if (typeof value === 'number') {
    return (!filter.min || Number.isFinite(Number(filter.min)) && value >= Number(filter.min)) && (!filter.max || Number.isFinite(Number(filter.max)) && value <= Number(filter.max));
  }
  return (!filter.min || value >= filter.min) && (!filter.max || value <= filter.max);
}
function dateMatches(value: string | null, filter: ColumnFilterValue): boolean {
  if (filter.presence === 'unset') return value === null;
  if (value === null) return !filter.presence && !filter.min && !filter.max;
  return inRange(value, filter);
}
export function batchTableRows(rows: readonly F02Batch[], filters: BatchFilters, sort: TableSort<BatchSortKey> | null): F02Batch[] {
  const matching = rows.filter(row => includesText(row.batchCode, filters.batchCode.text)
    && inRange(storeDate(new Date(row.receivedAt)), filters.receivedAt)
    && dateMatches(row.expiryDate, filters.expiryDate)
    && dateMatches(row.pushDay, filters.pushDay)
    && (!filters.status.choice || row.status === filters.status.choice)
    && inRange(row.remainingQuantity, filters.remainingQuantity));
  return sort ? sortTableRows(matching, sort.direction, row => sort.by === 'receivedAt' ? Date.parse(row.receivedAt) : row[sort.by]) : matching;
}

export function tablePage<T>(rows: readonly T[], page: number, pageSize = 10): T[] {
  return rows.slice(page * pageSize, (page + 1) * pageSize);
}

export function paginationItems(page: number, totalPages: number): Array<number | 'ellipsis'> {
  const last = Math.max(0, totalPages - 1), current = Math.max(0, Math.min(page, last));
  const pages = new Set([0, last]);
  for (let index = Math.max(0, current - 2); index <= Math.min(last, current + 2); index++) pages.add(index);
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((index, position): Array<number | 'ellipsis'> => position > 0 && index - sorted[position - 1] > 1 ? ['ellipsis', index] : [index]);
}

export function paginationRange(page: number, total: number, count: number, pageSize = 10): { from: number; to: number } {
  const offset = Math.max(0, Math.min(page, Math.max(0, Math.ceil(total / pageSize) - 1))) * pageSize;
  const shown = Math.max(0, Math.min(count, pageSize, total - offset));
  return shown ? { from: offset + 1, to: offset + shown } : { from: 0, to: 0 };
}
