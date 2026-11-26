import type {RequestView,RunView} from '../../f05/f05.types';
import {miningButton,miningDate,formatMiningNumber} from '../../f05/f05.display';
import {formatDateRange} from '../../../utils/dateTime';

export const analysisTimestamp=(value:string|null)=>!value||Number.isNaN(Date.parse(value))?'Not recorded':miningDate(value,false);

export function F06AnalysisSummary({request,run,onChange,disabled=false,compact=false}:{request:RequestView;run:RunView;onChange?:()=>void;disabled?:boolean;compact?:boolean}){
 return <section data-selected-run={run.runId} data-selected-snapshot={run.snapshotId} aria-label="Selected analysis" className={'min-w-0 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] '+(compact?'p-3':'p-4')}>
  <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold text-[#243B30]">Analysis #{request.requestId}</h3><span className="rounded-full bg-[#EDF5F0] px-2 py-0.5 text-xs font-medium text-[#356B54]">Completed</span></div>{onChange&&<button type="button" className={miningButton} disabled={disabled} onClick={onChange}>Change Analysis</button>}</div>
  <p className="mt-2 text-sm text-[#53665B]">Sales period: {formatDateRange(request.snapshot.rangeStart,request.snapshot.rangeEnd)}</p>
  <dl className="mt-3 grid gap-x-5 gap-y-2 text-xs sm:grid-cols-3"><div className="min-w-0"><dt className="text-[#6D7974]">Created on</dt><dd className="mt-1 break-words font-medium">{analysisTimestamp(request.createdAt)}</dd></div><div className="min-w-0"><dt className="text-[#6D7974]">Completed on</dt><dd className="mt-1 break-words font-medium">{analysisTimestamp(run.completedAt)}</dd></div><div><dt className="text-[#6D7974]">Product combinations found</dt><dd className="mt-1 font-medium">{run.patternCount===null?'Not recorded':formatMiningNumber(run.patternCount)}</dd></div></dl>
 </section>;
}
