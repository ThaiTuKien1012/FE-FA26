import { useEffect, useRef, useState } from 'react';
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
    <Section title="Select Product" subtitle="Browse the Store catalog by page. The selected product stays selected when you browse another page.">
      <form className="mb-4 flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); setPage(0); setSearch(searchDraft.trim()); }}><label className="min-w-0 flex-1 text-sm font-medium">Search Products<input aria-label="Search Products" className={field} value={searchDraft} onChange={e => setSearchDraft(e.target.value)} placeholder="Product name or SKU" /></label><Button type="submit" disabled={loading || saving} className={secondary}>Search Catalog</Button></form>
      <label className="block max-w-2xl text-sm font-medium">Product<select aria-label="Product" disabled={loading || saving} className={field} value={selected?.id ?? ''} onChange={e => void choose(products?.content.find(p => p.id === Number(e.target.value)) ?? null)}><option value="">Choose a product</option>{selected && !products?.content.some(p => p.id === selected.id) && <option value={selected.id}>{selected.name} · {selected.sku}</option>}{products?.content.map(product => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select></label>
      {loading && <p role="status" className="mt-3 text-sm">Loading products…</p>}
      {products && <Pager page={products} onChange={setPage} label="products" busy={loading || saving} />}
      {!loading && products?.totalElements === 0 && <p className="mt-3 text-sm text-[#6d7974]">No products are available in this Store.</p>}
      {selected && <p className="mt-4 text-sm font-semibold">Selected: {selected.name} · Product #{selected.id}</p>}
      {error && <Button className={`${secondary} mt-3`} onClick={() => selected ? void choose(selected) : window.location.reload()}>Retry Products / Scores</Button>}
    </Section>
    {selected && !scores && !error && <p role="status">Loading product scores…</p>}
    {scores && <>
      <Section title="Manual Scores" subtitle="Assign a priority from 0 (lowest) to 1 (highest), with up to 6 decimal places. Stock Priority is a score, not an inventory quantity.">
        <form onSubmit={e => { e.preventDefault(); void save(); }}><fieldset disabled={readOnly || saving} className="grid gap-4 sm:grid-cols-2">{(['stockPriorityScore', 'seasonalPriorityScore'] as const).map(key => <label key={key} className="text-sm font-medium">{key === 'stockPriorityScore' ? 'Stock Priority Score' : 'Seasonal Priority Score'}<input aria-label={key === 'stockPriorityScore' ? 'Stock Priority Score' : 'Seasonal Priority Score'} type="number" min="0" max="1" step="0.000001" className={field} value={draft[key]} onChange={e => { setDraft({ ...draft, [key]: e.target.value }); setDirty(true); setNotice(''); invalidate('Product Score inputs changed. Save your scores and calculate a new Preview.'); }} /></label>)}</fieldset>
          <p className="mt-3 text-xs text-[#6d7974]">Blank fields are left unchanged; this API cannot clear a saved score.</p>
          {!valid && <p role="alert" className="mt-3 text-sm text-amber-900">Enter at least one score between 0 and 1, with at most 6 decimal places.</p>}
          {!readOnly && <Button type="submit" disabled={saving || !valid} className={`${primary} mt-4`}>{saving ? 'Saving…' : 'Save Product Scores'}</Button>}
        </form>
      </Section>
      <Section title="Calculated Scores" subtitle="Read-only results calculated by the backend from saved settings and scores.">
        <Button className={`${secondary} mb-4`} disabled={saving} onClick={() => void choose(selected)}>Refresh Scores</Button>
        {dirty && <p role="status" className="mb-4 text-sm text-amber-900">Unsaved scores. These calculations still reflect the last saved scores.</p>}
        <Metrics values={[
          ['Expiry Score', scores.expiryScore], ['Utility Weight', scores.weightValue],
          ['Calculation Status', scores.ready ? 'Ready' : 'Not Ready'], ['Expiry Status', readable(scores.expiryStatus)],
          ['Analysis Date', scores.asOfDate], ['Configuration Version', scores.configVersion]
        ]} />
        <p className="mt-4 text-sm text-[#6d7974]">Expiry Score uses this product’s expiry push threshold ({scores.expiryPushDays} days), inventory batches and the Analysis Date returned above. Preview can use a different Analysis Date.</p>
        <Warnings warnings={scores.warnings} />
        <Technical><p>Time Zone: {scores.timeZone}</p><p>Lambda Valid: {scores.lambdaValid ? 'Yes' : 'No'}</p>{scores.expiryEvidence && <><p>Expiry evidence: {readable(scores.expiryEvidence.reason)}</p><p>Earliest eligible expiry: {scores.expiryEvidence.earliestEligibleExpiryDate ?? 'Unavailable'} · Days remaining: {scores.expiryEvidence.daysRemaining ?? 'Unavailable'}</p><pre className="overflow-x-auto text-xs">{JSON.stringify(scores.expiryEvidence, null, 2)}</pre></>}</Technical>
      </Section>
    </>}
    <ExpiryBatches names={new Map(products?.content.map(p => [p.id, p.name]) ?? [])} />
  </div>;
}

function ExpiryBatches({ names }: { names: Map<number, string> }) {
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
  return <Section title="Products Approaching Expiry" subtitle="Review inventory batches that may need attention before expiry.">
    <Button disabled={loading} className={secondary} onClick={() => setRefresh(x => x + 1)}>Refresh Batches</Button><Notice error={error} />
    {loading && <p role="status" className="mt-3">Loading batches…</p>}
    {!loading && !error && result && <><p className="mt-3 text-xs text-[#6d7974]">Analysis Date: {result.asOfDate} · {result.timeZone}. Priority status does not determine whether a batch is sellable.</p><Warnings warnings={result.warnings} />
      {result.items.length ? <div className="mt-4 overflow-x-auto"><table className="f03-table"><caption className="sr-only">Inventory batches approaching expiry</caption><thead><tr>{['Product', 'Batch', 'Expiry Date', 'Remaining Quantity', 'Days Remaining', 'Priority Status'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{result.items.map(batch => <tr key={batch.batchId}><td>{names.get(batch.productId) ?? `Product #${batch.productId}`}<small className="block">ID {batch.productId}</small></td><td>#{batch.batchId}</td><td>{batch.expiryDate}</td><td>{batch.remainingQuantity}</td><td>{batch.daysRemaining}</td><td>{batch.pushRequired ? `Priority push (${batch.pushRequiredQuantity})` : 'No push required'}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-[#6d7974]">No batches approaching expiry were returned.</p>}
      <Pager page={result} onChange={setPage} label="batches" busy={loading} />
    </>}
  </Section>;
}
