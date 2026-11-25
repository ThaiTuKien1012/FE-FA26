import { miningButton, miningDate } from '../f05.display';
import type { RequestView } from '../f05.types';
import { MiningStatusBadge } from './MiningStatusBadge';

/** System monitoring only. Request IDs identify analyses; execution Run IDs
 * remain separate in details. Preserve the order returned by the backend. */
export function SystemAnalysisList({ items, onSelect, selectedId = null, recent = false }: {
  items: RequestView[]; onSelect: (id: number) => void; selectedId?: number | null; recent?: boolean;
}) {
  const action = (item: RequestView) => <button type="button" className={miningButton + ' whitespace-nowrap'} aria-label={`View details for analysis #${item.requestId}`} aria-pressed={selectedId === item.requestId} onClick={() => onSelect(item.requestId)}>View Details</button>;
  return <>
    <table className="hidden w-full table-fixed text-left text-sm xl:table"><caption className="sr-only">{recent ? 'Recent analyses' : 'Analyses for the selected store, newest first'}</caption>
      <colgroup>{(recent ? [14, 14, 22, 28, 22] : [12, 12, 18, 15, 25, 18]).map((width, index) => <col key={index} style={{ width: width + '%' }} />)}</colgroup>
      <thead className="border-y border-[#E7E2D8] bg-[#FAF8F5] text-xs text-[#6D7974]"><tr>{['Analysis ID', 'Snapshot', 'Status', ...(!recent ? ['Submitted By'] : []), 'Submitted At', 'Action'].map(label => <th scope="col" className="px-3 py-3 font-medium" key={label}>{label}</th>)}</tr></thead>
      <tbody className="divide-y divide-[#E7E2D8]">{items.map(item => <tr key={item.requestId} className={selectedId === item.requestId ? 'bg-[#F3F8F4]' : ''}>
        <th scope="row" className="break-words px-3 py-4 font-semibold">#{item.requestId}</th><td className="break-words px-3 py-4">#{item.snapshotId}</td>
        <td className="px-3 py-4"><MiningStatusBadge friendly kind="request" status={item.status} /></td>
        {!recent && <td className="break-words px-3 py-4">User #{item.requestedBy}</td>}
        <td className="px-3 py-4 text-[#6D7974]"><time dateTime={item.createdAt}>{miningDate(item.createdAt, false)}</time></td><td className="px-3 py-4">{action(item)}</td>
      </tr>)}</tbody>
    </table>
    <ul aria-label={recent ? 'Recent analysis cards' : 'Analysis history cards'} className="divide-y divide-[#E7E2D8] xl:hidden">{items.map(item => <li key={item.requestId} className={'p-4 ' + (selectedId === item.requestId ? 'bg-[#F3F8F4]' : '')}>
      <div className="flex flex-wrap items-start justify-between gap-3"><p className="font-semibold">Analysis #{item.requestId}</p><MiningStatusBadge friendly kind="request" status={item.status} /></div>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-[#6D7974]">Snapshot</dt><dd>#{item.snapshotId}</dd></div>{!recent && <div><dt className="text-xs text-[#6D7974]">Submitted By</dt><dd>User #{item.requestedBy}</dd></div>}<div><dt className="text-xs text-[#6D7974]">Submitted At</dt><dd><time dateTime={item.createdAt}>{miningDate(item.createdAt, false)}</time></dd></div></dl>
      <div className="mt-4">{action(item)}</div>
    </li>)}</ul>
  </>;
}
