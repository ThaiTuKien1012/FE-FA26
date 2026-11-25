import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { authService } from '../src/services/authService';
import { isStoreAdmin, storeAdminCopy, storeAdminMessage } from '../src/utils/storeAdminCopy';
import { SnapshotMetadataContent } from '../src/features/f03/components/SnapshotMetadataDetails';
import { ProductPriorityContent } from '../src/features/f03/components/MerchantProductScores';
import { snapshot, scores } from './f03.fixtures';
import { user } from './f05.fixtures';

test('Store Admin wording is scoped; other roles and signed-out screens retain their original copy', t => {
  for (const role of ['Store Admin', 'Merchandiser', 'System Admin', 'End-Customer', null] as const) {
    const mock = t.mock.method(authService, 'getCurrentUser', () => role ? { ...user, role } : null);
    assert.equal(isStoreAdmin(), role === 'Store Admin');
    assert.equal(storeAdminCopy('Original wording', 'Store wording'), role === 'Store Admin' ? 'Store wording' : 'Original wording');
    const raw = '{"message":"source_order_id: Check order ORDER-00123"}';
    assert.equal(storeAdminMessage(raw), role === 'Store Admin' ? 'Order ID: Check order ORDER-00123' : raw);
    mock.mock.restore();
  }
});

test('Readable errors preserve order/product codes and values without claiming uncertain writes failed', t => {
  t.mock.method(authService, 'getCurrentUser', () => ({ ...user, role: 'Store Admin' as const }));
  assert.equal(storeAdminMessage('[{"field":"sku","message":"Unknown product FM26-0290"},{"field":"unit_cost","message":"Must be at least 123.456"}]'), 'SKU: Unknown product FM26-0290\nUnit cost: Must be at least 123.456');
  for (const message of ['The file may already have been received. Check Import History.', 'Selling price is below unit cost.', 'MISSING_PUSH_DAY: Batch #123 needs review.']) assert.equal(storeAdminMessage(message), message);
  for (const message of ['{"stack":"private details"}', 'java.sql.SQLException: private table']) {
    const text = storeAdminMessage(message);
    assert.doesNotMatch(text, /private|SQLException|\{|not saved|no data was saved/i);
    assert.match(text, /Refresh|administrator/);
  }
  assert.match(storeAdminMessage('The server returned a number that this client cannot preserve safely. This response was not used.'), /could not be read accurately.*not displayed/);
});

test('Read-only product priorities retain precise scores and warnings without raw evidence JSON', t => {
  t.mock.method(authService, 'getCurrentUser', () => ({ ...user, role: 'Store Admin' as const }));
  const value = { ...scores, expiryRisk: '0.123456789012345678' };
  const before = JSON.stringify(value);
  const html = renderToStaticMarkup(createElement(ProductPriorityContent, { scores: value }));
  assert.ok(html.includes('0.123456789012345678')); assert.ok(html.includes('Technical Details'));
  assert.ok(html.includes('Priorities reflect current stock, recent sales and assigned seasons.'));
  assert.doesNotMatch(html, /<pre|Manage Seasons|<input|<form/);
  assert.equal(JSON.stringify(value), before);
});

test('Saved snapshot labels retain historical coefficient meanings and exact values without rewriting data', () => {
  const original = snapshot();
  const legacy = { ...original, totalWeightedUtility: '12345678901.123456', configuration: { ...original.configuration!, config: { scoringVersion: 'F03_LINEAR_V1', alpha: '0.1', beta: '0.2', gamma: '0.7', lambda: '1.1', version: 4, enableStock: true, enableExpiry: true, enableSeason: false, expiryWindowDays: 7 }, lambdaPolicy: { lambdaMin: 0, lambdaMax: 1.5, version: 1 }, effectiveCoefficients: { alpha: '0.1', beta: '0.2', gamma: '0.7' } } };
  const before = JSON.stringify(legacy);
  const html = renderToStaticMarkup(createElement(SnapshotMetadataContent, { snapshot: legacy }));
  for (const [label, number] of [['Stock Importance', '0.1'], ['Expiry Importance', '0.2'], ['Season Importance', '0.7']]) assert.ok(html.includes(`${label}</dt><dd class="mt-1 break-words font-semibold tabular-nums">${number}`));
  assert.ok(html.includes('12,345,678,901.123456')); assert.doesNotMatch(html, /<pre|<form|Create Snapshot/);
  assert.equal(JSON.stringify(legacy), before);
});
