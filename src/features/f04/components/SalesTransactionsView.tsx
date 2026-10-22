import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, ListFilter, Loader2, ReceiptText, RefreshCw, Undo2, X, XCircle } from 'lucide-react';
import { F04ApiError, f04Api } from '../f04.api';
import type { F04Page, TransactionFilters, TransactionStatus, TransactionView } from '../f04.types';
import './SalesTransactionsView.css';

const PAGE_SIZE = 20;
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const moneyFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE });
const statusStyles = {
  COMPLETED: { label: 'Completed', tone: 'success', Icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', tone: 'neutral', Icon: XCircle },
  REFUNDED: { label: 'Refunded', tone: 'warning', Icon: Undo2 },
  PARTIAL_REFUND: { label: 'Partial Refund', tone: 'info', Icon: CircleDashed }
};

interface FilterSelection {
  status: TransactionStatus | '';
  fromDate: string;
  toDate: string;
}

interface TransactionsQuery {
  selection: FilterSelection;
  filters: TransactionFilters;
  page: number;
  revision: number;
}

const EMPTY_SELECTION: FilterSelection = { status: '', fromDate: '', toDate: '' };

// Construct a local calendar date explicitly: parsing YYYY-MM-DD alone would use UTC.
function localDayInstant(value: string, endOfDay: boolean): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Choose a valid date.');
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  if (year < 1 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error('Choose a valid calendar date.');
  }
  return date.toISOString();
}

function toApiFilters(selection: FilterSelection): TransactionFilters {
  const filters: TransactionFilters = {};
  if (selection.status) filters.status = selection.status;
  if (selection.fromDate) filters.from = localDayInstant(selection.fromDate, false);
  if (selection.toDate) filters.to = localDayInstant(selection.toDate, true);
  if (filters.from && filters.to && new Date(filters.from).getTime() > new Date(filters.to).getTime()) {
    throw new Error('From Date must be on or before To Date.');
  }
  return filters;
}

function formatMoney(value: number) { return moneyFormatter.format(value); }
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function requestErrorMessage(error: unknown): string {
  if (!(error instanceof F04ApiError)) return error instanceof Error ? error.message : 'The request could not be completed. Please try again.';
  if (error.status === null) return 'Connection error. Check your connection and try again.';
  const messages: Record<number, string> = {
    401: 'Your session is missing or has expired. Please sign in again.',
    403: 'Access denied. Use a Store Admin or Merchandiser account assigned to this store.',
    404: 'Transaction not found. It may no longer be available to your store.'
  };
  return `HTTP ${error.status} · ${messages[error.status] || error.message}`;
}

function StatusBadge({ status }: { status: TransactionStatus }) {
  const { label, tone, Icon } = statusStyles[status];
  return <span className={`f04s-badge f04s-tone--${tone}`} title={status}><Icon size={14} aria-hidden="true" />{label}</span>;
}

function EligibilityBadge({ eligible }: { eligible: boolean }) {
  return <span className={`f04s-badge f04s-tone--${eligible ? 'success' : 'neutral'}`}>
    {eligible && <CheckCircle2 size={14} aria-hidden="true" />}{eligible ? 'Eligible' : 'Not Eligible'}
  </span>;
}

function Loading({ label }: { label: string }) {
  return <div className="f04s-empty" role="status"><Loader2 className="animate-spin motion-reduce:animate-none" size={24} aria-hidden="true" /><p>{label}</p></div>;
}

function RequestError({ message, retry }: { message: string; retry: () => void }) {
  return <div className="f04s-request-error f04s-tone--danger" role="alert"><AlertCircle size={18} aria-hidden="true" /><div><p>{message}</p><button type="button" className="f04s-text-button" onClick={retry}>Try again</button></div></div>;
}

