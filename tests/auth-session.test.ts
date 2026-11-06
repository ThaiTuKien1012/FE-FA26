import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { AuthSession, INACTIVITY_MS, SessionError } from '../src/services/authSession';
import { mapAuthUser, ROLE_PERMISSIONS } from '../src/services/authService';
import { transform } from 'esbuild';
import { readFile } from 'node:fs/promises';

const me = { userId: 12, email: 'fixture@example.invalid', name: 'Fixture User', roleCode: 'MERCHANDISER', status: 'ACTIVE', emailVerified: true, storeId: 7 };
const token = (id = 'one', expiresIn = 3600) => ({ accessToken: `fixture-${id}`, expiresIn, tokenType: 'Bearer', csrfToken: `csrf-${id}` });
function global(t: TestContext, key: string, value: unknown) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, { configurable: true, value });
  t.after(() => descriptor ? Object.defineProperty(globalThis, key, descriptor) : Reflect.deleteProperty(globalThis, key));
}
function setup(t: TestContext, Session = AuthSession) {
  const storage = new Map<string, string>([['retailspace_auth_user', JSON.stringify(me)], ['retailspace_auth_token', 'legacy']]);
  global(t, 'localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  let queue = Promise.resolve();
  global(t, 'navigator', { locks: { request: (_: string, work: () => Promise<void>) => { const next = queue.then(work); queue = next.catch(() => {}); return next; } } });
  global(t, 'document', { cookie: 'PASPM-CSRF=csrf-one', visibilityState: 'visible' });
  let now = 100000;
  const session = new Session(mapAuthUser, () => now);
  t.after(() => session.dispose());
  const calls: { path: string; init: RequestInit }[] = [];
  let handler = async (path: string, _init: RequestInit): Promise<Response> => path === '/api/auth/me' ? Response.json(me) : Response.json(token());
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init: RequestInit = {}) => { calls.push({ path: String(input), init }); return handler(String(input), init); });
  return { session, storage, calls, advance: (ms: number) => { now += ms; }, handle: (fn: typeof handler) => { handler = fn; }, login: () => session.authenticate('/api/auth/login', { email: me.email, password: 'fixture-only' }) };
}

function channelFixture(t: TestContext) {
  let receive: (data: any) => void = () => { throw new Error('Channel has not started'); };
  const sent: any[] = [];
  class FixtureChannel {
    onmessage: ((event: { data: any }) => void) | null = null;
    constructor() { receive = data => this.onmessage?.({ data }); }
    postMessage(data: any) { sent.push(data); }
    close() {}
  }
  global(t, 'window', {}); global(t, 'BroadcastChannel', FixtureChannel);
  return { receive: (data: any) => receive(data), sent };
}

test('legacy logout messages never enter session state or replace a confirmed green toast', async t => {
  const f = setup(t); const channel = channelFixture(t); await f.login(); await f.session.logout();
  channel.receive({ type: 'signed-out', notice: 'Signed out.' });
  assert.equal(f.session.getSnapshot().notice, 'Signed out successfully.');
  assert.equal(f.session.getSnapshot().noticeKind, 'success');
  f.session.endLocal(' Signed out. ');
  assert.equal(f.session.getSnapshot().notice, '');
  assert.equal(channel.sent.at(-1).notice, '');
});

test('an older tab still signs out the frontend without displaying its obsolete confirmation', async t => {
  const f = setup(t); const channel = channelFixture(t); await f.login();
  f.storage.set('paspm_session_coordination', JSON.stringify({ epoch: 'legacy-tab', signedOut: true }));
  channel.receive({ type: 'signed-out', notice: 'Signed out.' });
  assert.equal(f.session.getSnapshot().status, 'anonymous'); assert.equal(f.session.getToken(), null);
  assert.equal(f.session.getSnapshot().notice, '');
  await f.session.restore(); assert.equal(f.session.getSnapshot().notice, '');
});

