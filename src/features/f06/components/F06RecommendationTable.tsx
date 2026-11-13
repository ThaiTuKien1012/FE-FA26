import { ArrowUpRight, CheckCircle2, CircleDashed } from 'lucide-react';
import { miningButton } from '../../f05/f05.display';
import type { RecPage, RecView } from '../f06.types';
import { RecommendationBadge, RecommendationProduct, recommendationLabel, recommendationPercent, recommendationValue, recommendationReadiness, recommendationAvailability, recommendationNumber } from './F06ReadShared';

function Products({ item, names }: { item: RecView; names: Record<number, string> }) {
  return <><ul className="space-y-2 break-words">{item.productIds.slice(0, 4).map(id => <li key={id}><RecommendationProduct id={id} names={names} /></li>)}</ul>{item.productIds.length > 4 && <span className="mt-2 block text-xs text-[#6D7974]">+{item.productIds.length - 4} more in details</span>}</>;
}
function ShoppingEvidence({ item, compact = false }: { item: RecView; compact?: boolean }) {
  if (compact) return <dl className="space-y-1.5 text-xs leading-5"><div className="flex flex-wrap gap-x-2"><dt className="text-[#6D7974]">Utility Score</dt><dd className="font-semibold tabular-nums">{recommendationNumber(item.utility)}</dd></div><div className="flex flex-wrap gap-x-2"><dt className="text-[#6D7974]">Bought together</dt><dd>{item.evidence.supportCount === null ? 'N/A' : recommendationNumber(item.evidence.supportCount) + ' orders'}</dd></div><div className="flex flex-wrap gap-x-2"><dt className="text-[#6D7974]">Frequency</dt><dd className="tabular-nums">{recommendationPercent(item.evidence.supportRatio)}</dd></div>{(item.type === 'CROSS_SELL' || item.evidence.confidence !== null) && <div className="flex flex-wrap gap-x-2"><dt className="text-[#6D7974]">Confidence</dt><dd className="tabular-nums">{recommendationPercent(item.evidence.confidence)}</dd></div>}</dl>;

  return <div className="space-y-2 text-xs leading-5">
    <p className="flex flex-wrap items-baseline gap-x-2"><span className="text-[#6D7974]">{compact ? 'Historical utility' : 'Utility Score'}</span><strong className="break-all text-base font-semibold tabular-nums text-[#191C1B]">{recommendationValue(item.utility)}</strong></p>
    <p>{item.evidence.supportCount === null ? 'Bought together: N/A' : `Bought together in ${item.evidence.supportCount} orders`}</p>
    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-[#6D7974]"><div className="flex gap-1"><dt title="Share of historical transactions containing this group">Frequency</dt><dd className="font-medium tabular-nums text-[#191C1B]">{recommendationPercent(item.evidence.supportRatio)}</dd></div>
      {(item.type === 'CROSS_SELL' || item.evidence.confidence !== null) && <div className="flex gap-1"><dt title="Historical co-purchases relative to the starting product">Confidence</dt><dd className="font-medium tabular-nums text-[#191C1B]">{recommendationPercent(item.evidence.confidence)}</dd></div>}
    </dl>
  </div>;
}
function Availability({ item, compact = false }: { item: RecView; compact?: boolean }) {
  const Icon = item.readyForConsumption ? CheckCircle2 : CircleDashed;
  if (compact) return <dl className="space-y-2 text-xs"><div><dt className="text-[#6D7974]">Availability</dt><dd data-status={item.currentEligibility.status} className="mt-1 whitespace-nowrap font-medium text-[#57534E]" title={recommendationAvailability(item.currentEligibility.status)}>{recommendationLabel(item.currentEligibility.status)}</dd></div><div><dt className="text-[#6D7974]">Readiness</dt><dd className={item.readyForConsumption ? 'mt-1 font-medium text-[#356B54]' : 'mt-1 font-medium text-[#57534E]'} title={recommendationReadiness(item) + ' Ready to use means approved and currently eligible.'}><span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Icon aria-hidden="true" className="h-3.5 w-3.5" />{item.readyForConsumption ? 'Ready to use' : 'Not ready'}</span></dd></div></dl>;
  return <div className="space-y-3"><div>{compact ? <span data-status={item.currentEligibility.status} className="text-sm font-medium text-[#57534E]">{recommendationLabel(item.currentEligibility.status)}</span> : <RecommendationBadge status={item.currentEligibility.status} />}{!compact && <p className="mt-1 text-xs leading-5 text-[#6D7974]">{recommendationAvailability(item.currentEligibility.status)}</p>}</div>
    <div className="border-t border-[#E7E2D8] pt-2"><p className={`flex items-center gap-1.5 text-sm font-semibold ${item.readyForConsumption ? 'text-emerald-800' : 'text-[#57534E]'}`}><Icon aria-hidden="true" className="h-4 w-4 shrink-0" />{item.readyForConsumption ? 'Ready to use' : 'Not ready'}</p><p className="mt-1 text-xs leading-5 text-[#6D7974]">{recommendationReadiness(item)}</p></div>
  </div>;
}
export function F06RecommendationTable({ data, names = {}, onOpen, compact = false }: { compact?: boolean; data: RecPage; names?: Record<number, string>; onOpen: (id: number) => void }) {
  if (compact) return <StoreRecommendationList data={data} names={names} onOpen={onOpen} />;
  const ranked = data.ordering === 'RANKED_WITHIN_SOURCE_RUN';
  const rank = (item: RecView) => ranked && item.rank !== null ? <span data-rank={item.rank} className="mt-2 inline-block rounded-md bg-[#EDF5F0] px-2 py-1 text-xs font-medium text-[#356B54]">Rank {item.rank}</span> : null;
  const action = (item: RecView) => <button type="button" className={`${miningButton} inline-flex items-center gap-2 whitespace-nowrap`} aria-label={`View details for recommendation #${item.recommendationId}`} onClick={() => onOpen(item.recommendationId)}>View Details<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></button>;
  return <>
    <div className="mt-5 hidden overflow-x-auto rounded-xl border border-[#E7E2D8] xl:block">
      <table className="w-full min-w-[860px] text-left text-sm"><caption className="sr-only">{ranked ? 'Ranked recommendations in server order' : 'Recommendation history in server order'}</caption>
        <thead className="bg-[#FAF8F5] text-xs text-[#6D7974]"><tr>{['Recommendation', 'Products', 'Why Suggested', 'Review', 'Availability / Readiness', 'Action'].map(label => <th key={label} scope="col" className="p-4 font-semibold">{label}</th>)}</tr></thead>
        <tbody>{data.items.map(item => <tr key={item.recommendationId} className="border-t border-[#E7E2D8] align-top hover:bg-[#FAF8F5]/60">
          <th scope="row" className="w-[15%] p-4 font-semibold"><span className="block">{recommendationLabel(item.type)}</span><span className="mt-1 block text-xs font-normal text-[#6D7974]">#{item.recommendationId}{!compact && ` · Snapshot #${item.snapshotId}`}</span>{rank(item)}</th>
          <td className="w-[17%] p-4"><Products item={item} names={names} /></td>
          <td className="w-[23%] p-4"><ShoppingEvidence item={item} compact={compact} /></td>
          <td className="w-[12%] p-4"><RecommendationBadge status={item.reviewStatus} /></td>
          <td className="w-[23%] p-4"><Availability item={item} compact={compact} /></td><td className="p-4">{action(item)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <div aria-label="Product recommendation cards" className="mt-5 grid gap-4 md:grid-cols-2 xl:hidden">{data.items.map(item => <article key={item.recommendationId} aria-label={`Recommendation #${item.recommendationId}`} className="min-w-0 rounded-2xl border border-[#E7E2D8] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold">{recommendationLabel(item.type)}</h3><p className="mt-1 text-xs text-[#6D7974]">#{item.recommendationId}{!compact && ` · Snapshot #${item.snapshotId}`}</p>{rank(item)}</div><RecommendationBadge status={item.reviewStatus} /></div>
      <div className="mt-4 text-sm"><h4 className="mb-2 text-xs font-medium text-[#6D7974]">Products</h4><Products item={item} names={names} /></div>
      <section className="my-4 rounded-xl bg-[#FAF8F5] p-3"><h4 className="mb-2 text-xs font-semibold text-[#356B54]">Why Suggested</h4><ShoppingEvidence item={item} compact={compact} /></section>
      <Availability item={item} compact={compact} /><div className="mt-4 border-t border-[#E7E2D8] pt-4">{action(item)}</div>
    </article>)}</div>
  </>;
}

function StoreRecommendationList({ data, names, onOpen }: { data: RecPage; names: Record<number, string>; onOpen: (id: number) => void }) {
  const products = (item: RecView) => <div className="min-w-0"><ul className="space-y-1 text-sm font-semibold">{item.productIds.slice(0, 4).map(id => <li className="break-words" key={id}>{names[id] ?? 'Product #' + id}</li>)}</ul><p className="mt-2 text-xs text-[#6D7974]">{recommendationLabel(item.type)}{item.productIds.length > 4 && ' / +' + (item.productIds.length - 4) + ' more in Details'}</p></div>;
  const review = (item: RecView) => <span data-status={item.reviewStatus} className="inline-flex whitespace-nowrap rounded-md bg-[#F3F5F4] px-2 py-1 text-xs font-medium text-[#356B54]">{recommendationLabel(item.reviewStatus)}</span>;
  const action = (item: RecView) => <button type="button" aria-label={'View details for recommendation #' + item.recommendationId} className={miningButton + ' inline-flex items-center gap-1.5 whitespace-nowrap'} onClick={() => onOpen(item.recommendationId)}>View Details<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></button>;
  return <>
    <div className="mt-4 hidden overflow-x-auto rounded-xl border border-[#E7E2D8] xl:block"><table className="w-full table-fixed text-left text-sm"><caption className="sr-only">Recommendation history in server order</caption><colgroup><col className="w-[25%]" /><col className="w-[24%]" /><col className="w-[14%]" /><col className="w-[20%]" /><col className="w-[17%]" /></colgroup><thead className="bg-[#FAF8F5] text-xs text-[#6D7974]"><tr>{['Products / Type', 'Why Suggested', 'Review', 'Availability / Readiness', 'Action'].map(label => <th scope="col" key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-[#E7E2D8]">{data.items.map(item => <tr key={item.recommendationId} className="align-top hover:bg-[#FAF8F5]/60"><th scope="row" className="px-4 py-4 font-normal">{products(item)}</th><td className="px-4 py-4"><ShoppingEvidence compact item={item} /></td><td className="px-4 py-4">{review(item)}</td><td className="px-4 py-4"><Availability compact item={item} /></td><td className="px-4 py-4">{action(item)}</td></tr>)}</tbody></table></div>
    <div aria-label="Product recommendation cards" className="mt-4 grid gap-3 xl:hidden">{data.items.map(item => <article key={item.recommendationId} aria-label={'Recommendation #' + item.recommendationId} className="min-w-0 rounded-xl border border-[#E7E2D8] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3">{products(item)}{review(item)}</div><div className="mt-4 grid gap-4 border-t border-[#E7E2D8] pt-4 sm:grid-cols-2"><section><h4 className="mb-2 text-xs font-semibold text-[#356B54]">Why Suggested</h4><ShoppingEvidence compact item={item} /></section><Availability compact item={item} /></div><div className="mt-4 flex justify-end">{action(item)}</div></article>)}</div>
  </>;
}
