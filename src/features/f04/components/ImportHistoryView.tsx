import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, FileClock, FileText, Loader2, RefreshCw, X, XCircle } from 'lucide-react';
import { F04ApiError, f04Api } from '../f04.api';
import type { F04Page, ImportStatus, ImportSummary } from '../f04.types';
import './ImportHistoryView.css';

const PAGE_SIZE = 20;
const statusStyles = {
  COMPLETED: { label: 'Completed', tone: 'success', Icon: CheckCircle2 },
  COMPLETED_WITH_ERRORS: { label: 'Completed with errors', tone: 'warning', Icon: AlertTriangle },
  FAILED: { label: 'Failed', tone: 'danger', Icon: XCircle },
  PROCESSING: { label: 'Processing', tone: 'info', Icon: Loader2 }
};

function StatusBadge({ status }: { status: ImportStatus }) {
  const { label, tone, Icon } = statusStyles[status];
  return <span className={`f04h-badge f04h-tone--${tone}`} title={status}><Icon size={14} aria-hidden="true" />{label}</span>;
}

function skippedExisting(summary: ImportSummary) {
  return summary.status === 'COMPLETED' && summary.acceptedOrderCount === 0 && summary.duplicateOrderCount > 0;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium', timeStyle: 'short'
  }).format(date);
}

function errorMessage(error: unknown) {
  if (!(error instanceof F04ApiError)) return error instanceof Error ? error.message : 'The request could not be completed. Please try again.';
  if (error.status === null) return 'Connection error. Check your connection and try again.';
  const help: Record<number, string> = {
    401: 'Your session has expired or is missing. Please sign in again.',
    403: 'Access denied. Use a Store Admin or Merchandiser account assigned to this store.',
    404: 'Import batch not found. It may no longer be available to your store.'
  };
  return `HTTP ${error.status} · ${help[error.status] || error.message}`;
}

function RequestError({ message, retry }: { message: string; retry: () => void }) {
  return <div role="alert" className="f04h-request-error f04h-tone--danger">
    <AlertCircle size={18} aria-hidden="true" />
    <div><p>{message}</p><button type="button" className="f04h-text-button" onClick={retry}>Try again</button></div>
  </div>;
}

function Loading({ label }: { label: string }) {
  return <div className="f04h-empty" role="status"><Loader2 className="animate-spin motion-reduce:animate-none" size={22} aria-hidden="true" /><p>{label}</p></div>;
}

// Each request owns its result. Cleanup prevents late responses from replacing a newer page or batch.
function usePagedResults<T>(load: (page: number, pageSize: number) => Promise<F04Page<T>>) {
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ page: number; revision: number; data?: F04Page<T>; error?: string } | null>(null);
  useEffect(() => {
    let active = true;
    void load(page, PAGE_SIZE).then(data => {
      if (!active) return;
      const lastPage = Math.max(0, Math.ceil(data.totalElements / data.pageSize) - 1);
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setResult({ page, revision, data });
    }).catch(error => {
      if (active) setResult({ page, revision, error: errorMessage(error) });
    });
    return () => { active = false; };
  }, [load, page, revision]);
  const current = result?.page === page && result.revision === revision ? result : null;
  return { page, setPage, data: current?.data, error: current?.error, loading: !current, refresh: () => setRevision(value => value + 1) };
}

