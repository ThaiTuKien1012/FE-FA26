import {formatDateRange} from '../../../utils/dateTime';
import {miningDate} from '../f05.display';
import type {RequestView} from '../f05.types';
import {MiningStatusBadge} from './MiningStatusBadge';
import {historyButton} from './SystemHistoryDialog';

export function SystemHistoryList({items,selectedId,onSelect}:{items:RequestView[];selectedId:number|null;onSelect:(id:number)=>void}){
 const action=(item:RequestView)=><button type="button" className={historyButton+' whitespace-nowrap'} aria-label={'View details for analysis #'+item.requestId} aria-pressed={item.requestId===selectedId} onClick={()=>onSelect(item.requestId)}>View Details</button>;
 const period=(item:RequestView)=><><p>{formatDateRange(item.snapshot.rangeStart,item.snapshot.rangeEnd)}</p><p className="mt-1 text-xs text-[#6D7974]">Snapshot #{item.snapshotId}</p></>;
 return <>
  <table aria-label="Analysis History" className="hidden w-full table-fixed text-left text-sm xl:table">
   <colgroup>{[17,28,15,23,17].map((width,index)=><col key={index} style={{width:width+'%'}}/>)}</colgroup>
   <thead className="border-b border-[#E2E7DE] bg-[#F5F7F2] text-xs text-[#64745F]"><tr>{['Analysis','Sales Period','Status','Created On','Actions'].map(label=><th key={label} scope="col" className={'px-5 py-3.5 font-semibold sm:px-6 '+(label==='Actions'?'text-right':'')}>{label}</th>)}</tr></thead>
   <tbody className="divide-y divide-[#EBEEE7]">{items.map(item=><tr key={item.requestId} className={'transition-colors hover:bg-[#F5F9F4] '+(item.requestId===selectedId?'bg-[#F3F8F4]':'')}>
    <th scope="row" className="break-words px-5 py-4 font-semibold text-[#263C2E] sm:px-6">Analysis #{item.requestId}</th><td className="px-5 py-4 sm:px-6">{period(item)}</td><td className="px-5 py-4 sm:px-6"><MiningStatusBadge friendly kind="request" status={item.status}/></td><td className="px-5 py-4 text-[#6D7974] sm:px-6"><time dateTime={item.createdAt}>{miningDate(item.createdAt,false)}</time></td><td className="px-5 py-4 text-right sm:px-6">{action(item)}</td>
   </tr>)}</tbody>
  </table>
  <ul aria-label="Analysis history cards" className="divide-y divide-[#EBEEE7] xl:hidden">{items.map(item=><li key={item.requestId} className="space-y-3 px-5 py-4 text-sm sm:px-6">
   <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-[#263C2E]">Analysis #{item.requestId}</h3><MiningStatusBadge friendly kind="request" status={item.status}/></div>
   <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="mb-1 text-xs text-[#6D7974]">Sales Period</dt><dd>{period(item)}</dd></div><div><dt className="mb-1 text-xs text-[#6D7974]">Created On</dt><dd><time dateTime={item.createdAt}>{miningDate(item.createdAt,false)}</time></dd></div></dl><div className="flex justify-end">{action(item)}</div>
  </li>)}</ul>
 </>;
}