for (const notice of ['Signing out...', 'Signing out…']) test(`legacy pending notice ${JSON.stringify(notice)} is cleared, never treated as an error or success`, async t => {
  const f = setup(t); const channel = channelFixture(t); await f.login();
  f.storage.set('paspm_session_coordination', JSON.stringify({ epoch: 'legacy-pending', signedOut: true }));
  channel.receive({ type: 'signed-out', notice });
  assert.equal(f.session.getSnapshot().status, 'anonymous'); assert.equal(f.session.getToken(), null);
  assert.equal(f.session.getSnapshot().notice, '');
  f.session.endLocal(notice); assert.equal(channel.sent.at(-1).notice, '');
});

for (const all of [false, true]) test(`slow ${all ? 'logout-all' : 'logout'} clears local state silently and only reports success after confirmation`, async t => {
  const f = setup(t); const channel = channelFixture(t); await f.login();
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  f.handle(async () => { await gate; return Response.json({ message: 'Logged out' }); });
  const pending = f.session.logout(all);
  assert.equal(f.session.getToken(), null); assert.equal(f.session.getSnapshot().status, 'anonymous');
  assert.equal(f.session.getSnapshot().notice, ''); assert.equal(channel.sent.at(-1).notice, '');
  channel.receive({ type: 'signed-out', notice: 'Signing out...' });
  assert.equal(f.session.getSnapshot().notice, '');
  release(); assert.equal((await pending).confirmed, true);
  assert.equal(f.session.getSnapshot().noticeKind, 'success');
});

test('a peer receives a silent pending logout, then retains the real failure warning despite late pending messages', async t => {
  const f = setup(t); const channel = channelFixture(t); await f.login();
  f.storage.set('paspm_session_coordination', JSON.stringify({ epoch: 'peer-pending', signedOut: true }));
  channel.receive({ type: 'signed-out', epoch: 'peer-pending', notice: '', noticeKind: 'message' });
  assert.equal(f.session.getSnapshot().notice, '');
  f.storage.set('paspm_session_coordination', JSON.stringify({ epoch: 'peer-failed', signedOut: true }));
  const warning = 'Server-side revocation was not confirmed; the server session may remain active until revoked or expired.';
  channel.receive({ type: 'signed-out', epoch: 'peer-failed', notice: warning, noticeKind: 'message' });
  channel.receive({ type: 'signed-out', notice: 'Signing out…' });
  assert.equal(f.session.getSnapshot().notice, warning); assert.equal(f.session.getSnapshot().noticeKind, 'message');
});

test('storage fence arriving before the logout broadcast clears the peer silently and retains the later error', async t => {
  const f = setup(t); const channel = channelFixture(t); await f.login();
  const windowEvents = new EventTarget(); global(t, 'window', windowEvents);
  global(t, 'document', Object.assign(new EventTarget(), { cookie: 'PASPM-CSRF=csrf-one', visibilityState: 'visible' }));
  const cleanup = f.session.startActivity();
  f.storage.set('paspm_session_coordination', JSON.stringify({ epoch: 'peer-pending', signedOut: true }));
  windowEvents.dispatchEvent(new Event('storage'));
  assert.equal(f.session.getToken(), null); assert.equal(f.session.getSnapshot().notice, '');
  channel.receive({ type: 'signed-out', epoch: 'peer-pending', notice: '', noticeKind: 'message' });
  assert.equal(f.session.getSnapshot().notice, '');
  f.storage.set('paspm_session_coordination', JSON.stringify({ epoch: 'peer-failed', signedOut: true }));
  channel.receive({ type: 'signed-out', epoch: 'peer-failed', notice: 'Server-side revocation was not confirmed.', noticeKind: 'message' });
  assert.equal(f.session.getSnapshot().notice, 'Server-side revocation was not confirmed.');
  cleanup();
});

test('late or duplicate logout messages cannot replace warnings or resurrect dismissed success', async t => {
  const f = setup(t); const channel = channelFixture(t); await f.login();
  f.handle(async () => { throw new TypeError('offline'); });
  await f.session.logout(); const warning = f.session.getSnapshot().notice;
  channel.receive({ type: 'signed-out', epoch: 'outdated-attempt', notice: 'Signed out successfully.', noticeKind: 'success' });
  channel.receive({ type: 'signed-out', notice: 'Signed out.' });
  assert.equal(f.session.getSnapshot().notice, warning);
  assert.equal(f.session.getSnapshot().noticeKind, 'message');
  f.storage.set('paspm_session_coordination', JSON.stringify({ epoch: 'confirmed-peer', signedOut: true }));
  const confirmed = { type: 'signed-out', epoch: 'confirmed-peer', notice: 'Signed out successfully.', noticeKind: 'success' };
  channel.receive(confirmed); assert.equal(f.session.getSnapshot().noticeKind, 'success');
  f.session.dismissSuccessNotice(); channel.receive(confirmed);
  assert.equal(f.session.getSnapshot().notice, '');
});

