/** Only consume an image location actually advertised by the authorized Product
 * response. Never synthesize an image route or attach tokens to external URLs. */
export function recommendationProductImage(value: unknown): string | null {
  if(typeof value!=='string'||!value.trim())return null;
  const text=value.trim();
  if(text.startsWith('/')&&!text.startsWith('//'))return text;
  try { const url=new URL(text);return /^https?:$/.test(url.protocol)&&!url.username&&!url.password?url.href:null; }
  catch { return null; }
}
