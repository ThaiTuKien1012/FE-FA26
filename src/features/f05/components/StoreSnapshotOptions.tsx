import { formatDate, formatDateRange } from '../../../utils/dateTime';
import type { SnapshotView } from '../f05.types';

export function StoreSnapshotOptions({ items, selected, locked, canSubmit, onSelect }: { items: SnapshotView[]; selected: SnapshotView | null; locked: boolean; canSubmit: boolean; onSelect: (snapshot: SnapshotView) => void }) {
  return <div role={canSubmit ? 'radiogroup' : 'region'} aria-label={canSubmit ? 'Snapshot selection' : 'Frozen snapshots'} className="mt-4 grid gap-2">{items.map(snapshot => <article key={snapshot.snapshotId} className={'f05-snapshot-option ' + (selected?.snapshotId === snapshot.snapshotId ? 'border-[#356B54] bg-[#F3F8F4]' : 'border-[#E7E2D8]')}>
    <div className="min-w-0"><label className="flex items-center gap-2 font-semibold">{canSubmit && <input type="radio" name="snapshotId" value={snapshot.snapshotId} aria-label={'Select Snapshot #' + snapshot.snapshotId} checked={selected?.snapshotId === snapshot.snapshotId} disabled={locked || snapshot.status !== 'READY'} onChange={() => onSelect(snapshot)} className="h-4 w-4 shrink-0 accent-[#356B54]" />}Snapshot #{snapshot.snapshotId}</label><p className="mt-1 text-xs text-[#6D7974]"><span className="sr-only">Sales Period: </span>{formatDateRange(snapshot.rangeStart, snapshot.rangeEnd)}</p></div>
    <p className="text-xs text-[#6D7974]">Analysis date <span className="ml-1 font-medium text-[#4B5563]">{formatDate(snapshot.asOfDate)}</span></p>
    <div className="flex flex-wrap items-center justify-end gap-2"><span className="rounded-full bg-[#EDF5F0] px-2.5 py-1 text-xs font-semibold text-[#356B54]">{snapshot.status}</span>{snapshot.warnings.length > 0 && <span className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">{snapshot.warnings.length} {snapshot.warnings.length === 1 ? 'warning' : 'warnings'}</span>}</div>
  </article>)}</div>;
}
