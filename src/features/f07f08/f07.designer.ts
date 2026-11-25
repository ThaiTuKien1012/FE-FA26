import type { CampaignReport, LayoutPolicy, LayoutView, RecommendationOption, RecommendationType } from './f07f08.api';

export const ZONES: RecommendationType[] = ['BANNER', 'BUNDLE', 'CROSS_SELL', 'FBT'];
export const ZONE_LABELS: Record<string, string> = { BASELINE: 'Baseline products', BANNER: 'Featured products', BUNDLE: 'Product bundles', CROSS_SELL: 'Cross-sell', FBT: 'Frequently bought together' };
export interface DesignerBlock extends RecommendationOption { eligible: boolean; errors: string[]; }

export function placementIds(layout: LayoutView): number[] {
  return [...new Set(layout.placements.flatMap(item => item.recommendationId === null ? [] : [item.recommendationId]))];
}

/** Retain ineligible saved blocks so users can see and remove them, never silently drop evidence. */
export function designerBlocks(options: RecommendationOption[], saved: LayoutView): Map<number, DesignerBlock> {
  const blocks = new Map(options.map(item => [item.recommendationId, { ...item, eligible: true, errors: [] as string[] }]));
  for (const id of placementIds(saved)) {
    const rows = saved.placements.filter(item => item.recommendationId === id);
    if (!blocks.has(id)) blocks.set(id, {
      recommendationId: id, snapshotId: saved.snapshotId, version: saved.version,
      type: rows[0].recommendationType!, productIds: rows.map(row => row.productId),
      utility: 0, eligible: false,
      errors: [...new Set(['This block is no longer approved and ready. Remove it or review it in F06.', ...rows.flatMap(row => row.validationErrors)])]
    });
  }
  return blocks;
}

export function draftErrors(ids: number[], blocks: Map<number, DesignerBlock>, policy: LayoutPolicy): string[] {
  const errors: string[] = [];
  const products = new Set<number>();
  if (new Set(ids).size !== ids.length) errors.push('A recommendation block can appear only once.');
  for (const id of ids) {
    const block = blocks.get(id);
    if (!block || !block.eligible) errors.push(`Recommendation #${id} is no longer available.`);
    if (!block) continue;
    if (!policy.zones.some(zone => zone.recommendationType === block.type)) errors.push(`No zone is configured for ${block.type}.`);
    for (const product of block.productIds) {
      if (products.has(product)) errors.push(`Product #${product} appears in more than one block. Choose one of those blocks.`);
      products.add(product);
    }
  }
  for (const zone of policy.zones.filter(item => item.recommendationType)) {
    const selected = ids.map(id => blocks.get(id)).filter(block => block?.type === zone.recommendationType);
    const count = selected.reduce((sum, block) => sum + block!.productIds.length, 0);
    if (zone.maxBlocks !== null && selected.length > zone.maxBlocks) errors.push(`${ZONE_LABELS[zone.zone] || zone.zone}: maximum ${zone.maxBlocks} blocks.`);
    if (zone.maxProducts !== null && count > zone.maxProducts) errors.push(`${ZONE_LABELS[zone.zone] || zone.zone}: maximum ${zone.maxProducts} products.`);
  }
  return [...new Set(errors)];
}

export const sameIds = (a: number[], b: number[]) => a.length === b.length && a.every((id, i) => id === b[i]);

export function moveBlock(ids: number[], id: number, target: number, blocks: Map<number, DesignerBlock>): number[] {
  if (id === target || !ids.includes(id) || !ids.includes(target) || blocks.get(id)?.type !== blocks.get(target)?.type) return ids;
  const next = ids.filter(item => item !== id);
  next.splice(next.indexOf(target), 0, id);
  return next;
}

export function matchingReport(report: CampaignReport | null, a: LayoutView, b: LayoutView): boolean {
  return !!report && report.layouts.some(row => row.layoutId === a.layoutId && row.layoutVersion === a.version)
    && report.layouts.some(row => row.layoutId === b.layoutId && row.layoutVersion === b.version);
}

export const formatUtility = (value: number | null | undefined) => value == null ? 'N/A' : new Intl.NumberFormat('en-GB', { maximumFractionDigits: 6 }).format(value);
