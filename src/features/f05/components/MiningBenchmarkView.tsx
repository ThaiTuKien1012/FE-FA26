import type { MiningReader } from '../f05.reader';
import type { RequestView, RunView } from '../f05.types';
import { algorithmName, formatMiningNumber } from '../f05.display';
/** Historical telemetry only. The benchmark endpoints have been retired. */
export function MiningBenchmarkView({request,runs}:{request:RequestView;runs:RunView[];selectedRun?:RunView;onReadError?:(e:unknown)=>void;reader?:MiningReader}) {return <section aria-label="Historical execution metrics"><p>Request #{request.requestId} · Comparison metadata: {request.comparisonStatus}</p>{runs.map(run=><dl key={run.runId} className="mt-3 text-sm"><dt>Run #{run.runId} · {algorithmName(run.algorithm)}</dt><dd>Runtime: {formatMiningNumber(run.runtimeMillis)} ms · Java heap: {formatMiningNumber(run.memoryMiB)} MiB · Patterns: {formatMiningNumber(run.patternCount)}</dd></dl>)}</section>;}
