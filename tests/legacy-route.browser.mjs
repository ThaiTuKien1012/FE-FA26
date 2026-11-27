// Run with Vite serving locally: node --import tsx tests/legacy-route.browser.mjs
// Smoke-test defects #2 and #6 (2026-11-27), in a real (headless) browser with all API traffic intercepted:
//   1. a signed-in Merchandiser or Store Admin who opens the legacy URL /merchandiser/recommendations lands on the
//      working /recommendations screen and never sees "Permission Required";
//   2. the sign-in page is one language (English): no Vietnamese text, including the video controls and the footer.
// Any request outside the fixtures lands in `unexpected` and fails the test.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { policy } from './f06.fixtures.ts';
import { conversionRequestFixture, conversionRunFixture } from './f05.fixtures.ts';

const origin = process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3000';
const base = resolve(tmpdir());
const profile = mkdtempSync(join(base, 'paspm-legacy-route-'));
const chrome = spawn(process.env.LEGACY_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  '--disable-sync', '--disable-extensions', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'
], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(done => setTimeout(done, ms));
class CDP {
  id = 0; pending = new Map(); handlers = new Map();
  constructor(ws) {
    this.ws = ws;
    ws.addEventListener('message', event => {
      const data = JSON.parse(event.data);
      if (data.id) {
        const pending = this.pending.get(data.id); if (!pending) return;
        this.pending.delete(data.id);
        data.error ? pending.reject(new Error(data.error.message)) : pending.resolve(data.result);
      } else for (const handler of this.handlers.get(data.method) || []) void handler(data.params);
    });
  }
  call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000);
      this.pending.set(id, { resolve: result => { clearTimeout(timer); resolve(result); }, reject: error => { clearTimeout(timer); reject(error); } });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, handler) { this.handlers.set(method, [...this.handlers.get(method) || [], handler]); }
  async evaluate(expression) {
    const result = await this.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result?.value;
  }
}
let page, closing = false;
const calls = [], unexpected = [], errors = [], checks = [];
const state = { role: 'MERCHANDISER', storeId: 1 };
const session = "(await (window.fixtureAuth ??= import(performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/services/authService.ts').name))).authService";
const VIETNAMESE = /[ăâđêôơưáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵ]/i;
async function until(expression, label) {
  const end = Date.now() + 12000;
  while (Date.now() < end) { if (await page.evaluate(expression)) return; await sleep(40); }
  throw new Error('UI timeout: ' + label);
}
async function loginAs(role) {
  state.role = role;
  await page.evaluate('(async()=>{const auth=' + session + ';auth.endLocal();await auth.authenticate("/api/auth/login",{email:"fixture@example.invalid",password:"fixture-only"});})()');
}
// In-app navigation as the browser does it (history entry plus popstate), like the Back button or a link.
const navigate = path => page.evaluate('history.pushState({},"",' + JSON.stringify(path) + ');dispatchEvent(new PopStateEvent("popstate"))');
const where = () => page.evaluate('location.pathname + location.search');
const bodyText = () => page.evaluate('document.body.innerText');
async function fixture({ requestId, request }) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/videos/')) return page.call('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
  if (!url.pathname.startsWith('/api/')) return page.call(url.origin === origin ? 'Fetch.continueRequest' : 'Fetch.failRequest', {
    requestId, ...(url.origin === origin ? {} : { errorReason: 'BlockedByClient' })
  });
  calls.push({ path: url.pathname, method: request.method });
  let responseCode = 200, body;
  const analysis = { ...conversionRequestFixture('WHOLE_UNIT_HALF_UP', 'FAILED', state.storeId), comparisonStatus: 'FAILED', requestId: 17 };
  if (['/api/auth/login', '/api/auth/refresh'].includes(url.pathname)) body = { accessToken: 'fixture-access', expiresIn: 3600, tokenType: 'Bearer', csrfToken: 'fixture-csrf' };
  else if (url.pathname === '/api/auth/me') body = { userId: 12, name: 'Fixture User', email: 'fixture@example.invalid', roleCode: state.role, storeId: state.storeId, status: 'ACTIVE', emailVerified: true };
  else if (url.pathname === '/api/recommendations/config') body = policy;
  else if (url.pathname === '/api/utility/config') body = { config: { alpha: 0.6, beta: 0.4, lambda: 0.3, salesWindowDays: 30, version: 3, scoringVersion: 'W2_EXPIRY_SEASON_V1' }, lambdaPolicy: { scoringVersion: 'W2_EXPIRY_SEASON_V1', lambdaMax: 0.5, version: 1 }, lambdaValid: true };
  // The F06 screen reads the analysis list and detail, the selected run, its recommendations and the expiry alerts (empty pages).
  else if (url.pathname === '/api/mining/requests') body = { items: [analysis], page: 0, pageSize: 20, totalElements: 1 };
  else if (url.pathname === '/api/mining/requests/17') body = analysis;
  else if (/^\/api\/mining\/runs\/\d+$/.test(url.pathname)) body = { ...conversionRunFixture('WHOLE_UNIT_HALF_UP', 'COMPLETED', state.storeId), runId: Number(url.pathname.split('/').at(-1)), requestId: 17 };
  else if (url.pathname === '/api/recommendations') body = { items: [], page: Number(url.searchParams.get('page') || 0), pageSize: Number(url.searchParams.get('pageSize') || 20), totalElements: 0, ordering: 'RANKED_WITHIN_SOURCE_RUN' };
  else if (url.pathname === '/api/recommendations/expiry-push') body = { items: [], page: 0, pageSize: Number(url.searchParams.get('pageSize') || 20), totalElements: 0, asOfDate: '2026-11-26', timeZone: 'Asia/Ho_Chi_Minh', checkedAt: '2026-11-25T17:00:00Z', warnings: [] };
  else { unexpected.push(request.method + ' ' + url.pathname + url.search); responseCode = 500; body = { error: 'Unexpected fixture endpoint' }; }
  return page.call('Fetch.fulfillRequest', { requestId, responseCode, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') });
}
try {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; !existsSync(portFile) && i < 150; i++) await sleep(100);
  assert.ok(existsSync(portFile), 'Chrome DevTools started');
  const port = readFileSync(portFile, 'utf8').split('\n')[0];
  let targets; for (let i = 0; i < 20; i++) { try { targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json(); break; } catch { await sleep(300); } }
  const ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((done, reject) => { ws.addEventListener('open', done, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  page = new CDP(ws);
  page.on('Fetch.requestPaused', data => fixture(data).catch(error => { if (!closing && !/Invalid InterceptionId/.test(error.message)) errors.push(error.message); }));
  page.on('Runtime.exceptionThrown', data => errors.push(data.exceptionDetails.exception?.description || data.exceptionDetails.text));
  await page.call('Page.enable'); await page.call('Runtime.enable');
  await page.call('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.navigate', { url: origin + '/login' });
  await until("performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname==='/src/services/authService.ts')", 'session module');

  // 1. The sign-in page is a single language.
  await until('!!document.querySelector("#identifier")', 'sign-in form');
  const login = await bodyText();
  assert.doesNotMatch(login, VIETNAMESE, 'The sign-in page contains no Vietnamese text');
  assert.match(login, /Sign in to the system/); assert.match(login, /Watch video full screen/); assert.match(login, /Smart retail operations platform/);
  await page.evaluate('[...document.querySelectorAll("button")].find(b=>b.innerText.includes("Watch video full screen")).click()');
  await until('document.body.innerText.includes("Back to sign-in form")', 'video mode button');
  assert.doesNotMatch(await bodyText(), VIETNAMESE, 'The video-mode controls contain no Vietnamese text');
  checks.push('Sign-in page and its video controls are English only');

  // 2. The legacy URL leads Merchandisers and Store Admins to /recommendations.
  for (const [role, label] of [['MERCHANDISER', 'Merchandiser'], ['STORE_ADMIN', 'Store Admin']]) {
    await loginAs(role);
    await navigate('/merchandiser/recommendations');
    await until('location.pathname==="/recommendations"', label + ' is redirected to /recommendations');
    await until('!!document.querySelector("#f06-dashboard-title,#f06-ranked-source-title")', label + ' sees the Recommendations screen');
    const text = await bodyText();
    assert.doesNotMatch(text, /Permission Required/, label + ' never sees "Permission Required"');
    assert.equal(await where(), '/recommendations', 'the legacy URL is replaced, not kept');
    // Back must not bounce into the legacy URL again.
    await page.evaluate('history.back()'); await sleep(500);
    assert.notEqual(await where(), '/merchandiser/recommendations', 'the legacy URL is not left in the history as the current page');
    checks.push(label + ': /merchandiser/recommendations → /recommendations, no "Permission Required"');
    await navigate('/recommendations');
  }
  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS (controlled browser fixtures)', checks, interceptedApiCalls: calls.length, realBackendWrites: 0 }, null, 2));
} catch (error) {
  const context = page ? await page.evaluate('({url:location.pathname+location.search,text:document.body.innerText.slice(0,500)})').catch(() => null) : null;
  console.log(JSON.stringify({ result: 'FAIL', error: error.stack, checks, unexpected, errors, context, recentCalls: calls.slice(-10) }, null, 2));
  process.exitCode = 1;
} finally {
  closing = true;
  if (page) { try { await page.call('Browser.close'); } catch {} page.ws.close(); }
  if (chrome.exitCode === null) await Promise.race([new Promise(done => chrome.once('exit', done)), sleep(2000)]);
  if (chrome.exitCode === null) chrome.kill();
  const target = resolve(profile);
  if (dirname(target) === base && basename(target).startsWith('paspm-legacy-route-')) {
    try { rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {}
  }
}
