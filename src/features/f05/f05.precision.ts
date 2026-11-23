import { decimalText, compareDecimal, formatDecimal, decimalBody } from '../f03/f03.decimal';
export { compareDecimal, decimalText, decimalBody };
export class MiningPrecisionError extends Error {}
export type MiningNumber = number | ExactMiningNumber;
/** Exact read value; implicit arithmetic and JSON writes are forbidden. */
export class ExactMiningNumber {
  private constructor(readonly source: string) { Object.freeze(this); }
  static from(source:string) { decimalText(source); return new ExactMiningNumber(source); }
  toString() { return decimalText(this.source); }
  valueOf(): never { throw new Error('An exact Mining value cannot be coerced to Number.'); }
  toJSON(): never { throw new Error('Serialize Mining decimals explicitly as JSON numeric tokens.'); }
}
export const miningText = (value:MiningNumber) => decimalText(value instanceof ExactMiningNumber ? value.source : value);
export const compareMining = (a:MiningNumber,b:MiningNumber) => compareDecimal(miningText(a),miningText(b));
export function exactMiningValue(source:string):MiningNumber {
  const text=decimalText(source);
  if (/^-?\d+$/.test(text) && BigInt(text)>=-9007199254740991n && BigInt(text)<=9007199254740991n) return Number(text);
  if(text.replace(/[-.]/g,'').length<=15) { const number=Number(text); if(decimalText(number)===text) return number; }
  return ExactMiningNumber.from(source);
}
export function isMiningNumber(value:unknown):value is MiningNumber {
  return typeof value==='number' && Number.isFinite(value) && Math.abs(value)<=Number.MAX_SAFE_INTEGER || value instanceof ExactMiningNumber;
}
export function isMiningLong(value:unknown):value is MiningNumber {
  if(!isMiningNumber(value))return false;
  const text=miningText(value);return /^\d+$/.test(text) && BigInt(text)<=9223372036854775807n;
}
export function formatExactMining(value:MiningNumber, digits?:number):string {
  if(digits===undefined) return formatDecimal(miningText(value));
  // Intentional HALF_UP presentation only (e.g. sampled heap to 2 places).
  const source=miningText(value),negative=source.startsWith('-');
  const [whole,fraction='']=source.replace('-','').split('.');
  const padded=fraction.padEnd(digits+1,'0');
  let units=BigInt(whole+padded.slice(0,digits));
  if(padded[digits]>='5')units++;
  const text=units.toString().padStart(digits+1,'0');
  return formatDecimal((negative&&units!==0n?'-':'')+(digits?text.slice(0,-digits)+'.'+text.slice(-digits):text));
}
const tokens=/"(?:[^"\\]|\\.)*"|(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
const decimals=new Set(['minUtilValue','effectiveMinUtility','totalWeightedUtility','utility','roundingUnit','memoryMiB','sellingPrice','costPrice']);
const longs=new Set(['divisor','totalScaledUtility','elapsedMs','timeoutMs','runtimeMillis']);
// Frozen F03 configuration keeps its existing decimal representation.
const frozen=new Set(['alpha','beta','gamma','lambda','lambdaMin','lambdaMax','weight']);
export function parseMiningResponse(source:string):unknown {
  const strings=new Set<string>();for(const t of source.matchAll(tokens))if(t[1]===undefined)strings.add(JSON.parse(t[0]));
  let marker='\0mining-number';while(strings.has(marker))marker+='_';
  const values:string[]=[];
  const json=source.replace(tokens,(token,number:string|undefined)=>number===undefined?token:JSON.stringify({[marker]:values.push(number)-1}));
  return JSON.parse(json,(key,value)=>{
    if(!value || typeof value!=='object' || Object.keys(value).length!==1 || !Object.hasOwn(value,marker))return value;
    const raw=values[value[marker]],text=decimalText(raw);
    if(decimals.has(key))return exactMiningValue(raw);
    if(frozen.has(key)) { const exact=exactMiningValue(raw);return exact instanceof ExactMiningNumber?miningText(exact):exact; }
    if(longs.has(key)) {
      if(!/^-?\d+$/.test(text) || BigInt(text)<-9223372036854775808n || BigInt(text)>9223372036854775807n)throw new MiningPrecisionError('Invalid int64 '+key+'.');
      return exactMiningValue(raw);
    }
    if(!/^-?\d+$/.test(text) || BigInt(text)<-9007199254740991n || BigInt(text)>9007199254740991n)
      throw new MiningPrecisionError('Mining field '+key+' = '+text+' cannot be used safely for navigation, lookup or pagination (maximum 9007199254740991). No rounded value was used.');
    return Number(text);
  });
}
