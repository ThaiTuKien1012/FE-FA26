import type { F02ProductPage } from './store.api';

export interface UnitSuggestions { units: string[]; complete: boolean; loaded: number; total: number; failed: boolean; }
type FetchPage = (params: { page: number; pageSize: number; sortBy: string; sortDirection: string }) => Promise<F02ProductPage>;
export const UNIT_PAGE_SIZE = 100;
export const UNIT_MAX_PAGES = 20;
const CACHE_MS = 5 * 60_000;
const unitKey = (unit: string) => unit.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
export function uniqueUnits(units: readonly string[]): string[] {
  const seen = new Set<string>();
  return units.map(unit => unit.trim().replace(/\s+/g, ' ')).filter(unit => {
    const key = unitKey(unit); if (!key || seen.has(key)) return false; seen.add(key); return true;
  });
}

// A single in-memory scope: login epoch + account + Store. No persistent data.
export class ProductUnitCache {
  private entry?: { scope: string; result: UnitSuggestions; at: number; pending?: Promise<UnitSuggestions>; remembered: string[] };
  constructor(private now = () => Date.now()) {}
  clear() { this.entry = undefined; }
  remember(scope: string, unit: string) {
    if (!this.entry || this.entry.scope !== scope) this.entry = { scope, result: { units: [], complete: false, loaded: 0, total: 0, failed: false }, at: 0, remembered: [] };
    this.entry.remembered = uniqueUnits([unit, ...this.entry.remembered]);
    this.entry.result = { ...this.entry.result, units: uniqueUnits([unit, ...this.entry.result.units]) };
  }
  load(scope: string, fetchPage: FetchPage, force = false): Promise<UnitSuggestions> {
    if (this.entry?.scope !== scope) this.clear();
    if (!this.entry) this.entry = { scope, result: { units: [], complete: false, loaded: 0, total: 0, failed: false }, at: 0, remembered: [] };
    const entry = this.entry;
    if (entry.pending) return entry.pending;
    if (!force && entry.at && this.now() - entry.at < (entry.result.failed ? 30_000 : CACHE_MS)) return Promise.resolve(entry.result);
    entry.pending = (async () => {
      const units: string[] = [], ids = new Set<number>();
      let total = 0, complete = false, failed = false;
      try {
        for (let page = 0; page < UNIT_MAX_PAGES; page++) {
          if (this.entry !== entry) break;
          const response = await fetchPage({ page, pageSize: UNIT_PAGE_SIZE, sortBy: 'name', sortDirection: 'asc' });
          if (this.entry !== entry) break;
          total = response.totalElements;
          if (response.page !== page) break;
          const before = ids.size;
          for (const product of response.content) { ids.add(product.id); units.push(product.unit); }
          if (page + 1 >= response.totalPages) { complete = ids.size >= total; break; }
          if (!response.content.length || ids.size === before) break;
        }
      } catch { failed = true; }
      const result = { units: uniqueUnits([...entry.remembered, ...units, ...(failed ? entry.result.units : [])]), complete, loaded: ids.size, total, failed };
      entry.result = result; entry.at = this.now();
      return result;
    })().finally(() => { entry.pending = undefined; });
    return entry.pending;
  }
}
