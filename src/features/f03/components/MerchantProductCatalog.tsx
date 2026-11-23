import { useEffect, useRef, useState } from 'react';
import { ProductTableHeader } from '../../../components/common/ProductTableHeader';
import { storeApi, type F02Category, type F02Product, type F02ProductPage } from '../../store/store.api';
import { nextTableSort } from '../../store/f02.tables';
import { Button, errorMessage, field, Notice, Pager, secondary, Section } from './F03Shared';

type CatalogQuery = { search: string; categoryId: string; status: string; sortBy: string; sortDirection: 'asc' | 'desc'; page: number };

export function MerchantProductCatalog({ remember, onView }: { remember: (products: F02Product[]) => void; onView: (product: F02Product, opener: HTMLButtonElement) => void }) {
  const [query, setQuery] = useState<CatalogQuery>({ search: '', categoryId: '', status: '', sortBy: 'name', sortDirection: 'asc', page: 0 });
  const [result, setResult] = useState<F02ProductPage | null>(null), [categories, setCategories] = useState<F02Category[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [categoryError, setCategoryError] = useState('');
  const [revision, setRevision] = useState(0), [categoryRevision, setCategoryRevision] = useState(0);
  const rememberRef = useRef(remember); rememberRef.current = remember;
  useEffect(() => {
    let live = true; setCategoryError('');
    void storeApi.listCategories().then(value => { if (live) setCategories(value); }).catch(e => { if (live) setCategoryError(errorMessage(e, 'Unable to load categories.')); });
    return () => { live = false; };
  }, [categoryRevision]);
  useEffect(() => {
    let live = true; setLoading(true); setError('');
    const timer = window.setTimeout(() => {
      void storeApi.listProducts({ ...query, search: query.search.trim(), pageSize: 10 }).then(value => {
        if (!live) return;
        const last = Math.max(0, Math.ceil(value.totalElements / value.pageSize) - 1);
        if (query.page > last) { setQuery(current => ({ ...current, page: last })); return; }
        setResult(value); rememberRef.current(value.content);
      }).catch(e => { if (live) { setResult(null); setError(errorMessage(e, 'Unable to load products.')); } }).finally(() => { if (live) setLoading(false); });
    }, query.search ? 250 : 0);
    return () => { live = false; window.clearTimeout(timer); };
  }, [query, revision]);
  const update = (next: Partial<CatalogQuery>) => setQuery(current => ({ ...current, ...next, page: 0 }));
  const sort = (by: string) => { const next = nextTableSort({ by: query.sortBy, direction: query.sortDirection }, by); update({ sortBy: next.by, sortDirection: next.direction }); };
  const header = (label: string, by: string) => <ProductTableHeader label={label} column={by} sort={{ by: query.sortBy, direction: query.sortDirection }} onSort={sort} disabled={loading} />;
  const view = (product: F02Product) => <Button disabled={loading} className={secondary + ' f03-product-view'} aria-label={'View Details for ' + product.name + ' (' + product.sku + ')'} onClick={event => onView(product, event.currentTarget)}>View Details</Button>;
  const status = (product: F02Product) => <span className={'inline-flex rounded-full px-2 py-1 text-xs font-semibold ' + (product.status === 'ACTIVE' ? 'bg-[#eef5f0] text-[#356b54]' : 'bg-[#f4f1ec] text-[#6d7974]')}>{product.status === 'ACTIVE' ? 'Active' : 'Inactive'}</span>;
  return <Section title="Products" action={<Button disabled={loading} className={secondary} onClick={() => setRevision(value => value + 1)}>Refresh Products</Button>}>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <label className="text-sm font-medium">Search Name/SKU<input aria-label="Search Name or SKU" type="search" className={field} placeholder="Product name or SKU" value={query.search} onChange={event => update({ search: event.target.value })} /></label>
      <label className="text-sm font-medium">Category<select aria-label="Filter Category" className={field} disabled={Boolean(categoryError)} value={query.categoryId} onChange={event => update({ categoryId: event.target.value })}><option value="">All categories</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}{category.status === 'INACTIVE' ? ' (Inactive)' : ''}</option>)}</select></label>
      <label className="text-sm font-medium">Status<select aria-label="Filter Status" className={field} value={query.status} onChange={event => update({ status: event.target.value })}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
    </div>
    {categoryError && <div className="mt-3 space-y-2"><Notice error={categoryError} /><Button className={secondary} onClick={() => setCategoryRevision(value => value + 1)}>Retry Categories</Button></div>}
    <Notice error={error} />{error && <Button className={secondary + ' mt-3'} onClick={() => setRevision(value => value + 1)}>Retry Products</Button>}
    <p role="status" className="mb-2 mt-4 min-h-5 text-xs text-[#6d7974]">{loading ? 'Loading products…' : result ? `${result.totalElements.toLocaleString('en-GB')} products` : ''}</p>
    {result && <div aria-busy={loading} className={loading ? 'pointer-events-none opacity-60' : ''}>
      {result.content.length ? <>
        <div className="hidden rounded-xl border border-[#e7e2d8] xl:block"><table aria-label="Product priorities catalog" className="f03-table f03-data-table f03-catalog-table"><colgroup>{[31, 17, 10, 14, 12, 16].map((width, index) => <col key={index} style={{ width: width + '%' }} />)}</colgroup><thead><tr>{header('Product name', 'name')}{header('Category', 'category')}{header('Stock', 'stockQuantity')}{header('Expiry tracking', 'requiresExpiry')}{header('Status', 'status')}<th scope="col">Actions</th></tr></thead><tbody>{result.content.map(product => <tr key={product.id}><th scope="row"><span className="block font-semibold">{product.name}</span><small className="mt-1 block font-normal text-[#6d7974]">{product.sku}</small></th><td>{product.category?.name ?? 'Uncategorized'}</td><td>{product.stockQuantity.toLocaleString('en-GB')}</td><td>{product.requiresExpiry ? 'Tracked' : 'Not tracked'}</td><td>{status(product)}</td><td>{view(product)}</td></tr>)}</tbody></table></div>
        <ul aria-label="Product priority cards" className="grid gap-3 xl:hidden">{result.content.map(product => <li key={product.id} className="min-w-0 rounded-xl border border-[#e7e2d8] p-4 text-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0 break-words"><h3 className="font-semibold">{product.name}</h3><p className="mt-1 text-xs text-[#6d7974]">{product.sku}</p></div>{status(product)}</div><dl className="my-4 grid grid-cols-2 gap-3">{[['Category', product.category?.name ?? 'Uncategorized'], ['Stock', product.stockQuantity.toLocaleString('en-GB')], ['Expiry tracking', product.requiresExpiry ? 'Tracked' : 'Not tracked']].map(([label, value]) => <div key={label} className="min-w-0 break-words"><dt className="text-xs text-[#6d7974]">{label}</dt><dd className="mt-1">{value}</dd></div>)}</dl>{view(product)}</li>)}</ul>
      </> : <p className="rounded-xl bg-[#faf8f5] px-4 py-6 text-sm text-[#6d7974]">No products match these filters.</p>}
      <Pager hideSingle page={result} onChange={page => setQuery(current => ({ ...current, page }))} label="products" busy={loading} />
    </div>}
  </Section>;
}
