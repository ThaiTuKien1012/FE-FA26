import type { F03Config, F03MatrixPage, F03Policy } from './f03.api';

export type SalesPeriod = { rangeStart: string; rangeEnd: string; asOfDate: string };
export type ConfigDraft = Pick<F03Config, 'enableStock' | 'enableExpiry' | 'enableSeason'> & {
  alpha: string; beta: string; gamma: string; lambda: string;
};

// Backend @Digits(fraction=6). Integer millionths make the sum check exact.
export function millionths(value: string): bigint | null {
  if (!/^\d+(?:\.\d{1,6})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0'));
}
export function validScore(value: string): boolean {
  const scaled = millionths(value);
  return scaled !== null && scaled <= 1000000n;
}
export function enabledTotal(draft: ConfigDraft): bigint {
  return (draft.enableStock ? millionths(draft.alpha) ?? 0n : 0n)
    + (draft.enableExpiry ? millionths(draft.beta) ?? 0n : 0n)
    + (draft.enableSeason ? millionths(draft.gamma) ?? 0n : 0n);
}
export function configErrors(draft: ConfigDraft, policy: F03Policy): string[] {
  const errors: string[] = [];
  if (![draft.alpha, draft.beta, draft.gamma].every(validScore)) errors.push('Each importance must be between 0 and 1, with at most 6 decimal places.');
  if ((draft.enableStock || draft.enableExpiry || draft.enableSeason) && enabledTotal(draft) !== 1000000n) errors.push('Enabled importance values must total exactly 1 (100%).');
  const lambda = millionths(draft.lambda);
  if (lambda === null || draft.lambda.split('.')[0].replace(/^0+/, '').length > 24 || Number(draft.lambda) < policy.lambdaMin || Number(draft.lambda) > policy.lambdaMax) errors.push(`Priority Strength must be between ${policy.lambdaMin} and ${policy.lambdaMax}, with at most 6 decimal places.`);
  return errors;
}
function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) > 0 && Number(value.slice(0, 4)) <= 9999 && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function periodError(dates: SalesPeriod): string {
  if (!Object.values(dates).every(validDate)) return 'Enter a valid Start Date, End Date and Analysis Date.';
  return dates.rangeStart > dates.rangeEnd ? 'Start Date must be on or before End Date.' : '';
}
export function previewEligible(preview: F03MatrixPage | null): boolean {
  // Warnings can be informational. Preserve backend ready semantics.
  return Boolean(preview?.ready && preview.totalElements > 0 && preview.totalWeightedUtility !== null);
}
export function draftFromConfig(config: F03Config): ConfigDraft {
  return { enableStock: config.enableStock, enableExpiry: config.enableExpiry, enableSeason: config.enableSeason,
    alpha: String(config.alpha), beta: String(config.beta), gamma: String(config.gamma), lambda: String(config.lambda) };
}
