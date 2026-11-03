import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import type { AuthUser } from '../../../services/authService';
import { miningErrorMessage } from '../f05.display';
import { parseMiningId, parseMinUtilInput } from '../f05.numbers';
import { clearPendingSubmission, readPendingSubmission, sendSubmission } from '../f05.submission';
import type { Algorithm, CreateRequest, MinUtilMode, RequestView, SnapshotView } from '../f05.types';
import { SnapshotPicker } from './SnapshotPicker';
import { MiningHistoryView } from './MiningHistoryView';

interface F05WorkspaceViewProps {
  currentUser: AuthUser;
}

const button = 'rounded-xl border border-[#E7E2D8] bg-white px-4 py-2.5 text-sm font-semibold text-[#1E3A2F] hover:bg-[#EDF5F0] disabled:cursor-not-allowed disabled:opacity-50';
const primaryButton = 'rounded-xl border border-[#1E3A2F] bg-[#1E3A2F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2D604A] disabled:cursor-not-allowed disabled:opacity-50';
const input = 'mt-2 w-full rounded-xl border border-[#E7E2D8] bg-white px-3 py-2.5 outline-none focus:border-[#356B54] disabled:bg-[#F4F1EC] disabled:text-[#6D7974]';

function readWorkspaceLocation(canSubmit: boolean): { view: 'setup' | 'history'; requestId: number | null; error: string } {
  const query = new URLSearchParams(window.location.search);
  const view = query.has('requestId') || query.get('view') === 'history' || (!canSubmit && query.get('view') !== 'setup') ? 'history' : 'setup';
  try {
    return { view, requestId: query.has('requestId') ? parseMiningId(query.get('requestId')!) : null, error: '' };
  } catch (error) {
    return { view, requestId: null, error: error instanceof Error ? error.message : 'Invalid request ID.' };
  }
}

function restoreSubmission(userId: string, canSubmit: boolean) {
  try {
    return { pending: canSubmit ? readPendingSubmission(userId) : null, error: '' };
  } catch {
    return { pending: null, error: 'The saved mining submission could not be restored. Clear the saved attempt explicitly before starting another submission; the previous attempt may already exist on the server.' };
  }
}

