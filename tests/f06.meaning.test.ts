import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { crossSellDirection, recommendationRationale, recommendationTypeCopy } from '../src/features/f06/f06.presentation';
import { F06RecommendationDetailContent } from '../src/features/f06/components/F06RecommendationDetails';
import { F06RecommendationCards } from '../src/features/f06/components/F06RecommendationCards';
import { RecommendationTypeQualification, recommendationReadiness } from '../src/features/f06/components/F06ReadShared';
import { parseRecommendationJson } from '../src/features/f06/f06.numbers';
import { isRecView } from '../src/features/f06/f06.read-contracts';
import { eligibility, legacyEligibility, policy, recommendation } from './f06.fixtures';
import type { RecType } from '../src/features/f06/f06.types';

test('all four types have practical meanings grounded in their individual recorded evidence', () => {
  const expected = { BUNDLE: 'bundle candidate', CROSS_SELL: 'When customers buy Milk', FBT: '2 historical orders', BANNER: 'promotional consideration' };
  for (const type of Object.keys(expected) as RecType[]) {
    const item = recommendation({ type, anchorProductId: type === 'CROSS_SELL' ? 31 : null,
      evidence: { ...recommendation().evidence, anchorSupportCount: type === 'CROSS_SELL' ? 4 : null, confidence: type === 'CROSS_SELL' ? 0.5 : null } });
    const before = JSON.stringify(item), text = recommendationRationale(item, { 31: 'Milk', 32: 'Bread' });
    assert.ok(text.includes(expected[type]), text);
    assert.ok(recommendationTypeCopy[type].description);
    assert.equal(JSON.stringify(item), before);
  }
  assert.match(recommendationRationale(recommendation({ type: 'BANNER', productIds: [31] })), /This product was/);
});

test('missing evidence stays neutral; a recorded zero count stays zero rather than being fabricated or discarded', () => {
  const missing = recommendation({ type: 'FBT', evidence: { totalTransactions: 0, supportCount: null, supportRatio: null, anchorSupportCount: null, confidence: null, status: 'EVIDENCE_UNAVAILABLE' } });
  assert.match(recommendationRationale(missing), /unavailable/);
  assert.equal(recommendationRationale(missing).includes('0 historical orders'), false);
  assert.match(recommendationRationale({ ...missing, evidence: { ...missing.evidence, status: 'AVAILABLE', supportCount: 0 } }), /0 historical orders/);
  for (const type of ['BUNDLE', 'BANNER'] as RecType[]) assert.match(recommendationRationale(recommendation({ type, sources: [] })), /source evidence is unavailable/);
});

test('cross-sell explains its own direction and never shows directional confidence without a valid anchor', () => {
  const item = recommendation({ type: 'CROSS_SELL', anchorProductId: 31, evidence: { ...recommendation().evidence, anchorSupportCount: 4, confidence: 0.5 } });
  assert.deepEqual(crossSellDirection(item), { anchor: 31, targets: [32] });
  assert.match(recommendationRationale(item, { 31: 'Milk', 32: 'Bread' }), /Milk, Bread may be suggested/);
  assert.match(recommendationRationale({ ...item, anchorProductId: 32 }, { 31: 'Milk', 32: 'Bread' }), /Bread, Milk may be suggested/);
  assert.match(recommendationRationale({ ...item, evidence: { ...item.evidence, confidence: null } }), /incomplete/);
  for (const anchorProductId of [null, 99]) {
    const invalid = { ...item, anchorProductId };
    assert.equal(crossSellDirection(invalid), null);
    const html = render(createElement(F06RecommendationDetailContent, { item: invalid }));
    assert.match(html, /directional explanation cannot be shown/);
    assert.equal(html.includes('Suggest alongside'), false);
    assert.equal(html.includes('<dt class="text-xs text-[#6D7974]">Confidence</dt>'), false);
    const card = render(createElement(F06RecommendationCards, { data: { items: [invalid], page: 0, pageSize: 20, totalElements: 1, ordering: 'CREATED_DESC' }, onOpen: () => {} }));
    assert.equal(card.includes('Confidence 50%'), false);
  }
  assert.equal(crossSellDirection({ ...item, type: 'BUNDLE' }), null);
  assert.equal(crossSellDirection({ ...item, productIds: [31] }), null);
});

