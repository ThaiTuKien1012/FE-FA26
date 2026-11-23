import { useState } from 'react';
import { Layers } from 'lucide-react';
import type { RecPage } from '../f06.types';
import { groupRecommendationPage, repeatedRecommendationIds } from '../f06.groups';
import { formatDate } from '../../../utils/dateTime';
import { recommendationLabel, recommendationNumber, recommendationPercent } from './F06ReadShared';
import { F06ProductTiles } from './F06ProductImage';
import { F06RecommendationGroupDetails } from './F06RecommendationGroupDetails';

export function F06RecommendationCards({ data, names={}, images={}, grouped=true, onOpen }: { compact?:boolean;data:RecPage;names?:Record<number,string>;images?:Record<number,string>;grouped?:boolean;onOpen:(id:number)=>void }) {
  const groups=groupRecommendationPage(data.items,grouped),repeated=repeatedRecommendationIds(data.items);
  const [selected,setSelected]=useState<{key:string;startIndex:number;opener:HTMLButtonElement}|null>(null);
  const selectedGroup=selected&&groups.find(group=>group.key===selected.key&&group.startIndex===selected.startIndex);
  const product=(id:number)=>names[id]??'Product #'+id;
  return <>
    {repeated.length>0&&<p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Repeated recommendation references were returned: {repeated.map(id=>'#'+id).join(', ')}. Every entry is shown. Refresh or ask System Admin to check these references.</p>}
    <div aria-label="Product recommendation cards" className="mt-4 grid items-start gap-4 xl:grid-cols-2">{groups.map(group=>{
      const first=group.items[0],title=first.productIds.map(product).join(' + '),multiple=group.items.length>1;
      return <article key={group.startIndex} data-product-group className="relative min-w-0 overflow-hidden rounded-2xl border border-[#DFE6DF] bg-[#FAFBF8] shadow-sm">
        <div className="p-4 sm:p-5"><div className="mb-4 flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="line-clamp-2 break-words text-base font-semibold text-[#1E3A2F]" title={title}>{title}</h3><p className="mt-1 text-xs text-[#6D7974]">{first.productIds.length} {first.productIds.length===1?'product':'products'} · {group.items.length} {group.items.length===1?'suggestion':'suggestions'} on this page</p>{!grouped&&<p className="mt-2 text-xs font-semibold text-[#356B54]">{recommendationLabel(first.type)}</p>}</div><Layers aria-hidden="true" className="h-5 w-5 shrink-0 text-[#6D7974]" /></div>
          <div className="max-w-md"><F06ProductTiles ids={first.productIds} names={names} images={images} /></div>
          <p className="mt-4 text-xs text-[#6D7974]">Snapshot #{first.snapshotId} · Rule set {first.policy.version}{first.sources[0]&&' · Analysis date '+formatDate(first.sources[0].analysisDate)}</p>
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs"><div><dt className="text-[#6D7974]" title="Priority-weighted historical value within this snapshot; not revenue, profit or a global ranking.">Historical utility</dt><dd className="mt-1 break-all font-semibold tabular-nums text-[#1E3A2F]">{recommendationNumber(first.utility)}</dd></div><div><dt className="text-[#6D7974]">Bought together</dt><dd className="mt-1 font-medium">{recommendationNumber(first.evidence.supportCount)} orders · {recommendationPercent(first.evidence.supportRatio)}</dd></div></dl>
        </div>
        <button type="button" data-group-open={group.startIndex} data-candidate-id={multiple?undefined:first.recommendationId} data-rank={!multiple&&data.ordering==='RANKED_WITHIN_SOURCE_RUN'?first.rank??undefined:undefined} aria-haspopup="dialog" aria-label={multiple?'View '+group.items.length+' recommendation types for '+title:'View details for recommendation #'+first.recommendationId+': '+title} title={title} onClick={event=>{
          event.currentTarget.focus({preventScroll:true});
          if(multiple)setSelected({key:group.key,startIndex:group.startIndex,opener:event.currentTarget});
          else onOpen(first.recommendationId);
        }} className="absolute inset-0 cursor-pointer rounded-2xl transition-colors hover:bg-[#1E3A2F]/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#356B54]" />
      </article>;
    })}</div>
    {selectedGroup&&selected&&<F06RecommendationGroupDetails items={selectedGroup.items} names={names} returnFocus={selected.opener} onClose={()=>setSelected(null)} onSelect={id=>{setSelected(null);onOpen(id);}} />}
  </>;
}
