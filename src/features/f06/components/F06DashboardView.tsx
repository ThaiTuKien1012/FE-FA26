import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { miningButton, miningInput, miningPrimaryButton } from '../../f05/f05.display';
import type { RecommendationBrowser, RecommendationBrowseState } from '../f06.browse';
import { REVIEW_STATUSES } from '../f06.validation';
import { recommendationTypeCopy } from '../f06.presentation';
import { F06Pages } from './F06Pages';
import { F06RankedSource } from './F06RankedSource';
import { F06RecommendationTable } from './F06RecommendationTable';
import { F06RecommendationDetails } from './F06RecommendationDetails';
import { F06TypeTabs } from './F06TypeTabs';
import { recommendationLabel } from './F06ReadShared';
import { F06ExpiryPanel, F06RulesPanel } from './F06Utilities';

export function F06DashboardContent({state,workflow,onSelectRun,onChooseAnalysis,onGenerate}:{state:RecommendationBrowseState;workflow:RecommendationBrowser;onSelectRun?:(id:number)=>void;onChooseAnalysis?:()=>void;onGenerate?:()=>void}) {
  const [utilityPanel,setUtilityPanel]=useState<'rules'|'expiry'|null>(null);
  const data=state.list,type=state.filters.type??'BUNDLE',copy=recommendationTypeCopy[type];
  if(state.role!=='Merchandiser'&&state.role!=='Store Admin')return <p role="alert">Recommendations are unavailable for this role.</p>;
  return <section aria-labelledby="f06-dashboard-title" className="min-w-0 space-y-5 rounded-2xl border border-[#E7E2D8] bg-white p-4 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="f06-dashboard-title" className="text-xl font-semibold">Recommendation Library</h2><details className="relative text-sm"><summary className="cursor-pointer rounded-lg border border-[#E7E2D8] px-3 py-2 text-xs font-semibold text-[#57534E]">Store tools</summary><div className="absolute right-0 z-20 mt-2 flex w-44 flex-col gap-1 rounded-xl border border-[#E7E2D8] bg-white p-2 shadow-lg"><button type="button" className={miningButton} onClick={()=>setUtilityPanel('rules')}>Store Rules</button><button type="button" className={miningButton} onClick={()=>setUtilityPanel('expiry')}>Expiry Alerts</button></div></details></div>
    <F06RankedSource state={state} workflow={workflow} onSelectRun={onSelectRun} onChooseAnalysis={onChooseAnalysis}/>
    {state.sourceLoading?<p role="status" className="text-sm text-[#6D7974]">Checking selected analysis...</p>:!state.sourceRun?<>{state.error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{state.error}</p>}<p className="text-sm text-[#6D7974]">Choose a completed analysis to view its recommendations.</p></>:<>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#6D7974]">Review one suggestion at a time. Approval does not publish a campaign or reserve stock.</p><div className="flex flex-wrap gap-2"><button type="button" className={miningButton} disabled={state.loading||state.reviewPending} onClick={()=>void workflow.refresh(true)}><RefreshCw aria-hidden="true" className="mr-1.5 inline h-4 w-4"/>Refresh</button>{state.role==='Merchandiser'&&onGenerate&&<button type="button" disabled={state.reviewPending} className={miningPrimaryButton} onClick={onGenerate}>Generate Recommendations</button>}</div></div>
      <F06TypeTabs value={type} disabled={state.reviewPending} onChange={next=>void workflow.applyFilters({...state.filters,type:next})}/>
      <div className="flex flex-wrap items-end justify-between gap-3"><label className="text-xs font-semibold" htmlFor="f06-filter-review">Review status<select id="f06-filter-review" className={miningInput} disabled={state.reviewPending} value={state.filters.reviewStatus??''} onChange={event=>void workflow.applyFilters({...state.filters,reviewStatus:event.target.value as typeof state.filters.reviewStatus||undefined})}><option value="">All statuses</option>{REVIEW_STATUSES.map(status=><option key={status} value={status}>{recommendationLabel(status)}</option>)}</select></label><label className="text-xs font-semibold" htmlFor="f06-filter-size">Items per page<select id="f06-filter-size" className={miningInput} disabled={state.reviewPending} value={state.filters.pageSize??20} onChange={event=>void workflow.applyFilters({...state.filters,pageSize:Number(event.target.value)})}>{[10,20,50,100].map(size=><option key={size}>{size}</option>)}</select></label></div>
      <div id="f06-type-panel" role="tabpanel" aria-labelledby={'f06-type-'+type} className="min-w-0 space-y-4" aria-busy={state.loading}>
        {state.loading?<p role="status" className="flex items-center gap-2 py-5 text-sm text-[#6D7974]"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none"/>Loading recommendations...</p>:state.error?<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{state.error}</p>:data&&<>
          <p className="text-xs text-[#6D7974]">{data.totalElements.toLocaleString('en-US')} matching recommendations</p>
          {!data.items.length?<p className="rounded-xl bg-[#FAF8F5] p-5 text-sm text-[#6D7974]">{state.filters.reviewStatus?'No '+recommendationLabel(state.filters.reviewStatus).toLowerCase()+' '+copy.title.toLowerCase()+' recommendations match this selection.':'No '+copy.title.toLowerCase()+' recommendations were found for this analysis.'} {state.role==='Merchandiser'?'You can generate suggestions or choose another type.':'A Merchandiser can generate suggestions.'}</p>:<F06RecommendationTable data={data} names={{...state.listNames,...state.names}} images={state.images} onOpen={id=>void workflow.openDetail(id)}/>}
          <F06Pages data={data} label="recommendations" busy={state.loading} onPage={page=>void workflow.setPage(page)}/>
        </>}
      </div>
    </>}
    {state.detailId!==null&&<F06RecommendationDetails key={state.detailId} state={state} workflow={workflow}/>}
    {utilityPanel==='rules'&&<F06RulesPanel onClose={()=>setUtilityPanel(null)}/>}
    {utilityPanel==='expiry'&&<F06ExpiryPanel onClose={()=>setUtilityPanel(null)}/>}
  </section>;
}
