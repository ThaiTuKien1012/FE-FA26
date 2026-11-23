/** F03 wire decimals only; independent of the F05/F06 readers. */
export type F03Decimal = number | string;
const tokenPattern = /"(?:[^"\\]|\\.)*"|(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
const decimalKeys = new Set(['alpha','beta','gamma','lambda','lambdaMin','lambdaMax','weight','expiryRisk','seasonWeight','weightValue','baseUtility','stockScore','expiryScore','seasonalScore','weightedUtility','transactionUtility','totalWeightedUtility','dailySalesRate','riskQuantity','expectedSoldQuantity','score']);

export function decimalText(value: F03Decimal): string {
  const source = String(value);
  const m = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(source);
  if (!m) throw new Error('Invalid F03 decimal.');
  const [, sign, whole, fraction = '', exponent = '0'] = m;
  const point = BigInt(whole.length) + BigInt(exponent);
  if (point < -1000n || point > 1000n) throw new Error('F03 decimal exponent exceeds the supported contract range.');
  const digits = whole + fraction, n = Number(point); // bounded string index only
  const expanded = n <= 0 ? '0.' + '0'.repeat(-n) + digits : n >= digits.length ? digits + '0'.repeat(n-digits.length) : digits.slice(0,n)+'.'+digits.slice(n);
  const [integer, decimals = ''] = expanded.split('.');
  const normalized = (integer.replace(/^0+(?=\d)/,'') || '0') + (decimals.replace(/0+$/,'') ? '.'+decimals.replace(/0+$/,'') : '');
  return (sign && /[1-9]/.test(normalized) ? '-' : '') + normalized;
}
export function compareDecimal(a: F03Decimal, b: F03Decimal): number {
  const x=decimalText(a), y=decimalText(b), scale=Math.max(x.split('.')[1]?.length ?? 0,y.split('.')[1]?.length ?? 0);
  const integer=(s:string)=>{const [w,f='']=s.split('.');return BigInt((w.startsWith('-')?'-':'')+w.replace('-','')+f.padEnd(scale,'0'));};
  const left=integer(x), right=integer(y); return left<right?-1:left>right?1:0;
}
export function formatDecimal(value: F03Decimal): string {
  const [whole, fraction] = decimalText(value).split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g,',') + (fraction ? '.'+fraction : '');
}

/** Protect tokens before JSON.parse. Only contract BigDecimal keys may retain
 * exact strings; unsafe integer identifiers/counts fail closed, never round. */
export function parseF03Json(source: string): unknown {
  const strings = new Set<string>();
  for(const t of source.matchAll(tokenPattern)) if(t[1]===undefined) strings.add(JSON.parse(t[0]));
  let marker='\0f03-number'; while(strings.has(marker)) marker+='_';
  const tokens:string[]=[];
  const protectedJson=source.replace(tokenPattern,(token, numeric:string|undefined)=>numeric===undefined?token:JSON.stringify({[marker]:tokens.push(numeric)-1}));
  return JSON.parse(protectedJson,(key,value)=>{
    if(!value || typeof value!=='object' || Object.keys(value).length!==1 || !Object.hasOwn(value,marker)) return value;
    const raw=tokens[value[marker]], text=decimalText(raw);
    if(decimalKeys.has(key)) {
      // A conservative round-trip domain. Preserve longer tokens before Number.
      if(text.replace(/[-.]/g,'').length>15) return text;
      const numeric=Number(text);
      return decimalText(numeric)===text?numeric:text;
    }
    if(!/^-?\d+$/.test(text) || BigInt(text)>9007199254740991n || BigInt(text)<-9007199254740991n) throw new Error('The server returned an unsafe F03 integer. No rounded ID or count was used.');
    return Number(text);
  });
}

/** Explicit decimal fields become JSON numeric tokens, never quoted strings. */
export function decimalBody(body: Record<string, unknown>, fields: readonly string[]): string {
  return '{'+Object.entries(body).filter(([,v])=>v!==undefined).map(([key,value])=>{
    if(fields.includes(key)) {
      if(typeof value!=='number' && typeof value!=='string') throw new Error('Invalid decimal request field.');
      return JSON.stringify(key)+':'+decimalText(value);
    }
    return JSON.stringify(key)+':'+JSON.stringify(value);
  }).join(',')+'}';
}
