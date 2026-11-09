import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { miningPrimaryButton } from '../../f05/f05.display';
import type { RecGenerationResult, RecType } from '../f06.types';
import { recommendationLabel } from './F06ReadShared';

const skippedReason: Record<string, string> = {
  PATTERN_REQUIRES_AT_LEAST_TWO_PRODUCTS: 'This format needs at least two products. This combination has only one.',
  BUNDLE_EXCEEDS_MAX_SIZE: 'There are too many products for the store’s bundle size limit.',
  TRANSACTION_EVIDENCE_UNAVAILABLE: 'There is not enough historical shopping evidence to check this format.',
  SUPPORT_POLICY_NOT_MET: 'These products were not bought together often enough to meet the store’s rules.',
  CONFIDENCE_POLICY_NOT_MET: 'Shoppers buying the starting product did not buy this group often enough to meet the store’s rule.'
};
export function F06GenerationResult({ result, types, onViewRecommendations }: { result: RecGenerationResult; types: RecType[]; onViewRecommendations?: () => void }) {
  const references = <ul aria-label="Generated recommendation IDs" className="mt-3 flex max-h-48 flex-wrap gap-2 overflow-auto">{result.recommendationIds.map(id => <li key={id} className="max-w-full break-all rounded-lg border border-[#E7E2D8] px-3 py-2 text-sm">#{id}</li>)}</ul>;
  return <section aria-labelledby="f06-result-title" className="rounded-2xl border border-[#CADACF] bg-white p-5 shadow-sm sm:p-6">
    <div role="status" className="flex items-start gap-3 text-[#1E3A2F]"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0" /><div><h2 id="f06-result-title" className="text-xl font-semibold">{result.createdCount > 0 ? 'Recommendations Created' : result.recommendationIds.length ? 'Existing Suggestions Reused' : 'No Suggestions Created'}</h2><p className="mt-2 text-sm font-normal leading-6 text-[#6D7974]">Suggestions are ready for review, but they are not automatically approved.</p></div></div>
    <dl className="mt-5 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl bg-[#EDF5F0] p-4"><dt className="text-sm text-[#57534E]">New Suggestions</dt><dd className="mt-2 text-3xl font-semibold text-[#1E3A2F]">{result.createdCount}</dd></div>
      <div className="rounded-xl bg-[#FAF8F5] p-4"><dt className="text-sm text-[#57534E]">Reused Suggestions</dt><dd className="mt-2 text-3xl font-semibold">{result.reusedCount}</dd></div>
      <div className="rounded-xl bg-[#FAF8F5] p-4"><dt className="text-sm text-[#57534E]">Skipped Checks</dt><dd className="mt-2 text-3xl font-semibold">{result.skipped.length}</dd><p className="mt-2 text-xs leading-5 text-[#6D7974]">Skipped format / starting-product combinations. A pattern may appear more than once.</p></div>
    </dl>
    <p className="mt-4 text-sm leading-6 text-[#57534E]">New suggestions still need a review. Reused suggestions keep their existing review decisions; generation does not approve or publish anything.</p>
    <h3 className="mt-5 text-sm font-semibold">Recommendation references</h3>
    {result.recommendationIds.length > 8 ? <details className="mt-3 text-sm"><summary className="cursor-pointer font-medium">Show all {result.recommendationIds.length} recommendation references</summary>{references}</details> : result.recommendationIds.length ? references : <p className="mt-3 rounded-xl bg-[#FAF8F5] p-4 text-sm text-[#6D7974]">No recommendations were returned. Review the reasons below, or choose another completed run or set of formats.</p>}
    {onViewRecommendations && <button type="button" onClick={onViewRecommendations} className={`${miningPrimaryButton} mt-5`}>View Recommendations<ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" /></button>}
    {result.skipped.length ? <details className="mt-5 rounded-xl border border-[#E7E2D8] p-4">
      <summary className="cursor-pointer text-sm font-semibold">Why some suggestions were skipped ({result.skipped.length})</summary>
      <p className="mt-3 text-xs leading-5 text-[#6D7974]">A shopping pattern is a product combination found in past baskets. It may be used for one format but not another.</p>
      <div className="mt-3 max-h-80 overflow-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Patterns not used and reasons</caption>
        <thead className="sticky top-0 bg-[#FAF8F5] text-xs text-[#6D7974]"><tr>{['Product combination', 'Format', 'Starting product', 'Why it was not used'].map(label => <th scope="col" key={label} className="p-3 font-semibold">{label}</th>)}</tr></thead>
        <tbody>{result.skipped.map((item, index) => <tr key={`${item.patternId}:${item.type}:${item.anchorProductId}:${index}`} className="border-t border-[#E7E2D8] align-top">
          <td className="p-3">Pattern #{item.patternId}</td><td className="p-3">{recommendationLabel(item.type)}</td><td className="p-3">{item.anchorProductId === null ? 'N/A' : `Product #${item.anchorProductId}`}</td>
          <td className="min-w-56 p-3">{skippedReason[item.reason] || item.reason.replace(/_/g, ' ').toLowerCase()}<details className="mt-2 text-xs text-[#6D7974]"><summary className="cursor-pointer">Technical reason</summary><p className="mt-2 break-words">{item.reason}</p></details></td>
        </tr>)}</tbody>
      </table></div>
    </details> : <p className="mt-4 text-sm text-[#6D7974]">No patterns were skipped.</p>}
    <details className="mt-4 text-xs text-[#6D7974]"><summary className="cursor-pointer">Run and rule references</summary><p className="mt-2">Run #{result.miningRunId} · Snapshot #{result.snapshotId} · Rules version {result.policyVersion}</p><p className="mt-1 break-words">{types.map(recommendationLabel).join(', ')} · {result.ruleVersion}</p></details>
  </section>;
}
