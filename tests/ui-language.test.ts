import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { batchExpiryLabel } from '../src/features/store/f02.tables';

// Defect #6 of the 2026-11-27 smoke test: Vietnamese and English text were mixed inside two English screens.
const VIETNAMESE = /[ăâđêôơưáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵ]/i;
const visibleSource = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

for (const [screen, path] of [['Sign-in page', 'src/features/auth/components/LoginView.tsx'], ['Inventory Batches', 'src/features/store/components/StoreBatchesView.tsx']] as const) {
  test(`${screen} contains no Vietnamese text (the screen is English)`, () => {
    const match = visibleSource(path).match(new RegExp('.{0,30}' + VIETNAMESE.source + '.{0,30}', 'i'));
    assert.equal(match, null, `Vietnamese text left in ${path}: ${match?.[0]}`);
  });
}

test('the inactive-Store notice is in the same language as the sign-in page', () => {
  assert.match(visibleSource('src/services/authSession.ts'), /Your store is inactive\./);
  assert.match(visibleSource('src/features/auth/components/LoginView.tsx'), /Sign in to the system/);
});

test('batch expiry labels use the screen\'s own words', () => {
  assert.equal(batchExpiryLabel({ effectiveStatus: 'EXPIRED', daysToExpiry: -1 }), 'Expired');
  assert.equal(batchExpiryLabel({ effectiveStatus: 'ACTIVE', daysToExpiry: 0 }), 'Expiring soon');
  assert.equal(batchExpiryLabel({ effectiveStatus: 'ACTIVE', daysToExpiry: 30 }), null);
});
