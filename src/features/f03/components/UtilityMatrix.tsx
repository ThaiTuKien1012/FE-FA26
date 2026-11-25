import { formatDate, formatDateRange } from '../../../utils/dateTime';
import { isFrozenV2, type F03FrozenConfiguration, type F03MatrixPage, type F03ExactSnapshot as F03Snapshot } from '../f03.api';
import { Metrics, Pager, readable, Technical, Warnings } from './F03Shared';

export function FrozenConfiguration({ configuration, technical = true }: { configuration?: F03FrozenConfiguration | null; technical?: boolean }) {
  if (!configuration) return <p className="text-sm text-[#6d7974]">Frozen configuration was not supplied by the API.</p>;
  if (isFrozenV2(configuration)) return <><Metrics values={[
    ['Expiry Importance', configuration.config.alpha], ['Season Importance', configuration.config.beta], ['Priority Strength', configuration.config.lambda],
    ['Sales Window', `${configuration.config.salesWindowDays} days`], ['Configuration Version', configuration.config.version],
    ['Effective Expiry Importance', configuration.effectiveCoefficients.alpha], ['Effective Season Importance', configuration.effectiveCoefficients.beta]
  ]} />{technical && <Technical><h3 className="font-semibold">Frozen Seasons</h3>{configuration.seasons.length ? <ul className="space-y-2">{configuration.seasons.map(s => <li key={s.seasonId}>{s.name} · #{s.seasonId} · {formatDateRange(s.startDate, s.endDate, true)} · Weight {s.weight} · Version {s.version}<p className="text-xs">Products: {s.productIds.join(', ') || 'None'}</p></li>)}</ul> : <p>No seasons were frozen in this dataset.</p>}</Technical>}</>;
  const { config, effectiveCoefficients: effective } = configuration;
  return <><p className="mb-4 text-sm text-[#6d7974]">Historical scoring model{technical ? ': ' + (config.scoringVersion ?? 'F03_LINEAR_V1') : ''}. These saved values remain unchanged.</p><Metrics values={[
    ['Enabled Factors', [config.enableStock && 'Stock', config.enableExpiry && 'Expiry', config.enableSeason && 'Seasonal'].filter(Boolean).join(', ') || 'None · Baseline W = 1'],
    ['Stock Importance', config.alpha], ['Expiry Importance', config.beta], ['Seasonal Importance', config.gamma], ['Lambda', config.lambda], ['Configuration Version', config.version],
    ['Effective Stock Importance', effective.alpha], ['Effective Expiry Importance', effective.beta], ['Effective Seasonal Importance', effective.gamma], ['Legacy Expiry Window', config.expiryWindowDays]
  ]} /></>;
}
export { UtilityMatrixTable as Matrix } from './UtilityMatrixTable';
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
