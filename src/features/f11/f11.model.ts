import { formatWholeVnd } from '../../utils/money';
import type { Period } from './f11.types';
const DAY = 86_400_000;
function dateValue(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const time = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : NaN;
}
export function shiftDate(value: string, days: number): string {
  const time = dateValue(value);
  return Number.isFinite(time) ? new Date(time + days * DAY).toISOString().slice(0, 10) : '';
}
export function defaultPeriod(now = new Date()): Period {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (name: string) => parts.find(item => item.type === name)!.value;
  const to = `${part('year')}-${part('month')}-${part('day')}`;
  return { from: shiftDate(to, -29), to };
}
export function periodError(from: string, to: string): string | null {
  const days = (dateValue(to) - dateValue(from)) / DAY + 1;
  return !Number.isFinite(days) ? 'Enter both valid dates.' : days < 1 || days > 90 ? 'Choose 1–90 days, including both dates.' : null;
}
// Intl's halfExpand is decimal HALF_UP (ties away from zero), including refunds.
export function formatVnd(value: number): string {
  return formatWholeVnd(value, 'vi-VN', 'currency');
}
export const formatScore = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 6 }).format(value);
export const formatCount = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
export function dashboardError(error: unknown): string {
  const detail = error as { status?: number; code?: string; message?: string };
  if (detail?.status === 403 && detail.code === 'STORE_INACTIVE') return 'Your Store is inactive. Please contact your administrator.';
  if (detail?.status === 403) return 'You do not have permission to view this Store data.';
  if (detail?.status === 404) return 'This resource was not found in your Store. Select it again from the refreshed list.';
  if (detail?.status === 400) return 'The server rejected these filters. Check the dates (1–90 days) and selections.';
  if (detail?.status === 401) return 'Your session changed or expired. Please sign in again.';
  if (error instanceof TypeError) return 'Unable to load data. Check your connection and retry.';
  return detail?.message || 'This panel is unavailable. Please retry.';
}
