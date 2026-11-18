import { formatDate, formatDateRange } from '../../../utils/dateTime';
import { isFrozenV2, type F03FrozenConfiguration, type F03MatrixPage, type F03Snapshot } from '../f03.api';
import { Metrics, Pager, readable, Technical, Warnings } from './F03Shared';

export function FrozenConfiguration({ configuration }: { configuration?: F03FrozenConfiguration | null }) {
  if (!configuration) return <p className="text-sm text-[#6d7974]">Frozen configuration was not supplied by the API.</p>;
  if (isFrozenV2(configuration)) return <><Metrics values={[
    ['Expiry Importance', configuration.config.alpha], ['Season Importance', configuration.config.beta], ['Priority Strength', configuration.config.lambda],
    ['Sales Window', `${configuration.config.salesWindowDays} days`], ['Configuration Version', configuration.config.version],
    ['Effective Expiry Importance', configuration.effectiveCoefficients.alpha], ['Effective Season Importance', configuration.effectiveCoefficients.beta]
  ]} /><Technical><h3 className="font-semibold">Frozen Seasons</h3>{configuration.seasons.length ? <ul className="space-y-2">{configuration.seasons.map(s => <li key={s.seasonId}>{s.name} · #{s.seasonId} · {formatDateRange(s.startDate, s.endDate, true)} · Weight {s.weight} · Version {s.version}<p className="text-xs">Products: {s.productIds.join(', ') || 'None'}</p></li>)}</ul> : <p>No seasons were frozen in this dataset.</p>}</Technical></>;
  const { config, effectiveCoefficients: effective } = configuration;
  return <><p className="mb-4 text-sm text-[#6d7974]">Historical scoring model: {config.scoringVersion ?? 'F03_LINEAR_V1'}. These saved values remain unchanged.</p><Metrics values={[
    ['Enabled Factors', [config.enableStock && 'Stock', config.enableExpiry && 'Expiry', config.enableSeason && 'Seasonal'].filter(Boolean).join(', ') || 'None · Baseline W = 1'],
    ['Stock Importance', config.alpha], ['Expiry Importance', config.beta], ['Seasonal Importance', config.gamma], ['Lambda', config.lambda], ['Configuration Version', config.version],
    ['Effective Stock Importance', effective.alpha], ['Effective Expiry Importance', effective.beta], ['Effective Seasonal Importance', effective.gamma], ['Legacy Expiry Window', config.expiryWindowDays]
  ]} /></>;
}
export function Matrix({ result, loadPage, busy, names }: { result: F03MatrixPage; loadPage: (page: number) => void; busy: boolean; names?: Record<number, string> }) {
  const w2 = result.configuration ? isFrozenV2(result.configuration) : false;
  return <>
    <p className="mb-4 text-sm text-[#6d7974]">Base Utility is the backend’s utility before priorities. Weight is the product priority multiplier. Weighted Utility is the resulting utility used for mining.</p>
    <Warnings warnings={result.warnings} />
    {result.items.length > 0 ? <div className="overflow-x-auto"><table className="f03-table"><caption className="sr-only">Utility matrix</caption><thead><tr>{['Transaction', 'Product', 'Quantity', ...(w2 ? ['Expiry Risk', 'Season Weight'] : []), 'Base Utility', 'Weight', 'Weighted Utility', 'Transaction Utility'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{result.items.map((item, i) => <tr key={`${item.transactionId}-${item.productId}-${i}`}><td>#{item.transactionId}</td><td>{names?.[item.productId] ?? `Product #${item.productId}`}<small className="block text-[#6d7974]">ID {item.productId}</small></td><td>{item.quantity}</td>{w2 && <><td>{item.expiryRisk ?? 'Unavailable'}</td><td>{item.seasonWeight ?? 'Unavailable'}</td></>}<td>{item.baseUtility}</td><td>{item.weightValue ?? 'Unavailable'}</td><td>{item.weightedUtility ?? 'Unavailable'}</td><td>{item.transactionUtility ?? 'Unavailable'}</td></tr>)}</tbody></table></div> : <p className="text-sm text-[#6d7974]">No utility rows were returned for this page. Preview needs eligible F04 sales transactions in the selected period. Try another sales period or ask a Store Admin to review transaction imports.</p>}
    <Pager page={result} onChange={loadPage} label="matrix rows" busy={busy} />
    <Technical><p>Saved evidence and algorithm mapping from the API. Unavailable scores remain null; the frontend does not recalculate them.</p>{result.items.map((item, i) => <details key={`${item.transactionId}-${item.productId}-${i}`} className="rounded-lg border border-[#e7e2d8] p-3"><summary className="cursor-pointer">Transaction #{item.transactionId} / Product #{item.productId}</summary><div className="mt-3"><Metrics values={[
      ['Algorithm Item ID', item.algorithmItemId], ['Stock Score (legacy)', item.stockScore], ['Expiry Score (legacy)', item.expiryScore], ['Seasonal Score (legacy)', item.seasonalScore], ['Selected Season', item.seasonId], ['Expiry Status', readable(item.expiryStatus)]
    ]} /><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(item.expiryEvidence, null, 2)}</pre></div></details>)}</Technical>
  </>;
}
export function MatrixMetadata({ result }: { result: F03MatrixPage | F03Snapshot }) {
  const frozen = result.configuration;
  return <Technical><Metrics values={[
    ['Source Hash', result.sourceHash || 'Unavailable'], ['Matrix Hash', result.matrixHash || 'Unavailable'],
    ...('roundingScale' in result ? [['Rounding Scale', result.roundingScale] as [string, number]] : []),
    ['Utility Scale', frozen?.utilityScale], ['Rounding Mode', frozen?.roundingMode], ['Scoring Version', frozen?.config.scoringVersion],
    ['Item Mapping', frozen?.itemMapping], ['Time Zone', frozen?.timeZone], ['Source', frozen?.source],
    ['Frozen Analysis Date', formatDate(frozen?.analysisDate, 'Unavailable')], ['Frozen Lambda Policy Version', frozen?.lambdaPolicy.version],
    ['Frozen Allowed Lambda Range', frozen ? `${isFrozenV2(frozen) ? 0 : frozen.lambdaPolicy.lambdaMin} – ${frozen.lambdaPolicy.lambdaMax}` : 'Unavailable'],
    ...(frozen && isFrozenV2(frozen) ? [['Weight Scale', frozen.weightScale], ['Weight Rounding Mode', frozen.weightRoundingMode]] as [string, number | string][] : [])
  ]} /></Technical>;
}
