import { formatDate, formatDateRange } from '../../../utils/dateTime';
import type { F03ExactSnapshot as F03Snapshot } from '../f03.api';
import { utilityNumber } from '../f03.presentation';
import { Button, navigate, secondary } from './F03Shared';

export function MerchantSnapshotList({ items, busy, readOnly = false, onView }: { items: F03Snapshot[]; busy: boolean; readOnly?: boolean; onView?: (snapshot: F03Snapshot, opener: HTMLElement) => void }) {
  if (!items.length) return <div className="rounded-xl border border-dashed border-[#e7e2d8] px-4 py-6 text-sm">
    <p className="font-medium">No saved snapshots yet</p>
    <p className="mt-1 text-[#6d7974]">{readOnly ? 'READY snapshots from your store will appear here.' : 'Calculate a Preview, then create a snapshot to save it here.'}</p>
  </div>;
  return <ul aria-label="Saved snapshots" className="f03-snapshot-list">{items.map(snapshot => <li key={snapshot.snapshotId} className="f03-snapshot-row">
    <div className="f03-snapshot-identity">
      <h3 className="text-base font-semibold text-[#1e3a2f]">Snapshot #{snapshot.snapshotId}</h3>
      <p className="mt-0.5 text-xs leading-5 text-[#6d7974]"><span className="sr-only">Sales period: </span>{formatDateRange(snapshot.rangeStart, snapshot.rangeEnd)}</p>
    </div>
    <dl className="f03-snapshot-metrics">
      <div><dt>Analysis date</dt><dd>{formatDate(snapshot.asOfDate)}</dd></div>
      <div><dt>Total weighted utility</dt><dd>{utilityNumber(snapshot.totalWeightedUtility)}</dd></div>
    </dl>
    <div className="f03-snapshot-controls">
      <div className="f03-snapshot-status">
        <span className="sr-only">Status: </span>
        <span className={'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ' + (snapshot.status === 'READY' ? 'bg-[#eef5f0] text-[#356b54]' : 'bg-[#f4f1ec] text-[#6d7974]')}>{snapshot.status}</span>
      </div>
      {Boolean(snapshot.warnings?.length) && <p className="f03-snapshot-warning rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">{snapshot.warnings.length} {snapshot.warnings.length === 1 ? 'warning' : 'warnings'}</p>}
      <Button disabled={busy} className={secondary + ' whitespace-nowrap'} aria-label={'View Details for Snapshot #' + snapshot.snapshotId} onClick={event => onView ? onView(snapshot, event.currentTarget) : navigate('f03-snapshot-detail', snapshot.snapshotId)}>View Details</Button>
    </div>
  </li>)}</ul>;
}
