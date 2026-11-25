import type { RecType, RecView } from './f06.types';
import { recommendationNumber, recommendationPercent } from './f06.format';

/** Presentation only. Qualification, eligibility and ranking remain server decisions. */
export const recommendationTypeCopy: Record<RecType, { title: string; description: string; purpose: string }> = {
  BUNDLE: { title: 'Bundle', description: 'Suggest groups of products to offer together.', purpose: 'Offer as a group' },
  CROSS_SELL: { title: 'Cross-sell', description: 'Suggest additional products based on what a customer buys.', purpose: 'Starting product → Suggested additions' },
  FBT: { title: 'Frequently Bought Together', description: 'Find product groups that customers often purchase together.', purpose: 'Historical co-purchases' },
  BANNER: { title: 'Banner', description: 'Identify products or groups worth considering for promotion.', purpose: 'Promotional candidate' }
};

export function crossSellDirection(item: Pick<RecView, 'type' | 'anchorProductId' | 'productIds'>) {
  if (item.type !== 'CROSS_SELL' || item.anchorProductId === null || !item.productIds.includes(item.anchorProductId)) return null;
  const targets = item.productIds.filter(id => id !== item.anchorProductId);
  return targets.length ? { anchor: item.anchorProductId, targets } : null;
}

export function productNames(ids: readonly number[], names: Record<number,string> = {}): string {
  if(!ids.length)return 'the recorded products';
  if(ids.every(id=>!names[id]?.trim()))return ids.length===1?'this product':'these products';
  const values=ids.map(id=>names[id]?.trim()||'an unnamed product');
  return values.length===1?values[0]:values.length===2?values.join(' and '):values.slice(0,-1).join(', ')+', and '+values.at(-1);
}

/** A proposal, not an active promotion or a prediction. IDs remain in the data only. */
export function recommendationRationale(item: RecView, names: Record<number, string> = {}): string {
  const products=productNames(item.productIds,names);
  switch (item.type) {
    case 'BUNDLE': return `Offer ${products} as a bundle.`;
    case 'CROSS_SELL': {
      const direction = crossSellDirection(item);
      if(!direction)return 'The starting product or suggested additions could not be identified. Review the saved products before use.';
      return `Suggest ${productNames(direction.targets,names)} when customers select ${names[direction.anchor]?.trim()||'the starting product'}.`;
    }
    case 'FBT':return `Display ${products} together based on past purchases.`;
    case 'BANNER':return `Feature ${products} in a promotional banner.`;
  }
}

/** All denominators/ratios are the saved Backend evidence. No client qualification. */
export function recommendationPurchaseEvidence(item:RecView,names:Record<number,string>={}) {
  const evidence=item.evidence,direction=crossSellDirection(item);
  const countsAvailable=['AVAILABLE','ZERO_ANCHOR_SUPPORT'].includes(evidence.status)&&evidence.totalTransactions>0&&evidence.supportCount!==null;
  const groupSentence=countsAvailable
    ? `${item.productIds.length===1?'Present':'Bought together'} in ${recommendationNumber(evidence.supportCount)} of ${recommendationNumber(evidence.totalTransactions)} analyzed transactions.`
    : 'Historical purchase data is unavailable.';
  const groupPercent=countsAvailable&&evidence.supportRatio!==null?recommendationPercent(evidence.supportRatio):null;
  const directionalAvailable=!!direction&&countsAvailable&&evidence.anchorSupportCount!==null&&evidence.anchorSupportCount>0&&evidence.confidence!==null;
  const directionalSentence=directionalAvailable
    ? `${recommendationNumber(evidence.supportCount)} of ${recommendationNumber(evidence.anchorSupportCount)} transactions containing ${names[direction!.anchor]?.trim()||'the starting product'} also included ${productNames(direction!.targets,names)} (${recommendationPercent(evidence.confidence)}).`
    : direction?'Directional purchase data is unavailable.':null;
  return {groupSentence,groupPercent,directionalSentence,directionalAvailable,countsAvailable};
}

export function recommendationWarning(message:string,names:Record<number,string>={}):string {
  const known:Record<string,string>={MISSING_PUSH_DAY:'A batch is missing its Push Day. Check the inventory batch information.',MISSING_EXPIRY_DATE:'An expiry-tracked batch is missing its expiry date.',MISSING_METADATA:'Some expiry information is missing. Check the inventory batches.',NO_SELLABLE_BATCH:'No sellable stock is currently available.',PRODUCT_INACTIVE:'This product is inactive.',PRODUCT_UNAVAILABLE:'This product is no longer available.'};
  const prefix=message.match(/^Product\s+#?(\d+):\s*(.*)$/i);
  if(prefix)return `${names[Number(prefix[1])]?.trim()||'A product'}: ${recommendationWarning(prefix[2],names)}`;
  if(message==='SUPPORT_POLICY_NOT_MET')return 'These products were not purchased together often enough.';
  if(message==='CONFIDENCE_POLICY_NOT_MET')return "These products did not meet your store's add-on purchase requirements.";
  if(known[message])return known[message];
  if(/^(Missing expiry metadata|Missing required expiry information)$/i.test(message))return known.MISSING_METADATA;
  if(/^[A-Z][A-Z0-9_]+$/.test(message))return message.toLowerCase().replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase())+'.';
  // Do not render diagnostics or serialized evidence as product guidance.
  if(/\b(?:SPMF|fingerprint|hash|scoringVersion|expectedVersion)\b|[{}]|\b[0-9a-f]{32,}\b/i.test(message))return 'Some saved analysis information needs checking. Refresh or contact your administrator.';
  return message.replace(/\bProduct\s+#?\d+\b/gi,'A product');
}
