import { ArrowUpRight, CheckCircle2, CircleDashed } from 'lucide-react';
import { miningButton } from '../../f05/f05.display';
import type { RecPage, RecView } from '../f06.types';
import { RecommendationBadge, RecommendationProduct, recommendationLabel, recommendationPercent, recommendationValue, recommendationReadiness, recommendationAvailability } from './F06ReadShared';

function Products({ item, names }: { item: RecView; names: Record<number, string> }) {
  return <><ul className="space-y-2 break-words">{item.productIds.slice(0, 4).map(id => <li key={id}><RecommendationProduct id={id} names={names} /></li>)}</ul>{item.productIds.length > 4 && <span className="mt-2 block text-xs text-[#6D7974]">+{item.productIds.length - 4} more in details</span>}</>;
}
function ShoppingEvidence({ item }: { item: RecView }) {
  return <div className="space-y-2 text-xs leading-5">
    <p className="flex flex-wrap items-baseline gap-x-2"><span className="text-[#6D7974]">Utility Score</span><strong className="break-all text-base font-semibold tabular-nums text-[#191C1B]">{recommendationValue(item.utility)}</strong></p>
    <p>{item.evidence.supportCount === null ? 'Bought together: N/A' : `Bought together in ${item.evidence.supportCount} orders`}</p>
    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-[#6D7974]"><div className="flex gap-1"><dt title="Share of historical transactions containing this group">Frequency</dt><dd className="font-medium tabular-nums text-[#191C1B]">{recommendationPercent(item.evidence.supportRatio)}</dd></div>
      {(item.type === 'CROSS_SELL' || item.evidence.confidence !== null) && <div className="flex gap-1"><dt title="Historical co-purchases relative to the starting product">Confidence</dt><dd className="font-medium tabular-nums text-[#191C1B]">{recommendationPercent(item.evidence.confidence)}</dd></div>}
    </dl>
  </div>;
}
function Availability({ item }: { item: RecView }) {
  const Icon = item.readyForConsumption ? CheckCircle2 : CircleDashed;
  return <div className="space-y-3"><div><RecommendationBadge status={item.currentEligibility.status} /><p className="mt-1 text-xs leading-5 text-[#6D7974]">{recommendationAvailability(item.currentEligibility.status)}</p></div>
    <div className="border-t border-[#E7E2D8] pt-2"><p className={`flex items-center gap-1.5 text-sm font-semibold ${item.readyForConsumption ? 'text-emerald-800' : 'text-[#57534E]'}`}><Icon aria-hidden="true" className="h-4 w-4 shrink-0" />{item.readyForConsumption ? 'Ready to use' : 'Not ready'}</p><p className="mt-1 text-xs leading-5 text-[#6D7974]">{recommendationReadiness(item)}</p></div>
  </div>;
}
export function F06RecommendationTable({ data, names = {}, onOpen }: { data: RecPage; names?: Record<number, string>; onOpen: (id: number) => void }) {
  const ranked = data.ordering === 'RANKED_WITHIN_SOURCE_RUN';
  const rank = (item: RecView) => ranked && item.rank !== null ? <span data-rank={item.rank} className="mt-2 inline-block rounded-md bg-[#EDF5F0] px-2 py-1 text-xs font-medium text-[#356B54]">Rank {item.rank}</span> : null;
  const action = (item: RecView) => <button type="button" className={`${miningButton} inline-flex items-center gap-2 whitespace-nowrap`} aria-label={`View details for recommendation #${item.recommendationId}`} onClick={() => onOpen(item.recommendationId)}>View Details<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></button>;
  return <>
    <div className="mt-5 hidden overflow-x-auto rounded-xl border border-[#E7E2D8] xl:block">
      <table className="w-full min-w-[860px] text-left text-sm"><caption className="sr-only">{ranked ? 'Ranked recommendations in server order' : 'Recommendation history in server order'}</caption>
        <thead className="bg-[#FAF8F5] text-xs text-[#6D7974]"><tr>{['Recommendation', 'Products', 'Why Suggested', 'Review', 'Availability / Readiness', 'Action'].map(label => <th key={label} scope="col" className="p-4 font-semibold">{label}</th>)}</tr></thead>
        <tbody>{data.items.map(item => <tr key={item.recommendationId} className="border-t border-[#E7E2D8] align-top hover:bg-[#FAF8F5]/60">
          <th scope="row" className="w-[15%] p-4 font-semibold"><span className="block">{recommendationLabel(item.type)}</span><span className="mt-1 block text-xs font-normal text-[#6D7974]">#{item.recommendationId} · Snapshot #{item.snapshotId}</span>{rank(item)}</th>
          <td className="w-[17%] p-4"><Products item={item} names={names} /></td>
          <td className="w-[23%] p-4"><ShoppingEvidence item={item} /></td>
          <td className="w-[12%] p-4"><RecommendationBadge status={item.reviewStatus} /></td>
          <td className="w-[23%] p-4"><Availability item={item} /></td><td className="p-4">{action(item)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <div aria-label="Product recommendation cards" className="mt-5 grid gap-4 md:grid-cols-2 xl:hidden">{data.items.map(item => <article key={item.recommendationId} aria-label={`Recommendation #${item.recommendationId}`} className="min-w-0 rounded-2xl border border-[#E7E2D8] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold">{recommendationLabel(item.type)}</h3><p className="mt-1 text-xs text-[#6D7974]">#{item.recommendationId} · Snapshot #{item.snapshotId}</p>{rank(item)}</div><RecommendationBadge status={item.reviewStatus} /></div>
      <div className="mt-4 text-sm"><h4 className="mb-2 text-xs font-medium text-[#6D7974]">Products</h4><Products item={item} names={names} /></div>
      <section className="my-4 rounded-xl bg-[#FAF8F5] p-3"><h4 className="mb-2 text-xs font-semibold text-[#356B54]">Why Suggested</h4><ShoppingEvidence item={item} /></section>
      <Availability item={item} /><div className="mt-4 border-t border-[#E7E2D8] pt-4">{action(item)}</div>
    </article>)}</div>
  </>;
}
