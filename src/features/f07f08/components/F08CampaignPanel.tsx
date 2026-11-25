import { useState } from 'react';
import { ArrowUpRight, FlaskConical, Play, RotateCcw, Send } from 'lucide-react';
import type { ActiveLayout, CampaignReport, CampaignView, LayoutSnapshot, LayoutView, Metric } from '../f07f08.api';
import { matchingReport } from '../f07.designer';
import { formatPriorityCoverage, simulationUnavailableReason } from '../f08.simulation';
import { LayoutStatus } from './F07LayoutDesigner';

const nextDay = (date: string) => { const day = new Date(date + 'T00:00:00Z'); day.setUTCDate(day.getUTCDate() + 1); return day.toISOString().slice(0, 10); };
const rate = (metric?: Metric) => metric?.rate == null ? 'N/A' : new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 2 }).format(metric.rate);
interface Props {
  campaign: CampaignView; a: LayoutView; b: LayoutView; reports: CampaignReport[]; snapshot?: LayoutSnapshot;
  merchant: boolean; busy: boolean; dirty: boolean; active: ActiveLayout | null;
  onDecide: (decision: 'KEEP_A' | 'CHOOSE_B', report: CampaignReport | null) => void;
  onAction: (kind: 'publish' | 'withdraw' | 'activate' | 'end' | 'rollback') => void;
  onSimulate: (start: string, end: string) => void; onDesign: () => void;
}

