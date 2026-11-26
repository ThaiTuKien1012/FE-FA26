import type {RequestView,RunView} from '../../f05/f05.types';
import {miningButton,miningDate,formatMiningNumber} from '../../f05/f05.display';
import {formatDateRange} from '../../../utils/dateTime';
import {BarChart3,CalendarDays,Check} from 'lucide-react';

export const analysisTimestamp=(value:string|null)=>!value||Number.isNaN(Date.parse(value))?'Not recorded':miningDate(value,false);
export function AnalysisTime({value}:{value:string|null}){
 const display=analysisTimestamp(value);
 if(display==='Not recorded')return <span>Not recorded</span>;
 const [date,time]=display.split(' ');
 return <time dateTime={value!}><span className="block">{date}</span>{' '}<span className="block text-xs font-normal text-[#6D7974]">{time}</span></time>;
}

export function F06AnalysisSummary({request,run,onChange,disabled=false,compact=false}:{request:RequestView;run:RunView;onChange?:()=>void;disabled?:boolean;compact?:boolean}){
 const period=formatDateRange(request.snapshot.rangeStart,request.snapshot.rangeEnd),count=run.patternCount===null?'Not recorded':formatMiningNumber(run.patternCount);
 if(compact)return <section data-selected-run={run.runId} data-selected-snapshot={run.snapshotId} aria-label="Selected analysis" className="rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] p-3 text-xs">
  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-[#243B30]">Analysis #{request.requestId}</h3><span className="font-medium text-[#356B54]">Completed</span></div>
  <p className="mt-2 text-[#53665B]">Sales period: {period}</p><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[#6D7974]"><p>Completed on: {analysisTimestamp(run.completedAt)}</p><p>Product combinations found: <strong className="text-[#243B30]">{count}</strong></p></div>
 </section>;
 return <section data-selected-run={run.runId} data-selected-snapshot={run.snapshotId} aria-label="Selected analysis" className="min-w-0 overflow-hidden rounded-2xl border border-[#DDE5DF]">
  <div className="bg-[#1D3C30] p-4 text-white sm:px-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10"><BarChart3 aria-hidden="true" className="h-5 w-5"/></span><div><p className="text-[10px] font-semibold tracking-widest text-[#CEDDD4]">CURRENTLY VIEWING</p><h3 className="mt-0.5 text-xl font-semibold">Analysis #{request.requestId}</h3></div></div>{onChange&&<button type="button" className={miningButton+' shrink-0'} disabled={disabled} onClick={onChange}>Change Analysis</button>}</div>
  <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#E1EAE4]"><CalendarDays aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0"/><span>Sales period: {period}</span></p></div>
  <div className="bg-[#F7FAF7] p-4 sm:px-5"><dl className="grid gap-3 text-sm sm:grid-cols-3 sm:gap-5 sm:divide-x sm:divide-[#DDE5DF]"><div className="min-w-0"><dt className="text-xs text-[#6D7974]">Created on</dt><dd className="mt-1 font-medium"><AnalysisTime value={request.createdAt}/></dd></div><div className="min-w-0 sm:pl-5"><dt className="text-xs text-[#6D7974]">Completed on</dt><dd className="mt-1 font-medium"><AnalysisTime value={run.completedAt}/></dd></div><div className="sm:pl-5"><dt className="text-xs text-[#6D7974]">Product combinations</dt><dd className="mt-1 text-2xl font-semibold leading-7 text-[#243B30]">{count}</dd></div></dl>
  <p className="mt-3 flex items-center gap-1.5 text-xs text-[#356B54]"><Check aria-hidden="true" className="h-3.5 w-3.5"/>Analysis completed<span className="ml-auto text-[#6D7974]">Result #{run.runId}</span></p></div>
 </section>;
}
