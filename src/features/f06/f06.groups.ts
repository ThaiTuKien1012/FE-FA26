import type { RecView } from './f06.types';

export interface RecommendationGroup { key: string; items: RecView[]; startIndex: number; }
/** Presentation context, never a replacement for the Backend candidate identity.
 * Directional anchor/confidence stay on each option. Equivalent run references
 * may share a frozen input context; every original source stays in Details. */
export function recommendationGroupContext(item: RecView): string {
  const policy = item.policy;
  const sources = [...new Set(item.sources.map(source => JSON.stringify([
    source.snapshotId, source.inputHash, source.sourceHash, source.matrixHash,
    source.minUtilMode, String(source.minUtilValue), source.minUtilSpmf,
    String(source.effectiveMinUtility), String(source.patternUtility), source.analysisDate
  ])))].sort();
  return JSON.stringify([
    item.storeId, item.snapshotId, [...item.productIds].sort((a,b)=>a-b), String(item.utility),
    item.ruleVersion, policy.version, policy.ruleVersion, policy.maxBundleSize,
    policy.minSupportCount, String(policy.minSupportRatio), String(policy.minConfidence), policy.minimumSellableQuantity,
    item.evidence.totalTransactions, item.evidence.supportCount, String(item.evidence.supportRatio), item.evidence.status,
    // Without source evidence, keep a candidate separate rather than guess.
    sources.length ? sources : ['unrecorded', item.recommendationId]
  ]);
}

/** Group adjacent items on this API page only. Combining non-adjacent records
 * would move candidates out of server order, especially in ranked responses. */
export function groupRecommendationPage(items: readonly RecView[], grouped = true): RecommendationGroup[] {
  const groups: RecommendationGroup[] = [];
  items.forEach((item,index)=>{
    const context = recommendationGroupContext(item), previous = groups.at(-1);
    if(grouped && previous?.key === context) previous.items.push(item);
    else groups.push({key:context,items:[item],startIndex:index});
  });
  return groups;
}

/** Diagnostic only: do not hide, delete, or auto-merge repeated references. */
export function repeatedRecommendationIds(items: readonly RecView[]): number[] {
  const seen = new Set<number>(), repeated = new Set<number>();
  for(const item of items){if(seen.has(item.recommendationId))repeated.add(item.recommendationId);seen.add(item.recommendationId);}
  return [...repeated];
}
