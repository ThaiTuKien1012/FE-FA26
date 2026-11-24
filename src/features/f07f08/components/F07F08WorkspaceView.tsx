import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, RotateCcw, Save, Send, ShoppingBag, Target, XCircle } from 'lucide-react';
import { authService } from '../../../services/authService';
import { f07f08Api, CampaignReport, CampaignView, LayoutPolicy, LayoutView, RecommendationOption } from '../f07f08.api';

const primary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#1e3a2f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2d604a] disabled:cursor-not-allowed disabled:opacity-50';
const secondary = 'inline-flex items-center justify-center gap-2 rounded-lg border border-[#d9e2dc] bg-white px-3 py-2 text-sm font-semibold text-[#315445] hover:bg-[#f0f5ee] disabled:cursor-not-allowed disabled:opacity-50';
const input = 'w-full rounded-lg border border-[#d9e2dc] bg-white px-3 py-2 text-sm outline-none focus:border-[#356b54] focus:ring-2 focus:ring-[#356b54]/15';

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to complete the request.';
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function Status({ value }: { value: string }) {
  const style = value === 'ACTIVE' || value === 'READY' ? 'bg-emerald-50 text-emerald-800' : value === 'PUBLISHED' ? 'bg-amber-50 text-amber-800' : value === 'ENDED' || value === 'ARCHIVED' ? 'bg-slate-100 text-slate-700' : 'bg-[#edf5f0] text-[#315445]';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>{value}</span>;
}

