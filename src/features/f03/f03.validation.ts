import { decimalText, type F03Decimal } from './f03.decimal';
import type { F03Config, F03MatrixPage, F03Policy, SeasonRequest } from './f03.api';

export type SalesPeriod = { rangeStart: string; rangeEnd: string; asOfDate: string };
export type ConfigDraft = { alpha: string; beta: string; lambda: string; salesWindowDays: string };
export type SeasonDraft = { name: string; startDate: string; endDate: string; weight: string };
export function millionths(value: string): bigint | null {
  if (!/^\d+(?:\.\d{1,6})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0'));
}
export function validScore(value: string): boolean { const n = millionths(value); return n !== null && n <= 1000000n; }
// Expand JSON numbers for exact millionths comparisons, including large policy limits.
export const decimalNumber = (value: F03Decimal): string => decimalText(value);
export function validLambda(value: string): boolean {
  const exact = millionths(value);
  return value.split('.')[0].replace(/^0+/, '').length <= 24 && exact !== null;
}
export function enabledTotal(draft: Pick<ConfigDraft, 'alpha' | 'beta'>): bigint { return (millionths(draft.alpha) ?? 0n) + (millionths(draft.beta) ?? 0n); }
export function configErrors(draft: ConfigDraft, policy: F03Policy): string[] {
  const errors: string[] = [];
  if (![draft.alpha, draft.beta].every(validScore)) errors.push('Expiry and Season Importance must each be between 0 and 1, with at most 6 decimal places.');
  if (enabledTotal(draft) !== 1000000n) errors.push('Expiry and Season Importance must total exactly 1 (100%).');
  if (!validLambda(draft.lambda) || millionths(draft.lambda)! > (millionths(decimalNumber(policy.lambdaMax)) ?? -1n)) errors.push(`Priority Strength must be between 0 and ${policy.lambdaMax}, with at most 6 decimal places and no loss of numeric precision.`);
  if (!/^\d+$/.test(draft.salesWindowDays) || Number(draft.salesWindowDays) < 1 || Number(draft.salesWindowDays) > 365) errors.push('Sales Window must be a whole number between 1 and 365 days.');
  return errors;
}
export function complement(value: string): string | null {
  const n = millionths(value); if (n === null || n > 1000000n) return null;
  const other = 1000000n - n; return `${other / 1000000n}.${String(other % 1000000n).padStart(6, '0')}`.replace(/\.?0+$/, '');
}
export function validDate(value: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) > 0 && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
export function periodError(dates: SalesPeriod): string { if (!Object.values(dates).every(validDate)) return 'Enter a valid Start Date, End Date and Analysis Date.'; return dates.rangeStart > dates.rangeEnd ? 'Start Date must be on or before End Date.' : ''; }
export function seasonErrors(draft: SeasonDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.name.trim() || draft.name.trim().length > 100) errors.name = 'Enter a season name with at most 100 characters.';
  if (!validDate(draft.startDate)) errors.startDate = 'Enter a valid start date.';
  if (!validDate(draft.endDate) || draft.startDate > draft.endDate) errors.endDate = 'End date must be on or after the start date.';
  if (!validScore(draft.weight)) errors.weight = 'Season Weight must be between 0 and 1, with at most 6 decimal places.';
  return errors;
}
export function seasonRequest(draft: SeasonDraft): SeasonRequest { if (Object.keys(seasonErrors(draft)).length) throw new Error('Check the season fields before saving.'); return { name: draft.name.trim(), startDate: draft.startDate, endDate: draft.endDate, weight: Number(draft.weight) }; }
export function previewEligible(preview: F03MatrixPage | null): boolean { return Boolean(preview?.ready && preview.totalElements > 0 && preview.totalWeightedUtility !== null); }
export function draftFromConfig(config: F03Config): ConfigDraft { return { alpha: String(config.alpha), beta: String(config.beta), lambda: decimalNumber(config.lambda), salesWindowDays: String(config.salesWindowDays) }; }
