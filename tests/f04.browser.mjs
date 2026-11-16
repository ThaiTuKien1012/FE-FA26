// node --import tsx tests/f04.browser.mjs (Vite must be running).
// All /api requests are intercepted before navigation. No real backend writes.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { progress, summary } from './f04.fixtures.ts';

const origin = process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3000';
const base = resolve(tmpdir()), profile = mkdtempSync(join(base, 'paspm-f04-browser-'));
const artifacts = mkdtempSync(join(base, 'paspm-f04-preview-'));
const chrome = spawn(process.env.F04_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  '--disable-sync', '--disable-extensions', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'
], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(done => setTimeout(done, ms));
class CDP {
  id = 0; pending = new Map(); handlers = new Map();
  constructor(ws) {
    this.ws = ws; ws.addEventListener('message', event => {
      const data = JSON.parse(event.data);
      if (data.id) {
        const pending = this.pending.get(data.id); if (!pending) return;
        this.pending.delete(data.id); data.error ? pending.reject(new Error(data.error.message)) : pending.resolve(data.result);
      } else for (const handler of this.handlers.get(data.method) || []) void handler(data.params);
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
  on(method, handler) { this.handlers.set(method, [...this.handlers.get(method) || [], handler]); }
  async evaluate(expression) {
    const result = await this.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result?.value;
  }
}
let page, closing = false;
const calls = [], errors = [], unexpected = [], checks = [];
const state = { role: 'STORE_ADMIN', storeId: 1, accepted: false, holdPost: false, network: false, postStatus: 202, current: progress(), result: summary(), issueRows: false };
const session = "(await (window.fixtureAuth ??= import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/services/authService.ts').name))).authService";
async function until(expression, label) {
  const end = Date.now() + 12000;
  while (Date.now() < end) { if (await page.evaluate(expression)) return; await sleep(40); }
  throw new Error('UI timeout: ' + label);
}
const has = text => until(`document.body.innerText.includes(${JSON.stringify(text)})`, text);
async function click(label) {
  assert.equal(await page.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}&&b.getClientRects().length);if(!b||b.disabled)return false;b.click();return true;})()`), true, 'Clickable: ' + label);
}
async function navigate(path) {
  await page.evaluate(`history.pushState({},'',${JSON.stringify(path)});dispatchEvent(new PopStateEvent('popstate'));`);
}
async function login(role = 'STORE_ADMIN', storeId = 1) {
  state.role = role; state.storeId = storeId;
  await page.evaluate(`(async()=>{const auth=${session};auth.endLocal();await auth.authenticate('/api/auth/login',{email:'fixture@example.invalid',password:'fixture-only'});})()`);
  await navigate('/store/transactions/import');
}
async function choose(name = 'sales.csv', contents = 'source_order_id,occurred_at,sku,quantity,unit_price,unit_cost,status\n') {
  await page.evaluate(`(()=>{const input=document.querySelector('#f04-csv-file');const transfer=new DataTransfer();transfer.items.add(new File([${JSON.stringify(contents)}],${JSON.stringify(name)},{type:'text/csv'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
}
async function capture(name) {
  const result = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(join(artifacts, name + '.png'), Buffer.from(result.data, 'base64'));
}
const posts = () => calls.filter(c => c.path.endsWith('/csv/async'));
const progressReads = () => calls.filter(c => c.path.endsWith('/progress'));
async function setProgress(patch, percent) {
  state.current = progress(patch);
  // Scheduled reads continue while active; an explicit refresh is also safe.
  await until(`!document.querySelector('.f04-progress-actions button')?.disabled`, 'status refresh available');
  await click('Refresh status');
  if (percent !== undefined) await until(`document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')===${JSON.stringify(String(percent))}`, 'measured percent ' + percent);
}
async function fixture({ requestId, request }) {
  const url = new URL(request.url), path = url.pathname;
  if (path.startsWith('/videos/')) return page.call('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
  if (!path.startsWith('/api/')) return page.call(url.origin === origin ? 'Fetch.continueRequest' : 'Fetch.failRequest', { requestId, ...(url.origin === origin ? {} : { errorReason: 'BlockedByClient' }) });
  calls.push({ path, query: url.search, method: request.method, headers: request.headers, body: request.postData });
  let body, responseCode = 200;
  if (path === '/api/auth/login' || path === '/api/auth/refresh') body = { accessToken: 'fixture-only-access', expiresIn: 3600, tokenType: 'Bearer', csrfToken: 'fixture-only-csrf' };
  else if (path === '/api/auth/me') body = { userId: 12, name: 'F04 Fixture', email: 'fixture@example.invalid', roleCode: state.role, storeId: state.storeId, status: 'ACTIVE', emailVerified: true };
  else if (path === '/api/transactions/imports/csv/async') {
    assert.equal(request.method, 'POST');
    assert.ok(Object.entries(request.headers).some(([key, value]) => key.toLowerCase() === 'idempotency-key' && /^[\w.:-]{1,128}$/.test(value)));
    while (state.holdPost && !closing) await sleep(20);
    state.accepted = true;
    if (state.network) return page.call('Fetch.failRequest', { requestId, errorReason: 'InternetDisconnected' });
    responseCode = state.postStatus; body = responseCode === 202 ? state.current : { error: 'Controlled request failure' };
  } else if (/^\/api\/transactions\/imports\/\d+\/progress$/.test(path)) body = path.includes('/43/') ? progress({ importBatchId: 43, status: 'COMPLETED', stage: 'LEGACY', progressPercent: 100 }) : { ...state.current, importBatchId: Number(path.split('/').at(-2)) };
  else if (/^\/api\/transactions\/imports\/\d+\/errors$/.test(path)) {
    const index = Number(url.searchParams.get('page') || 0), size = Number(url.searchParams.get('pageSize') || 20);
    body = { content: Array.from({ length: index === 0 ? size : 1 }, (_, i) => ({ rowNumber: index * size + i + 2, sourceOrderId: 'ORDER-' + i, status: 'REJECTED', errorDetails: '[{"field":"sku","message":"Unknown product"}]' })), page: index, pageSize: size, totalElements: 21 };
  } else if (/^\/api\/transactions\/imports\/\d+$/.test(path)) body = path.endsWith('/43') ? summary({ importBatchId: 43, filename: 'legacy.csv' }) : { ...state.result, importBatchId: Number(path.split('/').at(-1)) };
  else if (path === '/api/transactions/imports') {
    const index = Number(url.searchParams.get('page') || 0);
    const statuses = ['QUEUED', 'PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED', 'RECEIVING'];
    body = { content: index === 0 ? statuses.map((status, i) => summary({ importBatchId: 41 + i, filename: i === 2 ? 'legacy.csv' : 'sales.csv', status })) : [summary({ importBatchId: 11 })], page: index, pageSize: 20, totalElements: 21 };
  } else if (path === '/api/products') body = { content: [], page: 0, pageSize: 20, totalElements: 0, totalPages: 0 };
  else if (path === '/api/categories' || path === '/api/system/stores') body = [];
  else if (path === '/api/utility/config') body = { config: { enableStock: true, enableExpiry: true, enableSeason: true, alpha: 1, beta: 1, gamma: 1, lambda: .1, expiryWindowDays: null, version: 1, scoringVersion: 'v1.2' }, lambdaPolicy: { lambdaMin: 0, lambdaMax: .5, version: 1 }, lambdaValid: true };
  else { unexpected.push(path); responseCode = 500; body = { error: 'Unexpected fixture endpoint' }; }
  const responseHeaders = [{ name: 'Content-Type', value: 'application/json' }];
  if (path === '/api/auth/login' || path === '/api/auth/refresh') responseHeaders.push({ name: 'Set-Cookie', value: 'PASPM-CSRF=fixture-only-csrf; Path=/; SameSite=Lax' });
  await page.call('Fetch.fulfillRequest', { requestId, responseCode, responseHeaders, body: Buffer.from(JSON.stringify(body)).toString('base64') });
}
try {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 150 && !existsSync(portFile); i++) await sleep(100);
  assert.ok(existsSync(portFile), 'Chrome started');
  const port = readFileSync(portFile, 'utf8').split('\n')[0];
  const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  const ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((done, reject) => { ws.addEventListener('open', done, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  page = new CDP(ws);
  page.on('Fetch.requestPaused', data => fixture(data).catch(error => { if (!closing && !/Invalid InterceptionId/.test(error.message)) errors.push(error.message); }));
  page.on('Runtime.exceptionThrown', data => errors.push(data.exceptionDetails.exception?.description || data.exceptionDetails.text));
  await page.call('Page.enable'); await page.call('Runtime.enable'); await page.call('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.navigate', { url: origin + '/login' });
  await until("performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname==='/src/services/authService.ts')", 'session module');
  await login(); await has('Upload CSV');
  assert.equal(await page.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Import CSV').disabled"), true);
  await choose('bad.xlsx'); await has('Excel files are not supported'); await choose('empty.csv', ''); await has('This file is empty');
  await choose(); await capture('upload-desktop');
  state.holdPost = true; await click('Import CSV'); await has('Preparing your import');
  assert.equal(await page.evaluate("document.querySelector('[role=progressbar]').hasAttribute('aria-valuenow')"), false);
  assert.equal(await page.evaluate("document.body.innerText.includes('You can leave this page while the import continues.')"), false);
  await page.evaluate("document.querySelector('form')?.requestSubmit()"); assert.equal(posts().length, 1);
  state.holdPost = false; await has('Your import is queued'); await has('Batch #41');
  assert.equal(await page.evaluate("document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')"), '0');
  await setProgress({ status: 'PROCESSING', stage: 'IMPORTING', processedCount: 0, progressPercent: 0 }, 0);
  await setProgress({ status: 'PROCESSING', stage: 'IMPORTING', processedCount: 500, progressPercent: 50 }, 50); await has('500 of 1,000 rows processed');
  await page.evaluate("document.querySelector('.f04-progress-actions a').focus()");
  await sleep(1700); assert.equal(await page.evaluate("document.activeElement.textContent"), 'Import History');
  await capture('processing-desktop');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await capture('processing-mobile');
  assert.equal(await page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), true);
  await page.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await page.evaluate("getComputedStyle(document.querySelector('.f04-progress-track span')).transitionDuration"), '0s');
  await setProgress({ status: 'PROCESSING', stage: 'IMPORTING', totalCount: null, progressPercent: null });
  await until("!document.querySelector('[role=progressbar]').hasAttribute('aria-valuenow')", 'indeterminate');
  await setProgress({ status: 'PROCESSING', stage: 'IMPORTING', processedCount: 1000, progressPercent: 100 }, 100);
  assert.equal(await page.evaluate("document.body.innerText.includes('Order Summary')"), false);
  checks.push('file validation, upload/queued, measured 0/50/100/null, focus stability, mobile and reduced motion');

  await page.call('Page.reload'); await has('Importing transactions'); await has('100%'); assert.equal(posts().length, 1);
  await navigate('/store/transactions/history'); await has('Import History'); await has('legacy.csv');
  assert.equal(await page.evaluate("document.querySelector('tbody tr .f04h-number').textContent"), '—');
  const reads = progressReads().length; await sleep(1700); assert.equal(progressReads().length, reads);
  await page.evaluate("document.querySelector('[aria-label=\"View details for batch 41\"]').click()"); await has('Importing transactions');
  state.current = progress({ status: 'COMPLETED_WITH_ERRORS', stage: 'COMPLETED_WITH_ERRORS', processedCount: 1000, progressPercent: 100 });
  state.result = summary({ status: 'COMPLETED_WITH_ERRORS', rejectedCount: 21, rejectedOrderCount: 10, conflictOrderCount: 2, errorSummary: 'Some rows need review' });
  await has('New orders saved'); await has('Unknown product'); await has('Error details'); await capture('history-details-mobile');
  await page.evaluate("document.querySelector('[aria-label=\"Close import details\"]').click()");
  await page.evaluate("document.querySelector('[aria-label=\"View details for batch 43\"]').click()"); await has('New orders saved'); await has('490');
  await page.evaluate("document.querySelector('[aria-label=\"Close import details\"]').click()");
  await page.evaluate("document.querySelector('[aria-label=\"Next page: Import history\"]').click()"); await has('Page 2 of 2');
  await page.evaluate("document.querySelector('[aria-label=\"Previous page: Import history\"]').click()"); await has('legacy.csv');
  await navigate('/store/transactions/import'); await has('Import completed with issues'); await has('CSV Row Summary'); await has('Error Details');
  await click('Review errors'); assert.equal(await page.evaluate("document.activeElement.id"), 'import-errors-heading');
  await click('Next'); await has('Page 2'); await has('Showing 21–21 of 21 row errors');
  const terminalReads = progressReads().length; await sleep(1700); assert.equal(progressReads().length, terminalReads);
  await capture('result-mobile');
  checks.push('reload/navigation resume without POST, observer cleanup, pending history counters, terminal summary and row-error pagination');

  await click('Import another file'); await choose();
  state.current = progress({ status: 'FAILED', stage: 'FAILED', totalCount: null, progressPercent: null, errorSummary: 'Invalid CSV header' });
  state.result = summary({ status: 'FAILED', errorSummary: '<script>test-only</script> Invalid CSV header' });
  await click('Import CSV'); await has('Import failed'); await has("We couldn't finish processing this file."); await has('<script>test-only</script>');
  assert.equal(await page.evaluate("[...document.querySelectorAll('script')].some(s=>s.textContent==='test-only')"), false);
  await click('Import another file'); await choose(); state.network = true;
  await click('Import CSV'); await has('Upload confirmation unavailable');
  const lost = posts().at(-1); await sleep(1800); assert.equal(posts().at(-1), lost);
  state.network = false; state.current = progress(); await click('Retry original upload'); await has('Your import is queued');
  const header = call => Object.entries(call.headers).find(([key])=>key.toLowerCase()==='idempotency-key')[1];
  assert.equal(header(posts().at(-1)), header(lost));
  await login('STORE_ADMIN', 2); await has('Upload CSV'); assert.equal(await page.evaluate("!!document.querySelector('[role=progressbar]')"), false);
  await login('MERCHANDISER', 1); await has('Permission Required'); await navigate('/store/transactions/history'); await has('legacy.csv');
  await page.evaluate("document.querySelector('[aria-label=\"View details for batch 41\"]').click()"); await has('Your import is queued');
  assert.equal(await page.evaluate("document.body.innerText.includes('Import CSV')"), false);
  await page.evaluate("document.querySelector('[aria-label=\"Close import details\"]').click()");
  await login('END_CUSTOMER', 1); await has('Permission Required');
  checks.push('failure renders safe text, network uncertainty retains original key, Store isolation, Merchandiser progress and restricted actors');
  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS (controlled browser fixtures)', checks, interceptedApiCalls: calls.length, realBackendWrites: 0, artifacts }, null, 2));
} catch (error) {
  try { if (page) await capture('failure'); } catch {}
  console.log(JSON.stringify({ result: 'FAIL', error: error.stack, checks, unexpected, errors, artifacts }, null, 2)); process.exitCode = 1;
} finally {
  closing = true; state.holdPost = false;
  if (page) { try { await page.call('Browser.close'); } catch {} page.ws.close(); }
  if (chrome.exitCode === null) await Promise.race([new Promise(done => chrome.once('exit', done)), sleep(2000)]);
  if (chrome.exitCode === null) chrome.kill();
  const target = resolve(profile);
  if (dirname(target) === base && basename(target).startsWith('paspm-f04-browser-')) {
    try { rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {}
  }
}
