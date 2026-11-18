import { useEffect, useRef, useState } from 'react';
import { f03Api, type F03ConfigView } from '../f03.api';
import { complement, configErrors, draftFromConfig, enabledTotal, type ConfigDraft } from '../f03.validation';
import { Button, errorMessage, field, Metrics, Notice, primary, secondary, Section, Technical } from './F03Shared';

export function UtilityConfiguration({ readOnly, invalidate }: { readOnly: boolean; invalidate: (reason: string) => void }) {
  const [view, setView] = useState<F03ConfigView | null>(null), [draft, setDraft] = useState<ConfigDraft | null>(null);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const busy = useRef(false), version = useRef(0);
  const load = async () => {
    const ticket = ++version.current; setLoading(true); setError('');
    try { const result = await f03Api.getConfig(); if (ticket !== version.current) return; setView(result); setDraft(draftFromConfig(result.config)); }
    catch (e) { if (ticket === version.current) setError(errorMessage(e, 'Unable to load configuration.')); }
    finally { if (ticket === version.current) setLoading(false); }
  };
  useEffect(() => { void load(); return () => { ++version.current; }; }, []);
  const change = (key: keyof ConfigDraft, value: string) => {
    if (!draft || readOnly) return;
    const next = { ...draft, [key]: value };
    if (key === 'alpha' || key === 'beta') { const other = complement(value); if (other !== null) next[key === 'alpha' ? 'beta' : 'alpha'] = other; }
    setDraft(next); setNotice(''); invalidate('Configuration inputs changed. Save the configuration and calculate Preview again.');
  };
  const errors = view && draft ? configErrors(draft, view.lambdaPolicy) : [];
  const save = async () => {
    if (busy.current || readOnly || !draft || errors.length) return;
    const ticket = version.current; busy.current = true; setSaving(true); setError(''); setNotice('');
    invalidate('Configuration was submitted. Calculate Preview again using saved settings.');
    try { const result = await f03Api.updateConfig({ alpha: Number(draft.alpha), beta: Number(draft.beta), lambda: Number(draft.lambda), salesWindowDays: Number(draft.salesWindowDays) }); if (ticket !== version.current) return; setView(result); setDraft(draftFromConfig(result.config)); setNotice(`Configuration version ${result.config.version} saved.`); }
    catch (e) { if (ticket === version.current) setError(errorMessage(e, 'Unable to save configuration.')); }
    finally { invalidate('Configuration submission finished. Calculate Preview using the latest saved settings.'); busy.current = false; if (ticket === version.current) setSaving(false); }
  };
  return <div className="space-y-5"><Notice error={error} notice={notice} />
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[#6d7974]">{readOnly ? 'Store Admin · Read-only configuration' : 'Adjust priorities for future calculations. Saved snapshots remain unchanged.'}</p><Button disabled={loading || saving || error.includes('Contact your administrator')} className={secondary} onClick={() => { invalidate('Configuration refreshed. Calculate a new Preview.'); void load(); }}>Refresh Configuration</Button></div>
    {loading ? <p role="status">Loading configuration…</p> : view && draft && <>
      <Section title="Current Settings"><Metrics values={[["Allowed Priority Strength", `0 – ${view.lambdaPolicy.lambdaMax}`], ['Configuration Version', view.config.version], ['Configuration Status', view.lambdaValid ? 'Valid' : 'Needs attention']]} />
        {!view.lambdaValid && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">The current Priority Strength exceeds the system's allowed range. Update the configuration before calculating utility.</p>}
        <Technical><p>W(i) = 1 + λ × [α × U_expiry(i) + β × M(i)]</p><p>Weight is calculated by the backend and rounded HALF_UP to 2 decimals before Weighted Utility is calculated.</p><p>Scoring Version: {view.config.scoringVersion} · Policy Version: {view.lambdaPolicy.version}</p></Technical>
      </Section>
      <form onSubmit={event => { event.preventDefault(); void save(); }} className="space-y-5">
        <Section title="Relative Importance" subtitle="Allocate 100% between expiry risk and seasonal priorities. Editing one value updates the other exactly.">
          <fieldset disabled={readOnly || saving} className="grid gap-5 sm:grid-cols-2">{([['alpha', 'Expiry Importance', 'Prioritize stock at risk of expiry.'], ['beta', 'Season Importance', 'Prioritize products assigned to active seasons.']] as const).map(([key, label, help]) => <label key={key} className="text-sm font-medium">{label}<input aria-label={label} required type="number" min="0" max="1" step="0.000001" className={field} value={draft[key]} onChange={event => change(key, event.target.value)} /><span className="mt-2 block text-xs font-normal text-[#6d7974]">{help}</span></label>)}</fieldset>
          <p className="mt-4 text-sm font-medium">Total allocation: {Number(enabledTotal(draft)) / 10000}%</p>
        </Section>
        <Section title="Priority Strength & Sales Window"><fieldset disabled={readOnly || saving} className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium">Priority Strength<input aria-label="Priority Strength" required type="number" min="0" max={view.lambdaPolicy.lambdaMax} step="0.000001" className={field} value={draft.lambda} onChange={event => change('lambda', event.target.value)} /><span className="mt-2 block text-xs font-normal text-[#6d7974]">Controls how strongly priorities influence utility. Allowed range: 0 – {view.lambdaPolicy.lambdaMax}.</span></label>
          <label className="text-sm font-medium">Sales Window<input aria-label="Sales Window" required type="number" min="1" max="365" step="1" className={field} value={draft.salesWindowDays} onChange={event => change('salesWindowDays', event.target.value)} /><span className="mt-2 block text-xs font-normal text-[#6d7974]">Days of recent sales used by the backend to estimate selling speed (1–365).</span></label>
        </fieldset></Section>
        {errors.length > 0 && !readOnly && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{errors.map(message => <p key={message}>{message}</p>)}</div>}
        {!readOnly && <Button type="submit" disabled={saving || errors.length > 0} className={primary}>{saving ? 'Saving…' : 'Save Configuration'}</Button>}
      </form>
    </>}
  </div>;
}
