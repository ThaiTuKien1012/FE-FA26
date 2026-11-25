import assert from 'node:assert/strict';
import test from 'node:test';
import { comparisonLabel, formatPriorityCoverage, simulationUnavailableReason } from '../src/features/f07f08/f08.simulation';
import type { CampaignStatus, LayoutStatus } from '../src/features/f07f08/f07f08.api';

const state = {
  campaign: { status: 'DRAFT' as CampaignStatus },
  a: { status: 'READY' as LayoutStatus, valid: true },
  b: { status: 'READY' as LayoutStatus, valid: true },
  merchant: true, busy: false, dirty: false
};

test('a saved, valid READY A/B pair can be simulated by a Merchandiser in DRAFT', () => {
  assert.equal(simulationUnavailableReason(state), null);
});

for (const status of ['PUBLISHED', 'ACTIVE', 'ENDED'] as const) {
  test(status + ' campaigns cannot be simulated even when both layouts are READY and valid', () => {
    const reason = simulationUnavailableReason({ ...state, campaign: { status } });
    assert.ok(reason);
    assert.match(reason, status === 'PUBLISHED' ? /Withdraw it to draft/ : /new draft campaign/);
  });
}

test('withdrawal to DRAFT enables simulation again without changing the saved layouts', () => {
  assert.notEqual(simulationUnavailableReason({ ...state, campaign: { status: 'PUBLISHED' } }), null);
  assert.equal(simulationUnavailableReason({ ...state, campaign: { status: 'DRAFT' } }), null);
});

test('Store Admin read access does not authorize simulation', () => {
  assert.match(simulationUnavailableReason({ ...state, merchant: false })!, /Only a Merchandiser/);
});

test('unsaved changes, in-progress actions and unready or invalid layouts block simulation', () => {
  assert.match(simulationUnavailableReason({ ...state, dirty: true })!, /Save or discard/);
  assert.match(simulationUnavailableReason({ ...state, busy: true })!, /current action/);
  for (const role of ['a', 'b'] as const) {
    assert.match(simulationUnavailableReason({ ...state, [role]: { ...state[role], status: 'DRAFT' } })!, /READY/);
    assert.match(simulationUnavailableReason({ ...state, [role]: { ...state[role], valid: false } })!, /validation/);
  }
});

test('unavailable priorityCoverage renders as "chưa có", never 0', () => {
  assert.equal(formatPriorityCoverage(null), 'chưa có');
  assert.equal(formatPriorityCoverage(undefined), 'chưa có');
  assert.equal(formatPriorityCoverage(0), '0%');
  assert.equal(formatPriorityCoverage(0.5), '50%');
});

test('offline V2–V4 reports use equal-size comparison and show actual counts when B is larger', () => {
  for (const version of [2, 3, 4]) {
    assert.match(comparisonLabel({ algorithmVersion: 'OFFLINE_REPLAY_V' + version, assumptions: {} }), /Equal-size/);
  }
  assert.match(comparisonLabel({ algorithmVersion: 'OFFLINE_REPLAY_V1', assumptions: {} }), /measured in full/);
  assert.match(comparisonLabel({ algorithmVersion: 'OFFLINE_REPLAY_V4',
    assumptions: { nExceedsBaseline: true, baselineProductsCompared: 3, comparedProductCountN: 5 } }), /A: 3 products, B: 5 products/);
});