function LayoutCard({ label, layout }: { label: string; layout: LayoutView | null }) {
  if (!layout) return <div className="rounded-xl border border-dashed border-[#d9e2dc] p-4 text-sm text-[#6d7974]">{label} is not loaded.</div>;
  return <article className="rounded-xl border border-[#e7e2d8] bg-white p-4">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#6d7974]">Layout {layout.role}</p><h3 className="mt-1 font-semibold">{layout.name}</h3></div><Status value={layout.status} /></div>
    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-[#6d7974]">Version</dt><dd className="font-semibold">{layout.version}</dd></div><div><dt className="text-xs text-[#6d7974]">Weighted utility</dt><dd className="font-semibold">{layout.weightedUtilityScore ?? '—'}</dd></div><div><dt className="text-xs text-[#6d7974]">Placements</dt><dd className="font-semibold">{layout.placements.length}</dd></div><div><dt className="text-xs text-[#6d7974]">Valid</dt><dd className={layout.valid ? 'font-semibold text-emerald-700' : 'font-semibold text-red-700'}>{layout.valid ? 'Yes' : 'No'}</dd></div></dl>
    {layout.validationErrors.length > 0 && <ul className="mt-3 space-y-1 text-xs text-red-700">{layout.validationErrors.map(error => <li key={error}>• {error}</li>)}</ul>}
  </article>;
}

function PolicyPanel({ policy }: { policy: LayoutPolicy | null }) {
  return <section className="rounded-2xl border border-[#e7e2d8] bg-white p-5"><div className="flex items-start gap-3"><Target className="mt-0.5 h-5 w-5 text-[#356b54]" /><div><h2 className="font-semibold">Layout policy</h2><p className="mt-1 text-sm text-[#6d7974]">{policy?.utilityScoreLabel || 'Weighted utility (snapshot)'}</p></div></div>{policy && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-b border-[#e7e2d8] text-xs uppercase tracking-wider text-[#6d7974]"><tr><th className="px-2 py-2">Zone</th><th className="px-2 py-2">Type</th><th className="px-2 py-2">Max blocks</th><th className="px-2 py-2">Max products</th></tr></thead><tbody>{policy.zones.map(zone => <tr key={zone.zone} className="border-b border-[#f0eee9]"><td className="px-2 py-2 font-medium">{zone.zone}</td><td className="px-2 py-2">{zone.recommendationType || 'Baseline'}</td><td className="px-2 py-2">{zone.maxBlocks ?? 'Unbounded'}</td><td className="px-2 py-2">{zone.maxProducts ?? 'Unbounded'}</td></tr>)}</tbody></table></div>}</section>;
}

export function F07F08WorkspaceView() {
  const user = authService.getCurrentUser();
  const canEdit = user?.role === 'Merchandiser';
  const canActivate = user?.role === 'Store Admin';
  const [policy, setPolicy] = useState<LayoutPolicy | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationOption[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignView[]>([]);
  const [active, setActive] = useState<{ defaultLayout: boolean; campaign: CampaignView | null }>({ defaultLayout: true, campaign: null });
  const [selected, setSelected] = useState<CampaignView | null>(null);
  const [layoutA, setLayoutA] = useState<LayoutView | null>(null);
  const [layoutB, setLayoutB] = useState<LayoutView | null>(null);
  const [selectedRecommendationIds, setSelectedRecommendationIds] = useState<number[]>([]);
  const [report, setReport] = useState<CampaignReport | null>(null);
  const [name, setName] = useState('Local layout campaign');
  const [snapshotId, setSnapshotId] = useState('1');
  const [rangeStart, setRangeStart] = useState('2026-10-03');
  const [rangeEnd, setRangeEnd] = useState('2026-10-31');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const [nextPolicy, nextCampaigns, nextActive] = await Promise.all([f07f08Api.policy(), f07f08Api.campaigns(), f07f08Api.activeLayout()]);
      setPolicy(nextPolicy); setCampaigns(nextCampaigns.items); setActive({ defaultLayout: nextActive.defaultLayout, campaign: nextActive.campaign });
      if (nextCampaigns.items.length && !selected) setSelected(nextCampaigns.items[0]);
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }, [selected]);

  useEffect(() => { void load(); }, [load]);

  const loadCampaign = useCallback(async (campaign: CampaignView) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const [detail, a, b, available, reports] = await Promise.all([
        f07f08Api.campaign(campaign.campaignId), f07f08Api.layout(campaign.layoutAId), f07f08Api.layout(campaign.layoutBId), f07f08Api.recommendations(campaign.snapshotId), f07f08Api.reports(campaign.campaignId)
      ]);
      setSelected(detail); setLayoutA(a); setLayoutB(b); setRecommendations(available.items); setSelectedRecommendationIds(b.placements.map(item => item.recommendationId).filter((id): id is number => id !== null)); setReport(reports.items[0] || null);
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { if (selected) void loadCampaign(selected); }, [selected?.campaignId]);

  const run = async (action: () => Promise<void>) => { setBusy(true); setError(''); setNotice(''); try { await action(); } catch (e) { setError(message(e)); } finally { setBusy(false); } };
  const refreshSelected = async (next: CampaignView) => { setSelected(next); setCampaigns(current => current.map(item => item.campaignId === next.campaignId ? next : item)); await loadCampaign(next); };

  const create = () => void run(async () => { const created = await f07f08Api.createCampaign(name.trim(), Number(snapshotId), []); setCampaigns(current => [created, ...current]); setSelected(created); setNotice(`Campaign ${created.campaignId} created.`); });
  const saveB = () => { if (!layoutB) return; void run(async () => { const updated = await f07f08Api.savePlacements(layoutB.layoutId, layoutB.version, selectedRecommendationIds); setLayoutB(updated); setSelectedRecommendationIds(updated.placements.map(item => item.recommendationId).filter((id): id is number => id !== null)); setNotice('Layout B placements saved.'); }); };
  const markReady = () => { if (!layoutB) return; void run(async () => { const updated = await f07f08Api.ready(layoutB.layoutId, layoutB.version); setLayoutB(updated); setNotice('Layout B is ready.'); }); };
  const decide = (decision: 'KEEP_A' | 'CHOOSE_B') => { if (!selected) return; void run(async () => { const next = await f07f08Api.decision(selected.campaignId, selected.version, decision, report?.reportId); await refreshSelected(next); setNotice(`Decision ${decision} recorded.`); }); };
  const mutateCampaign = (kind: 'publish' | 'withdraw' | 'activate' | 'end' | 'rollback') => { if (!selected) return; void run(async () => { const next = await f07f08Api[kind](selected.campaignId, selected.version); await refreshSelected(next); setNotice(`Campaign ${kind} completed.`); }); };
  const simulate = () => { if (!selected || !layoutA || !layoutB) return; void run(async () => { const next = await f07f08Api.simulate(selected.campaignId, { expectedCampaignVersion: selected.version, expectedLayoutAVersion: layoutA.version, expectedLayoutBVersion: layoutB.version, rangeStart, rangeEnd }); setReport(next); setNotice(`Simulation report ${next.reportId} saved.`); }); };

  const availableById = useMemo(() => new Map(recommendations.map(item => [item.recommendationId, item])), [recommendations]);
  return <div className="mx-auto max-w-7xl space-y-5 text-[#191c1b]">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#356b54]">F07 / F08</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Layouts & campaigns</h1><p className="mt-2 max-w-3xl text-sm text-[#6d7974]">Store-scoped layout editing, offline simulation and campaign lifecycle backed by the live API.</p></div><button className={secondary} disabled={busy} onClick={() => void load()}><RefreshCw className="h-4 w-4" />Refresh</button></header>
    {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
    {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}
    <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><PolicyPanel policy={policy} /><section className="rounded-2xl border border-[#e7e2d8] bg-white p-5"><div className="flex items-start gap-3"><ShoppingBag className="mt-0.5 h-5 w-5 text-[#356b54]" /><div><h2 className="font-semibold">Active storefront</h2><p className="mt-1 text-sm text-[#6d7974]">{active.defaultLayout ? 'Default layout is currently active.' : active.campaign ? `${active.campaign.name} · ${active.campaign.status}` : 'No active campaign.'}</p></div></div><div className="mt-4 flex items-center gap-2 text-sm">{active.defaultLayout ? <XCircle className="h-4 w-4 text-[#6d7974]" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}<span>{active.defaultLayout ? 'Campaign activation has no storefront effect yet.' : 'A campaign layout is active.'}</span></div></section></div>
    <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-2xl border border-[#e7e2d8] bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Campaigns</h2><p className="mt-1 text-xs text-[#6d7974]">{campaigns.length} campaign{campaigns.length === 1 ? '' : 's'} in this Store</p></div>{canEdit && <button className={secondary} disabled={busy} onClick={create}><Save className="h-4 w-4" />Create draft</button>}</div>{canEdit && <div className="mt-4 space-y-2 border-b border-[#e7e2d8] pb-4"><input className={input} value={name} onChange={event => setName(event.target.value)} aria-label="Campaign name" placeholder="Campaign name" /><input className={input} value={snapshotId} onChange={event => setSnapshotId(event.target.value)} aria-label="Snapshot ID" inputMode="numeric" placeholder="Snapshot ID" /></div>}<div className="mt-4 space-y-2">{campaigns.length === 0 && <p className="rounded-lg bg-[#f7f8f5] p-3 text-sm text-[#6d7974]">No campaigns yet. Create one from a snapshot.</p>}{campaigns.map(campaign => <button key={campaign.campaignId} type="button" onClick={() => setSelected(campaign)} className={`w-full rounded-xl border p-3 text-left transition ${selected?.campaignId === campaign.campaignId ? 'border-[#356b54] bg-[#edf5f0]' : 'border-[#e7e2d8] hover:bg-[#f7f8f5]'}`}><div className="flex items-start justify-between gap-2"><span className="font-semibold">{campaign.name}</span><Status value={campaign.status} /></div><p className="mt-1 text-xs text-[#6d7974]">#{campaign.campaignId} · snapshot {campaign.snapshotId} · v{campaign.version}</p></button>)}</div></section>
      <section className="space-y-5"><div className="rounded-2xl border border-[#e7e2d8] bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#6d7974]">Selected campaign</p><h2 className="mt-1 text-xl font-semibold">{selected?.name || 'Choose a campaign'}</h2></div>{selected && <Status value={selected.status} />}</div>{selected && <><div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><div><p className="text-xs text-[#6d7974]">Campaign</p><p className="font-semibold">#{selected.campaignId}</p></div><div><p className="text-xs text-[#6d7974]">Snapshot</p><p className="font-semibold">#{selected.snapshotId}</p></div><div><p className="text-xs text-[#6d7974]">Decision</p><p className="font-semibold">{selected.decision || 'Pending'}</p></div><div><p className="text-xs text-[#6d7974]">Created</p><p className="font-semibold">{formatDate(selected.createdAt)}</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-2"><LayoutCard label="Layout A" layout={layoutA} /><LayoutCard label="Layout B" layout={layoutB} /></div></>}</div>
        {selected && canEdit && layoutB && <section className="rounded-2xl border border-[#e7e2d8] bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">Edit Layout B</h2><p className="mt-1 text-sm text-[#6d7974]">Choose whole recommendation blocks. The backend validates caps and eligibility.</p></div><span className="text-xs text-[#6d7974]">v{layoutB.version}</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{recommendations.map(option => <label key={option.recommendationId} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${selectedRecommendationIds.includes(option.recommendationId) ? 'border-[#356b54] bg-[#edf5f0]' : 'border-[#e7e2d8]'}`}><input type="checkbox" checked={selectedRecommendationIds.includes(option.recommendationId)} onChange={() => setSelectedRecommendationIds(current => current.includes(option.recommendationId) ? current.filter(id => id !== option.recommendationId) : [...current, option.recommendationId])} className="mt-1 accent-[#356b54]" /><span><span className="font-semibold">#{option.recommendationId} · {option.type}</span><span className="mt-1 block text-xs text-[#6d7974]">{option.productIds.length} products · utility {option.utility}</span></span></label>)}{recommendations.length === 0 && <p className="text-sm text-[#6d7974]">No approved, ready recommendations are available for snapshot {selected.snapshotId}.</p>}</div><div className="mt-4 flex flex-wrap gap-2"><button className={secondary} disabled={busy} onClick={saveB}><Save className="h-4 w-4" />Save placements</button><button className={primary} disabled={busy || !layoutB.valid} onClick={markReady}><CheckCircle2 className="h-4 w-4" />Mark B ready</button></div></section>}
        {selected && <section className="rounded-2xl border border-[#e7e2d8] bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">Campaign actions</h2><p className="mt-1 text-sm text-[#6d7974]">Actions stay synchronous; the returned version is used for the next mutation.</p></div><RotateCcw className="h-5 w-5 text-[#6d7974]" /></div><div className="mt-4 flex flex-wrap gap-2">{canEdit && selected.status === 'DRAFT' && <><button className={secondary} disabled={busy} onClick={() => decide('KEEP_A')}>Keep A</button><button className={secondary} disabled={busy} onClick={() => decide('CHOOSE_B')}>Choose B</button><button className={primary} disabled={busy || selected.decision === null} onClick={() => mutateCampaign('publish')}><Send className="h-4 w-4" />Publish</button></>}{canEdit && selected.status === 'PUBLISHED' && <button className={secondary} disabled={busy} onClick={() => mutateCampaign('withdraw')}>Withdraw</button>}{canActivate && selected.status === 'PUBLISHED' && <button className={primary} disabled={busy} onClick={() => mutateCampaign('activate')}>Activate</button>}{canActivate && selected.status === 'ACTIVE' && <><button className={secondary} disabled={busy} onClick={() => mutateCampaign('end')}>End campaign</button><button className={secondary} disabled={busy} onClick={() => mutateCampaign('rollback')}>Rollback</button></>}</div></section>}
        {selected && canEdit && layoutA && layoutB && <section className="rounded-2xl border border-[#e7e2d8] bg-white p-5"><div><h2 className="font-semibold">Offline A/B simulation</h2><p className="mt-1 text-sm text-[#6d7974]">Use an evaluation period strictly after snapshot {selected.snapshotId}'s training range.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm">Start date<input className={input} type="date" value={rangeStart} onChange={event => setRangeStart(event.target.value)} /></label><label className="text-sm">End date<input className={input} type="date" value={rangeEnd} onChange={event => setRangeEnd(event.target.value)} /></label></div><button className={`${primary} mt-4`} disabled={busy || !layoutA.valid || !layoutB.valid} onClick={simulate}><Loader2 className={`h-4 w-4 ${busy ? 'animate-spin' : 'hidden'}`} />Run simulation</button>{report && <div className="mt-4 rounded-xl bg-[#f7f8f5] p-4 text-sm"><p className="font-semibold">Report #{report.reportId} · {report.algorithmVersion}</p><p className="mt-1 text-xs text-[#6d7974]">{report.evaluationCount} evaluation transactions · {report.rangeStart} → {report.rangeEnd}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{report.layouts.map(item => <div key={item.layoutId} className="rounded-lg border border-[#e7e2d8] bg-white p-3"><p className="font-semibold">Layout {item.role}</p><p className="mt-1 text-xs">Hit rate: {item.hitRate?.rate == null ? 'N/A' : `${(item.hitRate.rate * 100).toFixed(1)}%`}</p><p className="text-xs">Captured utility: {item.capturedUtility?.rate == null ? 'N/A' : `${(item.capturedUtility.rate * 100).toFixed(1)}%`}</p></div>)}</div></div>}</section>}
      </section>
    </div>
    {busy && <p role="status" className="flex items-center gap-2 text-xs text-[#6d7974]"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading live F07/F08 data…</p>}
  </div>;
}
