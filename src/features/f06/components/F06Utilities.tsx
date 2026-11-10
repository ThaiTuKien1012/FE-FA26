import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { miningButton, miningInput, miningPrimaryButton, miningDate } from '../../f05/f05.display';
import { parseMiningId } from '../../f05/f05.numbers';
import { RecommendationExpiry, RecommendationRules, type RuleInputs } from '../f06.settings';
import { RecommendationProduct, RecommendationRuleSummary, recommendationLabel, recommendationYesNo } from './F06ReadShared';

function Panel({ title, busy = false, onClose, children }: { title: string; busy?: boolean; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = dialog.current, overflow = document.body.style.overflow;
    node?.showModal(); document.body.style.overflow = 'hidden';
    return () => { node?.close(); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={dialog} aria-label={title} aria-modal="true" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-3xl overflow-y-auto border-l border-[#E7E2D8] bg-white p-0 text-[#191C1B] shadow-xl backdrop:bg-black/30">
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E7E2D8] bg-white p-5 sm:p-6"><h2 className="text-xl font-semibold">{title}</h2><button type="button" autoFocus disabled={busy} aria-label={`Close ${title}`} onClick={onClose} className="rounded-lg p-2 hover:bg-[#EDF5F0] focus-visible:outline-2 disabled:opacity-50"><X aria-hidden="true" className="h-5 w-5" /></button></header>
    <div className="space-y-5 p-5 sm:p-6">{children}</div>
  </dialog>;
}
const fields: { key: keyof RuleInputs; label: string; help: string; decimal?: boolean }[] = [
  { key: 'maxBundleSize', label: 'Maximum Bundle Size', help: 'Whole number from 2 to 256 products.' },
  { key: 'minSupportCount', label: 'Minimum Support Count', help: 'At least 1 historical transaction; whole number.' },
  { key: 'supportPercent', label: 'Minimum Support Frequency (%)', help: '0–100%. Up to four percentage decimal places.', decimal: true },
  { key: 'confidencePercent', label: 'Minimum Cross-sell Confidence (%)', help: '0–100%. Up to four percentage decimal places.', decimal: true },
  { key: 'minimumSellableQuantity', label: 'Minimum Sellable Quantity', help: 'At least 1 sellable unit per product; whole number.' }
];
export function F06RulesPanel({ onClose }: { onClose: () => void }) {
  const [workflow] = useState(() => new RecommendationRules());
  const state = useSyncExternalStore(workflow.subscribe, workflow.getSnapshot, workflow.getSnapshot);
  useEffect(() => { workflow.start(); return workflow.stop; }, [workflow]);
  const canEdit = state.role === 'Store Admin';
  return <Panel title="Store Rules" busy={state.saving} onClose={onClose}>
    <p className="text-sm leading-6 text-[#6D7974]">Updated rules apply to newly generated recommendations. Existing recommendations keep their original rules.</p>
    <button type="button" className={miningButton} disabled={state.loading || state.saving} onClick={() => void workflow.refresh()}>Refresh Rules</button>
    {state.loading && <p role="status" className="text-sm text-[#6D7974]">Loading store rules...</p>}
    {state.error && <p role="alert" className="whitespace-pre-wrap break-words rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{state.error}</p>}
    {state.notice && <p role="status" className="rounded-xl bg-[#EDF5F0] p-4 text-sm text-[#1E3A2F]">{state.notice}</p>}
    {state.latest && <section aria-label="Current rules conflict" className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h3 className="font-semibold">Current rules · Version {state.latest.version}</h3>
      <p className="text-sm">Your edits below are retained from version {state.policy?.version}. Compare them with these current values before saving again.</p>
      <RecommendationRuleSummary policy={state.latest} />
      {canEdit && <div className="flex flex-wrap gap-2"><button type="button" className={miningButton} onClick={() => workflow.acceptLatest(false)}>Use Current Rules</button><button type="button" className={miningButton} onClick={() => workflow.acceptLatest(true)}>Keep My Edits</button></div>}
      <p className="text-xs leading-5">Keep My Edits uses the current version as your starting point; it does not save. Review all fields before choosing Save Changes.</p>
    </section>}
    {state.policy && <p className="text-sm font-medium">Rules version {state.policy.version}</p>}
    {state.policy && !canEdit && <><p className="text-sm text-[#6D7974]">Read-only access. Store Admin manages these rules.</p><RecommendationRuleSummary policy={state.latest ?? state.policy} /></>}
    {canEdit && state.draft && <form aria-label="Edit store rules" onSubmit={event => { event.preventDefault(); void workflow.save(); }}>
      <fieldset disabled={state.saving || state.loading} className="space-y-4"><legend className="sr-only">Store rule values</legend>
        {fields.map(field => <div key={field.key}><label htmlFor={`f06-rule-${field.key}`} className="text-sm font-semibold">{field.label}</label><input id={`f06-rule-${field.key}`} required inputMode={field.decimal ? 'decimal' : 'numeric'} value={state.draft![field.key]} onChange={event => workflow.edit(field.key, event.target.value)} aria-describedby={`f06-rule-help-${field.key}`} className={miningInput} /><p id={`f06-rule-help-${field.key}`} className="mt-1 text-xs text-[#6D7974]">{field.help}</p></div>)}
      </fieldset>
      <button type="submit" disabled={state.saving || state.loading || state.needsReload || !!state.latest} className={`${miningPrimaryButton} mt-5`}>{state.saving ? 'Saving rules...' : 'Save Changes'}</button>
    </form>}
  </Panel>;
}
const expiryDate = (date: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
export function F06ExpiryPanel({ onClose }: { onClose: () => void }) {
  const [workflow] = useState(() => new RecommendationExpiry());
  const state = useSyncExternalStore(workflow.subscribe, workflow.getSnapshot, workflow.getSnapshot);
  const [product, setProduct] = useState(''), [size, setSize] = useState('20'), [inputError, setInputError] = useState('');
  useEffect(() => { workflow.start(); return workflow.stop; }, [workflow]);
  useEffect(() => { setProduct(state.productId === undefined ? '' : String(state.productId)); setSize(String(state.pageSize)); setInputError(''); }, [state.productId, state.pageSize, state.role]);
  const data = state.data;
  return <Panel title="Expiry Alerts" onClose={onClose}>
    <p className="text-sm leading-6 text-[#6D7974]">Current expiry reminders for your Store, independent of mining. An alert does not by itself mean a product is unsellable. It does not change inventory or create promotions.</p>
    <form aria-label="Expiry alert filters" onSubmit={event => { event.preventDefault(); try { const id = product.trim() ? parseMiningId(product.trim()) : undefined; setInputError(''); void workflow.applyFilter(id, Number(size)); } catch (error) { setInputError(error instanceof Error ? error.message : 'Check the product ID.'); } }}>
      <div className="grid gap-3 sm:grid-cols-2"><label htmlFor="f06-expiry-product" className="text-sm font-semibold">Product ID<input id="f06-expiry-product" inputMode="numeric" value={product} onChange={event => setProduct(event.target.value)} placeholder="All products" className={miningInput} /></label><label htmlFor="f06-expiry-size" className="text-sm font-semibold">Items per page<select id="f06-expiry-size" value={size} onChange={event => setSize(event.target.value)} className={miningInput}>{[10, 20, 50, 100].map(value => <option key={value}>{value}</option>)}</select></label></div>
      <div className="mt-4 flex flex-wrap gap-2"><button type="submit" className={miningPrimaryButton}>Apply Expiry Filters</button><button type="button" className={miningButton} onClick={() => void workflow.applyFilter()}>Reset Expiry Filters</button><button type="button" className={miningButton} disabled={state.loading} onClick={() => void workflow.refresh()}>Refresh Alerts</button></div>
    </form>
    {inputError && <p role="alert" className="text-sm text-red-800">{inputError}</p>}
    {state.loading && <p role="status" className="text-sm text-[#6D7974]">Loading expiry alerts...</p>}
    {state.error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{state.error}</p>}
    {data && <>
      <p className="text-xs leading-5 text-[#6D7974]">Store date {data.asOfDate} · {data.timeZone}<br />Checked {miningDate(data.checkedAt)}</p>
      {data.warnings.length > 0 && <ul aria-label="Expiry warnings" className="space-y-1 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{data.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
      {!data.items.length ? <p className="rounded-xl bg-[#FAF8F5] p-4 text-sm text-[#6D7974]">No expiry alerts match these filters. Products with reminders disabled, expired batches and batches expiring today are not current sellable expiry alerts.</p> : <ul aria-label="Expiry alert batches" className="grid gap-4 sm:grid-cols-2">{data.items.map(batch => <li key={`${batch.productId}:${batch.batchId}`} className="min-w-0 rounded-xl border border-[#E7E2D8] p-4">
        <h3 className="break-words text-sm"><RecommendationProduct id={batch.productId} names={state.names} /></h3><p className="mt-1 text-xs text-[#6D7974]">Batch #{batch.batchId}</p>
        <p className="mt-3 font-semibold text-[#356B54]">Expires in {batch.daysRemaining} {batch.daysRemaining === 1 ? 'day' : 'days'}</p><time dateTime={batch.expiryDate} className="mt-1 block text-sm">{expiryDate(batch.expiryDate)}</time>
        <dl className="mt-3 space-y-2 text-sm"><div><dt className="text-xs text-[#6D7974]">Remaining quantity</dt><dd>{batch.remainingQuantity}</dd></div><div><dt className="text-xs text-[#6D7974]">Product reminder window</dt><dd>{batch.expiryPushDays} days</dd></div><div><dt className="text-xs text-[#6D7974]">Status</dt><dd>{recommendationLabel(batch.status)}</dd></div><div><dt className="text-xs text-[#6D7974]">Reminder required</dt><dd>{recommendationYesNo(batch.pushRequired)}</dd></div></dl>
        {batch.warnings.length > 0 && <ul className="mt-3 space-y-1 text-xs text-amber-900">{batch.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
        <p className="mt-3 text-xs text-[#6D7974]">Checked {miningDate(batch.checkedAt)}</p>
      </li>)}</ul>}
      <nav aria-label="Expiry alert pages" className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#6D7974]"><span>{data.totalElements} batches · Page {data.page + 1} of {Math.max(1, Math.ceil(data.totalElements / data.pageSize))}</span><div className="flex gap-2"><button type="button" disabled={data.page === 0} className={miningButton} onClick={() => void workflow.setPage(data.page - 1)}>Previous alerts</button><button type="button" disabled={(data.page + 1) * data.pageSize >= data.totalElements} className={miningButton} onClick={() => void workflow.setPage(data.page + 1)}>Next alerts</button></div></nav>
    </>}
  </Panel>;
}
