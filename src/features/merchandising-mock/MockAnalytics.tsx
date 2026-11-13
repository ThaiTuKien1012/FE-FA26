import React, { useId, useState } from 'react';
import type { MockState } from './mock.types';
import { benchmarkEligibility, benchmarkMatchFields, benchmarkPairs } from './mock.benchmarks';

const number = (value: number) => value.toLocaleString('en-US');
const money = (value: number) => `${number(value)} VND`;
const card = 'min-w-0 rounded-2xl border border-emerald-100 bg-white p-5';

function MetricBars({ title, a, b, format }: { title: string; a: number; b: number; format: (value: number) => string }) {
  const max = Math.max(a, b, 1);
  return <section className={card} aria-label={title}>
    <h3 className="font-semibold text-emerald-950">{title}</h3>
    <div className="mt-4 space-y-4">{[['A', a], ['B', b]].map(([label, value]) => <div key={label}>
      <div className="mb-1 flex flex-wrap justify-between gap-2 text-sm"><span>{label === 'A' ? 'A · Baseline' : 'B · Proposed'}</span><strong>{format(Number(value))}</strong></div>
      <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-emerald-50"><div className={`h-full rounded-full ${label === 'A' ? 'bg-emerald-300' : 'bg-emerald-800'}`} style={{ width: `${Number(value) / max * 100}%` }} /></div>
    </div>)}</div>
  </section>;
}