function Pagination({ data, onPage, label }: { data: F04Page<unknown>; onPage: (page: number) => void; label: string }) {
  const pages = Math.max(1, Math.ceil(data.totalElements / data.pageSize));
  const first = data.totalElements === 0 ? 0 : data.page * data.pageSize + 1;
  const last = Math.min((data.page + 1) * data.pageSize, data.totalElements);
  return <nav className="f04h-pagination" aria-label={label}>
    <p>{first.toLocaleString()}–{last.toLocaleString()} of {data.totalElements.toLocaleString()}</p>
    <div><span>Page {data.page + 1} of {pages}</span>
      <button type="button" className="f04h-icon-button" aria-label={`Previous page: ${label}`} disabled={data.page === 0} onClick={() => onPage(data.page - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
      <button type="button" className="f04h-icon-button" aria-label={`Next page: ${label}`} disabled={data.page >= pages - 1} onClick={() => onPage(data.page + 1)}><ChevronRight size={18} aria-hidden="true" /></button>
    </div>
  </nav>;
}

function formatErrorDetails(details: string | null): string {
  if (!details) return 'No additional details provided.';
  try {
    const parsed: unknown = JSON.parse(details);
    // Only replace the raw value when every entry matches backend ValidationError.
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(entry =>
      entry && typeof entry === 'object' && typeof entry.message === 'string' && typeof entry.field === 'string'
    )) {
      return parsed.map(entry => `${entry.field}: ${entry.message}`).join('\n');
    }
  } catch { /* Plain-text messages are also part of the backend contract. */ }
  return details;
}

function ImportErrors({ batchId }: { batchId: number }) {
  const load = useCallback((page: number, size: number) => f04Api.getImportErrors(batchId, page, size), [batchId]);
  const { data, loading, error, refresh, setPage } = usePagedResults(load);
  return <section className="f04h-detail-section" aria-labelledby="f04h-errors-title">
    <div className="f04h-section-heading"><div><h3 id="f04h-errors-title">Error details</h3><p>Rejected and conflicted product rows, as reported by the server.</p></div>
      <button type="button" className="f04h-button" disabled={loading} onClick={refresh} aria-label="Refresh error details"><RefreshCw size={15} aria-hidden="true" />Refresh</button>
    </div>
    {loading ? <Loading label="Loading row errors..." /> : error ? <RequestError message={error} retry={refresh} /> : data && (
      data.content.length === 0 ? <div className="f04h-empty" role="status"><FileText size={22} aria-hidden="true" /><p>No row error details are available for this batch.</p></div> : <>
        <div className="f04h-table-scroll" tabIndex={0} role="region" aria-label="Import row errors; scroll horizontally to see all columns">
          <table className="f04h-table f04h-errors-table"><thead><tr><th scope="col">Row number</th><th scope="col">Source order ID</th><th scope="col">Status</th><th scope="col">Error details</th></tr></thead>
            <tbody>{data.content.map(row => <tr key={row.rowNumber}>
              <th scope="row">{row.rowNumber}</th><td className="f04h-order-id">{row.sourceOrderId ?? '—'}</td>
              <td><span className="f04h-row-status f04h-tone--danger">{row.status}</span></td>
              <td className="f04h-error-details">{formatErrorDetails(row.errorDetails)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <Pagination data={data} onPage={setPage} label="Error details" />
      </>
    )}
  </section>;
}

function Metrics({ title, description, values }: { title: string; description: string; values: { label: string; value: number; tone?: string }[] }) {
  return <section className="f04h-detail-section" aria-label={title}>
    <div className="f04h-section-heading"><div><h3>{title}</h3><p>{description}</p></div></div>
    <dl className="f04h-metrics">{values.map(metric => <div key={metric.label} className={`f04h-metric f04h-tone--${metric.tone || 'neutral'}`}>
      <dt>{metric.label}</dt><dd>{metric.value.toLocaleString()}</dd>
    </div>)}</dl>
  </section>;
}

function ImportDetails({ batchId, onClose }: { batchId: number; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ revision: number; data?: ImportSummary; error?: string } | null>(null);
  const current = result?.revision === revision ? result : null;
  const summary = current?.data;

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal(); // Native modal traps focus and makes the underlying page inert.
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    let active = true;
    void f04Api.getImport(batchId).then(data => {
      if (active) setResult({ revision, data });
    }).catch(error => {
      if (active) setResult({ revision, error: errorMessage(error) });
    });
    return () => { active = false; };
  }, [batchId, revision]);

  return createPortal(<dialog ref={dialogRef} className="f04-history f04h-dialog" aria-labelledby="f04h-detail-title" aria-describedby="f04h-detail-description" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="f04h-dialog-header"><div><p className="f04h-eyebrow">BATCH #{batchId}</p><h2 id="f04h-detail-title">Import details</h2><p id="f04h-detail-description">Review this CSV import and its processing results.</p></div>
      <button ref={closeRef} type="button" className="f04h-icon-button" onClick={onClose} aria-label="Close import details"><X size={20} aria-hidden="true" /></button>
    </header>
    <div className="f04h-dialog-body">
      {!current ? <Loading label="Loading import details..." /> : current.error ? <RequestError message={current.error} retry={() => setRevision(value => value + 1)} /> : summary && <>
        <section className="f04h-batch-overview" aria-label="Batch information">
          <div className="f04h-file-heading"><span className="f04h-file-icon"><FileText size={22} aria-hidden="true" /></span><div><h3>{summary.filename ?? 'Unnamed CSV file'}</h3><StatusBadge status={summary.status} />{skippedExisting(summary) && <p className="f04h-skipped">Existing orders skipped</p>}</div></div>
          <dl className="f04h-metadata"><div><dt>Batch ID</dt><dd>#{summary.importBatchId}</dd></div><div><dt>Started at</dt><dd><time dateTime={summary.startedAt}>{formatDate(summary.startedAt)}</time></dd></div><div><dt>Finished at</dt><dd>{summary.finishedAt ? <time dateTime={summary.finishedAt}>{formatDate(summary.finishedAt)}</time> : '—'}</dd></div></dl>
          <p className="f04h-time-note">Times shown in your local time zone.</p>
          {summary.errorSummary && <div className={`f04h-summary-note f04h-tone--${summary.status === 'FAILED' ? 'danger' : 'warning'}`}><AlertCircle size={17} aria-hidden="true" /><div><h4>Error summary</h4><p>{summary.errorSummary}</p></div></div>}
        </section>
        <Metrics title="Orders" description="Orders are grouped by source_order_id. Duplicates are existing orders skipped without changes." values={[
          { label: 'Total orders', value: summary.totalOrderCount },
          { label: 'Accepted orders', value: summary.acceptedOrderCount, tone: 'success' },
          { label: 'Duplicate orders', value: summary.duplicateOrderCount, tone: 'info' },
          { label: 'Rejected orders', value: summary.rejectedOrderCount, tone: 'danger' },
          { label: 'Conflict orders', value: summary.conflictOrderCount, tone: 'warning' }
        ]} />
        <Metrics title="CSV rows" description="Each row represents a product within an order. One order may include several rows." values={[
          { label: 'Total rows', value: summary.totalCount },
          { label: 'Valid rows', value: summary.validCount, tone: 'success' },
          { label: 'Rejected rows', value: summary.rejectedCount, tone: 'danger' }
        ]} />
        {(summary.rejectedCount > 0 || summary.rejectedOrderCount > 0 || summary.conflictOrderCount > 0) && <ImportErrors key={summary.importBatchId} batchId={summary.importBatchId} />}
      </>}
    </div>
  </dialog>, document.body);
}

export function ImportHistoryView() {
  const { data, loading, error, refresh, setPage } = usePagedResults(f04Api.listImports);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const closeDetails = useCallback(() => setSelectedBatch(null), []);
  return <div className="f04-history f04h-page">
    <header className="f04h-page-header"><div><h1>Import History</h1><p>Review your store's previous CSV imports.</p></div>
      <button type="button" className="f04h-button" onClick={refresh} disabled={loading}><RefreshCw size={16} aria-hidden="true" />Refresh</button>
    </header>
    <section className="f04h-card" aria-labelledby="f04h-list-title">
      <div className="f04h-card-heading"><span className="f04h-file-icon"><FileClock size={20} aria-hidden="true" /></span><div><h2 id="f04h-list-title">CSV imports</h2><p>Newest imports first · 20 per page · Local time</p></div></div>
      {loading ? <Loading label="Loading import history..." /> : error ? <RequestError message={error} retry={refresh} /> : data && (
        data.content.length === 0 ? <div className="f04h-empty" role="status"><FileClock size={32} aria-hidden="true" /><h3>No imports yet</h3><p>CSV imports for your store will appear here after they are submitted.</p></div> : <>
          <div className="f04h-table-scroll" tabIndex={0} role="region" aria-label="Import history; scroll horizontally to see all columns">
            <table className="f04h-table f04h-history-table"><thead><tr>
              <th scope="col">Batch ID</th><th scope="col">Filename</th><th scope="col">Started at</th><th scope="col">Status</th>
              <th scope="col" className="f04h-number">Accepted<br />orders</th><th scope="col" className="f04h-number">Duplicate<br />orders</th><th scope="col" className="f04h-number">Rejected<br />orders</th><th scope="col" className="f04h-number">Conflict<br />orders</th><th scope="col">Action</th>
            </tr></thead><tbody>{data.content.map(batch => <tr key={batch.importBatchId}>
              <th scope="row">#{batch.importBatchId}</th><td className="f04h-filename">{batch.filename ?? '—'}</td><td className="f04h-date"><time dateTime={batch.startedAt}>{formatDate(batch.startedAt)}</time></td>
              <td><StatusBadge status={batch.status} />{skippedExisting(batch) && <p className="f04h-skipped">Existing orders skipped</p>}</td>
              <td className="f04h-number">{batch.acceptedOrderCount.toLocaleString()}</td><td className="f04h-number">{batch.duplicateOrderCount.toLocaleString()}</td><td className="f04h-number">{batch.rejectedOrderCount.toLocaleString()}</td><td className="f04h-number">{batch.conflictOrderCount.toLocaleString()}</td>
              <td><button type="button" className="f04h-text-button" aria-label={`View details for batch ${batch.importBatchId}`} aria-haspopup="dialog" onClick={() => setSelectedBatch(batch.importBatchId)}>View Details</button></td>
            </tr>)}</tbody></table>
          </div>
          <Pagination data={data} onPage={setPage} label="Import history" />
        </>
      )}
    </section>
    {selectedBatch !== null && <ImportDetails key={selectedBatch} batchId={selectedBatch} onClose={closeDetails} />}
  </div>;
}
