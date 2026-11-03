import type { MinUtilMode } from './f05.types';

export class F05NumberError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'F05NumberError';
  }
}

/** Parse a URL ID before converting it to number; never navigate using a rounded long. */
export function parseMiningId(text: string): number {
  if (!/^[1-9]\d*$/.test(text) || text.length > 16 || BigInt(text) > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new F05NumberError('Request ID must be a positive safe integer (at most 9007199254740991). An unsafe long ID cannot be opened.');
  }
  return Number(text);
}

// Compare decimal values without converting their digits to floating point.
// Exponents and trailing zeros affect representation, not the identity of a value.
function decimalIdentity(text: string): string {
  const negative = text.startsWith('-');
  const [coefficient, exponent = '0'] = text.replace(/^-/, '').toLowerCase().split('e');
  const fractionLength = coefficient.split('.')[1]?.length ?? 0;
  const digits = coefficient.replace('.', '').replace(/^0+/, '');
  if (!digits) return '0';
  const significant = digits.replace(/0+$/, '');
  const power = Number(exponent) - fractionLength + digits.length - significant.length;
  return `${negative ? '-' : ''}${significant}e${power}`;
}

function isSafeNumber(text: string): boolean {
  const value = Number(text);
  return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER &&
    decimalIdentity(text) === decimalIdentity(JSON.stringify(value));
}

/** JSON numbers remain numbers. Reject a response if parsing would change a
 * decimal's value or use an integer outside the browser's safe integer range.
 * Strings (including quoted IDs, dates and error messages) are skipped.
 */
export function parseSafeMiningJson(text: string): unknown {
  const data: unknown = JSON.parse(text);
  const tokens = /"(?:[^"\\]|\\.)*"|(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  for (const token of text.matchAll(tokens)) {
    if (token[1] !== undefined && !isSafeNumber(token[1])) {
      throw new F05NumberError('The server returned a number that this client cannot preserve safely. This response was not used; no rounded values will be displayed.');
    }
  }
  return data;
}

/** Validate the original input string before producing the numeric JSON value. */
export function parseMinUtilInput(input: string, mode: MinUtilMode): number {
  const text = input.trim();
  if (!/^\d+(?:\.\d{1,6})?$/.test(text)) {
    throw new F05NumberError('Enter a positive decimal with at most 6 fractional digits. Use a decimal point, without commas or exponent notation.');
  }
  const [whole, fraction = ''] = text.split('.');
  const integer = whole.replace(/^0+/, '') || '0';
  if (integer.length > 24) throw new F05NumberError('Minimum utility accepts at most 24 integer digits.');
  if (!/[1-9]/.test(text)) throw new F05NumberError('Minimum utility must be greater than 0.');
  if (mode !== 'PERCENTAGE' && mode !== 'ABSOLUTE') throw new F05NumberError('Select a supported minimum utility mode.');
  if (mode === 'PERCENTAGE' && (BigInt(integer) > 100n || (BigInt(integer) === 100n && /[1-9]/.test(fraction)))) {
    throw new F05NumberError('Percentage minimum utility must be greater than 0 and at most 100. A value of 0.5 means 0.5%.');
  }
  if (!isSafeNumber(text)) {
    throw new F05NumberError('This decimal cannot be sent without losing precision. Use a value within 9007199254740991 that can be serialized unchanged; fewer significant digits may be needed. The value has not been rounded.');
  }
  return Number(text);
}
