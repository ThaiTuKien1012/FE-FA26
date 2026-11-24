import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, LayoutGrid, Loader2, Plus, RefreshCw, Rocket, X } from 'lucide-react';
import { authService } from '../../../services/authService';
import { f07f08Api, type ActiveLayout, type CampaignReport, type CampaignView, type LayoutPolicy, type LayoutProduct, type LayoutSnapshot, type LayoutView, type RecommendationOption } from '../f07f08.api';
import { matchingReport, placementIds, sameIds } from '../f07.designer';
import { F07LayoutDesigner, LayoutStatus } from './F07LayoutDesigner';
import { F08CampaignPanel } from './F08CampaignPanel';
import './F07Workspace.css';

interface Bundle {
  campaign: CampaignView; a: LayoutView; b: LayoutView;
  recommendations: RecommendationOption[]; reports: CampaignReport[]; products: Record<number, LayoutProduct>;
}
const message = (error: unknown) => error instanceof Error ? error.message : 'Unable to complete this action. Refresh to check the current state.';

export function F07F08WorkspaceView() {
  const user = authService.getCurrentUser();
  const merchant = user?.role === 'Merchandiser';
  const [policy, setPolicy] = useState<LayoutPolicy | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignView[]>([]);
  const [snapshots, setSnapshots] = useState<LayoutSnapshot[]>([]);
  const [snapshotError, setSnapshotError] = useState('');
  const [active, setActive] = useState<ActiveLayout | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [ids, setIds] = useState<number[]>([]);
  const [tab, setTab] = useState<'layout' | 'campaign'>('layout');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [snapshotId, setSnapshotId] = useState('');
  const detailRequest = useRef<AbortController | null>(null);
  const actionLock = useRef(false);
  const alive = useRef(true);
  const createFocus = useRef<HTMLButtonElement | null>(null);
  const dialog = useRef<HTMLDialogElement | null>(null);
  const dirty = !!bundle && !sameIds(ids, placementIds(bundle.b));
  const working = loading || detailLoading || busy;

  const overview = useCallback(async (signal?: AbortSignal) => {
    const [nextPolicy, nextCampaigns, nextActive] = await Promise.all([f07f08Api.policy(signal), f07f08Api.campaigns(signal), f07f08Api.activeLayout(signal)]);
    if (!alive.current || signal?.aborted) return;
    setPolicy(nextPolicy); setCampaigns(nextCampaigns.items); setActive(nextActive);
    setSelectedId(current => current && nextCampaigns.items.some(item => item.campaignId === current) ? current : nextCampaigns.items[0]?.campaignId ?? null);
  }, []);

  const loadSnapshots = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await f07f08Api.snapshots(signal);
      if (!alive.current || signal?.aborted) return;
      const ready = result.items.filter(item => item.status === 'READY');
      setSnapshots(ready); setSnapshotId(current => current || String(ready[0]?.snapshotId || '')); setSnapshotError('');
    } catch (e) { if (alive.current && !signal?.aborted) setSnapshotError(message(e)); }
  }, []);

  const loadDetails = useCallback(async (id: number) => {
    detailRequest.current?.abort();
    const controller = new AbortController(); detailRequest.current = controller;
    const signal = controller.signal;
    setDetailLoading(true); setBundle(null); setIds([]);
    try {
      const campaign = await f07f08Api.campaign(id, signal);
      const [a, b, recommendations, reports] = await Promise.all([
        f07f08Api.layout(campaign.layoutAId, signal), f07f08Api.layout(campaign.layoutBId, signal),
        f07f08Api.recommendations(campaign.snapshotId, signal), f07f08Api.reports(id, signal)
      ]);
      const products: Record<number, LayoutProduct> = {};
      for (const row of [...a.placements, ...b.placements]) products[row.productId] = { id: row.productId, name: row.productName, sku: row.sku };
      const missing = [...new Set(recommendations.items.flatMap(item => item.productIds))].filter(product => !products[product]);
      for (let offset = 0; offset < missing.length; offset += 8) {
        signal.throwIfAborted();
        const results = await Promise.allSettled(missing.slice(offset, offset + 8).map(product => f07f08Api.product(product, signal)));
        for (const result of results) if (result.status === 'fulfilled') products[result.value.id] = result.value;
      }
      signal.throwIfAborted();
      if (!alive.current) return;
      setBundle({ campaign, a, b, recommendations: recommendations.items, reports: reports.items, products });
      setIds(placementIds(b));
      setCampaigns(current => current.map(item => item.campaignId === id ? campaign : item));
      return true;
    } catch (e) {
      if (alive.current && !signal.aborted) setError(message(e));
      return false;
    } finally { if (alive.current && detailRequest.current === controller) setDetailLoading(false); }
  }, []);

  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    void overview(controller.signal).catch(e => { if (!controller.signal.aborted) setError(message(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    void loadSnapshots(controller.signal);
    return () => { alive.current = false; controller.abort(); detailRequest.current?.abort(); };
  }, [overview, loadSnapshots]);
  useEffect(() => { if (selectedId !== null) void loadDetails(selectedId); }, [selectedId, loadDetails]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    if (createOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [createOpen]);

  const run = async (action: () => Promise<void>) => {
    if (actionLock.current) return;
    actionLock.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); }
    catch (e) { if (alive.current) setError(message(e) + ((e as { status?: number }).status === 409 ? ' Reload the latest layout before making another change.' : '')); }
    finally { actionLock.current = false; if (alive.current) setBusy(false); }
  };
  const discardAllowed = () => !dirty || window.confirm('Discard unsaved Layout B changes?');
  const refresh = () => { if (!discardAllowed()) return; void run(async () => { await overview(); await loadSnapshots(); if (selectedId !== null) await loadDetails(selectedId); }); };
  const chooseCampaign = (id: number) => { if (!discardAllowed()) return; setError(''); setNotice(''); setSelectedId(id); };
  const reloadCampaign = async (id: number) => {
    const [loaded] = await Promise.all([loadDetails(id), overview()]);
    if (!loaded) throw new Error('The change may have been saved, but its current state could not be loaded. Refresh before submitting another change.');
  };
  const save = () => { if (!bundle) return; void run(async () => {
    await f07f08Api.savePlacements(bundle.b.layoutId, bundle.b.version, ids);
    await reloadCampaign(bundle.campaign.campaignId); setNotice('Layout B saved. Scores and validation are up to date.');
  }); };
  const ready = () => { if (!bundle) return; void run(async () => {
    await f07f08Api.ready(bundle.b.layoutId, bundle.b.version); await reloadCampaign(bundle.campaign.campaignId); setNotice('Layout B is ready for the campaign decision.');
  }); };
  const preview = () => { if (!bundle || dirty) return; void run(async () => {
    const b = await f07f08Api.preview(bundle.b.layoutId);
    const options = await f07f08Api.recommendations(bundle.campaign.snapshotId);
    setBundle({ ...bundle, b, recommendations: options.items }); setIds(placementIds(b));
    setNotice(b.valid ? 'Saved layout is valid. Recommendations were rechecked.' : 'Validation found issues. Review the highlighted blocks.');
  }); };
  const create = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !snapshots.some(item => item.snapshotId === Number(snapshotId))) return;
    void run(async () => {
      const created = await f07f08Api.createCampaign(name.trim(), Number(snapshotId), []);
      setCreateOpen(false); setName(''); await overview(); setSelectedId(created.campaignId); setTab('layout'); setNotice('Campaign created. Add approved recommendations to Layout B.');
    });
  };
  const decide = (decision: 'KEEP_A' | 'CHOOSE_B', report: CampaignReport | null) => {
    if (!bundle || dirty) return;
    void run(async () => {
      await f07f08Api.decision(bundle.campaign.campaignId, bundle.campaign.version, decision, matchingReport(report, bundle.a, bundle.b) ? report!.reportId : undefined);
      await reloadCampaign(bundle.campaign.campaignId); setNotice('Campaign decision saved.');
    });
  };
  const campaignAction = (kind: 'publish' | 'withdraw' | 'activate' | 'end' | 'rollback') => {
    if (!bundle || dirty) return;
    void run(async () => {
      await f07f08Api[kind](bundle.campaign.campaignId, bundle.campaign.version);
      await reloadCampaign(bundle.campaign.campaignId); setNotice('Campaign ' + kind + ' completed.');
    });
  };
  const simulate = (rangeStart: string, rangeEnd: string) => {
    if (!bundle || dirty) return;
    void run(async () => {
      const report = await f07f08Api.simulate(bundle.campaign.campaignId, { expectedCampaignVersion: bundle.campaign.version, expectedLayoutAVersion: bundle.a.version, expectedLayoutBVersion: bundle.b.version, rangeStart, rangeEnd });
      setBundle(current => current ? { ...current, reports: [report, ...current.reports] } : current);
      setNotice('Offline simulation report saved.');
    });
  };

  if (!user || !['Merchandiser', 'Store Admin'].includes(user.role)) return <p role="alert">Sign in with a Store staff account to view layouts.</p>;
  return <div className="f07-workspace">
    <header className="f07-page-heading"><div><span className="f07-eyebrow">MERCHANDISING WORKSPACE</span><h1>Layout Simulator</h1><p className="f07-muted">Arrange approved product recommendations into a clear, balanced storefront.</p></div><div className="f07-actions"><button className="f07-button" disabled={working} onClick={refresh}><RefreshCw size={15} />Refresh</button>{merchant && <button ref={createFocus} className="f07-button f07-primary" disabled={working} onClick={() => { if (discardAllowed()) setCreateOpen(true); }}><Plus size={16} />New campaign</button>}</div></header>
    {error && <div role="alert" className="f07-alert"><AlertCircle size={17} /><span>{error}</span></div>}
    {notice && <div role="status" className="f07-success"><CheckCircle2 size={16} /><span>{notice}</span></div>}
    {loading ? <p role="status" className="f07-loading"><Loader2 size={20} className="animate-spin" />Loading your layouts…</p> : <>
      <div className="f07-context"><div><label className="f07-context-label" htmlFor="f07-campaign">WORKING CAMPAIGN</label><select id="f07-campaign" aria-label="Working campaign" value={selectedId ?? ''} disabled={working || !campaigns.length} onChange={e => chooseCampaign(Number(e.target.value))}>{!campaigns.length && <option value="">No campaigns yet</option>}{campaigns.map(item => <option key={item.campaignId} value={item.campaignId}>{item.name} · #{item.campaignId}</option>)}</select></div><div className="f07-context-meta">{bundle && <><span>Snapshot #{bundle.campaign.snapshotId}</span><span>Campaign v{bundle.campaign.version}</span><LayoutStatus value={bundle.campaign.status} /></>}<span>{active?.defaultLayout ? 'Storefront: default layout' : 'Active: ' + (active?.campaign?.name || '—')}</span></div></div>
      <nav className="f07-tabs" aria-label="Layout and campaign views"><button role="tab" aria-selected={tab === 'layout'} onClick={() => setTab('layout')}><LayoutGrid size={15} />F07 · Layout design</button><button role="tab" aria-selected={tab === 'campaign'} onClick={() => setTab('campaign')}><Rocket size={15} />F08 · Campaign & simulation</button></nav>
      {detailLoading ? <p role="status" className="f07-loading"><Loader2 size={20} className="animate-spin" />Loading this campaign…</p> : bundle && policy ? (tab === 'layout' ?
        <F07LayoutDesigner key={bundle.campaign.campaignId} a={bundle.a} b={bundle.b} policy={policy} recommendations={bundle.recommendations} products={bundle.products} ids={ids} dirty={dirty} canEdit={merchant && bundle.campaign.status === 'DRAFT'} busy={working} onChange={setIds} onSave={save} onPreview={preview} onReady={ready} onReset={() => { if (discardAllowed()) setIds(placementIds(bundle.b)); }} /> :
        <F08CampaignPanel campaign={bundle.campaign} a={bundle.a} b={bundle.b} reports={bundle.reports} snapshot={snapshots.find(item => item.snapshotId === bundle.campaign.snapshotId)} dirty={dirty} busy={working} merchant={merchant} active={active} onDecide={decide} onAction={campaignAction} onSimulate={simulate} onDesign={() => setTab('layout')} />
      ) : !campaigns.length ? <div className="f07-panel f07-empty"><LayoutGrid size={38} /><strong>Your first layout starts here</strong><p>{merchant ? 'Create a campaign from a ready snapshot. Baseline A is generated automatically, then you can build Layout B with approved F06 recommendations.' : 'A Merchandiser can create a campaign. Its A/B layouts will appear here for review.'}</p>{merchant && <button className="f07-button f07-primary" onClick={() => setCreateOpen(true)}><Plus size={15} />Create first campaign</button>}</div> : <div className="f07-panel f07-empty"><AlertCircle size={30} /><strong>Layout could not be loaded</strong><button className="f07-button" onClick={refresh}>Retry loading</button></div>}
    </>}
    <dialog ref={dialog} className="f07-modal f07-panel" onCancel={event => { if (busy) event.preventDefault(); else setCreateOpen(false); }} onClose={() => { setCreateOpen(false); createFocus.current?.focus(); }}>
      <form onSubmit={create}><div className="f07-panel-heading"><div><span className="f07-eyebrow">START A NEW ARRANGEMENT</span><h2>Create a campaign</h2></div><button type="button" className="f07-icon-button" aria-label="Close create campaign" disabled={busy} onClick={() => setCreateOpen(false)}><X size={18} /></button></div><p className="f07-muted">Choose the snapshot used by your approved recommendations. A and B always share the same source.</p>
        {error && <p role="alert" className="f07-alert">{error}</p>}
        <label className="f07-field">Campaign name<input autoFocus required maxLength={120} value={name} disabled={busy} onChange={e => setName(e.target.value)} placeholder="e.g. Weekend essentials" /></label>
        <label className="f07-field">Ready snapshot<select required aria-label="Ready snapshot" value={snapshotId} disabled={busy || !snapshots.length} onChange={e => setSnapshotId(e.target.value)}><option value="" disabled>Select a snapshot</option>{snapshots.map(item => <option key={item.snapshotId} value={item.snapshotId}>Snapshot #{item.snapshotId} · {item.rangeStart} – {item.rangeEnd}</option>)}</select></label>
        {snapshotError && <div role="alert" className="f07-warning">{snapshotError}<button type="button" className="f07-button" disabled={busy} onClick={() => void loadSnapshots()}>Retry</button></div>}
        {!snapshots.length && !snapshotError && <p className="f07-warning">No ready snapshot is available. Create one in Utility Planner first.</p>}
        <div className="f07-actions"><button type="button" className="f07-button" disabled={busy} onClick={() => setCreateOpen(false)}>Cancel</button><button className="f07-button f07-primary" disabled={busy || !name.trim() || !snapshotId || !snapshots.length}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Create campaign</button></div>
      </form>
    </dialog>
  </div>;
}
