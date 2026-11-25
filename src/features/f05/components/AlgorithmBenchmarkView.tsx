import { MiningHistoryView } from './MiningHistoryView';
import type { MiningReader } from '../f05.reader';
export function AlgorithmBenchmarkView({reader,requestId,onRequest}:{reader:MiningReader;requestId:number|null;onRequest:(id:number|null)=>void;runId?:number|null;onRun?:unknown;onCompare?:unknown}) {return <MiningHistoryView reader={reader} requestId={requestId} selectionError="" onSelect={onRequest}/>;}
