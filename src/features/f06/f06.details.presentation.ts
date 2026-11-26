import type { Decimal, RecView } from './f06.types';
import { recommendationNumber, recommendationPercent } from './f06.format';

/** Display-only HALF_UP to two percentage places, using decimal digits. The exact
 * recorded percentage remains available to the caller. Never re-evaluates a rule. */
export function detailPercentage(value:Decimal|null|undefined){
  const exact=recommendationPercent(value);
  const match=exact.match(/^(\d+)(?:\.(\d+))?%$/);
  if(!match)return{display:exact,exact};
  const fraction=match[2]??'',nonzero=/[1-9]/.test(match[1]+fraction);
  if(match[1]==='0'&&(fraction+'00').slice(0,2)==='00'&&nonzero)return{display:'<0.01%',exact};
  let hundredths=BigInt(match[1])*100n+BigInt((fraction+'00').slice(0,2));
  if(fraction.length>2&&fraction[2]>='5')hundredths++;
  const tail=(hundredths%100n).toString().padStart(2,'0').replace(/0+$/,'');
  return{display:String(hundredths/100n)+(tail?'.'+tail:'')+'%',exact};
}

/** inventoryChanged also covers Store date and batch metadata. Compare only
 * observable recorded fields; never claim that the fingerprint proves stock changed. */
export function detailAvailabilityChanges(item:RecView,names:Record<number,string>={}){
  if(!item.inventoryChanged)return[];
  return item.currentEligibility.products.flatMap(current=>{
    const previous=item.generationEligibility.products.find(product=>product.productId===current.productId);
    if(!previous||previous.sellableQuantity===current.sellableQuantity)return[];
    return[`${names[current.productId]||'A product'}: sellable stock was ${recommendationNumber(previous.sellableQuantity)} when saved; now ${recommendationNumber(current.sellableQuantity)}.`];
  });
}
