import { importFormat, importFormatLabel, validateImportFile } from '../f04.files';
import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CloudUpload, Files, FileText, Info, Loader2, ShieldAlert, Upload, X, XCircle } from 'lucide-react';
import { f04Api } from '../f04.api';
import { authService } from '../../../services/authService';
import { f04Scope } from '../f04.session';
import { importRequestError } from '../f04.import';
import { useF04Scope, useImportWorkflow } from '../useImportWorkflow';
import { ImportProgressCard } from './ImportProgressCard';
import type { F04Page, ImportError, ImportSummary } from '../f04.types';
import './ImportTransactionsView.css';

const ERROR_PAGE_SIZE = 20;
const CSV_HEADER = 'source_order_id,occurred_at,sku,quantity,unit_price,unit_cost,status';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg border border-[#e7e2d8] bg-white px-3.5 py-2 text-sm font-semibold text-[#1e3a2f] hover:bg-[#f5f7f3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e3a2f] disabled:cursor-not-allowed disabled:opacity-40';

interface Notice { title: string; message: string; detail?: string; }
type ResultTone = 'success' | 'neutral' | 'warning' | 'error' | 'processing';
interface ResultPresentation { tone: ResultTone; message: string; }
const resultStyles = {
  success: { Icon: CheckCircle2, className: 'f04-result--success' },
  neutral: { Icon: Info, className: 'f04-result--neutral' },
  warning: { Icon: AlertTriangle, className: 'f04-result--warning' },
  error: { Icon: XCircle, className: 'f04-result--error' },
  processing: { Icon: Loader2, className: 'f04-result--processing' }
};

const importStatusLabels: Record<ImportSummary['status'], string> = {
  COMPLETED: 'Completed',
  COMPLETED_WITH_ERRORS: 'Completed with issues',
  FAILED: 'Failed',
  PROCESSING: 'Processing',
  QUEUED: 'Queued',
  RECEIVING: 'Preparing'
};

const metricStyles = {
  neutral: 'f04-kpi--neutral',
  accepted: 'f04-kpi--accepted',
  duplicate: 'f04-kpi--duplicate',
  duplicatePrimary: 'f04-kpi--duplicate-primary',
  rejected: 'f04-kpi--rejected',
  warning: 'f04-kpi--warning'
};

function hasImportErrors(summary: ImportSummary): boolean {
  return summary.rejectedCount > 0 || summary.rejectedOrderCount > 0 || summary.conflictOrderCount > 0;
}

function getResultPresentation(summary: ImportSummary): ResultPresentation {
  if (summary.status === 'FAILED') return { tone: 'error', message: 'Import failed' };
  if (summary.status === 'PROCESSING') return { tone: 'processing', message: 'The server is still processing this file.' };
  if (summary.status === 'COMPLETED_WITH_ERRORS' || hasImportErrors(summary)) {
    return { tone: 'warning', message: 'Import completed with issues' };
  }
  if (summary.acceptedOrderCount > 0) {
    const count = summary.acceptedOrderCount;
    return { tone: 'success', message: `Import completed. ${count.toLocaleString()} new ${count === 1 ? 'order' : 'orders'} saved.` };
  }
  if (summary.duplicateOrderCount > 0) {
    const count = summary.duplicateOrderCount;
    return { tone: 'neutral', message: `Import completed. No new transactions. ${count.toLocaleString()} existing ${count === 1 ? 'order was' : 'orders were'} skipped.` };
  }
  return { tone: 'neutral', message: 'Import completed. No new transactions were imported.' };
}

function describeError(error: unknown): Notice {
  return {
    title: 'Could not load row errors',
    message: 'Your import result is still available. Retry loading the row details.',
    detail: importRequestError(error)
  };
}

const validateFile = validateImportFile;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes.toLocaleString()} bytes`;
  const unit = bytes < 1024 * 1024 ? 'KiB' : 'MiB';
  return `${(bytes / (unit === 'KiB' ? 1024 : 1024 * 1024)).toFixed(2)} ${unit} (${bytes.toLocaleString()} bytes)`;
}

function formatErrorDetails(details: string | null): string {
  if (!details) return 'No additional details provided.';
  try {
    const parsed: unknown = JSON.parse(details);
    if (Array.isArray(parsed)) {
      const messages = parsed.map((entry: unknown) => {
        if (!entry || typeof entry !== 'object') return '';
        const item = entry as { field?: unknown; message?: unknown };
        if (typeof item.message !== 'string') return '';
        return typeof item.field === 'string' ? `${item.field}: ${item.message}` : item.message;
      }).filter(Boolean);
      if (messages.length) return messages.join('\n');
    }
  } catch { /* The backend also returns plain-text row errors. */ }
  return details;
}

function ErrorNotice({ notice }: { notice: Notice }) {
  // Avoid the global CSS selector that turns certain error divs into fixed toasts.
  return <div role="alert" className="f04-error-notice flex items-start gap-3 rounded-lg p-4 text-sm">
    <XCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
    <div className="min-w-0 space-y-1"><p className="font-semibold">{notice.title}</p><p>{notice.message}</p>{notice.detail && <p className="break-words pt-1 text-xs">Details: {notice.detail}</p>}</div>
  </div>;
}

export function ImportTransactionsView() {
  const scope = useF04Scope();
  return authService.getCurrentUser()?.role === 'Store Admin' ? <ImportTransactionsContent key={scope} /> : null;
}

function ImportTransactionsContent() {
  const state = useImportWorkflow();
  const { workflow, summary } = state;
  const uploading = ['uploading', 'restoring', 'tracking', 'uncertain'].includes(state.phase);
  const scope = useRef(f04Scope());
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errorPage, setErrorPage] = useState<F04Page<ImportError> | null>(null);
  const [errorsLoading, setErrorsLoading] = useState(false);
  const [errorsError, setErrorsError] = useState<Notice | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const submitting = useRef(false);
  submitting.current = uploading;
  const errorsPending = useRef(false);
  const importRun = useRef(0);
  const focusNewFile = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chooseFileRef = useRef<HTMLButtonElement | null>(null);
  const uploadRef = useRef<HTMLFormElement | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const uploadErrorRef = useRef<HTMLDivElement | null>(null);
  const errorsRef = useRef<HTMLDivElement | null>(null);
  const errorsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const presentation = summary ? getResultPresentation(summary) : null;
  const resultStyle = presentation ? resultStyles[presentation.tone] : null;
  const ResultIcon = resultStyle?.Icon ?? Info;
  const showErrors = summary ? hasImportErrors(summary) : false;
  const duplicateOnly = summary?.status === 'COMPLETED' && summary.acceptedOrderCount === 0 && summary.duplicateOrderCount > 0 && !showErrors;
  const quickMeaning = summary ? [
    { show: presentation?.tone === 'warning' && summary.acceptedOrderCount > 0, Icon: CheckCircle2, color: 'f04-quick--success', text: `${summary.acceptedOrderCount.toLocaleString()} new ${summary.acceptedOrderCount === 1 ? 'order' : 'orders'} saved` },
    { show: (presentation?.tone === 'success' || presentation?.tone === 'warning') && summary.duplicateOrderCount > 0, Icon: Files, color: 'f04-quick--info', text: `${summary.duplicateOrderCount.toLocaleString()} existing ${summary.duplicateOrderCount === 1 ? 'order' : 'orders'} skipped` },
    { show: presentation?.tone === 'warning' && summary.rejectedOrderCount > 0, Icon: AlertTriangle, color: 'f04-quick--danger', text: `${summary.rejectedOrderCount.toLocaleString()} ${summary.rejectedOrderCount === 1 ? 'order' : 'orders'} rejected` },
    { show: presentation?.tone === 'warning' && summary.conflictOrderCount > 0, Icon: ShieldAlert, color: 'f04-quick--warning', text: `${summary.conflictOrderCount.toLocaleString()} ${summary.conflictOrderCount === 1 ? 'order' : 'orders'} with conflicting data` }
  ].filter(item => item.show) : [];

  useEffect(() => {
    let target: HTMLElement | null = null;
    if (!uploading && summary) {
      // Focus the real result instead of announcing a duplicate hidden message.
      resultHeadingRef.current?.focus({ preventScroll: true });
      target = resultRef.current;
    } else if (!uploading && state.error) {
      target = uploadErrorRef.current;
    } else if (focusNewFile.current) {
      focusNewFile.current = false;
      chooseFileRef.current?.focus({ preventScroll: true });
      target = uploadRef.current;
    }
    target?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start'
    });
  }, [uploading, summary, state.error]);

  const reviewErrors = () => {
    errorsHeadingRef.current?.focus({ preventScroll: true });
    errorsRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start'
    });
  };

  const selectFile = (next: File | null) => {
    if (submitting.current) return;
    setFile(next);
    setValidationError(next ? validateFile(next) : null);
  };

  const loadErrors = async (batchId: number, page: number, run = importRun.current) => {
    if (errorsPending.current || (run !== importRun.current || scope.current !== f04Scope())) return;
    errorsPending.current = true;
    setErrorsLoading(true);
    setErrorsError(null);
    try {
      const result = await f04Api.getImportErrors(batchId, page, ERROR_PAGE_SIZE);
      if (run === importRun.current && scope.current === f04Scope()) setErrorPage(result);
    } catch (error) {
      if (run === importRun.current && scope.current === f04Scope()) setErrorsError(describeError(error));
    } finally {
      if (run === importRun.current && scope.current === f04Scope()) {
        errorsPending.current = false;
        setErrorsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (summary && hasImportErrors(summary)) void loadErrors(summary.importBatchId, 0);
    return () => { importRun.current++; errorsPending.current = false; };
  }, [summary]);

  const importFile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const invalid = file ? validateFile(file) : 'Choose a CSV or Excel file before importing.';
    setValidationError(invalid);
    if (!file || invalid) return;
    setErrorPage(null);
    setErrorsError(null);
    setGuideOpen(false);
    await workflow.submit(file);
  };

  const importAnotherFile = () => {
    if (submitting.current) return;
    // Ignore late row-error responses from the previous batch after resetting.
    importRun.current++;
    errorsPending.current = false;
    focusNewFile.current = true;
    setFile(null);
    setValidationError(null);
    workflow.reset();
    setErrorPage(null);
    setErrorsError(null);
    setErrorsLoading(false);
    setGuideOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="f04-import mx-auto max-w-7xl space-y-6 bg-[#faf8f5] text-[#191c1b]">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Import Transactions</h1>
        <p className="mt-1 text-sm leading-6 text-[#6d7974]">Import sales transactions from a CSV or Excel file for your store.</p>
      </header>

      <section aria-labelledby="csv-guide-heading" className="f04-prepare">
        <div className="flex items-start gap-3 p-5 sm:px-6">
          <span className="f04-prepare-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"><Info aria-hidden="true" className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="csv-guide-heading" className="font-semibold">Prepare your file</h2>
              <button type="button" aria-expanded={guideOpen} aria-controls="csv-format-instructions" onClick={() => setGuideOpen(open => !open)} className="inline-flex items-center gap-2 rounded py-1 text-xs font-semibold text-[#1e3a2f] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1e3a2f]">{guideOpen ? 'Hide format instructions' : 'View format instructions'}<ChevronDown aria-hidden="true" className={`h-4 w-4 ${guideOpen ? 'rotate-180' : ''}`} /></button>
            </div>
            <ul className="f04-prepare-notes">
              <li>CSV (UTF-8) or Excel (.xlsx, .xls)</li>
              <li>Max 5 MiB</li>
              <li>Max 10,000 nonblank rows</li>
              <li>Use store-specific SKUs</li>
              <li>Follow required header</li>
            </ul>
            <p className="mt-3 text-xs leading-5 text-[#575e58]">Replace sample SKU <strong>00123</strong> with an existing product SKU from your store. Order ID, SKU and timestamp must be Text in Excel.</p>
            <div className="mt-3 flex flex-wrap gap-2"><a className={secondaryButton + ' max-w-full whitespace-normal text-center'} href="/templates/f04/transactions-template.xlsx" download>Download XLSX template</a><a className={secondaryButton + ' max-w-full whitespace-normal text-center'} href="/templates/f04/transactions-template.xls" download>Download XLS template</a></div>
          </div>
        </div>
            {guideOpen && (
              <div id="csv-format-instructions" className="space-y-5 border-t border-[#e7e2d8] bg-[#fcfcfa] p-5 text-sm leading-6 text-[#575e58] sm:px-6">
                <div><h3 className="font-semibold text-[#191c1b]">Required columns</h3><p className="mt-1 text-xs">Keep these column names in this exact order, with one product row on each line.</p><code className="mt-3 block break-all rounded-lg border border-[#e7e2d8] bg-white px-3 py-2 text-xs leading-6 text-[#1e3a2f]">{CSV_HEADER}</code></div>
                <div><h3 className="font-semibold text-[#191c1b]">Sale date and time</h3><p className="mt-1 text-xs">Include the time zone in each timestamp. For example: <code className="break-all text-[#1e3a2f]">2026-10-19T09:00:00+07:00</code> (UTC+07:00).</p></div>
                <div><h3 className="font-semibold text-[#191c1b]">Excel checklist</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-xs"><li>Use Text cells for Order ID, SKU and timestamp, including the UTC offset.</li><li>Use one worksheet with data. Extra worksheets must be empty.</li><li>Quantity must be a positive whole number. Unit price and unit cost cannot be negative.</li><li>Do not use formulas or Excel Date/Serial cells for timestamps.</li><li>Use an existing store SKU and an order ID that identifies the original sale.</li></ul><p className="mt-2 text-xs">CSV must use UTF-8. Excel uploads return results directly; CSV imports continue in the background after acceptance.</p></div>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div><dt className="font-semibold text-[#191c1b]">Duplicate orders</dt><dd className="mt-1 text-xs">The same order ID and contents already exist. These orders are skipped without creating new transactions; duplicates are not errors.</dd></div>
                  <div><dt className="font-semibold text-[#191c1b]">Conflict orders</dt><dd className="mt-1 text-xs">The order ID already exists but its contents have changed. The existing order is kept, and the changed order is not accepted.</dd></div>
                  <div><dt className="font-semibold text-[#191c1b]">File rows and orders</dt><dd className="mt-1 text-xs">A row represents a product in a sale. Rows sharing a source_order_id form one order, so one order may have several rows.</dd></div>
                  <div><dt className="font-semibold text-[#191c1b]">Accepted and rejected orders</dt><dd className="mt-1 text-xs">Accepted orders are newly saved. Rejected orders did not pass validation. Rejected and conflicted orders are counted separately.</dd></div>
                </dl>
              </div>
            )}
      </section>

      {uploading ? (
        <ImportProgressCard state={state} refresh={workflow.refresh} retryUpload={() => void workflow.retryUpload()} acknowledge={workflow.reset} focus />
      ) : summary && presentation && resultStyle ? (
        <section ref={resultRef} aria-labelledby="import-result-heading" className={`f04-result scroll-mt-24 ${resultStyle.className}`}>
          <div className="f04-result-header">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="f04-result-icon">
                <ResultIcon aria-hidden="true" className={`h-5 w-5 ${presentation.tone === 'processing' ? 'animate-spin motion-reduce:animate-none' : ''}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 ref={resultHeadingRef} id="import-result-heading" tabIndex={-1} aria-describedby={`import-result-message import-result-status import-result-meta${quickMeaning.length > 0 ? ' import-quick-meaning' : ''}`} className="f04-result-label rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1e3a2f]">Import Result</h2>
                  <span id="import-result-status" title={summary.status} className="f04-status-badge">{importStatusLabels[summary.status]}</span>
                </div>
                <p id="import-result-message" className="f04-result-message">{presentation.message}</p>
                <p className="mt-2 text-sm text-[#6d7974]">{summary.status === 'FAILED' ? "We couldn't finish processing this file." : summary.status === 'COMPLETED_WITH_ERRORS' ? 'Some records could not be imported. Review the details below.' : 'Your transaction data has been processed successfully.'}</p>
                {quickMeaning.length > 0 && <ul id="import-quick-meaning" aria-label="Quick result summary" className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium leading-5">
                  {quickMeaning.map(({ Icon: MeaningIcon, text, color }) => <li key={text} className={`f04-quick-item ${color}`}><MeaningIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />{text}</li>)}
                </ul>}
                <div id="import-result-meta" className="f04-result-meta">
                  <span className="inline-flex min-w-0 items-start gap-2"><FileText aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#707973]" /><span className="break-all">{summary.filename || 'File upload'}</span></span>
                  <span className="whitespace-nowrap text-xs">Batch ID <span className="ml-1 font-semibold tabular-nums text-[#191c1b]">#{summary.importBatchId}</span></span>
                </div>
                {summary.errorSummary && <p className="mt-2 break-words text-sm text-[#6d7974]">{summary.errorSummary}</p>}
              </div>
            </div>
          </div>

          <div className="border-t border-[#e7e2d8] px-5 py-5 sm:px-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold tracking-tight">Order Summary</h3>
              <p className="text-xs text-[#6d7974]">Total orders: <span className="font-semibold tabular-nums text-[#191c1b]">{summary.totalOrderCount.toLocaleString()}</span></p>
            </div>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'New orders saved', value: summary.acceptedOrderCount, hint: 'Passed import validation', Icon: CheckCircle2, appearance: summary.acceptedOrderCount > 0 ? metricStyles.accepted : metricStyles.neutral },
                { label: 'Duplicate orders', value: summary.duplicateOrderCount, hint: 'Already exists · skipped', Icon: Files, appearance: summary.duplicateOrderCount > 0 ? (duplicateOnly ? metricStyles.duplicatePrimary : metricStyles.duplicate) : metricStyles.neutral },
                { label: 'Rejected orders', value: summary.rejectedOrderCount, hint: 'Did not pass validation', Icon: AlertTriangle, appearance: summary.rejectedOrderCount > 0 ? metricStyles.rejected : metricStyles.neutral },
                { label: 'Conflict orders', value: summary.conflictOrderCount, hint: 'Existing ID, changed data', Icon: ShieldAlert, appearance: summary.conflictOrderCount > 0 ? metricStyles.warning : metricStyles.neutral }
              ].map(({ Icon: MetricIcon, ...item }) => (
                <div key={item.label} className={`f04-kpi ${item.appearance}`}>
                  <dt>
                    <span className="f04-kpi-icon"><MetricIcon aria-hidden="true" className="h-3.5 w-3.5" /></span>
                    {item.label}
                  </dt>
                  <dd>
                    <span className="f04-kpi-value">{item.value.toLocaleString()}</span>
                    <span className="f04-kpi-hint">{item.hint}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-5 text-[#6d7974]">Conflicting orders have an existing Order ID with different contents; existing data is not overwritten. Saved transactions marked Not Eligible are not import errors.</p>
          </div>

          <div className="border-t border-[#e7e2d8] bg-[#fafaf7] px-5 py-5 sm:px-6">
              <div><h3 className="text-sm font-semibold text-[#414d45]">File Row Summary</h3><p className="mt-1 text-xs text-[#6d7974]">Product rows, excluding the header.</p></div>
              <dl className="f04-row-stats">
                {[
                  { label: 'Total rows', value: summary.totalCount, surface: '' },
                  { label: 'Valid rows', value: summary.validCount, surface: summary.validCount > 0 ? 'f04-row-stat--valid' : '' },
                  { label: 'Rejected rows', value: summary.rejectedCount, surface: summary.rejectedCount > 0 ? 'f04-row-stat--rejected' : '' }
                ].map(item => <div key={item.label} className={`f04-row-stat ${item.surface}`}><dt>{item.label}</dt><dd>{item.value.toLocaleString()}</dd></div>)}
              </dl>
            <p className="mt-3 text-xs leading-5 text-[#6d7974]">One order can contain multiple product rows. Valid rows may include duplicate orders.</p>
          </div>

          {showErrors && <div className="f04-next">
            <div>
              <h3 className="text-sm font-semibold text-[#414d45]"><Info aria-hidden="true" className="h-4 w-4 text-[#637361]" />What should you do next?</h3>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-xs leading-5 text-[#6d7974]">
                <li>Review the affected rows.</li>
                <li>Correct the issues in your file.</li>
                <li>Import the corrected file again.</li>
              </ol>
            </div>
            <button type="button" onClick={reviewErrors} aria-controls="import-errors-section" className={`${secondaryButton} shrink-0`}><AlertTriangle aria-hidden="true" className="h-4 w-4" />Review errors</button>
          </div>}

          {showErrors && (
            <div ref={errorsRef} id="import-errors-section" className="f04-errors scroll-mt-24">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-6">
                <div><h3 ref={errorsHeadingRef} id="import-errors-heading" tabIndex={-1} className="flex items-center gap-2 rounded text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1e3a2f]"><AlertTriangle aria-hidden="true" className="h-4 w-4 text-orange-800" />Error Details</h3><p className="mt-1 text-xs leading-5 text-[#6d7974]">Rejected and conflicted file rows. Row numbers include the header.</p></div>
                <button type="button" disabled={errorsLoading} onClick={() => void loadErrors(summary.importBatchId, errorPage?.page ?? 0)} className={secondaryButton}>{errorsError ? 'Retry loading errors' : 'Refresh errors'}</button>
              </div>
              {errorsError && <div className="px-5 pb-4 sm:px-6"><ErrorNotice notice={errorsError} /></div>}
              <div aria-busy={errorsLoading} aria-labelledby="import-errors-heading" role="region">
                {errorsLoading ? (
                  <p role="status" className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-[#6d7974]"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading row details...</p>
                ) : errorPage && errorPage.content.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table aria-label={`File row errors for import batch ${summary.importBatchId}`} className="w-full min-w-[640px] text-left text-sm">
                      <thead className="border-y border-[#e7e2d8] bg-[#faf8f5] text-xs font-medium text-[#6d7974]">
                        <tr><th scope="col" className="px-5 py-3 sm:pl-6">File row</th><th scope="col" className="px-4 py-3">Order ID</th><th scope="col" className="px-4 py-3">Row status</th><th scope="col" className="px-4 py-3">Reason</th></tr>
                      </thead>
                      <tbody>
                        {errorPage.content.map(row => (
                          <tr key={row.rowNumber} className="border-b border-[#eee7df] last:border-b-0 hover:bg-[#fcfcfa]">
                            <td className="px-5 py-4 font-mono text-xs sm:pl-6">{row.rowNumber}</td>
                            <td className="max-w-52 break-words px-4 py-4 font-medium">{row.sourceOrderId || 'Not provided'}</td>
                            <td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${row.status === 'REJECTED' ? 'f04-error-badge' : 'f04-warning-badge'}`}><AlertTriangle aria-hidden="true" className="h-3 w-3 shrink-0" />{row.status}</span></td>
                            <td className="min-w-64 max-w-xl whitespace-pre-wrap break-words px-4 py-4 text-[#575e58]">{formatErrorDetails(row.errorDetails)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : errorPage ? <p className="px-5 pb-5 text-sm text-[#6d7974] sm:px-6">No row error details were returned for this page.</p> : null}
              </div>
              {errorPage && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7e2d8] px-5 py-3 text-xs text-[#6d7974] sm:px-6">
                  <span>{errorPage.content.length === 0 ? `${errorPage.totalElements.toLocaleString()} row errors` : `Showing ${errorPage.page * errorPage.pageSize + 1}–${errorPage.page * errorPage.pageSize + errorPage.content.length} of ${errorPage.totalElements.toLocaleString()} row errors`}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={errorsLoading || errorPage.page === 0} onClick={() => void loadErrors(summary.importBatchId, errorPage.page - 1)} className={secondaryButton}><ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />Previous</button>
                    <span className="px-1 tabular-nums">Page {errorPage.page + 1}</span>
                    <button type="button" disabled={errorsLoading || (errorPage.page + 1) * errorPage.pageSize >= errorPage.totalElements} onClick={() => void loadErrors(summary.importBatchId, errorPage.page + 1)} className={secondaryButton}>Next<ChevronRight aria-hidden="true" className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-4 border-t border-[#e7e2d8] bg-[#fcfdfb] px-5 py-4 sm:px-6">
            {duplicateOnly && <p className="min-w-0 flex-1 basis-64 text-xs leading-5 text-[#4c6660]">These orders already exist. No changes were made.</p>}
            <button type="button" onClick={importAnotherFile} disabled={uploading} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1e3a2f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#294d3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e3a2f] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"><Upload aria-hidden="true" className="h-4 w-4" />Import another file</button>
          </div>
        </section>
      ) : (
        <>
          <form ref={uploadRef} onSubmit={importFile} aria-labelledby="csv-upload-heading" className="f04-upload scroll-mt-24">
            <div className="border-b border-[#e7e2d8] px-5 py-4 sm:px-6"><h2 id="csv-upload-heading" className="font-semibold">Upload CSV or Excel</h2><p id="csv-file-help" className="mt-1 text-xs leading-5 text-[#6d7974]">Select one CSV, XLSX or XLS file, up to 5 MiB.</p></div>
            <div aria-busy={uploading} className="space-y-4 p-5 sm:p-6">
              <input ref={fileInputRef} id="f04-csv-file" type="file" accept=".csv,.xlsx,.xls" disabled={uploading} hidden aria-label="Choose transaction file"
                onChange={event => { const selected = event.currentTarget.files?.[0]; if (selected) selectFile(selected); event.currentTarget.value = ''; }} />
              {file ? (
                <div className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 ${validationError ? 'border-[#e8c8c4] bg-[#fffaf9]' : 'border-[#d6e2d8] bg-[#f7faf7]'}`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#1e3a2f]"><FileText aria-hidden="true" className="h-5 w-5" /></div>
                  <div id="selected-file-details" className="min-w-0 flex-1 basis-40"><p className="break-all text-sm font-semibold">{file.name}</p><p className="mt-1 text-xs text-[#6d7974]">{importFormatLabel(file.name)} ? {formatFileSize(file.size)}</p></div>
                  <div className="flex items-center gap-1">
                    <button ref={chooseFileRef} type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} aria-describedby="selected-file-details" className={secondaryButton}>Change file</button>
                    <button type="button" disabled={uploading} onClick={() => selectFile(null)} aria-label="Remove selected file" className="rounded-lg p-2 text-[#6d7974] hover:bg-white focus-visible:outline-2 focus-visible:outline-[#1e3a2f] disabled:opacity-40"><X aria-hidden="true" className="h-4 w-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-[#cbd7cd] bg-[#fcfdfa] p-5 sm:flex-row sm:items-center sm:p-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf3ed] text-[#1e3a2f]"><CloudUpload aria-hidden="true" className="h-5 w-5" /></div>
                  <div className="flex-1"><p className="text-sm font-semibold">Select a transaction file</p><p className="mt-1 text-xs leading-5 text-[#6d7974]">Choose a CSV or Excel file containing your store's sales orders.</p></div>
                  <button ref={chooseFileRef} type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} aria-describedby="csv-file-help" className={`${secondaryButton} w-full sm:w-auto`}>Choose file</button>
                </div>
              )}
              {validationError && <p role="alert" className="flex items-start gap-2 text-sm text-[#a12b25]"><AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{validationError}</p>}
              {state.error && <div ref={uploadErrorRef} className="scroll-mt-24"><ErrorNotice notice={{ title: 'Import request failed', message: state.error }} /></div>}
            </div>
            <div className="flex flex-col gap-3 border-t border-[#e7e2d8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs leading-5 text-[#6d7974]">Review the result to see which orders were saved.</p>
              <button type="submit" disabled={!file || !!validationError || uploading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1e3a2f] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#294d3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e3a2f] disabled:cursor-not-allowed disabled:opacity-50">
                <Upload aria-hidden="true" className="h-4 w-4" />{file && importFormat(file.name) === 'excel' ? 'Import Excel' : 'Import CSV'}
              </button>
            </div>
          </form>


        </>
      )}
    </div>
  );
}
