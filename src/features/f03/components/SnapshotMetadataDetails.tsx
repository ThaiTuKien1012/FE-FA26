import type { F03ExactSnapshot as F03Snapshot } from '../f03.api';
import { utilityNumber } from '../f03.presentation';
import { formatDate, formatDateRange, formatUtcDateTime } from '../../../utils/dateTime';
import { Button, Metrics, secondary, Section } from './F03Shared';
import { SeasonDialog } from './SeasonDialog';
import { SnapshotWarnings } from './SnapshotWarnings';

/** Uses the exact list response only. No snapshot-detail or matrix request. */
export function SnapshotMetadataDetails({ snapshot, opener, onClose }: { snapshot: F03Snapshot; opener: HTMLElement; onClose: () => void }) {
  return <SeasonDialog title={`Snapshot #${snapshot.snapshotId} Details`} subtitle="Read-only metadata from Saved Snapshots." wide busy={false} returnFocus={opener} onClose={onClose} footer={<Button className={secondary} onClick={onClose}>Close</Button>}>
    <SnapshotMetadataContent snapshot={snapshot} />
  </SeasonDialog>;
}

export function SnapshotMetadataContent({ snapshot }: { snapshot: F03Snapshot }) {
  const configuration = snapshot.configuration;
  return <div className="space-y-4">
    <Section title="Summary"><Metrics values={[
      ['Snapshot ID', snapshot.snapshotId], ['Status', snapshot.status],
      ['Sales Period', formatDateRange(snapshot.rangeStart, snapshot.rangeEnd)], ['Analysis Date', formatDate(snapshot.asOfDate)],
      ['Total Weighted Utility', utilityNumber(snapshot.totalWeightedUtility)], ['Created At', formatUtcDateTime(snapshot.createdAt)],
      ['Store', `Store #${snapshot.storeId}`], ['Created By', snapshot.createdBy == null ? undefined : `User #${snapshot.createdBy}`]
    ]} /></Section>
    <Section title="Configuration Metadata" subtitle="Saved values supplied with this snapshot.">
      {configuration ? <>
        <Metrics values={[
          ['Scoring Version', configuration.config?.scoringVersion], ['Configuration Version', configuration.config?.version],
          ['Frozen Analysis Date', formatDate(configuration.analysisDate, 'Unavailable')], ['Time Zone', configuration.timeZone],
          ['Utility Scale', configuration.utilityScale], ['Rounding Mode', configuration.roundingMode]
        ]} />
        <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium text-[#356b54]">Original configuration metadata</summary><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[#faf8f5] p-3 text-xs">{JSON.stringify(configuration, null, 2)}</pre></details>
      </> : <p className="text-sm text-[#6d7974]">Configuration metadata was not supplied with this snapshot.</p>}
    </Section>
    <Section title="Snapshot Warnings"><SnapshotWarnings snapshot={snapshot} /></Section>
    <p className="text-xs leading-relaxed text-[#6d7974]">This view shows the saved metadata available to your role. Detailed matrix access is not available for Store Admin.</p>
  </div>;
}
