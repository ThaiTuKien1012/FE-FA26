// Test-only HTTP fixtures. ALL /api calls are intercepted; unknown calls fail closed.
// Start Vite, then: npx.cmd --no-install tsx tests/f03.browser.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { configView, scores, matrix, snapshot } from './f03.fixtures.ts';

const origin = 'http://127.0.0.1:3000';
const root = resolve(tmpdir());
const profile = mkdtempSync(join(root, 'paspm-f03-browser-'));
const artifacts = mkdtempSync(join(root, 'paspm-f03-preview-'));
const chrome = spawn(process.env.F03_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-sync', '--disable-extensions', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let cdp, initId;
const calls = [], unexpected = [], errors = [], checks = [];
const state = { config: structuredClone(configView), historyError: false, empty: false, ready: true, warnings: [], snapshotError: false, scoreError: false, configError: false, forbiddenMatrix: false, delayCreate: false, delayPreview: false, delayScore: false, delayConfig: false, created: false };
class CDP {
  next = 0; pending = new Map(); listeners = new Map();
  constructor(ws) { this.ws = ws; ws.addEventListener('message', e => { const data = JSON.parse(e.data); if (data.id) { const p = this.pending.get(data.id); if (!p) return; this.pending.delete(data.id); data.error ? p.reject(new Error(data.error.message)) : p.resolve(data.result); } else for (const handler of this.listeners.get(data.method) || []) void handler(data.params); }); }
  call(method, params = {}) { return new Promise((resolve, reject) => { const id = ++this.next; const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 10000); this.pending.set(id, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); } }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  on(name, callback) { this.listeners.set(name, [...this.listeners.get(name) || [], callback]); }
}
async function evaluate(expression) { const r = await cdp.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result?.value; }
async function until(expression, label) { const end = Date.now() + 10000; while (Date.now() < end) { if (await evaluate(expression)) return; await sleep(50); } throw new Error('UI timeout: ' + label); }
const visible = "([...document.querySelectorAll('main')].map(e=>e.innerText).join(' ').replace(/\\s+/g,' '))";
const has = text => until(visible + '.toLowerCase().includes(' + JSON.stringify(text.toLowerCase()) + ')', text);
const buttons = "[...document.querySelectorAll('main button')].filter(b=>b.getClientRects().length)";
async function click(text) { await until(buttons + '.some(b=>b.innerText.trim()===' + JSON.stringify(text) + '&&!b.disabled)', 'click ' + text); await evaluate(buttons + '.find(b=>b.innerText.trim()===' + JSON.stringify(text) + ').click()'); }
async function enabled(text) { return evaluate(buttons + '.some(b=>b.innerText.trim()===' + JSON.stringify(text) + '&&!b.disabled)'); }
async function tab(text) { await evaluate("[...document.querySelectorAll('nav[aria-label=\"Utility Planner tabs\"] button')].find(b=>b.innerText===" + JSON.stringify(text) + ').click()'); await has(({ Configuration: 'Utility Configuration', 'Product Scores': 'Product Priority Scores', Preview: 'Utility Preview', Snapshots: 'Utility Snapshots' })[text]); }
async function input(label, value) { assert.equal(await evaluate("(()=>{const e=[...document.querySelectorAll('input[aria-label=" + JSON.stringify(label) + "]')].find(e=>e.getClientRects().length);if(!e||e.disabled)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e," + JSON.stringify(value) + ");e.dispatchEvent(new Event('input',{bubbles:true}));return true;})()"), true, label); }
async function toggle(label) { await evaluate('document.querySelector(' + JSON.stringify('input[aria-label="' + label + '"]') + ').click()'); }
async function select(value) { await until("(()=>{const e=document.querySelector('select[aria-label=Product]');return e&&!e.disabled&&[...e.options].some(o=>o.value===" + JSON.stringify(String(value)) + ");})()", 'Loaded product option ' + value); await evaluate("(()=>{const e=document.querySelector('select[aria-label=Product]');e.value=" + JSON.stringify(String(value)) + ";e.dispatchEvent(new Event('change',{bubbles:true}));})()"); }
async function pageNext(label) { const selector = "[...document.querySelectorAll('nav[aria-label=" + JSON.stringify(label + ' pagination') + "] button')].find(b=>b.innerText==='Next'&&b.getClientRects().length&&!b.disabled)"; await until('Boolean(' + selector + ')', 'Next ' + label); await evaluate(selector + '.click()'); }
async function session(role, path = '/f03/configuration') {
  if (initId) await cdp.call('Page.removeScriptToEvaluateOnNewDocument', { identifier: initId });
  const user = { id: 'f03-test', name: 'Fixture Merchandiser', email: 'fixture@example.invalid', role, department: 'Test Store', avatarText: 'FM', defaultScreen: 'f03-configuration', allowedScreens: [] };
  const source = 'localStorage.clear();sessionStorage.clear();' + (role ? "localStorage.setItem('retailspace_auth_user'," + JSON.stringify(JSON.stringify(user)) + ");localStorage.setItem('retailspace_auth_token','fixture-only-token');" : '');
  initId = (await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source })).identifier;
  await cdp.call('Page.navigate', { url: origin + path });
}
async function capture(name) { await sleep(80); const shot = await cdp.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); writeFileSync(join(artifacts, name + '.png'), Buffer.from(shot.data, 'base64')); }
async function paused({ requestId, request }) {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  calls.push({ path, method, query: url.search, body: request.postData });
  const page = Number(url.searchParams.get('page') || 0), size = Number(url.searchParams.get('pageSize') || 20);
  let body, code = 200;
  try {
    if (path === '/api/utility/config') {
      if (method === 'PUT') { while (state.delayConfig) await sleep(20); if (state.configError) { code = 409; body = { error: 'Fixture configuration conflict' }; } else { state.config.config = { ...state.config.config, ...JSON.parse(request.postData), version: state.config.config.version + 1 }; body = state.config; } }
      else body = state.config;
    } else if (path === '/api/products') {
      const search = url.searchParams.get('search') || '';
      const all = Array.from({ length: 121 }, (_, i) => ({ id: i + 1, name: `Product ${String(i + 1).padStart(3, '0')}`, sku: 'SKU-' + (i + 1), unit: 'EA', requiresExpiry: true, category: null, sellingPrice: 20, costPrice: 10, status: 'ACTIVE', stockQuantity: 30, expiryPushDays: 10 })).filter(p => !search || p.name.includes(search) || p.sku.includes(search));
      body = { content: all.slice(page * size, (page + 1) * size), page, pageSize: size, totalElements: all.length, totalPages: Math.ceil(all.length / size) };
    } else if (/^\/api\/utility\/products\/\d+\/scores$/.test(path)) {
      while (method === 'PATCH' && state.delayScore) await sleep(20);
      if (method === 'PATCH' && state.scoreError) { code = 400; body = { error: 'Fixture score save failed' }; }
      else body = { ...scores, productId: Number(path.split('/')[4]), ...(method === 'PATCH' ? JSON.parse(request.postData) : {}) };
    } else if (path === '/api/utility/expiry-push-batches') {
      body = { items: [{ productId: 1, batchId: page + 1, expiryDate: '2026-11-10', remainingQuantity: 12, expiryPushDays: 10, daysRemaining: 5, pushRequired: true, pushRequiredQuantity: 12, asOfDate: '2026-11-05' }], page, pageSize: size, totalElements: 21, asOfDate: '2026-11-05', timeZone: 'Asia/Ho_Chi_Minh', warnings: [] };
    } else if (path === '/api/utility/preview') {
      while (state.delayPreview) await sleep(20);
      body = { ...matrix(JSON.parse(request.postData).page), ready: state.ready, warnings: state.warnings };
    } else if (path === '/api/utility/snapshots' && method === 'POST') {
      while (state.delayCreate) await sleep(20);
      if (state.snapshotError) { code = 503; body = { error: 'Fixture snapshot creation failed' }; }
      else { state.created = true; body = { ...snapshot(122), ...JSON.parse(request.postData) }; code = 201; }
    } else if (path === '/api/mining/snapshots') {
      if (state.historyError) { code = 503; body = { error: 'Fixture history unavailable' }; }
      else { const count = state.empty ? 0 : state.created ? 122 : 121; body = { items: Array.from({ length: Math.max(0, Math.min(size, count - page * size)) }, (_, i) => snapshot(count - page * size - i)), page, pageSize: size, totalElements: count }; }
    } else if (/^\/api\/utility\/snapshots\/\d+$/.test(path)) body = snapshot(Number(path.split('/').at(-1)));
    else if (/^\/api\/utility\/snapshots\/\d+\/matrix$/.test(path)) { if (state.forbiddenMatrix) { code = 403; body = { error: 'Forbidden matrix fixture' }; } else body = matrix(page); }
    else if (path === '/api/mining/requests') body = { items: [], page, pageSize: size, totalElements: 0 };
    else if (path === '/api/system/utility/lambda-policy') body = state.config.lambdaPolicy;
    else { unexpected.push({ path, method }); code = 500; body = { error: 'Unexpected API blocked by fixtures' }; }
    await cdp.call('Fetch.fulfillRequest', { requestId, responseCode: code, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') });
  } catch (e) { if (!/Invalid InterceptionId|Invalid Fetch|No resource|closed/.test(e.message)) errors.push(e.message); }
}
try {
  const end = Date.now() + 10000;
  while (!existsSync(join(profile, 'DevToolsActivePort')) && Date.now() < end) await sleep(100);
  const port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0]);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  cdp = new CDP(ws); cdp.on('Fetch.requestPaused', paused); cdp.on('Runtime.exceptionThrown', e => errors.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
  await cdp.call('Page.enable'); await cdp.call('Runtime.enable');
  await cdp.call('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*', requestStage: 'Request' }] });
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  await session('Merchandiser'); await has('Save Configuration');
  assert.equal(await evaluate("document.querySelectorAll('nav[aria-label=\"Utility Planner tabs\"] button').length"), 4);
  assert.equal(await evaluate("Boolean(document.querySelector('nav[aria-label=Breadcrumb]'))"), false);
  await input('Stock Importance', '0.4'); assert.equal(await enabled('Save Configuration'), false); await has('exactly 1');
  await input('Stock Importance', '0.5'); await input('Priority Strength (Lambda)', '0.6'); assert.equal(await enabled('Save Configuration'), false);
  await input('Priority Strength (Lambda)', '0.4');
  for (const name of ['Stock', 'Expiry', 'Seasonal']) await toggle(name + ' Priority');
  await has('baseline Weight W = 1'); assert.equal(await enabled('Save Configuration'), true);
  await click('Save Configuration'); await has('Configuration version 8 saved');
  for (const name of ['Stock', 'Expiry', 'Seasonal']) await toggle(name + ' Priority');
  await click('Save Configuration'); await has('Configuration version 9 saved');
  checks.push('enabled / disabled factors, exact coefficient total, all-disabled baseline, Lambda limits and versioned save');

  await tab('Product Scores'); await has('121 products'); await select(1); await has('Utility Weight');
  assert.equal(await evaluate("document.querySelectorAll('input[aria-label=\"Expiry Score\"],input[aria-label=\"Utility Weight\"]').length"), 0);
  await input('Stock Priority Score', '1.1'); assert.equal(await enabled('Save Product Scores'), false);
  await input('Stock Priority Score', '0.123456'); state.scoreError = true; await click('Save Product Scores'); await has('Fixture score save failed'); state.scoreError = false;
  await click('Save Product Scores'); await has('Product scores saved');
  await pageNext('products'); await has('Page 2 of 7'); await has('Selected: Product 001');
  await input('Search Products', '121'); await click('Search Catalog'); await has('1 products'); await select(121); await has('Selected: Product 121');
  await pageNext('batches'); await has('Page 2 of 2');
  checks.push('manual score validation and PATCH failure; calculated scores read-only; 121-product pagination / server search; expiry pagination');

  await tab('Preview');
  await input('Start Date', '2026-10-31'); await input('End Date', '2026-10-01'); assert.equal(await enabled('Calculate Preview'), false);
  await input('Start Date', '2026-10-01'); await input('End Date', '2026-10-31'); await input('Analysis Date', '2026-11-05');
  state.ready = false; await click('Calculate Preview'); await has('Not Ready'); assert.equal(await enabled('Continue to Snapshots'), false);
  state.ready = true; state.warnings = ['Historical transactions retained; not proof of sellable inventory'];
  await click('Calculate Preview'); await has('Continue to Snapshots'); await has(state.warnings[0]);
  await pageNext('matrix rows'); await has('Page 2 of 2');
  const postsBeforeContinue = calls.filter(c => c.path === '/api/utility/snapshots').length;
  await click('Continue to Snapshots'); await has('Create Snapshot');
  assert.equal(calls.filter(c => c.path === '/api/utility/snapshots').length, postsBeforeContinue);
  await tab('Preview'); await input('Analysis Date', '2026-11-06'); await tab('Snapshots'); await has('Dates changed'); assert.equal(await enabled('Create Snapshot'), false);
  await tab('Preview'); await click('Calculate Preview'); await has('Continue to Snapshots');
  await tab('Configuration'); await input('Stock Importance', '0.6'); await tab('Snapshots'); assert.equal(await enabled('Create Snapshot'), false);
  await tab('Configuration'); await input('Stock Importance', '0.5'); await click('Save Configuration'); await has('Configuration version 10 saved');
  await tab('Preview'); await click('Calculate Preview'); await has('Continue to Snapshots');
  await tab('Product Scores'); await input('Stock Priority Score', '0.5'); await tab('Snapshots'); assert.equal(await enabled('Create Snapshot'), false);
  checks.push('valid / invalid date ranges; READY / NOT READY and warning semantics; date / config / scores invalidate Preview across tabs; Continue only navigates');

  // Reject a late Preview response after a different tab changes an input.
  state.delayPreview = true; await tab('Preview'); await click('Calculate Preview'); await has('Calculating…');
  await tab('Configuration'); await input('Stock Importance', '0.4'); state.delayPreview = false; await sleep(150);
  await tab('Snapshots'); assert.equal(await enabled('Create Snapshot'), false);
  await tab('Configuration'); await input('Stock Importance', '0.5');
  await tab('Preview'); await click('Calculate Preview'); await has('Continue to Snapshots'); await tab('Snapshots');
  state.snapshotError = true; const beforeFailure = calls.length; await click('Create Snapshot'); await has('Fixture snapshot creation failed');
  assert.equal(calls.slice(beforeFailure).filter(c => c.path === '/api/utility/snapshots').length, 1);
  assert.equal(await evaluate(visible + ".includes('2026-10-01')"), true); assert.equal(await enabled('Create Snapshot'), false);
  state.snapshotError = false; await tab('Preview'); await click('Calculate Preview'); await has('Continue to Snapshots'); await tab('Snapshots');
  state.delayCreate = true; const beforeDouble = calls.filter(c => c.path === '/api/utility/snapshots').length;
  await evaluate(buttons + ".find(b=>b.innerText.trim()==='Create Snapshot').click();" + buttons + ".find(b=>/Create Snapshot|Creating/.test(b.innerText))?.click()");
  await has('Creating…'); await sleep(100); assert.equal(calls.filter(c => c.path === '/api/utility/snapshots').length, beforeDouble + 1);
  await tab('Preview'); await click('Calculate Preview'); await has('Continue to Snapshots'); await tab('Snapshots');
  assert.equal(await enabled('Create Snapshot'), false, 'Snapshot request stays locked across tab navigation');
  assert.equal(calls.filter(c => c.path === '/api/utility/snapshots').length, beforeDouble + 1);
  state.delayCreate = false; await has('Snapshot #122 created successfully.'); await has('122 snapshots');
  const create = calls.filter(c => c.path === '/api/utility/snapshots').at(-1);
  assert.deepEqual(JSON.parse(create.body), { rangeStart: '2026-10-01', rangeEnd: '2026-10-31', asOfDate: '2026-11-06' });
  checks.push('late Preview response discarded; failed Snapshot retains dates and never retries; double-click sends one POST; API ID and refreshed history shown');

  await pageNext('snapshots'); await has('Page 2 of 7');
  state.historyError = true; await click('Refresh History'); await has('Fixture history unavailable');
  state.historyError = false; state.empty = true; await click('Refresh History'); await has('No READY snapshots');
  state.empty = false; await click('Refresh History'); await has('122 snapshots');
  await pageNext('snapshots'); await has('Page 2 of 7');
  await evaluate("document.querySelector('button[aria-label=\"View Details for Snapshot #102\"]').click()");
  await has('Snapshot #102'); await has('Frozen Configuration'); await has('0.5');
  assert.equal(await evaluate("[...document.querySelectorAll('main section')].find(s=>s.querySelector('h2')?.innerText==='Frozen Configuration').innerText.includes('7')"), true);
  await pageNext('matrix rows'); await has('Page 2 of 2');
  await evaluate("history.pushState({},'', '/f03/snapshot/detail?id=101');dispatchEvent(new PopStateEvent('popstate'))"); await has('Snapshot #101');
  await evaluate('history.back()'); await has('Snapshot #102');
  await cdp.call('Page.reload'); await has('Snapshot #102'); await has('Frozen Configuration');
  await click('Back to Snapshots'); await has('Utility Snapshots');
  assert.equal(await enabled('Create Snapshot'), false);
  checks.push('history pagination, empty/error/refresh; deep-link detail and same-route ID Back; refresh; frozen config is version 7, current is 10; matrix pagination');

  // All four layouts at the requested viewport widths; horizontal tables stay contained.
  for (const width of [1440, 1024, 820, 390]) {
    await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    for (const label of ['Configuration', 'Product Scores', 'Preview', 'Snapshots']) {
      await tab(label); await sleep(100);
      assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true, `${label} at ${width}px`);
      await capture(`${width}-${label.replaceAll(' ', '-').toLowerCase()}`);
    }
  }
  await evaluate("document.querySelector('nav[aria-label=\"Utility Planner tabs\"] button').focus()");
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight' });
  assert.equal(await evaluate('document.activeElement.innerText'), 'Product Scores');
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 }); await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); await has('Product Priority Scores');
  await evaluate('history.back()'); await has('Utility Snapshots'); await evaluate('history.forward()'); await has('Product Priority Scores');
  checks.push('1440/1024/820/390px screenshots and no page overflow; arrow / Enter navigation; Back / Forward and active sidebar');

  await session('Merchandiser', '/f03/snapshots'); await has('Run Utility Preview before creating a snapshot.');
  await session(null, '/f03/snapshots'); await has('Sign in to the system');
  await session('Merchandiser', '/f03/snapshot'); await has('Utility Snapshots');
  state.forbiddenMatrix = true; await session('Merchandiser', '/f03/snapshot/matrix?id=21'); await has('Access denied (403)'); await has('Frozen Configuration'); state.forbiddenMatrix = false;
  for (const role of ['Store Admin', 'Merchandiser']) {
    await session(role, '/mining?view=snapshots'); await has('Read-only access'); await has('Snapshot #122');
    assert.equal(await evaluate(buttons + ".some(b=>b.innerText.trim()==='Run Mining')"), false);
  }
  await session('Store Admin', '/f03/snapshots'); await has('Details require Merchandiser access'); assert.equal(await enabled('Create Snapshot'), false);
  const beforeDenied = calls.length;
  for (const [role, path] of [['Store Admin', '/f03/snapshot/detail?id=21'], ['Store Admin', '/f03/preview'], ['System Admin', '/f03/snapshots'], ['End-Customer', '/f03/snapshots']]) { await session(role, path); await has('Access Restricted'); }
  assert.equal(calls.length, beforeDenied);
  await session('Store Admin', '/f03/product-scores'); await has('Read-only scores'); await select(1); await has('Utility Weight'); assert.equal(await enabled('Save Product Scores'), false);
  await session('System Admin', '/admin/lambda-policy'); await has('Global Lambda Policy'); assert.equal(await evaluate(buttons + ".some(b=>b.innerText.trim()==='Save Configuration')"), false);
  checks.push('direct Snapshots starts without Preview; legacy links; matrix 403; F03 READY snapshots readable by F05; Store Admin read-only; Customer/System Admin isolation; Lambda Policy preserved');

  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
  assert.ok(calls.filter(c => c.method !== 'GET').every(c => ['/api/utility/config', '/api/utility/preview', '/api/utility/snapshots'].includes(c.path) || /^\/api\/utility\/products\/\d+\/scores$/.test(c.path)));
  console.log(JSON.stringify({ result: 'PASS (HTTP fixtures only)', checks, interceptedApiCalls: calls.length, realBackendWrites: 0, artifacts }, null, 2));
} catch (error) { try { await capture('failure'); } catch {} console.log(JSON.stringify({ result: 'FAIL', error: error.stack, checks, errors, unexpected, artifacts }, null, 2)); process.exitCode = 1; }
finally {
  if (cdp) { try { await cdp.call('Browser.close'); } catch {} cdp.ws.close(); }
  if (chrome.exitCode === null) await Promise.race([new Promise(r => chrome.once('exit', r)), sleep(2000)]);
  if (chrome.exitCode === null) chrome.kill();
  const target = resolve(profile);
  if (dirname(target) === root && basename(target).startsWith('paspm-f03-browser-')) { try { rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {} }
}