test('recovery queued behind logout retains the success classification instead of making a persistent banner', async t => {
  const f = setup(t); const channel = channelFixture(t); await f.login();
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  global(t, 'navigator', { locks: { request: async (_: string, work: () => Promise<void>) => { await gate; return work(); } } });
  const restoring = f.session.restore();
  f.storage.set('paspm_session_coordination', JSON.stringify({ epoch: 'confirmed-peer', signedOut: true }));
  channel.receive({ type: 'signed-out', epoch: 'confirmed-peer', notice: 'Signed out successfully.', noticeKind: 'success' });
  release(); await restoring;
  assert.equal(f.session.getSnapshot().noticeKind, 'success');
  assert.equal(f.session.getSnapshot().notice, 'Signed out successfully.');
});

// Compile the actual session manager with Vite-style constants. No runtime
// backdoor or configurable token lifetime is added for these isolated fixtures.
async function sessionBuild(development: boolean, flag: string, devServer = development) {
  const result = await transform(await readFile(new URL('../src/services/authSession.ts', import.meta.url), 'utf8'), {
    loader: 'ts', format: 'esm', minify: true,
    define: { 'import.meta.env': JSON.stringify({ DEV: development, PROD: !development, SESSION_DEV_SERVER: devServer, VITE_SESSION_TIMEOUT_TEST: flag }) }
  });
  const module = await import('data:text/javascript;base64,' + Buffer.from(result.code).toString('base64'));
  return module.AuthSession as typeof AuthSession;
}

test('build/preview cannot enable fast sessions even with NODE_ENV=development and the flag enabled', async t => {
  const f = setup(t, await sessionBuild(true, 'true', false)); await f.login();
  f.advance(60000); f.session.checkActivity();
  assert.equal(f.session.isInactive(), false); assert.equal(f.session.getSnapshot().attention, false);
});

test('DEV flag: inactive at 30 seconds and dialog at 60 seconds without altering real token expiry', async t => {
  const f = setup(t, await sessionBuild(true, 'true')); await f.login();
  const expiresAt = f.session.getSnapshot().expiresAt;
  f.advance(29999); f.session.checkActivity(); assert.equal(f.session.isInactive(), false);
  f.advance(1); f.session.checkActivity(); assert.equal(f.session.isInactive(), true);
  assert.equal(f.session.getSnapshot().attention, false);
  f.advance(29999); f.session.checkActivity(); assert.equal(f.session.getSnapshot().attention, false);
  f.advance(1); f.session.checkActivity(); assert.equal(f.session.getSnapshot().attention, true);
  assert.equal(f.session.getSnapshot().expiresAt, expiresAt); assert.equal(f.session.getToken(), 'fixture-one');
  assert.equal(f.calls.filter(c => c.path.endsWith('/refresh')).length, 0);
  await Promise.all([f.session.refresh(true), f.session.refresh(true)]);
  assert.equal(f.calls.filter(c => c.path.endsWith('/refresh')).length, 1);
  assert.equal(f.session.getSnapshot().attention, false); assert.equal(f.session.isInactive(), false);
  f.session.checkActivity(); assert.equal(f.session.getSnapshot().attention, false);
  f.advance(59999); f.session.checkActivity(); assert.equal(f.session.getSnapshot().attention, false);
  f.advance(1); f.session.checkActivity(); assert.equal(f.session.getSnapshot().attention, true);
});

