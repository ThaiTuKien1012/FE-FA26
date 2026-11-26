import type { CampaignReport, CampaignView, LayoutView } from './f07f08.api';

interface SimulationState {
  campaign: Pick<CampaignView, 'status'>;
  a: Pick<LayoutView, 'status' | 'valid'>;
  b: Pick<LayoutView, 'status' | 'valid'>;
  merchant: boolean;
  busy: boolean;
  dirty: boolean;
}

/** Match the Backend's draft-only simulation contract at both UI and action boundaries. */
export function simulationUnavailableReason({ campaign, a, b, merchant, busy, dirty }: SimulationState): string | null {
  if (!merchant) return 'Only a Merchandiser can run an offline simulation.';
  if (campaign.status === 'PUBLISHED') return 'This campaign is published. Withdraw it to draft before running another simulation.';
  if (campaign.status === 'ACTIVE') return 'This campaign is active. Create a new draft campaign to run another simulation.';
  if (campaign.status === 'ENDED') return 'This campaign has ended. Create a new draft campaign to run another simulation.';
  if (campaign.status !== 'DRAFT') return 'Only draft campaigns can run an offline simulation.';
  if (busy) return 'Wait for the current action to finish.';
  if (dirty) return 'Save or discard your Layout B changes before running a simulation.';
  if (a.status !== 'READY' || b.status !== 'READY') return 'Both saved layouts must be READY before simulation.';
  if (!a.valid || !b.valid) return 'Both saved layouts must pass validation before simulation.';
  return null;
}

/** Historical or unavailable coverage stays distinct from numeric zero. */
export function formatPriorityCoverage(value: number | null | undefined): string {
  if (value == null) return 'chưa có';
  return new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 2 }).format(value);
}

export function comparisonLabel(report: Pick<CampaignReport, 'algorithmVersion' | 'assumptions'>): string {
  if (report.algorithmVersion === 'OFFLINE_REPLAY_V1') return 'Historical comparison: baseline A was measured in full.';
  const { comparisonMode, nExceedsBaseline, comparedProductCountN, baselineProductsCompared } = report.assumptions;
  if (comparisonMode !== 'EQUAL_SIZE_TOP_N_OF_A' && !/^OFFLINE_REPLAY_V[234]$/.test(report.algorithmVersion)) {
    return 'Comparison mode is unavailable.';
  }
  if (nExceedsBaseline === true) {
    const counts = typeof baselineProductsCompared === 'number' && typeof comparedProductCountN === 'number'
      ? ` (A: ${baselineProductsCompared} products, B: ${comparedProductCountN} products)` : '';
    return `All of baseline A was used because B contains more products${counts}.`;
  }
  return 'Equal-size comparison: B versus the first N products of A.';
}
