import { useEffect, useState } from 'react';
import { AppDatePicker } from '../../../components/common/AppDatePicker';
import { formatDate, formatDateRange } from '../../../utils/dateTime';
import { f03Api, type F03PushPage, type F03Scores } from '../f03.api';
import { validDate } from '../f03.validation';
import { utilityNumber } from '../f03.presentation';
import { useUtilityProductNames } from '../f03.products';
import type { F02Product } from '../../store/store.api';
import { ProductSelector } from '../../store/components/ProductSelector';
import { Button, errorMessage, field, Metrics, navigate, Notice, Pager, readable, secondary, Section, Technical, Warnings } from './F03Shared';
import { StoreExpiryTable } from './UtilityPushTable';

export function MerchantProductScores({ remember }: { remember: (products: F02Product[]) => void }) {
  const [product, setProduct] = useState<F02Product | null>(null), [result, setResult] = useState<F03Scores | null>(null);
  const [all, setAll] = useState(false), [revision, setRevision] = useState(0), [loading, setLoading] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    let live = true; setResult(null); setError(''); setLoading(Boolean(product));
    if (product) void f03Api.getScores(product.id).then(value => { if (!live) return; if (value.productId === product.id) setResult(value); else setError('The returned priorities do not match this product. Refresh to try again.'); }).catch(e => { if (live) setError(errorMessage(e, 'Unable to load product priorities.')); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [product, revision]);
  const scores = result?.productId === product?.id ? result : null;
  return <div className="space-y-5">
    <Section title="Select Product">
      <div className="max-w-xl"><ProductSelector value={product} onSelect={next => { setProduct(next); setAll(false); remember([next]); }} /></div>
      {!product && <p className="mt-4 text-sm text-[#6d7974]">Choose a product by name or SKU to review its current priorities.</p>}
      {product && <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold">{product.name}</p><p className="mt-1 break-words text-xs text-[#6d7974]">{product.sku}</p></div><div className="flex flex-wrap gap-2"><Button className={secondary} onClick={() => { setProduct(null); setAll(false); }}>Clear Product</Button><Button disabled={loading} className={secondary} onClick={() => setRevision(value => value + 1)}>Refresh Weights</Button></div></div>}
      <div className="mt-4"><Notice error={error} /></div>{loading && <p role="status">Loading product priorities…</p>}
      {scores && !loading && <>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">{[
          ['Expiry Risk', scores.expiryRisk, 'Share of eligible stock at risk of remaining unsold by its Push Day.'],
          ['Seasonal Priority', scores.seasonWeight, 'Priority from the active season selected for this product.'],
          ['Priority Multiplier', scores.weightValue, 'Multiplier used for weighted utility. This is not revenue or profit.']
        ].map(([label, number, help]) => <section key={String(label)} className="min-w-0 rounded-xl border border-[#e7e2d8] bg-[#faf8f5] p-4"><h3 className="text-sm font-semibold">{label}</h3><p className="mt-2 break-words text-xl font-semibold tabular-nums">{utilityNumber(number as number | null)}</p><p className="mt-2 text-xs leading-relaxed text-[#6d7974]">{help}</p></section>)}</div>
        <div className="mt-5"><Metrics values={[
          ['Selected Season', scores.seasonId === null ? 'No active season' : scores.activeSeasons.find(season => season.seasonId === scores.seasonId)?.name ?? `Season #${scores.seasonId}`],
          ['Readiness', scores.ready ? 'Ready' : 'Unavailable'], ['Analysis Date', formatDate(scores.asOfDate)]
        ]} /></div>
        {!scores.lambdaValid && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Priority Strength exceeds the system range. Update Weight Settings before calculating utility.</p>}
        <Warnings compact warnings={[...scores.warnings, ...scores.expiryEvidence.warnings]} />
        <details className="mt-4 text-sm"><summary className="cursor-pointer font-semibold text-[#356b54]">How these priorities were selected</summary><p className="mt-3 text-sm">All values are reported by the backend using current inventory, recent sales and saved season assignments.</p>
          <h3 className="mt-4 font-semibold">Active Seasons</h3>{scores.activeSeasons.length ? <ul className="mt-2 space-y-2">{scores.activeSeasons.map(season => <li key={season.seasonId}>{season.name} · Priority {utilityNumber(season.weight)} · {formatDateRange(season.startDate, season.endDate)}{season.seasonId === scores.seasonId && ' · Selected'}</li>)}</ul> : <p className="mt-2">No active season. This is a normal result.</p>}
          <Button className={secondary + ' mt-3'} onClick={() => navigate('f03-seasons')}>Manage Seasons</Button>
        </details>
        <Technical><Metrics values={[
          ['Product ID', scores.productId], ['Expiry Status', readable(scores.expiryStatus)], ['Configuration Version', scores.configVersion], ['Time Zone', scores.timeZone],
          ['Sales Window (days)', scores.expiryEvidence.salesWindowDays], ['Units Sold', scores.expiryEvidence.unitsSold], ['Daily Sales Rate', scores.expiryEvidence.dailySalesRate], ['Risk Quantity', scores.expiryEvidence.riskQuantity], ['Eligible Quantity', scores.expiryEvidence.eligibleQuantity]
        ]} /><p>Scoring Version: {scores.scoringVersion}</p>{scores.batchesMissingPushDay.length > 0 && <p>Missing Push Day: batches {scores.batchesMissingPushDay.map(id => `#${id}`).join(', ')}. Ask a Store Admin to update Inventory Batches.</p>}<pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(scores.expiryEvidence, null, 2)}</pre></Technical>
      </>}
    </Section>
    <MerchantExpiryBatches key={all ? 'all' : product?.id ?? 'none'} product={product} all={all} onAll={() => setAll(true)} onProduct={() => setAll(false)} />
  </div>;
}

