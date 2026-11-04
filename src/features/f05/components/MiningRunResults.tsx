import { useState } from 'react';
import { miningButton } from '../f05.display';
import type { RequestView, RunView } from '../f05.types';
import { MiningPatternsView } from './MiningPatternsView';
import { storeMiningReader } from '../f05.reader';
import type { MiningReader } from '../f05.reader';
interface Props {
  request:RequestView; runs:RunView[]; run:RunView; onReadError:(error:unknown)=>void;
  reader?:MiningReader;
  onOpenBenchmark?:(requestId:number,runId:number)=>void;
}
export function MiningRunResults({request,run,onReadError,reader=storeMiningReader,onOpenBenchmark}:Props){
  const [showPatterns,setShowPatterns]=useState(false);
  return <div className="mt-5 border-t border-[#CADACF] pt-4">
    {reader.kind==='store' ? <><button type="button" aria-expanded={showPatterns} className={miningButton} onClick={()=>setShowPatterns(v=>!v)}>{showPatterns?'Hide patterns':'Show patterns'}</button>
      {showPatterns&&<MiningPatternsView key={run.runId} run={run} onReadError={onReadError}/>}</> :
      onOpenBenchmark&&<button type="button" className={miningButton} onClick={()=>onOpenBenchmark(request.requestId,run.runId)}>Open algorithm benchmark</button>}
  </div>;
}
