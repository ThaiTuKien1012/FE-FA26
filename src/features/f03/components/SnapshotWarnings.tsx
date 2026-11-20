import type { F03Snapshot } from '../f03.api';
import { useUtilityProductNames } from '../f03.products';
import { groupSnapshotWarnings, snapshotWarningExplanation, snapshotWarningProductId } from '../f03.snapshot-warnings';

/** Full saved warnings belong in Snapshot Details, never in a table popup. */
export function SnapshotWarnings({ snapshot, originals = true }: { snapshot: F03Snapshot; originals?: boolean }) {
  const warnings = snapshot.warnings ?? [];
  const groups = groupSnapshotWarnings(warnings);
  const ids = groups.map(group => snapshotWarningProductId(group.original)).filter((id): id is number => id !== null);
  const names = useUtilityProductNames(ids);
  if (!warnings.length) return <p className="text-sm text-[#6d7974]">No warnings were recorded for this snapshot.</p>;
  return <div>
    <p className="text-sm text-[#6d7974]">{warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'}. Identical messages are grouped with their original counts. Saved status: {snapshot.status}.</p>
    <ol className="mt-4 space-y-3">{groups.map(group => <li key={group.original} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="whitespace-pre-wrap break-words leading-relaxed">{snapshotWarningExplanation(group.original, names)}</p>{group.count > 1 && <p className="mt-2 text-xs font-semibold">Repeated {group.count} times</p>}{originals && <details className="mt-3 text-xs"><summary className="cursor-pointer font-medium">Original warning</summary><pre className="mt-2 whitespace-pre-wrap break-all font-mono">{group.original}</pre></details>}</li>)}</ol>
    <p className="mt-4 text-xs leading-relaxed text-[#6d7974]">Warnings are separate from request errors and do not change the saved snapshot or its utility. Product names are current catalog labels; product IDs identify the saved records.</p>
    {originals && <details className="mt-4 text-xs text-[#6d7974]"><summary className="cursor-pointer font-medium">Original warnings (saved)</summary><pre className="mt-2 whitespace-pre-wrap break-all">{JSON.stringify(warnings, null, 2)}</pre></details>}
  </div>;
}
