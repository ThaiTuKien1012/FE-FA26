// Fixture-only browser tests. ALL /api traffic is intercepted, including unknown endpoints.
// Start Vite, then npm run test:session:browser (optional PASPM_TEST_ORIGIN / SESSION_TEST_CHROME).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const origin = process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3000';
const base = resolve(tmpdir());
const profile = mkdtempSync(join(base, 'paspm-session-browser-'));
const artifacts = mkdtempSync(join(base, 'paspm-session-preview-'));
const chrome = spawn(process.env.SESSION_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-sync', '--disable-extensions', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
class CDP {
  id = 0; pending = new Map(); listeners = new Map(); closed = false;
  constructor(ws) {
    this.ws = ws;
    ws.addEventListener('message', event => {
      const data = JSON.parse(event.data);
      if (data.id) {
        const pending = this.pending.get(data.id); if (!pending) return;
        this.pending.delete(data.id); data.error ? pending.reject(new Error(data.error.message)) : pending.resolve(data.result);
      } else for (const listener of this.listeners.get(data.method) || []) void listener(data.params);
    });
    ws.addEventListener('close', () => {
      this.closed = true;
      this.pending.forEach(pending => pending.reject(new Error('Browser connection closed')));
      this.pending.clear();
    });
  }
  call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000);
      this.pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(name, listener) { this.listeners.set(name, [...this.listeners.get(name) || [], listener]); }
  async evaluate(expression) {
    const result = await this.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).catch(error => { throw new Error(error.message + ' while evaluating: ' + expression.slice(0, 180)); });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result?.value;
  }
}
const calls = [], unexpected = [], errors = [], checks = [], pages = [];
let port, browser, first, closing = false;
const state = { serial: 0, csrf: '', refresh: '', refreshStatus: 200, network: false, holdRefresh: false, holdLogout: false, logoutStatus: 200, ttl: 3600, role: 'MERCHANDISER' };
function user() { return { userId: 12, email: 'fixture@example.invalid', name: 'Session Fixture', roleCode: state.role, storeId: 1, status: 'ACTIVE', emailVerified: true, avatarUrl: null }; }
// Import the exact URL used by the app: Vite can append an HMR timestamp.
// Importing the bare path after an edit could instantiate a second, unrelated service.
const session = "(await (window.fixtureService ??= import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/services/authService.ts').name))).authService";
async function until(page, expression, label) {
  const end = Date.now() + 12000;
  while (Date.now() < end) { if (await page.evaluate(expression)) return; await sleep(50); }
  throw new Error('UI timeout: ' + label);
}
const has = (page, text) => until(page, `document.body.innerText.includes(${JSON.stringify(text)})`, text);
async function noLegacyNotice(page) {
  assert.equal(await page.evaluate("[...document.querySelectorAll('[role=status],[role=alert]')].some(e=>['Signed out.','Signing out...','Signing out…'].includes(e.textContent.trim()))"), false);
  assert.equal(['Signed out.', 'Signing out...', 'Signing out…'].includes(await page.evaluate(`(async()=>${session}.getSnapshot().notice)()`)), false);
}
async function logoutMessage(page, message) {
  await page.evaluate(`(()=>{const channel=new BroadcastChannel('paspm-auth-session');channel.postMessage(${JSON.stringify(message)});channel.close()})()`);
  await sleep(120);
  await noLegacyNotice(page);
}
async function click(page, text) {
  const query = `[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&!b.disabled&&b.innerText.trim()===${JSON.stringify(text)})`;
  await until(page, `Boolean(${query})`, 'click ' + text); await page.evaluate(query + '.click()');
}
async function input(page, selector, value) {
  await page.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
}
async function capture(page, name) {
  const shot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(join(artifacts, name + '.png'), Buffer.from(shot.data, 'base64'));
}
async function fixture(page, { requestId, request }) {
  const url = new URL(request.url);
  // Background video decoding is unrelated to session UI and can exhaust a
  // headless renderer after repeated Login mounts. Keep these fixtures deterministic.
  if (url.pathname.startsWith('/videos/')) return page.call('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
  if (!url.pathname.startsWith('/api/')) {
    return page.call(url.origin === origin ? 'Fetch.continueRequest' : 'Fetch.failRequest', { requestId, ...(url.origin === origin ? {} : { errorReason: 'BlockedByClient' }) });
  }
  const path = url.pathname, method = request.method;
  calls.push({ path, method });
  let code = 200, body, headers = [{ name: 'Content-Type', value: 'application/json' }];
  const header = name => Object.entries(request.headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  try {
    if (state.network) return page.call('Fetch.failRequest', { requestId, errorReason: 'InternetDisconnected' });
    if (['/api/auth/login', '/api/auth/google', '/api/auth/refresh'].includes(path)) {
      if (path.endsWith('/refresh')) {
        while (state.holdRefresh) await sleep(20);
        assert.equal(header('X-CSRF-Token'), state.csrf, 'CSRF must match the latest rotation');
        if (state.refreshStatus !== 200) { code = state.refreshStatus; body = { error: 'Controlled session failure' }; }
      }
      if (code === 200) {
        state.serial++; state.csrf = 'fixture-csrf-' + state.serial; state.refresh = 'fixture-refresh-' + state.serial;
        body = { accessToken: 'fixture-access-' + state.serial, expiresIn: state.ttl, tokenType: 'Bearer', csrfToken: state.csrf };
        headers.push({ name: 'Set-Cookie', value: 'PASPM-CSRF=' + state.csrf + '; Path=/; SameSite=Strict' }, { name: 'Set-Cookie', value: 'PASPM-REFRESH=' + state.refresh + '; HttpOnly; Path=/; SameSite=Strict' });
      }
    } else if (path === '/api/auth/me') {
      assert.match(header('Authorization') || '', /^Bearer fixture-access-/); body = user();
    } else if (path === '/api/auth/logout' || path === '/api/auth/logout-all') {
      while (state.holdLogout) await sleep(20);
      assert.match(header('Authorization') || '', /^Bearer fixture-access-/);
      assert.equal(header('X-CSRF-Token'), state.csrf); code = state.logoutStatus;
      body = { message: 'Logged out' };
      if (code === 200) headers.push({ name: 'Set-Cookie', value: 'PASPM-CSRF=; Max-Age=0; Path=/' }, { name: 'Set-Cookie', value: 'PASPM-REFRESH=; Max-Age=0; HttpOnly; Path=/' });
    } else if (path === '/api/utility/config') {
      body = { config: { enableStock: true, enableExpiry: true, enableSeason: true, alpha: 0.5, beta: 0.3, gamma: 0.2, lambda: 0.1, expiryWindowDays: null, version: 1, scoringVersion: 'v1.2' }, lambdaPolicy: { lambdaMin: 0, lambdaMax: 0.5, version: 1 }, lambdaValid: true };
    } else if (path === '/api/products') body = { content: [], page: 0, pageSize: Number(url.searchParams.get('pageSize') || 20), totalElements: 0, totalPages: 0 };
    else if (path === '/api/categories') body = [];
    else if (path === '/api/system/mining/config') body = { version: 0, algorithm: null, minUtilMode: null, minUtilValue: null, changedBy: null, changedAt: null };
    else if (path === '/api/system/utility/lambda-policy') body = { lambdaMin: 0, lambdaMax: 0.5, version: 1 };
    else if (path === '/api/system/mining/stores') body = { items: [], page: 0, pageSize: 20, totalElements: 0 };
    else { unexpected.push(path); code = 599; body = { error: 'Unconfigured fixture endpoint' }; }
  } catch (error) { errors.push(error.message); code = 599; body = { error: 'Fixture assertion failed' }; }
  await page.call('Fetch.fulfillRequest', { requestId, responseCode: code, responseHeaders: headers, body: Buffer.from(JSON.stringify(body)).toString('base64') });
}
async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl); await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); }); return new CDP(ws);
}
async function newPage(targetId) {
  const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  const page = await connect(targets.find(target => target.id === targetId || !targetId && target.type === 'page').webSocketDebuggerUrl); pages.push(page);
  page.on('Fetch.requestPaused', request => fixture(page, request).catch(error => {
    // Navigation can cancel an intercepted resource before CDP fulfills/fails it.
    // Unknown API routes and assertion errors are recorded separately by fixture().
    if (!closing && !page.closed && error.message !== 'Invalid InterceptionId.') errors.push(error.message);
  }));
  page.on('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails.exception?.description || event.exceptionDetails.text));
  await page.call('Page.enable'); await page.call('Runtime.enable');
  await page.call('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `window.fixtureDocumentId=crypto.randomUUID();window.fixtureOffset=0;const originalNow=Date.now;Date.now=()=>originalNow()+window.fixtureOffset;
    window.google={accounts:{id:{initialize:({callback})=>{window.googleCallback=callback},prompt:()=>window.googleCallback({credential:'fixture-google-only'})}}};` });
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  return page;
}
async function navigate(page, path) { await page.call('Page.navigate', { url: origin + path }); }
async function reload(page) {
  const previous = await page.evaluate('window.fixtureDocumentId');
  await page.call('Page.reload');
  await until(page, `window.fixtureDocumentId&&window.fixtureDocumentId!==${JSON.stringify(previous)}&&performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname==='/src/services/authService.ts')`, 'new document loaded');
}
async function authenticated(page) {
  if (process.argv.includes('--production')) { await has(page, 'Utility Configuration'); return; }
  await until(page, "performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname==='/src/services/authService.ts')", 'session module loaded');
  await until(page, `(async()=>${session}.getSnapshot().status==='authenticated')()`, 'authenticated');
}
async function emailLogin(page) {
  await has(page, 'Sign in to the system');
  await input(page, 'input[type=email]', 'fixture@example.invalid'); await input(page, 'input[type=password]', 'FixturePassword12');
  await page.evaluate("document.querySelector('input[type=password]').form.requestSubmit()");
  await authenticated(page);
}
async function idle(page) {
  await page.evaluate(`(async()=>{window.fixtureOffset+=3541000;${session}.checkActivity();})()`);
  await has(page, 'Are you still there?');
}
try {
  const end = Date.now() + 15000;
  while (!existsSync(join(profile, 'DevToolsActivePort')) && Date.now() < end) await sleep(100);
  assert.ok(existsSync(join(profile, 'DevToolsActivePort')), 'Chrome started');
  const [portText, browserPath] = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').trim().split(/\r?\n/); port = Number(portText);
  browser = await connect('ws://127.0.0.1:' + port + browserPath); first = await newPage();
  await navigate(first, '/login'); await emailLogin(first); await has(first, 'Utility Configuration');
  assert.equal(await first.evaluate("localStorage.getItem('retailspace_auth_token')"), null);
  assert.equal(await first.evaluate("document.cookie.includes('PASPM-REFRESH')"), false);
  checks.push('email login, /me validation, memory-only credentials and HttpOnly refresh cookie');

  if (process.argv.includes('--production')) {
    // Exercise the actual dist bundle (built with the flag=true), without source
    // module imports or test hooks in application code. Only the browser clock moves.
    await first.evaluate("window.fixtureOffset+=61000;window.dispatchEvent(new Event('focus'))");
    await sleep(100);
    assert.equal(await first.evaluate("!!document.querySelector('dialog')"), false);
    assert.equal(calls.filter(c => c.path.endsWith('/refresh')).length, 0);
    await first.evaluate("window.fixtureOffset+=3480000;window.dispatchEvent(new Event('focus'))");
    await has(first, 'Are you still there?');
    await click(first, 'Stay signed in'); await until(first, "!document.querySelector('dialog')", 'production refresh');
    assert.equal(calls.filter(c => c.path.endsWith('/refresh')).length, 1);
    checks.push('actual production bundle ignores test flag=true at 61s; original expiry-driven popup and real request pipeline remain intact');
  } else if (process.argv.includes('--fast')) {
    const expiry = await first.evaluate(`(async()=>${session}.getSnapshot().expiresAt)()`);
    await input(first, 'input[aria-label="Stock Importance"]', '0.4');
    await sleep(31000);
    assert.equal(await first.evaluate(`(async()=>${session}.isInactive())()`), true, 'start Vite with VITE_SESSION_TIMEOUT_TEST=true for --fast');
    assert.equal(await first.evaluate("!!document.querySelector('dialog')"), false);
    console.log('FAST checkpoint: inactive after 30 seconds; no premature popup.');
    await first.evaluate("window.dispatchEvent(new Event('pointerdown'))");
    assert.equal(await first.evaluate(`(async()=>${session}.isInactive())()`), false);
    await sleep(31000);
    assert.equal(await first.evaluate("!!document.querySelector('dialog')"), false, 'human activity resets the fast deadline');
    console.log('FAST checkpoint: activity reset the deadline; background checks did not extend it.');
    await sleep(29000); await has(first, 'Are you still there?');
    assert.equal(await first.evaluate(`(async()=>${session}.getSnapshot().expiresAt)()`), expiry, 'fast popup never rewrites the actual access expiry');
    assert.equal(calls.filter(c => c.path.endsWith('/refresh')).length, 0);
    const beforeRefresh = calls.filter(c => c.path.endsWith('/refresh')).length;
    state.holdRefresh = true;
    await first.evaluate("(()=>{const b=[...document.querySelectorAll('dialog button')].find(b=>b.innerText==='Stay signed in');b.click();b.click()})()");
    const sentAt = Date.now();
    while (calls.filter(c => c.path.endsWith('/refresh')).length === beforeRefresh && Date.now() - sentAt < 5000) await sleep(20);
    assert.equal(calls.filter(c => c.path.endsWith('/refresh')).length, beforeRefresh + 1);
    assert.equal(await first.evaluate("document.querySelector('dialog').open"), true, 'dialog waits for backend confirmation');
    state.holdRefresh = false;
    await until(first, "!document.querySelector('dialog')", 'successful refresh closes the fast prompt');
    assert.equal(await first.evaluate("document.querySelector('input[aria-label=\"Stock Importance\"]').value"), '0.4');
    await sleep(1200); assert.equal(await first.evaluate("!!document.querySelector('dialog')"), false);
    checks.push('DEV real timers: 30s inactive, 60s prompt after last activity; unchanged expiry; single refresh; confirmed close; draft preserved; no immediate repeat');

    await first.evaluate(`(async()=>{window.fixtureOffset+=60000;${session}.checkActivity()})()`); await has(first, 'Are you still there?');
    state.network = true; await click(first, 'Stay signed in'); await has(first, 'Could not reach the server');
    assert.equal(await first.evaluate("document.querySelector('dialog').open"), true);
    state.network = false; await first.evaluate('window.fixtureOffset+=30000');
    await click(first, 'Stay signed in'); await until(first, "!document.querySelector('dialog')", 'retry after network failure');
    const target = await browser.call('Target.createTarget', { url: 'about:blank' });
    const peer = await newPage(target.targetId); await navigate(peer, '/f03/configuration'); await authenticated(peer);
    const beforeRace = calls.filter(c => c.path.endsWith('/refresh')).length;
    await Promise.all([first.evaluate(`(async()=>${session}.refresh(true))()`), peer.evaluate(`(async()=>${session}.refresh(true))()`)]);
    assert.equal(calls.filter(c => c.path.endsWith('/refresh')).length, beforeRace + 1);
    await browser.call('Target.closeTarget', { targetId: target.targetId }); peer.ws.close();
    await first.call('Page.bringToFront');
    await first.evaluate(`(async()=>{window.fixtureOffset+=60000;${session}.checkActivity()})()`); await has(first, 'Are you still there?');
    await click(first, 'Sign out'); await has(first, 'Signed out successfully.');
    checks.push('DEV network failure keeps prompt/draft; recovery works; cross-tab refresh coordination and existing logout preserved');
  } else {
  await input(first, 'input[aria-label="Stock Importance"]', '0.4');
  const beforeIdle = calls.length; await idle(first);
  assert.equal(calls.length, beforeIdle, 'inactive users never refresh automatically');
  assert.equal(await first.evaluate("document.activeElement?.innerText"), 'Stay signed in');
  await first.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  assert.deepEqual(await first.evaluate(`(async()=>({open:document.querySelector('dialog')?.open,status:${session}.getSnapshot().status,attention:${session}.getSnapshot().attention}))()`), { open: true, status: 'authenticated', attention: true });
  await first.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await first.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  assert.equal(await first.evaluate("!!document.activeElement.closest('dialog')"), true);
  await first.evaluate("window.dispatchEvent(new Event('pointermove'));window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'))");
  assert.equal(await first.evaluate("document.querySelector('dialog').open"), true);
  for (const width of [1440, 1024, 820, 390]) {
    await first.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
    const bounds = await first.evaluate("(()=>{const r=document.querySelector('dialog').getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,bottom:r.bottom,height:innerHeight}})()");
    assert.ok(bounds.left >= 0 && bounds.right <= bounds.width && bounds.bottom <= bounds.height, 'Dialog fits width ' + width);
    await capture(first, 'inactivity-' + width);
  }
  const rotations = calls.filter(c => c.path.endsWith('/refresh')).length;
  await click(first, 'Stay signed in'); await until(first, "!document.querySelector('dialog')", 'prompt closed');
  assert.equal(calls.filter(c => c.path.endsWith('/refresh')).length, rotations + 1);
  assert.equal(await first.evaluate("document.querySelector('input[aria-label=\"Stock Importance\"]').value"), '0.4');
  checks.push('inactivity only near expiry, sticky dialog, Escape/focus containment, 1440/1024/820/390px, refresh preserves unsaved draft');

  await reload(first); await authenticated(first); await has(first, 'Utility Configuration');
  checks.push('browser reload recovers via cookies and validates /me before protected UI');
  const secondTarget = await browser.call('Target.createTarget', { url: 'about:blank' });
  const second = await newPage(secondTarget.targetId); const beforeSecond = calls.filter(c => c.path.endsWith('/refresh')).length;
  await navigate(second, '/f03/configuration'); await authenticated(second);
  assert.equal(calls.filter(c => c.path.endsWith('/refresh')).length, beforeSecond, 'new tab receives peer credentials without rotation');
  const beforeRace = calls.filter(c => c.path.endsWith('/refresh')).length;
  await Promise.all([first.evaluate(`(async()=>${session}.refresh(true))()`), second.evaluate(`(async()=>${session}.refresh(true))()`)]);
  assert.equal(calls.filter(c => c.path.endsWith('/refresh')).length, beforeRace + 1, 'Web Locks prevent simultaneous rotation');
  state.holdLogout = true;
  await first.evaluate(`(async()=>{void ${session}.logout(true)})()`);
  await has(first, 'Sign in to the system'); await has(second, 'Sign in to the system');
  await sleep(1200);
  for (const page of [first, second]) {
    await noLegacyNotice(page);
    assert.equal(await page.evaluate(`(async()=>${session}.getSnapshot().notice)()`), '');
    assert.equal(await page.evaluate("!!document.querySelector('[data-session-toast]')"), false, 'pending logout must not claim success');
  }
  await logoutMessage(first, { type: 'signed-out', notice: 'Signing out...' });
  state.holdLogout = false;
  await has(first, 'Signed out from all devices.'); await has(second, 'Signed out from all devices.');
  await logoutMessage(first, { type: 'signed-out', notice: 'Signed out.' });
  await noLegacyNotice(second);
  assert.equal(await first.evaluate("document.querySelectorAll('[data-session-toast]').length"), 1);
  assert.equal(await second.evaluate("document.querySelectorAll('[data-session-toast]').length"), 1);
  await browser.call('Target.closeTarget', { targetId: secondTarget.targetId }); second.ws.close();
  checks.push('two real tabs: peer recovery, single coordinated rotation, logout-all propagation');
  checks.push('slow logout-all: both Login pages remain free of pending banners and success toasts until backend confirmation');

  await emailLogin(first); await first.evaluate(`(async()=>${session}.request('/api/auth/me'))()`);
  await first.evaluate(`(async()=>{window.fixtureOffset+=3541000;window.dispatchEvent(new Event('focus'));})()`); await has(first, 'Are you still there?');
  state.refreshStatus = 403;
  await click(first, 'Stay signed in'); await has(first, 'Session verification failed (CSRF)');
  state.refreshStatus = 429; await first.evaluate('window.fixtureOffset+=30000');
  await click(first, 'Stay signed in'); await has(first, 'Too many session requests');
  const beforeRateRetry = calls.filter(c => c.path.endsWith('/refresh')).length;
  await click(first, 'Stay signed in'); await has(first, 'Please wait before retrying');
  assert.equal(calls.filter(c => c.path.endsWith('/refresh')).length, beforeRateRetry);
  state.refreshStatus = 200; await first.evaluate('window.fixtureOffset+=900000');
  await click(first, 'Stay signed in'); await until(first, "!document.querySelector('dialog')", 'recover after rate limit');
  checks.push('CSRF 403, rate limit 429 and shared backoff preserve the session UI without retry loops');

  await first.evaluate(`(async()=>${session}.endLocal())()`); await has(first, 'Sign in to the system');
  await click(first, 'Sign in with Google'); await authenticated(first);
  assert.ok(calls.some(c => c.path === '/api/auth/google'));
  await first.evaluate(`(async()=>${session}.endLocal())()`); await emailLogin(first);
  await first.evaluate("history.pushState({},'', '/profile');window.dispatchEvent(new Event('popstate'))");
  await has(first, 'Account Profile & Security Settings'); await click(first, 'Sign out all devices');
  await has(first, 'Sign out all devices?'); await click(first, 'Cancel');
  assert.equal(await first.evaluate("!!document.querySelector('dialog')"), false);
  await click(first, 'Sign out all devices');
  await first.evaluate("[...document.querySelectorAll('dialog button')].find(b=>b.innerText==='Sign out all devices').click()");
  await has(first, 'Signed out from all devices.');
  checks.push('Google credential pipeline and Profile logout-all confirmation/cancel/submit');

  await first.call('Page.bringToFront');
  await first.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await sleep(100); // Allow the resize event to settle before measuring the Login form.
  const formBounds = "(()=>{const r=document.querySelector('input[type=email]').form.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()";
  await emailLogin(first);
  await first.evaluate("document.querySelector('button[aria-label=\"Account menu\"]').click()"); await click(first, 'Sign out');
  await has(first, 'Signed out successfully.');
  await logoutMessage(first, { type: 'signed-out', notice: 'Signed out.' });
  assert.equal(await first.evaluate(`(async()=>${session}.getSnapshot().notice)()`), 'Signed out successfully.');
  assert.equal(await first.evaluate("document.querySelectorAll('[data-session-toast]').length"), 1);
  assert.equal(await first.evaluate("(()=>{const r=document.querySelector('[data-session-toast]').getBoundingClientRect();return r.width<400&&r.left>innerWidth/2&&Math.abs(innerWidth-r.right-16)<1&&r.top===16})()"), true);
  const loginLayout = await first.evaluate(formBounds);
  await sleep(3300);
  assert.equal(await first.evaluate("!!document.querySelector('[data-session-toast]')"), false);
  assert.deepEqual(await first.evaluate(formBounds), loginLayout, 'dismissing the toast does not shift the Login layout');
  assert.equal(await first.evaluate(`(async()=>${session}.getSnapshot().notice)()`), '', 'auto-dismiss clears the session notice');

  await emailLogin(first); await first.evaluate(`(async()=>${session}.logout())()`); await has(first, 'Signed out successfully.');
  await first.evaluate("document.querySelector('button[aria-label=\"Dismiss sign-out notification\"]').click()");
  assert.equal(await first.evaluate("!!document.querySelector('[data-session-toast]')"), false);
  const completedEpoch = await first.evaluate(`(async()=>${session}.getSessionId())()`);
  await logoutMessage(first, { type: 'signed-out', epoch: completedEpoch, notice: 'Signed out successfully.', noticeKind: 'success' });
  assert.equal(await first.evaluate("!!document.querySelector('[data-session-toast]')"), false, 'duplicate completion cannot restore a dismissed toast');
  await emailLogin(first); await first.evaluate(`(async()=>${session}.logout())()`); await has(first, 'Signed out successfully.');
  await emailLogin(first); assert.equal(await first.evaluate("!!document.querySelector('[data-session-toast]')"), false);
  await first.evaluate(`(async()=>${session}.logout())()`); await has(first, 'Signed out successfully.');
  await first.evaluate("history.pushState({},'', '/forgot-password');window.dispatchEvent(new Event('popstate'))");
  await until(first, "!document.querySelector('[data-session-toast]')", 'navigation clears success');
  await first.evaluate("history.pushState({},'', '/login');window.dispatchEvent(new Event('popstate'))"); await has(first, 'Sign in to the system');
  checks.push('one compact top-right logout toast; unchanged Login layout; 3-second auto-dismiss; manual close; navigation and repeated login/logout clear stale success');

  await emailLogin(first); await idle(first); await click(first, 'Sign out'); await has(first, 'Signed out successfully.');
  await noLegacyNotice(first); await reload(first); await has(first, 'Sign in to the system'); await noLegacyNotice(first);
  assert.equal(await first.evaluate("!!document.querySelector('[data-session-toast]')"), false);
  await emailLogin(first);
  await first.evaluate("localStorage.setItem('paspm_session_coordination',JSON.stringify({epoch:'legacy-tab-logout',signedOut:true}))");
  await logoutMessage(first, { type: 'signed-out', notice: 'Signed out.' });
  await has(first, 'Sign in to the system');
  assert.equal(await first.evaluate("!!document.querySelector('[data-session-toast]')"), false, 'legacy message cannot invent backend success');
  checks.push('legacy tab messages never enter state/DOM; duplicate messages do not resurrect toast; inactivity logout and Login reload stay clean');

  await emailLogin(first); state.network = true;
  await first.evaluate(`(async()=>${session}.logout())()`); await has(first, 'Server-side revocation was not confirmed');
  await logoutMessage(first, { type: 'signed-out', notice: 'Signed out.' });
  await logoutMessage(first, { type: 'signed-out', epoch: 'stale-logout', notice: 'Signed out successfully.', noticeKind: 'success' });
  await sleep(3300);
  assert.equal(await first.evaluate("!!document.querySelector('[data-session-toast]')"), false);
  await has(first, 'Server-side revocation was not confirmed');
  await reload(first); await has(first, 'Sign in to the system');
  assert.equal(await first.evaluate(`(async()=>${session}.getToken())()`), null);
  state.network = false;
  await emailLogin(first); await idle(first); state.refreshStatus = 401;
  await click(first, 'Stay signed in'); await has(first, 'Your session has ended');
  checks.push('network-failed logout clears local session and blocks reload resurrection; invalid refresh redirects to sign-in');
  }

  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS (controlled browser fixtures)', checks, interceptedApiCalls: calls.length, realBackendWrites: 0, artifacts }, null, 2));
} catch (error) {
  try { if (first) await capture(first, 'failure'); } catch { /* Browser may have exited. */ }
  console.log(JSON.stringify({ result: 'FAIL', error: error.stack, checks, unexpected, errors, artifacts }, null, 2)); process.exitCode = 1;
} finally {
  closing = true;
  state.holdLogout = false; state.holdRefresh = false;
  if (browser) { try { await browser.call('Browser.close'); } catch { /* Already closed. */ } browser.ws.close(); }
  pages.forEach(page => page.ws.close());
  if (chrome.exitCode === null) await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), sleep(2000)]);
  if (chrome.exitCode === null) chrome.kill();
  const target = resolve(profile);
  if (dirname(target) === base && basename(target).startsWith('paspm-session-browser-')) {
    try { rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch { /* Only this test's temporary profile. */ }
  }
}
