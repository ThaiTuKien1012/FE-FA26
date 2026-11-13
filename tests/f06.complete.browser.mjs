// node --import tsx tests/f06.complete.browser.mjs (Vite must be running).
// All /api requests are intercepted before navigation. No real backend writes.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { recommendation, eligibility, policy, expiryPage, generation } from './f06.fixtures.ts';
import { requestFixture, runFixture } from './f05.fixtures.ts';

const origin = process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3000';
const base = resolve(tmpdir()), profile = mkdtempSync(join(base, 'paspm-f06-complete-browser-'));
const artifacts = mkdtempSync(join(base, 'paspm-f06-complete-preview-'));
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
const state = { role: 'MERCHANDISER', storeId: 1, review: 'PENDING_REVIEW', eligibility: 'ELIGIBLE', version: 1, mode: 'normal', hold: false, config: {...policy}, configMode: 'normal', expiryEmpty: false };
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
  await page.evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});const setter=Object.getOwnPropertyDescriptor(e.tagName==='INPUT'?HTMLInputElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLSelectElement.prototype,'value').set;setter.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);
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

function item(id = 62) {
  const final = state.review !== 'PENDING_REVIEW';
  return recommendation({ recommendationId: id, storeId: state.storeId, version: state.version, reviewStatus: state.review,
    currentEligibility: eligibility(state.eligibility), readyForConsumption: state.review === 'APPROVED' && state.eligibility === 'ELIGIBLE',
    reviewedBy: final ? 12 : null, reviewedAt: final ? '2026-11-10T00:00:00Z' : null, reviewReason: final ? 'Fixture review decision' : null,
    reviewHistory: final ? [{ oldStatus: 'PENDING_REVIEW', newStatus: state.review, reviewedBy: 12, reviewedAt: '2026-11-10T00:00:00Z', reason: 'Fixture review decision', resultingVersion: state.version, eligibilityCheck: eligibility(state.eligibility) }] : []
  });
}
async function fixture({ requestId, request }) {
  const url = new URL(request.url), path = url.pathname;
  if (path.startsWith('/videos/')) return page.call('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
  if (!path.startsWith('/api/')) return page.call(url.origin === origin ? 'Fetch.continueRequest' : 'Fetch.failRequest', { requestId, ...(url.origin === origin ? {} : { errorReason: 'BlockedByClient' }) });
  calls.push({ path, query: url.search, method: request.method, payload: request.postData ? JSON.parse(request.postData) : null });
  let body, responseCode = 200;
  if (path === '/api/auth/login') body = { accessToken: 'fixture-only-access', expiresIn: 3600, tokenType: 'Bearer', csrfToken: 'fixture-only-csrf' };
  else if (path === '/api/auth/me') body = { userId: 12, name: 'F06 Fixture', email: 'fixture@example.invalid', roleCode: state.role, storeId: state.storeId, status: 'ACTIVE', emailVerified: true };
  else if (path === '/api/recommendations') {
    const p = Number(url.searchParams.get('page') || 0), size = Number(url.searchParams.get('pageSize') || 20);
    body = { items: [item()], page: p, pageSize: size, totalElements: 45, ordering: 'CREATED_DESC' };
  } else if (/^\/api\/recommendations\/\d+$/.test(path)) body = item(Number(path.split('/').at(-1)));
  else if (/^\/api\/recommendations\/\d+\/(approve|reject)$/.test(path)) {
    assert.equal(request.method, 'POST'); assert.equal(state.role, 'MERCHANDISER');
    assert.deepEqual(Object.keys(JSON.parse(request.postData)).sort(), ['expectedVersion', 'reason']);
    while (state.hold && !closing) await sleep(20);
    if (state.mode === 'conflict') {
      state.version++; state.eligibility = 'INELIGIBLE'; responseCode = 409; body = { error: 'Inventory changed during review' };
    } else {
      state.review = path.endsWith('/approve') ? 'APPROVED' : 'REJECTED'; state.version++; body = item();
      if (state.mode === 'lost') return page.call('Fetch.failRequest', { requestId, errorReason: 'ConnectionClosed' });
    }
  } else if (path === '/api/recommendations/config') {
    if (request.method === 'PUT') {
      assert.equal(state.role, 'STORE_ADMIN'); const input = JSON.parse(request.postData);
      assert.deepEqual(Object.keys(input).sort(), ['expectedVersion','maxBundleSize','minConfidence','minSupportCount','minSupportRatio','minimumSellableQuantity']);
      assert.ok(Object.values(input).every(v => typeof v === 'number')); assert.equal(input.expectedVersion, state.config.version);
      if (state.configMode === 'conflict') { state.config = {...state.config, version: state.config.version + 1, maxBundleSize: 6}; responseCode = 409; body = { error: 'Store rules changed' }; }
      else { state.config = { ...state.config, ...input, version: state.config.version + 1 }; body = state.config; }
    } else body = state.config;
  } else if (path === '/api/recommendations/expiry-push') {
    assert.equal(request.method, 'GET'); for (const key of url.searchParams.keys()) assert.ok(['productId','page','pageSize'].includes(key));
    body = { ...expiryPage(), page: Number(url.searchParams.get('page') || 0), pageSize: Number(url.searchParams.get('pageSize') || 20), totalElements: state.expiryEmpty ? 0 : 45,
      items: state.expiryEmpty ? [] : expiryPage().items, warnings: ['Fixture metadata warning even on empty pages'] };
  } else if (path === '/api/recommendations/generate') { assert.equal(request.method, 'POST'); assert.equal(JSON.parse(request.postData).miningRunId, 42); body = generation; }
  else if (/^\/api\/products\/\d+$/.test(path)) body = { id: Number(path.split('/').at(-1)), name: path.endsWith('/31') ? 'Fixture milk' : 'Fixture bread' };
  else if (path === '/api/mining/requests') body = { items: [requestFixture('COMPLETED', state.storeId)], page: 0, pageSize: 20, totalElements: 1 };
  else if (path === '/api/mining/requests/17/runs') body = [runFixture('COMPLETED', state.storeId)];
  else if (path === '/api/mining/runs/42') body = runFixture('COMPLETED', state.storeId);
  else if (path === '/api/mining/requests/17') body = requestFixture('COMPLETED', state.storeId);
  else if (path === '/api/products') body = { content: [], page: 0, pageSize: 20, totalElements: 0, totalPages: 0 };
  else if (path === '/api/transactions' || path === '/api/transactions/imports') { assert.equal(request.method,'GET'); body = { content: [], page: 0, pageSize: 20, totalElements: 0 }; }
  else if (['/api/categories','/api/system/stores'].includes(path)) body = [];
  else if (path === '/api/system/mining/config') body = { version: 0, algorithm: null, minUtilMode: null, minUtilValue: null, changedBy: null, changedAt: null };
  else if (path === '/api/utility/config') body = { config: { enableStock: true, enableExpiry: true, enableSeason: true, alpha: 1, beta: 1, gamma: 1, lambda: 0.1, expiryWindowDays: null, version: 1, scoringVersion: 'v1.2' }, lambdaPolicy: { lambdaMin: 0, lambdaMax: 0.5, version: 1 }, lambdaValid: true };
  else { unexpected.push(path); responseCode = 500; body = { error: 'Unexpected fixture endpoint' }; }
  await page.call('Fetch.fulfillRequest', { requestId, responseCode, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') });
}
async function close(title) { await page.evaluate('document.querySelector('+JSON.stringify('button[aria-label="Close '+title+'"]')+').click()'); await until("!document.querySelector('dialog')", 'panel closed'); }
async function prepare(action) { await select('f06-review-reason', 'Fixture review decision'); await click(action+' Recommendation'); await has('Confirm '+(action === 'Approve' ? 'approval' : 'rejection')); }
const writes = () => calls.filter(c => /\/(approve|reject)$/.test(c.path));
try {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i=0;i<150&&!existsSync(portFile);i++) await sleep(100);
  assert.ok(existsSync(portFile), 'Chrome started');
  const port = readFileSync(portFile,'utf8').split('\n')[0], targets = await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const ws = new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
  await new Promise((done,reject)=>{ws.addEventListener('open',done,{once:true});ws.addEventListener('error',reject,{once:true});});
  page = new CDP(ws);
  page.on('Fetch.requestPaused', data=>fixture(data).catch(error=>{if(!closing&&!/Invalid InterceptionId/.test(error.message)) errors.push(error.message);}));
  page.on('Runtime.exceptionThrown', data=>errors.push(data.exceptionDetails.exception?.description||data.exceptionDetails.text));
  await page.call('Page.enable'); await page.call('Runtime.enable'); await page.call('Fetch.enable',{patterns:[{urlPattern:'*'}]});
  await page.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});
  await page.call('Page.navigate',{url:origin+'/login'});
  await until("performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname==='/src/services/authService.ts')",'session module');
  await login(); await until("!!document.querySelector('#f06-request')",'source picker'); await select('f06-request','17');
  await until("!!document.querySelector('input[name=\"f06-run\"]')",'completed run');
  await page.evaluate("document.querySelector('input[name=\"f06-run\"]').click()");
  await click('Generate recommendations'); await has('Recommendations Created'); await click('View Recommendations');
  await has('45 matching recommendations'); await click('Next recommendations'); await has('Page 2 of 3'); await openDetails(62); await has('Review this recommendation');
  assert.equal(await page.evaluate("[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Approve Recommendation').disabled"),true);
  await prepare('Approve'); assert.equal(writes().length,0);
  state.hold=true; await click('Confirm Approval'); await has('Saving decision...');
  assert.equal(await page.evaluate("document.querySelector('button[aria-label=\"Close recommendation details\"]').disabled"),true);
  state.hold=false; await has('Recommendation approved'); await has('Fixture review decision');
  assert.equal(writes().length,1); assert.deepEqual(writes()[0].payload,{expectedVersion:1,reason:'Fixture review decision'});
  assert.equal(await page.evaluate("!!document.querySelector('#f06-review-reason')"),false);
  assert.equal(await page.evaluate("document.querySelector('dialog [data-readiness]').textContent"),'Ready to use');
  await capture('review-approved'); await close('recommendation details'); await has('Page 2 of 3');
  checks.push('AD05 completed source → generate → browse → confirm approve → backend review history; page retained; duplicate blocked');

  state.review='PENDING_REVIEW';state.version=3;state.eligibility='INELIGIBLE';await openDetails(62);await has('Approval is unavailable');await prepare('Reject');await click('Confirm Rejection');await has('Recommendation rejected');await close('recommendation details');
  state.review='PENDING_REVIEW';state.version=5;state.eligibility='NEEDS_RECHECK';await openDetails(62);await has('Approval is unavailable');await close('recommendation details');
  state.eligibility='ELIGIBLE';state.mode='conflict';await openDetails(62);await has('Review this recommendation');await prepare('Approve');await click('Confirm Approval');await has('Inventory changed during review');await has('Approval is unavailable');
  const afterConflict=writes().length;await sleep(200);assert.equal(writes().length,afterConflict);assert.equal(await page.evaluate("!!document.querySelector('[aria-label=\"Confirm recommendation review\"]')"),false);
  state.mode='normal';await prepare('Reject');await click('Confirm Rejection');await has('Recommendation rejected');assert.equal(writes().at(-1).payload.expectedVersion,6);await close('recommendation details');
  state.review='PENDING_REVIEW';state.version=9;state.eligibility='ELIGIBLE';state.mode='lost';await openDetails(62);await has('Review this recommendation');await prepare('Approve');await click('Confirm Approval');await has('not confirmed');
  await until("!document.querySelector('#f06-review-reason')",'reconciled final approval');assert.equal(await page.evaluate("document.querySelector('dialog [data-readiness]').textContent"),'Ready to use');
  const afterLost=writes().length;await sleep(200);assert.equal(writes().length,afterLost);
  state.eligibility='INELIGIBLE';await click('Refresh details');await until("document.querySelector('dialog [data-readiness]')?.textContent==='Not ready'",'approved but unready');await close('recommendation details');
  checks.push('ineligible rejection, needs-recheck guard, 409 inventory reconciliation, lost-response GET, approved becoming not ready');

  await click('Store Rules');await has('Read-only access. Store Admin manages these rules.');
  assert.equal(await page.evaluate("!!document.querySelector('dialog form')"),false);await close('Store Rules');
  await login('STORE_ADMIN');await has('45 matching recommendations');await click('Manage Rules');await until("!!document.querySelector('#f06-rule-supportPercent')",'rule values');
  await select('f06-rule-supportPercent','12.34567');await click('Save Changes');await has('No rounding was applied');assert.equal(calls.filter(c=>c.method==='PUT').length,0);
  await select('f06-rule-supportPercent','12.3456');await select('f06-rule-confidencePercent','98.7654');await click('Save Changes');await has('Store rules saved successfully.');await has('Rules version 2');
  assert.equal(calls.filter(c=>c.method==='PUT').at(-1).payload.minSupportRatio,0.123456);
  await select('f06-rule-maxBundleSize','9');state.configMode='conflict';await click('Save Changes');await has('Current rules · Version 3');
  assert.equal(await page.evaluate("document.querySelector('#f06-rule-maxBundleSize').value"),'9');const puts=calls.filter(c=>c.method==='PUT').length;
  await click('Keep My Edits');assert.equal(calls.filter(c=>c.method==='PUT').length,puts);state.configMode='normal';await click('Save Changes');await has('Rules version 4');
  await capture('store-rules');await close('Store Rules');await openDetails(62);await has('Recommendation Overview');
  await page.evaluate("[...document.querySelectorAll('dialog summary')].find(e=>e.textContent==='Technical details').click()");await has('Rules Applied');
  assert.equal(await page.evaluate("document.querySelector('dialog').textContent.includes('4 products')"),true,'Existing recommendation shows captured max bundle size, not newly saved 9');
  assert.equal(await page.evaluate("!!document.querySelector('#f06-review-reason')"),false);await close('recommendation details');
  checks.push('Store Admin full numeric config PUT, exact percentages, validation, explicit 409 comparison; Merchant read-only; captured rules unchanged');

  const beforeExpiry=calls.length;await click('Expiry Alerts');await has('Expires in 5 days');await has('Fixture milk');await has('Asia/Ho_Chi_Minh');
  await select('f06-expiry-product','31');await select('f06-expiry-size','10');await click('Apply Expiry Filters');await has('Page 1 of 5');await click('Next alerts');await has('Page 2 of 5');
  assert.deepEqual(Object.fromEntries(new URLSearchParams(calls.filter(c=>c.path.endsWith('/expiry-push')).at(-1).query)),{page:'1',pageSize:'10',productId:'31'});
  assert.equal(calls.slice(beforeExpiry).some(c=>c.path.startsWith('/api/mining/')),false);
  state.expiryEmpty=true;await click('Refresh Alerts');await has('No expiry alerts match these filters');await has('Fixture metadata warning even on empty pages');
  for(const width of [390,820,1440]){await page.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true);}
  await capture('expiry-empty-warnings');await close('Expiry Alerts');
  await login();await dashboard();await click('Expiry Alerts');await has('No expiry alerts match these filters');await close('Expiry Alerts');
  for(const role of ['SYSTEM_ADMIN','END_CUSTOMER']){await login(role);await until("!document.querySelector('#f06-dashboard-title')",role+' denied');assert.equal(await page.evaluate("!!document.querySelector('dialog')"),false);}
  checks.push('expiry independent GET, supported filters/pages, names, backend timezone, empty warnings, both Store roles and denied actors');
  const beforeF04 = calls.length;
  for(const actor of ['STORE_ADMIN','MERCHANDISER']) {
    await login(actor);
    await page.evaluate("history.pushState({},'','/store/transactions/history');dispatchEvent(new PopStateEvent('popstate'))");await has('No imports yet');
    await page.evaluate("history.pushState({},'','/store/transactions');dispatchEvent(new PopStateEvent('popstate'))");await has('No transactions yet');
    await select('f04s-status','COMPLETED');await click('Apply Filters');await has('No matching transactions');
    assert.ok(calls.filter(c=>c.path==='/api/transactions').at(-1).query.includes('status=COMPLETED'));
    await click('Clear Filters');await has('No transactions yet');
    if(actor==='STORE_ADMIN') {await page.evaluate("history.pushState({},'','/store/transactions/import');dispatchEvent(new PopStateEvent('popstate'))");await has('Import Transactions');}
  }
  assert.equal(calls.slice(beforeF04).some(c=>c.method!=='GET'&&c.path!=='/api/auth/login'),false);
  checks.push('F04 regression: both Store roles browse imports/sales, filters/reset; Store Admin import page mounts without writes');
  assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
  console.log(JSON.stringify({result:'PASS (controlled browser fixtures)',checks,apiCoverage:8,realBackendWrites:0,artifacts},null,2));
} catch(error) {
  try{if(page)await capture('failure');}catch{}
  console.log(JSON.stringify({result:'FAIL',error:error.stack,checks,errors,unexpected,artifacts},null,2));process.exitCode=1;
} finally {
  closing=true;state.hold=false;
  if(page){try{await page.call('Browser.close');}catch{}page.ws.close();}
  if(chrome.exitCode===null)await Promise.race([new Promise(done=>chrome.once('exit',done)),sleep(2000)]);
  if(chrome.exitCode===null)chrome.kill();
  const target=resolve(profile);
  if(dirname(target)===base&&basename(target).startsWith('paspm-f06-complete-browser-')){try{rmSync(target,{recursive:true,force:true,maxRetries:3,retryDelay:100});}catch{}}
}

