import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, LayoutGrid, Loader2, Plus, RefreshCw, Rocket, X } from 'lucide-react';
import { authService } from '../../../services/authService';
import { f07f08Api, type ActiveLayout, type CampaignReport, type CampaignView, type LayoutPolicy, type LayoutProduct, type LayoutSnapshot, type LayoutView, type RecommendationOption } from '../f07f08.api';
import { matchingReport, placementIds, sameIds } from '../f07.designer';
import { simulationUnavailableReason } from '../f08.simulation';
import { F07LayoutDesigner, LayoutStatus } from './F07LayoutDesigner';
import { F08CampaignPanel } from './F08CampaignPanel';
import './F07Workspace.css';

interface Bundle {
  campaign: CampaignView; a: LayoutView; b: LayoutView;
  recommendations: RecommendationOption[]; reports: CampaignReport[]; products: Record<number, LayoutProduct>;
}
const message = (error: unknown) => error instanceof Error ? error.message : 'Unable to complete this action. Refresh to check the current state.';

function ActionError({ error }: { error: string }) {
  const help = /stale|version|409/i.test(error)
    ? 'This campaign has changed since you opened it. Refresh to load the latest changes before trying again.'
    : /fetch|network|connection/i.test(error)
      ? 'We could not connect to the store service. Check your connection and try again.'
      : 'We could not complete this action. Review the details below before trying again.';
  return <div role="alert" className="f07-alert"><AlertCircle size={17} /><div>{help}<details><summary>Error details</summary>{error}</details></div></div>;
}

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
  const discardAllowed = () => !dirty || window.confirm('Discard your unsaved changes to the proposed layout?');
  const refresh = () => { if (!discardAllowed()) return; void run(async () => { await overview(); await loadSnapshots(); if (selectedId !== null) await loadDetails(selectedId); }); };
  const chooseCampaign = (id: number) => { if (!discardAllowed()) return; setError(''); setNotice(''); setSelectedId(id); };
  const reloadCampaign = async (id: number) => {
    const [loaded] = await Promise.all([loadDetails(id), overview()]);
    if (!loaded) throw new Error('The change may have been saved, but its current state could not be loaded. Refresh before submitting another change.');
  };
  const save = () => { if (!bundle) return; void run(async () => {
    await f07f08Api.savePlacements(bundle.b.layoutId, bundle.b.version, ids);
    await reloadCampaign(bundle.campaign.campaignId); setNotice('Proposed layout saved. Scores and product checks are up to date.');
  }); };
  const ready = () => { if (!bundle) return; void run(async () => {
    await f07f08Api.ready(bundle.b.layoutId, bundle.b.version); await reloadCampaign(bundle.campaign.campaignId); setNotice('Proposed layout is ready. You can now compare layouts or choose one for the campaign.');
  }); };
  const preview = () => { if (!bundle || dirty) return; void run(async () => {
    const b = await f07f08Api.preview(bundle.b.layoutId);
    const options = await f07f08Api.recommendations(bundle.campaign.snapshotId);
    setBundle({ ...bundle, b, recommendations: options.items }); setIds(placementIds(b));
    setNotice(b.valid ? 'Product checks passed. All saved groups are available.' : 'Some product groups need attention. Review the highlighted items.');
  }); };
  const create = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !snapshots.some(item => item.snapshotId === Number(snapshotId))) return;
    void run(async () => {
      const created = await f07f08Api.createCampaign(name.trim(), Number(snapshotId), []);
      setCreateOpen(false); setName(''); await overview(); setSelectedId(created.campaignId); setTab('layout'); setNotice('Campaign created. Add approved product groups to your proposed layout.');
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
      await reloadCampaign(bundle.campaign.campaignId); setNotice({ publish: 'Campaign sent to the store manager. It is waiting to be applied.', withdraw: 'Campaign returned to draft. You can edit it again.', activate: 'Campaign applied to the storefront.', end: 'Campaign ended.', rollback: 'Previous storefront layout restored.' }[kind]);
    });
  };
  const simulate = (rangeStart: string, rangeEnd: string) => {
    if (!bundle) return;
    const reason = simulationUnavailableReason({ campaign: bundle.campaign, a: bundle.a, b: bundle.b, merchant, busy: working, dirty });
    if (reason) { setError(reason); return; }
    void run(async () => {
      const report = await f07f08Api.simulate(bundle.campaign.campaignId, { expectedCampaignVersion: bundle.campaign.version, expectedLayoutAVersion: bundle.a.version, expectedLayoutBVersion: bundle.b.version, rangeStart, rangeEnd });
      setBundle(current => current ? { ...current, reports: [report, ...current.reports] } : current);
      setNotice('Comparison saved. Review the results before choosing a layout.');
    });
  };

  if (!user || !['Merchandiser', 'Store Admin'].includes(user.role)) return <p role="alert">Sign in with a Store staff account to view layouts.</p>;
  return <div className="f07-workspace">
    <header className="f07-page-heading"><div><span className="f07-eyebrow">PRODUCT DISPLAY</span><h1>Layouts &amp; Campaigns</h1><p className="f07-muted">Arrange products, compare two layouts and choose what customers see.</p></div><div className="f07-actions"><button className="f07-button" disabled={working} onClick={refresh}><RefreshCw size={15} />Refresh</button>{merchant && <button ref={createFocus} className="f07-button f07-primary" disabled={working} onClick={() => { if (discardAllowed()) setCreateOpen(true); }}><Plus size={16} />New campaign</button>}</div></header>
    {error && <ActionError error={error} />}
    {notice && <div role="status" className="f07-success"><CheckCircle2 size={16} /><span>{notice}</span></div>}
    {loading ? <p role="status" className="f07-loading"><Loader2 size={20} className="animate-spin" />Loading your layouts…</p> : <>
      <div className="f07-context"><div><label className="f07-context-label" htmlFor="f07-campaign">CURRENT CAMPAIGN</label><select id="f07-campaign" aria-label="Working campaign" value={selectedId ?? ''} disabled={working || !campaigns.length} onChange={e => chooseCampaign(Number(e.target.value))}>{!campaigns.length && <option value="">No campaigns yet</option>}{campaigns.map(item => <option key={item.campaignId} value={item.campaignId}>{item.name}</option>)}</select></div><div className="f07-context-meta">{bundle && <><details className="f07-context-details"><summary>Campaign details</summary><p>Campaign #{bundle.campaign.campaignId} · version {bundle.campaign.version}<br />Sales data #{bundle.campaign.snapshotId}</p></details><LayoutStatus value={bundle.campaign.status} /></>}<span>{active?.defaultLayout ? 'In store: default layout' : 'In store: ' + (active?.campaign?.name || '—')}</span></div></div>
      <nav className="f07-tabs" aria-label="Layout and campaign views"><button role="tab" aria-selected={tab === 'layout'} onClick={() => setTab('layout')}><LayoutGrid size={15} />Arrange products</button><button role="tab" aria-selected={tab === 'campaign'} onClick={() => setTab('campaign')}><Rocket size={15} />Compare & apply</button></nav>
      {detailLoading ? <p role="status" className="f07-loading"><Loader2 size={20} className="animate-spin" />Loading this campaign…</p> : bundle && policy ? (tab === 'layout' ?
        <F07LayoutDesigner key={bundle.campaign.campaignId} a={bundle.a} b={bundle.b} policy={policy} recommendations={bundle.recommendations} products={bundle.products} ids={ids} dirty={dirty} canEdit={merchant && bundle.campaign.status === 'DRAFT'} busy={working} onChange={setIds} onSave={save} onPreview={preview} onReady={ready} onReset={() => { if (discardAllowed()) setIds(placementIds(bundle.b)); }} /> :
        <F08CampaignPanel campaign={bundle.campaign} a={bundle.a} b={bundle.b} reports={bundle.reports} snapshot={snapshots.find(item => item.snapshotId === bundle.campaign.snapshotId)} dirty={dirty} busy={working} merchant={merchant} active={active} onDecide={decide} onAction={campaignAction} onSimulate={simulate} onDesign={() => setTab('layout')} />
      ) : !campaigns.length ? <div className="f07-panel f07-empty"><LayoutGrid size={38} /><strong>Your first layout starts here</strong><p>{merchant ? 'Create a campaign using prepared sales data. A reference layout is created automatically, then you can arrange approved product groups in your proposed layout.' : 'Your merchandising team can create a campaign. Its layouts will appear here for you to review and apply.'}</p>{merchant && <button className="f07-button f07-primary" onClick={() => setCreateOpen(true)}><Plus size={15} />Create first campaign</button>}</div> : <div className="f07-panel f07-empty"><AlertCircle size={30} /><strong>Layout could not be loaded</strong><button className="f07-button" onClick={refresh}>Retry loading</button></div>}
    </>}
    <dialog ref={dialog} className="f07-modal f07-panel" onCancel={event => { if (busy) event.preventDefault(); else setCreateOpen(false); }} onClose={() => { setCreateOpen(false); createFocus.current?.focus(); }}>
      <form onSubmit={create}><div className="f07-panel-heading"><div><span className="f07-eyebrow">START A NEW ARRANGEMENT</span><h2>Create a campaign</h2></div><button type="button" className="f07-icon-button" aria-label="Close create campaign" disabled={busy} onClick={() => setCreateOpen(false)}><X size={18} /></button></div><p className="f07-muted">Choose the sales data used to prepare your approved product groups. Both layouts use this data for a fair comparison.</p>
        {error && <ActionError error={error} />}
        <label className="f07-field">Campaign name<input autoFocus required maxLength={120} value={name} disabled={busy} onChange={e => setName(e.target.value)} placeholder="e.g. Weekend essentials" /></label>
        <label className="f07-field">Prepared sales data<select required aria-label="Prepared sales data" value={snapshotId} disabled={busy || !snapshots.length} onChange={e => setSnapshotId(e.target.value)}><option value="" disabled>Select sales data</option>{snapshots.map(item => <option key={item.snapshotId} value={item.snapshotId}>{item.rangeStart} – {item.rangeEnd} · data set {item.snapshotId}</option>)}</select></label>
        {snapshotError && <div role="alert" className="f07-warning">{snapshotError}<button type="button" className="f07-button" disabled={busy} onClick={() => void loadSnapshots()}>Retry</button></div>}
        {!snapshots.length && !snapshotError && <p className="f07-warning">No prepared sales data is available. Prepare the sales data in Utility Planner first.</p>}
        <div className="f07-actions"><button type="button" className="f07-button" disabled={busy} onClick={() => setCreateOpen(false)}>Cancel</button><button className="f07-button f07-primary" disabled={busy || !name.trim() || !snapshotId || !snapshots.length}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Create campaign</button></div>
      </form>
    </dialog>
  </div>;
}
