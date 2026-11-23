import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { configDraftDirty, previewNotice } from '../src/features/f03/f03.presentation';
import { draftFromConfig } from '../src/features/f03/f03.validation';
import { groupSnapshotWarnings, snapshotWarningExplanation, snapshotWarningProductId } from '../src/features/f03/f03.snapshot-warnings';
import { SnapshotWarnings } from '../src/features/f03/components/SnapshotWarnings';
import { MerchantSnapshotList } from '../src/features/f03/components/MerchantSnapshotList';
import { UtilityPreview, type PreviewFlow } from '../src/features/f03/components/UtilityPreview';
import { configView, snapshot } from './f03.fixtures';

test('draft notices compare saved values exactly and disappear on revert/save', () => {
  const saved = { ...configView.config, alpha: 0.333333, beta: 0.666667 };
  const draft = draftFromConfig(saved);
  assert.equal(configDraftDirty(draft, saved), false);
  assert.equal(configDraftDirty({ ...draft, lambda: '0.4' }, saved), true);
  assert.equal(configDraftDirty({ ...draft, lambda: '' }, saved), true);
  assert.equal(configDraftDirty({ ...draft, lambda: '0.300000', salesWindowDays: '030' }, saved), false);
  const large = { ...saved, lambda: 1e21 };
  assert.equal(configDraftDirty(draftFromConfig(large), large), false);
});
test('Preview notice distinguishes unsaved settings from saved invalidation and clears after calculation', () => {
  const reason = 'Weight Settings changed. Calculate Preview again to use the saved settings.';
  assert.match(previewNotice(reason, true), /unsaved changes.*Save them in Weight Settings/);
  assert.equal(previewNotice(reason, false), reason);
  const dates = 'Sales period or Analysis Date changed. Calculate Preview again before creating a snapshot.';
  assert.equal(previewNotice(dates, false), dates);
  assert.equal(previewNotice('', false), '');
  assert.equal(previewNotice('', true), '', 'a successful calculation does not retain an old warning');
});
test('Preview notice is compact and precedes the Sales Period frame without changing dates', () => {
  const flow: PreviewFlow = { dates: { rangeStart: '2026-11-05', rangeEnd: '2026-11-16', asOfDate: '2026-11-17' }, setDates: () => {}, preview: null, stale: 'Calculate Preview again.', loading: false, error: '', calculate: () => {} };
  const before = JSON.stringify(flow.dates);
  const html = renderToStaticMarkup(createElement(UtilityPreview, { flow, names: {} }));
  assert.ok(html.indexOf('data-preview-notice') < html.indexOf('Select Sales Period'));
  assert.equal((html.match(/data-preview-notice/g) ?? []).length, 1);
  assert.equal(JSON.stringify(flow.dates), before);
  assert.equal(renderToStaticMarkup(createElement(UtilityPreview, { flow: { ...flow, stale: '' }, names: {} })).includes('data-preview-notice'), false);
});
test('exact duplicate warnings are grouped with counts while original evidence stays intact', () => {
  const warnings = ['MISSING_PUSH_DAY', 'Product 1: MISSING_PUSH_DAY', 'MISSING_PUSH_DAY', 'Other warning'];
  const before = JSON.stringify(warnings);
  assert.deepEqual(groupSnapshotWarnings(warnings), [{ original: 'MISSING_PUSH_DAY', count: 2 }, { original: 'Product 1: MISSING_PUSH_DAY', count: 1 }, { original: 'Other warning', count: 1 }]);
  assert.equal(JSON.stringify(warnings), before);
  assert.equal(groupSnapshotWarnings([' X', 'X']).length, 2, 'different original text is retained separately');
});
test('warning names use only an exact Product ID match and retain the original identifiers', () => {
  assert.equal(snapshotWarningProductId('Product 1: MISSING_PUSH_DAY'), 1);
  assert.equal(snapshotWarningProductId('Products 1 and 10 have a warning'), null);
  assert.match(snapshotWarningExplanation('Product 1: MISSING_PUSH_DAY', { 1: 'Fresh milk' }), /^Fresh milk \(Product #1\):.*no Push Day/);
  assert.match(snapshotWarningExplanation('Product 10: MISSING_PUSH_DAY', { 1: 'Fresh milk' }), /^Product 10:/);
  assert.match(snapshotWarningExplanation('Product 1: note', { 1: '$& Milk' }), /^\$& Milk \(Product #1\): note/);
});
test('saved snapshot actions contain only View Details and a warning count when present', () => {
  const saved = snapshot(6);
  for (const count of [0, 1, 8]) {
    const html = renderToStaticMarkup(createElement(MerchantSnapshotList, { items: [{ ...saved, warnings: Array(count).fill('MISSING_PUSH_DAY') }], busy: false }));
    assert.equal(html.includes('View Warnings'), false);
    assert.equal(html.includes('<dialog'), false);
    assert.equal(html.includes('MISSING_PUSH_DAY'), false, 'full warnings are kept out of the list');
    assert.equal(html.includes('1 warning'), count === 1);
    assert.equal(html.includes('8 warnings'), count === 8);
    assert.equal(html.includes('0 warnings'), false);
    assert.ok(html.includes('View Details for Snapshot #6'));
  }
});
test('Snapshot Details shows all warnings with originals and counts without a popup or status changes', () => {
  const saved = { ...snapshot(6), warnings: ['MISSING_PUSH_DAY', 'MISSING_PUSH_DAY', 'Unmatched warning'] };
  const before = JSON.stringify(saved);
  const html = renderToStaticMarkup(createElement(SnapshotWarnings, { snapshot: saved }));
  for (const text of ['Saved status: READY', '3 warnings', 'Repeated 2 times', 'no Push Day', 'Original warnings (saved)', 'Unmatched warning', 'separate from request errors']) assert.ok(html.includes(text), text);
  assert.equal(html.includes('<dialog'), false); assert.equal(html.includes('View Warnings'), false);
  assert.equal(JSON.stringify(saved), before);
  const empty = renderToStaticMarkup(createElement(SnapshotWarnings, { snapshot: snapshot(6) }));
  assert.ok(empty.includes('No warnings were recorded'));
});
test('Snapshot list shows saved analysis date and utility without exposing technical metadata or changing order', () => {
  const saved = { ...snapshot(6), totalWeightedUtility: 1234567.123456, warnings: ['MISSING_PUSH_DAY'] };
  const items = [saved, { ...snapshot(5), status: 'PROCESSING' }];
  const before = JSON.stringify(items);
  const html = renderToStaticMarkup(createElement(MerchantSnapshotList, { items, busy: false }));
  for (const label of ['Saved snapshots', 'Sales period', 'Analysis date', 'Total weighted utility', '1,234,567.123456', '05/11/2026', 'Status:', 'READY', 'PROCESSING']) assert.ok(html.includes(label), label);
  for (const hidden of ['Created at', 'Scoring Version', '05/11/2026 02:00 UTC']) assert.equal(html.includes(hidden), false, hidden + ' belongs in Details');
  assert.equal((html.match(/<li\b/g) ?? []).length, 2);
  assert.equal((html.match(/<h3\b/g) ?? []).length, 2);
  assert.equal((html.match(/<button\b/g) ?? []).length, 2);
  assert.ok(html.indexOf('Snapshot #6</h3>') < html.indexOf('Snapshot #5</h3>'));
  assert.ok(html.includes('Snapshot #6')); assert.ok(html.includes('01/10/2026'));
  assert.equal(html.includes('<table'), false);
  assert.equal(html.includes('<details'), false, 'warning details stay in View Details');
  assert.equal(JSON.stringify(items), before);
  const busy = renderToStaticMarkup(createElement(MerchantSnapshotList, { items, busy: true }));
  assert.equal((busy.match(/disabled=""/g) ?? []).length, 2, 'refresh disables every Details action');
});

test('empty Snapshot list offers a short next step without actions or warnings', () => {
  const html = renderToStaticMarkup(createElement(MerchantSnapshotList, { items: [], busy: false }));
  assert.ok(html.includes('No saved snapshots yet'));
  assert.ok(html.includes('Calculate a Preview, then create a snapshot'));
  assert.equal(/<button|<table|<dialog|<ul|warning/i.test(html), false);
});
