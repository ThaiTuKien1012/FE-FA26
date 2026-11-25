import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ROLE_PERMISSIONS, authService } from '../src/services/authService';
import { selectedStoreOption } from '../src/features/storeManagement/useSelectedStore';
import { accountDraft, mapAccount, planAccountUpdate } from '../src/features/users/account-management';
import { AuthSession } from '../src/services/authSession';
import { getScreenFromPathname } from '../src/utils/navigationRouter';
import { storesApi, StoreConflict, validateStoreImage } from '../src/features/storeManagement/storeManagement.api';

test('Store routes are limited to the roles defined by F01', () => {
  assert.equal(getScreenFromPathname('/admin/stores'), 'admin-stores');
  assert.equal(getScreenFromPathname('/store/profile'), 'my-store');
  for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    assert.equal(permissions.allowedScreens.includes('admin-stores'), role === 'System Admin');
    assert.equal(permissions.allowedScreens.includes('my-store'), ['Store Admin', 'Merchandiser'].includes(role));
  }
});

test('Store API encodes filters and writes profile and multipart with contract fields', async t => {
  const request = t.mock.method(authService, 'request', async () => Response.json({}));
  await storesApi.list(1, 'A & B', 'INACTIVE');
  assert.equal(request.mock.calls[0].arguments[0], '/api/system/stores?page=1&pageSize=20&q=A+%26+B&status=INACTIVE');
  await storesApi.updateProfile({ expectedVersion: 7, address: null, phone: '123' });
  assert.deepEqual(JSON.parse(String(request.mock.calls[1].arguments[1]?.body)), { expectedVersion: 7, address: null, phone: '123' });
  const file = new File(['test'], 'icon.png', { type: 'image/png' });
  await storesApi.upload(1, 'icon', file);
  const init = request.mock.calls[2].arguments[1];
  assert.equal(init?.method, 'PUT');
  assert.equal((init?.body as FormData).get('file'), file);
  assert.equal(init?.headers, undefined);
});

test('version conflicts are distinguished from duplicate field errors', async t => {
  const request = t.mock.method(authService, 'request', async () => Response.json({ error: 'Store version conflict' }, { status: 409 }));
  await assert.rejects(storesApi.updateProfile({ expectedVersion: 1, address: null, phone: null }), StoreConflict);
  request.mock.mockImplementation(async () => Response.json({ error: 'Store slug already exists' }, { status: 409 }));
  await assert.rejects(storesApi.create({ name: 'Example', slug: 'example' }), { message: 'Store slug already exists' });
});

test('inactive Store response clears the local session without another API call', async t => {
  const session = new AuthSession(data => data);
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Store is inactive', code: 'STORE_INACTIVE' }, { status: 403 }));
  const response = await session.request('/api/store/profile');
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'STORE_INACTIVE');
  assert.equal(session.getSnapshot().status, 'anonymous');
  assert.match(session.getSnapshot().notice, /store is inactive/i);
  assert.equal(fetch.mock.callCount(), 1);
});

test('image checks reject wrong bytes, excessive size and excessive dimensions', async () => {
  const png = new File([Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10)], 'icon.png');
  await assert.rejects(validateStoreImage(new File(['svg'], 'icon.png', { type: 'image/png' }), 'icon'), /PNG or JPEG/);
  await assert.rejects(validateStoreImage(new File([new Uint8Array(1048577)], 'large.png'), 'icon'), /1 MiB/);
  await assert.rejects(validateStoreImage(png, 'icon', async () => ({ width: 4001, height: 4000 })), /4000/);
  await validateStoreImage(png, 'icon', async () => ({ width: 4000, height: 4000 }));
});

test('an inactive assignment is labelled and cannot be selected as a new assignment', () => {
  assert.deepEqual(selectedStoreOption(4, { storeId: 4, name: 'Archived Store', status: 'INACTIVE' }), {
    label: 'Archived Store · #4 · Inactive',
    disabled: true,
  });
  assert.deepEqual(selectedStoreOption(4, { storeId: 4, name: 'Other page', status: 'ACTIVE' }), {
    label: 'Other page · #4',
    disabled: false,
  });
  assert.deepEqual(selectedStoreOption(4, null), { label: 'Current Store #4', disabled: false });
});

test('editing only an account name keeps its existing Store assignment', () => {
  const account = mapAccount({ userId: 19, name: 'Before', email: 'test@example.invalid',
    roleCode: 'STORE_ADMIN', status: 'ACTIVE', emailVerified: true, storeId: 4 });
  const draft = { ...accountDraft(account), name: 'After' };
  assert.equal(draft.storeId, '4');
  assert.deepEqual(planAccountUpdate(account, draft, '1'), [
    { field: 'name', method: 'PUT', path: '/api/users/19', body: { name: 'After' } },
  ]);
});
