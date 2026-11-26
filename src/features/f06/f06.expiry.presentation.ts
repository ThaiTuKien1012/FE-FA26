import type { RecExpiryBatch } from './f06.types';
import { recommendationNumber } from './f06.format';

/** Gregorian calendar arithmetic only: no browser timezone, instants or elapsed milliseconds. */
export function calendarDay(value:string|null|undefined):number|null {
  const match=value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!match)return null;
  const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
  const leap=year%4===0&&(year%100!==0||year%400===0),months=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  if(year<1||month<1||month>12||day<1||day>months[month-1])return null;
  const previous=year-1;
  return 365*previous+Math.floor(previous/4)-Math.floor(previous/100)+Math.floor(previous/400)+months.slice(0,month-1).reduce((sum,n)=>sum+n,0)+day-1;
}
export function daysUntilExpiry(expiryDate:string|null,asOfDate:string):number|null {
  const expiry=calendarDay(expiryDate),asOf=calendarDay(asOfDate);return expiry===null||asOf===null?null:expiry-asOf;
}
export const quantityLabel=(value:number,unit:string,plural=unit+'s')=>`${recommendationNumber(value)} ${value===1?unit:plural}`;
export function pushDayLabel(days:number):string {
  if(!Number.isSafeInteger(days))return 'Push Day information unavailable';
  return days===0?'Push Day is today':days<0?`Push Day overdue by ${quantityLabel(-days,'day')}`:`Push Day in ${quantityLabel(days,'day')} — check this alert`;
}
export function expiryLabel(expiryDate:string|null,asOfDate:string):string {
  if(expiryDate===null)return 'Expiry date not recorded';
  const days=daysUntilExpiry(expiryDate,asOfDate);
  return days===null?'Expiry date unavailable':days===0?'Expires today':days<0?`Expiry date passed ${quantityLabel(-days,'day')} ago`:`${quantityLabel(days,'day')} left`;
}
/** Positive evidence only. Unknown, future or inconsistent rows never imply current priority. */
export function confirmedDueBatch(batch:RecExpiryBatch,asOfDate:string):boolean {
  const today=calendarDay(asOfDate),push=calendarDay(batch.pushDay),expiry=batch.expiryDate===null?null:calendarDay(batch.expiryDate);
  return today!==null&&push!==null&&push<=today&&Number.isSafeInteger(batch.daysToPush)&&batch.daysToPush<=0&&batch.pushRequired&&batch.remainingQuantity>0&&
    (batch.expiryDate===null||expiry!==null&&expiry>=today);
}
export interface MissingPushDayWarning { productId:number;batchIds:number[];original:string; }
export function missingPushDayWarning(message:string):MissingPushDayWarning|null {
  const match=message.match(/^Product\s+(\d+):\s*batches\s*\[([\d,\s]+)\]\s*have no push day\s*$/i);if(!match)return null;
  const productId=Number(match[1]),batchIds=match[2].split(',').map(value=>Number(value.trim()));
  if(!Number.isSafeInteger(productId)||productId<1||productId>2147483647||!batchIds.length||batchIds.some(id=>!Number.isSafeInteger(id)||id<1||id>2147483647))return null;
  return{productId,batchIds:[...new Set(batchIds)],original:message};
}
