import { useState } from 'react';
import { algorithmName, miningButton } from '../f05.display';
import type { RequestView, RunView } from '../f05.types';
import { MiningPatternsView } from './MiningPatternsView';
import { storeMiningReader } from '../f05.reader';
import type { MiningReader } from '../f05.reader';
interface Props {
  compact?: boolean;
  request:RequestView; runs:RunView[]; run:RunView; onReadError:(error:unknown)=>void;
  reader?:MiningReader;
  onOpenBenchmark?:(requestId:number,runId:number)=>void;
}
export function MiningRunResults({request,run,onReadError,reader=storeMiningReader,onOpenBenchmark,compact=false}:Props){
  const [showPatterns,setShowPatterns]=useState(false);
  if (compact && reader.kind === 'store') return <section className="mt-5 border-t border-[#E7E2D8] pt-5"><header className="flex flex-wrap items-center gap-x-3 gap-y-1"><h3 className="font-semibold">Analysis Results</h3><span className="text-sm font-medium text-[#356B54]">{algorithmName(run.algorithm)}</span><span className="text-xs text-[#6D7974]">Run #{run.runId} / Snapshot #{run.snapshotId}</span></header><MiningPatternsView compact key={run.runId} run={run} onReadError={onReadError} /></section>;
  return <div className="mt-5 border-t border-[#CADACF] pt-4">
    {reader.kind==='store' ? <><button type="button" aria-expanded={showPatterns} className={miningButton} onClick={()=>setShowPatterns(v=>!v)}>{showPatterns?'Hide patterns':'Show patterns'}</button>
      {showPatterns&&<MiningPatternsView key={run.runId} run={run} onReadError={onReadError}/>}</> :
      <p className="text-xs text-[#6D7974]">Execution metrics are available in Run Details. Raw product patterns are available to this Store’s Merchandiser and Store Admin.</p>}
  </div>;
}
