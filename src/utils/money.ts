/** Round currency for display only. Intl's default halfExpand rounds ties away from zero (HALF_UP). */
export function formatWholeVnd(value: number, locale?: string, style: 'decimal' | 'currency' = 'decimal'): string {
  return new Intl.NumberFormat(locale, {
    style, currency: 'VND', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}