for (const [development, flag] of [[true, 'false'], [true, ''], [false, 'true']] as const) {
  test(`DEV=${development}, flag=${JSON.stringify(flag)} preserves production inactivity/expiry behavior`, async t => {
    const f = setup(t, await sessionBuild(development, flag)); await f.login();
    f.advance(60000); f.session.checkActivity();
    assert.equal(f.session.isInactive(), false); assert.equal(f.session.getSnapshot().attention, false);
    f.advance(INACTIVITY_MS); f.session.checkActivity();
    assert.equal(f.session.isInactive(), true); assert.equal(f.session.getSnapshot().attention, false);
    assert.equal(f.calls.filter(c => c.path.endsWith('/refresh')).length, 0);
    f.advance(3600000 - INACTIVITY_MS - 120000); f.session.checkActivity();
    assert.equal(f.session.getSnapshot().attention, true);
  });
}

test('DEV human activity resets the fast deadline; polling does not; refresh errors preserve the open dialog', async t => {
  const f = setup(t, await sessionBuild(true, 'true')); await f.login();
  const windowEvents = new EventTarget();
  global(t, 'window', windowEvents);
  global(t, 'document', Object.assign(new EventTarget(), { cookie: 'PASPM-CSRF=csrf-one', visibilityState: 'visible' }));
  const cleanup = f.session.startActivity();
  f.advance(29000); windowEvents.dispatchEvent(new Event('pointerdown'));
  f.advance(31000); f.session.checkActivity(); assert.equal(f.session.getSnapshot().attention, false);
  await f.session.request('/api/auth/me');
  f.advance(29000); f.session.checkActivity(); assert.equal(f.session.getSnapshot().attention, true);
  // Use the test's non-browser lock environment; no real browser/network is involved.
  global(t, 'window', undefined);
  f.handle(async () => { throw new TypeError('fixture offline'); });
  await assert.rejects(f.session.refresh(true));
  assert.equal(f.session.getSnapshot().attention, true); assert.equal(f.session.getCurrentUser()?.storeId, 7);
  global(t, 'window', windowEvents); cleanup();
});

test('login clears legacy persistence, validates /me and calculates expiry from actual expiresIn and request timing', async t => {
  const f = setup(t);
  assert.equal(f.session.getCurrentUser(), null);
  assert.equal(f.storage.has('retailspace_auth_token'), false);
  f.handle(async path => { if (path.endsWith('/me')) return Response.json(me); f.advance(1200); return Response.json(token('one', 120)); });
  await f.login();
  assert.equal(f.session.getSnapshot().expiresAt, 220000);
  assert.equal(f.session.getCurrentUser()?.storeId, 7);
  assert.deepEqual(f.calls.map(c => c.path), ['/api/auth/login', '/api/auth/me']);
  assert.ok([...f.storage.values()].every(value => !value.includes('fixture-one') && !value.includes('csrf-one')));
  assert.equal(f.calls[0].init.credentials, 'include');
});

test('all four backend roles retain their permissions and unsupported/inactive/unverified accounts fail closed', () => {
  for (const [code, role] of [['SYSTEM_ADMIN', 'System Admin'], ['STORE_ADMIN', 'Store Admin'], ['MERCHANDISER', 'Merchandiser'], ['END_CUSTOMER', 'End-Customer']] as const) {
    const user = mapAuthUser({ ...me, roleCode: code });
    assert.equal(user.role, role); assert.deepEqual(user.allowedScreens, ROLE_PERMISSIONS[role].allowedScreens);
  }
  for (const patch of [{ roleCode: 'UNKNOWN' }, { status: 'INACTIVE' }, { emailVerified: false }]) assert.throws(() => mapAuthUser({ ...me, ...patch }), SessionError);
});

test('Google uses the same credentials, expiry and /me validation pipeline', async t => {
  const f = setup(t);
  await f.session.authenticate('/api/auth/google', { idToken: 'test-only-google' });
  assert.deepEqual(f.calls.map(c => c.path), ['/api/auth/google', '/api/auth/me']);
  assert.equal(f.session.getSnapshot().status, 'authenticated');
});

