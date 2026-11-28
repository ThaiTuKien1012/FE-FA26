import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { f07f08Api, type CampaignView } from '../f07f08/f07f08.api';
import { comparisonLabel } from '../f07f08/f08.simulation';
import { F08ReportDetails } from '../f07f08/components/F08ReportDetails';
import { f11Api } from './f11.api';
import { defaultPeriod, dashboardError, formatScore, periodError, shiftDate } from './f11.model';
import { BundleActivity } from './BundleActivity';
import type { AdditionFilter } from './f11.types';
import '../f07f08/components/F07Workspace.css';
import './f11.css';

function useResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ loader?: typeof load; data?: T; error?: unknown; loading: boolean }>({ loading: true });
  useEffect(() => {
    const controller = new AbortController();
    setState({ loader: load, loading: true });
    load(controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ loader: load, data, loading: false });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ loader: load, error, loading: false });
    });
    return () => controller.abort();
  }, [load, attempt]);
  // Hide previous selections immediately, before the effect starts the next request.
  const current = state.loader === load ? state : { loading: true, data: undefined, error: undefined };
  return { ...current, retry: () => setAttempt(value => value + 1) };
}
function Failure({ error, retry }: { error: unknown; retry: () => void }) {
  return <div className="f11-error" role="alert"><p>{dashboardError(error)}</p><button className="f07-button" onClick={retry}>Retry loading</button></div>;
}
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="f07-panel f11-panel" aria-label={title}><h2>{title}</h2>{children}</section>;
}
function SnapshotPanel() {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [snapshotInput, setSnapshotInput] = useState('');
  const [snapshotId, setSnapshotId] = useState<number>();
  const [missingSnapshot, setMissingSnapshot] = useState(false);
  const resource = useResource(useCallback((signal: AbortSignal) => f11Api.snapshots(page, size, signal, snapshotId), [page, size, snapshotId]));
  const reset = () => { setSnapshotInput(''); setSnapshotId(undefined); setPage(0); setMissingSnapshot(false); };
  useEffect(() => {
    if ((resource.error as { status?: number })?.status === 404 && snapshotId !== undefined) {
      setSnapshotInput(''); setSnapshotId(undefined); setPage(0); setMissingSnapshot(true);
    }
  }, [resource.error, snapshotId]);
  return <Panel title="Snapshot utilities">
    <p className="f07-muted">READY snapshots, newest first. Frozen weighted utility is a priority score, not revenue or profit.</p>
    <form className="f11-snapshot-filter" onSubmit={event => { event.preventDefault(); setPage(0); setMissingSnapshot(false); setSnapshotId(snapshotInput ? Number(snapshotInput) : undefined); }}>
      <label className="f07-field">Snapshot ID (optional)<input type="number" min="1" max="2147483647" step="1" value={snapshotInput} onChange={event => setSnapshotInput(event.target.value)} placeholder="All READY snapshots" /></label>
      <button className="f07-button f07-primary" disabled={resource.loading}>Find snapshot</button>
      <button className="f07-button" type="button" onClick={reset}>Clear snapshot filter</button>
    </form>
    {missingSnapshot && <p role="status">The selected snapshot was not found. The Store snapshot list has been refreshed.</p>}
    <label className="f07-field">Snapshots per page<select value={size} onChange={event => { setSize(Number(event.target.value)); setPage(0); }}>{[20, 50, 100].map(value => <option key={value}>{value}</option>)}</select></label>
    {resource.loading && <p role="status">Loading snapshots…</p>}
    {!!resource.error && <Failure error={resource.error} retry={() => { if ((resource.error as { status?: number }).status === 404 && snapshotId !== undefined) reset(); else resource.retry(); }} />}
    {resource.data && <>
      {resource.data.items.length === 0 ? <p role="status">No READY snapshots on this page.</p> : <div className="f11-table-scroll" tabIndex={0} role="region" aria-label="Snapshot utility table"><table className="f11-table"><thead><tr><th scope="col">Snapshot</th><th scope="col">Window</th><th scope="col">Analysis date</th><th scope="col">Weighted utility</th></tr></thead><tbody>{resource.data.items.map(item => <tr key={item.snapshotId}><th scope="row">#{item.snapshotId}</th><td>{item.rangeStart} – {item.rangeEnd}</td><td>{item.analysisDate}</td><td>{formatScore(item.totalWeightedUtility)}</td></tr>)}</tbody></table></div>}
    </>}
    <div className="f07-actions f11-pagination"><button className="f07-button" disabled={page === 0 || resource.loading} onClick={() => setPage(value => value - 1)}>Previous page</button><span>Page {page + 1}{resource.data && ` · ${resource.data.totalElements} snapshots`}</span><button className="f07-button" disabled={!resource.data || resource.loading || (page + 1) * size >= resource.data.totalElements} onClick={() => setPage(value => value + 1)}>Next page</button></div>
  </Panel>;
}
type CampaignResource = ReturnType<typeof useResource<{ items: CampaignView[] }>>;
function CampaignPicker({ campaigns, value, onChange, optional = false, label }: { campaigns: CampaignResource; value: string; onChange: (value: string) => void; optional?: boolean; label: string }) {
  return <>
    <label className="f07-field">{label}<select value={value} onChange={event => onChange(event.target.value)} disabled={campaigns.loading || !!campaigns.error}><option value="">{optional ? 'All Store campaigns' : 'Select a campaign'}</option>{campaigns.data?.items.map(item => <option value={item.campaignId} key={item.campaignId}>{item.name} · {item.status}</option>)}</select></label>
    {campaigns.loading && <p role="status">Loading Store campaigns…</p>}
    {!!campaigns.error && <Failure error={campaigns.error} retry={campaigns.retry} />}
    {campaigns.data?.items.length === 0 && <p>No Store campaigns yet.</p>}
  </>;
}
function AdditionsPanel({ campaigns }: { campaigns: CampaignResource }) {
  const [period, setPeriod] = useState(defaultPeriod);
  const [campaign, setCampaign] = useState('');
  const [filter, setFilter] = useState<AdditionFilter>({});
  const resource = useResource(useCallback((signal: AbortSignal) => f11Api.additions(filter, signal), [filter]));
  const validation = periodError(period.from, period.to);
  useEffect(() => {
    if ((resource.error as { status?: number })?.status === 404 && filter.campaignId !== undefined) {
      setCampaign('');
      campaigns.retry();
    }
  // Only react to the failed request, not to campaign list refreshes.
  }, [resource.error]);
  return <Panel title="Bundle additions">
    <p className="f07-muted">Successful bundle actions and Product units actually added. Dates use Asia/Ho_Chi_Minh.</p>
    <form onSubmit={event => { event.preventDefault(); if (!validation) setFilter({ ...period, ...(campaign ? { campaignId: Number(campaign) } : {}) }); }}>
      <div className="f11-filters"><label className="f07-field">From<input type="date" required value={period.from} min={shiftDate(period.to, -89)} max={period.to} onChange={event => setPeriod({ ...period, from: event.target.value })} /></label><label className="f07-field">To<input type="date" required value={period.to} min={period.from} max={shiftDate(period.from, 89)} onChange={event => setPeriod({ ...period, to: event.target.value })} /></label><CampaignPicker campaigns={campaigns} value={campaign} onChange={setCampaign} optional label="Campaign filter (all statuses)" /></div>
      {validation && <p role="alert" className="f11-error">{validation}</p>}
      <div className="f07-actions"><button className="f07-button f07-primary" disabled={!!validation}>Apply filters</button><button type="button" className="f07-button" onClick={() => { setPeriod(defaultPeriod()); setCampaign(''); setFilter({}); }}>Reset to last 30 days</button></div>
    </form>
    {resource.loading && <p role="status">Loading bundle activity…</p>}
    {!!resource.error && <Failure error={resource.error} retry={() => { if ((resource.error as { status?: number }).status === 404) setFilter({ ...period }); else resource.retry(); }} />}
    {resource.data && <BundleActivity data={resource.data} />}
  </Panel>;
}
function ReportSelection({ campaignId, onMissing }: { campaignId: number; onMissing: () => void }) {
  const [reportId, setReportId] = useState('');
  const [missingReport, setMissingReport] = useState(false);
  const reports = useResource(useCallback((signal: AbortSignal) => f07f08Api.reports(campaignId, signal), [campaignId]));
  useEffect(() => { if ((reports.error as { status?: number })?.status === 404) onMissing(); }, [reports.error]);
  return <>
    {reports.loading && <p role="status">Loading saved reports…</p>}
    {!!reports.error && <Failure error={reports.error} retry={reports.retry} />}
    {missingReport && <p role="alert">The selected report was not found. Select another saved report.</p>}
    {reports.data && <>
      {reports.data.items.length === 0 ? <p role="status">No saved simulation reports for this campaign.</p> : <label className="f07-field">Saved report<select value={reportId} onChange={event => { setReportId(event.target.value); setMissingReport(false); }}><option value="">Select a saved report</option>{reports.data.items.map(report => <option key={report.reportId} value={report.reportId}>#{report.reportId} · {report.rangeStart} – {report.rangeEnd}</option>)}</select></label>}
      {reportId && <ReportDetail key={reportId} id={Number(reportId)} onMissing={() => { setReportId(''); setMissingReport(true); reports.retry(); }} />}
    </>}
  </>;
}
function ReportDetail({ id, onMissing }: { id: number; onMissing: () => void }) {
  const report = useResource(useCallback((signal: AbortSignal) => f11Api.report(id, signal), [id]));
  useEffect(() => { if ((report.error as { status?: number })?.status === 404) onMissing(); }, [report.error]);
  return <>{report.loading && <p role="status">Loading report…</p>}{!!report.error && <Failure error={report.error} retry={report.retry} />}{report.data && <><p>{report.data.evaluationCount} evaluation transactions · {report.data.algorithmVersion}</p><p>{report.data.rangeStart} – {report.data.rangeEnd}</p>{report.data.assumptions.nExceedsBaseline === true && <p className="f07-warning">{comparisonLabel(report.data)}</p>}<F08ReportDetails report={report.data} /></>}</>;
}
function ReportsPanel({ campaigns }: { campaigns: CampaignResource }) {
  const [campaign, setCampaign] = useState('');
  const [missing, setMissing] = useState(false);
  return <Panel title="Layout A vs B · Mô phỏng">
    <p className="f07-muted">Saved offline replay results. These are simulated metrics, not live customer conversion or revenue.</p>
    <CampaignPicker campaigns={campaigns} value={campaign} onChange={value => { setCampaign(value); setMissing(false); }} label="Report campaign" />
    {missing && <p role="alert">The selected campaign was not found. The Store campaign list has been refreshed.</p>}
    {campaign && <ReportSelection key={campaign} campaignId={Number(campaign)} onMissing={() => { setCampaign(''); setMissing(true); campaigns.retry(); }} />}
  </Panel>;
}
export function F11Dashboard() {
  const campaigns = useResource(useCallback((signal: AbortSignal) => f07f08Api.campaigns(signal), []));
  return <div className="f07-workspace f11-dashboard"><header className="f07-page-heading"><div><span className="f07-eyebrow">STORE PERFORMANCE</span><h1>Store dashboard</h1><p className="f07-muted">Snapshot priorities, bundle activity and saved layout simulations.</p></div></header><SnapshotPanel /><AdditionsPanel campaigns={campaigns} /><ReportsPanel campaigns={campaigns} /></div>;
}
