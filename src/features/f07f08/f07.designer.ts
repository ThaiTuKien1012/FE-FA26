import type { CampaignReport, LayoutPolicy, LayoutView, Placement, PlacementRequest, RecommendationOption, RecommendationType, SnapshotProductOption } from './f07f08.api';

export const ZONES: RecommendationType[] = ['BANNER', 'BUNDLE', 'CROSS_SELL', 'FBT'];
export const ZONE_LABELS: Record<string, string> = { BASELINE: 'Baseline products', BANNER: 'Featured products', BUNDLE: 'Product bundles', CROSS_SELL: 'Cross-sell', FBT: 'Frequently bought together' };
export type DraftPlacement = Omit<Placement, 'snapshotWeightedUtility'> & { snapshotWeightedUtility: number | null };

export function editableZone(zone: string): zone is RecommendationType {
  return ZONES.some(value => value === zone);
}

export function placementRequest(row: DraftPlacement): PlacementRequest {
  if (!editableZone(row.zone)) throw new Error('Select an editable Layout B zone.');
  const { productId, zone, blockNo, position, sourceRecommendationId } = row;
  return { productId, zone, blockNo, position, sourceRecommendationId };
}

export function samePlacements(a: DraftPlacement[], b: DraftPlacement[]): boolean {
  const previous = new Map(b.map(row => [row.productId, row]));
  return a.length === b.length && a.every(row => {
    const old = previous.get(row.productId);
    return old && row.zone === old.zone && row.blockNo === old.blockNo && row.position === old.position
      && row.sourceRecommendationId === old.sourceRecommendationId;
  });
}

function positiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export function draftErrors(rows: DraftPlacement[], policy: LayoutPolicy, checkEligibility = true): string[] {
  const errors = new Set<string>();
  const productIds = new Set<number>();
  const positions = new Set<string>();
  for (const row of rows) {
    const { productId, zone, blockNo, position, sourceRecommendationId } = row;
    if (!editableZone(zone) || !policy.zones.some(item => item.zone === zone)) errors.add(`No editable zone is configured for ${zone}.`);
    if (!positiveInteger(productId) || !positiveInteger(blockNo) || !positiveInteger(position)
      || blockNo > 2147483647 || position > 2147483647 || productId > 2147483647
      || (sourceRecommendationId !== null && !positiveInteger(sourceRecommendationId))) {
      errors.add(`Product #${productId} needs valid positive IDs, a block number and a position.`);
    }
    if (productIds.has(productId)) errors.add(`Product #${productId} can appear only once.`);
    productIds.add(productId);
    const slot = `${zone}:${position}`;
    if (positions.has(slot)) errors.add(`Position ${position} is already in use in ${zone}.`);
    positions.add(slot);
    if (checkEligibility && !row.valid) {
      errors.add(`Product #${productId}: ${row.validationErrors.join(' ') || 'This placement is not eligible.'}`);
    }
  }
  for (const zone of policy.zones.filter(item => editableZone(item.zone))) {
    const items = rows.filter(row => row.zone === zone.zone);
    const blocks = new Set(items.map(row => row.blockNo)).size;
    if (zone.maxBlocks !== null && blocks > zone.maxBlocks) errors.add(`${ZONE_LABELS[zone.zone]}: maximum ${zone.maxBlocks} blocks.`);
    if (zone.maxProducts !== null && items.length > zone.maxProducts) errors.add(`${ZONE_LABELS[zone.zone]}: maximum ${zone.maxProducts} products.`);
  }
  return [...errors];
}

export function groupedPlacements(rows: DraftPlacement[], zone: string) {
  const groups = new Map<number, DraftPlacement[]>();
  const ordered = rows.filter(row => row.zone === zone).sort((a, b) => a.blockNo - b.blockNo || a.position - b.position);
  for (const row of ordered) {
    if (!groups.has(row.blockNo)) groups.set(row.blockNo, []);
    groups.get(row.blockNo)!.push(row);
  }
  return [...groups].map(([blockNo, products]) => ({ blockNo, products }));
}

function afterLast(rows: DraftPlacement[], zone: string, field: 'blockNo' | 'position'): number {
  return rows.reduce((last, row) => row.zone === zone ? Math.max(last, row[field]) : last, 0) + 1;
}

export function movePlacement(rows: DraftPlacement[], id: number, zone: RecommendationType, blockNo?: number): DraftPlacement[] {
  return rows.map(row => {
    if (row.productId !== id || (row.zone === zone && blockNo === undefined)) return row;
    return { ...row, zone, blockNo: blockNo ?? afterLast(rows, zone, 'blockNo'),
      position: row.zone === zone ? row.position : afterLast(rows, zone, 'position') };
  });
}

export function shiftPlacement(rows: DraftPlacement[], id: number, direction: -1 | 1): DraftPlacement[] {
  const row = rows.find(item => item.productId === id);
  if (!row) return rows;
  const peers = rows.filter(item => item.zone === row.zone && item.blockNo === row.blockNo).sort((a, b) => a.position - b.position);
  const other = peers[peers.indexOf(row) + direction];
  if (!other) return rows;
  return rows.map(item => item === row ? { ...item, position: other.position }
    : item === other ? { ...item, position: row.position } : item);
}

export function addPlacements(rows: DraftPlacement[], zone: RecommendationType, productIds: readonly number[],
  products: ReadonlyMap<number, SnapshotProductOption>, source: RecommendationOption | null): DraftPlacement[] {
  const existing = new Set(rows.map(row => row.productId));
  const blockNo = afterLast(rows, zone, 'blockNo');
  let position = afterLast(rows, zone, 'position');
  const additions: DraftPlacement[] = [];
  for (const productId of new Set(productIds)) {
    const product = products.get(productId);
    if (existing.has(productId) || (source && !source.productIds.includes(productId))
      || (!source && !product?.eligible) || product?.eligible === false) continue;
    additions.push({
      productId, zone, blockNo, position: position++, sourceRecommendationId: source?.recommendationId ?? null,
      recommendationId: source?.recommendationId ?? null, recommendationType: source?.type ?? null,
      sku: product?.sku ?? '', productName: product?.productName ?? `Product #${productId}`,
      snapshotWeightedUtility: product?.snapshotWeightedUtility ?? null, valid: true, validationErrors: [],
    });
  }
  return [...rows, ...additions];
}

export function matchingReport(report: CampaignReport | null, a: LayoutView, b: LayoutView): boolean {
  return !!report && report.layouts.some(row => row.layoutId === a.layoutId && row.layoutVersion === a.version)
    && report.layouts.some(row => row.layoutId === b.layoutId && row.layoutVersion === b.version);
}

export const formatUtility = (value: number | null | undefined) => value == null ? 'N/A' : new Intl.NumberFormat('en-GB', { maximumFractionDigits: 6 }).format(value);
