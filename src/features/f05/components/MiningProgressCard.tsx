import { algorithmName, formatMiningNumber, miningDate } from '../f05.display';
import type { MiningProgressView } from '../f05.types';

export function MiningProgressCard({ progress: p, snapshotId }: { progress: MiningProgressView; snapshotId: number }) {
  const title = p.stage === 'LEGACY' ? 'Progress details unavailable for this historical request' : p.status === 'FAILED' ? 'Mining failed' : p.status === 'COMPLETED' ? 'Mining completed' : p.stage === 'SAVING' ? 'Saving mining results' : p.stage === 'COMPARING' ? 'Comparing historical runs' : p.status === 'PENDING' || p.stage === 'QUEUED' ? 'Waiting to start' : 'Mining in progress';
  return <section aria-label="Analysis Progress" className="mt-5 border-y border-[#E7E2D8] py-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">Analysis Progress</h3><p role="status" className="mt-1 text-sm text-[#6D7974]">{title}</p></div><span className="text-sm font-semibold tabular-nums">{p.percent}%</span></div>
    <div role="progressbar" aria-label={`Request #${p.requestId} completed work`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.percent} aria-valuetext={`${p.percent}%, ${p.completedSteps} of ${p.totalSteps} steps`} className="mt-3 h-2 overflow-hidden rounded-full bg-[#E7E2D8]"><div style={{ width: `${p.percent}%` }} className={`h-full ${p.status === 'FAILED' ? 'bg-[#9F5144]' : 'bg-[#356B54]'}`} /></div>
    <dl className="mt-3 grid gap-x-5 gap-y-3 text-sm sm:grid-cols-3">
      <div><dt className="text-xs text-[#6D7974]">Request / Snapshot</dt><dd>#{p.requestId} / #{snapshotId}</dd></div>
      <div><dt className="text-xs text-[#6D7974]">Status / Stage</dt><dd>{p.status} / {p.stage}</dd></div>
      <div><dt className="text-xs text-[#6D7974]">Algorithm / Current Run</dt><dd>{p.algorithm ? algorithmName(p.algorithm) : 'Waiting for a run'}{p.currentRunId !== null && ` · #${p.currentRunId}`}</dd></div>
      <div><dt className="text-xs text-[#6D7974]">Completed steps</dt><dd>{p.completedSteps} / {p.totalSteps}</dd></div>
      <div><dt className="text-xs text-[#6D7974]">Current attempt</dt><dd>{p.attemptNo}</dd></div>
      <div><dt className="text-xs text-[#6D7974]">Stage elapsed time</dt><dd>{p.elapsedMs === null ? 'Unavailable' : `${formatMiningNumber(p.elapsedMs)} ms`}</dd></div>
    </dl>
    <p className="mt-3 text-xs text-[#6D7974]">Completed work reported by the backend; this is not an estimate of remaining time. Progress may decrease during recovery.</p>
    <details className="mt-3 text-xs text-[#6D7974]"><summary className="cursor-pointer">Stage timing details</summary><p className="mt-2">Stage started: {p.stageStartedAt === null ? 'Unavailable' : miningDate(p.stageStartedAt)}{p.timeoutMs !== null && ` · Stage timeout: ${formatMiningNumber(p.timeoutMs)} ms`}</p></details>
  </section>;
}
