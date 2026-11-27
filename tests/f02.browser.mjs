// Fixture browser checks only; start Vite, then node tests/f02.browser.mjs.
// This is not E2E against a running Backend.
// All /api requests are intercepted before navigation. No real backend writes.
import assert from 'node:assert/strict';
import { batchView } from './f02.batch-fixtures.mjs';
import { storefrontFixture } from './storefront.fixtures.ts';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const origin = process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3102';
const base = resolve(tmpdir()), profile = mkdtempSync(join(base, 'paspm-f02-browser-'));
const artifacts = process.env.PASPM_TEST_NO_ARTIFACTS === '1' ? null : mkdtempSync(join(base, 'paspm-f02-preview-'));
const chrome = spawn(process.env.F02_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
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
const calls = [], fulfilled = [], errors = [], unexpected = [], checks = [];
const state = { role: 'STORE_ADMIN', hold: false, productConflict: '', writeError: '', readError: false, productError: false, empty: false, batchesEmpty: false, categoriesEmpty: false, pickerMany: false, unconfirmedStatus: false, heldSearches: new Set(), heldInventory: new Set(), inventoryErrors: new Set() };
const categories = [{ id: 1, name: 'Dairy', status: 'ACTIVE' }];
const products = Array.from({ length: 11 }, (_, i) => ({ id: i + 1, sku: 'SKU-' + (i + 1), name: 'Fixture product ' + (i + 1), unit: 'Bottle', requiresExpiry: i === 0, category: categories[0], sellingPrice: 12.75, costPrice: 10.25, status: 'ACTIVE', stockQuantity: 100 }));
const batches = [{ id: 9, productId: 1, batchCode: 'BATCH-9', receivedAt: '2026-11-17T02:00:00Z', expiryDate: '2099-12-15', initialQuantity: 100, remainingQuantity: 80, status: 'ACTIVE', pushDay: '2020-12-10', createdAt: '2026-11-17T02:00:00Z', updatedAt: '2026-11-17T02:00:00Z' }];
batches.push({ ...batches[0], id: 19, productId: 2, batchCode: 'NO-EXPIRY-BATCH', expiryDate: null, initialQuantity: 22, remainingQuantity: 22, pushDay: null });
const extraProducts = Array.from({ length: 110 }, (_, index) => ({ ...products[1], id: 1000 + index, sku: 'SKU-EXTRA-' + index, name: 'Warehouse product ' + index }));
const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
const storeToday = ['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-');
function dateAfter(days) { const day = new Date(storeToday+'T00:00:00Z'); day.setUTCDate(day.getUTCDate()+days); return day.toISOString().slice(0,10); }
batches[0].remainingQuantity = 10;
for (const [id,batchCode,expiryDate,remainingQuantity,status] of [[29,'SOON',dateAfter(7),40,'ACTIVE'],[30,'EXPIRED',dateAfter(-1),15,'BLOCKED'],[34,'TODAY',storeToday,0,'ACTIVE'],[35,'TOMORROW',dateAfter(1),0,'ACTIVE'],[31,'BLOCKED-SOON',dateAfter(3),25,'BLOCKED'],[32,'EMPTY-SOON',dateAfter(2),0,'ACTIVE'],[33,'LATER',dateAfter(8),10,'ACTIVE']]) batches.push({ ...batches[0], id, batchCode, expiryDate, initialQuantity: remainingQuantity || 10, remainingQuantity, status, pushDay: null });
products[2].requiresExpiry = true;
batches.push({ ...batches[0], id:39, productId:3, batchCode:'SINGLE-159', initialQuantity:159, remainingQuantity:159, expiryDate:dateAfter(5), pushDay:dateAfter(4) });
// This simulates Backend responses inside the intercepted fixture service only.
// Production UI always displays GET inventory-summary values and never calls this function.
function fixtureSummary(productId) {
  const rows = state.batchesEmpty ? [] : batches.filter(b => b.productId === productId).map(batch => batchView(batch, products, storeToday));
  const sum = predicate => rows.filter(predicate).reduce((n,b) => n + b.remainingQuantity, 0);
  return { productId, totalQuantity: sum(() => true), blockedQuantity: sum(b => b.effectiveStatus === 'BLOCKED'),
    expiredQuantity: sum(b => b.effectiveStatus === 'EXPIRED'), sellableQuantity: sum(b => b.effectiveStatus === 'ACTIVE'),
    expiringSoonQuantity: sum(b => b.effectiveStatus === 'ACTIVE' && b.daysToExpiry !== null && b.daysToExpiry >= 0 && b.daysToExpiry <= 7),
    batchesMissingPushDay: rows.filter(b => b.warnings.includes('MISSING_PUSH_DAY')).length };
}
const session = "(await (window.fixtureAuth ??= import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/services/authService.ts').name))).authService";
async function until(expression, label) { const end = Date.now() + 12000; while (Date.now() < end) { if (await page.evaluate(expression)) return; await sleep(40); } throw new Error('UI timeout: ' + label); }
async function waitFor(predicate, label) { const end = Date.now() + 12000; while (Date.now() < end) { if (predicate()) return; await sleep(30); } throw new Error('Fixture timeout: ' + label); }
const has = async text => {
  await until('document.body.innerText.toLowerCase().includes(' + JSON.stringify(text.toLowerCase()) + ')', text);
  // Refetch keeps the previous rows mounted; visible text alone no longer means a request finished.
  await until("![...document.querySelectorAll('.f02-table-frame')].some(frame=>frame.getAttribute('aria-busy')==='true')", 'F02 tables settled');
};
async function checkCodeField(label, expected) {
  const selector = 'input[aria-label=' + JSON.stringify(label) + ']';
  await until('document.querySelector(' + JSON.stringify(selector) + ')?.value===' + JSON.stringify(expected), label + ' from Backend or unassigned placeholder');
  assert.equal(await page.evaluate('(()=>{const e=document.querySelector(' + JSON.stringify(selector) + ');return e.readOnly&&!e.disabled&&!e.required&&!e.name&&getComputedStyle(e).backgroundColor!=="rgb(255, 255, 255)"&&e.closest("fieldset").querySelector("input")===e})()'), true, label + ' is a read-only field at the start of the form');
  await page.evaluate('document.querySelector(' + JSON.stringify(selector) + ').focus()');
  await page.call('Input.insertText', { text: 'USER-CANNOT-CHANGE-CODE' });
  assert.equal(await page.evaluate('document.querySelector(' + JSON.stringify(selector) + ').value'), expected, 'User typing cannot change ' + label);
  assert.equal(await page.evaluate('(()=>{const e=document.querySelector(' + JSON.stringify(selector) + ');e.select();return e.value.slice(e.selectionStart,e.selectionEnd)})()'), expected, label + ' can be selected for copying');
}
async function checkFormLabels(expected) {
  for (const [name, label] of Object.entries(expected)) {
    const selector = '[aria-label=' + JSON.stringify(name) + ']';
    await until('Boolean(document.querySelector(' + JSON.stringify(selector) + '))', 'Form field ' + name);
    const actual = await page.evaluate('(()=>{const e=document.querySelector(' + JSON.stringify(selector) + '),label=e.labels?.[0]||e.closest("label");return [...label.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join("").replace(/\\s+/g," ").trim()})()');
    assert.equal(actual, label, 'Visible label for ' + name);
  }
  assert.equal(await page.evaluate("[...document.querySelector('dialog[open] form').querySelectorAll('label')].some(e=>e.textContent.includes('(optional)'))"), false, 'No optional suffix in form labels');
}
async function click(label) {
  await until("[...([...document.querySelectorAll('dialog[open]')].at(-1)||document).querySelectorAll('button')].some(b=>b.textContent.trim()===" + JSON.stringify(label) + "&&b.getClientRects().length&&!b.disabled&&!b.closest('fieldset[disabled]'))", 'Clickable ' + label);
  await page.evaluate("[...([...document.querySelectorAll('dialog[open]')].at(-1)||document).querySelectorAll('button')].find(b=>b.textContent.trim()===" + JSON.stringify(label) + "&&b.getClientRects().length&&!b.disabled&&!b.closest('fieldset[disabled]')).click()");
}
async function input(label, value, tag = 'input') {
  const selector = tag + '[aria-label=' + JSON.stringify(label) + ']';
  await until("(()=>{const e=document.querySelector(" + JSON.stringify(selector) + ");return Boolean(e&&!e.disabled&&!e.closest('fieldset[disabled]')&&e.getClientRects().length);})()", 'Ready input ' + label);
  if (value && /^\d{4}-\d{2}-\d{2}/.test(value) && await page.evaluate('Boolean(document.querySelector('+JSON.stringify('input[aria-label='+JSON.stringify(label)+'][data-app-date-kind]')+'))')) { const [date,time] = value.split('T'); value = date.split('-').reverse().join('/') + (time ? ' '+time : ''); }
  assert.equal(await page.evaluate("(()=>{const e=document.querySelector(" + JSON.stringify(selector) + ");if(!e||e.disabled)return false;Object.getOwnPropertyDescriptor(" + (tag === 'select' ? 'HTMLSelectElement' : 'HTMLInputElement') + ".prototype,'value').set.call(e," + JSON.stringify(value) + ");e.dispatchEvent(new Event(" + JSON.stringify(tag === 'select' ? 'change' : 'input') + ",{bubbles:true}));return true;})()"), true, label);
}
async function navigate(path) { await page.evaluate('history.pushState({},"",' + JSON.stringify(path) + ');dispatchEvent(new PopStateEvent("popstate"));'); }
async function ariaClick(label) { const selector = 'button[aria-label=' + JSON.stringify(label) + ']'; await until('Boolean(document.querySelector(' + JSON.stringify(selector) + ')&&!document.querySelector(' + JSON.stringify(selector) + ').disabled)', label); await page.evaluate('document.querySelector(' + JSON.stringify(selector) + ').click()'); }
async function productColumnFilter(label, value) { await input(label === 'Category' ? 'Filter by category' : 'Filter by status', value, 'select'); await until("document.querySelector('[aria-label=\"Product table\"]')?.closest('[aria-busy]').getAttribute('aria-busy')==='false'", 'Toolbar filter'); }
async function selectProduct(id, search = 'SKU-' + id) {
  await page.evaluate("document.querySelector('input[aria-label=\"Select product\"]').click()");
  await input('Select product', search);
  await until("Boolean([...document.querySelectorAll('[role=option]')].find(e=>e.id.endsWith('-option-"+id+"')))", 'Product option ' + id);
  await page.evaluate("[...document.querySelectorAll('[role=option]')].find(e=>e.id.endsWith('-option-"+id+"')).click()");
  await until("document.querySelector('input[aria-label=\"Select product\"]').getAttribute('aria-expanded')==='false'", 'Selector closed');
}
async function selectorKey(key) { await page.evaluate("document.querySelector('input[aria-label=\"Select product\"]').dispatchEvent(new KeyboardEvent('keydown',{key:"+JSON.stringify(key)+",bubbles:true,cancelable:true}))"); }
async function batchAction(code, action) { await until("Boolean([...document.querySelectorAll('[aria-label=\"Inventory batch table\"] tbody tr:not(.f02-table-empty)')].find(r=>r.textContent.includes("+JSON.stringify(code)+"))?.querySelector('button:not(:disabled)'))",code+' actions'); await page.evaluate("(()=>{const r=[...document.querySelectorAll('[aria-label=\"Inventory batch table\"] tbody tr:not(.f02-table-empty)')].find(r=>r.querySelector('td')?.textContent==="+JSON.stringify(code)+");[...r.querySelectorAll('button')].find(b=>b.textContent.trim()==="+JSON.stringify(action)+").click()})()"); }
async function summaryValues() { return page.evaluate("Object.fromEntries([...document.querySelectorAll('[aria-label=\"Inventory summary\"] dl>div')].map(e=>[e.querySelector('dt').textContent,Number(e.querySelector('dd').textContent.replaceAll(',',''))]))"); }
async function login(role = 'STORE_ADMIN') {
  state.role = role;
  await page.evaluate('(async()=>{const auth=' + session + ';auth.endLocal();await auth.authenticate("/api/auth/login",{email:"fixture@example.invalid",password:"fixture-only"});})()');
}
async function capture(name) { if (!artifacts) return; const shot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !(await page.evaluate('Boolean(document.querySelector("dialog[open]"))')) }); writeFileSync(join(artifacts, name + '.png'), Buffer.from(shot.data, 'base64')); }
const writes = () => calls.filter(c => !['GET', 'OPTIONS'].includes(c.method) && !c.path.startsWith('/api/auth/'));
async function fixture({ requestId, request }) {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  if (!path.startsWith('/api/')) return page.call(url.origin === origin && !path.startsWith('/videos/') ? 'Fetch.continueRequest' : 'Fetch.failRequest', { requestId, ...(url.origin === origin && !path.startsWith('/videos/') ? {} : { errorReason: 'BlockedByClient' }) });
  const payload = request.postData ? JSON.parse(request.postData) : undefined;
  calls.push({ path, query: url.search, method, body: payload });
  let body, responseCode = 200, front;
  if (path === '/api/auth/login' || path === '/api/auth/refresh') body = { accessToken: 'fixture-only-access', expiresIn: 3600, tokenType: 'Bearer', csrfToken: 'fixture-only-csrf' };
  else if (path === '/api/auth/me') body = { userId: 12, name: 'F02 Fixture', email: 'fixture@example.invalid', roleCode: state.role, storeId: 1, status: 'ACTIVE', emailVerified: true };
  else if (method !== 'GET') {
    while (state.hold && !closing) await sleep(20);
    if (state.writeError) { responseCode = 400; body = { error: state.writeError }; }
    else if (method === 'DELETE' && /^\/api\/products\/\d+$/.test(path)) {
      assert.equal(payload, undefined);
      if (state.deleteResponse) ({ responseCode, body } = state.deleteResponse);
      else {
        products.splice(products.findIndex(p => p.id === Number(path.split('/').at(-1))), 1);
        responseCode = 204;
      }
    }
    else if (path === '/api/products' || /^\/api\/products\/\d+$/.test(path)) {
      // F02 contract: the form always sends imageUrl and description (PUT replaces the whole product; null clears).
      assert.deepEqual(Object.keys(payload).filter(k=>k!=='confirmSimilarName').sort(), ['name', 'categoryId', 'unit', 'requiresExpiry', 'sellingPrice', 'costPrice', 'status', 'imageUrl', 'description'].sort());
      assert.equal(payload.imageUrl, null); assert.equal(payload.description, null);
      if (state.productConflict === 'sku' || state.productConflict === 'other' || (state.productConflict === 'name' && !payload.confirmSimilarName)) {
        responseCode = 409;
        body = state.productConflict === 'name' ? { error: 'A similar product name exists', code: 'PRODUCT_NAME_CONFIRMATION_REQUIRED', confirmWith: 'confirmSimilarName=true' } : { error: state.productConflict === 'sku' ? 'SKU already exists in this Store' : 'Controlled unrelated conflict' };
      } else {
      assert.equal(Object.hasOwn(payload, 'sku'), false);
      const id = method === 'POST' ? products.length + 1 : Number(path.split('/').at(-1));
      body = { ...products[0], ...payload, id, sku: method === 'POST' ? (state.nextSku || 'SKU-' + String(id).padStart(11, '0')) : products.find(p => p.id === id).sku, category: categories.find(c => c.id === payload.categoryId) || null }; delete body.categoryId;
      if (method === 'POST') { products.unshift(body); state.nextSku = undefined; } else products[products.findIndex(p => p.id === id)] = body;
      }
    } else if (/^\/api\/products\/\d+\/status$/.test(path)) { const row = products.find(p => p.id === Number(path.split('/').at(-2))); Object.assign(row, payload); body = row; }
    else if (path === '/api/categories' || /^\/api\/categories\/\d+(\/status)?$/.test(path)) {
      if (method === 'POST') { body = { ...payload, id: 2 }; categories.push(body); }
      else { body = categories.find(c => c.id === Number(path.split('/')[3])); Object.assign(body, payload); }
    } else if (/^\/api\/products\/\d+\/batches$/.test(path)) {
      assert.equal(method, 'POST'); assert.deepEqual(Object.keys(payload).sort(), ['receivedAt','expiryDate','initialQuantity','pushDay'].sort());
      body = { ...batches[0], ...payload, batchCode: state.nextBatchCode || 'BATCH-20261118-' + String(batches.length + 1).padStart(3, '0'), id: Math.max(...batches.map(b => b.id)) + 1, productId: Number(path.split('/')[3]), remainingQuantity: payload.initialQuantity, status: 'ACTIVE' }; batches.push(body); state.nextBatchCode = undefined;
    } else if (/^\/api\/inventory-batches\/\d+(\/(push-day|expiry-date))?$/.test(path)) {
      body = batches.find(b => b.id === Number(path.split('/')[3]));
      if (method === 'DELETE') { assert.equal(payload, undefined); if(path.endsWith('/expiry-date')) { assert.equal(products.find(p=>p.id===body.productId).requiresExpiry,false); body.expiryDate = null; } else { assert.ok(path.endsWith('/push-day')); body.pushDay = null; } }
      else { assert.equal(method, 'PATCH'); assert.ok(Object.keys(payload).every(key => ['remainingQuantity', 'status', 'pushDay', 'expiryDate'].includes(key))); if(!state.unconfirmedStatus) Object.assign(body, Object.fromEntries(Object.entries(payload).filter(([,v])=>v!==null))); }
    } else { unexpected.push(method + ' ' + path); responseCode = 500; body = { error: 'Unexpected fixture write' }; }
  } else if (state.readError && /batches|inventory-summary/.test(path)) { responseCode = 503; body = { error: 'Controlled read unavailable' }; }
  else if (path === '/api/products' && state.productError) { responseCode = 503; body = { error: 'Controlled product lookup failed' }; }
  else if (path === '/api/products') {
    const search = (url.searchParams.get('search') || '').toLowerCase(), index = Number(url.searchParams.get('page') || 0), size = Number(url.searchParams.get('pageSize') || 20);
    const source = state.pickerMany && size === 20 ? [...products, ...extraProducts] : products;
    const rows = state.empty ? [] : source.filter(p => (p.sku + ' ' + p.name).toLowerCase().includes(search) && (!url.searchParams.get('status') || p.status === url.searchParams.get('status')) && (!url.searchParams.get('categoryId') || String(p.category?.id) === url.searchParams.get('categoryId')));
    const field = url.searchParams.get('sortBy') || 'name', direction = url.searchParams.get('sortDirection') === 'desc' ? -1 : 1;
    rows.sort((a,b)=> { const left=field==='category'?a.category?.name||'':a[field], right=field==='category'?b.category?.name||'':b[field]; return (typeof left==='string'?left.localeCompare(right):Number(left)-Number(right))*direction || a.id-b.id; });
    body = { content: rows.slice(index * size, (index + 1) * size), page: index, pageSize: size, totalElements: rows.length, totalPages: Math.ceil(rows.length / size) };
  } else if (/^\/api\/products\/\d+$/.test(path)) body = products.find(p => p.id === Number(path.split('/').at(-1)));
  else if (path === '/api/categories') body = state.categoriesEmpty ? [] : categories;
  else if (/^\/api\/categories\/\d+$/.test(path)) body = categories.find(c => c.id === Number(path.split('/').at(-1)));
  else if (/^\/api\/products\/\d+\/batches$/.test(path)) body = state.batchesEmpty ? [] : batches.filter(b => b.productId === Number(path.split('/')[3]));
  else if (/^\/api\/products\/\d+\/inventory-summary$/.test(path)) body = fixtureSummary(Number(path.split('/')[3]));
  else if (/^\/api\/inventory-batches\/\d+$/.test(path)) body = batches.find(b => b.id === Number(path.split('/').at(-1)));
  else if (path === '/api/system/stores') body = [];
  else if (path === '/api/system/mining/config') body = { version: 0, algorithm: null, minUtilMode: null, minUtilValue: null, changedBy: null, changedAt: null };
  else if (path === '/api/utility/config') body = { config: { version: 1 }, lambdaPolicy: { version: 1 }, lambdaValid: true };
  else if (path === '/api/transactions/imports' || path === '/api/transactions') body = { content: [], page: 0, pageSize: 20, totalElements: 0 };
  else if (front = storefrontFixture(path, method)) { responseCode = front.status; body = front.body; }
  else { unexpected.push(method + ' ' + path); responseCode = 500; body = { error: 'Unexpected fixture endpoint' }; }
  const responseHeaders = [{ name: 'Content-Type', value: 'application/json' }];
  if (path === '/api/auth/login' || path === '/api/auth/refresh') responseHeaders.push({ name: 'Set-Cookie', value: 'PASPM-CSRF=fixture-only-csrf; Path=/; SameSite=Lax' });
  const search = url.searchParams.get('search') || '', inventoryId = /^\/api\/products\/\d+\/(batches|inventory-summary)$/.test(path) && method === 'GET' ? Number(path.split('/')[3]) : null;
  const inventoryError = inventoryId !== null && state.inventoryErrors.has(inventoryId);
  while (!closing && ((path === '/api/products' && state.heldSearches.has(search)) || (inventoryId !== null && state.heldInventory.has(inventoryId)))) await sleep(20);
  if (inventoryError) { responseCode = 503; body = { error: 'Stale inventory request failed' }; }
  if (responseCode < 300 && Array.isArray(body) && /^\/api\/products\/\d+\/batches$/.test(path)) {
    body = body.map(batch => batchView(batch, products, storeToday));
  } else if (responseCode < 300 && body?.batchCode) {
    body = batchView(body, products, storeToday);
  }
  await page.call('Fetch.fulfillRequest', { requestId, responseCode, responseHeaders, body: responseCode === 204 ? '' : Buffer.from(JSON.stringify(body)).toString('base64') });
  fulfilled.push({ path, query: url.search, method });
}
try {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 150 && !existsSync(portFile); i++) await sleep(100);
  assert.ok(existsSync(portFile), 'Chrome started');
  const port = readFileSync(portFile, 'utf8').split('\n')[0];
  const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((done, reject) => { ws.addEventListener('open', done, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  page = new CDP(ws);
  page.on('Fetch.requestPaused', data => fixture(data).catch(error => { if (!closing && !/Invalid InterceptionId/.test(error.message)) errors.push(error.message); }));
  page.on('Runtime.exceptionThrown', data => errors.push(data.exceptionDetails.exception?.description || data.exceptionDetails.text));
  await page.call('Page.enable'); await page.call('Runtime.enable'); await page.call('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await page.call('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Ho_Chi_Minh' });
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.navigate', { url: origin + '/login' }); await has('Sign in to the system'); await login(); await navigate('/store/inventory'); await has('Product Management'); await has('Fixture product 1');
  await has('TOTAL PRODUCTS'); assert.equal(await page.evaluate("document.querySelector('main').innerText.includes('Push days')"), false);
  await click('Next'); await until("document.querySelector('.f02-pagination [aria-current=page]')?.textContent.trim()==='2'", 'Page 2 selected'); await click('Previous'); await until("document.querySelector('.f02-pagination [aria-current=page]')?.textContent.trim()==='1'", 'Page 1 selected');
  await input('Search name or SKU', 'does-not-exist'); await has('No matching products.'); await input('Search name or SKU', ''); await has('Fixture product 1');
  state.nextSku = 'FM26-0290'; await click('Add product'); await checkFormLabels({SKU:'SKU','Product name':'Product name *',Unit:'Unit *',Category:'Category','Product status':'Status *','Cost price':'Cost price *','Selling price':'Selling price *','Requires expiry tracking':'Expiry tracking'}); const beforeRequiredProduct=writes().length; await click('Save product'); await sleep(80); assert.equal(writes().length,beforeRequiredProduct,'Missing required Product name does not send POST'); await checkCodeField('SKU', 'Generated after saving'); await has('SKU is generated automatically when the product is saved.'); assert.equal(await page.evaluate("document.querySelector('input[aria-label=SKU]').readOnly"), true); await input('Product name', 'New fixture product'); await input('Selling price', '12.75'); await input('Cost price', '15.25'); await input('Category', '1', 'select');
  await has('Choose a previous unit or enter a new one.'); await ariaClick('Show unit suggestions');
  assert.deepEqual(await page.evaluate("[...document.querySelectorAll('[aria-label=\"Previous units\"] [role=option]')].map(o=>o.textContent)"), ['Bottle']);
  await input('Unit', 'vỉ');
  await has('The selling price is below the cost price.'); state.hold = true; const beforeCreate = writes().length;
  await page.evaluate("(()=>{const f=document.querySelector('dialog form');f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));})()");
  await until("document.querySelector('dialog fieldset')?.disabled", 'Product saving'); await sleep(150); assert.equal(writes().length, beforeCreate + 1); state.hold = false;
  await has('Product created successfully. SKU: FM26-0290'); assert.equal(writes().at(-1).body.sellingPrice, 12.75); assert.equal(Object.hasOwn(writes().at(-1).body, 'sku'), false); await has(products.find(p=>p.name==='New fixture product').sku); assert.equal(writes().at(-1).body.unit, 'vỉ');
  await input('Search name or SKU', 'New fixture product'); await has('New fixture product'); assert.equal(await page.evaluate("document.querySelector('.f02-product-table tbody').textContent.includes('FM26-0290')"),true); await click('Edit'); await checkCodeField('SKU','FM26-0290'); await checkFormLabels({SKU:'SKU','Product name':'Product name *',Unit:'Unit *',Category:'Category','Product status':'Status *','Cost price':'Cost price *','Selling price':'Selling price *','Requires expiry tracking':'Expiry tracking'}); await input('Product name', 'Edited fixture product'); state.writeError = 'Cannot require expiry while a batch has no expiry date'; await click('Save product');
  assert.equal(await page.evaluate("document.querySelector('input[aria-label=Unit]').value"), 'vỉ');
  await has('Cannot enable expiry tracking because some existing batches have no expiry date.'); assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Product name\"]').value"), 'Edited fixture product'); state.writeError = ''; await click('Save product'); await has('Product updated successfully.');
  await input('Search name or SKU', ''); await has('Fixture product 1');
  checks.push('Product V26 create/edit, decimals below cost, inline Backend rejection keeps input, duplicate submit sends once, filters and pagination');
  await click('Add product'); await input('Product name', 'Confirm fixture product'); await input('Category', '1', 'select');
  state.productConflict = 'name'; const nameWrites = writes().length, productCount = products.length;
  await click('Save product'); await has('Similar product name'); await capture('product-name-confirmation');
  assert.equal(products.length, productCount, 'Rejected first request did not save');
  assert.equal(writes().length, nameWrites + 1); assert.equal(writes().at(-1).body.confirmSimilarName, undefined);
  await click('Cancel'); assert.equal(writes().length, nameWrites + 1);
  assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Product name\"]').value"), 'Confirm fixture product');
  await click('Save product'); await has('Similar product name'); const originalNameRequest = structuredClone(writes().at(-1));
  state.hold = true; await click('Continue Anyway');
  await page.evaluate("[...document.querySelectorAll('dialog[open]')].at(-1).querySelector('button:last-child').click()");
  await sleep(150); assert.equal(writes().length, nameWrites + 3, 'Confirm cannot double submit'); state.hold = false;
  await has('Product created successfully.');
  assert.deepEqual(writes().at(-1), { ...originalNameRequest, body: { ...originalNameRequest.body, confirmSimilarName: true } });
  assert.equal(products.length, productCount + 1);
  await has('ID ' + products.find(p=>p.name==='Confirm fixture product').id);
  await input('Search name or SKU', 'Confirm fixture product'); await has('Confirm fixture product'); await click('Edit');
  await input('Product name', 'Confirmed edit fixture'); await click('Save product'); await has('Similar product name');
  const originalPut = structuredClone(writes().at(-1)); assert.equal(originalPut.method, 'PUT');
  await click('Continue Anyway'); await has('Product updated successfully.');
  assert.deepEqual(writes().at(-1), { ...originalPut, body: { ...originalPut.body, confirmSimilarName: true } });
  await input('Search name or SKU', ''); await has('Edited fixture product');
  state.productConflict = 'sku'; await click('Add product'); await input('Product name', 'Duplicate SKU fixture');
  const conflictWrites = writes().length; await click('Save product'); await has('SKU already exists in this Store');
  assert.equal(writes().length, conflictWrites + 1); assert.equal(await page.evaluate("Boolean(document.querySelector('dialog[aria-label=\"Similar product name\"]'))"), false);
  state.productConflict = 'other'; await click('Save product'); await has('Controlled unrelated conflict');
  assert.equal(writes().length, conflictWrites + 2); await click('Cancel'); state.productConflict = '';
  const legacyProduct = products.find(p=>p.id===11), savedLegacySku = legacyProduct.sku; legacyProduct.sku = 'FM26-0001';
  await input('Search name or SKU', 'FM26-0001'); await has('FM26-0001'); await click('Edit'); await checkCodeField('SKU', 'FM26-0001');
  assert.equal(await page.evaluate("document.querySelector('input[aria-label=SKU]').readOnly"), true);
  await input('Product name', 'Legacy name edit'); const legacyWrites = writes().length;
  await click('Save product'); await has('Product updated successfully.');
  assert.equal(writes().length, legacyWrites + 1); assert.equal(Object.hasOwn(writes().at(-1).body, 'sku'), false);
  assert.equal(products.find(p=>p.id===11).sku, 'FM26-0001');
  products.find(p=>p.id===11).sku = savedLegacySku;
  await input('Search name or SKU', 'Fixture'); await productColumnFilter('Category', '1'); await productColumnFilter('Status', 'ACTIVE');
  for (const [label, field] of [['SKU','sku'], ['Product name','name'], ['Category','category'],  ['Cost price','costPrice'], ['Selling price','sellingPrice'], ['Expiry tracking','requiresExpiry'], ['Total stock','stockQuantity'], ['Status','status']]) {
    const beforeSort = calls.length; await ariaClick('Sort by ' + label);
    await waitFor(()=>calls.slice(beforeSort).some(c=>c.path==='/api/products'&&new URLSearchParams(c.query).get('sortBy')===field), 'Server sort ' + field);
    await until("document.querySelector('[aria-label=\"Product table\"]')?.closest('[aria-busy]').getAttribute('aria-busy')==='false'", 'Sort settled');
  }
  await click('Next'); await until("document.querySelector('.f02-pagination [aria-current=page]')?.textContent.trim()==='2'", 'Page 2 selected');
  const beforeDesc = calls.length; await ariaClick('Sort by Status');
  await waitFor(()=>calls.slice(beforeDesc).some(c=>{const q=new URLSearchParams(c.query);return c.path==='/api/products'&&q.get('sortBy')==='status'&&q.get('sortDirection')==='desc'&&q.get('page')==='0'&&q.get('search')==='Fixture'&&q.get('categoryId')==='1'&&q.get('status')==='ACTIVE'}), 'Sort resets page, keeps filters');
  await until("document.querySelector('.f02-pagination [aria-current=page]')?.textContent.trim()==='1'", 'Page 1 selected'); await until("Boolean(document.querySelector('th[aria-sort=descending]'))", 'Descending indicator');
  await click('Next'); await until("document.querySelector('.f02-pagination [aria-current=page]')?.textContent.trim()==='2'", 'Page 2 selected');
  assert.equal(new URLSearchParams(calls.filter(c=>c.path==='/api/products').at(-1).query).get('sortDirection'), 'desc');
  await productColumnFilter('Category', ''); await productColumnFilter('Status', ''); await input('Search name or SKU', ''); await ariaClick('Sort by Product name'); await has('Edited fixture product');
  await click('Add product'); await capture('product-create-form'); await click('Cancel');
  checks.push('Backend-generated read-only SKU, legacy SKU edit succeeds unchanged, duplicate/other 409 no retry, name POST/PUT Cancel/Continue keeps exact payload, authoritative IDs, all nine server sorts with pagination/filter state');
  await navigate('/store/categories'); await has('Dairy'); await click('Add category'); await checkFormLabels({'Category name':'Category name *','Category status':'Status *'}); assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Category name\"]').required&&document.querySelector('input[aria-label=\"Category name\"]').maxLength===150&&document.querySelector('select[aria-label=\"Category status\"]').value==='ACTIVE'"),true,'Category required/maxLength/default unchanged'); await input('Category name', '   '); const beforeCategory = writes().length; await click('Save category'); await has('Category name is required'); assert.equal(writes().length, beforeCategory);
  await input('Category name', ' Chilled '); await click('Save category'); await has('Category created successfully.'); await has('Chilled'); await click('Edit'); await checkFormLabels({'Category name':'Category name *','Category status':'Status *'}); await input('Category name', 'Dairy edited'); await click('Save category'); await has('Category updated successfully.');
  await page.evaluate("document.querySelector('button[aria-label=\"Change status for Dairy edited\"]').click()"); await has('Category status updated successfully.');
  state.categoriesEmpty = true; await page.evaluate("document.querySelector('button[aria-label=\"Refresh categories\"]').click()"); await has('No categories yet.'); state.categoriesEmpty = false;
  checks.push('Category create/edit/status, trim/nonblank validation and empty state');
  state.pickerMany = true;
  await navigate('/store/batches'); await has('Inventory Batches');
  assert.equal(await page.evaluate("Boolean(document.querySelector('select[aria-label=Product],nav[aria-label=\"Product search pagination\"]'))"), false);
  assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Select product\"]').placeholder"), 'Search by product name or SKU');
  await page.evaluate("document.querySelector('input[aria-label=\"Select product\"]').click()"); await until("document.querySelectorAll('[role=option]').length===20", 'First server page only'); await capture('selector-desktop');
  assert.equal(await page.evaluate("Boolean(document.querySelector('[aria-label=\"Currently viewing\"]'))"), false, 'Loading results does not auto-select');
  for(let number=1;number<=6;number++) { const before = fulfilled.length; await click('Load more products'); await waitFor(()=>fulfilled.slice(before).some(c=>c.path==='/api/products'&&c.query.includes('page='+number)), 'Load more page '+number); }
  await until("Boolean([...document.querySelectorAll('[role=option]')].find(e=>e.id.endsWith('-option-1109')))", 'Product beyond first 100');
  assert.equal(await page.evaluate("Boolean(document.querySelector('[aria-label=\"Currently viewing\"]'))"), false, 'Load more never changes selection');
  await page.evaluate("[...document.querySelectorAll('[role=option]')].find(e=>e.id.endsWith('-option-1')).click()"); await has('BATCH-9');
  assert.deepEqual(await summaryValues(), {'Total stock':100,Sellable:60,Expired:15,Blocked:25,'Expiring in 7 days':40});
  await has('40 units expiring within 7 days');
  const info = await page.evaluate("document.querySelector('[aria-label=\"Currently viewing\"]').textContent"); assert.ok(info.includes('Fixture product 1')&&info.includes('SKU: SKU-1')&&info.includes('Expiry tracking enabled'));
  const badges = await page.evaluate("Object.fromEntries([...document.querySelectorAll('[aria-label=\"Inventory batch table\"] tbody tr:not(.f02-table-empty)')].map(r=>[r.querySelector('td').textContent,r.children[2].textContent]))");
  assert.ok(badges.SOON.includes('Expiring soon')); assert.ok(badges.EXPIRED.includes('Expired')&&!badges.EXPIRED.includes('Expiring soon'));
  for(const code of ['BATCH-9','LATER']) assert.equal(badges[code].includes('Expiring soon'),false,code);
  for (const code of ['TODAY', 'TOMORROW', 'BLOCKED-SOON', 'EMPTY-SOON']) assert.match(badges[code], /Expiring soon/);
  await input('Filter batch status', 'EXPIRED', 'select'); await has('EXPIRED');
  const statuses = await page.evaluate("Array.from(document.querySelectorAll('.f02-batch-table tbody tr:not(.f02-table-empty)')).map(row => row.children[5].textContent)");
  assert.deepEqual(statuses, ['Expired']);
  await input('Filter batch status', '', 'select');
  const pushBadges = await page.evaluate("Object.fromEntries([...document.querySelectorAll('[aria-label=\"Inventory batch table\"] tbody tr:not(.f02-table-empty)')].map(r=>[r.children[0].textContent,r.children[3].textContent]))");
  for (const code of ['SOON', 'BLOCKED-SOON', 'EMPTY-SOON', 'LATER']) assert.match(pushBadges[code], /Push Day not set/);
  for (const code of ['BATCH-9', 'EXPIRED']) assert.doesNotMatch(pushBadges[code], /Push Day not set/);
  await batchAction('EMPTY-SOON', 'Edit');
  await has('Push Day not set. You can still save.');
  await click('Cancel');
  const inventoryReadsBeforeSearch=calls.filter(c=>/\/(batches|inventory-summary)$/.test(c.path)).length;
  await page.evaluate("document.querySelector('input[aria-label=\"Select product\"]').click()"); await input('Select product','does-not-exist'); await has('No matching products'); await has('BATCH-9');
  assert.equal(await page.evaluate("document.querySelector('[aria-label=\"Currently viewing\"] h2').textContent"),'Fixture product 1');
  const beforeDebounce=calls.length; await input('Select product','SKU-EXTRA'); await input('Select product','SKU-EXTRA-10'); await input('Select product','SKU-EXTRA-109');
  await until("Boolean([...document.querySelectorAll('[role=option]')].find(e=>e.id.endsWith('-option-1109')))",'Debounced result'); assert.equal(calls.slice(beforeDebounce).filter(c=>c.path==='/api/products').length,1);
  const staleSearch='SKU-EXTRA-10'; state.heldSearches.add(staleSearch); const beforeStale=calls.length, beforeOldResponse=fulfilled.length;
  await input('Select product',staleSearch); await waitFor(()=>calls.slice(beforeStale).some(c=>new URLSearchParams(c.query).get('search')===staleSearch),'Old search held');
  await input('Select product','SKU-11'); await until("Boolean([...document.querySelectorAll('[role=option]')].find(e=>e.id.endsWith('-option-11')))",'New search first');
  state.heldSearches.delete(staleSearch); await waitFor(()=>fulfilled.slice(beforeOldResponse).some(c=>new URLSearchParams(c.query).get('search')===staleSearch),'Old search settled'); await sleep(80);
  assert.equal(await page.evaluate("document.querySelector('[role=listbox]').textContent.includes('SKU-EXTRA')"),false);
  await input('Select product',''); await until("document.querySelectorAll('[role=option]').length===20",'First page before append retry'); state.productError=true; await click('Load more products'); await has('Controlled product lookup failed');
  assert.equal(await page.evaluate("document.querySelectorAll('[role=option]').length"),20,'Load more error keeps earlier results'); assert.equal((await summaryValues())['Total stock'],100); state.productError=false; await click('Retry products'); await until("document.querySelectorAll('[role=option]').length===40",'Retry appends next page');
  const beforeAppend=fulfilled.length; state.heldSearches.add(''); await click('Load more products'); await waitFor(()=>calls.some(c=>c.path==='/api/products'&&new URLSearchParams(c.query).get('search')===null&&new URLSearchParams(c.query).get('page')==='2'),'Append held');
  await input('Select product','SKU-11'); await until("document.querySelectorAll('[role=option]').length===1",'New query during append'); state.heldSearches.delete(''); await waitFor(()=>fulfilled.slice(beforeAppend).some(c=>c.path==='/api/products'&&new URLSearchParams(c.query).get('page')==='2'),'Old append settled'); await sleep(80); assert.equal(await page.evaluate("document.querySelectorAll('[role=option]').length"),1,'Stale appended page ignored');
  assert.equal(calls.filter(c=>/\/(batches|inventory-summary)$/.test(c.path)).length,inventoryReadsBeforeSearch,'Search/load more preserves Batch and Summary');
  await selectorKey('Escape'); assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Select product\"]').value"),'SKU-1');
  await page.evaluate("document.querySelector('input[aria-label=\"Select product\"]').click()"); await input('Select product','SKU-2'); await until("document.querySelectorAll('[role=option]').length===1",'Keyboard result');
  await selectorKey('ArrowDown'); assert.ok(await page.evaluate("document.querySelector('input[role=combobox]').getAttribute('aria-activedescendant')")); await selectorKey('Enter'); await has('NO-EXPIRY-BATCH'); await has('No expiry tracking');
  assert.equal((await summaryValues())['Total stock'],22); assert.equal(await page.evaluate("Boolean(document.querySelector('[aria-label=\"Expiring stock\"]'))"),false);
  assert.equal(await page.evaluate("document.querySelector('[aria-label=\"Inventory batch table\"]').textContent.includes('Push Day not set')"),false);
  await batchAction('NO-EXPIRY-BATCH', 'Edit');
  await checkCodeField('Batch code', 'NO-EXPIRY-BATCH'); await checkFormLabels({'Batch code':'Batch code','Remaining quantity':'Remaining quantity *','Expiry date':'Expiry date','Push Day':'Push Day'});
  assert.equal(await page.evaluate("Boolean(document.querySelector('input[aria-label=\"Received at\"],input[aria-label=\"Initial quantity\"]'))"),false);
  await has('Batch ID (read-only)'); await input('Expiry date', '2099-12-20'); await capture('batch-expiry-edit');
  await click('Save batch'); await has('Batch updated successfully.'); assert.deepEqual(writes().at(-1).body,{expiryDate:'2099-12-20'});
  await batchAction('NO-EXPIRY-BATCH', 'Edit'); await click('Clear Expiry Date'); const beforeClearExpiry = writes().length;
  await click('Cancel'); assert.equal(writes().length,beforeClearExpiry); await click('Clear Expiry Date');
  await capture('batch-clear-expiry-confirmation'); const beforeExpiryRefresh = calls.length;
  await click('Confirm clear expiry date'); await has('Expiry date cleared successfully.');
  assert.deepEqual(writes().at(-1), {path:'/api/inventory-batches/19/expiry-date',query:'',method:'DELETE',body:undefined});
  assert.equal(batches.find(b=>b.id===19).expiryDate,null);
  assert.ok(calls.slice(beforeExpiryRefresh).some(c=>c.path==='/api/products/2/batches'&&c.method==='GET'));
  assert.ok(calls.slice(beforeExpiryRefresh).some(c=>c.path==='/api/products/2/inventory-summary'&&c.method==='GET'));
  assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Expiry date\"]').value"),''); await click('Cancel');
  checks.push('Optional expiry PATCH uses YYYY-MM-DD; Clear Expiry confirmation Cancel/Confirm calls DELETE only, consumes response and refreshes list/Summary; receipt fields and Batch ID/code read-only');
  await click('Add batch'); assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Expiry date\"]').required"),false); await checkFormLabels({'Batch code':'Batch code','Received at':'Received at *','Initial quantity':'Initial quantity *','Expiry date':'Expiry date','Push Day':'Push Day'}); const beforeRequiredBatch=writes().length; await click('Save batch'); await sleep(80); assert.equal(writes().length,beforeRequiredBatch,'Missing required Initial quantity does not send POST');
  await input('Initial quantity','5'); assert.equal(await page.evaluate("document.querySelector('dialog').textContent.includes('excluded from expiry-risk')"),false);
  assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Push Day\"]').disabled"),false); await click('Save batch'); await has('Inventory batch added successfully.'); assert.equal(writes().at(-1).body.expiryDate,null);
  await selectProduct(1); await has('BATCH-9');
  await batchAction('BATCH-9','Edit'); await has('Edit inventory batch'); await checkFormLabels({'Batch code':'Batch code','Remaining quantity':'Remaining quantity *','Expiry date':'Expiry date *','Push Day':'Push Day'}); await until("Boolean(document.querySelector('input[aria-label=\"Expiry date\"]'))", 'Expiry editor ready');
  assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Expiry date\"]').required"),true);
  assert.equal(await page.evaluate("[...document.querySelectorAll('dialog button')].some(b=>b.textContent==='Clear Expiry Date')"),false);
  await input('Expiry date','2019-12-09'); await has('Push Day must be on or before the expiry date.');
  const beforeInvalidExpiry = writes().length;
  await page.evaluate("document.querySelector('dialog form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");
  await has('Push Day must be on or before the expiry date.'); assert.equal(writes().length,beforeInvalidExpiry);
  await input('Expiry date','2099-12-14'); await click('Save batch'); await has('Batch updated successfully.'); assert.deepEqual(writes().at(-1).body,{expiryDate:'2099-12-14'});
  await batchAction('BATCH-9','Edit'); await input('Expiry date','2099-12-15'); await click('Save batch'); await has('Batch updated successfully.');
  checks.push('Required expiry editable with AppDatePicker, no Clear Expiry action; earlier expiry validates saved Push Day before PATCH');
  for(const lateFailure of [false,true]) {
    state.heldInventory.add(2); if(lateFailure) state.inventoryErrors.add(2); const before=calls.length,beforeFulfilled=fulfilled.length;
    await selectProduct(2); await waitFor(()=>calls.slice(before).filter(c=>/^\/api\/products\/2\/(batches|inventory-summary)$/.test(c.path)).length===2,'Old inventory held');
    await selectProduct(1); await has('BATCH-9'); state.heldInventory.delete(2); await waitFor(()=>fulfilled.slice(beforeFulfilled).filter(c=>/^\/api\/products\/2\/(batches|inventory-summary)$/.test(c.path)).length===2,'Old inventory settled'); await sleep(80);
    assert.equal((await summaryValues())['Total stock'],100); await has('BATCH-9'); assert.equal(await page.evaluate("document.body.innerText.includes('Stale inventory request failed')"),false); state.inventoryErrors.delete(2);
  }
  await page.evaluate("document.querySelector('input[aria-label=\"Select product\"]').click()"); await until("Boolean(document.querySelector('[role=listbox]'))",'Open before outside click');
  await page.evaluate("document.querySelector('h1').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))"); assert.equal(await page.evaluate("document.querySelector('input[role=combobox]').getAttribute('aria-expanded')"),'false');
  checks.push('Single accessible server selector, 122 products/Load more beyond 100, 300ms debounce, no visible pagination or automatic selection, mouse/keyboard/Escape/outside, stale search/inventory ignored; Currently viewing and expiry flags');
  await selectProduct(3); await has('SINGLE-159'); assert.deepEqual(await summaryValues(),{'Total stock':159,Sellable:159,Expired:0,Blocked:0,'Expiring in 7 days':159});
  state.writeError='Controlled status failure'; const beforeFailedStatus=calls.length; await batchAction('SINGLE-159','Block'); await has('Controlled status failure');
  assert.equal(await page.evaluate("document.querySelector('[data-f02-toast]').getAttribute('role')"),'alert'); await sleep(4200); await has('Controlled status failure');
  assert.equal(calls.slice(beforeFailedStatus).filter(c=>c.method==='GET').length,0); assert.equal((await summaryValues()).Sellable,159); await ariaClick('Dismiss batch notification'); state.writeError='';
  state.unconfirmedStatus=true; await batchAction('SINGLE-159','Block'); await has('The server did not confirm the status change.'); assert.equal(await page.evaluate("Boolean(document.querySelector('[data-f02-toast][role=status]'))"),false); state.unconfirmedStatus=false; await ariaClick('Dismiss batch notification');
  const summaryTop=await page.evaluate("document.querySelector('[aria-label=\"Inventory summary\"]').getBoundingClientRect().top"); const beforeBlock=calls.length; state.hold=true; await batchAction('SINGLE-159','Block'); await waitFor(()=>calls.slice(beforeBlock).some(c=>c.method==='PATCH'),'Status write pending');
  assert.equal(await page.evaluate("Boolean(document.querySelector('[data-f02-toast][role=status]'))"),false,'No success before confirmation'); state.hold=false; await has('Batch blocked successfully.');
  assert.deepEqual(await summaryValues(),{'Total stock':159,Sellable:0,Expired:0,Blocked:159,'Expiring in 7 days':0});
  assert.equal(await page.evaluate("[...document.querySelectorAll('[aria-label=\"Inventory batch table\"] tbody tr:not(.f02-table-empty)')].find(r=>r.textContent.includes('SINGLE-159')).textContent.includes('Unblock')"),true);
  assert.equal(await page.evaluate("Boolean(document.querySelector('[aria-label=\"Expiring stock\"]'))"),false);
  assert.ok(calls.slice(beforeBlock).some(c=>c.path==='/api/products/3/inventory-summary'&&c.method==='GET'));
  assert.ok(Math.abs(await page.evaluate("document.querySelector('[aria-label=\"Inventory summary\"]').getBoundingClientRect().top")-summaryTop)<1,'Toast does not shift content');
  assert.equal(await page.evaluate("(()=>{const t=document.querySelector('[data-f02-toast]').getBoundingClientRect(),a=document.querySelector('[data-batch-actions]').getBoundingClientRect(),table=document.querySelector('[aria-label=\"Inventory batch table\"]').getBoundingClientRect();return t.top>=a.bottom&&t.bottom<table.top&&t.right<=innerWidth&&t.left>=0})()"),true,'Toast avoids controls and table');
  await capture('blocked-toast-desktop'); await sleep(4200); assert.equal(await page.evaluate("Boolean(document.querySelector('[data-f02-toast]'))"),false,'Success auto-dismisses');
  await batchAction('SINGLE-159','Unblock'); await has('Batch unblocked successfully.'); assert.deepEqual(await summaryValues(),{'Total stock':159,Sellable:159,Expired:0,Blocked:0,'Expiring in 7 days':159}); await has('159 units expiring within 7 days');
  checks.push('Block/Unblock authoritative response and refreshed Summary 159/0, no success on failure/unconfirmed response, specific accessible toast, persistent errors, auto-dismiss success, no layout shift');
  await selectProduct(1); await has('BATCH-9');
  await click('Edit'); const beforePatch = writes().length; await input('Push Day', '2099-12-16'); await page.evaluate("document.querySelector('input[aria-label=\"Push Day\"]').dispatchEvent(new Event('blur',{bubbles:true}))"); await click('Save batch'); await has('Choose a date on or before 15/12/2099.'); assert.equal(writes().length, beforePatch);
  await input('Push Day', '2099-12-15'); await capture('batch-push-day-edit-desktop'); const beforeRefresh = calls.length; await click('Save batch'); await has('Batch updated successfully.'); assert.deepEqual(writes().at(-1).body, { pushDay: '2099-12-15' });
  await until("!document.body.innerText.includes('Loading batches')", 'Batch refresh'); assert.ok(calls.slice(beforeRefresh).some(c => c.path.endsWith('/batches') && c.method === 'GET')); assert.ok(calls.slice(beforeRefresh).some(c => c.path.endsWith('/inventory-summary')));
  await click('Edit'); await checkCodeField('Batch code','BATCH-9'); const beforeBlank = writes().length; await input('Push Day', ''); await click('Save batch'); await has('Use Clear Push Day to remove the saved date.'); assert.equal(writes().length, beforeBlank);
  await click('Clear Push Day'); await has('Push Day cleared successfully.'); assert.equal(writes().at(-1).method, 'DELETE'); assert.equal(writes().at(-1).path, '/api/inventory-batches/9/push-day'); assert.equal(writes().at(-1).body, undefined);
  await click('Cancel'); await has('Push Day not set'); await has('Not set');
  await click('Edit'); await input('Remaining quantity', '40'); await click('Save batch'); await has('Batch updated successfully.'); assert.deepEqual(writes().at(-1).body, { remainingQuantity: 40 });
  await batchAction('BATCH-9','Block'); await has('Batch blocked successfully.'); assert.deepEqual(writes().at(-1).body, { status: 'BLOCKED' }); await batchAction('BATCH-9','Unblock'); await has('Batch unblocked successfully.');
  checks.push('Batch Push Day validation/equality, minimal PATCH, explicit DELETE, immutable fields, summary refresh, quantity, block/unblock');
  state.nextBatchCode = 'BATCH-20261118-947'; await click('Add batch'); await checkCodeField('Batch code', 'Generated after saving'); await has('Batch code is generated automatically when the batch is saved.'); await checkFormLabels({'Batch code':'Batch code','Received at':'Received at *','Initial quantity':'Initial quantity *','Expiry date':'Expiry date *','Push Day':'Push Day'}); await input('Initial quantity', '10'); assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Expiry date\"]').required"), true);
  await input('Received at', '2026-11-18T14:30'); await checkCodeField('Batch code','Generated after saving'); const receivedInstant = await page.evaluate("new Date('2026-11-18T14:30').toISOString()"); await input('Expiry date', '2099-12-15'); await input('Push Day', '2020-01-01'); await capture('batch-create-filled-desktop'); state.writeError = 'Controlled batch save rejection'; await click('Save batch'); await has('Controlled batch save rejection'); assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Initial quantity\"]').value"), '10');
  state.writeError = ''; await click('Save batch'); await has('Inventory batch added successfully.'); assert.equal(writes().at(-1).body.pushDay, '2020-01-01'); assert.equal(writes().at(-1).body.receivedAt, receivedInstant); await has(batches.at(-1).batchCode); assert.equal(batches.at(-1).batchCode, 'BATCH-20261118-947'); await has('Inventory batch added successfully. Batch code: BATCH-20261118-947'); assert.equal(await page.evaluate("document.querySelector('[aria-label=\"Inventory batch table\"] tbody').textContent.includes('BATCH-20261118-947')"),true); for(const key of ['id','productId','batchCode']) assert.equal(key in writes().at(-1).body,false); assert.equal(writes().at(-1).body.expiryDate, '2099-12-15'); assert.equal('remainingQuantity' in writes().at(-1).body, false);
  await click('Add batch'); await has('Push Day not set. You can still save.');
  await input('Initial quantity', '2'); await input('Expiry date', '2099-12-15');
  assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Push Day\"]').value"), '');
  await click('Save batch'); await has('Inventory batch added successfully.'); assert.equal(writes().at(-1).body.pushDay, null);
  checks.push('Create Batch with past Push Day or without Push Day; expiry required; save failure keeps fields');
  state.readError = true; await page.evaluate("document.querySelector('button[aria-label=\"Refresh batches\"]').click()"); await has('Controlled read unavailable'); const beforeRetry = writes().length; state.readError = false; await click('Retry batches'); await has('BATCH-9'); assert.equal(writes().length, beforeRetry);
  state.batchesEmpty = true; await page.evaluate("document.querySelector('button[aria-label=\"Refresh batches\"]').click()"); await has('No batches found.'); state.batchesEmpty = false;
  await page.evaluate("document.querySelector('input[aria-label=\"Select product\"]').click()"); await input('Select product', 'SKU-11'); await until("Boolean([...document.querySelectorAll('[role=option]')].find(e=>e.id.endsWith('-option-11')))", 'Server-side product search'); assert.ok(calls.filter(c=>c.path==='/api/products').at(-1).query.includes('search=SKU-11')); await selectorKey('Escape');
  await page.evaluate("document.querySelector('button[aria-label=\"Refresh batches\"]').click()"); await has('BATCH-9');
  for (const width of [390, 820, 1440]) {
    await page.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
    assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), true, 'Batch responsive ' + width);
    const cards = await page.evaluate("[...document.querySelectorAll('[aria-label=\"Inventory summary\"] dl>div')].map(e=>({height:e.getBoundingClientRect().height,background:getComputedStyle(e).backgroundColor}))");
    assert.equal(cards.length,5); assert.ok(cards.slice(0,4).every(card=>card.background==='rgb(255, 255, 255)')); assert.notEqual(cards[4].background,'rgb(255, 255, 255)'); assert.ok(Math.max(...cards.map(c=>c.height))-Math.min(...cards.map(c=>c.height))<=1); assert.ok(cards.every(card=>card.height<=110));
    assert.equal(await page.evaluate("document.querySelector('input[role=combobox]').getBoundingClientRect().width<=document.querySelector('main').getBoundingClientRect().width"),true,'Single selector fits content');
    assert.equal(await page.evaluate("(()=>{const b=[...document.querySelectorAll('[aria-label=\"Inventory batch table\"] tbody tr:not(.f02-table-empty):first-child button')];return b.length===2&&b.every(e=>e.getBoundingClientRect().height>=40)&&b[1].getBoundingClientRect().left-b[0].getBoundingClientRect().right>=12;})()"),true,'Batch actions have usable hit areas and separation');
    assert.equal(await page.evaluate("(()=>{const toast=document.querySelector('[data-f02-toast]');if(!toast)return true;const t=toast.getBoundingClientRect(),a=document.querySelector('[data-batch-actions]').getBoundingClientRect(),table=document.querySelector('[aria-label=\"Inventory batch table\"]').getBoundingClientRect();return t.left>=0&&t.right<=innerWidth&&t.top>=a.bottom&&t.bottom<table.top})()"),true,'Responsive toast stays clear of controls/table');
    await capture('batches-'+width);
  }
  await page.call('Page.bringToFront'); await page.evaluate("document.querySelector('input[role=combobox]').blur();document.querySelector('input[role=combobox]').focus()"); await until("document.querySelector('input[role=combobox]').getAttribute('aria-expanded')==='true'",'Keyboard focus opens selector'); await selectorKey('Escape');
  await page.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true}); await page.evaluate("document.querySelector('input[role=combobox]').click()"); await until("document.querySelectorAll('[role=option]').length===20",'Mobile selector results'); await capture('selector-mobile'); await selectorKey('Escape');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }); await capture('batches-desktop'); await click('Add batch'); await page.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); assert.equal(await page.evaluate("document.querySelector('dialog').getBoundingClientRect().width<=innerWidth"), true); await capture('batch-create-mobile'); await ariaClick('Open calendar for Received at'); await until("Boolean(document.querySelector('.app-calendar:popover-open'))", 'Received At calendar in Inventory dialog'); await capture('batch-received-calendar-mobile'); await selectorKey('Escape'); assert.equal(await page.evaluate("Boolean(document.querySelector('dialog[open]'))"),true); await click('Cancel');
  checks.push('Read failure retry issues only GET; batch empty state, server product search, responsive 390/820/1440 and scrollable mobile dialog');
  await navigate('/store/inventory'); await has('Edited fixture product'); state.empty = true; await page.evaluate("document.querySelector('button[aria-label=\"Refresh products\"]').click()"); await has('This store has no products yet.'); state.empty = false;
  for (const path of ['/store/categories', '/store/inventory']) { await navigate(path); await has(path.endsWith('categories') ? 'Dairy edited' : 'Edited fixture product'); for (const width of [390, 820, 1440]) { await page.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 }); assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), true, path + ' responsive ' + width); } }
  await capture('products-desktop');
  await navigate('/store/edit-product'); await has('No product was selected.');
  products.find(p=>p.id===1).sku = 'FM26-DetailLegacy';
  await navigate('/store/edit-product?productId=1');
  await has('Catalog information'); await checkCodeField('SKU', 'FM26-DetailLegacy'); await has('BATCH-9'); await input('Category', '2', 'select'); await click('Save changes'); await has('Product updated successfully.'); assert.equal(writes().at(-1).body.categoryId, 2); assert.equal(Object.hasOwn(writes().at(-1).body,'sku'),false); assert.equal(products.find(p=>p.id===1).sku,'FM26-DetailLegacy');
  await input('Product name', 'Unsaved catalog draft'); products.find(p=>p.id===1).stockQuantity = 123;
  await page.evaluate("[...document.querySelectorAll('main button')].find(b=>b.textContent.trim()==='Edit').click()"); await input('Push Day', '2099-12-01'); const detailReads = calls.length; await click('Save batch'); await has('Batch updated successfully.');
  await until("[...document.querySelectorAll('main strong')].some(e=>e.textContent==='123')", 'Detail stock refreshed'); assert.ok(calls.slice(detailReads).some(c=>c.path==='/api/products/1'&&c.method==='GET'));
  assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Product name\"]').value"), 'Unsaved catalog draft');
  checks.push('Existing detail form preserves Category and unsaved edits; Batch changes refresh Product stock and Summary');
  products.push({ ...products[0], id: 9001, name: 'Disposable fixture item', sku: 'SKU-QA-9001' });
  await navigate('/store/inventory'); await has('Product Management'); await input('Search name or SKU', 'Disposable fixture item'); await has('Disposable fixture item');
  const openDelete = () => ariaClick('Xóa sản phẩm Disposable fixture item');
  const beforeDelete = writes().length;
  await openDelete(); await has('SKU-QA-9001'); await click('Hủy'); assert.equal(writes().length, beforeDelete);
  for (const [code, reason] of [['PRODUCT_HAS_SELLABLE_STOCK','Fixture has sellable stock'], ['PRODUCT_IN_LIVE_CAMPAIGN','Fixture is in a live campaign']]) {
    state.deleteResponse = { responseCode: 409, body: { code, error: 'Product cannot be deleted', reason, campaigns: [{campaignId: 123, status: 'PUBLISHED'}] } };
    await openDelete(); await click('Xóa sản phẩm'); await has(reason); await has('Campaign #123'); await click('Hủy');
  }
  state.deleteResponse = { responseCode: 404, body: { error: 'Product could not be found' } };
  await openDelete(); await click('Xóa sản phẩm'); await has('Product could not be found'); await click('Hủy');
  state.deleteResponse = null;
  await openDelete(); await click('Xóa sản phẩm'); await has('Đã xóa sản phẩm.'); await has('No matching products.');
  assert.equal(writes().filter(write => write.method === 'DELETE' && write.path === '/api/products/9001').length, 4);
  assert.ok(calls.slice(-10).some(call => call.method === 'GET' && call.path === '/api/products' && call.query.includes('pageSize=1')));
  await navigate('/store/batches'); await input('Select product', 'SKU-QA-9001'); await has('No matching products');
  checks.push('Delete dialog cancel, stock/campaign conflicts, 404, refreshed list/counts and selector');
  for (const role of ['MERCHANDISER', 'SYSTEM_ADMIN', 'END_CUSTOMER']) { await login(role); for (const path of ['/store/inventory', '/store/categories', '/store/batches', '/store/edit-product']) { await navigate(path); await has('Access Restricted'); assert.equal(await page.evaluate("!!document.querySelector('dialog')"), false); } }
  checks.push('Store empty versus filtered empty, Product/Category responsive, unauthorized direct F02 routes denied');
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  console.log(JSON.stringify({ result: 'PASS (controlled browser fixtures, not real Backend E2E)', checks, realBackendWrites: 0, artifacts }, null, 2));
} catch (error) {
  try { if (page) await capture('failure'); } catch {}
  console.log(JSON.stringify({ result: 'FAIL', error: error.stack, checks, errors, unexpected, lastCalls: calls.slice(-8), artifacts }, null, 2)); process.exitCode = 1;
} finally {
  closing = true; state.hold = false;
  if (page) { try { await page.call('Browser.close'); } catch {} page.ws.close(); }
  if (chrome.exitCode === null) await Promise.race([new Promise(done=>chrome.once('exit',done)), sleep(2000)]);
  if (chrome.exitCode === null) chrome.kill();
  const target = resolve(profile);
  if (dirname(target) === base && basename(target).startsWith('paspm-f02-browser-')) { try { rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {} }
}

