// Fixture browser checks only; start Vite, then node tests/f02.browser.mjs.
// This is not E2E against a running Backend.
// All /api requests are intercepted before navigation. No real backend writes.
import assert from 'node:assert/strict';
import { batchView } from './f02.batch-fixtures.mjs';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const origin = process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3102';
const base = resolve(tmpdir()), profile = mkdtempSync(join(base, 'paspm-f02-tables-browser-'));
const artifacts = process.env.PASPM_TEST_NO_ARTIFACTS === '1' ? null : mkdtempSync(join(base, 'paspm-f02-tables-preview-'));
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
state.storeId = 1; state.statsError = false; state.heldStats = new Set();
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
const has = text => until('document.body.innerText.toLowerCase().includes(' + JSON.stringify(text.toLowerCase()) + ')', text);
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
async function capture(name) { if (!artifacts) return;
  const clip = await page.evaluate("innerWidth<768&&!document.querySelector('dialog[open],.f02-filter-panel:popover-open')?(()=>{const main=document.querySelector('main'),r=main.getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:main.scrollHeight,scale:1}})():null");
  const modal = await page.evaluate("Boolean(document.querySelector('dialog[open]'))");
  const shot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !modal, ...(clip ? { clip } : {}) });
  writeFileSync(join(artifacts, name + '.png'), Buffer.from(shot.data, 'base64'));
}
const writes = () => calls.filter(c => !['GET', 'OPTIONS'].includes(c.method) && !c.path.startsWith('/api/auth/'));
async function fixture({ requestId, request }) {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  if (!path.startsWith('/api/')) return page.call(url.origin === origin && !path.startsWith('/videos/') ? 'Fetch.continueRequest' : 'Fetch.failRequest', { requestId, ...(url.origin === origin && !path.startsWith('/videos/') ? {} : { errorReason: 'BlockedByClient' }) });
  const payload = request.postData ? JSON.parse(request.postData) : undefined;
  const statsRequest = path === '/api/products' && method === 'GET' && url.searchParams.get('pageSize') === '1';
  const statsStore = state.storeId;
  calls.push({ path, query: url.search, method, body: payload });
  let body, responseCode = 200;
  if (path === '/api/auth/login' || path === '/api/auth/refresh') body = { accessToken: 'fixture-only-access', expiresIn: 3600, tokenType: 'Bearer', csrfToken: 'fixture-only-csrf' };
  else if (path === '/api/auth/me') body = { userId: 12, name: 'F02 Fixture', email: 'fixture@example.invalid', roleCode: state.role, storeId: state.storeId, status: 'ACTIVE', emailVerified: true };
  else if (method !== 'GET') {
    while (state.hold && !closing) await sleep(20);
    if (state.writeError) { responseCode = 400; body = { error: state.writeError }; }
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
      body = { ...products[0], ...payload, id, sku: method === 'POST' ? 'SKU-' + String(id).padStart(11, '0') : products.find(p => p.id === id).sku, category: categories.find(c => c.id === payload.categoryId) || null }; delete body.categoryId;
      if (method === 'POST') products.unshift(body); else products[products.findIndex(p => p.id === id)] = body;
      }
    } else if (/^\/api\/products\/\d+\/status$/.test(path)) { const row = products.find(p => p.id === Number(path.split('/').at(-2))); Object.assign(row, payload); body = row; }
    else if (path === '/api/categories' || /^\/api\/categories\/\d+(\/status)?$/.test(path)) {
      if (method === 'POST') { body = { ...payload, id: 2 }; categories.push(body); }
      else { body = categories.find(c => c.id === Number(path.split('/')[3])); Object.assign(body, payload); }
    } else if (/^\/api\/products\/\d+\/batches$/.test(path)) {
      assert.equal(method, 'POST'); assert.deepEqual(Object.keys(payload).sort(), ['receivedAt','expiryDate','initialQuantity','pushDay'].sort());
      body = { ...batches[0], ...payload, batchCode: 'BATCH-20261118-' + String(batches.length + 1).padStart(3, '0'), id: Math.max(...batches.map(b => b.id)) + 1, productId: Number(path.split('/')[3]), remainingQuantity: payload.initialQuantity, status: 'ACTIVE' }; batches.push(body);
    } else if (/^\/api\/inventory-batches\/\d+(\/(push-day|expiry-date))?$/.test(path)) {
      body = batches.find(b => b.id === Number(path.split('/')[3]));
      if (method === 'DELETE') { assert.equal(payload, undefined); if(path.endsWith('/expiry-date')) { assert.equal(products.find(p=>p.id===body.productId).requiresExpiry,false); body.expiryDate = null; } else { assert.ok(path.endsWith('/push-day')); body.pushDay = null; } }
      else { assert.equal(method, 'PATCH'); assert.ok(Object.keys(payload).every(key => ['remainingQuantity', 'status', 'pushDay', 'expiryDate'].includes(key))); if(!state.unconfirmedStatus) Object.assign(body, Object.fromEntries(Object.entries(payload).filter(([,v])=>v!==null))); }
    } else { unexpected.push(method + ' ' + path); responseCode = 500; body = { error: 'Unexpected fixture write' }; }
  } else if (state.readError && /batches|inventory-summary/.test(path)) { responseCode = 503; body = { error: 'Controlled read unavailable' }; }
  else if (statsRequest && state.statsError) { responseCode = 503; body = { error: 'Controlled statistics failure' }; }
  else if (path === '/api/products' && state.productError) { responseCode = 503; body = { error: 'Controlled product lookup failed' }; }
  else if (path === '/api/products') {
    const search = (url.searchParams.get('search') || '').toLowerCase(), index = Number(url.searchParams.get('page') || 0), size = Number(url.searchParams.get('pageSize') || 20);
    const source = state.storeId === 2 ? products.slice(0, 7) : state.pickerMany && size === 20 ? [...products, ...extraProducts] : products;
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
  else { unexpected.push(method + ' ' + path); responseCode = 500; body = { error: 'Unexpected fixture endpoint' }; }
  const responseHeaders = [{ name: 'Content-Type', value: 'application/json' }];
  if (path === '/api/auth/login' || path === '/api/auth/refresh') responseHeaders.push({ name: 'Set-Cookie', value: 'PASPM-CSRF=fixture-only-csrf; Path=/; SameSite=Lax' });
  const search = url.searchParams.get('search') || '', inventoryId = /^\/api\/products\/\d+\/(batches|inventory-summary)$/.test(path) && method === 'GET' ? Number(path.split('/')[3]) : null;
  const inventoryError = inventoryId !== null && state.inventoryErrors.has(inventoryId);
  while (!closing && ((path === '/api/products' && state.heldSearches.has(search)) || (inventoryId !== null && state.heldInventory.has(inventoryId)))) await sleep(20);
  if (inventoryError) { responseCode = 503; body = { error: 'Stale inventory request failed' }; }
  while (!closing && statsRequest && state.heldStats.has(statsStore)) await sleep(20);
  if (responseCode < 300 && Array.isArray(body) && /^\/api\/products\/\d+\/batches$/.test(path)) {
    body = body.map(batch => batchView(batch, products, storeToday));
  } else if (responseCode < 300 && body?.batchCode) {
    body = batchView(body, products, storeToday);
  }
  await page.call('Fetch.fulfillRequest', { requestId, responseCode, responseHeaders, body: responseCode === 204 ? '' : Buffer.from(JSON.stringify(body)).toString('base64') });
  fulfilled.push({ path, query: url.search, method });
}