export function F08CampaignPanel({ campaign, a, b, reports, snapshot, merchant, busy, dirty, active, onDecide, onAction, onSimulate, onDesign }: Props) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reportId, setReportId] = useState<number | null>(null);
  const report = reports.find(item => item.reportId === reportId) || reports[0] || null;
  const currentReport = matchingReport(report, a, b);
  const minimumDate = snapshot ? nextDay(snapshot.rangeEnd) : undefined;
  const datesValid = !!start && !!end && start <= end && (!minimumDate || start >= minimumDate);
  const disabled = busy || dirty;
  const simulationReason = simulationUnavailableReason({ campaign, a, b, merchant, busy, dirty });
  const simulationDatesDisabled = busy || campaign.status !== 'DRAFT';
  const selected = campaign.selectedLayoutId === b.layoutId ? b : campaign.selectedLayoutId === a.layoutId ? a : null;
  return <section className="f07-campaign-grid" aria-label="F08 Campaign and simulation">
    <div className="f07-panel f07-campaign-card">
      <div className="f07-campaign-heading"><div><span className="f07-eyebrow">CAMPAIGN WORKFLOW</span><h2>{campaign.name}</h2></div><LayoutStatus value={campaign.status} /></div>
      <p className="f07-muted">{active?.defaultLayout ? 'The default layout is active on the storefront.' : 'Active storefront campaign: ' + active?.campaign?.name}</p>
      {dirty && <p role="status" className="f07-warning">Save or discard your Layout B changes before making campaign decisions.</p>}
      <div className="f07-step"><span>01</span><div><h3>Prepare the arrangement</h3><p>Baseline A is read-only. Save Layout B, validate its blocks and mark it ready.</p><div className="f07-actions"><LayoutStatus value={a.status} /><small>A</small><LayoutStatus value={b.status} /><small>B</small><button className="f07-button" onClick={onDesign}>Open layout design<ArrowUpRight size={14} /></button></div></div></div>
      <div className="f07-step"><span>02</span><div><h3>Choose a layout</h3><p>A simulation is optional. {report && !currentReport ? 'The displayed report uses older layout versions and will not be attached to a new decision.' : report ? 'The current report can support this decision.' : 'You can record a decision without a report.'}</p><div className="f07-actions">{merchant && campaign.status === 'DRAFT' ? <><button className="f07-button" aria-pressed={campaign.decision === 'KEEP_A'} disabled={disabled || !a.valid || a.status !== 'READY'} onClick={() => onDecide('KEEP_A', report)}>Keep baseline A</button><button className="f07-button f07-primary" aria-pressed={campaign.decision === 'CHOOSE_B'} disabled={disabled || !b.valid || b.status !== 'READY'} onClick={() => onDecide('CHOOSE_B', report)}>Choose Layout B</button></> : <p className="f07-muted">Decision: {campaign.decision?.replaceAll('_', ' ') || 'Not recorded yet'}</p>}</div></div></div>
      <div className="f07-step"><span>03</span><div><h3>Publish & activate</h3><p>The Merchandiser publishes the selected layout. The Store Admin activates it for the storefront.</p><div className="f07-actions">
        {merchant && campaign.status === 'DRAFT' && <button className="f07-button f07-primary" disabled={disabled || !campaign.decision || !selected?.valid || selected.status !== 'READY'} onClick={() => onAction('publish')}><Send size={14} />Publish campaign</button>}
        {merchant && campaign.status === 'PUBLISHED' && <button className="f07-button" disabled={disabled} onClick={() => onAction('withdraw')}><RotateCcw size={14} />Withdraw to draft</button>}
        {!merchant && campaign.status === 'PUBLISHED' && <button className="f07-button f07-primary" disabled={disabled} onClick={() => onAction('activate')}><Play size={14} />Activate campaign</button>}
        {!merchant && campaign.status === 'ACTIVE' && <><button className="f07-button" disabled={disabled} onClick={() => onAction('end')}>End campaign</button><button className="f07-button" disabled={disabled} onClick={() => onAction('rollback')}><RotateCcw size={14} />Restore previous campaign</button></>}
        {campaign.status === 'ENDED' && <p className="f07-muted">This campaign has ended. Create a new campaign to plan another arrangement.</p>}
        {!merchant && campaign.status === 'DRAFT' && <p className="f07-muted">Waiting for a Merchandiser to choose and publish a layout.</p>}
        {merchant && campaign.status === 'ACTIVE' && <p className="f07-muted">The Store Admin can end or roll back this active campaign.</p>}
      </div></div></div>
    </div>
    <div className="f07-panel f07-campaign-card">
      <div className="f07-panel-heading"><div><span className="f07-eyebrow">OFFLINE EVALUATION</span><h2>A/B simulation</h2></div><FlaskConical size={22} /></div>
      <p className="f07-muted">Replay historical transactions after the snapshot training period. This report does not measure a live customer experiment.</p>
      {merchant && <form onSubmit={event => { event.preventDefault(); if (datesValid && !simulationReason) onSimulate(start, end); }}>
        {snapshot && <p className="f07-muted">Training: {snapshot.rangeStart} – {snapshot.rangeEnd}. Evaluation starts from {minimumDate}.</p>}
        <div className="f07-date-grid"><label className="f07-field">Evaluation start<input aria-label="Evaluation start" type="date" min={minimumDate} required value={start} disabled={simulationDatesDisabled} onChange={e => setStart(e.target.value)} /></label><label className="f07-field">Evaluation end<input aria-label="Evaluation end" type="date" min={start || minimumDate} required value={end} disabled={simulationDatesDisabled} onChange={e => setEnd(e.target.value)} /></label></div>
        <button className="f07-button f07-primary" disabled={!!simulationReason || !datesValid} aria-describedby={simulationReason ? 'f08-simulation-status' : undefined}><FlaskConical size={15} />Run offline simulation</button>
        {simulationReason && <p id="f08-simulation-status" role="status" className="f07-muted">{simulationReason}</p>}
      </form>}
      {reports.length > 0 && <label className="f07-field">Saved reports<select aria-label="Saved simulation reports" value={report?.reportId} onChange={e => setReportId(Number(e.target.value))}>{reports.map(item => <option key={item.reportId} value={item.reportId}>Report #{item.reportId} · {item.rangeStart} – {item.rangeEnd}</option>)}</select></label>}
      {report ? <>
        <div className="f07-actions"><span className="f07-status">{report.simulated ? 'SIMULATED' : 'REPORT'}</span><small className="f07-muted">{report.evaluationCount} evaluation transactions</small></div>
        {!currentReport && <p className="f07-warning">Historical report: A/B versions differ from the current layouts.</p>}
        <div className="f07-metric-grid">{report.layouts.map(row => <div key={row.layoutId} className="f07-report-layout"><h3>Layout {row.role} <small>v{row.layoutVersion}</small></h3><dl><dt>Hit rate</dt><dd>{rate(row.hitRate)}</dd><dt>Bundle conversion</dt><dd>{rate(row.bundleConversion)}</dd><dt>Captured utility</dt><dd>{rate(row.capturedUtility)}</dd><dt>Priority coverage</dt><dd>{formatPriorityCoverage(row.priorityCoverage)}</dd></dl></div>)}</div>
        <details className="f07-report-details"><summary>Dataset & comparison details</summary><p>{report.algorithmVersion === 'OFFLINE_REPLAY_V2' ? 'Equal-size comparison: B versus the first N products of A.' : 'Historical comparison: baseline A was measured in full.'}</p><p>Report #{report.reportId} · {report.rangeStart} – {report.rangeEnd}</p><p>Dataset hash: {report.datasetHash}</p><pre>{JSON.stringify(report.assumptions, null, 2)}</pre><p>N/A means the metric is unavailable or has a zero denominator. Priority coverage shows “chưa có” until the Backend computes it.</p></details>
      </> : <div className="f07-empty"><FlaskConical size={28} /><strong>No simulation reports yet</strong><p>{merchant ? 'Choose an evaluation period after training to compare the two ready layouts.' : 'Saved simulation reports from your Merchandiser will appear here.'}</p></div>}
    </div>
  </section>;
}
