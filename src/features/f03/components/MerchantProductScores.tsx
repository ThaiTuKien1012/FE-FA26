import { isStoreAdmin, storeAdminCopy as copy } from '../../../utils/storeAdminCopy';
import type { F03Decimal } from '../f03.decimal';
import { useEffect, useState } from 'react';
import { AppDatePicker } from '../../../components/common/AppDatePicker';
import { formatDate, formatDateRange } from '../../../utils/dateTime';
import { f03Api, type F03PushPage, type F03Scores } from '../f03.api';
import { validDate } from '../f03.validation';
import { utilityNumber } from '../f03.presentation';
import { useUtilityProductNames } from '../f03.products';
import type { F02Product } from '../../store/store.api';
import { MerchantProductCatalog } from './MerchantProductCatalog';
import { SeasonDialog } from './SeasonDialog';
import { Button, errorMessage, field, Metrics, navigate, Notice, Pager, readable, secondary, Section, Technical, Warnings } from './F03Shared';
import { StoreExpiryTable } from './UtilityPushTable';

// The same product browser serves both roles; management links are Merchandiser-only.
export function MerchantProductScores({ remember, active = true, readOnly = false }: { remember: (products: F02Product[]) => void; active?: boolean; readOnly?: boolean }) {
  const [selected, setSelected] = useState<{ product: F02Product; opener: HTMLElement } | null>(null);
  const [all, setAll] = useState(false);
  useEffect(() => { if (!active) setSelected(null); }, [active]);
  return <div className="space-y-5">
    <MerchantProductCatalog remember={remember} onView={(product, opener) => { remember([product]); setSelected({ product, opener }); }} />
    <MerchantExpiryBatches key={all ? 'all' : 'none'} product={null} all={all} onAll={() => setAll(true)} onProduct={() => setAll(false)} />
    {active && selected && <MerchantPriorityDialog key={selected.product.id} product={selected.product} opener={selected.opener} readOnly={readOnly} onClose={() => setSelected(null)} />}
  </div>;
}