test('concurrent refresh callers join one rotation, send matching CSRF/cookies and keep stable session identity', async t => {
  const f = setup(t); await f.login(); const identity = f.session.getSessionId();
  f.handle(async path => path.endsWith('/me') ? Response.json(me) : Response.json(token('two')));
  await Promise.all(Array.from({ length: 10 }, () => f.session.refresh()));
  const calls = f.calls.filter(c => c.path.endsWith('/refresh'));
  assert.equal(calls.length, 1); assert.equal(new Headers(calls[0].init.headers).get('X-CSRF-Token'), 'csrf-one');
  assert.equal(calls[0].init.credentials, 'include'); assert.equal(f.session.getToken(), 'fixture-two');
  assert.equal(f.session.getSessionId(), identity);
});

test('401 refresh ends a revoked/expired session and blocks reload recovery', async t => {
  const f = setup(t); await f.login();
  f.handle(async () => Response.json({ error: 'Invalid or expired refresh token' }, { status: 401 }));
  await assert.rejects(f.session.refresh(), (e: SessionError) => e.status === 401);
  assert.equal(f.session.getToken(), null); assert.equal(f.session.getSnapshot().status, 'anonymous');
  const count = f.calls.length; await f.session.restore(); assert.equal(f.calls.length, count);
});

for (const status of [403, 429, 503]) test(`refresh ${status} preserves work, shows recovery and prevents automatic retry loops`, async t => {
  const f = setup(t); await f.login();
  f.handle(async () => Response.json({ error: 'fixture error' }, { status }));
  await assert.rejects(f.session.refresh(), (e: SessionError) => e.status === status);
  assert.equal(f.session.getToken(), 'fixture-one'); assert.equal(f.session.getSnapshot().attention, true);
  const count = f.calls.length;
  await assert.rejects(f.session.refresh()); f.session.checkActivity();
  await assert.rejects(f.session.refresh(true)); assert.equal(f.calls.length, count);
  f.advance(status === 429 ? 15 * 60000 : 30000);
  f.handle(async path => path.endsWith('/me') ? Response.json(me) : Response.json(token('recovered')));
  await f.session.refresh(true); assert.equal(f.session.getSnapshot().attention, false);
});

test('network failure preserves UI and old credentials; a successful rotation is not accepted until /me confirms it', async t => {
  const f = setup(t); await f.login();
  f.handle(async path => { if (path.endsWith('/me')) throw new TypeError('offline'); return Response.json(token('unconfirmed')); });
  await assert.rejects(f.session.refresh());
  assert.equal(f.session.getToken(), 'fixture-one'); assert.equal(f.session.getSnapshot().attention, true);
});

test('recovery ignores cached users, refreshes through cookies and verifies /me; offline recovery stays protected', async t => {
  const f = setup(t);
  await f.session.restore();
  assert.deepEqual(f.calls.map(c => c.path), ['/api/auth/refresh', '/api/auth/me']);
  assert.equal(f.session.getSnapshot().status, 'authenticated');
  f.session.dispose();
  const second = new AuthSession(mapAuthUser); t.after(() => second.dispose());
  f.handle(async () => { throw new TypeError('offline'); });
  await second.restore(); assert.equal(second.getSnapshot().status, 'offline'); assert.equal(second.getCurrentUser(), null);
});

test('inactive sessions prompt only near actual expiry and stay open until explicit refresh', async t => {
  const f = setup(t); await f.login();
  f.advance(INACTIVITY_MS + 1); f.session.checkActivity(); assert.equal(f.session.getSnapshot().attention, false);
  f.advance(3600000 - INACTIVITY_MS - 60000); f.session.checkActivity();
  assert.equal(f.session.getSnapshot().attention, true);
  const count = f.calls.length;
  f.session.checkActivity(); assert.equal(f.calls.length, count);
  await f.session.refresh(true); assert.equal(f.session.getSnapshot().attention, false);
  f.session.checkActivity(); assert.equal(f.calls.filter(c => c.path.endsWith('/refresh')).length, 1);
});

test('active work silently refreshes shortly before server-provided access expiry', async t => {
  const f = setup(t);
  f.handle(async path => path.endsWith('/me') ? Response.json(me) : Response.json(token('short', 60)));
  await f.login(); f.advance(55000); f.session.checkActivity(); await f.session.refresh();
  assert.equal(f.calls.filter(c => c.path.endsWith('/refresh')).length, 1);
  assert.equal(f.session.getSnapshot().attention, false);
});

