import { formatExactMining, type MiningNumber } from './f05.precision';
import { formatDateTime } from '../../utils/dateTime';
import { F05ApiError } from './f05.api';
import type { Algorithm, MinUtilMode } from './f05.types';

export const miningButton = 'rounded-xl border border-[#E7E2D8] bg-white px-4 py-2 text-sm font-semibold text-[#1E3A2F] hover:bg-[#EDF5F0] disabled:cursor-not-allowed disabled:opacity-50';
export const algorithmName = (algorithm: Algorithm) => algorithm === 'HUI_MINER' ? 'HUI-Miner' : 'EFIM';
export const miningPrimaryButton = 'inline-flex items-center justify-center rounded-xl bg-[#1E3A2F] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2D604A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54] disabled:cursor-not-allowed disabled:opacity-50';
export const miningInput = 'mt-2 w-full rounded-xl border border-[#E7E2D8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#356B54] focus:ring-2 focus:ring-[#356B54]/15 disabled:bg-[#F4F1EC] disabled:text-[#6D7974]';
export const thresholdLabel = (mode: MinUtilMode) => mode === 'PERCENTAGE' ? 'Percentage' : 'Absolute Value';
export const formatMiningNumber = (value: MiningNumber | null | undefined, maximumFractionDigits?: number) => value == null ? 'Not measured' : formatExactMining(value, maximumFractionDigits);
export const formatThreshold = (value: MiningNumber, mode: MinUtilMode) => formatMiningNumber(value) + (mode === 'PERCENTAGE' ? '%' : ' frozen utility units');
export const MATCH_DESCRIPTION = 'Both algorithms returned matching high-utility itemsets and utility values.';

export function miningDate(value: string | null, seconds = true): string {
  if (value === null) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatDateTime(date, undefined, seconds);
}

export function miningErrorMessage(error: unknown): string {
  if (!(error instanceof F05ApiError)) return error instanceof Error ? error.message : 'The mining operation could not be completed.';
  if (error.status === null) return 'Could not connect to the mining service or read its response. Check your connection and backend availability, then try again manually.';
  const help: Record<number, string> = {
    400: 'Check the snapshot and mining settings.',
    401: 'Your session is missing or has expired. Please sign in again.',
    403: 'Access denied for this role or Store. System Admin manages mining policy; Merchandisers submit for their own Store.',
    404: 'The snapshot or mining resource is missing or unavailable to your store.',
    409: 'The configuration version is stale, the request key conflicts with another payload, or the snapshot is unavailable. Refresh before another action.',
    503: 'The mining service is unavailable. It may require backend or mining runtime recovery.'
  };
  if (error.status === 409 && /configure mining policy|not configured/i.test(error.message)) return `Contact a System Admin to configure minimum utility before running mining. ${error.message} (HTTP 409)`;
  if (error.status === 409 && /lambda policy changed|snapshot exceeds/i.test(error.message)) return `This snapshot no longer meets the current Lambda Policy. Ask a Merchandiser to prepare a new snapshot; its saved data has not been changed. ${error.message} (HTTP 409)`;
  const advice = help[error.status] ?? (error.status >= 500 ? 'The mining service is unavailable. Check backend availability before retrying.' : '');
  const status = error.message.includes(`HTTP ${error.status}`) ? '' : ` (HTTP ${error.status})`;
  return `${advice ? `${advice} ` : ''}${error.message}${status}`;
}
