import type { CampaignView, LayoutView } from './f07f08.api';

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

/** priorityCoverage is decided (DEC-20261117-02) but not computed by the Backend yet, so it arrives as null. */
export function formatPriorityCoverage(value: number | null | undefined): string {
  if (value == null) return 'chưa có';
  return new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 2 }).format(value);
}
