// Fixture-only browser tests. ALL /api traffic is intercepted, including unknown endpoints.
// Start Vite on port 3011, then node tests/f11.browser.mjs (optional PASPM_TEST_ORIGIN / SESSION_TEST_CHROME).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const origin = process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3011';
const base = resolve(tmpdir());
const profile = mkdtempSync(join(base, 'paspm-session-browser-'));
const artifacts = process.env.PASPM_TEST_NO_ARTIFACTS === '1' ? null : mkdtempSync(join(base, 'paspm-session-preview-'));
const chrome = spawn(process.env.SESSION_TEST_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-sync', '--disable-extensions', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
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
const state = { empty: false, additionNetwork: false, inactive: false, snapshotStatus: 200, additionStatus: 200, reportStatus: 200, serial: 0, csrf: '', refresh: '', refreshStatus: 200, network: false, holdRefresh: false, holdLogout: false, logoutStatus: 200, ttl: 3600, role: 'MERCHANDISER' };
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
async function click(page, text) {
  const query = `[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&!b.disabled&&b.innerText.trim()===${JSON.stringify(text)})`;
  await until(page, `Boolean(${query})`, 'click ' + text); await page.evaluate(query + '.click()');
}
async function input(page, selector, value) {
  await page.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
}
async function capture(page, name) {
  if (!artifacts) return;
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
      body = { config: { alpha: 0.6, beta: 0.4, lambda: 0.1, salesWindowDays: 30, version: 1, scoringVersion: 'W2_EXPIRY_SEASON_V1' }, lambdaPolicy: { lambdaMax: 0.5, version: 1, scoringVersion: 'W2_EXPIRY_SEASON_V1' }, lambdaValid: true };
    } else if (path === '/api/products') body = { content: [], page: 0, pageSize: Number(url.searchParams.get('pageSize') || 20), totalElements: 0, totalPages: 0 };
    else if (path === '/api/categories') body = [];
    else if (path === '/api/system/mining/config') body = { version: 0, algorithm: null, minUtilMode: null, minUtilValue: null, changedBy: null, changedAt: null };
    else if (path === '/api/system/utility/lambda-policy') body = { lambdaMax: 0.5, version: 1, scoringVersion: 'W2_EXPIRY_SEASON_V1' };
    else if (path === '/api/system/mining/stores') body = { items: [], page: 0, pageSize: 20, totalElements: 0 };
    else if (path === '/api/dashboard/snapshot-utilities') {
      code = url.searchParams.get('snapshotId') === '999' ? 404 : state.snapshotStatus;
      const pageNumber = Number(url.searchParams.get('page') || 0);
      body = code === 200 ? { items: state.empty ? [] : [{ snapshotId: pageNumber ? 17 : 18, rangeStart: '2026-10-01', rangeEnd: '2026-10-04', analysisDate: '2026-10-05', createdAt: '2026-11-25T05:00:00Z', totalWeightedUtility: 219.430001 }], page: pageNumber, pageSize: 20, totalElements: state.empty ? 0 : 21 } : { error: 'Fixture failure', ...(state.inactive ? { code: 'STORE_INACTIVE' } : {}) };
    }
    else if (path === '/api/dashboard/bundle-additions') {
      if (state.additionNetwork) return page.call('Fetch.failRequest', { requestId, errorReason: 'InternetDisconnected' });
      code = state.additionStatus;
      body = code === 200 ? { from: '2026-11-24', to: '2026-11-25', timeZone: 'Asia/Ho_Chi_Minh', campaignId: null, totalAddActions: 3, addActionsByOrigin: { MINED: 1, MANUAL: 2 }, totalAddedProductUnits: 7, days: [{ date: '2026-11-24', addActionsByOrigin: { MINED: 0, MANUAL: 0 }, addedProductUnits: 0 }, { date: '2026-11-25', addActionsByOrigin: { MINED: 1, MANUAL: 2 }, addedProductUnits: 7 }] } : { error: 'Fixture filter failure' };
    }
    else if (path === '/api/campaigns') body = { items: [{ campaignId: 42, name: 'Ended fixture campaign', status: 'ENDED' }], page: 0, pageSize: 100, totalElements: 1 };
    else if (path === '/api/campaigns/42/reports') body = { items: [reportFixture], page: 0, pageSize: 100, totalElements: 1 };
    else if (path === '/api/campaign-reports/72') { code = state.reportStatus; body = code === 200 ? reportFixture : { error: 'Report not found' }; }
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
  if (process.argv.includes('--production')) { await has(page, 'Weight Settings'); return; }
  await until(page, "performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname==='/src/services/authService.ts')", 'session module loaded');
  await until(page, `(async()=>${session}.getSnapshot().status==='authenticated')()`, 'authenticated');
}
async function emailLogin(page) {
  await has(page, 'Sign in to the system');
  await input(page, 'input[type=email]', 'fixture@example.invalid'); await input(page, 'input[type=password]', 'FixturePassword12');
  await page.evaluate("document.querySelector('input[type=password]').form.requestSubmit()");
  await authenticated(page);
}