function MerchantPriorityDialog({ product, opener, onClose, readOnly }: { product: F02Product; opener: HTMLElement; onClose: () => void; readOnly: boolean }) {
  const [result, setResult] = useState<F03Scores | null>(null), [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [showBatches, setShowBatches] = useState(false);
  useEffect(() => {
    let live = true; setResult(null); setError(''); setLoading(true);
    void f03Api.getScores(product.id).then(value => {
      if (!live) return;
      if (value.productId === product.id) setResult(value);
      else setError('The returned priorities do not match this product. Refresh to try again.');
    }).catch(e => { if (live) setError(errorMessage(e, 'Unable to load product priorities.')); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [product.id, revision]);
  return <div className="f03-product-dialog"><SeasonDialog title="Product Priority Details" subtitle={product.name + ' \u00b7 ' + product.sku} wide busy={false} returnFocus={opener} onClose={onClose} footer={<><Button disabled={loading} className={secondary} onClick={() => setRevision(value => value + 1)}>Refresh Weights</Button><Button className={secondary} onClick={onClose}>Close</Button></>}>
    <div data-priority-product={product.id} aria-busy={loading}>
      <Notice error={error} />{error && <Button className={secondary + ' mt-3'} onClick={() => setRevision(value => value + 1)}>Retry Weights</Button>}
      {loading && <p role="status">Loading product priorities…</p>}
      {result && !loading && <ProductPriorityContent scores={result} onManageSeasons={readOnly ? undefined : () => { onClose(); navigate('f03-seasons'); }} />}
      <details className="mt-5 rounded-xl border border-[#e7e2d8] p-4" onToggle={event => setShowBatches(event.currentTarget.open)}><summary className="cursor-pointer text-sm font-semibold text-[#356b54]">Batches Due for Push</summary>{showBatches && <div className="mt-4"><MerchantExpiryBatches product={product} all={false} embedded /></div>}</details>
    </div>
  </SeasonDialog></div>;
}

export function ProductPriorityContent({ scores, onManageSeasons }: { scores: F03Scores; onManageSeasons?: () => void }) {
  return <>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">{[
          ['Expiry Risk', scores.expiryRisk, 'Share of eligible stock at risk of remaining unsold by its Push Day.'],
          ['Seasonal Priority', scores.seasonWeight, 'Priority from the active season selected for this product.'],
          ['Priority Multiplier', scores.weightValue, 'Multiplier used for weighted utility. This is not revenue or profit.']
        ].map(([label, number, help]) => <section key={String(label)} className="min-w-0 rounded-xl border border-[#e7e2d8] bg-[#faf8f5] p-4"><h3 className="text-sm font-semibold">{label}</h3><p className="mt-2 break-words text-xl font-semibold tabular-nums">{utilityNumber(number as F03Decimal | null)}</p><p className="mt-2 text-xs leading-relaxed text-[#6d7974]">{help}</p></section>)}</div>
        <div className="mt-5"><Metrics values={[
          ['Selected Season', scores.seasonId === null ? 'No active season' : scores.activeSeasons.find(season => season.seasonId === scores.seasonId)?.name ?? `Season #${scores.seasonId}`],
          ['Readiness', scores.ready ? 'Ready' : 'Unavailable'], ['Analysis Date', formatDate(scores.asOfDate)]
        ]} /></div>
        {!scores.lambdaValid && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Priority Strength exceeds the system range. {onManageSeasons ? 'Update Weight Settings before calculating utility.' : 'A Merchandiser must update Weight Settings before calculating utility.'}</p>}
        <Warnings compact warnings={[...scores.warnings, ...scores.expiryEvidence.warnings]} />
        <details className="mt-4 text-sm"><summary className="cursor-pointer font-semibold text-[#356b54]">How these priorities were selected</summary><p className="mt-3 text-sm">{copy('All values are reported by the backend using current inventory, recent sales and saved season assignments.','Priorities reflect current stock, recent sales and assigned seasons.')}</p>
          <h3 className="mt-4 font-semibold">Active Seasons</h3>{scores.activeSeasons.length ? <ul className="mt-2 space-y-2">{scores.activeSeasons.map(season => <li key={season.seasonId}>{season.name} · Priority {utilityNumber(season.weight)} · {formatDateRange(season.startDate, season.endDate)}{season.seasonId === scores.seasonId && ' · Selected'}</li>)}</ul> : <p className="mt-2">No active season. This is a normal result.</p>}
          {onManageSeasons && <Button className={secondary + ' mt-3'} onClick={onManageSeasons}>Manage Seasons</Button>}
        </details>
        <Technical><Metrics values={[
          ['Product ID', scores.productId], ['Expiry Status', readable(scores.expiryStatus)], ['Configuration Version', scores.configVersion], ['Time Zone', scores.timeZone],
          ['Sales Window (days)', scores.expiryEvidence.salesWindowDays], ['Units Sold', scores.expiryEvidence.unitsSold], ['Daily Sales Rate', scores.expiryEvidence.dailySalesRate], ['Risk Quantity', scores.expiryEvidence.riskQuantity], ['Eligible Quantity', scores.expiryEvidence.eligibleQuantity]
        ]} /><p>Scoring Version: {scores.scoringVersion}</p>{scores.batchesMissingPushDay.length > 0 && <p>Missing Push Day: batches {scores.batchesMissingPushDay.map(id => `#${id}`).join(', ')}. Ask a Store Admin to update Inventory Batches.</p>}{!isStoreAdmin() && <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(scores.expiryEvidence, null, 2)}</pre>}</Technical>
  </>;
}

function MerchantExpiryBatches({ product, all, onAll, onProduct, embedded = false }: { product: F02Product | null; all: boolean; onAll?: () => void; onProduct?: () => void; embedded?: boolean }) {
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
  const content = <>
    <div className="flex flex-wrap gap-2">{!all && onAll && <Button className={secondary} onClick={onAll}>View All Batches Due for Push</Button>}{all && onProduct && <Button className={secondary} onClick={onProduct}>{product ? "View Selected Product Batches" : "Hide All Batches"}</Button>}</div>
    {!enabled ? <p className="mt-4 text-sm text-[#6d7974]">Open a product's Details to view its batches, or choose View All Batches Due for Push.</p> : <>
      <p className="mt-4 text-sm text-[#6d7974]">{all ? 'All products in this store.' : `Batches for ${product!.name}.`}</p>
      <div className="my-4 flex flex-wrap items-end gap-3"><label className="text-sm font-medium">Analysis Date (optional)<AppDatePicker aria-label="Push Analysis Date" className={field} value={date} onChange={next => { setDate(next); setPage(0); }} /></label><Button disabled={loading} className={secondary} onClick={() => setRevision(value => value + 1)}>Refresh Batches</Button></div>
      <Notice error={error} />{loading && <p role="status">Loading batches…</p>}
      {result && <div aria-busy={loading} className={loading ? 'pointer-events-none opacity-60' : ''}><StoreExpiryTable compact result={result} names={new Map(Object.entries(names).map(([id, name]) => [Number(id), name]))} /><Warnings compact warnings={result.warnings} /><p className="mt-3 text-xs text-[#6d7974]">As of {formatDate(result.asOfDate)} · {result.timeZone}</p><Pager hideSingle page={result} onChange={setPage} label="batches" busy={loading} /></div>}
    </>}
  </>;
  return embedded ? content : <Section title="Batches Due for Push" subtitle="Stock that has reached its Push Day. An alert does not by itself mean the stock is unsellable.">{content}</Section>;
}
