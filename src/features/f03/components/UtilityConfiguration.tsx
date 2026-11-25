import { storeAdminCopy as copy } from '../../../utils/storeAdminCopy';
import { useEffect, useRef, useState } from 'react';
import { f03Api, type F03ConfigView } from '../f03.api';
import { configDraftDirty, importanceControls, tenthImportance } from '../f03.presentation';
import { complement, configErrors, draftFromConfig, enabledTotal, type ConfigDraft } from '../f03.validation';
import { Button, errorMessage, field, Metrics, Notice, primary, secondary, Section, Technical } from './F03Shared';

export function UtilityConfiguration({ readOnly, invalidate, onDraftState }: { readOnly: boolean; invalidate: (reason: string) => void; onDraftState?: (dirty: boolean) => void }) {
  const [view, setView] = useState<F03ConfigView | null>(null), [draft, setDraft] = useState<ConfigDraft | null>(null);
  const [importanceInput, setImportanceInput] = useState<{ key: 'alpha' | 'beta'; value: string } | null>(null);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const busy = useRef(false), version = useRef(0);
  const load = async () => {
    const ticket = ++version.current; setLoading(true); setError('');
    try { const result = await f03Api.getConfig(); if (ticket !== version.current) return; setView(result); setDraft(draftFromConfig(result.config)); setImportanceInput(null); }
    catch (e) { if (ticket === version.current) setError(errorMessage(e, 'Unable to load configuration.')); }
    finally { if (ticket === version.current) setLoading(false); }
  };
  useEffect(() => { void load(); return () => { ++version.current; }; }, []);
  useEffect(() => { if (draft && view) onDraftState?.(importanceInput?.value === '' || configDraftDirty(draft, view.config)); }, [draft, view, importanceInput, onDraftState]);
  const change = (key: keyof ConfigDraft, value: string) => {
    if (!draft || readOnly) return;
    if ((key === 'alpha' || key === 'beta') && value === '') { setImportanceInput({ key, value }); return; }
    if ((key === 'alpha' || key === 'beta') && tenthImportance(value) === null) { setError('Choose importance from 0.0 to 1.0 in steps of 0.1.'); return; }
    if (key === 'alpha' || key === 'beta') setImportanceInput({ key, value });
    const next = { ...draft, [key]: value };
    if (key === 'alpha' || key === 'beta') { const other = complement(value); next[key] = tenthImportance(value)!; if (other !== null) next[key === 'alpha' ? 'beta' : 'alpha'] = Number(other).toFixed(1); }
    setDraft(next); setError(''); setNotice(''); invalidate('Configuration inputs changed. Save the configuration and calculate Preview again.');
  };
  const errors = view && draft ? configErrors(draft, view.lambdaPolicy) : [];
  const controls = draft && !readOnly ? importanceControls(draft) : draft;
  const preciseImportance = draft && !readOnly && (tenthImportance(draft.alpha) === null || tenthImportance(draft.beta) === null);
  const save = async () => {
    if (busy.current || readOnly || !draft || errors.length) return;
    const ticket = version.current; busy.current = true; setSaving(true); setError(''); setNotice('');
    invalidate('Configuration was submitted. Calculate Preview again using saved settings.');
    try { const result = await f03Api.updateConfig({ alpha: draft.alpha, beta: draft.beta, lambda: draft.lambda, salesWindowDays: Number(draft.salesWindowDays) }); if (ticket !== version.current) return; setView(result); setDraft(draftFromConfig(result.config)); setNotice(`Configuration version ${result.config.version} saved.`); }
    catch (e) { if (ticket === version.current) setError(errorMessage(e, 'Unable to save configuration.')); }
    finally { invalidate('Configuration submission finished. Calculate Preview using the latest saved settings.'); busy.current = false; if (ticket === version.current) setSaving(false); }
  };
  return <div className="space-y-5"><Notice error={error} notice={notice} />
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[#6d7974]">{readOnly ? 'View only. A Merchandiser manages these settings.' : 'Adjust priorities for future calculations. Saved snapshots remain unchanged.'}</p><Button disabled={loading || saving || error.includes('Contact your administrator')} className={secondary} onClick={() => { invalidate('Configuration refreshed. Calculate a new Preview.'); void load(); }}>{copy('Refresh Configuration','Refresh Settings')}</Button></div>
    {loading ? <p role="status">Loading configuration…</p> : view && draft && <>
      <Section title="Current Settings"><Metrics values={[["Allowed Priority Strength", `0 – ${view.lambdaPolicy.lambdaMax}`], ['Configuration Version', view.config.version], ['Configuration Status', view.lambdaValid ? 'Valid' : 'Needs attention']]} />
        {!view.lambdaValid && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">The current Priority Strength exceeds the system's allowed range. {readOnly ? 'Ask a Merchandiser to update Weight Settings before running an analysis.' : 'Update the configuration before calculating utility.'}</p>}
        {!readOnly && <Technical><p>W(i) = 1 + λ × [α × U_expiry(i) + β × M(i)]</p><p>Weight is calculated by the backend and rounded HALF_UP to 2 decimals before Weighted Utility is calculated.</p><p>Saved importance: Expiry {view.config.alpha} / Season {view.config.beta}</p><p>Scoring Version: {view.config.scoringVersion} · Policy Version: {view.lambdaPolicy.version}</p></Technical>}
      </Section>
      <form onSubmit={event => { event.preventDefault(); void save(); }} className="space-y-5">
        <Section title="Relative Importance" subtitle="Split 100% between expiry risk and seasons. For example, 0.6 and 0.4 give expiry 60% of the importance.">
          <p className="mb-3 text-xs text-[#6d7974]">{readOnly ? "Read-only saved importance. Changes are managed by a Merchandiser." : preciseImportance ? "Saved importance uses finer precision. Controls show tenths; saved values are kept unless you adjust an importance control and save." : "Editing one importance updates the other. Changes are applied only when you save."}</p><fieldset disabled={readOnly || saving} className="grid gap-5 sm:grid-cols-2">{([['alpha', 'Expiry Importance', 'Prioritize stock at risk of expiry.'], ['beta', 'Season Importance', 'Prioritize products assigned to active seasons.']] as const).map(([key, label, help]) => <label key={key} className="text-sm font-medium">{label}<input aria-label={label} required type="number" min="0" max="1" step={readOnly ? "0.000001" : "0.1"} className={field} value={importanceInput?.key === key ? importanceInput.value : controls![key]} onFocus={() => !readOnly && setImportanceInput({ key, value: controls![key] })} onBlur={() => setImportanceInput(null)} onChange={event => change(key, event.target.value)} /><span className="mt-2 block text-xs font-normal text-[#6d7974]">{help}</span></label>)}</fieldset>
          <p className="mt-4 text-sm font-medium">Total allocation: {Number(enabledTotal(draft)) / 10000}%</p>
        </Section>
        <Section title="Priority Strength & Sales Window"><fieldset disabled={readOnly || saving} className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium">Priority Strength<input aria-label="Priority Strength" required type="number" min="0" max={view.lambdaPolicy.lambdaMax} step="0.000001" className={field} value={draft.lambda} onChange={event => change('lambda', event.target.value)} /><span className="mt-2 block text-xs font-normal text-[#6d7974]">{readOnly ? 'Controls how much expiry and seasonal priorities affect the analysis score.' : <>Controls how strongly priorities influence utility. Allowed range: 0 – {view.lambdaPolicy.lambdaMax}.</>}</span></label>
          <label className="text-sm font-medium">Sales Window<input aria-label="Sales Window" required type="number" min="1" max="365" step="1" className={field} value={draft.salesWindowDays} onChange={event => change('salesWindowDays', event.target.value)} /><span className="mt-2 block text-xs font-normal text-[#6d7974]">{copy('Days of recent sales used by the backend to estimate selling speed (1–365).','Number of recent sales days used to estimate how quickly a product sells (1–365).')}</span></label>
        </fieldset></Section>
        {errors.length > 0 && !readOnly && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{errors.map(message => <p key={message}>{message}</p>)}</div>}
        {!readOnly && <Button type="submit" disabled={saving || errors.length > 0 || importanceInput?.value === ''} className={primary}>{saving ? 'Saving…' : 'Save Configuration'}</Button>}
      </form>
    </>}
  </div>;
}
