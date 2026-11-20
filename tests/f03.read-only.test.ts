import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProductPriorityContent } from '../src/features/f03/components/MerchantProductScores';
import { MerchantSnapshotList } from '../src/features/f03/components/MerchantSnapshotList';
import { SnapshotMetadataContent } from '../src/features/f03/components/SnapshotMetadataDetails';
import { scores, snapshot } from './f03.fixtures';

test('shared priority content omits season management and editing for read-only callers', () => {
  const html = renderToStaticMarkup(createElement(ProductPriorityContent, { scores }));
  for (const label of ['Expiry Risk', 'Seasonal Priority', 'Priority Multiplier', 'Selected Season', 'Readiness', 'Technical Details']) assert.ok(html.includes(label), label);
  assert.equal(/Manage Seasons|<input|<select|<form|Save Configuration/.test(html), false);
  const editable = renderToStaticMarkup(createElement(ProductPriorityContent, { scores, onManageSeasons: () => {} }));
  assert.ok(editable.includes('Manage Seasons'));
});

test('Store Admin metadata Details retains exact saved fields, configuration and warning evidence without a matrix', () => {
  const value = { ...snapshot(6), totalWeightedUtility: 1234567.123456, warnings: ['MISSING_PUSH_DAY', 'MISSING_PUSH_DAY', 'Original evidence'] };
  const before = JSON.stringify(value);
  const html = renderToStaticMarkup(createElement(SnapshotMetadataContent, { snapshot: value }));
  for (const label of ['Sales Period', 'Analysis Date', '1,234,567.123456', '05/11/2026 02:00 UTC', 'Configuration Metadata', 'W2_EXPIRY_SEASON_V1', 'Snapshot Warnings', '3 warnings', 'Repeated 2 times', 'Original evidence', 'Original configuration metadata']) assert.ok(html.includes(label), label);
  assert.equal(/Snapshot Matrix|Utility matrix|Create Snapshot|<form|<input|<table/.test(html), false);
  assert.equal(JSON.stringify(value), before);
});

test('metadata Details never substitutes current configuration when saved metadata is absent or unknown', () => {
  const absent = renderToStaticMarkup(createElement(SnapshotMetadataContent, { snapshot: { ...snapshot(), configuration: null } }));
  assert.ok(absent.includes('Configuration metadata was not supplied'));
  assert.equal(absent.includes('W2_EXPIRY_SEASON_V1'), false);
  const value = snapshot();
  const future = { ...value, configuration: { ...value.configuration!, config: { ...value.configuration!.config, scoringVersion: 'FUTURE_V9' } } };
  const html = renderToStaticMarkup(createElement(SnapshotMetadataContent, { snapshot: future as typeof value }));
  assert.ok(html.includes('FUTURE_V9'));
  assert.equal(JSON.stringify(future.configuration).includes('FUTURE_V9'), true);
});

test('both roles share snapshot rows; read-only empty state never asks Store Admin to calculate or create', () => {
  const items = [snapshot(6)];
  const merchant = renderToStaticMarkup(createElement(MerchantSnapshotList, { items, busy: false }));
  const admin = renderToStaticMarkup(createElement(MerchantSnapshotList, { items, busy: false, readOnly: true, onView: () => {} }));
  assert.equal(admin, merchant);
  const empty = renderToStaticMarkup(createElement(MerchantSnapshotList, { items: [], busy: false, readOnly: true }));
  assert.ok(empty.includes('READY snapshots from your store'));
  assert.equal(/Preview|create/i.test(empty), false);
});
