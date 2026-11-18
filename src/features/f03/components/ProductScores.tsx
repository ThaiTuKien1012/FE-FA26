import { AppDatePicker } from '../../../components/common/AppDatePicker';
import { formatDate, formatDateRange } from '../../../utils/dateTime';
import { useEffect, useState } from 'react';
import { f03Api, type F03PushPage, type F03Scores } from '../f03.api';
import type { F02Product } from '../../store/store.api';
import { ProductSelector } from '../../store/components/ProductSelector';
import { Button, errorMessage, field, Metrics, navigate, Notice, Pager, readable, secondary, Section, Technical, Warnings } from './F03Shared';
import { validDate } from '../f03.validation';

export function ProductScores({ readOnly, remember }: { readOnly: boolean; remember: (products: F02Product[]) => void }) {
  const [selected, setSelected] = useState<F02Product | null>(null), [scores, setScores] = useState<F03Scores | null>(null);
  const [refresh, setRefresh] = useState(0), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  useEffect(() => {
    let live = true; setScores(null); setError(''); setLoading(Boolean(selected));
    if (selected) f03Api.getScores(selected.id).then(value => { if (live) setScores(value); }).catch(e => { if (live) setError(errorMessage(e, 'Unable to load product weights.')); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [selected, refresh]);
  return <div className="space-y-5">
    <Section title="Product Weight Details" subtitle="See how expiry risk and seasonal priorities affect product utility.">
      <div className="max-w-xl"><ProductSelector value={selected} onSelect={product => { setSelected(product); remember([product]); }} /></div>
      {!selected && <p className="mt-4 text-sm text-[#6d7974]">Search the store catalog to review a product. All values are calculated by the backend.</p>}
      {selected && <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold">{selected.name} · {selected.sku}</p><div className="flex flex-wrap gap-2"><Button className={secondary} onClick={() => setSelected(null)}>Clear Product</Button><Button disabled={loading} className={secondary} onClick={() => setRefresh(x => x + 1)}>Refresh Weights</Button></div></div>}
      <div className="mt-4"><Notice error={error} /></div>{loading && <p role="status">Loading product weights…</p>}
      {scores && !loading && <>
        <Metrics values={[
          ['Expiry Risk', scores.expiryRisk], ['Season Weight', scores.seasonWeight], ['Weight', scores.ready ? scores.weightValue : null],
          ['Selected Season', scores.seasonId === null ? 'No active season' : (scores.activeSeasons.find(s => s.seasonId === scores.seasonId)?.name ?? `Season #${scores.seasonId}`)],
          ['Expiry Status', readable(scores.expiryStatus)], ['Readiness', scores.ready ? 'Ready' : 'Unavailable'],
          ['Analysis Date', formatDate(scores.asOfDate)], ['Configuration Version', scores.configVersion], ['Time Zone', scores.timeZone]
        ]} />
        {!scores.lambdaValid && <p role="alert" className="mt-4 text-sm text-amber-900">Priority Strength exceeds the system range. A Merchandiser must update the configuration before utility can be calculated.</p>}
        <Warnings warnings={[...scores.warnings, ...scores.expiryEvidence.warnings]} />
        {scores.batchesMissingPushDay.length > 0 && <p className="mt-3 text-sm">Missing Push Day: batches {scores.batchesMissingPushDay.map(id => `#${id}`).join(', ')}. {readOnly ? <Button className={secondary} onClick={() => navigate('store-batches')}>Open Inventory Batches</Button> : 'Ask a Store Admin to update Inventory Batches.'}</p>}
        <div className="mt-4"><h3 className="text-sm font-semibold">Active Seasons</h3>{scores.activeSeasons.length ? <ul className="mt-2 space-y-2 text-sm">{scores.activeSeasons.map(s => <li key={s.seasonId}>{s.name} · Weight {s.weight} · {formatDateRange(s.startDate, s.endDate, true)}{s.seasonId === scores.seasonId && ' · Selected by backend'}</li>)}</ul> : <p className="mt-2 text-sm text-[#6d7974]">No active season. This is a normal result.</p>}{!readOnly && <Button className={`${secondary} mt-3`} onClick={() => navigate('f03-seasons')}>Manage Seasons</Button>}</div>
        <Technical><p>Scoring Version: {scores.scoringVersion}</p><p>Expiry evidence: {readable(scores.expiryEvidence.reason)}</p><Metrics values={[
          ['Sales Window (days)', scores.expiryEvidence.salesWindowDays], ['Units Sold', scores.expiryEvidence.unitsSold], ['Daily Sales Rate', scores.expiryEvidence.dailySalesRate], ['Risk Quantity', scores.expiryEvidence.riskQuantity], ['Eligible Quantity', scores.expiryEvidence.eligibleQuantity]
        ]} /><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(scores.expiryEvidence, null, 2)}</pre></Technical>
      </>}
    </Section>
    <ExpiryBatches product={selected} />
  </div>;
}
function ExpiryBatches({ product }: { product: F02Product | null }) {
  const [result, setResult] = useState<F03PushPage | null>(null), [page, setPage] = useState(0), [refresh, setRefresh] = useState(0);
  const [date, setDate] = useState(''), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  useEffect(() => { setPage(0); }, [product?.id]);
  useEffect(() => {
    let live = true; setResult(null); setError('');
    if (date && !validDate(date)) { setLoading(false); setError('Enter a valid Analysis Date.'); return; }
    setLoading(true);
    f03Api.getExpiryPushBatches({ productId: product?.id, asOfDate: date || undefined, page, pageSize: 20 }).then(value => { if (live) setResult(value); }).catch(e => { if (live) setError(errorMessage(e, 'Unable to load Push Day batches.')); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [product, date, page, refresh]);
  return <Section title="Batches Due for Push" subtitle="Active, unexpired stock with remaining quantity that has reached its Push Day. Push Day does not determine whether stock can be sold.">
    <div className="mb-4 flex flex-wrap items-end gap-3"><label className="text-sm font-medium">Analysis Date (optional)<AppDatePicker aria-label="Push Analysis Date" className={field} value={date} onChange={value => { setDate(value); setPage(0); }} /></label><Button disabled={loading} className={secondary} onClick={() => setRefresh(x => x + 1)}>Refresh Batches</Button></div>
    <p className="mb-3 text-sm text-[#6d7974]">{product ? `Filtered to ${product.name}.` : 'All products in this store.'} Leave the date empty to use the backend’s current store date.</p>
    <Notice error={error} />{loading && <p role="status">Loading batches…</p>}
    {result && !loading && <><StoreExpiryTable result={result} names={new Map(product ? [[product.id, product.name]] : [])} /><Warnings warnings={result.warnings} /><p className="mt-3 text-xs text-[#6d7974]">As of {formatDate(result.asOfDate)} · {result.timeZone}</p><Pager page={result} onChange={setPage} label="batches" busy={loading} /></>}
  </Section>;
}
export function StoreExpiryTable({ result, names }: { result: F03PushPage; names: Map<number, string> }) {
  if (!result.items.length) return <p className="rounded-xl bg-[#faf8f5] px-4 py-6 text-sm text-[#6d7974]">No batches are due for push on this date.</p>;
  const due = (days: number) => days === 0 ? 'Due today' : days < 0 ? `${Math.abs(days)} days overdue` : `In ${days} days`;
  return <><div className="hidden overflow-x-auto md:block"><table className="f03-table"><caption className="sr-only">Batches due for push</caption><thead><tr>{['Product / Batch', 'Push Day', 'Expiry Date', 'Push Status', 'Remaining Quantity'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{result.items.map(batch => <tr key={batch.batchId}><th scope="row">{names.get(batch.productId) ?? `Product #${batch.productId}`}<small className="block text-[#6d7974]">Batch #{batch.batchId}</small></th><td>{formatDate(batch.pushDay)}</td><td>{formatDate(batch.expiryDate, 'No expiry date')}</td><td>{due(batch.daysToPush)}</td><td>{batch.remainingQuantity}</td></tr>)}</tbody></table></div>
    <ul aria-label="Push batches" className="grid gap-3 md:hidden">{result.items.map(batch => <li key={batch.batchId} className="rounded-xl border border-[#e7e2d8] p-4 text-sm"><p className="font-semibold">{names.get(batch.productId) ?? `Product #${batch.productId}`} · Batch #{batch.batchId}</p><dl className="mt-3 grid grid-cols-2 gap-3">{[['Push Day', formatDate(batch.pushDay)], ['Expiry Date', formatDate(batch.expiryDate, 'No expiry date')], ['Push Status', due(batch.daysToPush)], ['Remaining Quantity', batch.remainingQuantity]].map(([label, value]) => <div key={label}><dt className="text-xs text-[#6d7974]">{label}</dt><dd className="mt-1">{value}</dd></div>)}</dl></li>)}</ul></>;
}