test('expired Bearer GET retries once with method, headers, signal and Response intact; ordinary 403 never refreshes', async t => {
  const f = setup(t); await f.login(); let reads = 0;
  f.handle(async path => {
    if (path.endsWith('/me')) return Response.json(me);
    if (path.endsWith('/refresh')) return Response.json(token('two'));
    if (++reads === 1) return new Response('', { status: 401, headers: { 'WWW-Authenticate': 'Bearer error="invalid_token"' } });
    return new Response('fixture-body', { status: 206, headers: { 'X-Fixture': 'yes' } });
  });
  const signal = new AbortController().signal;
  const response = await f.session.request('/api/utility/snapshots?page=2', { method: 'GET', headers: { 'X-Page': '2' }, signal });
  assert.equal(response.status, 206); assert.equal(await response.text(), 'fixture-body'); assert.equal(response.headers.get('X-Fixture'), 'yes');
  const requests = f.calls.filter(c => c.path.includes('?page=2')); assert.equal(requests.length, 2);
  assert.equal(requests[1].init.method, 'GET'); assert.equal(requests[1].init.signal, signal);
  assert.equal(new Headers(requests[1].init.headers).get('X-Page'), '2');
  assert.equal(new Headers(requests[1].init.headers).get('Authorization'), 'Bearer fixture-two');
  f.handle(async () => new Response('', { status: 403 })); const count = f.calls.length;
  assert.equal((await f.session.request('/api/utility/config')).status, 403); assert.equal(f.calls.length, count + 1);
});

test('F03 snapshot, F04 multipart import and F05 submission are never replayed, even on an expiry 401', async t => {
  const f = setup(t); await f.login();
  for (const path of ['/api/utility/snapshots', '/api/transactions/imports/csv', '/api/system/mining/requests']) {
    let writes = 0;
    const body = path.includes('/csv') ? new FormData() : JSON.stringify({ fixture: true });
    f.handle(async url => url.endsWith('/me') ? Response.json(me) : url.endsWith('/refresh') ? Response.json(token(path)) : (writes++, new Response('', { status: 401, headers: { 'WWW-Authenticate': 'Bearer error="invalid_token"' } })));
    const response = await f.session.request(path, { method: 'POST', body });
    assert.equal(response.status, 401); assert.equal(writes, 1);
    assert.equal([...f.calls].reverse().find(c => c.path === path)?.init.body, body);
  }
});

test('network errors and generic 401 never replay writes or trigger speculative refresh', async t => {
  const f = setup(t); await f.login(); const count = f.calls.length;
  f.handle(async () => new Response('', { status: 401 }));
  await f.session.request('/api/auth/password/change', { method: 'POST', body: '{}' }); assert.equal(f.calls.length, count + 1);
  f.handle(async () => { throw new TypeError('network outcome unknown'); });
  await assert.rejects(f.session.request('/api/utility/snapshots', { method: 'POST', body: '{}' })); assert.equal(f.calls.length, count + 2);
});

test('eligible read retries at most once; logout/auth requests are excluded from interception', async t => {
  const f = setup(t); await f.login(); let reads = 0;
  f.handle(async path => path.endsWith('/me') ? Response.json(me) : path.endsWith('/refresh') ? Response.json(token('two')) : (reads++, new Response('', { status: 401, headers: { 'WWW-Authenticate': 'Bearer error="invalid_token"' } })));
  assert.equal((await f.session.request('/api/products')).status, 401); assert.equal(reads, 2); assert.equal(f.session.getToken(), null);
  const count = f.calls.length; await f.session.request('/api/auth/logout', { method: 'POST' }); assert.equal(f.calls.length, count + 1);
});

