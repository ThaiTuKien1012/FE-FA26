import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { paginationItems, paginationRange, type TableSort } from '../f02.tables';

export function F02TableHeader({ label, description = label, column, sort, onSort, numeric = false, disabled = false }: {
  label: string; description?: string; column: string; sort: TableSort | null; onSort: (by: string) => void;
  numeric?: boolean; disabled?: boolean;
}) {
  const selected = sort?.by === column;
  return <th scope="col" className={numeric ? 'f02-numeric' : ''} aria-sort={selected ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}>
    <div className="f02-column-heading"><button type="button" disabled={disabled} className="f02-sort-button" aria-label={'Sort by ' + description} title={description + ': Sort ' + (selected && sort.direction === 'asc' ? 'descending' : 'ascending')} onClick={() => onSort(column)}>
      <span className="f02-heading-label">{label}</span><span className="f02-sort-icon" aria-hidden="true">{selected ? sort.direction === 'asc' ? <ArrowUp /> : <ArrowDown /> : <ArrowUpDown />}</span>
    </button></div>
  </th>;
}

export function F02FilterSummary({ active, onClearAll }: { active: boolean; onClearAll: () => void }) {
  return <button type="button" className="f02-clear-all" disabled={!active} onClick={onClearAll}>Clear filters</button>;
}

export function F02TableFrame({ label, loading, hasData, children }: { label: string; loading: boolean; hasData: boolean; children: React.ReactNode }) {
  return <div className="f02-table-frame" aria-busy={loading}>
    <div className="f02-table-feedback" role="status" aria-live="polite">{loading && <><span className="f02-loading-dot" />{hasData ? `Updating ${label.toLowerCase()}…` : `Loading ${label.toLowerCase()}…`}</>}</div>
    <div role="region" aria-label={`${label === 'Batches' ? 'Inventory batch' : label === 'Products' ? 'Product' : 'Category'} table`} tabIndex={0} className="f02-table-scroll">{children}</div>
  </div>;
}

export function F02TableEmpty({ columns, message }: { columns: number; message?: string }) {
  return message ? <tr className="f02-table-empty"><td colSpan={columns}><p>{message}</p></td></tr> : null;
}

export function F02TablePagination({ label, page, totalPages, total, count, disabled, onPage }: { label: string; page: number; totalPages: number; total: number; count: number; disabled: boolean; onPage: (page: number) => void }) {
  const current = Math.max(0, Math.min(page, totalPages - 1)), range = paginationRange(current, total, count);
  return <div className="f02-pagination"><span className="f02-page-range" role="status">Showing {range.from}–{range.to} of {total} {label.toLowerCase()}</span>{totalPages > 1 && <nav aria-label={`${label === 'Categories' ? 'Category' : label === 'Products' ? 'Product' : 'Batch'} pagination`}>
    <button className="f02-page-step" disabled={disabled || current === 0} onClick={() => onPage(current - 1)}>Previous</button>
    <div className="f02-page-numbers">{paginationItems(current, totalPages).map((item, index) => item === 'ellipsis' ? <span key={`gap-${index}`} className="f02-page-ellipsis" aria-hidden="true">…</span> : <button key={item} aria-label={`Go to page ${item + 1}`} disabled={disabled} aria-current={current === item ? 'page' : undefined} onClick={() => onPage(item)}>{item + 1}</button>)}</div>
    <span className="f02-page-position" aria-live="polite">Page {current + 1} of {totalPages}</span>
    <button className="f02-page-step" disabled={disabled || current + 1 >= totalPages} onClick={() => onPage(current + 1)}>Next</button>
  </nav>}</div>;
}
