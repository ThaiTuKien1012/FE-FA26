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
    if (!validLambda(maximum)) { setError('Enter a non-negative Maximum Lambda with at most 24 integer digits and 6 decimal places, without loss of numeric precision.'); return; }
    const ticket = version.current; busy.current = true; setSaving(true); setError(''); setNotice('');
    try { const result = await f03Api.updatePolicy({ lambdaMax: Number(maximum) }); if (ticket !== version.current) return; setPolicy(result); setMaximum(decimalNumber(result.lambdaMax)); setNotice('Lambda policy updated.'); }
    catch (e) { if (ticket === version.current) setError(errorMessage(e, 'Unable to update policy.')); }
    finally { busy.current = false; if (ticket === version.current) setSaving(false); }
  };
  return <div className="f03-planner mx-auto max-w-6xl space-y-5 text-[#191c1b]"><header><h1 className="text-3xl font-semibold">Global Lambda Policy</h1><p className="mt-2 text-sm text-[#6d7974]">Maximum Lambda controls how strongly product priorities can influence utility across stores.</p></header>
    <Notice error={error} notice={notice} /><Button aria-label="Refresh Lambda Policy" disabled={loading || saving || error.includes('Contact your administrator')} className={secondary} onClick={() => void load()}>Refresh</Button>
    {loading ? <p role="status">Loading Lambda Policy…</p> : policy && <>
      <Section title="Current Lambda Range"><Metrics values={[["Allowed range", `0 – ${policy.lambdaMax}`], ['Policy Version', policy.version]]} /><p className="mt-4 text-xs text-[#6d7974]">The lower bound is always 0. This policy applies across stores and is separate from the mining minimum utility threshold.</p></Section>
      <Section title="Update Maximum Lambda"><form onSubmit={event => { event.preventDefault(); void save(); }} className="space-y-4"><label className="block max-w-md text-sm font-medium">Maximum Lambda<input aria-label="Maximum Lambda" disabled={saving} required type="number" min="0" step="0.000001" className={field} value={maximum} onChange={event => setMaximum(event.target.value)} /></label><p className="max-w-3xl rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Lowering the maximum may make a store's Priority Strength invalid. Store settings and saved snapshots are never adjusted automatically.</p><Button type="submit" disabled={saving} className={primary}>{saving ? 'Saving…' : 'Save Policy'}</Button></form></Section>
    </>}
  </div>;
}
