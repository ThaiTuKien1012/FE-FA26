import type { CampaignReport, LayoutPolicy, LayoutView, PlacementRequest, RecommendationType } from './f07f08.api';

export const ZONES: RecommendationType[] = ['BANNER', 'BUNDLE', 'CROSS_SELL', 'FBT'];
export const ZONE_LABELS: Record<string, string> = { BASELINE: 'Most purchased products', BANNER: 'Featured products', BUNDLE: 'Product bundles', CROSS_SELL: 'Suggested add-ons', FBT: 'Frequently bought together' };

export function savedPlacements(layout: LayoutView): PlacementRequest[] {
  return layout.placements.map(row => ({ productId: row.productId, zone: row.zone, blockNo: row.blockNo, position: row.position,
    sourceRecommendationId: row.sourceRecommendationId !== undefined ? row.sourceRecommendationId : row.recommendationId }));
}

/** Positions are unique across a zone, including products in different blocks. */
export function normalizePositions(placements: PlacementRequest[]): PlacementRequest[] {
  const positions = new Map<string, number>();
  return placements.map(row => {
    const position = (positions.get(row.zone) || 0) + 1;
    positions.set(row.zone, position);
    return { ...row, position };
  });
}
export function samePlacements(a: PlacementRequest[], b: PlacementRequest[]): boolean {
  return a.length === b.length && a.every((row, i) => {
    const other = b[i];
    return row.productId === other.productId && row.zone === other.zone && row.blockNo === other.blockNo && row.position === other.position && row.sourceRecommendationId === other.sourceRecommendationId;
  });
}
export function placementErrors(placements: PlacementRequest[], policy: LayoutPolicy): string[] {
  const errors: string[] = [], products = new Set<number>(), positions = new Set<string>();
  for (const row of placements) {
    if (products.has(row.productId)) errors.push(`Product #${row.productId} may appear only once in Layout B.`);
    products.add(row.productId);
    if (!policy.zones.some(zone => zone.zone === row.zone && zone.recommendationType)) errors.push(`Unsupported Layout B zone: ${row.zone}.`);
    if (!Number.isSafeInteger(row.blockNo) || row.blockNo < 1 || row.blockNo > 2147483647) errors.push(`Product #${row.productId}: block number must be a positive integer.`);
    if (!Number.isSafeInteger(row.position) || row.position < 1) errors.push(`Product #${row.productId}: position must be a positive integer.`);
    const key = `${row.zone}:${row.position}`;
    if (positions.has(key)) errors.push(`Each position in ${row.zone} must contain only one product.`);
    positions.add(key);
  }
  for (const zone of policy.zones.filter(item => item.recommendationType)) {
    const selected = placements.filter(row => row.zone === zone.zone);
    const blocks = new Set(selected.map(row => row.blockNo)).size;
    if (zone.maxBlocks !== null && blocks > zone.maxBlocks) errors.push(`${ZONE_LABELS[zone.zone] || zone.zone}: maximum ${zone.maxBlocks} blocks.`);
    if (zone.maxProducts !== null && selected.length > zone.maxProducts) errors.push(`${ZONE_LABELS[zone.zone] || zone.zone}: maximum ${zone.maxProducts} products.`);
  }
  return [...new Set(errors)];
}
export function matchingReport(report: CampaignReport | null, a: LayoutView, b: LayoutView): boolean {
  return !!report && report.layouts.some(row => row.layoutId === a.layoutId && row.layoutVersion === a.version)
    && report.layouts.some(row => row.layoutId === b.layoutId && row.layoutVersion === b.version);
}
export const formatUtility = (value: number | null | undefined) => value == null ? 'Not available' : new Intl.NumberFormat('en-GB', { maximumFractionDigits: 6 }).format(value);
