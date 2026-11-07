import { miningButton } from '../../f05/f05.display';
import type { RecPage } from '../f06.types';
import { RecommendationBadge, recommendationValue, recommendationYesNo } from './F06ReadShared';

export function F06RecommendationTable({ data, onOpen }: { data: RecPage; onOpen: (id: number) => void }) {
  const ranked = data.ordering === 'RANKED_WITHIN_SOURCE_RUN';
  return <div className="mt-5 overflow-x-auto rounded-xl border border-[#E7E2D8]">
    <table className="w-full min-w-[1060px] text-left text-sm">
      <caption className="sr-only">{ranked ? 'Ranked recommendations in server order' : 'Recommendation history in server order'}</caption>
      <thead className="bg-[#FAF8F5] text-xs text-[#6D7974]"><tr>
        {(ranked ? ['Rank'] : []).concat(['Recommendation', 'Type', 'Products', 'Historical utility', 'Support / Confidence', 'Review status', 'Current eligibility', 'Ready', 'Details']).map(label => <th key={label} scope="col" className="whitespace-nowrap p-3 font-semibold">{label}</th>)}
      </tr></thead>
      <tbody>{data.items.map(item => <tr key={item.recommendationId} className="border-t border-[#E7E2D8] align-top hover:bg-[#FAF8F5]/60">
        {ranked && <td className="p-3 tabular-nums">{recommendationValue(item.rank)}</td>}
        <th scope="row" className="p-3 font-semibold">#{item.recommendationId}<span className="mt-1 block text-xs font-normal text-[#6D7974]">Snapshot #{item.snapshotId}</span></th>
        <td className="p-3 text-xs font-medium">{item.type}</td>
        <td className="max-w-48 p-3"><span className="break-words">{item.productIds.slice(0, 4).map(id => `#${id}`).join(', ')}</span>{item.productIds.length > 4 && <span className="mt-1 block text-xs text-[#6D7974]">+{item.productIds.length - 4} more in details</span>}</td>
        <td className="max-w-40 break-words p-3 tabular-nums">{recommendationValue(item.utility)}</td>
        <td className="p-3 text-xs"><span className="block">Count: {recommendationValue(item.evidence.supportCount)}</span><span className="mt-1 block">Ratio: {recommendationValue(item.evidence.supportRatio)}</span><span className="mt-1 block">Confidence: {recommendationValue(item.evidence.confidence)}</span></td>
        <td className="p-3"><RecommendationBadge status={item.reviewStatus} /></td>
        <td className="p-3"><RecommendationBadge status={item.currentEligibility.status} /><span className="mt-1 block text-xs text-[#6D7974]">{item.currentEligibility.asOfDate}</span></td>
        <td className="p-3 font-medium">{recommendationYesNo(item.readyForConsumption)}</td>
        <td className="p-3"><button type="button" className={`${miningButton} whitespace-nowrap`} aria-label={`View details for recommendation #${item.recommendationId}`} onClick={() => onOpen(item.recommendationId)}>View details</button></td>
      </tr>)}</tbody>
    </table>
  </div>;
}
