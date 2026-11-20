import { formatDate, formatDateRange, formatUtcDateTime } from '../../../utils/dateTime';
import { useEffect, useRef, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { f03Api, type F03Snapshot, type F03SnapshotPage } from '../f03.api';
import { utilityNumber } from '../f03.presentation';
import { previewEligible } from '../f03.validation';
import { BackToSnapshots, Button, errorMessage, Metrics, navigate, Notice, Pager, primary, readable, secondary, Section, Warnings } from './F03Shared';
import type { PreviewFlow } from './UtilityPreview';
import { MerchantSnapshotList } from './MerchantSnapshotList';
import { SnapshotWarnings } from './SnapshotWarnings';
import { SnapshotMetadataDetails } from './SnapshotMetadataDetails';
import { FrozenConfiguration, Matrix, MatrixMetadata } from './UtilityMatrix';
import type { F03MatrixPage } from '../f03.api';

export function UtilitySnapshots({ flow, readOnly, invalidate, isCurrent, active = true }: { flow: PreviewFlow; readOnly: boolean; invalidate: (reason: string) => void; isCurrent: () => boolean; active?: boolean }) {
  const [created, setCreated] = useState<F03Snapshot | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [refresh, setRefresh] = useState(0);
  const eligible = previewEligible(flow.preview) && !flow.stale && !flow.loading;
  // Saved Snapshot readiness is independent of the Preview consumed by its POST.
  const showCreated = Boolean(created && !flow.preview && !saving);
  const create = async () => {
    if (readOnly || busy.current || !eligible || !isCurrent()) return;
    busy.current = true; setSaving(true); setError(''); setCreated(null);
    // Consume the reviewed Preview immediately; neither a late response nor another
    // click can authorize a second non-idempotent POST. Never retry automatically.
    const dates = { ...flow.dates };
    invalidate('Snapshot creation was submitted. Run Preview again before creating another snapshot.');
    try {
      const snapshot = await f03Api.createSnapshot(dates);
      setCreated(snapshot); setRefresh(x => x + 1);
    } catch (e) { setError(`${errorMessage(e, 'Could not create snapshot.')} No automatic retry was sent. If the connection was interrupted, refresh Saved Snapshots before submitting again.`); }
    finally { busy.current = false; setSaving(false); }
  };
  return <div className="space-y-5">
    {!readOnly && <Section title="Create Snapshot" subtitle="Save a frozen utility dataset for mining.">
      <div data-create-snapshot data-state={showCreated ? 'created' : saving ? 'creating' : eligible ? 'ready' : 'preview-required'} aria-busy={saving} className="space-y-5">
        <Notice error={error} />
        {showCreated && created ? <>
          <div role="status" className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-[#eef5f0] p-4 text-[#254f3a]">
            <div className="flex min-w-0 flex-1 items-start gap-3"><CircleCheck size={20} className="mt-0.5 shrink-0" aria-hidden="true" /><div className="min-w-0"><p className="break-words font-semibold">Snapshot #{created.snapshotId} created successfully</p><p className="mt-1 text-sm">{created.status === 'READY' ? 'Your utility snapshot is saved and ready for mining.' : 'Your utility snapshot is saved.'}</p></div></div>
            <span className="rounded-full border border-[#cdded3] px-2.5 py-1 text-xs font-semibold">{created.status}</span>
          </div>
          <Metrics values={[
            ['Snapshot ID', `#${created.snapshotId}`], ['Sales Period', formatDateRange(created.rangeStart, created.rangeEnd)], ['Analysis Date', formatDate(created.asOfDate)],
            ['Total Weighted Utility', utilityNumber(created.totalWeightedUtility)], ['Created At', formatUtcDateTime(created.createdAt)]
          ]} />
          <div><div className="flex flex-wrap gap-3"><Button className={secondary} onClick={() => navigate('f03-preview')}>Run New Preview</Button><Button className={primary} onClick={() => navigate('f03-snapshot-detail', created.snapshotId)}>View Snapshot #{created.snapshotId}</Button></div><p className="mt-3 text-xs text-[#6d7974]">A new Preview is required to create another snapshot.</p></div>
        </> : <>
          <Metrics values={[
            ['Selected Sales Period', formatDateRange(flow.dates.rangeStart, flow.dates.rangeEnd)], ['Analysis Date', formatDate(flow.dates.asOfDate)],
            ['Preview Status', saving ? 'Creating snapshot…' : eligible ? 'Preview Ready' : 'Preview required'],
            ...(eligible && flow.preview ? [['Matrix Row Count', flow.preview.totalElements], ['Total Weighted Utility', flow.preview.totalWeightedUtility]] as [string, number | null][] : [])
          ]} />
          <div>
            {!eligible && !saving && <p className="mb-3 text-sm text-[#6d7974]">Calculate a Preview before creating a snapshot.</p>}
            <div className="flex flex-wrap gap-3">{eligible || saving ? <><Button disabled={saving} className={secondary} onClick={() => navigate('f03-preview')}>Review Preview</Button><Button disabled={saving || !eligible} className={primary} onClick={() => void create()}>{saving ? 'Creating…' : 'Create Snapshot'}</Button></> : <Button className={primary} onClick={() => navigate('f03-preview')}>Go to Preview</Button>}</div>
            {saving && <p role="status" className="mt-3 text-xs text-[#6d7974]">Creating your snapshot. Please wait…</p>}
          </div>
          {flow.preview && flow.preview.warnings.length > 0 && <details className="text-sm"><summary className="w-fit cursor-pointer font-medium text-[#6d7974]">Preview warnings ({flow.preview.warnings.length})</summary><Warnings warnings={flow.preview.warnings} /></details>}
        </>}
        <details className="border-t border-[#e7e2d8] pt-3 text-xs leading-relaxed text-[#6d7974]"><summary className="w-fit cursor-pointer rounded font-medium text-[#356b54]">How snapshots work</summary><p className="mt-2">Snapshots are immutable. When saving, the backend checks the configuration, Lambda Policy and source data again. If they changed after Preview, the saved snapshot may differ from Preview.</p></details>
      </div>
    </Section>}
    <SnapshotHistory refresh={refresh} readOnly={readOnly} active={active} />
  </div>;
}
export function SnapshotHistory({ refresh, readOnly, active = true }: { refresh: number; readOnly: boolean; active?: boolean }) {
  const [result, setResult] = useState<F03SnapshotPage | null>(null);
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<{ snapshot: F03Snapshot; opener: HTMLElement } | null>(null);
  useEffect(() => { if (!active) setSelected(null); }, [active]);
  useEffect(() => { setPage(0); }, [refresh]);
  useEffect(() => {
    let live = true; setLoading(true); setError('');
    f03Api.listSnapshots(page, 20).then(value => {
      if (!live) return;
      const lastPage = Math.max(0, Math.ceil(value.totalElements / value.pageSize) - 1);
      if (page > lastPage) { setPage(lastPage); return; }
      setResult(value);
    }).catch(e => { if (live) { setResult(null); setError(errorMessage(e, 'Unable to load saved snapshots.')); } }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [page, reload, refresh]);
  return <>
    <Section title="Saved Snapshots" subtitle="Saved READY datasets, newest first. Warnings do not mean the snapshot failed." action={<Button disabled={loading} className={secondary} onClick={() => setReload(x => x + 1)}>Refresh Snapshots</Button>}>
      <Notice error={error} />{loading && <p role="status">Loading saved snapshots...</p>}
      {result && <div aria-busy={loading} className={loading ? 'pointer-events-none opacity-60' : ''}>
        <MerchantSnapshotList items={result.items} busy={loading} readOnly={readOnly} onView={readOnly ? (snapshot, opener) => setSelected({ snapshot, opener }) : undefined} />
        <Pager hideSingle page={result} onChange={setPage} label="snapshots" busy={loading} />
      </div>}
    </Section>
    {readOnly && active && selected && <SnapshotMetadataDetails snapshot={selected.snapshot} opener={selected.opener} onClose={() => setSelected(null)} />}
  </>;
}

export function SnapshotDetails({ id, names }: { id: number; names: Record<number, string> }) {
  const [snapshot, setSnapshot] = useState<F03Snapshot | null>(null);
  const [matrix, setMatrix] = useState<F03MatrixPage | null>(null);
  const [error, setError] = useState('');
  const [matrixError, setMatrixError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [page, setPage] = useState(0);
  const [matrixRefresh, setMatrixRefresh] = useState(0);
  useEffect(() => {
    let live = true; setSnapshot(null); setError('');
    if (!Number.isSafeInteger(id) || id <= 0) { setError('A valid Snapshot ID is required.'); return; }
    f03Api.getSnapshot(id).then(value => { if (live) setSnapshot(value); }).catch(e => { if (live) setError(errorMessage(e, 'Unable to load snapshot.')); });
    return () => { live = false; };
  }, [id, refresh]);
  useEffect(() => {
    if (!snapshot) return;
    let live = true; setLoading(true); setMatrixError('');
    f03Api.getMatrix(snapshot.snapshotId, page, 20).then(value => { if (live) setMatrix(value); }).catch(e => { if (live) { setMatrix(null); setMatrixError(errorMessage(e, 'Unable to load snapshot matrix.')); } }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [snapshot, page, matrixRefresh]);
  return <div className="space-y-5"><BackToSnapshots /><Notice error={error} />
    {error && !error.includes('Contact your administrator') && <Button className={secondary} onClick={() => setRefresh(x => x + 1)}>Retry Snapshot</Button>}
    {!error && !snapshot && <p role="status">Loading snapshot…</p>}
    {snapshot && <>
      <Section title="Summary"><Metrics values={[
        ['Snapshot ID', snapshot.snapshotId], ['Store', `Store #${snapshot.storeId}`], ['Created At', formatUtcDateTime(snapshot.createdAt)],
        ['Created By', snapshot.createdBy != null ? `User #${snapshot.createdBy}` : undefined],
        ['Sales Period', formatDateRange(snapshot.rangeStart, snapshot.rangeEnd)], ['Analysis Date', formatDate(snapshot.asOfDate)],
        ['Total Weighted Utility', utilityNumber(snapshot.totalWeightedUtility)], ['Status', snapshot.status === 'READY' ? 'READY' : readable(snapshot.status)]
      ]} /></Section>
      <Section title="Snapshot Warnings"><SnapshotWarnings snapshot={snapshot} /></Section>
      <Section title="Frozen Configuration" subtitle="Read-only settings saved with this snapshot. Current Store settings do not change these values."><FrozenConfiguration configuration={snapshot.configuration} /><MatrixMetadata result={snapshot} /></Section>
      <Section title="Snapshot Matrix" subtitle="Immutable utility rows saved with this snapshot."><Notice error={matrixError} />{loading && <p role="status">Loading matrix…</p>}{matrixError && !matrixError.includes('Contact your administrator') && <Button className={secondary} onClick={() => setMatrixRefresh(x => x + 1)}>Retry Matrix</Button>}{matrix && <Matrix result={matrix} loadPage={setPage} busy={loading} names={names} />}</Section>
    </>}
  </div>;
}