export function MockAnalytics({ state, storeId }: { state: MockState; storeId: string }) {
  const selectorId = useId();
  const campaigns = state.campaigns.filter(campaign => campaign.storeId === storeId);
  const [selectedId, setSelectedId] = useState('');
  const campaign = campaigns.find(item => item.id === selectedId) ?? campaigns.at(-1);
  const result = campaign?.result;
  const layouts = state.layouts.filter(layout => layout.storeId === storeId);
  const layoutName = (id: string | null) => id === null ? 'Neutral catalog' : (() => {
    const layout = layouts.find(item => item.id === id);
    return layout ? `${layout.name} · v${layout.version}` : 'Unavailable layout';
  })();
  const activeId = state.activeByStore[storeId];
  const completed = campaigns.filter(item => item.result);

  return <div className="min-w-0 space-y-6 text-emerald-950">
    <header>
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">F11 · Simulation analytics</p>
      <h2 className="mt-1 text-2xl font-bold">Merchandising insights</h2>
      <p className="mt-2 text-sm text-slate-600">Simulation only. All results use fixture data; no live sales or customer telemetry.</p>
      <p className="mt-3 text-sm"><strong>Current active layout:</strong> {activeId ? layoutName(activeId) : 'No active layout'}</p>
    </header>
    {campaigns.length > 0 && <div className={card}>
      <label htmlFor={selectorId} className="block text-sm font-semibold">Campaign simulation</label>
      <select id={selectorId} value={campaign?.id ?? ''} onChange={event => setSelectedId(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-emerald-200 bg-white px-3">
        {campaigns.map(item => <option key={item.id} value={item.id}>{item.name}{item.result ? '' : ' · not simulated'}</option>)}
      </select>
      {campaign && <p className="mt-3 text-sm text-slate-600">A: {layoutName(campaign.baselineId)} / B: {layoutName(campaign.proposedId)}</p>}
    </div>}
    {result ? <>
      <p className="text-sm text-slate-600">Stored simulated run · seed {result.seed} · {number(result.visitors)} fixture visitors per arm. Utility measures fixture weights, independently of revenue.</p>
      <div className="grid min-w-0 gap-4 md:grid-cols-3">
        <MetricBars title="Simulated total utility" a={result.a.utility} b={result.b.utility} format={value => `${number(value)} fixture utility units`} />
        <MetricBars title="Simulated bundle revenue" a={result.a.revenue} b={result.b.revenue} format={money} />
        <MetricBars title="Simulated orders" a={result.a.orders} b={result.b.orders} format={value => `${number(value)} orders`} />
      </div>
    </> : <div className={`${card} text-sm text-slate-600`}><h3 className="font-semibold text-emerald-950">No simulation results yet</h3><p className="mt-2">Run this store’s campaign simulation to see utility, bundle revenue and A/B results.</p></div>}

    <section className={card}>
      <h3 className="text-lg font-semibold">Layout performance · stored simulations</h3>
      <p className="mt-1 text-sm text-slate-600">One row per simulated arm and campaign. Different runs are not a ranking or a forecast.</p>
      {completed.length === 0 ? <p className="mt-4 text-sm">No stored layout performance for this store.</p> : <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm"><caption className="sr-only">Simulated layout performance for the selected store</caption>
          <thead><tr>{['Campaign / arm', 'Layout', 'Orders', 'Revenue (VND)', 'Fixture utility units'].map(label => <th key={label} className="border-b p-3 font-semibold">{label}</th>)}</tr></thead>
          <tbody>{completed.flatMap(item => (['a', 'b'] as const).map(arm => {
            const metrics = item.result![arm];
            return <tr key={`${item.id}-${arm}`}><th scope="row" className="border-b border-emerald-50 p-3 font-medium">{item.name} · {arm.toUpperCase()}</th><td className="p-3">{layoutName(arm === 'a' ? item.baselineId : item.proposedId)}</td><td className="p-3">{number(metrics.orders)}</td><td className="p-3 whitespace-nowrap">{money(metrics.revenue)}</td><td className="p-3">{number(metrics.utility)}</td></tr>;
          }))}</tbody>
        </table>
      </div>}
    </section>

    <section className={`${card} space-y-4`}>
      <div><h3 className="text-lg font-semibold">Synthetic historical benchmark fixtures</h3><p className="mt-1 text-sm text-slate-600">Invented demonstration records, not measured HUI-Miner or EFIM performance. No algorithm superiority is established.</p></div>
      {benchmarkPairs.map(pair => {
        const mismatches = benchmarkEligibility(pair.huiMiner, pair.efim);
        const eligible = mismatches.length === 0;
        return <article key={pair.id} className="min-w-0 rounded-xl bg-emerald-50/60 p-4">
          <h4 className="font-semibold">{pair.name}</h4>
          <p className="mt-1 text-sm font-semibold">{eligible ? 'MATCH · eligible synthetic fixture comparison' : `Excluded from comparison · mismatch: ${mismatches.join(', ')}`}</p>
          <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm">
            <caption className="sr-only">Matching conditions for {pair.name}</caption>
            <thead><tr><th className="p-2">Condition</th><th className="p-2">HUI-Miner</th><th className="p-2">EFIM</th></tr></thead>
            <tbody>{benchmarkMatchFields.map(key => <tr key={key}><th scope="row" className="p-2 font-medium">{key}</th><td className="max-w-64 break-words p-2">{pair.huiMiner[key]}</td><td className="max-w-64 break-words p-2">{pair.efim[key]}</td></tr>)}</tbody>
          </table></div>
          {eligible && <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">{([
            {key:'medianMs',label:'Median runtime · synthetic historical',unit:'ms'},
            {key:'peakMemoryMb',label:'Peak memory · synthetic historical',unit:'MB'},
          ] as const).map(metric=><section key={metric.key} aria-label={metric.label} className="min-w-0 rounded-lg bg-white p-4"><h5 className="mb-3 text-sm font-semibold">{metric.label}</h5>{[pair.huiMiner,pair.efim].map(run=><div key={run.algorithm} className="mt-3"><p className="flex flex-wrap justify-between gap-2 text-sm"><span>{run.algorithm}</span><strong>{run[metric.key]} {metric.unit}</strong></p><div className="h-3 rounded-full bg-emerald-50" aria-hidden="true"><div className={`h-full rounded-full ${run.algorithm==='EFIM'?'bg-emerald-800':'bg-emerald-300'}`} style={{width:`${run[metric.key]/Math.max(pair.huiMiner[metric.key],pair.efim[metric.key],1)*100}%`}} /></div></div>)}</section>)}</div>}
        </article>;
      })}
    </section>
  </div>;
}
