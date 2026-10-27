import type { ComparisonStatus, RequestStatus, RunStatus } from '../f05.types';

type Props = { kind: 'request'; status: RequestStatus } | { kind: 'run'; status: RunStatus } | { kind: 'comparison'; status: ComparisonStatus };

export function MiningStatusBadge({ kind, status }: Props) {
  const color = status === 'COMPLETED' || status === 'MATCH' ? 'bg-emerald-50 text-emerald-800' :
    status === 'FAILED' || status === 'TIMED_OUT' ? 'bg-red-50 text-red-800' :
    status === 'BLOCKED' ? 'bg-amber-50 text-amber-900' :
    status === 'RUNNING' || status === 'PENDING' ? 'bg-blue-50 text-blue-800' : 'bg-stone-100 text-stone-700';
  return <span aria-label={`${kind} status: ${status}`} className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{status}</span>;
}
