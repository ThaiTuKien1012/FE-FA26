import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { authService } from '../../../services/authService';
import { f05Api, F05ApiError } from '../f05.api';
import { algorithmName, miningButton, miningErrorMessage } from '../f05.display';
import { assessBenchmarkComparison, assertBenchmarkContext } from '../f05.results';
import type { BenchmarkView, RequestView, RunView } from '../f05.types';
import { MiningStatusBadge } from './MiningStatusBadge';

interface Props { request: RequestView; runs: RunView[]; selectedRun: RunView; onReadError: (error: unknown) => void; }

export function MiningBenchmarkView({ request, runs, selectedRun, onReadError }: Props) {
  const [revision, setRevision] = useState(0);
  const token = authService.getToken();
  const targets = (['HUI_MINER', 'EFIM'] as const).flatMap(algorithm => {
    if (algorithm === selectedRun.algorithm) return [selectedRun];
    const matching = runs.filter(run => run.algorithm === algorithm && request.algorithms.includes(algorithm));
    return matching.length === 1 ? matching : [];
  });
  const key = JSON.stringify([request.requestId, request.status, request.comparisonStatus, targets.map(run => [run.runId, run.status]), revision]);
  const [result, setResult] = useState<{ key: string; token: string | null; rows?: BenchmarkView[]; error?: string } | null>(null);
  const current = result?.key === key && result.token === token ? result : null;

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all(targets.map(async run => {
      const benchmark = await f05Api.getBenchmark(run.runId, controller.signal);
      assertBenchmarkContext(benchmark, request, run);
      return benchmark;
    })).then(rows => {
      if (controller.signal.aborted) return;
      if (authService.getToken() !== token) throw new F05ApiError(401, 'The active session changed. Refresh benchmark for the current session.');
      setResult({ key, token, rows });
    }).catch(error => {
      if (controller.signal.aborted) return;
      controller.abort();
      setResult({ key, token, error: miningErrorMessage(error) });
      onReadError(error);
    });
    return () => controller.abort();
    // Runs/request are immutable for these IDs, apart from the statuses in key.
    // A polling render with unchanged statuses must not fetch benchmark again.
  }, [key, token, onReadError]);

  const rows = current?.rows;
  const assessment = rows ? assessBenchmarkComparison(request, rows) : null;
  return <section aria-labelledby="f05-benchmark-title" className="mt-4 rounded-xl border border-[#E7E2D8] bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h4 id="f05-benchmark-title" className="text-lg font-semibold">Measured benchmark · Request #{request.requestId}</h4><p className="mt-2 text-sm text-[#6D7974]">Cold child-JVM wall time includes startup and I/O, excluding common input preparation. Memory is sampled Java heap in MiB, not total system RAM or RSS.</p></div>
      <button type="button" disabled={!current} className={miningButton} onClick={() => setRevision(value => value + 1)}><RefreshCw aria-hidden="true" className="mr-2 inline h-4 w-4" />Refresh benchmark</button>
    </div>
    {!current ? <p role="status" className="mt-4 flex items-center gap-2 text-sm text-[#6D7974]"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading measured benchmarks...</p> : current.error ?
      <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{current.error} Use Refresh benchmark to retry manually.</div> : rows && assessment && <>
        <p className={`mt-4 rounded-lg border p-3 text-sm ${assessment.comparable ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{assessment.message}</p>
        <div className={`mt-4 grid gap-4 ${rows.length === 2 ? 'md:grid-cols-2' : ''}`}>
          {rows.map(benchmark => <article key={benchmark.run.runId} className="min-w-0 rounded-xl border border-[#E7E2D8] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><h5 className="font-semibold">{algorithmName(benchmark.run.algorithm)} · Run #{benchmark.run.runId}</h5><MiningStatusBadge kind="run" status={benchmark.run.status} /></div>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#6D7974]">Comparison <MiningStatusBadge kind="comparison" status={benchmark.comparisonStatus} /></p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-[#6D7974]">Runtime (ms)</dt><dd className="mt-1 font-medium">{benchmark.run.runtimeMillis ?? 'Not measured'}</dd></div>
              <div><dt className="text-xs text-[#6D7974]">Sampled Java heap (MiB)</dt><dd className="mt-1 font-medium">{benchmark.run.memoryMiB ?? 'Not measured'}</dd></div>
              <div><dt className="text-xs text-[#6D7974]">Pattern count</dt><dd className="mt-1">{benchmark.run.patternCount ?? 'Not measured'}</dd></div>
              <div><dt className="text-xs text-[#6D7974]">minUtilSpmf</dt><dd className="mt-1">{benchmark.run.minUtilSpmf}</dd></div>
              <div><dt className="text-xs text-[#6D7974]">Effective minimum utility</dt><dd className="mt-1 break-all">{benchmark.effectiveMinUtility}</dd></div>
              <div><dt className="text-xs text-[#6D7974]">Snapshot ID</dt><dd className="mt-1">#{benchmark.run.snapshotId}</dd></div>
            </dl>
            {(benchmark.run.failureCode !== null || benchmark.run.failureMessage !== null) && <p className="mt-3 break-words rounded-lg bg-red-50 p-3 text-sm text-red-800">{benchmark.run.failureCode} {benchmark.run.failureMessage}</p>}
            <details className="mt-4 text-sm"><summary className="cursor-pointer font-semibold text-[#1E3A2F]">Provenance and measurement methodology</summary><dl className="mt-3 space-y-3">
              <div><dt className="text-xs text-[#6D7974]">Snapshot hash</dt><dd className="break-all font-mono text-xs">{benchmark.snapshotHash}</dd></div>
              <div><dt className="text-xs text-[#6D7974]">Input hash</dt><dd className="break-all font-mono text-xs">{benchmark.run.inputHash}</dd></div>
              <div><dt className="text-xs text-[#6D7974]">Transactions / distinct items / input bytes</dt><dd>{benchmark.transactionCount} / {benchmark.distinctItems} / {benchmark.inputBytes}</dd></div>
              <div><dt className="text-xs text-[#6D7974]">Divisor / utility scale / conversion</dt><dd className="break-words">{benchmark.divisor} / {benchmark.utilityScale} / {benchmark.run.conversionVersion}</dd></div>
              <div><dt className="text-xs text-[#6D7974]">Library / attempt</dt><dd>{benchmark.run.libraryVersion} / {benchmark.run.attemptNo}</dd></div>
              <div><dt className="text-xs text-[#6D7974]">Runtime method</dt><dd className="break-words">{benchmark.run.runtimeMethod || 'Not available'}</dd></div>
              <div><dt className="text-xs text-[#6D7974]">Memory method</dt><dd className="break-words">{benchmark.run.memoryMethod || 'Not available'}</dd></div>
              <div><dt className="text-xs text-[#6D7974]">Environment</dt><dd className="break-words">{benchmark.run.environment ?? 'Not available'}</dd></div>
              <div><dt className="text-xs text-[#6D7974]">Repetition policy</dt><dd className="break-words">{benchmark.repetitionPolicy}</dd></div>
            </dl></details>
          </article>)}
        </div>
        <p className="mt-4 text-xs text-[#6D7974]">One cold run per algorithm, without warmup. These observations do not establish that HUI-Miner or EFIM is always faster.</p>
      </>}
  </section>;
}