function MerchantExpiryBatches({ product, all, onAll, onProduct }: { product: F02Product | null; all: boolean; onAll: () => void; onProduct: () => void }) {
  const enabled = all || product !== null;
  const [result, setResult] = useState<F03PushPage | null>(null), [page, setPage] = useState(0), [revision, setRevision] = useState(0);
  const [date, setDate] = useState(''), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  const names = useUtilityProductNames(result?.items.map(row => row.productId) ?? [], product ? { [product.id]: product.name } : {});
  useEffect(() => {
    let live = true;
    if (!enabled) return;
    if (date && !validDate(date)) { setLoading(false); setError('Enter a valid Analysis Date.'); return; }
    setLoading(true); setError('');
    void f03Api.getExpiryPushBatches({ productId: all ? undefined : product!.id, asOfDate: date || undefined, page, pageSize: 20 }).then(value => {
      if (!live) return;
      const last = Math.max(0, Math.ceil(value.totalElements / value.pageSize) - 1);
      if (page > last) setPage(last); else setResult(value);
    }).catch(e => { if (live) { setResult(null); setError(errorMessage(e, 'Unable to load Push Day batches.')); } }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [enabled, all, product, date, page, revision]);
  return <Section title="Batches Due for Push" subtitle="Stock that has reached its Push Day. An alert does not by itself mean the stock is unsellable.">
    <div className="flex flex-wrap gap-2">{!all && <Button className={secondary} onClick={onAll}>View All Batches Due for Push</Button>}{all && <Button className={secondary} onClick={onProduct}>{product ? "View Selected Product Batches" : "Hide All Batches"}</Button>}</div>
    {!enabled ? <p className="mt-4 text-sm text-[#6d7974]">Select a product to see its batches, or choose View All Batches Due for Push.</p> : <>
      <p className="mt-4 text-sm text-[#6d7974]">{all ? 'All products in this store.' : `Batches for ${product!.name}.`}</p>
      <div className="my-4 flex flex-wrap items-end gap-3"><label className="text-sm font-medium">Analysis Date (optional)<AppDatePicker aria-label="Push Analysis Date" className={field} value={date} onChange={next => { setDate(next); setPage(0); }} /></label><Button disabled={loading} className={secondary} onClick={() => setRevision(value => value + 1)}>Refresh Batches</Button></div>
      <Notice error={error} />{loading && <p role="status">Loading batches…</p>}
      {result && <div aria-busy={loading} className={loading ? 'pointer-events-none opacity-60' : ''}><StoreExpiryTable compact result={result} names={new Map(Object.entries(names).map(([id, name]) => [Number(id), name]))} /><Warnings compact warnings={result.warnings} /><p className="mt-3 text-xs text-[#6d7974]">As of {formatDate(result.asOfDate)} · {result.timeZone}</p><Pager hideSingle page={result} onChange={setPage} label="batches" busy={loading} /></div>}
    </>}
  </Section>;
}
