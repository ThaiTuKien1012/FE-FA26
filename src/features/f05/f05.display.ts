import { F05ApiError } from './f05.api';
import type { Algorithm } from './f05.types';

export const miningButton = 'rounded-xl border border-[#E7E2D8] bg-white px-4 py-2 text-sm font-semibold text-[#1E3A2F] hover:bg-[#EDF5F0] disabled:cursor-not-allowed disabled:opacity-50';
export const algorithmName = (algorithm: Algorithm) => algorithm === 'HUI_MINER' ? 'HUI-Miner' : 'EFIM';

export function miningDate(value: string | null): string {
  if (value === null) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'medium' }).format(date);
}

export function miningErrorMessage(error: unknown): string {
  if (!(error instanceof F05ApiError)) return error instanceof Error ? error.message : 'The mining operation could not be completed.';
  if (error.status === null) return 'Could not connect to the mining service or read its response. Check your connection and backend availability, then try again manually.';
  const help: Record<number, string> = {
    400: 'Check the snapshot and mining settings.',
    401: 'Your session is missing or has expired. Please sign in again.',
    403: 'Access denied. Use an authorized Store Admin or Merchandiser account for this store; only Merchandisers can submit.',
    404: 'The snapshot or mining resource is missing or unavailable to your store.',
    409: 'The request key conflicts with another payload, or the frozen snapshot is unavailable.',
    503: 'The mining service is unavailable. It may require backend or mining runtime recovery.'
  };
  const advice = help[error.status] ?? (error.status >= 500 ? 'The mining service is unavailable. Check backend availability before retrying.' : '');
  const status = error.message.includes(`HTTP ${error.status}`) ? '' : ` (HTTP ${error.status})`;
  return `${advice ? `${advice} ` : ''}${error.message}${status}`;
}
