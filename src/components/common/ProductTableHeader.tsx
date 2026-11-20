import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { TableSort } from '../../features/store/f02.tables';

/** Shared only by the F02 and F03 product catalogs. */
export function ProductTableHeader({ label, description = label, column, sort, onSort, disabled = false }: {
  label: string; description?: string; column: string;
  sort: TableSort; onSort: (column: string) => void; disabled?: boolean;
}) {
  const selected = sort.by === column;
  const Icon = selected ? sort.direction === 'asc' ? ArrowUp : ArrowDown : ArrowUpDown;
  return <th scope="col" aria-sort={selected ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}>
    <div className="paspm-product-heading"><button type="button" className="paspm-product-sort" data-active={selected} disabled={disabled} aria-label={'Sort by ' + description} title={description + ': Sort ' + (selected && sort.direction === 'asc' ? 'descending' : 'ascending')} onClick={() => onSort(column)}><span>{label}</span><Icon aria-hidden="true" /></button></div>
  </th>;
}
