import { useEffect, useRef, useState } from 'react';
import { Boxes, CalendarClock, Leaf, Save } from 'lucide-react';
import { f03Api, type F03ConfigView } from '../f03.api';
import { configErrors, draftFromConfig, enabledTotal, type ConfigDraft } from '../f03.validation';
import { Button, field, Metrics, Notice, primary, Section, Technical, errorMessage } from './F03Shared';

export function UtilityConfiguration({ readOnly, invalidate }: { readOnly: boolean; invalidate: (reason: string) => void }) {
  const [view, setView] = useState<F03ConfigView | null>(null);
  const [draft, setDraft] = useState<ConfigDraft | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    let live = true;
    f03Api.getConfig().then(value => { if (live) { setView(value); setDraft(draftFromConfig(value.config)); } }).catch(e => { if (live) setError(errorMessage(e, 'Unable to load configuration.')); });
    return () => { live = false; };
  }, []);
  if (!view || !draft) return <><Notice error={error} />{!error && <p role="status">Loading configuration…</p>}{error && <Button className={primary} onClick={() => window.location.reload()}>Reload Configuration</Button>}</>;
  const errors = configErrors(draft, view.lambdaPolicy);
  const factors = [
    { flag: 'enableStock', coefficient: 'alpha', name: 'Stock', icon: Boxes, description: 'Emphasize products with a higher manually assigned stock priority.' },
    { flag: 'enableExpiry', coefficient: 'beta', name: 'Expiry', icon: CalendarClock, description: 'Emphasize products approaching expiry, calculated from inventory batches.' },
    { flag: 'enableSeason', coefficient: 'gamma', name: 'Seasonal', icon: Leaf, description: 'Emphasize products that matter for the current season.' }
  ] as const;
  const change = (next: ConfigDraft) => { invalidate('Configuration changed. Save your settings and calculate a new Preview.'); setDraft(next); setNotice(''); };
  const save = async () => {
    if (busy.current || readOnly || errors.length) return;
    busy.current = true; setSaving(true); setError(''); setNotice('');
    invalidate('Configuration was submitted. Calculate a new Preview before creating a snapshot.');
    try {
      const result = await f03Api.updateConfig({ ...draft, alpha: Number(draft.alpha), beta: Number(draft.beta), gamma: Number(draft.gamma), lambda: Number(draft.lambda) });
      setView(result); setDraft(draftFromConfig(result.config));
      setNotice(`Configuration version ${result.config.version} saved. Existing snapshots remain unchanged.`);
    } catch (e) { setError(errorMessage(e, 'Could not save configuration.')); }
    finally { invalidate('Configuration submission finished. Calculate a new Preview using saved settings.'); busy.current = false; setSaving(false); }
  };
  return <div className="space-y-5"><Notice error={error} notice={notice} />
    {readOnly && <p className="text-sm font-medium text-[#356b54]">Store Admin · Read-only configuration</p>}
    <Section title="Current Settings"><Metrics values={[
      ['Allowed Lambda Range', `${view.lambdaPolicy.lambdaMin} – ${view.lambdaPolicy.lambdaMax}`],
      ['Configuration Status', view.lambdaValid ? 'Within current policy' : 'Lambda needs attention'],
      ['Current Configuration Version', view.config.version]
    ]} /><Technical><p>Scoring Version: {view.config.scoringVersion}</p><p>Global Lambda Policy Version: {view.lambdaPolicy.version}</p><p>W = 1 + lambda × (alpha × S + beta × E + gamma × M)</p><p>S: Stock Score · E: Backend Expiry Score · M: Seasonal Score. Disabled factors have an effective coefficient of zero.</p></Technical></Section>
    <form onSubmit={e => { e.preventDefault(); void save(); }} className="space-y-5">
      <Section title="Choose Priority Factors" subtitle="Select the priorities to include in utility calculations.">
        <fieldset disabled={readOnly || saving} className="grid gap-3 lg:grid-cols-3">{factors.map(({ flag, name, icon: Icon, description }) => <label key={flag} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${draft[flag] ? 'border-[#356b54] bg-[#eef5f0]' : 'border-[#e7e2d8]'}`}><Icon className="mt-0.5 shrink-0 text-[#356b54]" size={20} /><span className="flex-1"><span className="font-semibold">{name} Priority</span><span className="mt-1 block text-xs leading-relaxed text-[#6d7974]">{description}</span></span><input type="checkbox" aria-label={`${name} Priority`} checked={draft[flag]} onChange={e => change({ ...draft, [flag]: e.target.checked })} className="mt-1 h-4 w-4 accent-[#1e3a2f]" /></label>)}</fieldset>
      </Section>
      <Section title="Set Relative Importance" subtitle="Use values from 0 to 1, with up to 6 decimal places. Enabled values must total 1 (100%).">
        <fieldset disabled={readOnly || saving} className="grid gap-4 sm:grid-cols-3">{factors.map(({ coefficient, flag, name }) => <label key={coefficient} className="text-sm font-medium">{name} Importance<input aria-label={`${name} Importance`} className={field} type="number" min="0" max="1" step="0.000001" required value={draft[coefficient]} onChange={e => change({ ...draft, [coefficient]: e.target.value })} /><span className="mt-2 block text-xs font-normal text-[#6d7974]">{draft[flag] ? 'Included in total allocation' : 'Excluded; stored value is preserved'}</span></label>)}</fieldset>
        <p className="mt-4 text-sm font-semibold">Enabled allocation: {Number(enabledTotal(draft)) / 10000}%</p>
        {!draft.enableStock && !draft.enableExpiry && !draft.enableSeason && <p className="mt-2 text-sm text-[#356b54]">All priorities are off. The backend uses baseline Weight W = 1; no importance total is required.</p>}
        <p className="mt-2 text-xs text-[#6d7974]">Changing a value or turning a factor off does not redistribute the other values.</p>
      </Section>
      <Section title="Priority Strength (Lambda)" subtitle="Controls how strongly product priorities affect utility."><label className="block max-w-md text-sm font-medium">Priority Strength (Lambda)<input aria-label="Priority Strength (Lambda)" disabled={readOnly || saving} type="number" min={view.lambdaPolicy.lambdaMin} max={view.lambdaPolicy.lambdaMax} step="0.000001" required className={field} value={draft.lambda} onChange={e => change({ ...draft, lambda: e.target.value })} /></label><p className="mt-2 text-xs text-[#6d7974]">Allowed range: {view.lambdaPolicy.lambdaMin}–{view.lambdaPolicy.lambdaMax}. Set by the Global Lambda Policy.</p></Section>
      {errors.length > 0 && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{errors.map(message => <p key={message}>{message}</p>)}</div>}
      {!readOnly && <Button type="submit" className={primary} disabled={saving || errors.length > 0}><Save size={16} />{saving ? 'Saving…' : 'Save Configuration'}</Button>}
    </form>
  </div>;
}