const reportFixture = { reportId: 72, campaignId: 42, snapshotId: 18, evaluationCount: 12, simulated: true, algorithmVersion: 'OFFLINE_REPLAY_V4', rangeStart: '2026-11-01', rangeEnd: '2026-11-25', datasetHash: 'fixture-only', assumptions: { nExceedsBaseline: true, baselineProductsCompared: 2, comparedProductCountN: 3 }, layouts: ['A','B'].map((role,index) => ({ layoutId: 91+index, layoutVersion: 1+index, role, hitRate: { numerator: 0, denominator: 12, rate: 0 }, bundleConversion: { numerator: 0, denominator: 0, rate: null }, capturedUtility: { numerator: 30, denominator: 120, rate: 0.25 }, priorityCoverage: index ? null : 0, priorityCoverageDenominator: index ? null : 2 })) };
async function select(page, label, value) {
  await page.evaluate(`(()=>{const e=[...document.querySelectorAll('label')].find(e=>e.textContent.startsWith(${JSON.stringify(label)})).querySelector('select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
}
try {
  const end = Date.now() + 15000;
  while (!existsSync(join(profile, 'DevToolsActivePort')) && Date.now() < end) await sleep(100);
  assert.ok(existsSync(join(profile, 'DevToolsActivePort')), 'Chrome started');
  const [portText, browserPath] = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').trim().split(/\r?\n/); port = Number(portText);
  browser = await connect('ws://127.0.0.1:' + port + browserPath); first = await newPage();
  await navigate(first, '/login'); await emailLogin(first);
  // LoginView schedules its redirect 350ms after publishing the session.
  await sleep(400); await has(first, 'Weight Settings');
  await first.evaluate("history.pushState({},'', '/store/dashboard');window.dispatchEvent(new Event('popstate'))");
  await has(first, '219,430001'); await has(first, '2026-11-24');
  await click(first, 'Next page'); await has(first, '#17'); await click(first, 'Previous page'); await has(first, '#18');
  await input(first, 'input[type=number]', '18');
  await click(first, 'Find snapshot');
  await until(first, `performance.getEntriesByType('resource').some(e=>e.name.includes('/api/dashboard/snapshot-utilities?')&&e.name.includes('snapshotId=18'))`, 'snapshot-specific API request');
  await has(first, '219,430001');
  await click(first, 'Clear snapshot filter');
  await has(first, '219,430001');
  await input(first, 'input[type=number]', '999');
  await click(first, 'Find snapshot');
  await has(first, 'selected snapshot was not found');
  await has(first, '219,430001');
  assert.equal(await first.evaluate('document.querySelector("input[type=number]").value'), '', 'A missing snapshot clears the selection and reloads the Store list');
  await select(first, 'Campaign filter', '42'); await click(first, 'Apply filters');
  await select(first, 'Report campaign', '42'); await has(first, 'Saved report'); await select(first, 'Saved report', '72');
  await has(first, '12 evaluation transactions'); await has(first, 'A: 2 products, B: 3 products'); await has(first, 'chưa có');
  checks.push('Merchandiser route/nav, snapshot pagination/precision, ended campaign filter, saved F08 report/revisions/null/zero/nExceedsBaseline');
  for (const width of [1440,1024,768,390]) {
    await first.call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await sleep(150);
    assert.equal(await first.evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'no page overflow '+width);
    assert.equal(await first.evaluate("document.querySelector('.f11-dashboard h1').getBoundingClientRect().top < innerHeight"), true, 'dashboard heading visible '+width);
    await capture(first, 'dashboard-'+width);
    for (const [index, name] of ['snapshots','bundles','reports'].entries()) {
      await first.evaluate(`document.querySelectorAll('.f11-panel')[${index}].scrollIntoView({block:'start'})`);
      await capture(first, name+'-'+width);
    }
    await first.evaluate('window.scrollTo(0,0)');
  }
  checks.push('No document overflow at 1440, 1024, 768, 390; screenshots captured');
  await first.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await input(first, 'input[type=date]', '2026-01-01');
  // Inputs live in separate labels; address the second date explicitly.
  await first.evaluate("(()=>{const e=document.querySelectorAll('input[type=date]')[1];Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'2026-04-01');e.dispatchEvent(new Event('input',{bubbles:true}));})()");
  await has(first, 'Choose 1–90 days');
  assert.equal(await first.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Apply filters').disabled"), true);
  await click(first, 'Reset to last 30 days'); await has(first, '2026-11-24');
  state.additionStatus = 400; await click(first, 'Apply filters'); await has(first, 'server rejected'); await has(first, '219,430001'); await has(first, '12 evaluation transactions');
  state.additionStatus = 200; await click(first, 'Retry loading'); await has(first, '2026-11-24');
  state.reportStatus = 404; await select(first, 'Saved report', ''); await select(first, 'Saved report', '72'); await has(first, 'selected report was not found');
  checks.push('91-day picker blocked, backend 400 preserves inputs and other panels, retry succeeds, report 404 clears selection and reloads list');
  state.role = 'STORE_ADMIN'; await reload(first); await has(first, 'Store dashboard'); await has(first, '219,430001');
  checks.push('Store Admin direct dashboard route after session restore');
  state.snapshotStatus = 403; await reload(first); await has(first, 'do not have permission'); await has(first, '2026-11-24');
  state.snapshotStatus = 200; state.empty = true; await click(first, 'Retry loading'); await has(first, 'No READY snapshots');
  state.additionNetwork = true; await click(first, 'Apply filters'); await has(first, 'Check your connection');
  state.additionNetwork = false; await click(first, 'Retry loading'); await has(first, '2026-11-24');
  checks.push('Independent 403 permission state, empty snapshots, network failure and retry');
  state.snapshotStatus = 403; state.inactive = true; await reload(first); await has(first, 'inactive');
  assert.equal(await first.evaluate("!!document.querySelector('.f11-dashboard')"), false);
  checks.push('403 STORE_INACTIVE uses centralized session termination and notice');
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