for(let i=2;i<=24;i++) categories.push({id:i,name:['Bánh','Đồ uống','Áo','Ăn vặt','Trái cây'][i%5]+' '+i,status:i%3===0?'INACTIVE':'ACTIVE'});
products[1].name='Vietnamese specialty product with a very long name for stable table column layout';
products[1].sku='FM26-0002';
products[1].unit='hộp';
for(let i=12;i<=24;i++) products.push({...products[0],id:i,sku:'SKU-'+String(i).padStart(11,'0'),name:'Warehouse product '+i,stockQuantity:i*10,costPrice:i*12345.5,sellingPrice:i*23456.75,requiresExpiry:i%2===0,status:i%3===0?'INACTIVE':'ACTIVE',category:categories[i%categories.length]});
for(let i=0;i<9;i++) batches.push({...batches[0],id:100+i,batchCode:'BATCH-20261119-'+String(i+1).padStart(3,'0'),receivedAt:'2026-11-'+String(10+i).padStart(2,'0')+'T23:30:00Z',expiryDate:i%3===0?null:'2027-01-'+String(10+i).padStart(2,'0'),pushDay:i%2===0?null:'2026-12-'+String(10+i).padStart(2,'0'),initialQuantity:100+i,remainingQuantity:i*7,status:i%3===0?'BLOCKED':'ACTIVE'});


