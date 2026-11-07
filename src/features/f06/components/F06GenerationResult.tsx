import { CheckCircle2 } from 'lucide-react';
import type { RecGenerationResult, RecType } from '../f06.types';

const skippedReason: Record<string, string> = {
  PATTERN_REQUIRES_AT_LEAST_TWO_PRODUCTS: 'This type requires at least two products.',
  BUNDLE_EXCEEDS_MAX_SIZE: 'The pattern exceeds the bundle size limit.',
  TRANSACTION_EVIDENCE_UNAVAILABLE: 'Transaction evidence is unavailable.',
  SUPPORT_POLICY_NOT_MET: 'Support does not meet the captured policy.',
  CONFIDENCE_POLICY_NOT_MET: 'Confidence does not meet the captured policy.'
};
export function F06GenerationResult({ result, types }: { result: RecGenerationResult; types: RecType[] }) {
  return <section aria-labelledby="f06-result-title" className="rounded-2xl border border-[#CADACF] bg-white p-5 shadow-sm sm:p-6">
    <div role="status" className="flex items-center gap-2 text-[#1E3A2F]"><CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0" /><h2 id="f06-result-title" className="text-xl font-semibold">Generation complete</h2></div>
    <p className="mt-2 text-sm text-[#6D7974]">Run #{result.miningRunId} · Snapshot #{result.snapshotId} · Policy v{result.policyVersion}</p>
    <p className="mt-1 break-words text-xs text-[#6D7974]">{types.join(', ')} · {result.ruleVersion}</p>
    <dl className="mt-5 grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-[#EDF5F0] p-4"><dt className="text-sm text-[#57534E]">Created count</dt><dd className="mt-1 text-3xl font-semibold text-[#1E3A2F]">{result.createdCount}</dd></div>
      <div className="rounded-xl bg-[#FAF8F5] p-4"><dt className="text-sm text-[#57534E]">Reused count</dt><dd className="mt-1 text-3xl font-semibold">{result.reusedCount}</dd></div>
    </dl>
    <h3 className="mt-5 font-semibold">Recommendation IDs</h3>
    {result.recommendationIds.length ? <ul aria-label="Generated recommendation IDs" className="mt-3 flex max-h-48 flex-wrap gap-2 overflow-auto">
      {result.recommendationIds.map(id => <li key={id} className="max-w-full break-all rounded-lg border border-[#E7E2D8] bg-[#FAF8F5] px-3 py-2 text-sm font-medium">#{id}</li>)}
    </ul> : <p className="mt-3 rounded-xl bg-[#FAF8F5] p-4 text-sm text-[#6D7974]">No recommendations were returned. Review the skipped patterns below, or choose another completed run or set of types.</p>}
    <p className="mt-3 text-xs text-[#6D7974]">Reused recommendations keep their existing review decisions. Generation does not approve or publish recommendations.</p>
    <h3 className="mt-5 font-semibold">Skipped patterns <span className="font-normal text-[#6D7974]">({result.skipped.length})</span></h3>
    {result.skipped.length ? <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-[#E7E2D8]">
      <table className="w-full text-left text-sm"><caption className="sr-only">Skipped patterns and server reasons</caption>
        <thead className="sticky top-0 bg-[#FAF8F5] text-xs text-[#6D7974]"><tr>{['Pattern', 'Type', 'Anchor', 'Reason'].map(label => <th scope="col" key={label} className="p-3 font-semibold">{label}</th>)}</tr></thead>
        <tbody>{result.skipped.map((item, index) => <tr key={`${item.patternId}:${item.type}:${item.anchorProductId}:${index}`} className="border-t border-[#E7E2D8]">
          <td className="p-3">#{item.patternId}</td><td className="p-3">{item.type}</td><td className="p-3">{item.anchorProductId === null ? '—' : `#${item.anchorProductId}`}</td>
          <td className="min-w-48 p-3">{skippedReason[item.reason] || item.reason}<span className="mt-1 block break-words text-xs text-[#6D7974]">{item.reason}</span></td>
        </tr>)}</tbody>
      </table>
    </div> : <p className="mt-2 text-sm text-[#6D7974]">No patterns were skipped.</p>}
  </section>;
}
