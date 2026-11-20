import type { F03Config, F03MatrixItem, F03MatrixPage } from './f03.api';
import { isFefoEvidence } from './f03.api';
import { decimalNumber, millionths, type ConfigDraft } from './f03.validation';

export const utilityNumber = (value: number | null | undefined) => value == null ? 'Unavailable' : value.toLocaleString('en-GB', { maximumFractionDigits: 20 });
export function configDraftDirty(draft: ConfigDraft, saved: F03Config): boolean {
  return (['alpha', 'beta', 'lambda'] as const).some(key => millionths(draft[key]) !== millionths(decimalNumber(saved[key])))
    || !/^\d+$/.test(draft.salesWindowDays) || Number(draft.salesWindowDays) !== saved.salesWindowDays;
}
export function previewNotice(reason: string, unsavedSettings: boolean): string {
  if (!reason) return '';
  return unsavedSettings ? 'Weight Settings have unsaved changes. Save them in Weight Settings before calculating a new Preview.' : reason;
}
export function tenthImportance(value: string): string | null {
  const exact = millionths(value);
  return exact !== null && exact <= 1000000n && exact % 100000n === 0n ? Number(value).toFixed(1) : null;
}
/** Controls are a display projection only. Keep the original draft for Save
 * until the user explicitly edits an importance control. */
export function importanceControls(draft: Pick<ConfigDraft, 'alpha' | 'beta'>) {
  const exact = millionths(draft.alpha);
  if (exact === null || exact > 1000000n) return { alpha: draft.alpha, beta: draft.beta };
  const tenths = (exact + 50000n) / 100000n;
  return { alpha: (Number(tenths) / 10).toFixed(1), beta: (Number(10n - tenths) / 10).toFixed(1) };
}
export function matrixRowWarnings(row: F03MatrixItem, warnings: string[]): string[] {
  const productWarnings = warnings.filter(warning => {
    const match = /^Product (\d+):/.exec(warning);
    return match !== null && Number(match[1]) === row.productId;
  });
  const evidence = row.expiryEvidence;
  return [...new Set([...productWarnings, ...(evidence && isFefoEvidence(evidence) ? evidence.warnings : [])])];
}
export type MatrixSortKey = 'transactionId' | 'productId' | 'quantity' | 'expiryRisk' | 'seasonWeight' | 'weightValue' | 'weightedUtility';
export type MatrixSort = { key: MatrixSortKey; direction: 'asc' | 'desc' };
export const completeMatrix = (result: F03MatrixPage) => result.page === 0 && result.items.length === result.totalElements;
export function sortMatrix(result: F03MatrixPage, sort: MatrixSort | null, names: Record<number, string> = {}): F03MatrixItem[] {
  if (!sort || !completeMatrix(result)) return [...result.items];
  return result.items.map((row, index) => ({ row, index })).sort((a, b) => {
    const x = a.row[sort.key], y = b.row[sort.key];
    if (x == null || y == null) return x == null && y == null ? a.index - b.index : x == null ? 1 : -1;
    const compared = sort.key === 'productId' ? (names[x] ?? `Product #${x}`).localeCompare(names[y] ?? `Product #${y}`, 'en', { numeric: true }) : x - y;
    return (sort.direction === 'asc' ? compared : -compared) || a.index - b.index;
  }).map(({ row }) => row);
}
