import { parseSafeMiningJson } from '../f05/f05.numbers';

const jsonToken = /"(?:[^"\\]|\\.)*"|(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
const numericParts = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/;

/** Read-only JSON number: never coerce its value or silently quote it in a write. */
export class ExactRecommendationNumber {
  private constructor(readonly source: string) { Object.freeze(this); }
  static fromJson(source: string): ExactRecommendationNumber {
    if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(source)) throw new SyntaxError('Invalid exact recommendation number.');
    return new ExactRecommendationNumber(source);
  }
  toString(): string { return recommendationDecimalText(this.source); }
  valueOf(): never { throw new TypeError('An exact recommendation number cannot be coerced to Number.'); }
  toJSON(): never { throw new TypeError('An exact read-only recommendation number cannot be serialized implicitly.'); }
}

/** Move decimal digits only. Huge exponents stay in exact scientific notation
 * instead of allocating an unbounded display string; no business rounding. */
export function recommendationDecimalText(source: string, shift = 0): string {
  const match = numericParts.exec(source);
  if (!match) throw new SyntaxError('Invalid recommendation decimal.');
  const [, sign, whole, fraction = '', exponent = '0'] = match;
  const power = BigInt(exponent) + BigInt(shift), point = BigInt(whole.length) + power;
  if (point < -1000n || point > 1000n) return `${sign}${whole}${fraction ? '.' + fraction : ''}e${power}`;
  const digits = whole + fraction, position = Number(point); // bounded digit index, never the value
  const expanded = position <= 0 ? '0.' + '0'.repeat(-position) + digits : position >= digits.length
    ? digits + '0'.repeat(position - digits.length) : digits.slice(0, position) + '.' + digits.slice(position);
  const [integer, decimals] = expanded.split('.');
  return sign + (integer.replace(/^0+(?=\d)/, '') || '0') + (decimals === undefined ? '' : '.' + decimals);
}

function readNumber(source: string): number | ExactRecommendationNumber {
  const [, , whole, fraction = '', exponent = '0'] = numericParts.exec(source)!;
  const digits = (whole + fraction).replace(/^0+/, '') || '0';
  const point = BigInt(digits.length) + BigInt(exponent) - BigInt(fraction.length);
  // Compare magnitude as digits/BigInt before converting any numeric value.
  if (digits !== '0' && (point > 16n || point === 16n && (
    BigInt(digits.slice(0, 16).padEnd(16, '0')) > 9007199254740991n ||
    BigInt(digits.slice(0, 16).padEnd(16, '0')) === 9007199254740991n && /[1-9]/.test(digits.slice(16))
  ))) return ExactRecommendationNumber.fromJson(source);
  try { return parseSafeMiningJson(source) as number; }
  catch { return ExactRecommendationNumber.fromJson(source); }
}

/** Protect numeric tokens before JSON.parse loses digits. Reuse F05's guard for
 * numbers that round-trip safely; preserve other numbers in an exact wrapper.
 * F06 validators accept wrappers only in Decimal fields. Int64 IDs/counts still
 * require safe integers, and quoted numeric strings never become numbers.
 * A marker absent from every decoded input string/key prevents collisions. */
export function parseRecommendationJson(source: string): unknown {
  const strings = new Set<string>();
  for (const token of source.matchAll(jsonToken)) if (token[1] === undefined) strings.add(JSON.parse(token[0]) as string);
  let marker = '\0paspm-number';
  while (strings.has(marker)) marker += '_';
  const values: Array<number | ExactRecommendationNumber> = [];
  const protectedJson = source.replace(jsonToken, (token, number: string | undefined) => {
    if (number === undefined) return token;
    const index = values.push(readNumber(number)) - 1;
    return JSON.stringify({ [marker]: index });
  });
  return JSON.parse(protectedJson, (_key, value: unknown) => {
    if (value && typeof value === 'object' && Object.keys(value).length === 1 && Object.hasOwn(value, marker)) {
      return values[(value as Record<string, number>)[marker]];
    }
    return value;
  }) as unknown;
}
