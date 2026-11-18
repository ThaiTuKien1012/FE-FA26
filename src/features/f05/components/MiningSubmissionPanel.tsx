import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AuthUser } from '../../../services/authService';
import { authService } from '../../../services/authService';
import { formatDate, formatDateRange } from '../../../utils/dateTime';
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
  const [submitting, setSubmitting] = useState(false), [confirmed, setConfirmed] = useState(false), [receipt, setReceipt] = useState<RequestView | null>(null);
  const busy = useRef(false), acknowledged = useRef(false), alive = useRef(true);
  // The owning workspace is keyed by user/role/Store; suppress late writes to another session.
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { setConfirmed(false); }, [selected?.snapshotId, storeId]);
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
      catch { setError('The request was accepted, but its saved key could not be cleared. Check History before another submission.'); }
      onAccepted(response);
    } catch (e) {
      if (alive.current && identity === scope()) setError((e instanceof F05ApiError && (e.status === null || e.status === 200 || e.status === 202) ? 'Outcome not confirmed. Check Analysis History before retrying the same request. ' : '') + miningErrorMessage(e));
    } finally { busy.current = false; if (alive.current) setSubmitting(false); }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy.current || pending || receipt || acknowledged.current || !confirmed || !selected || !confirmedStore || selected.storeId !== storeId) return;
    if (!crypto?.randomUUID) { setError('Secure UUID generation requires HTTPS or localhost.'); return; }
    const payload: MiningSubmission = { requestKey: crypto.randomUUID(), snapshotId: selected.snapshotId };
    setPending(payload); void transmit(payload);
  };
  const discard = () => {
    if (busy.current) return;
    try { clearPendingSubmission(user.id); setPending(null); setReceipt(null); setError(''); setConfirmed(false); acknowledged.current = false; onLocked(false); }
    catch (e) { setError(miningErrorMessage(e)); }
  };
  return <section aria-labelledby="mining-submit-title" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 sm:p-6">
    <h2 id="mining-submit-title" className="text-lg font-semibold">Review Snapshot</h2>
    <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
      <div><h3 className="font-medium">Selected Snapshot</h3>{selected ? <dl className="mt-2 space-y-2"><div><dt className="text-xs text-[#6D7974]">Snapshot</dt><dd>#{selected.snapshotId} · Store #{selected.storeId}</dd></div><div><dt className="text-xs text-[#6D7974]">Sales Period</dt><dd>{formatDateRange(selected.rangeStart, selected.rangeEnd)}</dd></div><div><dt className="text-xs text-[#6D7974]">Analysis Date</dt><dd>{formatDate(selected.asOfDate)}</dd></div><div><dt className="text-xs text-[#6D7974]">Weighted Utility</dt><dd>{selected.totalWeightedUtility}</dd></div></dl> : <p className="mt-2 text-[#6D7974]">Select a READY snapshot to continue.</p>}</div>
      <div><h3 className="font-medium">Algorithm: EFIM</h3><p className="mt-2 text-[#6D7974]">Minimum utility is managed by System Admin. The backend captures the actual threshold when it accepts this request.</p></div>
    </div>
    <form onSubmit={submit} className="mt-4 border-t border-[#E7E2D8] pt-4">
      {selected && !pending && !receipt && <label className="flex items-start gap-2 text-sm"><input type="checkbox" aria-label="Confirm selected snapshot" className="mt-1 accent-[#356B54]" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span>I confirm Snapshot #{selected.snapshotId} for Store #{selected.storeId}. READY snapshots are checked for numerical eligibility by the backend.</span></label>}
      {selected && !confirmedStore && <p className="mt-3 text-sm text-amber-900">Select the Store from the list to confirm this target.</p>}
      <div className="mt-4 flex flex-wrap gap-3"><button type="submit" disabled={submitting || Boolean(pending || receipt || error === restored.error && restored.error) || !selected || !confirmed || !confirmedStore} className={miningPrimaryButton}>{submitting ? 'Submitting…' : 'Run Analysis'}</button><button type="button" className={miningButton} onClick={onHistory}>Check Analysis History</button></div>
    </form>
    {error && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
    {pending && !receipt && <div className="mt-4 space-y-3 rounded-xl bg-[#FAF8F5] p-4 text-sm"><h3 className="font-semibold">Saved submission · Snapshot #{pending.snapshotId}</h3><p className="break-all text-xs">Request key: {pending.requestKey}</p><p>There are no automatic retries. Check History first; retry uses the same key and payload, even after a reload.</p><button type="button" className={miningButton} disabled={submitting} onClick={() => void transmit(pending)}>Retry same submission</button></div>}
    {receipt && <p role="status" className="mt-4 rounded-xl bg-[#EDF5F0] p-3 text-sm">Request #{receipt.requestId} accepted · Snapshot #{receipt.snapshotId} · {receipt.status}. Acceptance does not mean mining has completed.</p>}
    {(pending || receipt || Boolean(restored.error && error === restored.error)) && <><button type="button" disabled={submitting} className={`${miningButton} mt-4`} onClick={discard}>{receipt ? 'Configure another request' : 'Discard saved attempt'}</button>{!receipt && <p className="mt-2 text-xs text-amber-900">Discarding does not cancel server work. A new key may create another request.</p>}</>}
  </section>;
}

// This is a Frontend business restriction, independent of Backend capabilities.
export function MiningSubmissionPanel(props: Parameters<typeof MerchandiserSubmissionPanel>[0]) {
  if(props.user.role!=='Merchandiser')return null;
  return <MerchandiserSubmissionPanel {...props}/>;
}
