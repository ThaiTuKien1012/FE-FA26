import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DemoAuthService, DEMO_PERSONA_KEY, DEMO_ROLES } from '../src/demo/demo.auth';
import { ROLE_PERMISSIONS } from '../src/services/auth.api-adapter';

test('demo personas persist, scope stores and never create real auth sessions', async t => {
  const values = new Map<string, string>([['paspm_session_credentials', 'real credentials untouched']]);
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } });
  t.after(() => previous ? Object.defineProperty(globalThis, 'localStorage', previous) : Reflect.deleteProperty(globalThis, 'localStorage'));
  let backendCalls = 0;
  t.mock.method(globalThis, 'fetch', async () => { backendCalls++; throw new Error('Backend must never be called'); });
  const service = new DemoAuthService(ROLE_PERMISSIONS);
  assert.equal(service.getSnapshot().status, 'authenticated');
  await service.restore();
  service.selectPersona('Store Admin', 4);
  assert.equal((await service.getMe()).userId, 40);
  service.selectPersona('Merchandiser', 3);
  assert.equal((await service.getMe()).userId, 31);
  for (const role of DEMO_ROLES) {
    const user = service.selectPersona(role, 2);
    assert.equal(user.role, role);
    assert.equal(user.storeId, 2);
    assert.equal(service.isScreenAllowed(user, user.defaultScreen), true);
  }
  const restored = new DemoAuthService(ROLE_PERMISSIONS);
  assert.equal(restored.getCurrentUser()?.role, 'End-Customer');
  assert.equal(restored.getCurrentUser()?.storeId, 2);
  assert.equal(restored.isScreenAllowed(restored.getCurrentUser(), 'users'), false);
  assert.throws(() => restored.selectPersona('Store Admin', 999));
  assert.equal((await restored.requestRegistration('test@example.invalid')).success, false);
  assert.equal((await restored.verifyOtp('test@example.invalid', '123456')).success, false);
  assert.equal((await restored.changePassword('before', 'after')).success, false);
  assert.equal((await restored.requestPasswordReset('test@example.invalid')).success, false);
  await assert.rejects(restored.loginGoogle('token'), /unavailable/);
  await restored.logout();
  assert.equal(values.get('paspm_session_credentials'), 'real credentials untouched');
  assert.equal(JSON.parse(values.get(DEMO_PERSONA_KEY)!).version, 1);
  assert.equal(backendCalls, 0);
});

test('invalid persona schema falls back safely', t => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => JSON.stringify({ version: 99, role: 'System Admin', storeId: 800 }) } });
  t.after(() => previous ? Object.defineProperty(globalThis, 'localStorage', previous) : Reflect.deleteProperty(globalThis, 'localStorage'));
  const service = new DemoAuthService(ROLE_PERMISSIONS);
  assert.equal(service.getCurrentUser()?.role, 'Merchandiser');
  assert.equal(service.getCurrentUser()?.storeId, 1);
});


test('restored persona synchronizes customer store and local avatars persist', async t => {
  const values = new Map<string, string>([[DEMO_PERSONA_KEY, JSON.stringify({ version: 1, role: 'Store Admin', storeId: 4, avatars: { 'Store Admin-4': 'data:image/png;base64,aGVsbG8=' } })]]);
  for (const key of ['localStorage', 'sessionStorage']) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value: { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) } });
    t.after(() => descriptor ? Object.defineProperty(globalThis, key, descriptor) : Reflect.deleteProperty(globalThis, key));
  }
  const service = new DemoAuthService(ROLE_PERMISSIONS);
  assert.equal(values.get('retailspace_customer_store'), 'store-n1');
  assert.equal((await service.getMe()).avatarUrl, 'data:image/png;base64,aGVsbG8=');
  await service.deleteAvatar();
  assert.equal((await new DemoAuthService(ROLE_PERMISSIONS).getMe()).avatarUrl, null);
  await assert.rejects(service.uploadAvatar(new File(['large'], 'x.svg', { type: 'image/svg+xml' })), /PNG/);
});


test('shopping store changes persist without changing route identity or staff assignment', t => {
  const values = new Map<string, string>();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) } });
  t.after(() => descriptor ? Object.defineProperty(globalThis, 'localStorage', descriptor) : Reflect.deleteProperty(globalThis, 'localStorage'));
  const service = new DemoAuthService(ROLE_PERMISSIONS);
  service.selectCustomerStore('store-q1');
  assert.equal(service.getCurrentUser()?.storeId, 1, 'a staff preview does not alter assignment');
  service.selectPersona('End-Customer', 1);
  const session = service.getSessionId();
  service.selectCustomerStore('store-q1');
  assert.equal(service.getSessionId(), session, 'store selection must not remount App');
  assert.equal(service.getCurrentUser()?.storeId, 2);
  assert.equal(new DemoAuthService(ROLE_PERMISSIONS).getCurrentUser()?.storeId, 2);
  assert.throws(() => service.selectCustomerStore('invalid-store'));
});
