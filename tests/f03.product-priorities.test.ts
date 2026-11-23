import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProductPriorityContent } from '../src/features/f03/components/MerchantProductScores';
import { scores } from './f03.fixtures';

test('priority Details retains backend values, selected season and full evidence without editable weights', () => {
  const value = structuredClone(scores), before = JSON.stringify(value);
  const html = renderToStaticMarkup(createElement(ProductPriorityContent, { scores: value, onManageSeasons: () => {} }));
  for (const label of ['Expiry Risk', 'Seasonal Priority', 'Priority Multiplier', 'Selected Season', 'Readiness', 'Analysis Date', 'Holiday', 'Technical Details', 'How these priorities were selected', '0.25', '1.14', '05/11/2026']) assert.ok(html.includes(label), label);
  assert.ok(html.includes('&quot;batchId&quot;: 9'));
  assert.equal(/<input|<select|<textarea/.test(html), false);
  assert.equal(JSON.stringify(value), before);
});

test('unavailable priorities and missing season remain backend results rather than client recomputation', () => {
  const value = { ...structuredClone(scores), seasonId: null, seasonWeight: 0, activeSeasons: [], ready: false, lambdaValid: false, weightValue: null, warnings: ['MISSING_PUSH_DAY', 'Custom saved warning'] };
  const html = renderToStaticMarkup(createElement(ProductPriorityContent, { scores: value, onManageSeasons: () => {} }));
  for (const label of ['No active season', 'Unavailable', 'Priority Strength exceeds', 'no Push Day', 'Custom saved warning']) assert.ok(html.includes(label), label);
  assert.equal(html.includes('1.14'), false);
});
