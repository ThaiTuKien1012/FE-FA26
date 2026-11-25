import { warningText } from './components/F03Shared';

export interface SnapshotWarningGroup { original: string; count: number; }
/** Group exact duplicates only; retain every original message and its count. */
export function groupSnapshotWarnings(warnings: readonly string[]): SnapshotWarningGroup[] {
  const grouped = new Map<string, number>();
  for (const original of warnings) grouped.set(original, (grouped.get(original) ?? 0) + 1);
  return [...grouped].map(([original, count]) => ({ original, count }));
}
export function snapshotWarningProductId(warning: string): number | null {
  const match = /^Product (\d+):/.exec(warning);
  return match ? Number(match[1]) : null;
}
export function snapshotWarningExplanation(original: string, names: Record<number, string> = {}): string {
  const productId = snapshotWarningProductId(original);
  const explanation = warningText(original);
  return productId !== null && names[productId]
    ? explanation.replace(/^Product \d+:/, () => `${names[productId]} (Product #${productId}):`)
    : explanation;
}