// Include a real unit that occurs only beyond the first 100 products.
for (const product of products) if (product.id !== 2) product.sku = 'SKU-' + String(product.id).padStart(11, '0');
for(let id=25;id<=125;id++) products.push({...products[0],id,sku:'SKU-'+String(id).padStart(11,'0'),name:'Warehouse item '+id,unit:id===125?'Store-only crate':id<40?'Unit '+id:id%2?' bottle ':'BOTTLE'});
products[1].name='Sản phẩm đặc sản Việt Nam có tên rất dài để kiểm tra bố cục ổn định khi sắp xếp';
products[1].category={...categories[0],name:'Danh mục tiếng Việt có tên dài cần được giới hạn hai dòng'};
products[2].costPrice=987654321.25; products[2].sellingPrice=1234567890.75;
const region = label => '[aria-label="' + label + ' table"]';
async function settled(label) { await until('document.querySelector('+JSON.stringify(region(label))+')?.closest("[aria-busy]").getAttribute("aria-busy")==="false"', label + ' settled'); }
async function rowCells(label) { return page.evaluate('[...document.querySelectorAll('+JSON.stringify(region(label)+' tbody tr:not(.f02-table-empty)')+')].map(r=>[...r.cells].map(c=>c.textContent.trim()))'); }
async function categoryIds() { return (await rowCells('Category')).map(row=>Number(row[0])); }
async function metrics() { return page.evaluate('(()=>{const r=document.querySelector(\'[aria-label="Product table"]\'),t=r.querySelector("table"),f=r.closest("[aria-busy]");return {widths:[...t.querySelectorAll("thead th")].map(c=>c.getBoundingClientRect().width),header:t.querySelector("thead").getBoundingClientRect().height,height:f.getBoundingClientRect().height,scroll:r.scrollLeft,y:scrollY}})()'); }
const closeEnough = (a,b,label) => assert.ok(Math.abs(a-b)<1.1,label+': '+a+' vs '+b);
async function noHeaderFilters() { assert.equal(await page.evaluate("document.querySelectorAll('thead .f02-filter-button,thead [popover],thead select,thead input').length"),0,'Headers contain only sorting'); }
async function unitKey(key) { await page.evaluate('document.querySelector(\'input[aria-label="Unit"]\').dispatchEvent(new KeyboardEvent("keydown",{key:'+JSON.stringify(key)+',bubbles:true,cancelable:true}))'); }
const statsCalls = () => calls.filter(c => c.path === '/api/products' && new URLSearchParams(c.query).get('pageSize') === '1');
const statsValues = () => page.evaluate("[...document.querySelectorAll('[data-product-stat]')].map(e=>e.textContent)");
async function statsReady(expected) {
  // Table and statistics requests finish independently after a mutation.
  await until("document.querySelector('[aria-label=\"Store product statistics\"]')?.getAttribute('aria-busy')==='false'&&JSON.stringify([...document.querySelectorAll('[data-product-stat]')].map(e=>e.textContent))===" + JSON.stringify(JSON.stringify(expected.map(String))), 'Expected statistics settled');
  assert.deepEqual(await statsValues(), expected.map(String));
}
async function statsChecks() {
  const savedProducts = [...products];
  await navigate('/store/categories'); await settled('Category');
  assert.equal(await page.evaluate("[...document.querySelectorAll('.f02-status-button')].every(b=>!b.querySelector('svg'))"), true, 'Category status has no Chevron');
  assert.equal(await page.evaluate("[...document.querySelectorAll('.f02-cell-actions button')].every(b=>b.classList.contains('f02-product-edit')&&!b.querySelector('svg')&&getComputedStyle(b).borderTopWidth==='1px')"), true, 'Shared text-only Edit style');
  const cat = categories[0], originalStatus = cat.status;
  await ariaClick('Change status for ' + cat.name); await settled('Category');
  await until("document.body.innerText.includes('Category status updated successfully.')", 'Category status changed');
  assert.notEqual(cat.status, originalStatus);
  await ariaClick('Change status for ' + cat.name); await settled('Category');
  await until("[...document.querySelectorAll('.f02-status-button')].some(b=>b.getAttribute('aria-label')===" + JSON.stringify('Change status for ' + cat.name) + "&&b.textContent==='Active'&&!b.disabled)", 'Category status restored');
  await click('Edit'); await has('Edit category'); await click('Cancel');
  products.splice(0, products.length, ...Array.from({ length: 360 }, (_, i) => ({ ...savedProducts[0], id: i + 1, sku: 'STATS-' + (i + 1), name: 'Stats product ' + (i + 1), status: i < 240 ? 'ACTIVE' : 'INACTIVE' })));
  await page.evaluate("sessionStorage.removeItem('f02-products-view-state')");
  let count = statsCalls().length;
  await navigate('/store/inventory'); await settled('Product'); await statsReady([360, 240, 120]);
  assert.equal(statsCalls().length - count, 3);
  assert.equal((await rowCells('Product')).length, 10);
  assert.equal(await page.evaluate("document.querySelectorAll('[data-product-stat]').length===3&&!/current page|out of stock/i.test(document.querySelector('[aria-label=\"Store product statistics\"]').innerText)"), true);
  count = statsCalls().length;
  await click('Next'); await settled('Product'); await statsReady([360, 240, 120]);
  await input('Search name or SKU', 'Stats product 2'); await settled('Product');
  await input('Filter by category', '1', 'select'); await settled('Product');
  await input('Filter by status', 'INACTIVE', 'select'); await settled('Product');
  await ariaClick('Sort by Product name'); await settled('Product'); await statsReady([360, 240, 120]);
  assert.equal(statsCalls().length, count, 'No statistics requests from page/search/category/status/sort');
  await click('Clear filters'); await settled('Product');
  await ariaClick('Refresh products'); await settled('Product'); await statsReady([360, 240, 120]);
  assert.equal(statsCalls().length - count, 3); count = statsCalls().length;
  await ariaClick('Sort by Product name'); await settled('Product');
  await ariaClick('Change status for Stats product 1'); await settled('Product'); await statsReady([360, 239, 121]);
  assert.equal(statsCalls().length - count, 3); count = statsCalls().length;
  await click('Add product'); await input('Product name', 'Stats added'); await input('Unit', 'Box'); await input('Selling price', '12'); await input('Cost price', '10'); await click('Save product');
  await has('Product created successfully.'); await settled('Product'); await statsReady([361, 240, 121]);
  assert.equal(statsCalls().length - count, 3); count = statsCalls().length;
  await input('Search name or SKU', 'Stats added'); await settled('Product'); await click('Edit'); await input('Product name', 'Stats edited'); await click('Save product');
  await has('Product updated successfully.'); await settled('Product'); await statsReady([361, 240, 121]);
  assert.equal(statsCalls().length - count, 3);
  state.empty = true; await ariaClick('Refresh products'); await settled('Product'); await statsReady([0, 0, 0]);
  state.empty = false; state.statsError = true;
  await ariaClick('Refresh products'); await settled('Product'); await statsReady(['Unavailable', 'Unavailable', 'Unavailable']); await has('Product statistics are unavailable.');
  state.statsError = false; await click('Retry statistics'); await statsReady([361, 240, 121]);
  // Hold responses carrying Store 1 totals, then authenticate into Store 2.
  state.heldStats.add(1); count = statsCalls().length;
  await ariaClick('Refresh products'); await waitFor(() => statsCalls().length === count + 3, 'Old Store statistics held');
  assert.deepEqual(await statsValues(), ['\u2014', '\u2014', '\u2014']);
  const fulfilledBefore = fulfilled.filter(c => c.path === '/api/products' && new URLSearchParams(c.query).get('pageSize') === '1').length;
  state.storeId = 2; await login(); await navigate('/store/inventory'); await settled('Product'); await statsReady([7, 6, 1]);
  state.heldStats.delete(1);
  await waitFor(() => fulfilled.filter(c => c.path === '/api/products' && new URLSearchParams(c.query).get('pageSize') === '1').length >= fulfilledBefore + 6, 'Old responses released');
  await statsReady([7, 6, 1]);
  for (const width of [1366, 820, 390]) {
    await page.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
    assert.equal(await page.evaluate("(()=>{const section=document.querySelector('[aria-label=\"Store product statistics\"]'),cards=[...section.querySelectorAll('[data-product-stat]')].map(e=>e.parentElement.getBoundingClientRect());return section.scrollWidth<=section.clientWidth+1&&cards.every(r=>Math.abs(r.width-cards[0].width)<1)&&[...document.querySelectorAll('.f02-product-edit')].every(b=>!b.querySelector('svg'))})()"), true, 'Three equal responsive cards and no Edit icons at ' + width);
  }
  products.splice(0, products.length, ...savedProducts); state.storeId = 1;
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
  await login(); await navigate('/store/inventory'); await settled('Product');
  checks.push('Store-wide 360/240/120 from three tiny queries; no filter/page/sort refetch; Refresh/create/update/status; empty/error/retry; late Store/session fence; three equal responsive cards; Category status and shared text-only Edit');
}
async function tableChecks() {
  const tableStart = calls.length;
  await navigate('/store/categories'); await settled('Category'); await noHeaderFilters();
  const reads=calls.filter(c=>c.path==='/api/categories').length;
  await ariaClick('Sort by ID'); assert.deepEqual(await categoryIds(),Array.from({length:10},(_,i)=>i+1));
  await ariaClick('Sort by ID'); assert.deepEqual(await categoryIds(),Array.from({length:10},(_,i)=>24-i));
  await ariaClick('Sort by Name'); const vi=new Intl.Collator('vi',{numeric:true,sensitivity:'base'});
  assert.deepEqual(await categoryIds(),[...categories].sort((a,b)=>vi.compare(a.name,b.name)||a.id-b.id).slice(0,10).map(c=>c.id));
  await input('Search category name','Trái'); await input('Filter category status','ACTIVE','select');
  assert.ok((await rowCells('Category')).every(r=>r[1].includes('Trái')&&r[2]==='Active'));
  assert.ok((await categoryIds()).some(id=>id>10),'Full-list filter includes later pages');
  await click('Clear filters'); assert.equal((await categoryIds()).length,10);
  assert.equal(calls.filter(c=>c.path==='/api/categories').length,reads);
  await click('Next'); await navigate('/store/inventory'); await settled('Product'); await navigate('/store/categories'); await settled('Category'); await until("document.querySelector('.f02-pagination [aria-current=page]')?.textContent.trim()==='2'", 'Page 2 selected');
  checks.push('Category toolbar name/status AND, numeric/Vietnamese sort over full data before pagination; saved state; no header filters');

  await page.evaluate("sessionStorage.setItem('f02-products-view-state',JSON.stringify({page:1,query:'SKU-',categoryId:'1',status:'ACTIVE',sortBy:'unit',sortDirection:'desc'}))");
  await navigate('/store/inventory'); await settled('Product'); await noHeaderFilters();
  const restoredQuery=new URLSearchParams(calls.filter(c=>c.path==='/api/products'&&c.method==='GET'&&new URLSearchParams(c.query).get('pageSize')!=='1').at(-1).query);
  assert.equal(restoredQuery.get('sortBy'),'name');assert.equal(restoredQuery.get('sortDirection'),'desc');assert.equal(restoredQuery.get('page'),'1');
  assert.equal(restoredQuery.get('search'),'SKU-');assert.equal(restoredQuery.get('categoryId'),'1');assert.equal(restoredQuery.get('status'),'ACTIVE');
  assert.equal(await page.evaluate("JSON.parse(sessionStorage.getItem('f02-products-view-state')).sortBy"),'name','Legacy Unit sorting is migrated without clearing page/filters');
  assert.equal(await page.evaluate("[...document.querySelectorAll('.f02-product-table thead th')].every(e=>e.querySelectorAll('button').length<=1)&&!document.querySelector('.f02-product-table button[aria-label=\"Sort by Unit\"]')"),true,'One sort action per column; Product only sorts Name');
  assert.equal(await page.evaluate("[...document.querySelectorAll('.f02-product-table thead th')].every(e=>getComputedStyle(e).fontSize==='13px'&&getComputedStyle(e).fontWeight==='600')&&[...document.querySelectorAll('.f02-product-table .paspm-product-sort')].every(e=>getComputedStyle(e).color==='rgb(75, 85, 99)'&&getComputedStyle(e).backgroundColor==='rgba(0, 0, 0, 0)'&&getComputedStyle(e).fontWeight===(e.dataset.active==='true'?'700':'600'))"),true,'Clear neutral headers without selected green background');
  assert.equal(await page.evaluate("document.querySelectorAll('.f02-product-sort,select[aria-label=\"Product sort field\"],button[aria-label=\"Toggle product sort direction\"]').length"),0,'Sorting is only in product headers');
  assert.equal(await page.evaluate("[...document.querySelectorAll('.f02-product-table .paspm-product-sort svg')].every(e=>getComputedStyle(e).width==='14px'&&getComputedStyle(e).height==='14px')"),true,'Shared product sort icons have stable dimensions');
  for (const [label,field] of [['SKU','sku'],['Product name','name'],['Category','category'],['Cost price','costPrice'],['Selling price','sellingPrice'],['Expiry tracking','requiresExpiry'],['Total stock','stockQuantity'],['Status','status']]) {
    await ariaClick('Sort by '+label);
    await settled('Product'); let query=new URLSearchParams(calls.filter(c=>c.path==='/api/products'&&c.method==='GET').at(-1).query);
    assert.equal(query.get('sortBy'),field);
    const direction=query.get('sortDirection');
    await ariaClick('Sort by '+label);
    await settled('Product'); query=new URLSearchParams(calls.filter(c=>c.path==='/api/products'&&c.method==='GET').at(-1).query);
    assert.equal(query.get('sortDirection'),direction==='asc'?'desc':'asc');
  }
  await input('Search name or SKU','SKU-'); await input('Filter by category','1','select'); await input('Filter by status','ACTIVE','select'); await settled('Product');
  let query=new URLSearchParams(calls.filter(c=>c.path==='/api/products'&&c.method==='GET').at(-1).query);
  assert.equal(query.get('search'),'SKU-'); assert.equal(query.get('categoryId'),'1'); assert.equal(query.get('status'),'ACTIVE'); assert.equal(query.get('page'),'0');
  await click('Clear filters'); await settled('Product');
  await page.call('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
  await page.evaluate("window.scrollTo(0,220);window.keptTable=document.querySelector('.f02-product-table');window.keptHeader=window.keptTable.tHead;document.querySelector('button[aria-label=\"Sort by Cost price\"]').focus({preventScroll:true})");
  const before=await metrics(); state.heldSearches.add(''); await ariaClick('Sort by Cost price');
  await until("document.querySelector('.f02-table-frame').getAttribute('aria-busy')==='true'",'Held loading');
  assert.equal(await page.evaluate("window.keptTable===document.querySelector('.f02-product-table')&&window.keptHeader===window.keptTable.tHead"),true);
  assert.equal(await page.evaluate("document.activeElement.getAttribute('aria-label')"),'Sort by Cost price');
  const during=await metrics(); before.widths.forEach((w,i)=>closeEnough(w,during.widths[i],'Held width')); closeEnough(before.height,during.height,'Held height');
  state.heldSearches.delete(''); await settled('Product'); const after=await metrics();
  before.widths.forEach((w,i)=>closeEnough(w,after.widths[i],'Sorted width')); closeEnough(before.height,after.height,'Refetch height'); closeEnough(before.y,after.y,'Window scroll'); closeEnough(before.scroll,after.scroll,'Horizontal scroll');
  await input('Search name or SKU','FM26-0002'); await settled('Product'); await click('Edit'); await until("document.querySelector('input[aria-label=SKU]')?.value==='FM26-0002'",'Read-only legacy SKU');
  assert.equal(await page.evaluate("document.querySelector('input[aria-label=SKU]').readOnly"),true); await click('Cancel'); await click('Clear filters'); await settled('Product');
  await page.call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  const fullPageHeight=(await metrics()).height;
  await input('Search name or SKU',products.find(product=>product.id===3).sku); await settled('Product');
  assert.equal(await page.evaluate("(()=>{const r=document.querySelector('[aria-label=\"Product table\"]'),cells=r.querySelector('tbody tr').cells;return r.scrollWidth<=r.clientWidth+1&&cells[3].querySelector('[title]').title==='987,654,321.25 ₫'&&cells[4].querySelector('[title]').title==='1,234,567,890.75 ₫'&&cells[8].querySelector('button').getBoundingClientRect().right<=innerWidth})()"),true,'Large distinct prices retain full tooltips and visible Edit');
  assert.equal(await page.evaluate("[...document.querySelectorAll('.f02-product-table .f02-cell-amount')].every(e=>e.scrollWidth<=e.clientWidth+1)"),true,'Large amounts remain fully readable without clipping');
  assert.ok((await metrics()).height < fullPageHeight / 2, 'One-row page shrinks to its content'); await capture('products-large-prices-1280');
  await click('Clear filters'); await settled('Product'); await page.call('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
  checks.push('All 8 displayed Backend sort fields use single-action headers; toolbar queries whitelist; DOM/width/height/focus/scroll stable through held refetch; legacy SKU preserved');

  await click('Add product'); await has('Choose a previous unit or enter a new one.');
  assert.equal(await page.evaluate("document.querySelector('input[aria-label=SKU]').readOnly"),true);
  await has('SKU is generated automatically when the product is saved.'); assert.equal(await page.evaluate("document.querySelector('input[aria-label=SKU]').value"),'Generated after saving');
  const unitReads=calls.slice(tableStart).filter(c=>c.path==='/api/products'&&new URLSearchParams(c.query).get('pageSize')==='100');
  assert.deepEqual(unitReads.map(c=>new URLSearchParams(c.query).get('page')),['0','1']);
  await input('Unit',''); await page.evaluate("document.querySelector('input[aria-label=Unit]').focus()");
  await until("document.querySelector('[aria-label=\"Previous units\"]')?.textContent.includes('Store-only crate')",'Unit after first 100');
  const units=await page.evaluate("[...document.querySelectorAll('[aria-label=\"Previous units\"] [role=option]')].map(o=>o.textContent.trim().toLowerCase())");
  assert.equal(new Set(units).size,units.length,'Case/whitespace dedupe');
  await input('Unit','Store-only'); await until("document.querySelectorAll('[aria-label=\"Previous units\"] [role=option]').length===1",'Unit search');
  await page.evaluate("document.querySelector('[aria-label=\"Previous units\"] [role=option]').click()"); assert.equal(await page.evaluate("document.querySelector('input[aria-label=Unit]').value"),'Store-only crate');
  await input('Unit',''); await unitKey('ArrowDown'); await unitKey('Enter'); assert.ok(await page.evaluate("document.querySelector('input[aria-label=Unit]').value.length>0"),'Keyboard unit choice');
  await input('Unit',''); for(let index=0;index<9;index++) await unitKey('ArrowDown');
  assert.equal(await page.evaluate("(()=>{const o=document.querySelector('[aria-label=\"Previous units\"] [aria-selected=true]'),r=o.getBoundingClientRect(),p=o.parentElement.getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom+1})()"),true,'Keyboard keeps active unit visible without scrolling the page'); await unitKey('Escape');
  await input('Product name','A new custom unit product'); await input('Unit','Custom tray'); await input('Cost price','11'); await input('Selling price','15');
  await capture('add-product-desktop'); await click('Save product'); await has('Product created successfully.'); await settled('Product');
  assert.equal(writes().at(-1).body.unit,'Custom tray'); assert.equal(Object.hasOwn(writes().at(-1).body,'sku'),false);
  await click('Add product'); await has('Choose a previous unit or enter a new one.'); await input('Unit','Custom'); await page.evaluate("document.querySelector('input[aria-label=Unit]').focus()");
  await until("document.querySelector('[aria-label=\"Previous units\"]')?.textContent.includes('Custom tray')",'Saved custom unit cached');
  assert.equal(calls.slice(tableStart).filter(c=>c.path==='/api/products'&&new URLSearchParams(c.query).get('pageSize')==='100').length,2,'Reopening uses cache');
  await page.call('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true}); await capture('add-product-mobile'); await click('Cancel');
  await page.call('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
  await input('Search name or SKU',products.find(p=>p.name==='A new custom unit product').sku); await settled('Product'); await click('Edit');
  assert.equal(await page.evaluate("document.querySelector('input[aria-label=Unit]').value"),'Custom tray');
  await input('Product name','Edited custom unit product'); await click('Save product'); await has('Product updated successfully.'); assert.equal(writes().at(-1).body.unit,'Custom tray');
  await click('Clear filters'); await settled('Product');
  checks.push('Automatic SKU helper and read-only legacy SKU; Unit full paged Store history, dedup/search/mouse/keyboard/free entry, cache, custom unit after save and unchanged Unit on edit');

  await navigate('/store/batches'); await has('Inventory Batches'); await selectProduct(1,'SKU-00000000001'); await settled('Inventory batch'); await noHeaderFilters();
  const summary=await summaryValues();
  for (const label of ['Batch code','Received','Expiry date','Push Day','Remaining / Initial','Status']) { await ariaClick('Sort by '+label); }
  await input('Search batch code','20261119'); await input('Filter batch status','BLOCKED','select'); await input('Filter batch expiry','unset','select');
  assert.ok((await rowCells('Inventory batch')).every(row=>row[0].includes('20261119')&&row[2].startsWith('Not set')&&row[5]==='Blocked'));
  assert.deepEqual(await summaryValues(),summary); await click('Clear filters');
  await input('Search batch code','BATCH-20261119-003'); await ariaClick('Sort by Remaining / Initial');
  await batchAction('BATCH-20261119-003','Edit'); await input('Remaining quantity','5'); await click('Save batch'); await has('Batch updated successfully.'); await settled('Inventory batch');
  assert.ok((await rowCells('Inventory batch'))[0][4].startsWith('5 /'));
  await batchAction('BATCH-20261119-003','Block'); await has('Batch blocked successfully.'); await batchAction('BATCH-20261119-003','Unblock'); await has('Batch unblocked successfully.');
  assert.equal(await page.evaluate("document.querySelector('input[aria-label=\"Search batch code\"]').value"),'BATCH-20261119-003');
  await selectProduct(2,'FM26-0002'); await settled('Inventory batch'); await has('No matching batches.'); assert.equal((await summaryValues())['Total stock'],22); await click('Clear filters'); await has('NO-EXPIRY-BATCH');
  await selectProduct(1,'SKU-00000000001'); await settled('Inventory batch');
  checks.push('Batch toolbar code/status/expiry AND over all batches, six sorts, independent Summary; edit/block/unblock preserve filters; Product switch resets page and isolates rows');
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
  await page.call('Page.navigate', { url: origin + '/login' }); await has('Sign in to the system'); await login(); await navigate('/store/inventory'); await has('Product Management'); await settled('Product');
  await statsChecks();
  await tableChecks();
  const measurements=[];
  for(const [name,path,tableRegion] of [['products','/store/inventory','Product'],['categories','/store/categories','Category'],['batches','/store/batches','Inventory batch']]) {
    await navigate(path); if(name==='batches') await selectProduct(1,'SKU-00000000001'); await settled(tableRegion);
    for(const width of [1280,1366,1440,1920,820,390]) {
      await page.call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===390}); await sleep(100);
      assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true,name+' page fits '+width);
      await noHeaderFilters();
      if(name==='products') {
        const layout=await page.evaluate('(()=>{const r=document.querySelector(\'[aria-label="Product table"]\'),t=r.querySelector("table"),cards=r.querySelector(".f02-product-cards"),desktop=t.getClientRects().length>0;return {desktop,width:r.clientWidth,scrollWidth:r.scrollWidth,tableWidth:t.getBoundingClientRect().width,sku:[...r.querySelectorAll(desktop?"tbody tr:not(.f02-table-empty) .f02-product-sku":".f02-product-card .f02-product-sku")].every(e=>e.scrollWidth<=e.clientWidth+1),edits:[...r.querySelectorAll(desktop?"table .f02-product-edit":".f02-product-cards .f02-product-edit")].every(e=>{const b=e.getBoundingClientRect(),c=e.closest(desktop?"td":"article").getBoundingClientRect();return b.width>20&&b.left>=c.left&&b.right<=c.right&&b.right<=innerWidth}),headers:[...t.querySelectorAll("th")].map(e=>e.innerText.trim())}})()');
        assert.equal(layout.desktop,width>=1280,'Table on desktop; cards on smaller widths');
        assert.equal(layout.scrollWidth<=layout.width+1,true,'No horizontal Product scroll '+width); assert.equal(layout.sku,true,'Full SKU visible '+width); assert.equal(layout.edits,true,'Edit fits its cell/card and viewport '+width);
        if(width>=1280) assert.deepEqual(layout.headers,['SKU','Product','Category','Cost','Selling','Expiry','Stock','Status','Actions']);
        if(width>=1280) assert.equal(await page.evaluate("(()=>{const t=document.querySelector('.f02-product-table'),r=t.tBodies[0].rows[0],name=r.cells[1].querySelector('.f02-cell-text'),unit=r.cells[1].querySelector('.f02-product-unit'),edit=r.querySelector('.f02-product-edit');return r.cells[1].getBoundingClientRect().width/t.getBoundingClientRect().width<.21&&getComputedStyle(name).webkitLineClamp==='2'&&unit.getBoundingClientRect().top>=name.getBoundingClientRect().bottom&&edit.innerText==='Edit'&&!edit.querySelector('svg')&&getComputedStyle(edit).borderTopWidth==='1px'&&getComputedStyle(edit).whiteSpace==='nowrap'})()"),true,'Balanced Product column, two-line name, Unit below and bordered text-only Edit '+width);
        measurements.push({viewport:width,...layout});
        if(width===1366) {
          await page.evaluate("document.querySelector('.f02-product-edit').scrollIntoView({block:'center'})");
          const button=await page.evaluate("(()=>{const r=document.querySelector('.f02-product-edit').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
          await page.call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...button}); await page.call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...button}); await has('Edit product'); await click('Cancel');
        }
      }
      await page.evaluate('window.scrollTo(0,0)'); await capture(name+'-'+width);
    }
  }
  for(const call of calls.filter(c=>c.path==='/api/products')) assert.ok([...new URLSearchParams(call.query).keys()].every(key=>['search','categoryId','status','page','pageSize','sortBy','sortDirection'].includes(key)));
  assert.deepEqual(unexpected,[]); assert.deepEqual(errors,[]);
  checks.push('Actual layout at 1280/1366/1440/1920 + tablet820/mobile390: desktop Product no scroll, full SKU, all columns and clickable Edit; cards on smaller widths; 3-table screenshots and Add Product');
  console.log(JSON.stringify({result:'PASS (compact F02 controlled browser fixtures)',checks,measurements,realBackendWrites:0,artifacts},null,2));
} catch (error) {
  try { if (page) await capture('failure'); } catch {}
  console.log(JSON.stringify({ result: 'FAIL', error: error.stack, checks, errors, unexpected, lastCalls: calls.slice(-8), artifacts }, null, 2)); process.exitCode = 1;
} finally {
  closing = true; state.hold = false;
  if (page) { try { await page.call('Browser.close'); } catch {} page.ws.close(); }
  if (chrome.exitCode === null) await Promise.race([new Promise(done=>chrome.once('exit',done)), sleep(2000)]);
  if (chrome.exitCode === null) chrome.kill();
  const target = resolve(profile);
  if (dirname(target) === base && basename(target).startsWith('paspm-f02-tables-browser-')) { try { rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {} }
}
