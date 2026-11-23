import { useEffect, useRef } from 'react';
import { AlertCircle, Clock3, FileText, Loader2, RefreshCw } from 'lucide-react';
import type { ImportState } from '../f04.import';
import './ImportTransactionsView.css';

export function ImportProgressCard({ state, refresh, retryUpload, acknowledge, focus = false }: {
  state: ImportState; refresh: () => void; retryUpload?: () => void; acknowledge?: () => void; focus?: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (focus) heading.current?.focus({ preventScroll: true }); }, [focus]);
  const { progress, phase, error, busy } = state;
  const excel = state.format === 'excel';
  const uncertain = phase === 'uncertain';
  const queued = progress?.status === 'QUEUED';
  const terminal = progress && ['COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED'].includes(progress.status);
  const title = uncertain ? 'Upload confirmation unavailable' : phase === 'restoring' && !progress ? 'Checking your import'
    : excel ? 'Reading Excel import result' : !progress ? 'Preparing your import' : queued ? 'Your import is queued'
    : terminal ? 'Loading your import result' : progress.status === 'RECEIVING' ? 'Preparing your import' : 'Importing transactions';
  const description = uncertain ? 'Your file may already have been received. Check Import History before starting another import.'
    : phase === 'restoring' && !progress ? 'Retrieving the latest status for your store.'
    : excel ? 'Your workbook is being uploaded and processed. Results will appear when the server responds.' : !progress ? 'Your file is being uploaded and checked.' : queued ? "We've received your file and will start processing it shortly."
    : terminal ? 'Processing has ended. Retrieving the final details.' : 'Your sales data is being processed.';
  const label = excel ? 'Uploading' : progress?.status === 'PROCESSING' ? 'Processing' : queued ? 'Queued' : terminal ? 'Finishing' : 'Preparing';
  const percent = progress?.progressPercent ?? null;
  const stage = progress?.stage === 'IMPORTING' ? 'Processing records…' : progress?.stage === 'QUEUED' ? 'Waiting to start…'
    : progress?.stage === 'RECEIVING' ? 'Checking your file…' : terminal ? 'Retrieving final results…' : 'Waiting for a measured row total…';
  const Icon = uncertain ? AlertCircle : queued ? Clock3 : Loader2;
  return <section className={`f04-import f04-progress-card ${uncertain ? 'f04-progress-card--warning' : ''}`} aria-label={excel ? "Excel import status" : "CSV import progress"}>
    <div className="f04-progress-heading">
      <span className="f04-progress-icon"><Icon aria-hidden="true" size={23} className={busy && !uncertain ? 'animate-spin motion-reduce:animate-none' : ''} /></span>
      <div className="min-w-0 flex-1">
        <div className="f04-progress-title"><h2 ref={heading} tabIndex={-1}>{title}</h2>{!uncertain && <span className="f04-progress-badge">{label}</span>}</div>
        <p className="f04-progress-description" role="status">{description}</p>
      </div>
    </div>
    {(state.filename || progress) && <div className="f04-progress-file"><FileText size={18} aria-hidden="true" /><span>{state.filename || 'CSV import'}</span>{progress && <small>Batch #{progress.importBatchId}</small>}</div>}
    {!uncertain && !excel && <div className="f04-progress-measure">
      <div className="f04-progress-numbers"><span>{progress ? 'Transaction processing' : 'File preparation'}</span><strong>{percent === null ? 'In progress' : `${percent}%`}</strong></div>
      <div className={`f04-progress-track ${percent === null ? 'f04-progress-track--unknown' : ''}`} role="progressbar" aria-label={progress ? 'Transaction processing' : 'File preparation'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent ?? undefined} aria-valuetext={percent === null ? 'Progress is not yet measurable' : `${percent}%`}>
        <span style={percent === null ? undefined : { width: `${percent}%` }} />
      </div>
      <div className="f04-progress-detail"><p>{progress && progress.totalCount !== null ? `${progress.processedCount.toLocaleString()} of ${progress.totalCount.toLocaleString()} rows processed` : progress ? `${progress.processedCount.toLocaleString()} rows processed · Total not yet available` : 'Waiting for the server to confirm your file.'}</p><p>{progress ? stage : 'Checking file and contents…'}</p></div>
    </div>}
    {error && <div className="f04-progress-notice" role="alert"><AlertCircle size={17} aria-hidden="true" /><p>{error}{progress && (terminal ? ' Processing has ended. Refresh to load the final result.' : ' The import may continue in the background. Refresh to check its latest status.')}</p></div>}
    <div className="f04-progress-footer">
      <p>{excel ? (uncertain ? 'Check Import History before uploading this workbook again.' : 'Keep this page open while awaiting the Excel result.') : progress ? 'You can leave this page while the import continues. Check Import History for updates.' : uncertain ? 'Check the latest imports to confirm whether your file was received.' : 'Your import will continue in the background once accepted.'}</p>
      <div className="f04-progress-actions">
        {(progress || uncertain || error) && <a href="/store/transactions/history">Import History</a>}
        {progress || phase === 'restoring' ? <button type="button" onClick={refresh} disabled={busy}><RefreshCw size={14} aria-hidden="true" />Refresh status</button> : null}
        {uncertain && state.canRetryUpload && <button type="button" onClick={retryUpload} disabled={busy}>Retry original upload</button>}
        {uncertain && acknowledge && <button type="button" onClick={acknowledge} disabled={busy}>I've checked Import History</button>}
      </div>
    </div>
  </section>;
}
