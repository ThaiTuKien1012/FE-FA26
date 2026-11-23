import { useEffect, useRef, useState } from 'react';
import type { AuthUser } from '../../../services/authService';
import { authService } from '../../../services/authService';
import { SessionDialog } from '../../../components/common/SessionDialog';
import { analysisErrorMessage } from '../f05.presentation';
import { F05ApiError } from '../f05.api';
import { clearPendingSubmission, readPendingSubmission, sendSubmission, type MiningSubmission } from '../f05.submission';
import { miningButton, miningErrorMessage, miningPrimaryButton } from '../f05.display';
import type { RequestView, SnapshotView } from '../f05.types';

export function restoreMiningSubmission(userId: string) {
  try { return { pending: readPendingSubmission(userId), error: '' }; }
  catch { return { pending: null, error: 'The saved attempt is unreadable. Check Analysis History, then explicitly discard it before starting another request.' }; }
}
function MerchandiserSubmissionPanel({ user, selected, storeId, confirmedStore, onAccepted, onLocked, onHistory }: {
  user: AuthUser; selected: SnapshotView | null; storeId: number | null; confirmedStore: boolean;
  onAccepted: (request: RequestView) => void; onLocked: (locked: boolean) => void; onHistory: () => void;
}) {
  const [restored] = useState(() => restoreMiningSubmission(user.id));
  const [pending, setPending] = useState<MiningSubmission | null>(restored.pending), [error, setError] = useState(restored.error);
  const [submitting, setSubmitting] = useState(false), [confirming, setConfirming] = useState(false), [receipt, setReceipt] = useState<RequestView | null>(null);
  const busy = useRef(false), acknowledged = useRef(false), alive = useRef(true);
  // The owning workspace is keyed by user/role/Store; suppress late writes to another session.
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { setConfirming(false); }, [selected?.snapshotId, storeId]);
  const scope = () => JSON.stringify([authService.getSessionId() || authService.getToken(), authService.getCurrentUser()?.id, authService.getCurrentUser()?.role, authService.getCurrentUser()?.storeId]);
  const transmit = async (payload: MiningSubmission) => {
    if (busy.current || acknowledged.current) return;
    busy.current = true; setSubmitting(true); setError(''); onLocked(true);
    const identity = scope();
    try {
      const response = await sendSubmission(user.id, payload);
      if (!alive.current || identity !== scope()) return;
      acknowledged.current = true; setReceipt(response);
      try { clearPendingSubmission(user.id); setPending(null); onLocked(false); }
      catch { setError('The analysis was accepted, but its saved submission could not be cleared. Check History before another submission.'); }
      onAccepted(response);
    } catch (e) {
      if (alive.current && identity === scope()) setError((e instanceof F05ApiError && (e.status === null || e.status === 200 || e.status === 202) ? 'Outcome not confirmed. Check Analysis History before retrying the same request. ' : '') + analysisErrorMessage(e));
    } finally { busy.current = false; if (alive.current) setSubmitting(false); }
  };
  const confirm = () => {
    if (busy.current || pending || receipt || acknowledged.current || !selected || !confirmedStore || selected.storeId !== storeId) return;
    if (selected.status !== 'READY') { setError('Select a READY snapshot before running an analysis.'); return; }
    setConfirming(false);
    if (!crypto?.randomUUID) { setError('A secure connection is required to submit an analysis. Open PASPM using HTTPS or contact System Admin.'); return; }
    const payload: MiningSubmission = { requestKey: crypto.randomUUID(), snapshotId: selected.snapshotId };
    setPending(payload); void transmit(payload);
  };
  const discard = () => {
    if (busy.current) return;
    try { clearPendingSubmission(user.id); setPending(null); setReceipt(null); setError(''); setConfirming(false); acknowledged.current = false; onLocked(false); }
    catch (e) { setError(miningErrorMessage(e)); }
  };
  return <section aria-labelledby="mining-submit-title" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 sm:p-6">
    <h2 id="mining-submit-title" className="text-lg font-semibold">Run Analysis</h2>
    <p className="mt-2 text-sm text-[#6D7974]">{selected ? 'Snapshot #' + selected.snapshotId + ' selected.' : 'Select a READY snapshot above.'} Minimum Utility is managed by System Admin.</p>
    <form onSubmit={event => { event.preventDefault(); if (!busy.current && !pending && !receipt && !acknowledged.current && selected && confirmedStore) setConfirming(true); }} className="mt-4">
      <button type="submit" disabled={submitting || Boolean(pending || receipt || error === restored.error && restored.error) || !selected || selected.status !== 'READY' || !confirmedStore} className={miningPrimaryButton}>{submitting ? 'Submitting...' : 'Run Analysis'}</button>
    </form>
    {confirming && selected && <SessionDialog title="Confirm Analysis" onCancel={() => setConfirming(false)}><p>Start an analysis using Snapshot #{selected.snapshotId}?</p><p className="mt-2">READY snapshots are checked before analysis starts. Acceptance does not guarantee completion.</p><div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" className={miningButton} onClick={() => setConfirming(false)}>Cancel</button><button type="button" className={miningPrimaryButton} onClick={confirm}>Confirm Run</button></div></SessionDialog>}
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {pending && !receipt && <div className="mt-4 space-y-3 rounded-xl bg-[#FAF8F5] p-4 text-sm"><h3 className="font-semibold">Saved submission · Snapshot #{pending.snapshotId}</h3><p>No automatic retry is sent. Check Analysis History first; retrying reuses the same saved submission.</p><div className="flex flex-wrap gap-2"><button type="button" className={miningButton} onClick={onHistory}>Check Analysis History</button><button type="button" className={miningButton} disabled={submitting} onClick={() => void transmit(pending)}>Retry same submission</button></div></div>}
    {receipt && <p role="status" className="mt-4 rounded-xl bg-[#EDF5F0] p-3 text-sm">Analysis #{receipt.requestId} accepted. Acceptance does not mean analysis has completed.</p>}
    {(pending || receipt || Boolean(restored.error && error === restored.error)) && <><button type="button" disabled={submitting} className={miningButton + ' mt-4'} onClick={discard}>{receipt ? 'Start another analysis' : 'Discard saved attempt'}</button>{!receipt && <p className="mt-2 text-xs text-amber-900">Discarding does not cancel server work. A new submission may start another analysis.</p>}</>}
  </section>;
}

// This is a Frontend business restriction, independent of Backend capabilities.
export function MiningSubmissionPanel(props: Parameters<typeof MerchandiserSubmissionPanel>[0]) {
  if(props.user.role!=='Merchandiser')return null;
  return <MerchandiserSubmissionPanel {...props}/>;
}
