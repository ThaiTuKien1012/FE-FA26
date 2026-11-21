import type { RecType, RecView } from './f06.types';

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

/** Describe recorded evidence, without testing rounded ratios against policy,
 * requalifying old candidates, or inferring missing purchases as zero. */
export function recommendationRationale(item: RecView, names: Record<number, string> = {}): string {
  const name = (id: number) => names[id] ?? `Product #${id}`;
  const recorded = item.sources.length > 0;
  const purchases = item.evidence.status === 'AVAILABLE' && item.evidence.supportCount !== null;
  switch (item.type) {
    case 'BUNDLE':
      return recorded
        ? 'These products were identified together in your store\'s sales analysis as a bundle candidate. The saved bundle rules are available in Source Details. No discount or selling price is created.'
        : 'This is a saved bundle suggestion. Its detailed source evidence is unavailable. Review the recorded products and rules before use; no discount or selling price is created.';
    case 'CROSS_SELL': {
      const direction = crossSellDirection(item);
      if (!direction) return 'This is a saved cross-sell suggestion. Its starting product or target details are unavailable, so a directional explanation cannot be shown.';
      if (!purchases || item.evidence.anchorSupportCount === null || item.evidence.confidence === null)
        return `This saved suggestion links ${name(direction.anchor)} to ${direction.targets.map(name).join(', ')}. Historical directional purchase evidence is incomplete; no confidence or purchase prediction is inferred.`;
      return `When customers buy ${name(direction.anchor)}, ${direction.targets.map(name).join(', ')} may be suggested alongside it based on historical purchases. This association does not predict what an individual customer will buy.`;
    }
    case 'FBT':
      return purchases
        ? `These products appeared together in ${item.evidence.supportCount!.toLocaleString('en-US')} historical orders. The frequency rules saved with this suggestion are available in Source Details.`
        : 'This is a saved frequently bought together suggestion. Historical purchase frequency is unavailable; missing evidence is not treated as zero orders.';
    case 'BANNER':
      return (recorded
        ? `${item.productIds.length === 1 ? 'This product was' : 'This product group was'} identified in your sales analysis as a candidate for promotional consideration.`
        : 'This is a saved promotional candidate. Its detailed source evidence is unavailable.') + ' No banner image is created and no advertisement is published.';
  }
}
