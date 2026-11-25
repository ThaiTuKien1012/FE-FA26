import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { RecPage } from '../f06.types';
import { crossSellDirection, productNames, recommendationPurchaseEvidence, recommendationRationale, recommendationTypeCopy } from '../f06.presentation';
import { F06ProductTiles } from './F06ProductImage';
import { RecommendationBadge } from './F06ReadShared';

/** One saved candidate per card. Never merge types, directions, decisions or versions. */
export function F06RecommendationCards({data,names={},images={},onOpen}:{compact?:boolean;grouped?:boolean;data:RecPage;names?:Record<number,string>;images?:Record<number,string>;onOpen:(id:number)=>void}) {
  return <div aria-label="Product recommendation cards" className="grid items-stretch gap-4 lg:grid-cols-2">{data.items.map((item,index)=>{
    const evidence=recommendationPurchaseEvidence(item,names),direction=crossSellDirection(item),title=productNames(item.productIds,names);
    return <article key={item.recommendationId+':'+index} data-product-group data-recommendation-card data-type={item.type} className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#DFE6DF] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center gap-2"><RecommendationBadge status={item.reviewStatus}/><RecommendationBadge status={item.currentEligibility.status}/>{item.readyForConsumption&&<span data-layout-ready className="rounded-full bg-[#EDF5F0] px-2.5 py-1 text-xs font-semibold text-[#1E3A2F]">Ready for Layout</span>}</div>
      <h3 className="mt-4 line-clamp-2 break-words text-base font-semibold text-[#1E3A2F]" title={title}>{title}</h3>
      <p data-retail-proposal className="mt-2 line-clamp-3 break-words text-sm leading-6 text-[#57534E]" title={recommendationRationale(item,names)}>{recommendationRationale(item,names)}</p>
      <div className="mt-4 max-w-md"><F06ProductTiles retail ids={direction?[direction.anchor,...direction.targets]:item.productIds} names={names} images={images}/></div>
      {direction&&<div aria-label="Cross-sell direction" className="mt-4 flex min-w-0 items-center gap-2 rounded-lg bg-[#EDF5F0] p-3 text-xs text-[#1E3A2F]"><span className="min-w-0 flex-1 break-words"><span className="block text-[11px] font-medium text-[#6D7974]">Starting product</span>{names[direction.anchor]||'Name unavailable'}</span><ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0"/><span className="min-w-0 flex-1 break-words"><span className="block text-[11px] font-medium text-[#6D7974]">Suggested additions</span>{productNames(direction.targets,names)}</span></div>}
      <div data-purchase-evidence className="mt-4 rounded-xl bg-[#FAFBF8] p-3 text-sm leading-6 text-[#243B30]"><p>{evidence.groupSentence}</p><p className="mt-1 text-xs text-[#6D7974]">Purchase frequency: <strong className="text-[#1E3A2F]">{evidence.groupPercent??'Unavailable'}</strong></p>{direction&&<p className="mt-2 break-words text-xs leading-5">{evidence.directionalSentence}</p>}</div>
      <span aria-hidden="true" className="mt-auto flex items-center justify-end gap-1 pt-4 text-xs font-semibold text-[#1E3A2F]">View Details<ArrowUpRight className="h-4 w-4"/></span>
      <button type="button" data-candidate-id={item.recommendationId} data-group-open={index} data-rank={item.rank??undefined} aria-haspopup="dialog" aria-label={'View Details: '+recommendationTypeCopy[item.type].title+' - '+title} onClick={event=>{event.currentTarget.focus({preventScroll:true});onOpen(item.recommendationId);}} className="absolute inset-0 cursor-pointer rounded-2xl transition-colors hover:bg-[#1E3A2F]/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#356B54]"/>
    </article>;
  })}</div>;
}