for (const all of [false, true]) test(`${all ? 'logout-all' : 'logout'} sends Bearer, cookies and CSRF, clears memory and fences a late refresh`, async t => {
  const f = setup(t); await f.login();
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  let started!: () => void; const ready = new Promise<void>(resolve => { started = resolve; });
  f.handle(async path => {
    if (path.endsWith('/refresh')) { started(); await gate; return Response.json(token('late')); }
    return path.endsWith('/me') ? Response.json(me) : Response.json({ message: 'Logged out' });
  });
  const refresh = f.session.refresh(); const rejected = assert.rejects(refresh); await ready;
  const logout = f.session.logout(all); assert.equal(f.session.getToken(), null); release();
  await rejected; assert.equal((await logout).confirmed, true); assert.equal(f.session.getToken(), null);
  assert.equal(f.session.getSnapshot().noticeKind, 'success');
  assert.equal(f.session.getSnapshot().notice, all ? 'Signed out from all devices.' : 'Signed out successfully.');
  const call = f.calls.find(c => c.path === (all ? '/api/auth/logout-all' : '/api/auth/logout'))!;
  assert.equal(call.init.credentials, 'include'); assert.equal(new Headers(call.init.headers).get('Authorization'), 'Bearer fixture-one');
  assert.equal(new Headers(call.init.headers).get('X-CSRF-Token'), 'csrf-one');
});

test('unconfirmed logout clears local UI, explains server revocation failure and cannot restore on reload', async t => {
  const f = setup(t); await f.login();
  f.handle(async () => { throw new TypeError('offline'); });
  assert.equal((await f.session.logout()).confirmed, false); assert.equal(f.session.getToken(), null);
  assert.match(f.session.getSnapshot().notice, /revocation was not confirmed/);
  assert.equal(f.session.getSnapshot().noticeKind, 'message');
  f.session.dismissSuccessNotice();
  assert.match(f.session.getSnapshot().notice, /revocation was not confirmed/);
  const count = f.calls.length; await f.session.restore(); assert.equal(f.calls.length, count);
});

test('logout success can be dismissed and a new login clears stale success even if login fails', async t => {
  const f = setup(t); await f.login(); await f.session.logout();
  f.session.dismissSuccessNotice(); assert.equal(f.session.getSnapshot().notice, '');
  await f.login(); await f.session.logout();
  f.handle(async () => Response.json({ error: 'Invalid credentials' }, { status: 401 }));
  await assert.rejects(f.login());
  assert.equal(f.session.getSnapshot().notice, ''); assert.equal(f.session.getSnapshot().noticeKind, 'message');
});

test('duplicate logout callbacks join one backend request and publish one success notice', async t => {
  const f = setup(t); await f.login(); let successes = 0;
  f.session.subscribe(() => { if (f.session.getSnapshot().noticeKind === 'success') successes++; });
  const first = f.session.logout(); const second = f.session.logout();
  assert.equal(first, second); await Promise.all([first, second]);
  assert.equal(f.calls.filter(c => c.path === '/api/auth/logout').length, 1); assert.equal(successes, 1);
});

test('replacing a subscription during notification does not notify it repeatedly in the same cycle', t => {
  const f = setup(t); let calls = 0; let unsubscribe: () => void;
  const listener = () => {
    calls++;
    if (calls < 3) { unsubscribe(); unsubscribe = f.session.subscribe(listener); }
  };
  unsubscribe = f.session.subscribe(listener);
  f.session.endLocal('Signed out successfully.', 'success');
  assert.equal(calls, 1); unsubscribe();
});

test('HTTP logout failures never publish success or lose the revocation warning', async t => {
  const f = setup(t); await f.login();
  f.handle(async () => Response.json({ error: 'CSRF validation failed' }, { status: 403 }));
  assert.equal((await f.session.logout()).confirmed, false);
  assert.equal(f.session.getSnapshot().noticeKind, 'message');
  f.session.dismissSuccessNotice(); assert.match(f.session.getSnapshot().notice, /revocation was not confirmed/);
});

test('late focus/storage events after logout cannot replace its success or revocation warning', async t => {
  const f = setup(t); await f.login();
  const windowEvents = new EventTarget();
  global(t, 'window', windowEvents);
  global(t, 'document', Object.assign(new EventTarget(), { cookie: 'PASPM-CSRF=csrf-one', visibilityState: 'visible' }));
  const cleanup = f.session.startActivity();
  f.session.endLocal('Signed out successfully.', 'success');
  windowEvents.dispatchEvent(new Event('focus'));
  assert.equal(f.session.getSnapshot().noticeKind, 'success');
  assert.equal(f.session.getSnapshot().notice, 'Signed out successfully.');
  f.session.endLocal('Server-side revocation was not confirmed.');
  windowEvents.dispatchEvent(new Event('storage'));
  assert.equal(f.session.getSnapshot().notice, 'Server-side revocation was not confirmed.');
  cleanup();
});

