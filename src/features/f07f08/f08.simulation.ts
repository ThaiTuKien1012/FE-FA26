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
  if (!merchant) return 'Only a member of the merchandising team can compare layouts.';
  if (campaign.status === 'PUBLISHED') return 'This campaign is awaiting activation. Return it to draft before running another comparison.';
  if (campaign.status === 'ACTIVE') return 'This campaign is in use. Create a new draft campaign to compare another arrangement.';
  if (campaign.status === 'ENDED') return 'This campaign has ended. Create a new draft campaign to compare another arrangement.';
  if (campaign.status !== 'DRAFT') return 'Return the campaign to draft before comparing layouts.';
  if (busy) return 'Wait for the current action to finish.';
  if (dirty) return 'Save or discard your proposed layout changes before comparing layouts.';
  if (a.status !== 'READY' || b.status !== 'READY') return 'Finish both layouts before comparing them. Open Arrange products to check their progress.';
  if (!a.valid || !b.valid) return 'Both layouts must pass product checks before you can compare them.';
  return null;
}
