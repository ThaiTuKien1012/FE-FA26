import type { F03FrozenConfiguration, F03MatrixPage, F03Snapshot } from '../f03.api';
import { Metrics, Pager, readable, Technical, Warnings } from './F03Shared';

export function FrozenConfiguration({ configuration }: { configuration?: F03FrozenConfiguration }) {
  if (!configuration) return <p className="text-sm text-[#6d7974]">Frozen configuration was not supplied by the API.</p>;
  const { config, effectiveCoefficients: effective } = configuration;
  return <Metrics values={[
    ['Enabled Factors', [config.enableStock && 'Stock', config.enableExpiry && 'Expiry', config.enableSeason && 'Seasonal'].filter(Boolean).join(', ') || 'None · Baseline W = 1'],
    ['Stock Importance', config.alpha], ['Expiry Importance', config.beta], ['Seasonal Importance', config.gamma],
    ['Lambda', config.lambda], ['Configuration Version', config.version],
    ['Effective Stock Importance', effective.alpha], ['Effective Expiry Importance', effective.beta], ['Effective Seasonal Importance', effective.gamma],
  ]} />;
}
export function Matrix({ result, loadPage, busy, names }: { result: F03MatrixPage; loadPage: (page: number) => void; busy: boolean; names?: Record<number, string> }) {
  return <>
    <p className="mb-4 text-sm text-[#6d7974]">Base Utility is the backend’s utility before priorities. Weight is the product priority multiplier. Weighted Utility is the resulting utility used for mining.</p>
    <Warnings warnings={result.warnings} />
    {result.items.length > 0 ? <div className="overflow-x-auto"><table className="f03-table"><caption className="sr-only">Utility matrix</caption><thead><tr>{['Transaction', 'Product', 'Quantity', 'Base Utility', 'Weight', 'Weighted Utility'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{result.items.map((item, i) => <tr key={`${item.transactionId}-${item.productId}-${i}`}><td>#{item.transactionId}</td><td>{names?.[item.productId] ?? `Product #${item.productId}`}<small className="block text-[#6d7974]">ID {item.productId}</small></td><td>{item.quantity}</td><td>{item.baseUtility}</td><td>{item.weightValue ?? 'Unavailable'}</td><td>{item.weightedUtility ?? 'Unavailable'}</td></tr>)}</tbody></table></div> : <p className="text-sm text-[#6d7974]">No utility rows were returned for this page.</p>}
    <Pager page={result} onChange={loadPage} label="matrix rows" busy={busy} />
    <Technical><p>Per-row scores, expiry evidence and algorithm mapping from the API:</p><div className="overflow-x-auto"><table className="f03-table"><thead><tr>{['Transaction / Product', 'Algorithm Item ID', 'Stock Score', 'Expiry Score', 'Seasonal Score', 'Transaction Utility', 'Expiry Status', 'Expiry Evidence'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{result.items.map((item, i) => <tr key={i}><td>#{item.transactionId} / #{item.productId}</td><td>{item.algorithmItemId}</td><td>{item.stockScore ?? 'Unavailable'}</td><td>{item.expiryScore ?? 'Unavailable'}</td><td>{item.seasonalScore ?? 'Unavailable'}</td><td>{item.transactionUtility ?? 'Unavailable'}</td><td>{readable(item.expiryStatus)}</td><td><pre className="max-w-sm overflow-x-auto text-xs">{JSON.stringify(item.expiryEvidence, null, 2)}</pre></td></tr>)}</tbody></table></div></Technical>
  </>;
}
export function MatrixMetadata({ result }: { result: F03MatrixPage | F03Snapshot }) {
  const frozen = result.configuration;
  return <Technical><Metrics values={[
    ['Source Hash', result.sourceHash || 'Unavailable'], ['Matrix Hash', result.matrixHash || 'Unavailable'],
    ...('roundingScale' in result ? [['Rounding Scale', result.roundingScale] as [string, number]] : []),
    ['Utility Scale', frozen?.utilityScale], ['Rounding Mode', frozen?.roundingMode], ['Scoring Version', frozen?.config.scoringVersion],
    ['Item Mapping', frozen?.itemMapping], ['Time Zone', frozen?.timeZone], ['Source', frozen?.source],
    ['Frozen Analysis Date', frozen?.analysisDate], ['Frozen Lambda Policy Version', frozen?.lambdaPolicy.version],
    ['Frozen Allowed Lambda Range', frozen ? `${frozen.lambdaPolicy.lambdaMin}–${frozen.lambdaPolicy.lambdaMax}` : 'Unavailable']
  ]} /></Technical>;
}
