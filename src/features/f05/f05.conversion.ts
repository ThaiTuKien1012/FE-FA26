import type { MiningConversionMetadata, RequestView, RunView } from './f05.types';

export const LOSSLESS_CONVERSION = 'F03_SCALE6_GCD_INT32_DENSE_V1';
export const WHOLE_UNIT_CONVERSION = 'F03_WHOLE_UNIT_HALF_UP_INT32_DENSE_V1';

/** Validate recorded metadata only. No client-side utility/threshold conversion. */
export function isConversionMetadata(value: Record<string, unknown>): boolean {
  const { conversionVersion: version, conversionMode: mode, roundingUnit: unit } = value;
  if (typeof version !== 'string') return false;
  // Historical responses omitted both additive fields. Whole-unit never used that contract.
  if (mode === undefined && unit === undefined) return version !== WHOLE_UNIT_CONVERSION;
  if (version === LOSSLESS_CONVERSION) return mode === 'LOSSLESS' && unit === null;
  if (version === WHOLE_UNIT_CONVERSION) return mode === 'WHOLE_UNIT_HALF_UP' && unit === 1;
  // Backend modeFor returns null for an unknown stored version; keep history readable.
  return mode === null && unit === null;
}

export function isRequestConversion(value: Record<string, unknown>): boolean {
  if (!isConversionMetadata(value)) return false;
  if (value.conversionVersion === LOSSLESS_CONVERSION) return value.utilityScale === 6 && value.roundingMode === 'HALF_UP';
  if (value.conversionVersion === WHOLE_UNIT_CONVERSION) return value.utilityScale === 0 && value.divisor === 1 && value.roundingMode === 'HALF_UP';
  return true;
}

export function sameMiningInput(request: RequestView, run: RunView): boolean {
  return run.inputHash === request.inputHash && run.minUtilSpmf === request.minUtilSpmf && run.conversionVersion === request.conversionVersion
    && (request.conversionMode === undefined || run.conversionMode === undefined || request.conversionMode === run.conversionMode)
    && (request.roundingUnit === undefined || run.roundingUnit === undefined || request.roundingUnit === run.roundingUnit);
}

export function conversionDescription(value: MiningConversionMetadata & { conversionVersion: string }): { label: string; rounding: string; explanation: string } {
  if (value.conversionMode === 'WHOLE_UNIT_HALF_UP') return {
    label: 'Whole-unit input (WHOLE_UNIT_HALF_UP)', rounding: '1 đồng (HALF_UP)',
    explanation: 'The backend accepted whole-unit analysis input after the exact input exceeded its numeric limit. Only the analysis input was rounded; the saved F03 snapshot is unchanged.'
  };
  if (value.conversionMode === 'LOSSLESS') return {
    label: 'Exact input (LOSSLESS)', rounding: 'None (exact conversion)',
    explanation: 'The analysis input preserves the saved weighted utility exactly. No whole-unit rounding was applied.'
  };
  return { label: 'Not recorded', rounding: 'Not recorded', explanation: 'Conversion metadata is unavailable for this historical response. The recorded version is shown below; no conversion has been inferred or recalculated.' };
}
