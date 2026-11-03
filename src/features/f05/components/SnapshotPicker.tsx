import { useEffect, useState } from 'react';
import { AlertCircle, Database, Loader2, RefreshCw } from 'lucide-react';
import { getPathForScreen } from '../../../utils/navigationRouter';
import { f05Api } from '../f05.api';
import type { Page, SnapshotView } from '../f05.types';

const PAGE_SIZE = 10;
const button = 'rounded-xl border border-[#E7E2D8] bg-white px-4 py-2 text-sm font-semibold text-[#1E3A2F] hover:bg-[#EDF5F0] disabled:cursor-not-allowed disabled:opacity-50';

interface SnapshotPickerProps {
  canSubmit: boolean;
  locked: boolean;
  selected: SnapshotView | null;
  onSelect: (snapshot: SnapshotView | null) => void;
  errorMessage: (error: unknown) => string;
}

export function SnapshotPicker({ canSubmit, locked, selected, onSelect, errorMessage }: SnapshotPickerProps) {
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ page: number; revision: number; data?: Page<SnapshotView>; error?: string } | null>(null);
  const current = result?.page === page && result.revision === revision ? result : null;
  const loading = !current;

  useEffect(() => {
    let active = true;
    void f05Api.listSnapshots(page, PAGE_SIZE).then(data => {
      if (!active) return;
      const lastPage = Math.max(0, Math.ceil(data.totalElements / PAGE_SIZE) - 1);
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setResult({ page, revision, data });
    }).catch(error => {
      if (active) setResult({ page, revision, error: errorMessage(error) });
    });
    return () => { active = false; };
  }, [page, revision, errorMessage]);

  const changePage = (nextPage: number) => {
    if (!locked) onSelect(null);
    setPage(nextPage);
  };
  const refresh = () => {
    if (!locked) onSelect(null);
    setRevision(value => value + 1);
  };
  const data = current?.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.totalElements / PAGE_SIZE)) : 1;

  return (
    <section aria-labelledby="f05-snapshot-title" aria-busy={loading} className="rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="f05-snapshot-title" className="flex items-center gap-2 text-xl font-semibold"><Database aria-hidden="true" className="h-5 w-5 text-[#356B54]" />READY snapshots</h2>
          <p className="mt-2 text-sm text-[#6D7974]">Frozen F03 inputs for your store. The backend validates mining eligibility when a request is submitted.</p>
        </div>
        <button type="button" onClick={refresh} disabled={loading} className={button}><RefreshCw aria-hidden="true" className="mr-2 inline h-4 w-4" />Refresh snapshots</button>
      </div>

      {loading ? (
        <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-[#6D7974]"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" />Loading snapshots...</div>
      ) : current.error ? (
        <div role="alert" className="mt-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle aria-hidden="true" className="h-5 w-5 shrink-0" /><div><p className="font-semibold">Snapshots could not be loaded</p><p className="mt-1">{current.error}</p><p className="mt-2">Use Refresh snapshots when you are ready to try again.</p></div></div>
      ) : data && data.items.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-[#E7E2D8] bg-[#FAF8F5] p-6 text-sm text-[#6D7974]">
          <p className="font-semibold text-[#191C1B]">No READY snapshots found</p>
          {canSubmit ? <><p className="mt-2">Open F03 Utility Preview, review the utility matrix and create a snapshot before mining.</p><a href={getPathForScreen('f03-preview')} className="mt-3 inline-block font-semibold text-[#1E3A2F] underline underline-offset-4">Open F03 Utility Preview</a></> : <p className="mt-2">Ask a Merchandiser to create a frozen snapshot in F03.</p>}
        </div>
      ) : data && (
        <div role={canSubmit ? 'radiogroup' : 'region'} aria-label={canSubmit ? 'Snapshot selection' : 'Frozen snapshots'} tabIndex={canSubmit ? undefined : 0} className="mt-5 grid max-h-[36rem] gap-4 overflow-y-auto pr-1 lg:grid-cols-2">
          {data.items.map(snapshot => (
            <article key={snapshot.snapshotId} className={`min-w-0 rounded-xl border p-4 ${selected?.snapshotId === snapshot.snapshotId ? 'border-[#356B54] bg-[#F3F8F4]' : 'border-[#E7E2D8]'}`}>
              <div className="flex items-center justify-between gap-3">
                {canSubmit ? (
                  <label className="flex cursor-pointer items-center gap-2 font-semibold">
                    <input type="radio" name="snapshotId" value={snapshot.snapshotId} checked={selected?.snapshotId === snapshot.snapshotId} disabled={locked || snapshot.status !== 'READY'} onChange={() => onSelect(snapshot)} className="h-4 w-4 accent-[#356B54] disabled:cursor-not-allowed" />
                    Snapshot #{snapshot.snapshotId}
                  </label>
                ) : <h3 className="font-semibold">Snapshot #{snapshot.snapshotId}</h3>}
                <span className="rounded-full bg-[#EDF5F0] px-2 py-1 text-xs font-semibold text-[#1E3A2F]">{snapshot.status}</span>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div><dt className="text-xs text-[#6D7974]">Date range</dt><dd className="mt-0.5">{snapshot.rangeStart} to {snapshot.rangeEnd}</dd></div>
                <div><dt className="text-xs text-[#6D7974]">Analysis date</dt><dd className="mt-0.5">{snapshot.configuration?.analysisDate ?? snapshot.asOfDate}</dd></div>
                <div><dt className="text-xs text-[#6D7974]">Total weighted utility</dt><dd className="mt-0.5 break-all font-medium">{snapshot.totalWeightedUtility}</dd></div>
                <div><dt className="text-xs text-[#6D7974]">Scoring version</dt><dd className="mt-0.5 break-words">{snapshot.configuration?.config?.scoringVersion ?? 'Not available in frozen metadata'}</dd></div>
              </dl>
              {snapshot.warnings.length > 0 && <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">Snapshot warnings</p><ul className="mt-1 list-disc space-y-1 pl-5">{snapshot.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
            </article>
          ))}
        </div>
      )}

      {data && <nav aria-label="Snapshot pages" className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E7E2D8] pt-4 text-sm text-[#6D7974]">
        <p>Page {data.page + 1} of {totalPages} · {data.totalElements} snapshots</p>
        <div className="flex gap-2"><button type="button" className={button} disabled={loading || page === 0} onClick={() => changePage(page - 1)}>Previous</button><button type="button" className={button} disabled={loading || page + 1 >= totalPages} onClick={() => changePage(page + 1)}>Next</button></div>
      </nav>}
    </section>
  );
}