test('background reads do not count as activity and expired inactive writes wait for explicit confirmation', async t => {
  const f = setup(t); await f.login(); f.advance(INACTIVITY_MS + 1);
  await f.session.request('/api/auth/me');
  f.advance(3600000 - INACTIVITY_MS); f.session.checkActivity();
  assert.equal(f.session.getSnapshot().attention, true);
  const count = f.calls.length;
  assert.equal((await f.session.request('/api/utility/snapshots', { method: 'POST', body: '{}' })).status, 401);
  assert.equal(f.calls.length, count);
});

test('aborted requests never refresh or replay; expired writes refresh before a single submission', async t => {
  const f = setup(t);
  f.handle(async path => path.endsWith('/me') ? Response.json(me) : Response.json(token('short', 60)));
  await f.login(); f.advance(61000);
  const aborted = new AbortController(); aborted.abort(); const count = f.calls.length;
  await assert.rejects(f.session.request('/api/products', { signal: aborted.signal })); assert.equal(f.calls.length, count);
  await f.session.request('/api/utility/snapshots', { method: 'POST', body: '{}' });
  assert.deepEqual(f.calls.slice(count).map(c => c.path), ['/api/auth/refresh', '/api/auth/me', '/api/utility/snapshots']);
});

test('hidden tabs pause refresh; visibility wake checks deadlines; activity listeners and timers clean up', async t => {
  const f = setup(t);
  f.handle(async path => path.endsWith('/me') ? Response.json(me) : Response.json(token('short', 60)));
  await f.login();
  const windowEvents = new EventTarget();
  const documentEvents = Object.assign(new EventTarget(), { cookie: 'PASPM-CSRF=csrf-one', visibilityState: 'hidden' });
  global(t, 'window', windowEvents); global(t, 'document', documentEvents);
  // Initialization already ran without a DOM; activity itself requires no network/channel.
  const added: string[] = [], removed: string[] = [];
  const add = windowEvents.addEventListener.bind(windowEvents), remove = windowEvents.removeEventListener.bind(windowEvents);
  t.mock.method(windowEvents, 'addEventListener', (name: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => { added.push(name); add(name, callback, options); });
  t.mock.method(windowEvents, 'removeEventListener', (name: string, callback: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => { removed.push(name); remove(name, callback, options); });
  const cleanup = f.session.startActivity(); f.advance(55000); f.session.checkActivity();
  assert.equal(f.calls.filter(c => c.path.endsWith('/refresh')).length, 0);
  // Restore the non-DOM environment for coordination while simulating the wake listener.
  global(t, 'window', undefined); documentEvents.visibilityState = 'visible';
  documentEvents.dispatchEvent(new Event('visibilitychange')); await f.session.refresh();
  assert.equal(f.calls.filter(c => c.path.endsWith('/refresh')).length, 1);
  global(t, 'window', windowEvents); cleanup();
  assert.deepEqual(added.sort(), removed.sort());
});

test('secure CSRF cookie is supported; logout can renew expired Bearer before revoking without restoring UI', async t => {
  const f = setup(t); await f.login();
  global(t, 'document', { cookie: '__Host-PASPM-CSRF=secure-csrf', visibilityState: 'visible' });
  f.advance(3600001);
  f.handle(async path => path.endsWith('/refresh') ? Response.json(token('for-logout')) : Response.json({ message: 'Logged out' }));
  assert.equal((await f.session.logout()).confirmed, true);
  const refresh = f.calls.find(c => c.path.endsWith('/refresh'))!;
  const logout = f.calls.find(c => c.path.endsWith('/logout'))!;
  assert.equal(new Headers(refresh.init.headers).get('X-CSRF-Token'), 'secure-csrf');
  assert.equal(new Headers(logout.init.headers).get('Authorization'), 'Bearer fixture-for-logout');
  assert.equal(f.session.getToken(), null);
});