function useTransactions() {
  const [query, setQuery] = useState<TransactionsQuery>({ selection: EMPTY_SELECTION, filters: {}, page: 0, revision: 0 });
  const [result, setResult] = useState<{ query: TransactionsQuery; data?: F04Page<TransactionView>; error?: string } | null>(null);

  useEffect(() => {
    let active = true;
    void f04Api.listTransactions({ ...query.filters, page: query.page, pageSize: PAGE_SIZE }).then(data => {
      if (!active) return;
      const lastPage = Math.max(0, Math.ceil(data.totalElements / data.pageSize) - 1);
      if (query.page > lastPage) {
        setQuery(current => current === query ? { ...current, page: lastPage } : current);
        return;
      }
      setResult({ query, data });
    }).catch(error => {
      if (active) setResult({ query, error: requestErrorMessage(error) });
    });
    return () => { active = false; };
  }, [query]);

  // Hide old results immediately, even before the next request effect runs.
  const current = result?.query === query ? result : null;
  return {
    query, data: current?.data, error: current?.error, loading: !current,
    refresh: () => setQuery(previous => ({ ...previous, revision: previous.revision + 1 })),
    setPage: (page: number) => setQuery(previous => ({ ...previous, page })),
    apply: (selection: FilterSelection, filters: TransactionFilters) => setQuery(previous => ({ selection, filters, page: 0, revision: previous.revision + 1 }))
  };
}

