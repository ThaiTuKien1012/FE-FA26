import { useEffect, useRef, useState } from 'react';
import { f03Api, type F03Policy } from '../f03.api';
import { decimalNumber, validLambda } from '../f03.validation';
import { Button, errorMessage, field, Metrics, Notice, primary, secondary, Section } from './F03Shared';

export function GlobalLambdaPolicy() {
  const [policy, setPolicy] = useState<F03Policy | null>(null), [maximum, setMaximum] = useState('');
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const busy = useRef(false), version = useRef(0);
  const load = async () => { const current = ++version.current; setLoading(true); setError(''); try { const result = await f03Api.getPolicy(); if (current === version.current) { setPolicy(result); setMaximum(decimalNumber(result.lambdaMax)); } } catch (e) { if (current === version.current) setError(errorMessage(e, 'Unable to load policy.')); } finally { if (current === version.current) setLoading(false); } };
  useEffect(() => { void load(); return () => { ++version.current; }; }, []);
  const save = async () => {
    if (busy.current || !policy) return;
    if (!validLambda(maximum)) { setError('Enter a non-negative Maximum Priority Strength with at most 24 integer digits and 6 decimal places, without loss of numeric precision.'); return; }
    const ticket = version.current; busy.current = true; setSaving(true); setError(''); setNotice('');
    try { const result = await f03Api.updatePolicy({ lambdaMax: maximum }); if (ticket !== version.current) return; setPolicy(result); setMaximum(decimalNumber(result.lambdaMax)); setNotice('Priority Strength Policy updated.'); }
    catch (e) { if (ticket === version.current) setError(errorMessage(e, 'Unable to update policy.')); }
    finally { busy.current = false; if (ticket === version.current) setSaving(false); }
  };
  return <div className="f03-planner mx-auto max-w-6xl space-y-5 text-[#191c1b]"><header><h1 className="text-3xl font-semibold">Priority Strength Policy</h1><p className="mt-2 text-sm text-[#6d7974]">Set the maximum Priority Strength that stores can use when calculating weighted utility.</p></header>
    <Notice error={error} notice={notice} /><Button aria-label="Refresh Priority Strength Policy" disabled={loading || saving || error.includes('Contact your administrator')} className={secondary} onClick={() => void load()}>Refresh</Button>
    {loading ? <p role="status">Loading Priority Strength Policy…</p> : policy && <>
      <Section title="Current Priority Strength Policy"><Metrics values={[["Allowed Range", `0 – ${policy.lambdaMax}`], ['Current Maximum', policy.lambdaMax], ['Policy Version', policy.version]]} /><p className="mt-4 text-xs text-[#6d7974]">Priority Strength affects the weighting used to create F03 snapshots. Minimum Utility filters product combinations in F05; these are separate settings.</p></Section>
      <Section title="Edit Priority Strength Policy"><form onSubmit={event => { event.preventDefault(); void save(); }} className="space-y-4"><label className="block max-w-md text-sm font-medium">Maximum Priority Strength (λ)<input aria-label="Maximum Priority Strength (λ)" disabled={saving} required type="number" min="0" step="0.000001" className={field} value={maximum} onChange={event => setMaximum(event.target.value)} /></label><p className="text-xs text-[#6d7974]">Stores can choose a Priority Strength between 0 and this maximum.</p><p className="max-w-3xl rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Lowering this limit may make some existing store settings invalid. Saved snapshots are not changed automatically.</p><Button type="submit" disabled={saving} className={primary}>{saving ? 'Saving…' : 'Save Policy'}</Button></form></Section>
    </>}
  </div>;
}