test('type qualification uses loaded policy values, with neutral configured-rule copy before policy is available', () => {
  const loaded = { ...policy, maxBundleSize: 9, minSupportCount: 17, minSupportRatio: 0.123456, minConfidence: 0.876543 };
  const cases: [RecType, string[]][] = [['BUNDLE', ['up to 9', 'No automatic discount']], ['CROSS_SELL', ['87.6543%', 'separate candidate']], ['FBT', ['17 shared orders', '12.3456%']], ['BANNER', ['one product', 'publish a promotion']]];
  for (const [type, words] of cases) {
    const html = render(createElement(RecommendationTypeQualification, { type, policy: loaded }));
    for (const word of words) assert.ok(html.includes(word), word);
    assert.match(html, /^<details/);
  }
  const unknown = render(createElement(RecommendationTypeQualification, { type: 'CROSS_SELL' }));
  assert.match(unknown, /configured minimum/);assert.equal(unknown.includes('50%'), false);
});

test('historical V1 creation and review evidence stays readable beside W2 current availability', () => {
  const item = recommendation({ generationEligibility: legacyEligibility(), reviewHistory: [{ oldStatus: 'PENDING_REVIEW', newStatus: 'APPROVED', reviewedBy: 3, reviewedAt: '2026-11-07T01:00:00Z', reason: 'Original decision', resultingVersion: 2, eligibilityCheck: legacyEligibility() }] });
  assert.equal(isRecView(item), true);
  const before = JSON.stringify(item), html = render(createElement(F06RecommendationDetailContent, { item, technical: false }));
  for (const text of ['Legacy expiry priority', 'Historical reminder days: 7', 'Original decision', 'HUI-Miner', 'frozen weighted value', 'Review History', 'Technical source references']) assert.ok(html.includes(text), text);
  assert.equal(JSON.stringify(item), before);
});

test('season warnings remain historical; readyForConsumption and original eligibility enums stay authoritative', () => {
  const item = recommendation({ seasonEnded: true, endedSeasons: [{ seasonId: 7, name: 'Old holiday', endDate: '2026-10-31' }], reviewStatus: 'APPROVED', readyForConsumption: false, currentEligibility: eligibility('INELIGIBLE') });
  const html = render(createElement(F06RecommendationDetailContent, { item }));
  for (const text of ['Old holiday', '31/10/2026', 'historical season data', 'data-status="INELIGIBLE"', 'Unavailable']) assert.ok(html.includes(text), text);
  assert.match(recommendationReadiness(item), /Approved; current selling conditions are not met/);
  assert.match(recommendationReadiness(recommendation()), /Awaiting approval/);
  assert.match(recommendationReadiness({ ...item, currentEligibility: eligibility('NEEDS_RECHECK') }), /availability needs a recheck/);
});

test('explanations and qualification display preserve precise decimals without re-evaluating rounded policy thresholds', () => {
  const item = recommendation({ type: 'CROSS_SELL', anchorProductId: 31, evidence: { ...recommendation().evidence, anchorSupportCount: 3, confidence: 0.666667 }, policy: { ...policy, minConfidence: 0.666667 } });
  const exact = parseRecommendationJson(JSON.stringify(item).replaceAll('40.123456', '1234567890123.123456').replace('"confidence":0.666667', '"confidence":0.666666666666666667')) as typeof item;
  const before = String(exact.utility), html = render(createElement(F06RecommendationDetailContent, { item: exact }));
  assert.ok(html.includes('1234567890123.123456'));assert.ok(html.includes('66.6666666666666667%'));
  assert.equal(String(exact.utility), before);assert.equal(exact.reviewStatus, 'PENDING_REVIEW');
});
