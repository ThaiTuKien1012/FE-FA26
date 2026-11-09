import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { f03Api, type F03PushPage, type F03Scores } from '../f03.api';
import { storeApi, type F02Product, type F02ProductPage } from '../../store/store.api';
import { validScore } from '../f03.validation';
import { Button, errorMessage, field, Metrics, Notice, Pager, primary, readable, secondary, Section, Technical, Warnings } from './F03Shared';

export function ProductScores({ readOnly, invalidate, remember }: { readOnly: boolean; invalidate: (reason: string) => void; remember: (products: F02Product[]) => void }) {
  const [products, setProducts] = useState<F02ProductPage | null>(null);
  const [page, setPage] = useState(0);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<F02Product | null>(null);
  const [scores, setScores] = useState<F03Scores | null>(null);
  const [draft, setDraft] = useState({ stockPriorityScore: '', seasonalPriorityScore: '' });
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const selection = useRef(0);
  useEffect(() => {
    let live = true; setLoading(true); setProducts(null); setError('');
    storeApi.listProducts({ search, page, pageSize: 20 }).then(result => { if (live) { setProducts(result); remember(result.content); } }).catch(e => { if (live) setError(errorMessage(e, 'Unable to load products.')); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [page, search]);
  const choose = async (product: F02Product | null) => {
    if (busy.current) return;
    const ticket = ++selection.current;
    setSelected(product); setScores(null); setDirty(false); setNotice(''); setError('');
    if (!product) return;
    try {
      const result = await f03Api.getScores(product.id);
      if (ticket !== selection.current) return;
      setScores(result); setDraft({ stockPriorityScore: result.stockPriorityScore === null ? '' : String(result.stockPriorityScore), seasonalPriorityScore: result.seasonalPriorityScore === null ? '' : String(result.seasonalPriorityScore) });
    } catch (e) { if (ticket === selection.current) setError(errorMessage(e, 'Unable to load scores.')); }
  };
  const valid = Object.values(draft).every(value => value === '' || validScore(value)) && Object.values(draft).some(value => value !== '');
  const save = async () => {
    if (readOnly || busy.current || !valid || !selected || !scores) return;
    busy.current = true; setSaving(true); setError(''); setNotice('');
    invalidate('Product Scores were submitted. Calculate a new Preview before creating a snapshot.');
    try {
      const body = Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== '').map(([key, value]) => [key, Number(value)]));
      const result = await f03Api.updateScores(selected.id, body);
      setScores(result); setDirty(false); setNotice('Product scores saved. Calculated scores below are from the backend.');
    } catch (e) { setError(errorMessage(e, 'Could not save product scores.')); }
    finally { invalidate('Product Scores submission finished. Calculate a new Preview using saved scores.'); busy.current = false; setSaving(false); }
  };
  return <div className="space-y-5"><Notice error={error} notice={notice} />
    {readOnly && <p className="text-sm font-medium text-[#356b54]">Store Admin · Read-only scores</p>}
    <Section title={readOnly ? 'Products' : 'Select Product'} subtitle={readOnly ? 'Choose a product to view its latest calculated scores.' : 'Browse the Store catalog by page. The selected product stays selected when you browse another page.'}>
      <form className="mb-4 flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); setPage(0); setSearch(searchDraft.trim()); }}><label className="min-w-0 flex-1 text-sm font-medium">Search Products<input aria-label="Search Products" className={field} value={searchDraft} onChange={e => setSearchDraft(e.target.value)} placeholder="Product name or SKU" /></label><Button type="submit" disabled={loading || saving} className={secondary}>Search Catalog</Button></form>
      {readOnly ? <ul aria-label="Store products" className="max-h-72 divide-y divide-[#e7e2d8] overflow-y-auto rounded-xl border border-[#e7e2d8]">{products?.content.map(product => <li key={product.id}><button type="button" disabled={loading} aria-label={`View scores for ${product.name}`} aria-pressed={selected?.id === product.id} onClick={() => void choose(product)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-[#faf8f5] aria-pressed:bg-[#edf5f0] focus-visible:outline-2 focus-visible:outline-[#356b54]"><span className="min-w-0"><span className="block break-words font-semibold">{product.name}</span><span className="mt-1 block text-xs text-[#6d7974]">{product.sku}</span></span><span className="shrink-0 text-xs text-[#356b54]">View scores</span></button></li>)}</ul> : <label className="block max-w-2xl text-sm font-medium">Product<select aria-label="Product" disabled={loading || saving} className={field} value={selected?.id ?? ''} onChange={e => void choose(products?.content.find(p => p.id === Number(e.target.value)) ?? null)}><option value="">Choose a product</option>{selected && !products?.content.some(p => p.id === selected.id) && <option value={selected.id}>{selected.name} · {selected.sku}</option>}{products?.content.map(product => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select></label>}
      {loading && <p role="status" className="mt-3 text-sm">Loading products…</p>}
      {products && <Pager page={products} onChange={setPage} label="products" busy={loading || saving} />}
      {!loading && products?.totalElements === 0 && <p className="mt-3 text-sm text-[#6d7974]">No products are available in this Store.</p>}
      {selected && <p className="mt-4 text-sm font-semibold">Selected: {selected.name} · Product #{selected.id}</p>}
      {error && <Button className={`${secondary} mt-3`} onClick={() => selected ? void choose(selected) : window.location.reload()}>Retry Products / Scores</Button>}
    </Section>
    {selected && !scores && !error && <p role="status">Loading product scores…</p>}
    {scores && <>
      {!readOnly && <Section title="Manual Scores" subtitle="Assign a priority from 0 (lowest) to 1 (highest), with up to 6 decimal places. Stock Priority is a score, not an inventory quantity.">
        <form onSubmit={e => { e.preventDefault(); void save(); }}><fieldset disabled={readOnly || saving} className="grid gap-4 sm:grid-cols-2">{(['stockPriorityScore', 'seasonalPriorityScore'] as const).map(key => <label key={key} className="text-sm font-medium">{key === 'stockPriorityScore' ? 'Stock Priority Score' : 'Seasonal Priority Score'}<input aria-label={key === 'stockPriorityScore' ? 'Stock Priority Score' : 'Seasonal Priority Score'} type="number" min="0" max="1" step="0.000001" className={field} value={draft[key]} onChange={e => { setDraft({ ...draft, [key]: e.target.value }); setDirty(true); setNotice(''); invalidate('Product Score inputs changed. Save your scores and calculate a new Preview.'); }} /></label>)}</fieldset>
          <p className="mt-3 text-xs text-[#6d7974]">Blank fields are left unchanged; this API cannot clear a saved score.</p>
          {!valid && <p role="alert" className="mt-3 text-sm text-amber-900">Enter at least one score between 0 and 1, with at most 6 decimal places.</p>}
          {!readOnly && <Button type="submit" disabled={saving || !valid} className={`${primary} mt-4`}>{saving ? 'Saving…' : 'Save Product Scores'}</Button>}
        </form>
      </Section>}
      <Section title="Calculated Scores" subtitle="Read-only results calculated by the backend from saved settings and scores.">
        <Button className={`${secondary} mb-4`} disabled={saving} onClick={() => void choose(selected)}>Refresh Scores</Button>
        {dirty && <p role="status" className="mb-4 text-sm text-amber-900">Unsaved scores. These calculations still reflect the last saved scores.</p>}
        <Metrics values={[
          ['Expiry Score', scores.expiryScore], ['Utility Weight', scores.weightValue],
          ['Calculation Status', scores.ready ? 'Ready' : 'Not Ready'], ['Expiry Status', readable(scores.expiryStatus)],
          ['Analysis Date', scores.asOfDate], ...(!readOnly ? [['Configuration Version', scores.configVersion] as [string, number]] : [])
        ]} />
        <p className="mt-4 text-sm text-[#6d7974]">Expiry Score uses this product’s expiry push threshold ({scores.expiryPushDays} days), inventory batches and the Analysis Date returned above. Preview can use a different Analysis Date.</p>
        <Warnings warnings={scores.warnings} />
        <Technical>{readOnly && <Metrics values={[['Stock Priority Score', scores.stockPriorityScore], ['Seasonal Priority Score', scores.seasonalPriorityScore], ['Configuration Version', scores.configVersion]]} />}<p>Time Zone: {scores.timeZone}</p><p>Lambda Valid: {scores.lambdaValid ? 'Yes' : 'No'}</p>{scores.expiryEvidence && <><p>Expiry evidence: {readable(scores.expiryEvidence.reason)}</p><p>Earliest eligible expiry: {scores.expiryEvidence.earliestEligibleExpiryDate ?? 'Unavailable'} · Days remaining: {scores.expiryEvidence.daysRemaining ?? 'Unavailable'}</p><pre className="overflow-x-auto text-xs">{JSON.stringify(scores.expiryEvidence, null, 2)}</pre></>}</Technical>
      </Section>
    </>}
    <ExpiryBatches compact={readOnly} names={new Map(products?.content.map(p => [p.id, p.name]) ?? [])} />
  </div>;
}

function ExpiryBatches({ names, compact = false }: { names: Map<number, string>; compact?: boolean }) {
  const [result, setResult] = useState<F03PushPage | null>(null);
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let live = true; setLoading(true); setError('');
    f03Api.getExpiryPushBatches({ page, pageSize: 20 }).then(value => { if (live) setResult(value); }).catch(e => { if (live) setError(errorMessage(e, 'Unable to load expiry batches.')); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [page, refresh]);
  if (compact) return <section aria-labelledby="store-expiry-title" className="min-w-0 rounded-2xl border border-[#e7e2d8] bg-white p-4 shadow-sm sm:p-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="store-expiry-title" className="text-lg font-semibold">Products Approaching Expiry</h2><p className="mt-1 text-sm text-[#6d7974]">Review batches within their expiry reminder window.</p></div>
      <Button disabled={loading} className={secondary} onClick={() => setRefresh(x => x + 1)}><RefreshCw size={15} aria-hidden="true" />Refresh Batches</Button>
    </header>
    <div className="mt-4"><Notice error={error} /></div>
    {loading ? <p role="status" className="py-6 text-sm text-[#6d7974]">Loading batches…</p> : !error && result && <>
      <StoreExpiryTable result={result} names={names} />
      <Warnings warnings={result.warnings} />
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6d7974]"><span>As of <time dateTime={result.asOfDate}>{expiryDate(result.asOfDate)}</time></span><span title={result.timeZone}>Store local time</span></div>
      <Pager page={result} onChange={setPage} label="batches" busy={loading} />
    </>}
  </section>;
  return <Section title="Products Approaching Expiry" subtitle="Review inventory batches that may need attention before expiry.">
    <Button disabled={loading} className={secondary} onClick={() => setRefresh(x => x + 1)}>Refresh Batches</Button><Notice error={error} />
    {loading && <p role="status" className="mt-3">Loading batches…</p>}
    {!loading && !error && result && <><p className="mt-3 text-xs text-[#6d7974]">Analysis Date: {result.asOfDate} · {result.timeZone}. Priority status does not determine whether a batch is sellable.</p><Warnings warnings={result.warnings} />
      {result.items.length ? <div className="mt-4 overflow-x-auto"><table className="f03-table"><caption className="sr-only">Inventory batches approaching expiry</caption><thead><tr>{['Product', 'Batch', 'Expiry Date', 'Remaining Quantity', 'Days Remaining', 'Priority Status'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{result.items.map(batch => <tr key={batch.batchId}><td>{names.get(batch.productId) ?? `Product #${batch.productId}`}<small className="block">ID {batch.productId}</small></td><td>#{batch.batchId}</td><td>{batch.expiryDate}</td><td>{batch.remainingQuantity}</td><td>{batch.daysRemaining}</td><td>{batch.pushRequired ? `Priority push (${batch.pushRequiredQuantity})` : 'No push required'}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-[#6d7974]">No batches approaching expiry were returned.</p>}
      <Pager page={result} onChange={setPage} label="batches" busy={loading} />
    </>}
  </Section>;
}

const expiryDate = (date: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T00:00:00Z'));
export function StoreExpiryTable({ result, names }: { result: F03PushPage; names: Map<number, string> }) {
  const quantity = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 20 });
  const priority = (batch: F03PushPage['items'][number]) => <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${batch.pushRequired ? 'bg-[#edf5f0] text-[#356b54]' : 'bg-[#f5f5f2] text-[#57534e]'}`} title={`${quantity(batch.pushRequiredQuantity)} units flagged by the expiry reminder rule. Priority does not determine whether stock can be sold.`}>{batch.pushRequired ? 'Needs attention' : 'No action needed'}</span>;
  if (!result.items.length) return <p className="rounded-xl bg-[#faf8f5] px-4 py-6 text-sm text-[#6d7974]">No batches approaching expiry were returned.</p>;
  return <>
    <div className="hidden overflow-x-auto rounded-xl border border-[#e7e2d8] xl:block"><table className="w-full text-left text-sm"><caption className="sr-only">Inventory batches approaching expiry</caption>
      <thead className="bg-[#faf8f5] text-xs text-[#6d7974]"><tr>{['Product / Batch', 'Expiry date', 'Time left', 'Remaining', 'Priority'].map(label => <th key={label} scope="col" className={`px-4 py-3 font-medium ${label === 'Remaining' ? 'text-right' : ''}`}>{label}</th>)}</tr></thead>
      <tbody className="divide-y divide-[#e7e2d8]">{result.items.map(batch => <tr key={batch.batchId} className="align-middle"><th scope="row" className="max-w-xs px-4 py-3 font-medium"><span className="block break-words">{names.get(batch.productId) ?? `Product #${batch.productId}`}</span><span className="mt-1 block text-xs font-normal text-[#6d7974]">Batch #{batch.batchId}</span></th><td className="whitespace-nowrap px-4 py-3"><time dateTime={batch.expiryDate}>{expiryDate(batch.expiryDate)}</time></td><td className="whitespace-nowrap px-4 py-3 font-medium text-[#356b54]">{batch.daysRemaining} {batch.daysRemaining === 1 ? 'day' : 'days'} left</td><td className="px-4 py-3 text-right tabular-nums">{quantity(batch.remainingQuantity)}</td><td className="px-4 py-3">{priority(batch)}</td></tr>)}</tbody>
    </table></div>
    <ul aria-label="Expiry reminder batches" className="grid gap-3 md:grid-cols-2 xl:hidden">{result.items.map(batch => <li key={batch.batchId} className="min-w-0 rounded-xl border border-[#e7e2d8] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="break-words text-sm font-semibold">{names.get(batch.productId) ?? `Product #${batch.productId}`}</p><p className="mt-1 text-xs text-[#6d7974]">Batch #{batch.batchId}</p></div>{priority(batch)}</div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-[#6d7974]">Expiry date</dt><dd className="mt-1">{expiryDate(batch.expiryDate)}</dd><dd className="mt-1 text-xs font-medium text-[#356b54]">{batch.daysRemaining} {batch.daysRemaining === 1 ? 'day' : 'days'} left</dd></div><div className="text-right"><dt className="text-xs text-[#6d7974]">Remaining</dt><dd className="mt-1 font-semibold tabular-nums">{quantity(batch.remainingQuantity)}</dd></div></dl></li>)}</ul>
  </>;
}
