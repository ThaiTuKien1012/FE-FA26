import type { CampaignReport, Metric } from '../f07f08.api';
import { comparisonLabel, formatPriorityCoverage } from '../f08.simulation';
const rate = (metric?: Metric) => metric?.rate == null ? 'N/A' : new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 2 }).format(metric.rate);

/** Read-only frozen report view shared by F08 and the Store dashboard. */
export function F08ReportDetails({ report }: { report: CampaignReport }) {
  return <>
        <div className="f07-metric-grid">{report.layouts.map(row => <div key={row.layoutId} className="f07-report-layout"><h3>Layout {row.role} <small>v{row.layoutVersion}</small></h3><dl><dt>Hit rate</dt><dd>{rate(row.hitRate)}</dd><dt>Bundle conversion</dt><dd>{rate(row.bundleConversion)}</dd><dt>Captured utility</dt><dd>{rate(row.capturedUtility)}</dd><dt>Priority coverage</dt><dd>{formatPriorityCoverage(row.priorityCoverage)}{row.priorityCoverageDenominator != null && ` · ${row.priorityCoverageDenominator} products`}</dd></dl></div>)}</div>
        <details className="f07-report-details"><summary>Dataset & comparison details</summary><p>{comparisonLabel(report)}</p><p>Report #{report.reportId} · {report.rangeStart} – {report.rangeEnd}</p><p>Dataset hash: {report.datasetHash}</p><pre>{JSON.stringify(report.assumptions, null, 2)}</pre><p>N/A means the metric is unavailable or has a zero denominator. Priority coverage shows “chưa có” for historical reports or unavailable frozen weights.</p></details>
  </>;
}
