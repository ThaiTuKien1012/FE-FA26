import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MockAnalytics } from '../src/features/merchandising-mock/MockAnalytics';
import { benchmarkPairs, benchmarkEligibility } from '../src/features/merchandising-mock/mock.benchmarks';
import type { MockState } from '../src/features/merchandising-mock/mock.types';

const empty: MockState = { schemaVersion: 1, revision: 0, layouts: [], campaigns: [], activeByStore: {} };

test('benchmark comparison requires every matching condition and opposite algorithms', () => {
  const { huiMiner, efim } = benchmarkPairs[0];
  assert.deepEqual(benchmarkEligibility(huiMiner, efim), []);
  for (const key of ['datasetHash', 'threshold', 'utilityModel', 'hardware', 'repeatProtocol', 'outputChecksum'] as const) {
    const altered = { ...efim, [key]: `${efim[key]}-different` };
    assert.ok(benchmarkEligibility(huiMiner, altered).includes(key));
  }
  assert.ok(benchmarkEligibility(huiMiner, { ...efim, algorithm: 'HUI-Miner' }).includes('algorithm'));
  assert.ok(benchmarkEligibility(benchmarkPairs[1].huiMiner, benchmarkPairs[1].efim).includes('outputChecksum'));
});

test('empty analytics labels synthetic history and never invents simulation data', () => {
  const html = renderToStaticMarkup(React.createElement(MockAnalytics, { state: empty, storeId: 'north' }));
  assert.match(html, /No simulation results yet/);
  assert.match(html, /No active layout/);
  assert.match(html, /Synthetic historical benchmark fixtures/);
  assert.match(html, /Excluded from comparison/);
  assert.match(html, /142 ms/);
  assert.doesNotMatch(html, /93 ms|35 MB/);
  assert.doesNotMatch(html, /Simulated bundle revenue<\/h3>/);
});

test('analytics uses latest store-scoped simulation, distinct units and actual layout results', () => {
  const state = { ...empty, activeByStore: { north: 'layout-b' }, layouts: [
    { id: 'layout-b', storeId: 'north', name: 'Mint display', version: 2, status: 'PUBLISHED', placements: [] },
  ], campaigns: [
    { id: 'old', storeId: 'north', name: 'Earlier trial', baselineId: null, proposedId: 'layout-b', result: { seed: 1, visitors: 100, a: { orders: 2, revenue: 10000, utility: 12 }, b: { orders: 3, revenue: 20000, utility: 18 } } },
    { id: 'new', storeId: 'north', name: 'Latest trial', baselineId: null, proposedId: 'layout-b', result: { seed: 2, visitors: 200, a: { orders: 4, revenue: 30000, utility: 24 }, b: { orders: 5, revenue: 40000, utility: 30 } } },
    { id: 'other', storeId: 'south', name: 'SECRET OTHER STORE', baselineId: null, proposedId: 'other-layout', result: { seed: 3, visitors: 500, a: { orders: 0, revenue: 0, utility: 0 }, b: { orders: 1, revenue: 999999, utility: 9999 } } },
  ] } as MockState;
  const html = renderToStaticMarkup(React.createElement(MockAnalytics, { state, storeId: 'north' }));
  assert.match(html, /Mint display/);
  assert.match(html, /value="new" selected=""/);
  assert.match(html, /fixture utility units/);
  assert.match(html, /40,000 VND/);
  assert.match(html, /30 fixture utility units/);
  assert.match(html, /Earlier trial/);
  assert.doesNotMatch(html, /SECRET OTHER STORE|999,999/);
});
