/** UI boundary helpers. Date-only values are calendar parts, never instants. */
export interface CalendarDate { year: number; month: number; day: number; }
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (value: number) => String(value).padStart(2, '0');
export function daysInMonth(year: number, month: number): number {
  return month === 2 ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;
}
export function parseDateOnly(value: string | null | undefined): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  return year >= 1 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month) ? { year, month, day } : null;
}
export function calendarIso({ year, month, day }: CalendarDate): string { return `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`; }
export function isoDateToDisplay(value: string | null | undefined): string {
  const date = parseDateOnly(value); return date ? `${pad(date.day)}/${pad(date.month)}/${String(date.year).padStart(4, '0')}` : '';
}
export function displayDateToIso(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`; return parseDateOnly(iso) ? iso : null;
}
export const isValidDisplayDate = (value: string) => displayDateToIso(value) !== null;
export const formatDate = (value: string | null | undefined, fallback = '—') => isoDateToDisplay(value) || fallback;
export function formatFriendlyDate(value: string | null | undefined, withYear = true): string {
  const date = parseDateOnly(value); return date ? `${pad(date.day)} ${MONTHS[date.month - 1]}${withYear ? ` ${String(date.year).padStart(4, '0')}` : ''}` : '—';
}
export function formatDateRange(start: string | null | undefined, end: string | null | undefined, friendly = false): string {
  if (!friendly) return `${formatDate(start)} – ${formatDate(end)}`;
  const sameYear = parseDateOnly(start)?.year === parseDateOnly(end)?.year;
  return `${formatFriendlyDate(start, !sameYear)} – ${formatFriendlyDate(end)}`;
}
export function dateInputError(display: string, options: { required?: boolean; min?: string; max?: string } = {}): string {
  if (!display) return options.required ? 'Enter a date in dd/mm/yyyy format.' : '';
  const iso = displayDateToIso(display);
  if (!iso) return 'Enter a valid date in dd/mm/yyyy format.';
  if (options.min && parseDateOnly(options.min) && iso < options.min) return `Choose a date on or after ${formatDate(options.min)}.`;
  if (options.max && parseDateOnly(options.max) && iso > options.max) return `Choose a date on or before ${formatDate(options.max)}.`;
  return '';
}
export function formatDateTime(value: string | Date | null | undefined, timeZone?: string, seconds = false): string {
  if (typeof value === 'string' && parseDateOnly(value)) return formatDate(value);
  const instant = value instanceof Date ? value : value ? new Date(value) : null;
  if (!instant || !Number.isFinite(instant.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}), hourCycle: 'h23', ...(timeZone ? { timeZone } : {}) }).formatToParts(instant);
  const part = (type: string) => parts.find(value => value.type === type)?.value || '';
  return `${part('day')}/${part('month')}/${part('year').padStart(4, '0')} ${part('hour')}:${part('minute')}${seconds ? `:${part('second')}` : ''}`;
}
export function formatUtcDateTime(value: string | null | undefined): string { const display = formatDateTime(value, 'UTC'); return display === '—' ? display : `${display} UTC`; }
export function localDateTimeToDisplay(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value);
  return match && parseDateOnly(match[1]) && validTime(match[2]) ? `${isoDateToDisplay(match[1])} ${match[2]}` : '';
}
export function validTime(value: string): boolean { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value); }
export function displayDateTimeToLocal(value: string): string | null {
  const match = /^(\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2})$/.exec(value);
  if (!match || !validTime(match[2])) return null;
  const iso = displayDateToIso(match[1]); return iso ? `${iso}T${match[2]}` : null;
}
// Calendar arithmetic only; UTC is a neutral carrier, not a date-only display zone.
export function moveCalendarDay(iso: string, amount: number): string {
  const date = parseDateOnly(iso); if (!date) return iso;
  const carrier = new Date(0); carrier.setUTCFullYear(date.year, date.month - 1, date.day + amount); carrier.setUTCHours(0, 0, 0, 0);
  const next = calendarIso({ year: carrier.getUTCFullYear(), month: carrier.getUTCMonth() + 1, day: carrier.getUTCDate() });
  return parseDateOnly(next) ? next : iso;
}
export function calendarWeekday(iso: string): number {
  const date = parseDateOnly(iso); if (!date) return 0;
  const carrier = new Date(0); carrier.setUTCFullYear(date.year, date.month - 1, date.day); return (carrier.getUTCDay() + 6) % 7;
}

/** Browser-local time-only labels; never changes the underlying instant. */
export function formatTime(value: Date, seconds = false): string { return formatDateTime(value, undefined, seconds).split(' ')[1] || '—'; }
