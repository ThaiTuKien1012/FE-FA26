import {CircleCheck, CircleMinus, Store} from 'lucide-react';
import type {StoreStatus, StoreView} from './storeManagement.api';

export const directoryAction = 'inline-flex h-9 min-w-[96px] items-center justify-center whitespace-nowrap rounded-lg border border-[#D5E0D3] bg-white px-3.5 text-sm font-semibold text-[#365D3E] transition-colors hover:border-[#AFC5AE] hover:bg-[#EDF5E9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54]';
export const directoryRefresh = 'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE4DC] bg-white px-3 text-sm font-medium text-[#365543] transition-colors hover:border-[#BDCEC1] hover:bg-[#F3F7F3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54]';
export const directoryInput = 'h-11 w-full rounded-xl border border-[#DDE4DC] bg-[#FCFDFB] text-sm text-[#191C1B] outline-none transition placeholder:text-[#8A968E] focus:border-[#689477] focus:bg-white focus:ring-2 focus:ring-[#356B54]/10';
export const directoryPageButton = 'inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-[#DFE5D9] bg-white px-3 font-medium text-[#536A4C] transition-colors hover:bg-[#F0F5EB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54] disabled:cursor-not-allowed disabled:text-[#B3BCAE]';

const metrics = [
  {status:'ALL', label:'Total Stores', description:'All registered stores', Icon:Store, accent:'#748F80', iconStyle:'bg-[#EDF2EF] text-[#456653]'},
  {status:'ACTIVE', label:'Active Stores', description:'Stores currently operating', Icon:CircleCheck, accent:'#6D9B7A', iconStyle:'bg-[#EAF5ED] text-[#3D7750]'},
  {status:'INACTIVE', label:'Inactive Stores', description:'Stores currently disabled', Icon:CircleMinus, accent:'#A0A99A', iconStyle:'bg-[#F1F3EE] text-[#727D66]'},
] as const;

export function StoreOverview({counts, loading, status, onStatus}:{
  counts:Partial<Record<StoreStatus|'ALL', number>>;
  loading:boolean;
  status:StoreStatus|'ALL';
  onStatus:(status:StoreStatus|'ALL')=>void;
}) {
  return <section aria-label="Store overview" data-store-overview>
    <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map(metric => <button key={metric.status} type="button" data-store-metric={metric.status}
        aria-pressed={status===metric.status} onClick={()=>onStatus(metric.status)}
        className="flex h-full min-w-0 flex-col rounded-2xl border border-t-2 border-[#E7E2D8] bg-white p-5 text-left shadow-[0_1px_2px_rgba(30,58,47,0.03)] transition-colors hover:border-x-[#BDCEC1] hover:border-b-[#BDCEC1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54]"
        style={{borderTopColor:metric.accent}}>
        <span className="flex w-full items-start justify-between gap-3">
          <span className="pt-1 text-sm font-medium leading-5 text-[#59685F]">{metric.label}</span>
          <span className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl '+metric.iconStyle}>
            <metric.Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.7}/>
          </span>
        </span>
        <span data-store-value className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-[#1E3A2F]">
          {counts[metric.status]===undefined ? loading?'…':'Unavailable' : counts[metric.status]!.toLocaleString('en-US')}
        </span>
        <span className="mt-2 text-xs leading-5 text-[#6D7974] sm:max-[87.5rem]:min-h-10">{metric.description}</span>
      </button>)}
    </div>
  </section>;
}

export function StoreDirectoryContact({store}:{store:Pick<StoreView,'address'|'phone'>}) {
  return <div data-store-contact className="space-y-1 break-words text-sm leading-5">
    <p><span className="text-[#6D7974]">Address: </span>{store.address||'Not set'}</p>
    <p><span className="text-[#6D7974]">Phone: </span>{store.phone||'Not set'}</p>
  </div>;
}