function Pagination({ data, onPage }: { data: F04Page<TransactionView>; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(data.totalElements / data.pageSize));
  const first = data.totalElements === 0 ? 0 : data.page * data.pageSize + 1;
  const last = Math.min((data.page + 1) * data.pageSize, data.totalElements);
  return <nav className="f04s-pagination" aria-label="Sales transactions pagination">
    <p>{first.toLocaleString()}–{last.toLocaleString()} of {data.totalElements.toLocaleString()} transactions</p>
    <div><span>Page {data.page + 1} of {pages}</span>
      <button type="button" className="f04s-icon-button" aria-label="Previous page" disabled={data.page === 0} onClick={() => onPage(data.page - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
      <button type="button" className="f04s-icon-button" aria-label="Next page" disabled={data.page >= pages - 1} onClick={() => onPage(data.page + 1)}><ChevronRight size={18} aria-hidden="true" /></button>
    </div>
  </nav>;
}

function TransactionDetails({ transactionId, opener, onClose }: { transactionId: number; opener: HTMLButtonElement | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ revision: number; data?: TransactionView; error?: string } | null>(null);
  const current = result?.revision === revision ? result : null;
  const transaction = current?.data;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal(); // Native dialog keeps keyboard focus inside and makes the page beneath inert.
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [opener]);

  useEffect(() => {
    let active = true;
    void f04Api.getTransaction(transactionId).then(data => {
      if (active) setResult({ revision, data });
    }).catch(error => {
      if (active) setResult({ revision, error: requestErrorMessage(error) });
    });
    return () => { active = false; };
  }, [transactionId, revision]);

  return createPortal(<dialog ref={dialogRef} className="f04-sales f04s-dialog" aria-labelledby="f04s-details-title" aria-describedby="f04s-details-description" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="f04s-dialog-header"><div><p className="f04s-eyebrow">TRANSACTION #{transactionId}</p><h2 id="f04s-details-title">Transaction details</h2><p id="f04s-details-description">Review the recorded sale and its product lines.</p></div>
      <button ref={closeRef} type="button" className="f04s-icon-button" aria-label="Close transaction details" onClick={onClose}><X size={20} aria-hidden="true" /></button>
    </header>
    <div className="f04s-dialog-body">
      {!current ? <Loading label="Loading transaction details..." /> : current.error ? <RequestError message={current.error} retry={() => setRevision(value => value + 1)} /> : transaction && <>
        <section className="f04s-overview" aria-label="Transaction information">
          <div className="f04s-overview-heading"><div><p className="f04s-field-label">Source order ID</p><h3>{transaction.sourceOrderId}</h3><StatusBadge status={transaction.status} /></div><div className="f04s-total"><p className="f04s-field-label">Total amount</p><p>{formatMoney(transaction.totalAmount)}</p></div></div>
          <dl className="f04s-metadata">
            <div><dt>Transaction ID</dt><dd>#{transaction.transactionId}</dd></div>
            <div><dt>Source system</dt><dd>{transaction.sourceSystem}</dd></div>
            <div><dt>Occurred at</dt><dd><time dateTime={transaction.occurredAt}>{formatDate(transaction.occurredAt)}</time><span className="f04s-timezone">{TIME_ZONE} (browser)</span></dd></div>
            <div><dt>F03 Eligible</dt><dd><EligibilityBadge eligible={transaction.f03Eligible} /></dd></div>
          </dl>
          <p className="f04s-eligibility-note">Eligible transactions can be used as a source for F03 utility processing.</p>
        </section>
        <section className="f04s-products" aria-labelledby="f04s-products-title"><div className="f04s-section-heading"><h3 id="f04s-products-title">Products</h3><p>Prices and costs reflect recorded transaction values.</p></div>
          {transaction.items.length === 0 ? <div className="f04s-empty" role="status"><ReceiptText size={26} aria-hidden="true" /><p>No product lines are available for this transaction.</p></div> : <div className="f04s-table-scroll" tabIndex={0} role="region" aria-label="Transaction product lines; scroll horizontally to see all columns">
            <table className="f04s-table f04s-products-table"><thead><tr><th scope="col">SKU</th><th scope="col">Product name</th><th scope="col" className="f04s-number">Quantity</th><th scope="col" className="f04s-number">Unit price</th><th scope="col" className="f04s-number">Unit cost</th><th scope="col" className="f04s-number">Line total</th></tr></thead>
              <tbody>{transaction.items.map(item => <tr key={item.transactionItemId}><th scope="row" className="f04s-sku">{item.sku}</th><td className="f04s-product-name">{item.productName}</td><td className="f04s-number">{item.quantity.toLocaleString()}</td><td className="f04s-number f04s-money">{formatMoney(item.unitPrice)}</td><td className="f04s-number f04s-money">{formatMoney(item.unitCost)}</td><td className="f04s-number f04s-money">{formatMoney(item.quantity * item.unitPrice)}</td></tr>)}</tbody>
            </table>
          </div>}
        </section>
      </>}
    </div>
  </dialog>, document.body);
}

export function SalesTransactionsView() {
  const [draft, setDraft] = useState<FilterSelection>(EMPTY_SELECTION);
  const [filterError, setFilterError] = useState<string | null>(null);
  const { query, data, error, loading, refresh, setPage, apply } = useTransactions();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const listHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const closeDetails = useCallback(() => setSelectedId(null), []);
  const hasFilters = !!(query.filters.status || query.filters.from || query.filters.to);
  const appliedStatus = query.selection.status ? statusStyles[query.selection.status].label : 'All statuses';

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const filters = toApiFilters(draft);
      setFilterError(null);
      apply({ ...draft }, filters);
    } catch (error) {
      setFilterError(error instanceof Error ? error.message : 'Check your date range.');
    }
  };

  const clearFilters = () => {
    setDraft({ ...EMPTY_SELECTION });
    setFilterError(null);
    apply({ ...EMPTY_SELECTION }, {});
  };

  return <div className="f04-sales f04s-page">
    <header className="f04s-page-header"><div><h1>Sales Transactions</h1><p>View and review your store's recorded sales transactions.</p></div><button type="button" className="f04s-button" disabled={loading} onClick={refresh}><RefreshCw size={16} aria-hidden="true" />Refresh</button></header>
    <form className="f04s-card f04s-filters" aria-labelledby="f04s-filters-title" onSubmit={applyFilters}>
      <div className="f04s-filter-heading"><ListFilter size={17} aria-hidden="true" /><h2 id="f04s-filters-title">Filters</h2></div>
      <div className="f04s-filter-fields">
        <label htmlFor="f04s-status">Status<select id="f04s-status" value={draft.status} onChange={event => setDraft(previous => ({ ...previous, status: event.target.value as FilterSelection['status'] }))}><option value="">All Statuses</option>{Object.entries(statusStyles).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label htmlFor="f04s-from">From Date<input id="f04s-from" type="date" min="0001-01-01" max="9999-12-31" value={draft.fromDate} aria-invalid={!!filterError} aria-describedby={filterError ? 'f04s-filter-error f04s-timezone-help' : 'f04s-timezone-help'} onChange={event => setDraft(previous => ({ ...previous, fromDate: event.target.value }))} /></label>
        <label htmlFor="f04s-to">To Date<input id="f04s-to" type="date" min="0001-01-01" max="9999-12-31" value={draft.toDate} aria-invalid={!!filterError} aria-describedby={filterError ? 'f04s-filter-error f04s-timezone-help' : 'f04s-timezone-help'} onChange={event => setDraft(previous => ({ ...previous, toDate: event.target.value }))} /></label>
        <div className="f04s-filter-actions"><button type="submit" className="f04s-button f04s-primary-button">Apply Filters</button><button type="button" className="f04s-button" onClick={clearFilters}>Clear Filters</button></div>
      </div>
      <p id="f04s-timezone-help" className="f04s-filter-help">Browser time zone: <strong>{TIME_ZONE}</strong>. Date filters include the full local day; displayed times use this zone.</p>
      {filterError && <p id="f04s-filter-error" className="f04s-validation-error" role="alert"><AlertCircle size={16} aria-hidden="true" />{filterError}</p>}
    </form>
    <section className="f04s-card" aria-labelledby="f04s-list-title">
      <div className="f04s-card-heading"><span className="f04s-section-icon"><ReceiptText size={20} aria-hidden="true" /></span><div><h2 ref={listHeadingRef} tabIndex={-1} id="f04s-list-title">Recorded transactions</h2><p>{appliedStatus} · {hasFilters ? `${query.selection.fromDate || 'Any start date'} → ${query.selection.toDate || 'Any end date'}` : 'All dates'} · Newest first</p></div></div>
      <p className="f04s-list-help">Eligible transactions can be used as a source for F03 utility processing.</p>
      {loading ? <Loading label="Loading sales transactions..." /> : error ? <RequestError message={error} retry={refresh} /> : data && <>
        {data.content.length === 0 ? <div className="f04s-empty" role="status"><ReceiptText size={32} aria-hidden="true" /><h3>{hasFilters ? 'No matching transactions' : 'No transactions yet'}</h3><p>{hasFilters ? 'Try another status or date range, or clear your filters.' : "Recorded sales for your store will appear here."}</p>{hasFilters && <button type="button" className="f04s-button" onClick={clearFilters}>Clear Filters</button>}</div> : <div className="f04s-table-scroll" tabIndex={0} role="region" aria-label="Sales transactions; scroll horizontally to see all columns">
          <table className="f04s-table f04s-transactions-table"><thead><tr><th scope="col">Transaction ID</th><th scope="col">Source order ID</th><th scope="col">Occurred at</th><th scope="col">Source system</th><th scope="col">Transaction status</th><th scope="col" className="f04s-number">Total amount</th><th scope="col">F03 Eligible</th><th scope="col">Action</th></tr></thead>
            <tbody>{data.content.map(transaction => <tr key={transaction.transactionId}><th scope="row">#{transaction.transactionId}</th><td className="f04s-order-id">{transaction.sourceOrderId}</td><td className="f04s-date"><time dateTime={transaction.occurredAt}>{formatDate(transaction.occurredAt)}</time></td><td className="f04s-source">{transaction.sourceSystem}</td><td><StatusBadge status={transaction.status} /></td><td className="f04s-number f04s-money">{formatMoney(transaction.totalAmount)}</td><td><EligibilityBadge eligible={transaction.f03Eligible} /></td><td><button type="button" className="f04s-text-button" aria-haspopup="dialog" aria-label={`View details for transaction ${transaction.transactionId}`} onClick={event => { openerRef.current = event.currentTarget; setSelectedId(transaction.transactionId); }}>View Details</button></td></tr>)}</tbody>
          </table>
        </div>}
        <Pagination data={data} onPage={page => { listHeadingRef.current?.focus({ preventScroll: true }); setPage(page); }} />
      </>}
    </section>
    {selectedId !== null && <TransactionDetails key={selectedId} transactionId={selectedId} opener={openerRef.current} onClose={closeDetails} />}
  </div>;
}
