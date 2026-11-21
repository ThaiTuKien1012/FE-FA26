import { ArrowRightLeft, ArrowUpRight, Layers, Megaphone, PackagePlus, ShoppingBasket } from 'lucide-react';
import type { RecPage, RecView } from '../f06.types';
import { groupRecommendationPage, repeatedRecommendationIds } from '../f06.groups';
import { formatDate } from '../../../utils/dateTime';
import { RecommendationBadge, recommendationLabel, recommendationNumber, recommendationPercent, recommendationReadiness } from './F06ReadShared';
import { F06ProductTiles } from './F06ProductImage';
import { crossSellDirection, recommendationTypeCopy } from '../f06.presentation';

const typeIcons = { BUNDLE: PackagePlus, CROSS_SELL: ArrowRightLeft, FBT: ShoppingBasket, BANNER: Megaphone };

export function F06RecommendationCards({ data, names={}, images={}, grouped=true, onOpen }: { compact?:boolean;data:RecPage;names?:Record<number,string>;images?:Record<number,string>;grouped?:boolean;onOpen:(id:number)=>void }) {
  const groups=groupRecommendationPage(data.items,grouped),repeated=repeatedRecommendationIds(data.items);
  const product=(id:number|null)=>id===null?'Starting product unavailable':names[id]??'Product #'+id;
  const direction=(item:RecView)=>{const value=crossSellDirection(item);return value?'From '+product(value.anchor)+' → '+value.targets.map(product).join(', '):null;};
  return <>
    {repeated.length>0&&<p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Repeated recommendation references were returned: {repeated.map(id=>'#'+id).join(', ')}. Every entry is shown. Refresh or ask System Admin to check these references.</p>}
    <div aria-label="Product recommendation cards" className={'mt-4 grid items-start gap-4 '+(groups.length>1?'xl:grid-cols-2':'')}>{groups.map(group=>{
      const first=group.items[0];
      return <article key={group.startIndex} data-product-group className={'min-w-0 overflow-hidden rounded-2xl border border-[#DFE6DF] bg-white shadow-sm '+(groups.length===1?'lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]':'')}>
        <div className="border-b border-[#E7E2D8] bg-[#FAFBF8] p-4 sm:p-5"><div className="mb-4 flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="line-clamp-2 break-words text-base font-semibold text-[#1E3A2F]" title={first.productIds.map(product).join(' + ')}>{first.productIds.map(product).join(' + ')}</h3><p className="mt-1 text-xs text-[#6D7974]">{first.productIds.length} {first.productIds.length===1?'product':'products'} · {group.items.length} {group.items.length===1?'suggestion':'suggestions'} on this page</p></div><Layers aria-hidden="true" className="h-5 w-5 shrink-0 text-[#6D7974]" /></div>
          <F06ProductTiles ids={first.productIds} names={names} images={images} />
          <p className="mt-4 text-xs text-[#6D7974]">Snapshot #{first.snapshotId} · Rule set {first.policy.version}{first.sources[0]&&' · '+formatDate(first.sources[0].analysisDate)}</p>
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs"><div><dt className="text-[#6D7974]" title="Priority-weighted historical value within this snapshot; not revenue, profit or a global ranking.">Historical utility</dt><dd className="mt-1 break-all font-semibold tabular-nums text-[#1E3A2F]">{recommendationNumber(first.utility)}</dd></div><div><dt className="text-[#6D7974]">Bought together</dt><dd className="mt-1 font-medium">{recommendationNumber(first.evidence.supportCount)} orders · {recommendationPercent(first.evidence.supportRatio)}</dd></div></dl>
        </div>
        <div className="space-y-2 p-3 sm:p-4"><p className="mb-3 text-xs text-[#6D7974]">Each type is a separate suggestion with its own review decision.</p>{group.items.map((item,index)=>{const Icon=typeIcons[item.type];return <button key={item.recommendationId+':'+index} data-candidate-id={item.recommendationId} type="button" aria-label={'View details for recommendation #'+item.recommendationId} onClick={event=>{event.currentTarget.focus({preventScroll:true});onOpen(item.recommendationId);}} className="w-full rounded-xl border border-[#E1E6DF] bg-white p-3 text-left transition-colors hover:border-[#356B54] hover:bg-[#F4F8F3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54]">
          <span className="flex items-center gap-2 font-semibold text-[#243B30]"><Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#356B54]" />{recommendationLabel(item.type)}</span>
          <span className="mt-1 block text-xs font-medium text-[#356B54]">{recommendationTypeCopy[item.type].purpose}{item.type==='BANNER'&&' · Nothing is published'}</span>
          <span className="mt-3 flex flex-wrap gap-x-4 gap-y-2"><span className="flex flex-wrap items-center gap-1.5"><span className="text-[11px] text-[#6D7974]">Review</span><RecommendationBadge status={item.reviewStatus} /></span><span className="flex flex-wrap items-center gap-1.5"><span className="text-[11px] text-[#6D7974]">Availability</span><RecommendationBadge status={item.currentEligibility.status} /></span></span>
          {direction(item)&&<span className="mt-2 block break-words text-xs font-medium text-[#356B54]">{direction(item)}</span>}
          {item.type==='CROSS_SELL'&&(direction(item)?<span className="mt-1 block text-xs text-[#6D7974]">Confidence {recommendationPercent(item.evidence.confidence)} · Starting-product orders {recommendationNumber(item.evidence.anchorSupportCount)}</span>:<span className="mt-2 block text-xs text-amber-900">Starting product or targets unavailable. Open Details to inspect the saved evidence.</span>)}
          <span className="mt-2 block text-xs leading-5 text-[#6D7974]">{recommendationReadiness(item)}</span>
          {item.seasonEnded&&<span className="mt-2 block text-xs font-medium text-amber-900">Season ended · Review historical context in Details</span>}
          <span className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs"><span className="text-[#7A857D]">Suggestion #{item.recommendationId}{data.ordering==='RANKED_WITHIN_SOURCE_RUN'&&item.rank!==null&&<span data-rank={item.rank}> · Rank {item.rank}</span>}</span><span className="inline-flex items-center gap-1 font-semibold text-[#1E3A2F]">View Details<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></span></span>
        </button>;})}</div>
      </article>;
    })}</div>
  </>;
}
