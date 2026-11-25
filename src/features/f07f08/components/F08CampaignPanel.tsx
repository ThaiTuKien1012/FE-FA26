import { useState } from 'react';
import { ArrowUpRight, FlaskConical, Play, RotateCcw, Send } from 'lucide-react';
import type { ActiveLayout, CampaignReport, CampaignView, LayoutSnapshot, LayoutView, Metric } from '../f07f08.api';
import { matchingReport } from '../f07.designer';
import { simulationUnavailableReason } from '../f08.simulation';
import { LayoutStatus } from './F07LayoutDesigner';

const nextDay = (date: string) => { const day = new Date(date + 'T00:00:00Z'); day.setUTCDate(day.getUTCDate() + 1); return day.toISOString().slice(0, 10); };
const rate = (metric?: Metric) => metric?.rate == null ? 'Not available' : new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 2 }).format(metric.rate);
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
  return <section className="f07-campaign-grid" aria-label="Compare and apply layouts">
    <div className="f07-panel f07-campaign-card">
      <div className="f07-campaign-heading"><div><span className="f07-eyebrow">PUT YOUR PLAN INTO USE</span><h2>{campaign.name}</h2></div><LayoutStatus value={campaign.status} /></div>
      <p className="f07-muted">{active?.defaultLayout ? 'The default layout is active on the storefront.' : 'Active storefront campaign: ' + active?.campaign?.name}</p>
      {dirty && <p role="status" className="f07-warning">Save or discard changes to your proposed layout before choosing what to use.</p>}
      <div className="f07-step"><span>01</span><div><h3>Prepare the arrangement</h3><p>Save your proposed layout, check its products and finish it when ready. The reference layout is read-only.</p><div className="f07-actions"><span className="f07-layout-readiness">Reference (A) <LayoutStatus value={a.status} /></span><span className="f07-layout-readiness">Proposed (B) <LayoutStatus value={b.status} /></span><button className="f07-button" onClick={onDesign}>Arrange products<ArrowUpRight size={14} /></button></div></div></div>
      <div className="f07-step"><span>02</span><div><h3>Choose a layout</h3><p>Comparing past sales is optional. {report && !currentReport ? 'The layouts have changed since this comparison. Run it again to include an up-to-date report with your choice.' : report ? 'This comparison will be saved with your choice.' : 'You can choose a layout without a comparison.'}</p><div className="f07-actions">{merchant && campaign.status === 'DRAFT' ? <><button className="f07-button" aria-pressed={campaign.decision === 'KEEP_A'} disabled={disabled || !a.valid || a.status !== 'READY'} onClick={() => onDecide('KEEP_A', report)}>Use reference (A)</button><button className="f07-button f07-primary" aria-pressed={campaign.decision === 'CHOOSE_B'} disabled={disabled || !b.valid || b.status !== 'READY'} onClick={() => onDecide('CHOOSE_B', report)}>Use proposed (B)</button></> : <p className="f07-muted">Decision: {campaign.decision === 'KEEP_A' ? 'Reference layout (A)' : campaign.decision === 'CHOOSE_B' ? 'Proposed layout (B)' : 'No layout chosen yet'}</p>}</div></div></div>
      <div className="f07-step"><span>03</span><div><h3>Apply to the storefront</h3><p>The merchandising team sends the chosen layout to the store manager. Customers see it only after the manager applies the campaign.</p><div className="f07-actions">
        {merchant && campaign.status === 'DRAFT' && <button className="f07-button f07-primary" disabled={disabled || !campaign.decision || !selected?.valid || selected.status !== 'READY'} onClick={() => onAction('publish')}><Send size={14} />Send to store manager</button>}
        {merchant && campaign.status === 'PUBLISHED' && <button className="f07-button" disabled={disabled} onClick={() => onAction('withdraw')}><RotateCcw size={14} />Return to draft</button>}
        {!merchant && campaign.status === 'PUBLISHED' && <button className="f07-button f07-primary" disabled={disabled} onClick={() => onAction('activate')}><Play size={14} />Apply to storefront</button>}
        {!merchant && campaign.status === 'ACTIVE' && <><button className="f07-button" disabled={disabled} onClick={() => onAction('end')}>End campaign</button><button className="f07-button" disabled={disabled} onClick={() => onAction('rollback')}><RotateCcw size={14} />Restore previous layout</button></>}
        {campaign.status === 'ENDED' && <p className="f07-muted">This campaign has ended. Create a new campaign to plan another arrangement.</p>}
        {!merchant && campaign.status === 'DRAFT' && <p className="f07-muted">Waiting for the merchandising team to choose a layout and send it for activation.</p>}
        {merchant && campaign.status === 'ACTIVE' && <p className="f07-muted">The store manager can end this campaign or restore the previous storefront layout.</p>}
      </div></div></div>
    </div>
    <div className="f07-panel f07-campaign-card">
      <div className="f07-panel-heading"><div><span className="f07-eyebrow">TRY BEFORE APPLYING</span><h2>Compare past sales</h2></div><FlaskConical size={22} /></div>
      <p className="f07-muted">Compare how the two layouts match purchases in a later sales period. This uses past sales; it does not predict extra revenue or measure a live customer test.</p>
      {merchant && <form onSubmit={event => { event.preventDefault(); if (datesValid && !simulationReason) onSimulate(start, end); }}>
        {snapshot && <p className="f07-muted">Layouts use sales from {snapshot.rangeStart} to {snapshot.rangeEnd}. Choose a comparison period starting on or after {minimumDate}.</p>}
        <div className="f07-date-grid"><label className="f07-field">Comparison start<input aria-label="Comparison start" type="date" min={minimumDate} required value={start} disabled={simulationDatesDisabled} onChange={e => setStart(e.target.value)} /></label><label className="f07-field">Comparison end<input aria-label="Comparison end" type="date" min={start || minimumDate} required value={end} disabled={simulationDatesDisabled} onChange={e => setEnd(e.target.value)} /></label></div>
        <button className="f07-button f07-primary" disabled={!!simulationReason || !datesValid} aria-describedby={simulationReason ? 'f08-simulation-status' : undefined}><FlaskConical size={15} />Compare layouts</button>
        {simulationReason && <p id="f08-simulation-status" role="status" className="f07-muted">{simulationReason}</p>}
      </form>}
      {reports.length > 0 && <label className="f07-field">Saved comparisons<select aria-label="Saved comparisons" value={report?.reportId} onChange={e => setReportId(Number(e.target.value))}>{reports.map(item => <option key={item.reportId} value={item.reportId}>{item.rangeStart} – {item.rangeEnd} · comparison {item.reportId}</option>)}</select></label>}
      {report ? <>
        <div className="f07-actions"><span className="f07-status">{report.simulated ? 'PAST SALES COMPARISON' : 'REPORT'}</span><small className="f07-muted">{report.evaluationCount} purchases compared</small></div>
        {!currentReport && <p className="f07-warning">The layouts have changed since this comparison. These results describe the earlier layouts.</p>}
        <div className="f07-metric-grid">{report.layouts.map(row => <div key={row.layoutId} className="f07-report-layout"><h3>{row.role === 'A' ? 'Reference (A)' : 'Proposed (B)'}</h3><dl><dt>Purchases with a displayed product</dt><dd>{rate(row.hitRate)}</dd><dt>Purchases with a complete bundle</dt><dd>{rate(row.bundleConversion)}</dd><dt>Share of product value covered</dt><dd>{rate(row.capturedUtility)}</dd></dl></div>)}</div>
        <details className="f07-report-details"><summary>How to read these results</summary><p>{['OFFLINE_REPLAY_V2', 'OFFLINE_REPLAY_V3'].includes(report.algorithmVersion) ? 'Equal-size comparison: B versus the first N products of A.' : 'Historical comparison: baseline A was measured in full.'}</p><p>Report #{report.reportId} · {report.rangeStart} – {report.rangeEnd}</p><p><strong>Purchases with a displayed product:</strong> purchases containing at least one displayed product.</p><p><strong>Purchases with a complete bundle:</strong> purchases containing every product in at least one displayed bundle. For V3 reports, bundles are defined by BUNDLE zone and block number in the saved layout revision. This does not measure a change in customer behaviour.</p><p><strong>Share of product value covered:</strong> the share of purchase value scores accounted for by displayed products, using the configured scoring rules.</p><p>Priority coverage: {report.layouts.every(row => row.priorityCoverage == null) ? 'Not available for this report.' : report.layouts.map(row => `${row.role}: ${row.priorityCoverage ?? 'Not available'}`).join(' · ')}</p><details><summary>Technical report details</summary><p>Layout versions: {report.layouts.map(row => `${row.role} v${row.layoutVersion}`).join(' · ')}</p><p>Dataset hash: {report.datasetHash}</p><pre>{JSON.stringify(report.assumptions, null, 2)}</pre></details><p>“Not available” means there is no result for that measure, or no eligible purchases to calculate it.</p></details>
      </> : <div className="f07-empty"><FlaskConical size={28} /><strong>No comparisons yet</strong><p>{merchant ? 'Finish both layouts, then choose a later sales period to compare them.' : 'Saved comparisons from your merchandising team will appear here.'}</p></div>}
    </div>
  </section>;
}
