import { useEffect, useState } from 'react';
import { authService } from '../../../services/authService';
import { F05ApiError } from '../f05.api';
import type { MiningReader } from '../f05.reader';
import { algorithmName, formatMiningNumber, formatThreshold, MATCH_DESCRIPTION, miningErrorMessage } from '../f05.display';
import { assessBenchmarkComparison, assertBenchmarkContext, benchmarkRuntimeDifference } from '../f05.results';
import type { BenchmarkView, RequestView, RunView } from '../f05.types';
import { MiningStatusBadge } from './MiningStatusBadge';

interface Props { request:RequestView; runs:RunView[]; selectedRun:RunView; onReadError:(error:unknown)=>void; reader:MiningReader; }
export function MiningBenchmarkView({request,runs,selectedRun,onReadError,reader}:Props){
  const token=authService.getToken();
  const targets=(['HUI_MINER','EFIM'] as const).flatMap(algorithm=>{
    if(algorithm===selectedRun.algorithm)return [selectedRun];
    const matching=runs.filter(run=>run.algorithm===algorithm&&request.algorithms.includes(algorithm));
    return matching.length===1?matching:[];
  });
  const key=JSON.stringify([reader.scopeKey,request.requestId,request.status,request.comparisonStatus,targets.map(run=>[run.runId,run.status])]);
  const [result,setResult]=useState<{key:string;token:string|null;rows?:BenchmarkView[];error?:string}|null>(null);
  const current=result?.key===key&&result.token===token?result:null;
  useEffect(()=>{
    const controller=new AbortController();
    void Promise.all(targets.map(async run=>{
      if(!reader.getBenchmark)throw new F05ApiError(403,'Benchmark access is System Admin only.');
      const benchmark=await reader.getBenchmark(run.runId,controller.signal);
      assertBenchmarkContext(benchmark,request,run);return benchmark;
    })).then(rows=>{
      if(controller.signal.aborted)return;
      if(authService.getToken()!==token)throw new F05ApiError(401,'The active session changed. Refresh benchmark for the current session.');
      setResult({key,token,rows});
    }).catch(error=>{
      if(controller.signal.aborted)return;
      controller.abort();setResult({key,token,error:miningErrorMessage(error)});onReadError(error);
    });
    return()=>controller.abort();
    // Unchanged polling statuses must not repeatedly fetch immutable benchmarks.
  },[key,token,reader,onReadError]);
  const rows=current?.rows;
  const assessment=rows?assessBenchmarkComparison(request,rows):null;
  const timing=rows?benchmarkRuntimeDifference(request,rows):null;
  return <section aria-labelledby="f05-benchmark-title" className="overflow-hidden rounded-2xl border border-[#E7E2D8] bg-white">
    <div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
      <div><h2 id="f05-benchmark-title" className="text-xl font-semibold">Algorithm Performance Comparison</h2><p className="mt-1 text-sm text-[#6D7974]">Compare HUI-Miner and EFIM using the same snapshot and mining settings.</p></div>
    </div>
    {!current?<p role="status" className="px-5 pb-5 text-sm text-[#6D7974]">Loading measured benchmarks...</p>:current.error?<p role="alert" className="mx-5 mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{current.error} Use Refresh comparison to retry manually.</p>:rows&&assessment&&<div className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-[#E7E2D8] py-4 text-sm">
        <span><span className="text-[#6D7974]">Request </span><strong>#{request.requestId}</strong></span>
        <span><span className="text-[#6D7974]">Snapshot </span><strong>#{request.snapshotId}</strong></span>
        <span className="flex items-center gap-2"><span className="text-[#6D7974]">Comparison</span><MiningStatusBadge friendly kind="comparison" status={request.comparisonStatus}/></span>
        <span><span className="text-[#6D7974]">Minimum Utility </span><strong>{formatThreshold(request.minUtilValue,request.minUtilMode)}</strong></span>
      </div>
      {request.comparisonStatus==='MATCH'&&<p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{MATCH_DESCRIPTION}</p>}
      <div className={`grid gap-4 ${rows.length===2?'lg:grid-cols-2':''}`}>
        {rows.map(benchmark=><article key={benchmark.run.runId} aria-label={`${algorithmName(benchmark.run.algorithm)} benchmark`} className="min-w-0 rounded-xl border border-[#E7E2D8] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">{algorithmName(benchmark.run.algorithm)}</h3><p className="mt-1 text-xs text-[#6D7974]">Run #{benchmark.run.runId}{benchmark.run.runId===selectedRun.runId?' · Selected run':''}</p></div><MiningStatusBadge friendly kind="run" status={benchmark.run.status}/></div>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div><dt className="text-xs text-[#6D7974]">Runtime</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{benchmark.run.runtimeMillis===null?'Not measured':formatMiningNumber(benchmark.run.runtimeMillis)+' ms'}</dd></div>
            <div><dt className="text-xs text-[#6D7974]">Sampled Java Heap</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{benchmark.run.memoryMiB===null?'Not measured':formatMiningNumber(benchmark.run.memoryMiB,2)+' MiB'}</dd></div>
            <div><dt className="text-xs text-[#6D7974]">Patterns Found</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{formatMiningNumber(benchmark.run.patternCount)}</dd></div>
          </dl>
          {(benchmark.run.failureCode!==null||benchmark.run.failureMessage!==null)&&<p className="mt-4 break-words rounded-xl bg-red-50 p-3 text-sm text-red-800">{benchmark.run.failureCode} {benchmark.run.failureMessage}</p>}
        </article>)}
      </div>
      <div className="rounded-xl bg-[#FAF8F5] p-4 text-sm">
        <h3 className="font-semibold">Comparison Summary</h3>
        <p className="mt-2 leading-relaxed">{timing?(timing.algorithm?`${algorithmName(timing.algorithm)} completed ${formatMiningNumber(timing.differenceMillis)} ms faster in this test. Both algorithms returned matching results.`:'Both algorithms recorded the same runtime in this test and returned matching results.'):request.algorithms.length===1?'Only one algorithm was requested. A two-algorithm performance comparison is not available.':'A performance comparison requires completed runs, matching results, compatible execution conditions and measured runtime for both algorithms.'}</p>
        <p className="mt-2 text-xs text-[#6D7974]">One cold run per algorithm, without warmup. These results describe this test only; they do not establish that one algorithm is always faster.</p>
      </div>
      <details className="border-t border-[#E7E2D8] pt-4 text-sm">
        <summary className="cursor-pointer font-semibold text-[#1E3A2F]">Technical Measurement Details</summary>
        <p className="mt-3 text-xs leading-relaxed text-[#6D7974]">Runtime includes child-JVM startup and I/O, excluding common input preparation. Memory measures sampled Java heap in MiB, not total system RAM or RSS.</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <section className="min-w-0"><h4 className="font-semibold">Input Data</h4><dl className="mt-3 space-y-3 text-xs"><div><dt className="text-[#6D7974]">Snapshot hash</dt><dd className="mt-1 break-all font-mono">{request.snapshotHash}</dd></div><div><dt className="text-[#6D7974]">Input hash</dt><dd className="mt-1 break-all font-mono">{request.inputHash}</dd></div><div><dt className="text-[#6D7974]">Transactions / distinct items / input bytes</dt><dd className="mt-1">{formatMiningNumber(request.transactionCount)} / {formatMiningNumber(request.distinctItems)} / {formatMiningNumber(request.inputBytes)}</dd></div><div><dt className="text-[#6D7974]">Effective Minimum Utility / SPMF threshold</dt><dd className="mt-1">{formatMiningNumber(request.effectiveMinUtility)} frozen utility units / {formatMiningNumber(request.minUtilSpmf)}</dd></div></dl></section>
          <section className="min-w-0"><h4 className="font-semibold">Execution Environment</h4><dl className="mt-3 space-y-3 text-xs">{rows.map(b=><div key={b.run.runId}><dt className="text-[#6D7974]">{algorithmName(b.run.algorithm)} · Run #{b.run.runId}</dt><dd className="mt-1 break-words">{b.run.environment??'Not available'}</dd></div>)}</dl></section>
          <section className="min-w-0"><h4 className="font-semibold">Measurement Methods</h4><dl className="mt-3 space-y-3 text-xs">{rows.map(b=><div key={b.run.runId}><dt className="text-[#6D7974]">{algorithmName(b.run.algorithm)} · Runtime / memory method</dt><dd className="mt-1 break-words">{b.run.runtimeMethod||'Not available'}<br/>{b.run.memoryMethod||'Not available'}</dd><dd className="mt-1">Backend comparison: {b.comparisonStatus}</dd></div>)}</dl></section>
          <section className="min-w-0"><h4 className="font-semibold">Reproducibility Information</h4><p className="mt-3 text-xs">Utility scale {formatMiningNumber(request.utilityScale)} · Divisor {formatMiningNumber(request.divisor)} · Conversion {request.conversionVersion} · Rounding {request.roundingMode}</p><dl className="mt-3 space-y-3 text-xs">{rows.map(b=><div key={b.run.runId}><dt className="text-[#6D7974]">{algorithmName(b.run.algorithm)} · Library / attempt</dt><dd className="mt-1 break-words">{b.run.libraryVersion} / {b.run.attemptNo}</dd><dd className="mt-1 break-words">Repetition policy: {b.repetitionPolicy}</dd></div>)}</dl></section>
        </div>
        <p className="mt-4 text-xs text-[#6D7974]">Comparison validation: {assessment.message}</p>
      </details>
    </div>}
  </section>;
}
