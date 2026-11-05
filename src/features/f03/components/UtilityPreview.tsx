import type { F03MatrixPage } from '../f03.api';
import { periodError, previewEligible, type SalesPeriod } from '../f03.validation';
import { Button, field, Metrics, navigate, Notice, primary, Section } from './F03Shared';
import { FrozenConfiguration, Matrix, MatrixMetadata } from './UtilityMatrix';

export interface PreviewFlow {
  dates: SalesPeriod;
  setDates: (dates: SalesPeriod) => void;
  preview: F03MatrixPage | null;
  stale: string;
  loading: boolean;
  error: string;
  calculate: (page?: number) => void;
}
export function PreviewSummary({ preview }: { preview: F03MatrixPage }) {
  return <Metrics values={[
    ['Preview Status', previewEligible(preview) ? 'Ready' : 'Not Ready'], ['Matrix Row Count', preview.totalElements],
    ['Total Weighted Utility', preview.totalWeightedUtility]
  ]} />;
}
export function UtilityPreview({ flow, names }: { flow: PreviewFlow; names: Record<number, string> }) {
  const { dates, setDates, preview, loading, stale, error, calculate } = flow;
  const invalid = periodError(dates);
  return <div className="space-y-5"><Notice error={error} />
    <Section title="Select Sales Period" subtitle="Start and End Dates select sales transactions. Analysis Date is the reference date used to calculate Expiry Score.">
      <form onSubmit={e => { e.preventDefault(); calculate(); }}><fieldset disabled={loading} className="grid gap-4 sm:grid-cols-3">{([['rangeStart', 'Start Date'], ['rangeEnd', 'End Date'], ['asOfDate', 'Analysis Date']] as const).map(([key, label]) => <label className="text-sm font-medium" key={key}>{label}<input aria-label={label} required type="date" className={field} value={dates[key]} onChange={e => setDates({ ...dates, [key]: e.target.value })} /></label>)}</fieldset>
        {invalid && <p role="alert" className="mt-4 text-sm text-amber-900">{invalid}</p>}
        <Button type="submit" className={`${primary} mt-5`} disabled={loading || Boolean(invalid)}>{loading ? 'Calculating…' : 'Calculate Preview'}</Button>
        <p className="mt-3 text-xs text-[#6d7974]">Preview uses saved configuration and product scores. Save any drafts first. Calculating does not create a snapshot.</p>
      </form>
    </Section>
    {stale && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{stale}</p>}
    {preview && <><Section title="Preview Results"><PreviewSummary preview={preview} />
      {!previewEligible(preview) && <p className="mt-4 text-sm text-amber-900">A snapshot needs a ready calculation with at least one eligible transaction row. Review the warnings and saved inputs, then calculate again.</p>}
      <div className="mt-5"><Matrix result={preview} busy={loading} loadPage={calculate} names={names} /></div>
      <MatrixMetadata result={preview} />
      <details className="mt-4 text-sm"><summary className="cursor-pointer font-semibold text-[#356b54]">Configuration used for this Preview</summary><div className="mt-4"><FrozenConfiguration configuration={preview.configuration} /></div></details>
    </Section>
      {previewEligible(preview) && <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#cdded3] bg-[#eef5f0] p-5"><p className="max-w-xl text-sm text-[#356b54]">Review complete? Continue to create an immutable dataset. The backend rechecks current data and policy when you create it.</p><Button disabled={loading} className={primary} onClick={() => navigate('f03-snapshots')}>Continue to Snapshots</Button></div>}
    </>}
  </div>;
}
