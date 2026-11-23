import { paginationItems, paginationRange } from '../../store/f02.tables';
export function F06Pages({ data, label, busy = false, onPage }: { data: {page:number;pageSize:number;totalElements:number;items:unknown[]}; label:string; busy?:boolean; onPage:(page:number)=>void }) {
  const pages=Math.ceil(data.totalElements/data.pageSize);
  if(pages<=1)return null;
  const range=paginationRange(data.page,data.totalElements,data.items.length,data.pageSize);
  return <div className="f02-pagination mt-4"><span className="f02-page-range">Showing {range.from}–{range.to} of {data.totalElements.toLocaleString('en-GB')} {label}</span><nav aria-label={label==='recommendations'?'Recommendation pages':label+' pages'}>
    <button type="button" className="f02-page-step" disabled={busy||data.page===0} onClick={()=>onPage(data.page-1)}>Previous {label}</button>
    <div className="f02-page-numbers">{paginationItems(data.page,pages).map((item,index)=>item==='ellipsis'?<span key={'gap'+index} aria-hidden="true">…</span>:<button type="button" key={item} aria-label={'Go to page '+(item+1)} aria-current={item===data.page?'page':undefined} disabled={busy} onClick={()=>onPage(item)}>{item+1}</button>)}</div>
    <span className="f02-page-position">Page {data.page+1} of {pages}</span><button type="button" className="f02-page-step" disabled={busy||data.page+1>=pages} onClick={()=>onPage(data.page+1)}>Next {label}</button>
  </nav></div>;
}
