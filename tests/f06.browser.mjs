// Run with Vite serving locally: node --import tsx tests/f06.browser.mjs
// All API traffic is intercepted. This tests browser integration with fixtures,
// never a real backend, account, mining submission or recommendation write.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { requestFixture, runFixture } from './f05.fixtures.ts';
import { generation, policy, recommendation } from './f06.fixtures.ts';

const origin = process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3000';
const base = resolve(tmpdir());
const profile = mkdtempSync(join(base, 'paspm-f06-browser-'));
const artifacts = mkdtempSync(join(base, 'paspm-f06-preview-'));
const chrome = spawn(process.env.F06_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
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
const state = { role: 'MERCHANDISER', storeId: 1, mode: 'normal', noRequests: false, holdWrite: false, holdHistory: false, runStatus: 'COMPLETED' };
const session = "(await (window.fixtureAuth ??= import(performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/services/authService.ts').name))).authService";
async function until(expression, label) {
  const end = Date.now() + 12000;
  while (Date.now() < end) { if (await page.evaluate(expression)) return; await sleep(40); }
  throw new Error('UI timeout: ' + label);
}
const has = text => until(`document.body.innerText.includes(${JSON.stringify(text)})`, text);
async function click(label) {
  const clicked = await page.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()===${JSON.stringify(label)});if(!b||b.disabled)return false;b.click();return true;})()`);
  assert.equal(clicked, true, 'Clickable button: ' + label);
}
async function login(role = 'MERCHANDISER', storeId = 1) {
  state.role = role; state.storeId = storeId;
  await page.evaluate(`(async()=>{const auth=${session};auth.endLocal();await auth.authenticate('/api/auth/login',{email:'fixture@example.invalid',password:'fixture-only'});history.pushState({},'','/recommendations');dispatchEvent(new PopStateEvent('popstate'));})()`);
  if (role === 'STORE_ADMIN') await until("!!document.querySelector('#f06-dashboard-title')", 'Store Admin opens recommendations directly');
  if (role === 'MERCHANDISER') {
    await until("!!document.querySelector('#f06-source-title')", 'F06 workspace mounted');
    if (!state.holdHistory) await until("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Refresh requests'&&!b.disabled)", 'source history loaded');
  }
}
async function chooseSource() {
  await until("!!document.querySelector('#f06-request')", 'request picker');
  await page.evaluate("(()=>{const s=document.querySelector('#f06-request');s.value='17';s.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await until("!!document.querySelector('input[name=\"f06-run\"]')", 'run picker');
}
async function selectCompleted() {
  await chooseSource();
  assert.equal(await page.evaluate("document.querySelector('input[name=\"f06-run\"]').disabled"), false);
  await page.evaluate("document.querySelector('input[name=\"f06-run\"]').click()");
}
async function capture(name) {
  const screenshot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(join(artifacts, name + '.png'), Buffer.from(screenshot.data, 'base64'));
}
async function fixture({ requestId, request }) {
  const url = new URL(request.url);
  // Background Login video is unrelated to these fixture-only UI checks.
  if (url.pathname.startsWith('/videos/')) return page.call('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
  if (!url.pathname.startsWith('/api/')) return page.call(url.origin === origin ? 'Fetch.continueRequest' : 'Fetch.failRequest', {
    requestId, ...(url.origin === origin ? {} : { errorReason: 'BlockedByClient' })
  });
  calls.push({ path: url.pathname, method: request.method, body: request.postData });
  let responseCode = 200, body;
  const source = { ...requestFixture('FAILED', state.storeId), comparisonStatus: 'FAILED' };
  const run = { ...runFixture(state.runStatus, state.storeId), patternCount: 8 };
  if (url.pathname === '/api/auth/login') body = { accessToken: 'fixture-access', expiresIn: 3600, tokenType: 'Bearer', csrfToken: 'fixture-csrf' };
  else if (url.pathname === '/api/auth/me') body = { userId: 12, name: 'F06 Fixture', email: 'fixture@example.invalid', roleCode: state.role, storeId: state.storeId, status: 'ACTIVE', emailVerified: true };
  else if (url.pathname === '/api/mining/requests') {
    while (state.holdHistory && !closing) await sleep(20);
    body = { items: state.noRequests ? [] : [source], page: Number(url.searchParams.get('page') || 0), pageSize: 20, totalElements: state.noRequests ? 0 : 1 };
  } else if (url.pathname === '/api/mining/requests/17') body = source;
  else if (url.pathname === '/api/mining/requests/17/runs') body = [run];
  else if (url.pathname === '/api/mining/runs/42') body = run;
  else if (/^\/api\/products\/\d+$/.test(url.pathname)) body = { id: Number(url.pathname.split('/').at(-1)), name: url.pathname.endsWith('/31') ? 'Fixture milk' : 'Fixture bread' };
  else if (url.pathname === '/api/recommendations/config') body = policy;
  else if (url.pathname === '/api/recommendations') body = { items: [recommendation()], page: 0, pageSize: 20, totalElements: 1, ordering: 'CREATED_DESC' };
  else if (url.pathname === '/api/recommendations/generate') {
    assert.equal(request.method, 'POST');
    const input = JSON.parse(request.postData); assert.equal(input.miningRunId, 42);
    assert.deepEqual(Object.keys(input).sort(), ['miningRunId', 'types']);
    assert.equal(new Set(input.types).size, input.types.length);
    while (state.holdWrite && !closing) await sleep(20);
    if (state.mode === 'conflict') { responseCode = 409; body = { error: 'Frozen mining source is inconsistent or unavailable' }; }
    else body = state.mode === 'empty' ? { ...generation, createdCount: 0, reusedCount: 0, recommendationIds: [], skipped: [] } : generation;
  } else if (url.pathname === '/api/products') body = { content: [], page: 0, pageSize: 20, totalElements: 0, totalPages: 0 };
  else if (url.pathname === '/api/categories' || url.pathname === '/api/system/stores') body = [];
  else if (url.pathname === '/api/system/mining/config') body = { version: 0, algorithm: null, minUtilMode: null, minUtilValue: null, changedBy: null, changedAt: null };
  else if (url.pathname === '/api/utility/config') body = { config: { enableStock: true, enableExpiry: true, enableSeason: true, alpha: 1, beta: 1, gamma: 1, lambda: 0.1, expiryWindowDays: null, version: 1, scoringVersion: 'v1.2' }, lambdaPolicy: { lambdaMin: 0, lambdaMax: 0.5, version: 1 }, lambdaValid: true };
  else { unexpected.push(url.pathname); responseCode = 500; body = { error: 'Unexpected fixture endpoint' }; }
  return page.call('Fetch.fulfillRequest', { requestId, responseCode, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') });
}
try {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; !existsSync(portFile) && i < 150; i++) await sleep(100);
  assert.ok(existsSync(portFile), 'Chrome DevTools started');
  const port = readFileSync(portFile, 'utf8').split('\n')[0];
  const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  const ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((done, reject) => { ws.addEventListener('open', done, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  page = new CDP(ws);
  page.on('Fetch.requestPaused', data => fixture(data).catch(error => { if (!closing && !/Invalid InterceptionId/.test(error.message)) errors.push(error.message); }));
  page.on('Runtime.exceptionThrown', data => errors.push(data.exceptionDetails.exception?.description || data.exceptionDetails.text));
  await page.call('Page.enable'); await page.call('Runtime.enable');
  await page.call('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.navigate', { url: origin + '/login' });
  await until("performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname==='/src/services/authService.ts')", 'session module');
  await login(); await selectCompleted();
  assert.equal(await page.evaluate("document.querySelector('main h1').parentElement.firstElementChild.tagName"), 'H1', 'Recommendations header starts with the page title');
  assert.equal(await page.evaluate("Boolean(document.querySelector('nav[aria-label=Breadcrumb]'))"), false);
  await has('Comparison result'); await has('Failed'); await capture('merchant-source');
  assert.equal(await page.evaluate("document.querySelector('form[aria-label=\"Generate recommendations\"] button[type=submit]').disabled"), false);
  await page.evaluate("document.querySelector('input[type=checkbox][value=BUNDLE]').click()");
  await has('Select at least one recommendation format.');
  assert.equal(await page.evaluate("document.querySelector('form button[type=submit]').disabled"), true);
  await page.evaluate("document.querySelector('input[type=checkbox][value=BUNDLE]').click()");
  state.holdWrite = true;
  await page.evaluate("(()=>{const form=document.querySelector('form[aria-label=\"Generate recommendations\"]');form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));})()");
  await has('Generating recommendations...');
  await sleep(150); assert.equal(calls.filter(call => call.path.endsWith('/generate')).length, 1);
  state.holdWrite = false; await has('Recommendations Created'); await has('#62');
  assert.equal(await page.evaluate("[...document.querySelectorAll('#f06-result-title')][0].closest('section').querySelector('details').open"), false, 'Skipped reasons start collapsed');
  await page.evaluate("[...document.querySelectorAll('summary')].find(e=>e.textContent.startsWith('Why some suggestions were skipped')).click()");
  await has('This format needs at least two products.');
  await page.evaluate("[...document.querySelectorAll('summary')].find(e=>e.textContent==='Technical reason').click()");
  await has('PATTERN_REQUIRES_AT_LEAST_TWO_PRODUCTS');
  await capture('merchant-result'); checks.push('completed run under failed comparison, no types, double submit, real DTO/results');
  const writesBeforeBrowse = calls.filter(call => call.path.endsWith('/generate')).length;
  await click('View Recommendations'); await has('1 matching recommendations');
  assert.equal(await page.evaluate("document.activeElement.id"), 'f06-browse-tab');
  assert.equal(calls.filter(call => call.path.endsWith('/generate')).length, writesBeforeBrowse);
  await page.evaluate("document.querySelector('#f06-generate-tab').click()");
  checks.push('View Recommendations opens Browse without another mutation and restores Create state');

  state.mode = 'empty'; await click('Generate recommendations'); await has('No recommendations were returned.');
  assert.equal(await page.evaluate("!!document.querySelector('#f06-result-title')"), true);
  checks.push('zero candidates is a successful empty result');
  state.mode = 'conflict'; await click('Generate recommendations'); await has('Frozen mining source is inconsistent or unavailable');
  const writes = calls.filter(call => call.path.endsWith('/generate')).length;
  await sleep(250); assert.equal(calls.filter(call => call.path.endsWith('/generate')).length, writes);
  await click('Generate recommendations'); await sleep(150);
  assert.equal(calls.filter(call => call.path.endsWith('/generate')).length, writes + 1);
  checks.push('409 retains backend reason and requires a manual retry');

  state.runStatus = 'RUNNING'; await click('Refresh runs'); await has('No completed runs are available');
  assert.equal(await page.evaluate("document.querySelector('input[name=\"f06-run\"]').disabled"), true);
  state.noRequests = true; await click('Refresh requests'); await has('No mining requests are available');
  checks.push('unfinished source is disabled; empty Store history');
  state.noRequests = false; state.runStatus = 'COMPLETED';
  const beforeStore = calls.length;
  await login('STORE_ADMIN'); await has('Monitor product suggestions and their current status.');
  assert.equal(await page.evaluate("!!document.querySelector('#f06-generate-tab')"), false);
  assert.equal(calls.slice(beforeStore).some(c => c.path.startsWith('/api/mining/') || c.path === '/api/recommendations/config'), false, 'Store Admin does not load generation sources or Store Rules');
  assert.equal(await page.evaluate("!!document.querySelector('form[aria-label=\"Generate recommendations\"]')"), false);
  await capture('store-admin'); checks.push('Store Admin reads without Generate');
  for (const role of ['SYSTEM_ADMIN', 'END_CUSTOMER']) {
    await login(role); await until("!document.querySelector('#f06-source-title')", role + ' restricted');
    assert.equal(await page.evaluate("[...document.querySelectorAll('nav[aria-label=\"Main Navigation\"] button')].some(b=>b.textContent.trim()==='Recommendations')"), false);
  }
  checks.push('System Admin and End-Customer direct-route and sidebar restrictions');

  await login(); state.holdHistory = true; await click('Refresh requests');
  await has('Loading mining requests...'); await login('MERCHANDISER', 2);
  state.noRequests = true; state.holdHistory = false; await has('No mining requests are available');
  assert.equal(await page.evaluate("!!document.querySelector('input[name=\"f06-run\"]')"), false);
  checks.push('session/Store change clears old source data during loading');

  state.noRequests = false; state.mode = 'normal'; await click('Refresh requests'); await selectCompleted();
  await page.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await capture('mobile');
  assert.equal(await page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), true, 'No horizontal page overflow on mobile');
  checks.push('390px responsive layout');
  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS (controlled browser fixtures)', checks, interceptedApiCalls: calls.length, realBackendWrites: 0, artifacts }, null, 2));
} catch (error) {
  try { if (page) await capture('failure'); } catch {}
  console.log(JSON.stringify({ result: 'FAIL', error: error.stack, checks, unexpected, errors, artifacts }, null, 2));
  process.exitCode = 1;
} finally {
  closing = true; state.holdWrite = false; state.holdHistory = false;
  if (page) { try { await page.call('Browser.close'); } catch {} page.ws.close(); }
  if (chrome.exitCode === null) await Promise.race([new Promise(done => chrome.once('exit', done)), sleep(2000)]);
  if (chrome.exitCode === null) chrome.kill();
  const target = resolve(profile);
  if (dirname(target) === base && basename(target).startsWith('paspm-f06-browser-')) {
    try { rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {}
  }
}
