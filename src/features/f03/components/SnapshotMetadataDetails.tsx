import type { F03ExactSnapshot as F03Snapshot } from '../f03.api';
import { utilityNumber } from '../f03.presentation';
import { formatDate, formatDateRange, formatUtcDateTime } from '../../../utils/dateTime';
import { Button, Metrics, secondary, Section } from './F03Shared';
import { SeasonDialog } from './SeasonDialog';
import { SnapshotWarnings } from './SnapshotWarnings';

/** Uses the exact list response only. No snapshot-detail or matrix request. */
export function SnapshotMetadataDetails({ snapshot, opener, onClose }: { snapshot: F03Snapshot; opener: HTMLElement; onClose: () => void }) {
  return <SeasonDialog title={`Snapshot #${snapshot.snapshotId} Details`} subtitle="View the analysis data and settings saved with this snapshot." wide busy={false} returnFocus={opener} onClose={onClose} footer={<Button className={secondary} onClick={onClose}>Close</Button>}>
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
    <Section title="Saved Weight Settings" subtitle="These settings belong to this snapshot and remain unchanged.">
      {configuration ? <>
        <Metrics values={'salesWindowDays' in configuration.config ? [
          ['Expiry Importance', configuration.config?.alpha], ['Season Importance', configuration.config?.beta],
          ['Priority Strength', configuration.config?.lambda], ['Sales Window (days)', configuration.config.salesWindowDays]
        ] : [
          ['Stock Importance', configuration.config.alpha], ['Expiry Importance', configuration.config.beta], ['Season Importance', configuration.config.gamma],
          ['Priority Strength', configuration.config.lambda], ['Expiry Window (days)', configuration.config.expiryWindowDays],
          ['Stock Priority Enabled', configuration.config.enableStock ? 'Yes' : 'No'], ['Expiry Priority Enabled', configuration.config.enableExpiry ? 'Yes' : 'No'], ['Season Priority Enabled', configuration.config.enableSeason ? 'Yes' : 'No']
        ]} />
        <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium text-[#356b54]">Saved Settings Details</summary><div className="mt-3"><Metrics values={[
          ['Scoring Version', configuration.config?.scoringVersion], ['Settings Version', configuration.config?.version],
          ['Analysis Date', formatDate(configuration.analysisDate, 'Unavailable')], ['Time Zone', configuration.timeZone]
        ]} />{'seasons' in configuration && configuration.seasons.length ? <ul className="mt-3 space-y-2">{configuration.seasons.map(season => <li key={season.seasonId}>{season.name} · {formatDateRange(season.startDate, season.endDate)} · Priority {utilityNumber(season.weight)}</li>)}</ul> : <p className="mt-3">Saved season details are not available for this snapshot.</p>}</div></details>
      </> : <p className="text-sm text-[#6d7974]">Saved settings are not available for this snapshot.</p>}
    </Section>
    <Section title="Snapshot Warnings"><SnapshotWarnings snapshot={snapshot} originals={false} /></Section>
    <p className="text-xs leading-relaxed text-[#6d7974]">View only. Snapshot data and warnings remain unchanged.</p>
  </div>;
}
