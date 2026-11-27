import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ROLE_PERMISSIONS } from '../src/services/authService';
import { getPathForScreen, getScreenFromPathname, resolveLegacyScreen } from '../src/utils/navigationRouter';
import type { ActiveNavScreen } from '../src/types/mining';

// Defect #2 of the 2026-11-27 smoke test: the legacy URL /merchandiser/recommendations showed "Permission Required".
test('the legacy recommendations screen leads Merchandisers and Store Admins to /recommendations', () => {
  for (const role of ['Merchandiser', 'Store Admin']) {
    const target = resolveLegacyScreen('merchandiser-recommendations', role);
    assert.equal(target, 'f06-recommendations', role);
    assert.equal(getPathForScreen(target), '/recommendations');
    // the target is a screen these roles may really open (the legacy one is not in their allowed list)
    assert.ok(ROLE_PERMISSIONS[role as 'Merchandiser'].allowedScreens.includes(target), `${role} may open ${target}`);
    assert.equal(ROLE_PERMISSIONS[role as 'Merchandiser'].allowedScreens.includes('merchandiser-recommendations' as ActiveNavScreen), false);
  }
});

test('other roles and signed-out visitors are not redirected', () => {
  for (const role of ['System Admin', 'End-Customer', undefined, null, '']) {
    assert.equal(resolveLegacyScreen('merchandiser-recommendations', role), 'merchandiser-recommendations', String(role));
  }
});

test('every other screen is left alone for every role', () => {
  const screens: ActiveNavScreen[] = ['f06-recommendations', 'f03-configuration', 'f05-mining', 'store-inventory', 'customer-home', 'login'];
  for (const role of ['Merchandiser', 'Store Admin', 'System Admin', 'End-Customer', undefined]) {
    for (const screen of screens) assert.equal(resolveLegacyScreen(screen, role), screen, `${role} ${screen}`);
  }
});

test('the legacy URL and screen id still resolve, so old bookmarks reach the redirect', () => {
  assert.equal(getScreenFromPathname('/merchandiser/recommendations'), 'merchandiser-recommendations');
  assert.equal(getPathForScreen('merchandiser-recommendations'), '/merchandiser/recommendations');
});
