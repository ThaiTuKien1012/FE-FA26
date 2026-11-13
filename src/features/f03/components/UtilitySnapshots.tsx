import { useEffect, useRef, useState } from 'react';
import { f03Api, type F03Snapshot, type F03SnapshotPage } from '../f03.api';
import { previewEligible } from '../f03.validation';
import { BackToSnapshots, Button, errorMessage, Metrics, navigate, Notice, Pager, primary, readable, secondary, Section, Warnings } from './F03Shared';
import { PreviewSummary, type PreviewFlow } from './UtilityPreview';
import { FrozenConfiguration, Matrix, MatrixMetadata } from './UtilityMatrix';
import type { F03MatrixPage } from '../f03.api';

export function UtilitySnapshots({ flow, readOnly, invalidate, isCurrent }: { flow: PreviewFlow; readOnly: boolean; invalidate: (reason: string) => void; isCurrent: () => boolean }) {
  const [created, setCreated] = useState<F03Snapshot | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [refresh, setRefresh] = useState(0);
  const eligible = previewEligible(flow.preview) && !flow.stale && !flow.loading;
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
    {!readOnly && <Section title="Create Snapshot" subtitle="Save an immutable utility dataset for System Admin to use in mining.">
      <Notice error={error} />
      {created && <div role="status" className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"><p>Snapshot #{created.snapshotId} created successfully.</p><Button className={`${secondary} mt-3`} onClick={() => navigate('f03-snapshot-detail', created.snapshotId)}>View Details</Button></div>}
      <Metrics values={[
        ['Selected Sales Period', `${flow.dates.rangeStart} → ${flow.dates.rangeEnd}`], ['Analysis Date', flow.dates.asOfDate],
        ...(!flow.preview ? [['Current Preview Status', saving ? 'Creating snapshot…' : flow.stale ? 'Recalculation required' : 'Not calculated'] as [string, string]] : [])
      ]} />
      {flow.preview && <div className="mt-4"><PreviewSummary preview={flow.preview} /><Warnings warnings={flow.preview.warnings} /></div>}
      {!eligible && !saving && <p className="mt-4 text-sm text-amber-900">{flow.stale || 'Run Utility Preview before creating a snapshot.'}</p>}
      <p className="mt-4 text-xs leading-relaxed text-[#6d7974]">Preview reflects the last calculation in this session. Other sessions may change source data. The backend revalidates eligibility and Lambda Policy and recalculates the snapshot; its result may differ from Preview.</p>
      <div className="mt-5 flex flex-wrap gap-3"><Button disabled={saving} className={secondary} onClick={() => navigate('f03-preview')}>Go to Preview</Button>{(eligible || saving) && <Button disabled={saving || !eligible} className={primary} onClick={() => void create()}>{saving ? 'Creating…' : 'Create Snapshot'}</Button>}</div>
    </Section>}
    <SnapshotHistory refresh={refresh} readOnly={readOnly} />
  </div>;
}
export function SnapshotHistory({ refresh, readOnly }: { refresh: number; readOnly: boolean }) {
  const [result, setResult] = useState<F03SnapshotPage | null>(null);
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
  return <Section title="Saved Snapshots – Ready for Mining" subtitle="Snapshot History for this Store includes READY snapshots only, newest first. Other statuses are not included.">
    <Button disabled={loading} className={secondary} onClick={() => setReload(x => x + 1)}>Refresh History</Button><div className="mt-4"><Notice error={error} /></div>
    {loading && <p role="status">Loading saved snapshots…</p>}
    {!loading && result && <>{result.items.length ? <div className="overflow-x-auto"><table className="f03-table"><caption className="sr-only">Saved READY snapshots</caption><thead><tr>{['Snapshot ID', 'Sales Period', 'Analysis Date', 'Total Weighted Utility', 'Status', 'Action'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{result.items.map(snapshot => <tr key={snapshot.snapshotId}><td className="font-semibold">#{snapshot.snapshotId}</td><td>{snapshot.rangeStart} → {snapshot.rangeEnd}</td><td>{snapshot.asOfDate}</td><td>{snapshot.totalWeightedUtility}</td><td><span className="rounded-full bg-[#eef5f0] px-2.5 py-1 text-xs font-semibold text-[#356b54]">{snapshot.status === 'READY' ? 'READY' : readable(snapshot.status)}</span></td><td>{readOnly ? <span className="text-xs text-[#6d7974]">Details require Merchandiser access</span> : <Button className={secondary} aria-label={`View Details for Snapshot #${snapshot.snapshotId}`} onClick={() => navigate('f03-snapshot-detail', snapshot.snapshotId)}>View Details</Button>}</td></tr>)}</tbody></table></div> : <p className="py-5 text-sm text-[#6d7974]">No READY snapshots were returned for this page. Calculate Preview and create a snapshot to save a utility dataset.</p>}<Pager page={result} onChange={setPage} label="snapshots" busy={loading} /></>}
  </Section>;
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
    let live = true; setLoading(true); setMatrix(null); setMatrixError('');
    f03Api.getMatrix(snapshot.snapshotId, page, 20).then(value => { if (live) setMatrix(value); }).catch(e => { if (live) setMatrixError(errorMessage(e, 'Unable to load snapshot matrix.')); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [snapshot, page, matrixRefresh]);
  return <div className="space-y-5"><BackToSnapshots /><Notice error={error} />
    {error && <Button className={secondary} onClick={() => setRefresh(x => x + 1)}>Retry Snapshot</Button>}
    {!error && !snapshot && <p role="status">Loading snapshot…</p>}
    {snapshot && <>
      <Section title="Summary"><Metrics values={[
        ['Snapshot ID', snapshot.snapshotId], ['Store', `Store #${snapshot.storeId}`], ['Created At', snapshot.createdAt],
        ['Created By', snapshot.createdBy != null ? `User #${snapshot.createdBy}` : undefined],
        ['Sales Period', `${snapshot.rangeStart} → ${snapshot.rangeEnd}`], ['Analysis Date', snapshot.asOfDate],
        ['Total Weighted Utility', snapshot.totalWeightedUtility], ['Status', snapshot.status === 'READY' ? 'READY' : readable(snapshot.status)]
      ]} /><Warnings warnings={snapshot.warnings} /></Section>
      <Section title="Frozen Configuration" subtitle="Read-only settings saved with this snapshot. Current Store settings do not change these values."><FrozenConfiguration configuration={snapshot.configuration} /><MatrixMetadata result={snapshot} /></Section>
      <Section title="Snapshot Matrix" subtitle="Immutable utility rows saved with this snapshot."><Notice error={matrixError} />{loading && <p role="status">Loading matrix…</p>}{matrixError && <Button className={secondary} onClick={() => setMatrixRefresh(x => x + 1)}>Retry Matrix</Button>}{matrix && <Matrix result={matrix} loadPage={setPage} busy={loading} names={names} />}</Section>
    </>}
  </div>;
}