function MiningWorkspace({ currentUser }: F05WorkspaceViewProps) {
  const canSubmit = currentUser.role === 'Merchandiser';
  const [location, setLocation] = useState(() => readWorkspaceLocation(canSubmit));
  const [restored] = useState(() => restoreSubmission(currentUser.id, canSubmit));
  const [selected, setSelected] = useState<SnapshotView | null>(null);
  const [algorithms, setAlgorithms] = useState<Algorithm[]>(restored.pending?.algorithms ?? ['HUI_MINER']);
  const [minUtilMode, setMinUtilMode] = useState<MinUtilMode>(restored.pending?.minUtilMode ?? 'PERCENTAGE');
  const [minUtilInput, setMinUtilInput] = useState(restored.pending ? String(restored.pending.minUtilValue) : '');
  const [pending, setPending] = useState<CreateRequest | null>(restored.pending);
  const [storageError, setStorageError] = useState(restored.error);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [receipt, setReceipt] = useState<RequestView | null>(null);
  const pendingRef = useRef(pending);
  const receiptRef = useRef<RequestView | null>(null);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const locked = submitting || Boolean(pending) || Boolean(receipt) || Boolean(storageError);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const onPopState = () => setLocation(readWorkspaceLocation(canSubmit));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [canSubmit]);

  const navigateWorkspace = (view: 'setup' | 'history', requestId: number | null = null) => {
    const query = new URLSearchParams({ view });
    if (requestId !== null) query.set('requestId', String(parseMiningId(String(requestId))));
    window.history.pushState({ screen: 'f05-mining' }, '', `${window.location.pathname}?${query}`);
    setLocation(readWorkspaceLocation(canSubmit));
  };

  const transmit = async (payload: CreateRequest) => {
    if (!canSubmit || busyRef.current || receiptRef.current) return;
    busyRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await sendSubmission(currentUser.id, payload);
      if (!mounted.current) return;
      receiptRef.current = response;
      setReceipt(response);
      try {
        clearPendingSubmission(currentUser.id);
      } catch {
        setStorageError('The request was acknowledged, but its saved attempt could not be cleared. Clear it before starting another submission.');
      }
      pendingRef.current = null;
      setPending(null);
    } catch (error) {
      if (mounted.current) setSubmitError(miningErrorMessage(error));
    } finally {
      busyRef.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || busyRef.current || pendingRef.current || receiptRef.current || storageError) return;
    const errors: string[] = [];
    if (!selected || selected.status !== 'READY') errors.push('Select a READY snapshot before submitting.');
    if (!algorithms.length) errors.push('Select at least one algorithm.');
    let minUtilValue: number | null = null;
    try {
      minUtilValue = parseMinUtilInput(minUtilInput, minUtilMode);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Enter a valid minimum utility.');
    }
    setFormErrors(errors);
    if (errors.length || !selected || minUtilValue === null) return;
    if (!globalThis.crypto?.randomUUID) {
      setFormErrors(['A secure UUID could not be generated. Use a secure browser context (HTTPS or localhost) before submitting.']);
      return;
    }
    const payload: CreateRequest = {
      requestKey: crypto.randomUUID(),
      snapshotId: selected.snapshotId,
      algorithms: [...algorithms],
      minUtilMode,
      minUtilValue
    };
    // Pin the exact payload before starting async work. Edits require a new intent/key.
    pendingRef.current = payload;
    setPending(payload);
    void transmit(payload);
  };

  const startDifferentSubmission = () => {
    if (busyRef.current) return;
    try {
      clearPendingSubmission(currentUser.id);
    } catch {
      setStorageError('The saved attempt could not be cleared. Enable session storage before starting a different submission.');
      return;
    }
    pendingRef.current = null;
    receiptRef.current = null;
    setPending(null);
    setReceipt(null);
    setStorageError('');
    setSubmitError('');
    setFormErrors([]);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-[#191C1B]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold">High Utility Mining</h1>
          <p className="mt-2 text-[#6D7974]">
            Explore high-utility product patterns using frozen utility snapshots from your store.
            Mining uses the utilities captured in each snapshot.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#EDF5F0] px-3 py-1.5 text-xs font-semibold text-[#1E3A2F]">
          <ShieldCheck aria-hidden="true" className="h-4 w-4" />
          {currentUser.role}
        </span>
      </div>

      <section aria-labelledby="f05-access-title" className="rounded-2xl border border-[#E7E2D8] bg-white p-6 shadow-sm">
        <h2 id="f05-access-title" className="flex items-center gap-2 text-lg font-semibold">
          {canSubmit ? <ShieldCheck aria-hidden="true" className="h-5 w-5 text-[#1E3A2F]" /> : <LockKeyhole aria-hidden="true" className="h-5 w-5 text-[#1E3A2F]" />}
          {canSubmit ? 'Merchandiser access' : 'Read-only access'}
        </h2>
        <p className="mt-2 text-sm text-[#6D7974]">
          {canSubmit
            ? 'Choose a frozen snapshot, configure minimum utility and submit an asynchronous mining request for your store.'
            : 'You can inspect frozen snapshots, request history and algorithm runs for your store. Only Merchandisers can submit mining requests.'}
        </p>
      </section>

      <nav aria-label="Mining workspace" className="flex flex-wrap gap-2 rounded-2xl border border-[#E7E2D8] bg-white p-2 shadow-sm">
        <button type="button" aria-current={location.view === 'setup' ? 'page' : undefined} onClick={() => navigateWorkspace('setup')} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${location.view === 'setup' ? 'bg-[#1E3A2F] text-white' : 'text-[#6D7974] hover:bg-[#FAF8F5]'}`}>{canSubmit ? 'Mining setup' : 'Snapshots'}</button>
        <button type="button" aria-current={location.view === 'history' ? 'page' : undefined} onClick={() => navigateWorkspace('history')} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${location.view === 'history' ? 'bg-[#1E3A2F] text-white' : 'text-[#6D7974] hover:bg-[#FAF8F5]'}`}>Request history</button>
      </nav>

      {location.view === 'history' && <MiningHistoryView requestId={location.requestId} selectionError={location.error} onSelect={requestId => navigateWorkspace('history', requestId)} />}

      {/* Keep setup mounted while browsing history so an in-flight POST, draft or
          saved UUID/payload is never lost when switching workspace views. */}
      <div hidden={location.view !== 'setup'} className="space-y-6">
      <SnapshotPicker canSubmit={canSubmit} locked={locked} selected={selected} onSelect={setSelected} errorMessage={miningErrorMessage} />

      {canSubmit && <section aria-labelledby="f05-setup-title" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-sm sm:p-6">
        <h2 id="f05-setup-title" className="text-xl font-semibold">Mining setup</h2>
        <p className="mt-2 text-sm text-[#6D7974]">{pending ? `Current submission uses Snapshot #${pending.snapshotId}.` : selected ? `Selected Snapshot #${selected.snapshotId}` : 'Select a READY snapshot above to enable submission.'}</p>

        {storageError && <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p>{storageError}</p>{!pending && !receipt && <button type="button" onClick={startDifferentSubmission} className={`${button} mt-3`}>Clear saved attempt</button>}</div>}
        <form onSubmit={submit} noValidate className="mt-5 space-y-5">
          <fieldset disabled={locked} className="space-y-5">
            <fieldset>
              <legend className="text-sm font-semibold">Algorithms</legend>
              <div className="mt-3 flex flex-wrap gap-5">
                {(['HUI_MINER', 'EFIM'] as const).map(algorithm => <label key={algorithm} className="flex items-center gap-2 text-sm"><input type="checkbox" name="algorithm" value={algorithm} checked={algorithms.includes(algorithm)} onChange={event => { setAlgorithms(previous => event.target.checked ? [...new Set([...previous, algorithm])] : previous.filter(value => value !== algorithm)); setFormErrors([]); }} className="h-4 w-4 accent-[#356B54]" />{algorithm === 'HUI_MINER' ? 'HUI-Miner' : 'EFIM'}</label>)}
              </div>
              <p className="mt-2 text-xs text-[#6D7974]">Choose one or both algorithms. At least one is required.</p>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold" htmlFor="f05-min-util-mode">Minimum utility mode<select id="f05-min-util-mode" className={input} value={minUtilMode} onChange={event => { setMinUtilMode(event.target.value as MinUtilMode); setFormErrors([]); }}><option value="PERCENTAGE">Percentage</option><option value="ABSOLUTE">Absolute</option></select></label>
              <label className="block text-sm font-semibold" htmlFor="f05-min-util">Minimum utility<input id="f05-min-util" className={input} type="text" inputMode="decimal" autoComplete="off" value={minUtilInput} onChange={event => { setMinUtilInput(event.target.value); setFormErrors([]); }} aria-describedby="f05-min-util-help" aria-invalid={formErrors.length > 0 ? true : undefined} /></label>
            </div>
            <p id="f05-min-util-help" className="text-sm text-[#6D7974]">{minUtilMode === 'PERCENTAGE' ? 'Enter a percentage greater than 0 and at most 100. For example, 0.5 means 0.5%, not 50%.' : 'Enter a value greater than 0 in frozen weighted utility units.'} Up to 6 fractional digits. Values that cannot be sent without a precision change are rejected. Thresholds and utilities are calculated only by the backend.</p>
            {formErrors.length > 0 && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><ul className="list-disc space-y-1 pl-5">{formErrors.map(error => <li key={error}>{error}</li>)}</ul></div>}
            <button type="submit" disabled={locked || !selected} className={primaryButton}>Run Mining</button>
          </fieldset>
        </form>

        {pending && <div className="mt-5 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] p-4 text-sm">
          <p className="font-semibold">{submitting ? 'Sending mining request...' : 'Submission awaiting confirmation'}</p>
          <dl className="mt-3 space-y-2"><div><dt className="text-xs text-[#6D7974]">Request key</dt><dd className="break-all font-mono">{pending.requestKey}</dd></div><div><dt className="text-xs text-[#6D7974]">Pinned payload</dt><dd className="break-words">Snapshot #{pending.snapshotId} · {pending.algorithms.join(', ')} · {pending.minUtilMode} · {pending.minUtilValue}</dd></div></dl>
          <p className="mt-3 text-[#6D7974]">Retry sends exactly this UUID and payload. No automatic retries are performed. Starting a different submission can create another request if the previous attempt was accepted.</p>
          {submitting && <p role="status" className="mt-3 flex items-center gap-2"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />Waiting for the submission response...</p>}
          {submitError && <div role="alert" className="mt-3 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800"><AlertCircle aria-hidden="true" className="h-5 w-5 shrink-0" /><p>{submitError}</p></div>}
          <div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={submitting} onClick={() => { const saved = pendingRef.current; if (saved) void transmit(saved); }} className={button}>Retry same submission</button><button type="button" disabled={submitting} onClick={startDifferentSubmission} className={button}>Start a different submission</button></div>
        </div>}

        {receipt && <div role="status" className="mt-5 rounded-xl border border-[#CADACF] bg-[#F3F8F4] p-4 text-sm">
          <h3 className="text-lg font-semibold">Submission acknowledged</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2"><div><dt className="text-xs text-[#6D7974]">Request ID</dt><dd className="mt-1 break-all font-semibold">{receipt.requestId}</dd></div><div><dt className="text-xs text-[#6D7974]">Backend request status</dt><dd className="mt-1 font-semibold">{receipt.status}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-[#6D7974]">Request key</dt><dd className="mt-1 break-all font-mono">{receipt.requestKey}</dd></div></dl>
          <p className="mt-4 text-[#6D7974]">HTTP 202 acknowledges an asynchronous request; it does not mean mining completed successfully. This status comes from the submission response and is not automatically refreshed.</p>
          <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => navigateWorkspace('history', receipt.requestId)} className={button}>View request details</button><button type="button" onClick={startDifferentSubmission} className={button}>Configure another request</button></div>
        </div>}
      </section>}
      </div>
    </div>
  );
}

export function F05WorkspaceView({ currentUser }: F05WorkspaceViewProps) {
  if (currentUser.role !== 'Merchandiser' && currentUser.role !== 'Store Admin') return null;
  return <MiningWorkspace key={`${currentUser.id}:${currentUser.role}`} currentUser={currentUser} />;
}
