import { useId } from 'react';
import { AlertTriangle, Bell, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import type { RecExpiryBatch, RecExpiryPage } from '../f06.types';
import { batchExpiryLabel, calendarDay, daysUntilExpiry, expiryLabel, missingPushDayWarning, quantityLabel, sellingPriorityLabel } from '../f06.expiry.presentation';
import { recommendationWarning } from '../f06.presentation';
import { formatDate } from '../../../utils/dateTime';
import { miningButton, miningDate } from '../../f05/f05.display';
import { useF06Expiry, useProductExpiry } from './F06ExpiryContext';
import { F06ProductImage } from './F06ProductImage';
import { confirmedProductBatches, type LiveExpiryState, type ProductExpiry } from '../f06.expiry';

export function F06ExpiryNotice(){
  const context=useF06Expiry();if(!context)return null;
  return <F06ExpiryNoticeContent state={context.state} onOpen={context.openAlerts}/>;
}
export function F06ExpiryNoticeContent({state,onOpen}:{state:LiveExpiryState;onOpen:()=>void}){
  const id=useId(),data=state.summary,loading=state.loading||!data&&!state.error;
  const confirmed=!loading&&!state.error?data:null;
  const due=!!confirmed&&confirmed.totalElements>0,missing=!!confirmed?.warnings.some(message=>missingPushDayWarning(message));
  const inventoryWarning=!!confirmed?.warnings.length;
  const status=loading?'loading':state.error?'error':due?'due':missing?'missing':inventoryWarning?'warning':'empty';
  const amber=due||inventoryWarning;
  const Icon=loading?Loader2:amber?AlertTriangle:Bell;
  const summary=loading?'Checking expiry alerts...':state.error?'Expiry alerts are temporarily unavailable.':due?
    quantityLabel(confirmed!.totalElements,'batch','batches')+(confirmed!.totalElements===1?' needs attention':' need attention'):
    missing?'Some batches need a Push Day.':inventoryWarning?'Some inventory information needs checking.':'No batches currently require selling priority.';
  const description=loading?'Open Expiry Alerts to review batch information.':state.error?'Open details and use Refresh Alerts to try again.':due?
    'Prioritize selling these products before they expire.':missing?'Store Admin needs to set a Push Day before selling-priority alerts can be determined.':
    inventoryWarning?'Open details to review the inventory notices.':'Open details to review batch information or refresh the latest check.';
  return <button type="button" data-expiry-notice data-expiry-state={status} data-due-count={confirmed?.totalElements} aria-haspopup="dialog" aria-labelledby={id+'-title '+id+'-summary'} aria-describedby={id+'-description'} onClick={onOpen}
    className={'flex w-full items-center gap-3 rounded-xl border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54] '+(due?'p-4 ':'p-3 ')+(amber?'border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100/70':'border-[#E7E2D8] bg-white text-[#243B30] hover:bg-[#F5F7F2]')}>
    <Icon aria-hidden="true" className={'h-5 w-5 shrink-0 '+(loading?'animate-spin motion-reduce:animate-none text-[#6D7974]':amber?'text-amber-700':'text-[#66816F]')}/>
    <span className="min-w-0 flex-1"><span id={id+'-title'} className="block text-sm font-semibold">Expiry Alerts</span><span id={id+'-summary'} aria-live="polite" aria-atomic="true" className={'mt-0.5 block break-words '+(due?'text-base font-semibold':'text-sm font-medium')}>{summary}</span><span id={id+'-description'} className={'mt-1 block text-xs leading-5 '+(amber?'text-amber-900':'text-[#6D7974]')}>{description}</span></span>
    <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 opacity-70"/>
  </button>;
}
export function MissingPushDayWarnings({warnings,names={}}:{warnings:string[];names?:Record<number,string>}){
  if(!warnings.length)return null;
  const unique=[...new Set(warnings)],missing=unique.filter(message=>missingPushDayWarning(message)),other=unique.filter(message=>!missingPushDayWarning(message));
  return <div className="space-y-2">{missing.length>0&&<aside aria-label="Missing Push Day notices" className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-950"><details><summary className="cursor-pointer text-[13px] font-semibold marker:text-amber-700 focus-visible:outline-2 focus-visible:outline-[#356B54]">Missing Push Day ({missing.length} {missing.length===1?'notice':'notices'})</summary><ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-xs">{missing.map(message=>{const warning=missingPushDayWarning(message)!;return <li key={message} className="min-w-0 break-words"><strong className="font-medium">{names[warning.productId]??'Product #'+warning.productId}</strong><span className="mt-0.5 block text-amber-900">{warning.batchIds.map(id=>'Batch #'+id).join(', ')}</span></li>;})}</ul></details><p className="mt-1 text-xs leading-5 text-amber-900">Store Admin needs to set a Push Day for these batches before selling-priority alerts can be calculated.</p></aside>}{other.length>0&&<details className="rounded-lg bg-[#FAF8F5] px-3 py-2.5 text-sm text-amber-900"><summary className="cursor-pointer text-[13px] font-medium">Inventory notes ({other.length})</summary><ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-xs">{other.map((message,index)=><li key={index} className="break-words">{recommendationWarning(message,names)}</li>)}</ul></details>}</div>;
}
export function F06ExpiryBatchCard({batch,data,name,imageUrl}:{batch:RecExpiryBatch;data:Pick<RecExpiryPage,'asOfDate'>;name:string;imageUrl?:string}){
  const days=daysUntilExpiry(batch.expiryDate,data.asOfDate),unexpected=days!==null&&days<0;
  return <li data-expiry-batch={batch.batchId} className="min-w-0 rounded-xl border border-[#E7E2D8] bg-white p-4">
    <div className="flex items-center gap-3"><div className="w-12 shrink-0"><F06ProductImage compactFallback id={batch.productId} name={name} imageUrl={imageUrl}/></div><div className="min-w-0"><h3 className="break-words text-sm font-semibold leading-5 text-[#243B30]">{name}</h3><p className="mt-1 text-xs text-[#6D7974]">Batch #{batch.batchId}</p></div></div>
    <div aria-label="Selling priority for this batch" className="mt-3 space-y-1.5 rounded-lg bg-amber-50/70 px-3 py-3">
      <p className="text-sm font-semibold leading-5 text-amber-900">{sellingPriorityLabel(batch.daysToPush)}</p>
      <p className={'text-lg font-semibold leading-6 '+(days!==null&&days>=0&&days<=3?'text-amber-900':'text-[#243B30]')}>{batchExpiryLabel(batch.expiryDate,data.asOfDate)}</p>
      <p className="text-sm tabular-nums text-[#53665B]">{quantityLabel(batch.remainingQuantity,'unit')} remaining in this batch</p>
    </div>
    <dl className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-[#6D7974]">Push Day</dt><dd className="mt-1 font-medium text-[#36473E]">{calendarDay(batch.pushDay)===null?'Unavailable':formatDate(batch.pushDay)}</dd></div><div><dt className="text-[#6D7974]">Expiry date</dt><dd className="mt-1 font-medium text-[#36473E]">{batch.expiryDate===null?'Not recorded':calendarDay(batch.expiryDate)===null?'Unavailable':formatDate(batch.expiryDate)}</dd></div></dl>
    {unexpected&&<p className="mt-3 text-xs text-red-800">The returned expiry date has passed. Check current inventory availability before making a decision.</p>}
  </li>;
}
export function F06SellingPriority({ids,names={}}:{ids:number[];names?:Record<number,string>}){
  const {context,products}=useProductExpiry(ids);
  return <F06SellingPriorityContent ids={ids} names={names} products={products} refresh={()=>void context?.workflow.refresh()}/>;
}
export function F06SellingPriorityContent({ids,names={},products,refresh}:{ids:number[];names?:Record<number,string>;products:Record<number,ProductExpiry>;refresh:()=>void}){
  const confirmed:Record<number,RecExpiryBatch[]>=Object.fromEntries(ids.map(id=>[id,confirmedProductBatches(products[id])])),affected=ids.filter(id=>confirmed[id]?.length);
  if(!affected.length)return null;
  return <section aria-label="Selling Priority" className="rounded-xl border border-amber-200 bg-amber-50/60 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-semibold text-amber-950">Selling Priority</h3><button type="button" className={miningButton} onClick={refresh}><RefreshCw aria-hidden="true" className="mr-1.5 h-3.5 w-3.5"/>Refresh priority</button></div><p className="mt-2 text-xs leading-5 text-amber-900">Current due batches, separate from the saved purchase evidence. Consider prioritizing this recommendation if it is suitable for your store.</p><ul className="mt-3 space-y-3">{affected.map(id=>{const data=products[id].data!;return <li key={id} className="min-w-0"><h4 className="break-words text-sm font-semibold">{names[id]??'Product #'+id}</h4><ul className="mt-1 space-y-1 text-xs leading-5">{confirmed[id].map(batch=><li key={batch.batchId}>Batch #{batch.batchId}: {expiryLabel(batch.expiryDate,data.asOfDate)}; {quantityLabel(batch.remainingQuantity,'unit')} remaining.</li>)}</ul>{data.totalElements>data.items.length&&<p className="mt-1 text-xs text-[#6D7974]">Showing {data.items.length} of {data.totalElements.toLocaleString('en-US')} due batches. Open Expiry Alerts from the page to view all batches.</p>}<p className="mt-1 text-[11px] text-[#6D7974]">Checked {miningDate(data.checkedAt)}</p></li>;})}</ul></section>;
}
