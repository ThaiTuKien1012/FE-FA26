// node --import tsx tests/f06.browse.browser.mjs (Vite must be running).
// All /api requests are intercepted before navigation. No real backend writes.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { recommendation, eligibility, policy } from './f06.fixtures.ts';
import { requestFixture, runFixture } from './f05.fixtures.ts';

const origin = process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3000';
const base = resolve(tmpdir()), profile = mkdtempSync(join(base, 'paspm-f06-browse-browser-'));
const artifacts = mkdtempSync(join(base, 'paspm-f06-browse-preview-'));
const chrome = spawn(process.env.F06_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
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
const state = { role: 'MERCHANDISER', storeId: 1, listStatus: 200, detailStatus: 200, empty: false, holdList: false, network: false, ready: false, availability: null, reviewStatus: 'APPROVED', namesUnavailable: false };
const session = "(await (window.fixtureAuth ??= import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/services/authService.ts').name))).authService";
async function until(expression, label) {
  const end = Date.now() + 12000;
  while (Date.now() < end) { if (await page.evaluate(expression)) return; await sleep(40); }
  throw new Error('UI timeout: ' + label);
}
const has = text => until(`document.body.innerText.includes(${JSON.stringify(text)})`, text);
async function click(label) {
  assert.equal(await page.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.closest('[hidden]'));if(!b||b.disabled)return false;b.click();return true;})()`), true, 'Clickable: ' + label);
}
async function select(id, value) {
  await page.evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});const setter=Object.getOwnPropertyDescriptor(e.tagName==='INPUT'?HTMLInputElement.prototype:HTMLSelectElement.prototype,'value').set;setter.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='INPUT'?'input':'change',{bubbles:true}));})()`);
}
async function login(role = 'MERCHANDISER', storeId = 1) {
  state.role = role; state.storeId = storeId;
  await page.evaluate(`(async()=>{const auth=${session};auth.endLocal();await auth.authenticate('/api/auth/login',{email:'fixture@example.invalid',password:'fixture-only'});history.pushState({},'','/recommendations');dispatchEvent(new PopStateEvent('popstate'));})()`);
  if (role === 'MERCHANDISER') await until("!!document.querySelector('#f06-browse-tab')", 'workspace mounted');
  if (role === 'STORE_ADMIN') await until("!!document.querySelector('#f06-dashboard-title')", 'Store Admin list mounted');
}
async function dashboard() {
  await page.evaluate("document.querySelector('#f06-browse-tab')?.click()");
  await until("!!document.querySelector('#f06-dashboard-title')", 'dashboard mounted');
}
async function openDetails(id) {
  await page.evaluate(`(()=>{const button=[...document.querySelectorAll('button[aria-label="View details for recommendation #${id}"]')].find(el=>el.getClientRects().length);if(!button)throw new Error('No visible detail button');button.click();})()`);
}
async function capture(name) {
  const result = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(join(artifacts, name + '.png'), Buffer.from(result.data, 'base64'));
}
function item(id, storeId) {
  const pending = state.reviewStatus === 'PENDING_REVIEW';
  const common = { recommendationId: id, storeId, reviewedBy: pending ? null : 7, reviewedAt: pending ? null : '2026-11-07T00:00:00Z', reviewReason: pending ? null : 'Reviewed frozen evidence', reviewStatus: state.reviewStatus, version: pending ? 1 : 2,
    readyForConsumption: state.ready, inventoryChanged: true, currentEligibility: eligibility(state.availability ?? (state.ready ? 'ELIGIBLE' : 'INELIGIBLE')) };
  return recommendation(id % 2 ? { ...common, type: 'CROSS_SELL', anchorProductId: 31 } : { ...common,
    evidence: { totalTransactions: 0, supportCount: null, supportRatio: null, anchorSupportCount: null, confidence: null, status: 'EVIDENCE_UNAVAILABLE' },
    reviewHistory: pending ? [] : [{ oldStatus: 'PENDING_REVIEW', newStatus: state.reviewStatus, reviewedBy: 7, reviewedAt: '2026-11-07T00:00:00Z', reason: 'Reviewed frozen evidence', resultingVersion: 2, eligibilityCheck: eligibility() }] });
}
async function fixture({ requestId, request }) {
  const url = new URL(request.url), path = url.pathname;
  // Background Login video is unrelated to these fixture-only UI checks.
  if (path.startsWith('/videos/')) return page.call('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
  if (!path.startsWith('/api/')) return page.call(url.origin === origin ? 'Fetch.continueRequest' : 'Fetch.failRequest', { requestId, ...(url.origin === origin ? {} : { errorReason: 'BlockedByClient' }) });
  calls.push({ path, query: url.search, method: request.method });
  let body, responseCode = 200;
  const storeId = state.storeId;
  if (path === '/api/auth/login') body = { accessToken: 'fixture-only-access', expiresIn: 3600, tokenType: 'Bearer', csrfToken: 'fixture-only-csrf' };
  else if (path === '/api/auth/me') body = { userId: 12, name: 'F06 Fixture', email: 'fixture@example.invalid', roleCode: state.role, storeId, status: 'ACTIVE', emailVerified: true };
  else if (path === '/api/recommendations') {
    if (state.network) return page.call('Fetch.failRequest', { requestId, errorReason: 'InternetDisconnected' });
    for (const key of url.searchParams.keys()) assert.ok(['page', 'pageSize', 'miningRunId', 'snapshotId', 'type', 'reviewStatus'].includes(key));
    const pageIndex = Number(url.searchParams.get('page') || 0), size = Number(url.searchParams.get('pageSize') || 20);
    const ranked = url.searchParams.has('miningRunId');
    body = { items: state.empty ? [] : [item(62 + pageIndex * size, storeId), item(63 + pageIndex * size, storeId)].map((row, index) => ({ ...row, rank: ranked ? pageIndex * size + index + 1 : null })),
      page: pageIndex, pageSize: size, totalElements: state.empty ? 0 : 45, ordering: ranked ? 'RANKED_WITHIN_SOURCE_RUN' : 'CREATED_DESC' };
    while (state.holdList && !closing) await sleep(20);
    responseCode = state.listStatus;
    if (responseCode !== 200) body = { error: responseCode === 409 ? 'Rank scope exceeds 10000 candidates' : 'Controlled list failure' };
  } else if (/^\/api\/recommendations\/\d+$/.test(path)) {
    responseCode = state.detailStatus; body = responseCode === 200 ? item(Number(path.split('/').at(-1)), storeId) : { error: 'Recommendation not found' };
  } else if (/^\/api\/products\/\d+$/.test(path)) {
    responseCode = state.namesUnavailable ? 404 : 200;
    body = state.namesUnavailable ? { error: 'Product not found' } : { id: Number(path.split('/').at(-1)), name: path.endsWith('/31') ? 'Fixture milk' : 'Fixture bread' };
  }
  else if (path === '/api/recommendations/config') body = policy;
  else if (path === '/api/mining/requests') body = { items: [{ ...requestFixture('FAILED', storeId), comparisonStatus: 'FAILED' }], page: 0, pageSize: 20, totalElements: 1 };
  else if (path === '/api/mining/requests/17/runs') body = [runFixture('COMPLETED', storeId), { ...runFixture('FAILED', storeId), runId: 43 }];
  else if (path === '/api/products') body = { content: [], page: 0, pageSize: 20, totalElements: 0, totalPages: 0 };
  else if (['/api/categories', '/api/system/stores'].includes(path)) body = [];
  else if (path === '/api/system/mining/config') body = { version: 0, algorithm: null, minUtilMode: null, minUtilValue: null, changedBy: null, changedAt: null };
  else if (path === '/api/utility/config') body = { config: { enableStock: true, enableExpiry: true, enableSeason: true, alpha: 1, beta: 1, gamma: 1, lambda: 0.1, expiryWindowDays: null, version: 1, scoringVersion: 'v1.2' }, lambdaPolicy: { lambdaMin: 0, lambdaMax: 0.5, version: 1 }, lambdaValid: true };
  else { unexpected.push(path); responseCode = 500; body = { error: 'Unexpected fixture endpoint' }; }
  if (path !== '/api/auth/login') assert.equal(request.method, 'GET', 'Phase 2B must not write');
  await page.call('Fetch.fulfillRequest', { requestId, responseCode, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') });
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
  await login(); await dashboard(); await has('45 matching recommendations');
  assert.equal(await page.evaluate("[...document.querySelectorAll('#f06-browse-panel thead th')].some(t=>t.textContent==='Rank')"), false);
  assert.equal(await page.evaluate("[...document.querySelectorAll('#f06-browse-panel tbody tr th')].map(t=>t.textContent.match(/#(\\d+)/)[1]).join(',')"), '62,63');
  await click('Next recommendations'); await has('Page 2 of 3');
  await select('f06-filter-snapshot', '2'); await select('f06-filter-type', 'BUNDLE'); await select('f06-filter-review', 'APPROVED'); await select('f06-filter-size', '10');
  await click('Apply Filters'); await has('Page 1 of 5');
  const query = new URLSearchParams(calls.filter(call => call.path === '/api/recommendations').at(-1).query);
  assert.deepEqual(Object.fromEntries(query), { page: '0', pageSize: '10', snapshotId: '2', type: 'BUNDLE', reviewStatus: 'APPROVED' });
  await click('Reset Filters'); await has('Page 1 of 3');
  checks.push('history order, nullable fields, totalElements pagination and all filters reset page');

  await click('Ranked by Mining Run'); await until("!!document.querySelector('#f06-ranked-request')", 'ranked requests');
  await select('f06-ranked-request', '17'); await until("document.querySelector('#f06-ranked-run')?.options.length===3", 'ranked runs');
  assert.equal(await page.evaluate("document.querySelector('#f06-ranked-run option[value=\"43\"]').disabled"), true);
  await select('f06-ranked-run', '42'); await has('Selected run · System ranking');
  assert.equal(await page.evaluate("document.querySelector('#f06-browse-panel [data-rank]').getAttribute('data-rank')"), '1');
  assert.ok(calls.filter(call => call.path === '/api/recommendations').at(-1).query.includes('miningRunId=42'));
  state.listStatus = 409; await click('Refresh'); await has('Narrow the type or review status filters');
  const reads = calls.filter(call => call.path === '/api/recommendations').length;
  await sleep(200); assert.equal(calls.filter(call => call.path === '/api/recommendations').length, reads);
  state.listStatus = 200; await click('Refresh'); await has('45 matching recommendations'); await capture('ranked-dashboard');
  checks.push('ranked source under failed comparison, no client ranking, 409 narrower-filter guidance');

  await click('All Recommendations'); await has('All recommendations · Newest first');
  await openDetails(63);
  await has('Fixture bread');
  assert.equal(await page.evaluate("document.querySelector('dialog [aria-label=\"Suggested cross-sell targets\"]').textContent.includes('#31')"), false);
  assert.equal(await page.evaluate("document.querySelector('dialog [aria-label=\"Suggested cross-sell targets\"]').textContent.includes('#32')"), true);
  assert.equal(await page.evaluate("document.activeElement.getAttribute('aria-label')"), 'Close recommendation details');
  await page.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await page.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await until("!document.querySelector('dialog')", 'Escape closes drawer');
  await openDetails(62);
  await has('Shopping evidence unavailable'); await has('Availability when created');
  assert.equal(await page.evaluate("document.querySelector('dialog [data-readiness]').textContent"), 'Not ready');
  assert.equal(await page.evaluate("(()=>{const dt=[...document.querySelectorAll('dialog dt')].find(e=>e.textContent==='Frequency');return dt.nextElementSibling.textContent;})()"), 'N/A');
  assert.equal(await page.evaluate("[...document.querySelectorAll('dialog dt')].some(e=>e.textContent==='Confidence')"), false, 'Bundle has no confidence field');
  await has('Approved; current selling conditions are not met.');
  await capture('read-only-details');
  state.reviewStatus = 'PENDING_REVIEW'; state.availability = 'ELIGIBLE';
  await click('Refresh details'); await has('Awaiting approval. Products are currently eligible.');
  assert.equal(await page.evaluate("document.querySelector('dialog [data-readiness]').textContent"), 'Not ready');
  await has('No review decision has been recorded yet.');
  state.reviewStatus = 'APPROVED'; state.availability = null;
  state.ready = true; await click('Refresh details'); await has('Fixture bread');
  assert.equal(await page.evaluate("document.querySelector('dialog [data-readiness]').textContent"), 'Ready to use');
  state.namesUnavailable = true; await click('Refresh details'); await has('Some product names are unavailable.');
  assert.equal(await page.evaluate("document.querySelector('dialog').textContent.includes('Product #31')"), true);
  assert.equal(await page.evaluate("document.querySelector('dialog').textContent.includes('Fixture milk')"), false);
  state.namesUnavailable = false;
  state.detailStatus = 404; await click('Refresh details'); await has('unavailable for your Store');
  assert.equal(await page.evaluate("document.querySelector('dialog').textContent.includes('Fixture milk')"), false);
  await page.evaluate("document.querySelector('button[aria-label=\"Close recommendation details\"]').click()");
  checks.push('drawer, focus/Escape, names, anchor exclusion, null evidence, approved-unready, live refresh and cross-Store 404');

  state.empty = true; await click('Refresh'); await has('No recommendations match these filters');
  state.network = true; await click('Refresh'); await has('Check your connection and refresh manually'); state.network = false;
  state.empty = false; state.holdList = true; await click('Refresh'); await has('Loading recommendations...');
  await login('MERCHANDISER', 2); state.empty = true; state.holdList = false; await dashboard(); await has('No recommendations match these filters');
  assert.equal(await page.evaluate("!!document.querySelector('#f06-browse-panel tbody')"), false);
  checks.push('empty, network, loading, session/Store change discards stale list');

  state.empty = false; state.detailStatus = 200;
  const beforeStore = calls.length;
  await login('STORE_ADMIN'); await dashboard(); await has('45 matching recommendations');
  assert.equal(await page.evaluate("!!document.querySelector('[role=tablist],#f06-filter-snapshot,#f06-filter-size,[aria-label=\"Recommendation ordering\"]')"), false);
  assert.equal(calls.slice(beforeStore).some(c => c.path.startsWith('/api/mining/') || c.path === '/api/recommendations/config'), false);
  await has('Fixture milk'); await has('Fixture bread');
  const nameReads = calls.filter(c=>/^\/api\/products\/\d+$/.test(c.path)).length;
  await click('Next recommendations');await has('Page 2 of 3');await has('Fixture milk');
  assert.equal(calls.filter(c=>/^\/api\/products\/\d+$/.test(c.path)).length,nameReads,'Names are reused across rows and pages');
  await click('Previous recommendations');await has('Page 1 of 3');
  assert.equal(await page.evaluate("[...document.querySelectorAll('strong')].some(e=>e.textContent==='Ready to use means approved and currently eligible.')"),false,'No definition banner');
  for(const [review,availability,ready] of [['PENDING_REVIEW','INELIGIBLE',false],['APPROVED','ELIGIBLE',true],['REJECTED','NEEDS_RECHECK',false]]){
    state.reviewStatus=review;state.availability=availability;state.ready=ready;await click('Refresh');await has('45 matching recommendations');
    assert.equal(await page.evaluate('!!document.querySelector('+JSON.stringify('[data-status="'+review+'"]')+')'),true);
    assert.equal(await page.evaluate('!!document.querySelector('+JSON.stringify('[data-status="'+availability+'"]')+')'),true);
  }
  state.reviewStatus='APPROVED';state.availability='ELIGIBLE';state.ready=true;
  await click('Refresh');await has('45 matching recommendations');
  for(const width of [1440,768,390]){
    await page.call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
    assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true);
    assert.equal(await page.evaluate("[...document.querySelectorAll('[data-status]')].filter(e=>e.getClientRects().length).every(e=>getComputedStyle(e).whiteSpace==='nowrap')"),true,'Store status labels never wrap');
    await capture('store-admin-list-'+width);
  }
  await capture('store-admin-desktop');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), true);
  await capture('store-admin-mobile');
  await openDetails(62); await has('Fixture bread');
  assert.equal(await page.evaluate("[...document.querySelectorAll('dialog summary')].find(e=>e.textContent==='Technical details').parentElement.open"), false);
  assert.equal(await page.evaluate("[...document.querySelectorAll('dialog button')].some(b=>/^(approve|reject)/i.test(b.textContent.trim()))"), false);
  assert.equal(await page.evaluate('document.querySelector("dialog").scrollWidth <= innerWidth + 1'), true);
  await capture('store-admin-detail-mobile');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
  await page.evaluate("document.querySelector('button[aria-label=\"Close recommendation details\"]').click()");
  assert.equal(await page.evaluate("!!document.querySelector('form[aria-label=\"Generate recommendations\"]')"), false);
  await capture('store-admin-dashboard');
  state.empty = true; await click('Refresh'); await has('No recommendations match these filters.');
  state.empty = false; state.network = true; await click('Refresh'); await has('Check your connection');
  state.network = false; state.holdList = true; await click('Refresh'); await has('Loading recommendations...');
  state.empty = true; await login('STORE_ADMIN', 2); state.holdList = false; await has('No recommendations match these filters.');
  assert.equal(await page.evaluate("!!document.querySelector('[aria-label=\"Product recommendation cards\"]')"), false, 'Old Store recommendations are discarded');
  state.empty = false; await login('STORE_ADMIN'); await has('45 matching recommendations');
  await select('f06-filter-type', 'BUNDLE'); await select('f06-filter-review', 'APPROVED'); await click('Apply Filters');
  await has('45 matching recommendations');
  assert.ok(calls.filter(c=>c.path==='/api/recommendations').at(-1).query.includes('reviewStatus=APPROVED'));
  assert.equal(await page.evaluate("!!document.querySelector('#f06-ranked-request')"), false);
  state.namesUnavailable = true; await login('STORE_ADMIN'); await has('45 matching recommendations');
  await openDetails(62); await has('Some product names are unavailable.'); await has('Product #31');
  await page.evaluate("document.querySelector('button[aria-label=\"Close recommendation details\"]').click()");
  state.namesUnavailable = false;

  for (const role of ['SYSTEM_ADMIN', 'END_CUSTOMER']) {
    await login(role); await until("!document.querySelector('#f06-browse-tab')", role + ' denied');
  }
  checks.push('Store Admin list/detail read-only; System Admin and End-Customer denied');

  await login(); await dashboard(); await has('45 matching recommendations');
  for (const width of [1024, 820]) {
    await page.call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    assert.equal(await page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), true, 'No tablet overflow');
    assert.equal(await page.evaluate("document.querySelector('[aria-label=\"Product recommendation cards\"]').getClientRects().length>0"), true);
  }
  await page.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), true);
  assert.equal(await page.evaluate("document.querySelector('[aria-label=\"Product recommendation cards\"]').getClientRects().length>0"), true, 'Mobile cards are visible');
  assert.equal(await page.evaluate("document.querySelector('#f06-browse-panel table').getClientRects().length"), 0, 'Wide table is hidden on mobile');
  await capture('mobile-dashboard');
  await openDetails(62); await has('Fixture bread');
  assert.equal(await page.evaluate("document.querySelector('dialog').scrollWidth <= innerWidth + 1"), true);
  await capture('mobile-details'); checks.push('390px dashboard and drawer without horizontal page overflow');
  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS (controlled browser fixtures)', checks, interceptedApiCalls: calls.length, realBackendWrites: 0, artifacts }, null, 2));
} catch (error) {
  try { if (page) await capture('failure'); } catch {}
  console.log(JSON.stringify({ result: 'FAIL', error: error.stack, checks, unexpected, errors, artifacts }, null, 2)); process.exitCode = 1;
} finally {
  closing = true; state.holdList = false;
  if (page) { try { await page.call('Browser.close'); } catch {} page.ws.close(); }
  if (chrome.exitCode === null) await Promise.race([new Promise(done => chrome.once('exit', done)), sleep(2000)]);
  if (chrome.exitCode === null) chrome.kill();
  const target = resolve(profile);
  if (dirname(target) === base && basename(target).startsWith('paspm-f06-browse-browser-')) {
    try { rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {}
  }
}
