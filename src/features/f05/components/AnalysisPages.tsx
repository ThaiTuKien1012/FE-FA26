import { paginationItems } from '../../store/f02.tables';
import type { Page } from '../f05.types';

export function AnalysisPages({ page, label, busy = false, onPage }: { page: Page<unknown>; label: string; busy?: boolean; onPage: (page: number) => void }) {
  const pages = Math.ceil(page.totalElements / page.pageSize);
  if (pages <= 1) return null;
  const range = {from:page.items.length?page.page*page.pageSize+1:0,to:page.items.length?Math.min(page.totalElements,page.page*page.pageSize+page.items.length):0};
  const items = label === 'Snapshot' ? 'snapshots' : label === 'Analysis History' ? 'analyses' : 'product combinations';
  return <div className="f02-pagination mt-4"><span className="f02-page-range" role="status">Showing {range.from}–{range.to} of {page.totalElements.toLocaleString('en-GB')} {items}</span><nav aria-label={label + ' pages'}>
    <button type="button" className="f02-page-step" disabled={busy || page.page === 0} onClick={() => onPage(page.page - 1)}>Previous</button>
    <div className="f02-page-numbers">{paginationItems(page.page, pages).map((item, i) => item === 'ellipsis' ? <span key={'gap-' + i} className="f02-page-ellipsis" aria-hidden="true">…</span> : <button type="button" key={item} aria-label={'Go to page ' + (item + 1)} disabled={busy} aria-current={item === page.page ? 'page' : undefined} onClick={() => onPage(item)}>{item + 1}</button>)}</div>
    <span className="f02-page-position">Page {page.page + 1} of {pages}</span>
    <button type="button" className="f02-page-step" disabled={busy || page.page + 1 >= pages} onClick={() => onPage(page.page + 1)}>Next</button>
  </nav></div>;
}
