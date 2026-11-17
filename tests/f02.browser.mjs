// Fixture browser checks only; start Vite, then node tests/f02.browser.mjs.
// This is not E2E against a running Backend.
// All /api requests are intercepted before navigation. No real backend writes.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const origin = process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3102';
const base = resolve(tmpdir()), profile = mkdtempSync(join(base, 'paspm-f02-browser-'));
const artifacts = mkdtempSync(join(base, 'paspm-f02-preview-'));
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
const state = { role: 'STORE_ADMIN', hold: false, writeError: '', readError: false, productError: false, empty: false, batchesEmpty: false, categoriesEmpty: false, pickerMany: false, unconfirmedStatus: false, heldSearches: new Set(), heldInventory: new Set(), inventoryErrors: new Set() };
const categories = [{ id: 1, name: 'Dairy', status: 'ACTIVE' }];
const products = Array.from({ length: 11 }, (_, i) => ({ id: i + 1, sku: 'SKU-' + (i + 1), name: 'Fixture product ' + (i + 1), unit: 'Bottle', requiresExpiry: i === 0, category: categories[0], sellingPrice: 12.75, costPrice: 10.25, status: 'ACTIVE', stockQuantity: 100 }));
const batches = [{ id: 9, productId: 1, batchCode: 'BATCH-9', receivedAt: '2026-11-17T02:00:00Z', expiryDate: '2099-12-15', initialQuantity: 100, remainingQuantity: 80, status: 'ACTIVE', pushDay: '2020-12-10', createdAt: '2026-11-17T02:00:00Z', updatedAt: '2026-11-17T02:00:00Z' }];
batches.push({ ...batches[0], id: 19, productId: 2, batchCode: 'NO-EXPIRY-BATCH', expiryDate: null, initialQuantity: 22, remainingQuantity: 22, pushDay: null });
const extraProducts = Array.from({ length: 110 }, (_, index) => ({ ...products[1], id: 1000 + index, sku: 'SKU-EXTRA-' + index, name: 'Warehouse product ' + index }));
const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
const storeToday = ['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-');
function dateAfter(days) { const day = new Date(storeToday+'T00:00:00Z'); day.setUTCDate(day.getUTCDate()+days); return day.toISOString().slice(0,10); }
batches[0].remainingQuantity = 10;
for (const [id,batchCode,expiryDate,remainingQuantity,status] of [[29,'SOON',dateAfter(7),40,'ACTIVE'],[30,'EXPIRED',storeToday,15,'ACTIVE'],[31,'BLOCKED-SOON',dateAfter(3),25,'BLOCKED'],[32,'EMPTY-SOON',dateAfter(2),0,'ACTIVE'],[33,'LATER',dateAfter(8),10,'ACTIVE']]) batches.push({ ...batches[0], id, batchCode, expiryDate, initialQuantity: remainingQuantity || 10, remainingQuantity, status, pushDay: null });
products[2].requiresExpiry = true;
batches.push({ ...batches[0], id:39, productId:3, batchCode:'SINGLE-159', initialQuantity:159, remainingQuantity:159, expiryDate:dateAfter(5), pushDay:dateAfter(4) });
// This simulates Backend responses inside the intercepted fixture service only.
// Production UI always displays GET inventory-summary values and never calls this function.
function fixtureSummary(productId) {
  const rows = state.batchesEmpty ? [] : batches.filter(b=>b.productId===productId);
  const sum = predicate => rows.filter(predicate).reduce((n,b)=>n+b.remainingQuantity,0);
  return {productId,totalQuantity:sum(()=>true),blockedQuantity:sum(b=>b.status==='BLOCKED'),expiredQuantity:sum(b=>b.status==='ACTIVE'&&b.expiryDate&&b.expiryDate<=storeToday),sellableQuantity:sum(b=>b.status==='ACTIVE'&&(!b.expiryDate||b.expiryDate>storeToday)),expiringSoonQuantity:sum(b=>b.status==='ACTIVE'&&b.expiryDate>storeToday&&b.expiryDate<=dateAfter(7))};
}
const session = "(await (window.fixtureAuth ??= import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/services/authService.ts').name))).authService";
async function until(expression, label) { const end = Date.now() + 12000; while (Date.now() < end) { if (await page.evaluate(expression)) return; await sleep(40); } throw new Error('UI timeout: ' + label); }
async function waitFor(predicate, label) { const end = Date.now() + 12000; while (Date.now() < end) { if (predicate()) return; await sleep(30); } throw new Error('Fixture timeout: ' + label); }
const has = text => until('document.body.innerText.toLowerCase().includes(' + JSON.stringify(text.toLowerCase()) + ')', text);
async function click(label) {
  await until("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===" + JSON.stringify(label) + "&&b.getClientRects().length&&!b.disabled&&!b.closest('fieldset[disabled]'))", 'Clickable ' + label);
  await page.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===" + JSON.stringify(label) + "&&b.getClientRects().length&&!b.disabled&&!b.closest('fieldset[disabled]')).click()");
}
async function input(label, value, tag = 'input') {
  const selector = tag + '[aria-label=' + JSON.stringify(label) + ']';
  await until("(()=>{const e=document.querySelector(" + JSON.stringify(selector) + ");return Boolean(e&&!e.disabled&&!e.closest('fieldset[disabled]')&&e.getClientRects().length);})()", 'Ready input ' + label);
  assert.equal(await page.evaluate("(()=>{const e=document.querySelector(" + JSON.stringify(selector) + ");if(!e||e.disabled)return false;Object.getOwnPropertyDescriptor(" + (tag === 'select' ? 'HTMLSelectElement' : 'HTMLInputElement') + ".prototype,'value').set.call(e," + JSON.stringify(value) + ");e.dispatchEvent(new Event(" + JSON.stringify(tag === 'select' ? 'change' : 'input') + ",{bubbles:true}));return true;})()"), true, label);
}
async function navigate(path) { await page.evaluate('history.pushState({},"",' + JSON.stringify(path) + ');dispatchEvent(new PopStateEvent("popstate"));'); }
async function ariaClick(label) { const selector = 'button[aria-label=' + JSON.stringify(label) + ']'; await until('Boolean(document.querySelector(' + JSON.stringify(selector) + ')&&!document.querySelector(' + JSON.stringify(selector) + ').disabled)', label); await page.evaluate('document.querySelector(' + JSON.stringify(selector) + ').click()'); }
async function selectProduct(id, search = 'SKU-' + id) {
  await page.evaluate("document.querySelector('input[aria-label=\"Select product\"]').click()");
  await input('Select product', search);
  await until("Boolean([...document.querySelectorAll('[role=option]')].find(e=>e.id.endsWith('-option-"+id+"')))", 'Product option ' + id);
  await page.evaluate("[...document.querySelectorAll('[role=option]')].find(e=>e.id.endsWith('-option-"+id+"')).click()");
  await until("document.querySelector('input[aria-label=\"Select product\"]').getAttribute('aria-expanded')==='false'", 'Selector closed');
}
async function selectorKey(key) { await page.evaluate("document.querySelector('input[aria-label=\"Select product\"]').dispatchEvent(new KeyboardEvent('keydown',{key:"+JSON.stringify(key)+",bubbles:true,cancelable:true}))"); }
async function batchAction(code, action) { await until("Boolean([...document.querySelectorAll('[aria-label=\"Inventory batch table\"] tbody tr')].find(r=>r.textContent.includes("+JSON.stringify(code)+"))?.querySelector('button:not(:disabled)'))",code+' actions'); await page.evaluate("(()=>{const r=[...document.querySelectorAll('[aria-label=\"Inventory batch table\"] tbody tr')].find(r=>r.querySelector('td')?.textContent==="+JSON.stringify(code)+");[...r.querySelectorAll('button')].find(b=>b.textContent.trim()==="+JSON.stringify(action)+").click()})()"); }
async function summaryValues() { return page.evaluate("Object.fromEntries([...document.querySelectorAll('[aria-label=\"Inventory summary\"] dl>div')].map(e=>[e.querySelector('dt').textContent,Number(e.querySelector('dd').textContent.replaceAll(',',''))]))"); }
async function login(role = 'STORE_ADMIN') {
  state.role = role;
  await page.evaluate('(async()=>{const auth=' + session + ';auth.endLocal();await auth.authenticate("/api/auth/login",{email:"fixture@example.invalid",password:"fixture-only"});})()');
}
async function capture(name) { const shot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); writeFileSync(join(artifacts, name + '.png'), Buffer.from(shot.data, 'base64')); }
const writes = () => calls.filter(c => !['GET', 'OPTIONS'].includes(c.method) && !c.path.startsWith('/api/auth/'));
async function fixture({ requestId, request }) {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  if (!path.startsWith('/api/')) return page.call(url.origin === origin && !path.startsWith('/videos/') ? 'Fetch.continueRequest' : 'Fetch.failRequest', { requestId, ...(url.origin === origin && !path.startsWith('/videos/') ? {} : { errorReason: 'BlockedByClient' }) });
  const payload = request.postData ? JSON.parse(request.postData) : undefined;
  calls.push({ path, query: url.search, method, body: payload });
  let body, responseCode = 200;
  if (path === '/api/auth/login' || path === '/api/auth/refresh') body = { accessToken: 'fixture-only-access', expiresIn: 3600, tokenType: 'Bearer', csrfToken: 'fixture-only-csrf' };
  else if (path === '/api/auth/me') body = { userId: 12, name: 'F02 Fixture', email: 'fixture@example.invalid', roleCode: state.role, storeId: 1, status: 'ACTIVE', emailVerified: true };
  else if (method !== 'GET') {
    while (state.hold && !closing) await sleep(20);
    if (state.writeError) { responseCode = 400; body = { error: state.writeError }; }
    else if (path === '/api/products' || /^\/api\/products\/\d+$/.test(path)) {
      assert.deepEqual(Object.keys(payload).sort(), ['sku', 'name', 'categoryId', 'unit', 'requiresExpiry', 'sellingPrice', 'costPrice', 'status'].sort());
      const id = method === 'POST' ? products.length + 1 : Number(path.split('/').at(-1));
      body = { ...products[0], ...payload, id, category: categories.find(c => c.id === payload.categoryId) || null }; delete body.categoryId;
      if (method === 'POST') products.unshift(body); else products[products.findIndex(p => p.id === id)] = body;
    } else if (/^\/api\/products\/\d+\/status$/.test(path)) { const row = products.find(p => p.id === Number(path.split('/').at(-2))); Object.assign(row, payload); body = row; }
    else if (path === '/api/categories' || /^\/api\/categories\/\d+(\/status)?$/.test(path)) {
      if (method === 'POST') { body = { ...payload, id: 2 }; categories.push(body); }
      else { body = categories.find(c => c.id === Number(path.split('/')[3])); Object.assign(body, payload); }
    } else if (/^\/api\/products\/\d+\/batches$/.test(path)) {
      assert.equal(method, 'POST'); assert.equal('remainingQuantity' in payload, false);
      body = { ...batches[0], ...payload, id: Math.max(...batches.map(b => b.id)) + 1, productId: Number(path.split('/')[3]), remainingQuantity: payload.initialQuantity, status: 'ACTIVE' }; batches.push(body);
    } else if (/^\/api\/inventory-batches\/\d+(\/push-day)?$/.test(path)) {
      body = batches.find(b => b.id === Number(path.split('/')[3]));
      if (method === 'DELETE') { assert.ok(path.endsWith('/push-day')); assert.equal(payload, undefined); body.pushDay = null; }
      else { assert.equal(method, 'PATCH'); assert.ok(Object.keys(payload).every(key => ['remainingQuantity', 'status', 'pushDay'].includes(key))); if(!state.unconfirmedStatus) Object.assign(body, Object.fromEntries(Object.entries(payload).filter(([,v])=>v!==null))); }
    } else { unexpected.push(method + ' ' + path); responseCode = 500; body = { error: 'Unexpected fixture write' }; }
  } else if (state.readError && /batches|inventory-summary/.test(path)) { responseCode = 503; body = { error: 'Controlled read unavailable' }; }
  else if (path === '/api/products' && state.productError) { responseCode = 503; body = { error: 'Controlled product lookup failed' }; }
  else if (path === '/api/products') {
    const search = (url.searchParams.get('search') || '').toLowerCase(), index = Number(url.searchParams.get('page') || 0), size = Number(url.searchParams.get('pageSize') || 20);
    const source = state.pickerMany && size === 20 ? [...products, ...extraProducts] : products;
    const rows = state.empty ? [] : source.filter(p => (p.sku + ' ' + p.name).toLowerCase().includes(search) && (!url.searchParams.get('status') || p.status === url.searchParams.get('status')));
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
  else { unexpected.push(method + ' ' + path); responseCode = 500; body = { error: 'Unexpected fixture endpoint' }; }
  const responseHeaders = [{ name: 'Content-Type', value: 'application/json' }];
  if (path === '/api/auth/login' || path === '/api/auth/refresh') responseHeaders.push({ name: 'Set-Cookie', value: 'PASPM-CSRF=fixture-only-csrf; Path=/; SameSite=Lax' });
  const search = url.searchParams.get('search') || '', inventoryId = /^\/api\/products\/\d+\/(batches|inventory-summary)$/.test(path) && method === 'GET' ? Number(path.split('/')[3]) : null;
  const inventoryError = inventoryId !== null && state.inventoryErrors.has(inventoryId);
  while (!closing && ((path === '/api/products' && state.heldSearches.has(search)) || (inventoryId !== null && state.heldInventory.has(inventoryId)))) await sleep(20);
  if (inventoryError) { responseCode = 503; body = { error: 'Stale inventory request failed' }; }
  await page.call('Fetch.fulfillRequest', { requestId, responseCode, responseHeaders, body: Buffer.from(JSON.stringify(body)).toString('base64') });
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
  await has('Products · current page'); assert.equal(await page.evaluate("document.querySelector('main').innerText.includes('Push days')"), false);
  await click('Next'); await has('Showing page 2 of 2'); await click('Previous'); await has('Showing page 1 of 2');
  await input('Search name or SKU', 'does-not-exist'); await has('No products match the current filters.'); await input('Search name or SKU', ''); await has('Fixture product 1');
  await click('Add product'); await input('SKU', ' NEW '); await input('Product name', 'New fixture product'); await input('Selling price', '12.75'); await input('Cost price', '15.25'); await input('Category', '1', 'select');
  assert.deepEqual(await page.evaluate("[...document.querySelector('input[aria-label=Unit]').list.options].map(o=>o.value)"), ['Piece', 'Box', 'Pack', 'Bottle', 'Bag']);
  await input('Unit', 'vỉ');
  await has('The selling price is below the cost price.'); state.hold = true; const beforeCreate = writes().length;
  await page.evaluate("(()=>{const f=document.querySelector('dialog form');f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));})()");
  await until("document.querySelector('dialog fieldset')?.disabled", 'Product saving'); await sleep(150); assert.equal(writes().length, beforeCreate + 1); state.hold = false;
  await has('Product created successfully.'); await has('New fixture product'); assert.equal(writes().at(-1).body.sellingPrice, 12.75); assert.equal(writes().at(-1).body.sku, 'NEW'); assert.equal(writes().at(-1).body.unit, 'vỉ');
  await click('Edit'); await input('Product name', 'Edited fixture product'); state.writeError = 'Cannot require expiry while a batch has no expiry date'; await click('Save product');
  assert.equal(await page.evaluate("document.querySelector('input[aria-label=Unit]').value"), 'vỉ');
  await has('Cannot enable expiry tracking because some existing batches have no expiry date.'); assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Product name\"]').value"), 'Edited fixture product'); state.writeError = ''; await click('Save product'); await has('Product updated successfully.'); await has('Edited fixture product');
  checks.push('Product V26 create/edit, decimals below cost, inline Backend rejection keeps input, duplicate submit sends once, filters and pagination');
  await navigate('/store/categories'); await has('Dairy'); await click('Add category'); await input('Category name', '   '); const beforeCategory = writes().length; await click('Save category'); await has('Category name is required'); assert.equal(writes().length, beforeCategory);
  await input('Category name', ' Chilled '); await click('Save category'); await has('Category created successfully.'); await has('Chilled'); await click('Edit'); await input('Category name', 'Dairy edited'); await click('Save category'); await has('Category updated successfully.');
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
  await page.evaluate("[...document.querySelectorAll('[role=option]')].find(e=>e.id.endsWith('-option-1')).click()"); await has('BATCH-9'); await has('Push Day reached');
  assert.deepEqual(await summaryValues(), {'Total stock':100,Sellable:60,Expired:15,Blocked:25,'Expiring in 7 days':40});
  await has('40 units expiring within 7 days');
  const info = await page.evaluate("document.querySelector('[aria-label=\"Currently viewing\"]').textContent"); assert.ok(info.includes('Fixture product 1')&&info.includes('SKU: SKU-1')&&info.includes('Expiry tracking enabled'));
  const badges = await page.evaluate("Object.fromEntries([...document.querySelectorAll('[aria-label=\"Inventory batch table\"] tbody tr')].map(r=>[r.querySelector('td').textContent,r.children[2].textContent]))");
  assert.ok(badges.SOON.includes('Expiring soon')); assert.ok(badges.EXPIRED.includes('Expired')&&!badges.EXPIRED.includes('Expiring soon'));
  for(const code of ['BATCH-9','BLOCKED-SOON','EMPTY-SOON','LATER']) assert.equal(badges[code].includes('Expiring soon'),false,code);
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
  assert.equal(await page.evaluate("document.querySelector('[aria-label=\"Inventory batch table\"]').textContent.includes('Set a Push Day')"),false);
  await click('Add batch'); assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Expiry date\"]').required"),false); await has('Expiry date (optional)');
  await input('Batch code','NO-EXPIRY-NEW'); await input('Initial quantity','5'); assert.equal(await page.evaluate("document.querySelector('dialog').textContent.includes('excluded from expiry-risk')"),false);
  assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Push Day\"]').disabled"),false); await click('Save batch'); await has('Inventory batch added successfully.'); assert.equal(writes().at(-1).body.expiryDate,null);
  await selectProduct(1); await has('BATCH-9');
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
  assert.equal(await page.evaluate("[...document.querySelectorAll('[aria-label=\"Inventory batch table\"] tbody tr')].find(r=>r.textContent.includes('SINGLE-159')).textContent.includes('Unblock')"),true);
  assert.equal(await page.evaluate("Boolean(document.querySelector('[aria-label=\"Expiring stock\"]'))"),false);
  assert.ok(calls.slice(beforeBlock).some(c=>c.path==='/api/products/3/inventory-summary'&&c.method==='GET'));
  assert.ok(Math.abs(await page.evaluate("document.querySelector('[aria-label=\"Inventory summary\"]').getBoundingClientRect().top")-summaryTop)<1,'Toast does not shift content');
  assert.equal(await page.evaluate("(()=>{const t=document.querySelector('[data-f02-toast]').getBoundingClientRect(),a=document.querySelector('[data-batch-actions]').getBoundingClientRect(),table=document.querySelector('[aria-label=\"Inventory batch table\"]').getBoundingClientRect();return t.top>=a.bottom&&t.bottom<table.top&&t.right<=innerWidth&&t.left>=0})()"),true,'Toast avoids controls and table');
  await capture('blocked-toast-desktop'); await sleep(4200); assert.equal(await page.evaluate("Boolean(document.querySelector('[data-f02-toast]'))"),false,'Success auto-dismisses');
  await batchAction('SINGLE-159','Unblock'); await has('Batch unblocked successfully.'); assert.deepEqual(await summaryValues(),{'Total stock':159,Sellable:159,Expired:0,Blocked:0,'Expiring in 7 days':159}); await has('159 units expiring within 7 days');
  checks.push('Block/Unblock authoritative response and refreshed Summary 159/0, no success on failure/unconfirmed response, specific accessible toast, persistent errors, auto-dismiss success, no layout shift');
  await selectProduct(1); await has('BATCH-9');
  await click('Edit'); const beforePatch = writes().length; await input('Push Day', '2099-12-16'); await has('Push Day must be on or before the expiry date.'); assert.equal(writes().length, beforePatch);
  await input('Push Day', '2099-12-15'); const beforeRefresh = calls.length; await click('Save batch'); await has('Batch updated successfully.'); assert.deepEqual(writes().at(-1).body, { pushDay: '2099-12-15' });
  await until("!document.body.innerText.includes('Loading batches')", 'Batch refresh'); assert.ok(calls.slice(beforeRefresh).some(c => c.path.endsWith('/batches') && c.method === 'GET')); assert.ok(calls.slice(beforeRefresh).some(c => c.path.endsWith('/inventory-summary')));
  await click('Edit'); const beforeBlank = writes().length; await input('Push Day', ''); await click('Save batch'); await has('Use Clear Push Day to remove the saved date.'); assert.equal(writes().length, beforeBlank);
  await click('Clear Push Day'); await has('Push Day cleared successfully.'); assert.equal(writes().at(-1).method, 'DELETE'); assert.equal(writes().at(-1).path, '/api/inventory-batches/9/push-day'); assert.equal(writes().at(-1).body, undefined);
  await click('Cancel'); await has('Set a Push Day for expiry-risk analysis.'); await has('Not set');
  await click('Edit'); await input('Remaining quantity', '40'); await click('Save batch'); await has('Batch updated successfully.'); assert.deepEqual(writes().at(-1).body, { remainingQuantity: 40 });
  await batchAction('BATCH-9','Block'); await has('Batch blocked successfully.'); assert.deepEqual(writes().at(-1).body, { status: 'BLOCKED' }); await batchAction('BATCH-9','Unblock'); await has('Batch unblocked successfully.');
  checks.push('Batch Push Day validation/equality, minimal PATCH, explicit DELETE, immutable fields, summary refresh, quantity, block/unblock');
  await click('Add batch'); await input('Batch code', 'BATCH-NEW'); await input('Initial quantity', '10'); assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Expiry date\"]').required"), true);
  await input('Expiry date', '2099-12-15'); await input('Push Day', '2020-01-01'); state.writeError = 'Controlled batch save rejection'; await click('Save batch'); await has('Controlled batch save rejection'); assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Batch code\"]').value"), 'BATCH-NEW');
  state.writeError = ''; await click('Save batch'); await has('Inventory batch added successfully.'); assert.equal(writes().at(-1).body.pushDay, '2020-01-01'); assert.equal('remainingQuantity' in writes().at(-1).body, false);
  await click('Add batch'); await input('Batch code', 'BATCH-NO-PUSH'); await input('Initial quantity', '2'); await input('Expiry date', '2099-12-15'); await click('Save batch'); await has('Inventory batch added successfully.'); assert.equal(writes().at(-1).body.pushDay, null);
  checks.push('Create Batch with past Push Day or without Push Day; expiry required; save failure keeps fields');
  state.readError = true; await page.evaluate("document.querySelector('button[aria-label=\"Refresh batches\"]').click()"); await has('Controlled read unavailable'); const beforeRetry = writes().length; state.readError = false; await click('Retry batches'); await has('BATCH-9'); assert.equal(writes().length, beforeRetry);
  state.batchesEmpty = true; await page.evaluate("document.querySelector('button[aria-label=\"Refresh batches\"]').click()"); await has('No batches for this product yet.'); state.batchesEmpty = false;
  await page.evaluate("document.querySelector('input[aria-label=\"Select product\"]').click()"); await input('Select product', 'SKU-11'); await until("Boolean([...document.querySelectorAll('[role=option]')].find(e=>e.id.endsWith('-option-11')))", 'Server-side product search'); assert.ok(calls.filter(c=>c.path==='/api/products').at(-1).query.includes('search=SKU-11')); await selectorKey('Escape');
  await page.evaluate("document.querySelector('button[aria-label=\"Refresh batches\"]').click()"); await has('BATCH-9');
  for (const width of [390, 820, 1440]) {
    await page.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
    assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), true, 'Batch responsive ' + width);
    const cards = await page.evaluate("[...document.querySelectorAll('[aria-label=\"Inventory summary\"] dl>div')].map(e=>({height:e.getBoundingClientRect().height,background:getComputedStyle(e).backgroundColor}))");
    assert.equal(cards.length,5); assert.ok(cards.slice(0,4).every(card=>card.background==='rgb(255, 255, 255)')); assert.notEqual(cards[4].background,'rgb(255, 255, 255)'); assert.ok(Math.max(...cards.map(c=>c.height))-Math.min(...cards.map(c=>c.height))<=1); assert.ok(cards.every(card=>card.height<=110));
    assert.equal(await page.evaluate("document.querySelector('input[role=combobox]').getBoundingClientRect().width<=document.querySelector('main').getBoundingClientRect().width"),true,'Single selector fits content');
    assert.equal(await page.evaluate("(()=>{const b=[...document.querySelectorAll('[aria-label=\"Inventory batch table\"] tbody tr:first-child button')];return b.length===2&&b.every(e=>e.getBoundingClientRect().height>=40)&&b[1].getBoundingClientRect().left-b[0].getBoundingClientRect().right>=12;})()"),true,'Batch actions have usable hit areas and separation');
    assert.equal(await page.evaluate("(()=>{const toast=document.querySelector('[data-f02-toast]');if(!toast)return true;const t=toast.getBoundingClientRect(),a=document.querySelector('[data-batch-actions]').getBoundingClientRect(),table=document.querySelector('[aria-label=\"Inventory batch table\"]').getBoundingClientRect();return t.left>=0&&t.right<=innerWidth&&t.top>=a.bottom&&t.bottom<table.top})()"),true,'Responsive toast stays clear of controls/table');
    await capture('batches-'+width);
  }
  await page.call('Page.bringToFront'); await page.evaluate("document.querySelector('input[role=combobox]').blur();document.querySelector('input[role=combobox]').focus()"); await until("document.querySelector('input[role=combobox]').getAttribute('aria-expanded')==='true'",'Keyboard focus opens selector'); await selectorKey('Escape');
  await page.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true}); await page.evaluate("document.querySelector('input[role=combobox]').click()"); await until("document.querySelectorAll('[role=option]').length===20",'Mobile selector results'); await capture('selector-mobile'); await selectorKey('Escape');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }); await capture('batches-desktop'); await click('Add batch'); await page.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); assert.equal(await page.evaluate("document.querySelector('dialog').getBoundingClientRect().width<=innerWidth"), true); await capture('batch-create-mobile'); await click('Cancel');
  checks.push('Read failure retry issues only GET; batch empty state, server product search, responsive 390/820/1440 and scrollable mobile dialog');
  await navigate('/store/inventory'); await has('Edited fixture product'); state.empty = true; await page.evaluate("document.querySelector('button[aria-label=\"Refresh products\"]').click()"); await has('This store has no products yet.'); state.empty = false;
  for (const path of ['/store/categories', '/store/inventory']) { await navigate(path); await has(path.endsWith('categories') ? 'Dairy edited' : 'Edited fixture product'); for (const width of [390, 820, 1440]) { await page.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 }); assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), true, path + ' responsive ' + width); } }
  await capture('products-desktop');
  // Mount the existing detail component with an explicit real-shaped ID. The app's
  // direct detail URL has no selected product, so never guess one in production.
  await navigate('/store/edit-product'); await has('No product was selected.');
  await page.evaluate("(async()=>{const resources=performance.getEntriesByType('resource');const React=await import(resources.find(e=>new URL(e.name).pathname==='/node_modules/.vite/deps/react.js').name);const ReactDOM=await import(resources.find(e=>new URL(e.name).pathname==='/node_modules/.vite/deps/react-dom_client.js').name);const {EditProductView}=await import('/src/features/store/components/EditProductView.tsx');const host=document.createElement('div');host.id='detail-fixture';document.querySelector('main').append(host);window.detailFixtureRoot=(ReactDOM.createRoot||ReactDOM.default.createRoot)(host);window.detailFixtureRoot.render((React.createElement||React.default.createElement)(EditProductView,{productId:'1',onNavigate:()=>{}}));})()");
  await has('Catalog information'); await has('BATCH-9'); await input('Category', '2', 'select'); await click('Save changes'); await has('Product updated successfully.'); assert.equal(writes().at(-1).body.categoryId, 2);
  await input('Product name', 'Unsaved catalog draft'); products.find(p=>p.id===1).stockQuantity = 123;
  await page.evaluate("[...document.querySelectorAll('#detail-fixture button')].find(b=>b.textContent.trim()==='Edit').click()"); await input('Push Day', '2099-12-01'); const detailReads = calls.length; await click('Save batch'); await has('Batch updated successfully.');
  await until("document.querySelector('#detail-fixture strong')?.textContent==='123'", 'Detail stock refreshed'); assert.ok(calls.slice(detailReads).some(c=>c.path==='/api/products/1'&&c.method==='GET'));
  assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Product name\"]').value"), 'Unsaved catalog draft');
  await page.evaluate("window.detailFixtureRoot.unmount();document.querySelector('#detail-fixture').remove()");
  checks.push('Existing detail form preserves Category and unsaved edits; Batch changes refresh Product stock and Summary');
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

