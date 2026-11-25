import type { Decimal } from './f06.types';
import { ExactRecommendationNumber, recommendationDecimalText } from './f06.numbers';

export const recommendationNumber = (value: Decimal | null | undefined) => {
  if (value == null) return 'N/A';
  if (!(value instanceof ExactRecommendationNumber)) return value.toLocaleString('en-US', { maximumSignificantDigits: 21 });
  const text = String(value);
  if (/[eE]/.test(text)) return text;
  const [whole, fraction] = text.split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction === undefined ? '' : '.' + fraction);
};
export function recommendationPercent(value: Decimal | null | undefined): string {
  if (value == null || typeof value === 'number' && !Number.isFinite(value)) return 'N/A';
  if (value instanceof ExactRecommendationNumber) return recommendationDecimalText(value.source, 2).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') + '%';
  const [, sign, whole, fraction = '', exponent = '0'] = String(value).match(/^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i)!;
  const digits = whole + fraction;
  const point = whole.length + Number(exponent) + 2;
  const shifted = point <= 0 ? `0.${'0'.repeat(-point)}${digits}` : point >= digits.length
    ? digits + '0'.repeat(point - digits.length) : `${digits.slice(0, point)}.${digits.slice(point)}`;
  const [integer, decimal = ''] = shifted.split('.');
  const tail = decimal.replace(/0+$/, '');
  return `${sign}${integer.replace(/^0+(?=\d)/, '')}${tail ? `.${tail}` : ''}%`;
}
