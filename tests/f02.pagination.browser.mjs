// Fixture browser checks only; start Vite, then node tests/f02.browser.mjs.
// This is not E2E against a running Backend.
// All /api requests are intercepted before navigation. No real backend writes.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const origin = process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3102';
const base = resolve(tmpdir()), profile = mkdtempSync(join(base, 'paspm-f02-pagination-browser-'));
const artifacts = mkdtempSync(join(base, 'paspm-f02-pagination-preview-'));
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
async function capture(name) {
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
  calls.push({ path, query: url.search, method, body: payload });
  let body, responseCode = 200;
  if (path === '/api/auth/login' || path === '/api/auth/refresh') body = { accessToken: 'fixture-only-access', expiresIn: 3600, tokenType: 'Bearer', csrfToken: 'fixture-only-csrf' };
  else if (path === '/api/auth/me') body = { userId: 12, name: 'F02 Fixture', email: 'fixture@example.invalid', roleCode: state.role, storeId: 1, status: 'ACTIVE', emailVerified: true };
  else if (method !== 'GET') {
    while (state.hold && !closing) await sleep(20);
    if (state.writeError) { responseCode = 400; body = { error: state.writeError }; }
    else if (path === '/api/products' || /^\/api\/products\/\d+$/.test(path)) {
      assert.deepEqual(Object.keys(payload).filter(k=>k!=='confirmSimilarName').sort(), ['sku', 'name', 'categoryId', 'unit', 'requiresExpiry', 'sellingPrice', 'costPrice', 'status'].sort());
      if (state.productConflict === 'sku' || state.productConflict === 'other' || (state.productConflict === 'name' && !payload.confirmSimilarName)) {
        responseCode = 409;
        body = state.productConflict === 'name' ? { error: 'A similar product name exists', code: 'PRODUCT_NAME_CONFIRMATION_REQUIRED', confirmWith: 'confirmSimilarName=true' } : { error: state.productConflict === 'sku' ? 'SKU already exists in this Store' : 'Controlled unrelated conflict' };
      } else {
      assert.match(payload.sku, /^SKU-[A-Z0-9-]{11}$/);
      const id = method === 'POST' ? products.length + 1 : Number(path.split('/').at(-1));
      body = { ...products[0], ...payload, id, category: categories.find(c => c.id === payload.categoryId) || null }; delete body.categoryId;
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

const phase=process.env.F02_HEIGHT_PHASE || 'after';
const baseProduct={...products[0]}, baseCategory={...categories[0]}, baseBatch={...batches[0]};
function dataset(label,count) {
  categories.splice(0,categories.length,...Array.from({length:label==='Category'?count:2},(_,index)=>({...baseCategory,id:index+1,name:'Category '+String(index+1).padStart(4,'0'),status:index%3?'ACTIVE':'INACTIVE'})));
  products.splice(0,products.length,...Array.from({length:label==='Product'?count:2},(_,index)=>({...baseProduct,id:index+1,sku:'SKU-'+String(index+1).padStart(11,'0'),name:'Inventory product '+String(index+1).padStart(4,'0'),unit:'Bottle',category:categories[0]||null,requiresExpiry:index===0})));
  batches.splice(0,batches.length,...Array.from({length:label==='Batch'?count:2},(_,index)=>({...baseBatch,id:index+1,productId:1,batchCode:'BATCH-20261119-'+String(index+1).padStart(3,'0'),remainingQuantity:index+1,initialQuantity:index+10,receivedAt:'2026-11-18T02:00:00Z',expiryDate:'2099-12-15',pushDay:null})),...[1,2].map(id=>({...baseBatch,id:10000+id,productId:2,batchCode:'OTHER-PRODUCT-'+id,remainingQuantity:5,initialQuantity:10,expiryDate:null,pushDay:null})));
}
const regions={Category:'Category',Product:'Product',Batch:'Inventory batch'};
const paths={Category:'/store/categories',Product:'/store/inventory',Batch:'/store/batches'};
const region=label=>'[aria-label="'+regions[label]+' table"]';
const pagination=label=>'nav[aria-label="'+label+' pagination"]';
async function settled(label) { await until('document.querySelector('+JSON.stringify(region(label))+')?.closest("[aria-busy]").getAttribute("aria-busy")==="false"',label+' ready'); }
async function mount(label,choose=true) {
  await navigate(label==='Product'?'/store/categories':'/store/inventory');
  await page.evaluate("sessionStorage.removeItem('f02-products-view-state');sessionStorage.removeItem('f02-categories-view-state')");
  await navigate(paths[label]); await settled(label);
  if(label==='Batch'&&choose) { await selectProduct(1,'SKU-00000000001'); await settled(label); }
}
async function tableMetrics(label) {
  return page.evaluate('(()=>{const r=document.querySelector('+JSON.stringify(region(label))+'),t=r.querySelector("table"),frame=r.closest("[aria-busy]"),rows=[...t.tBodies[0].rows],data=rows.filter(row=>!row.querySelector("[colspan]"));return {count:data.length,totalRows:rows.length,blank:rows.some(row=>!row.innerText.trim()),height:frame.getBoundingClientRect().height,rowHeights:data.map(row=>row.getBoundingClientRect().height),emptyHeight:rows.find(row=>row.querySelector("[colspan]"))?.getBoundingClientRect().height,widths:[...t.tHead.rows[0].cells].map(cell=>cell.getBoundingClientRect().width),header:t.tHead.getBoundingClientRect().height,y:scrollY,scroll:r.scrollLeft}})()');
}
async function current(label,number) { await until('document.querySelector('+JSON.stringify(pagination(label)+' [aria-current="page"]')+')?.textContent.trim()==='+JSON.stringify(String(number)),label+' page '+number); await sleep(40); await settled(label); }
async function pageClick(label,number) { await page.evaluate('(()=>{const nav=document.querySelector('+JSON.stringify(pagination(label))+'),button=[...nav.querySelectorAll("button")].find(b=>b.textContent.trim()==='+JSON.stringify(String(number))+');if(!button||button.disabled)throw Error("Page button unavailable");button.click()})()'); await current(label,number); }
async function jump(label,target) {
  for(let step=0;step<50;step++) {
    const visible=await page.evaluate('[...document.querySelectorAll('+JSON.stringify(pagination(label)+' button')+')].filter(b=>/^\\d+$/.test(b.textContent.trim())).map(b=>Number(b.textContent.trim()))');
    if(visible.includes(target)) { await pageClick(label,target); return; }
    const next=visible.filter(number=>number<target).at(-1); if(!next) throw Error('Cannot advance pages'); await pageClick(label,next);
  }
  throw Error('Pagination did not reach target');
}
async function summary(label,from,to,total) { await until('document.querySelector('+JSON.stringify(region(label))+')?.closest(".f02-table-frame").parentElement.parentElement.innerText.includes('+JSON.stringify('Showing '+from+'\u2013'+to+' of '+total+' '+(label==='Category'?'categories':label==='Batch'?'batches':'products'))+')',label+' exact range'); }
async function captureElement(selector,name) {
  const clip=await page.evaluate('(()=>{const r=document.querySelector('+JSON.stringify(selector)+').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()');
  const shot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip});writeFileSync(join(artifacts,name+'.png'),Buffer.from(shot.data,'base64'));
  await page.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))');
}
async function assertPagination(label) {
  const result=await page.evaluate('(()=>{const n=document.querySelector('+JSON.stringify(pagination(label))+'),footer=n?.closest(".f02-pagination");return {numbers:n?[...n.querySelectorAll("button")].filter(b=>/^\\d+$/.test(b.textContent.trim())).map(b=>Number(b.textContent.trim())):[],ellipses:n?[...n.querySelectorAll(".f02-page-ellipsis")].map(e=>({tag:e.tagName,text:e.textContent})):[],noOverflow:!n||n.scrollWidth<=n.clientWidth+1&&footer.scrollWidth<=footer.clientWidth+1,range:footer?.querySelector(".f02-page-range")?.textContent}})()');
  assert.ok(result.numbers.length<=7,'At most 7 numbered buttons'); assert.equal(result.noOverflow,true,'Pagination has no horizontal overflow');
  assert.ok(result.ellipses.every(e=>e.tag!=='BUTTON'&&e.text.includes('\u2026')),'Ellipsis is not a button'); return result;
}
const measurements=[];
async function afterChecks() {
  dataset('Batch',0); await mount('Batch',false);
  assert.equal(await page.evaluate("[...document.querySelectorAll('[aria-label=\"Batch filters\"] input,[aria-label=\"Batch filters\"] select')].every(e=>e.disabled)"),true,'Batch filters disabled without selected Product');
  await has('Choose a product to view its batches.'); assert.ok((await tableMetrics('Batch')).height<=190); await capture('batch-no-product');
  for(const label of ['Category','Product','Batch']) {
    for(const count of [0,1,2,9,10,11]) {
      dataset(label,count); await mount(label);
      const m=await tableMetrics(label), expected=Math.min(10,count);
      assert.equal(m.count,expected,label+' real rows '+count); assert.equal(m.blank,false,'No filler row'); assert.equal(m.totalRows,expected||1,'Only actual rows or one empty message');
      if(count===0) { assert.ok(m.height>=120&&m.height<=190,label+' compact empty'); assert.ok(m.emptyHeight<=132); }
      else { assert.ok(m.rowHeights.every(height=>height>=60&&height<=77),label+' moderate rows'); assert.ok(m.height<=66+77*expected,label+' adaptive height'); }
      await summary(label,count?1:0,expected,count);
      if(count<=10) assert.equal(await page.evaluate('Boolean(document.querySelector('+JSON.stringify(pagination(label))+'))'),false,'Single page hides controls');
      else {
        await pageClick(label,2); const last=await tableMetrics(label); assert.equal(last.count,1); assert.ok(last.height<150,'Last single row shrinks'); await summary(label,11,11,11);
        await captureElement(region(label),label.toLowerCase()+'-11-last-one'); await pageClick(label,1);
      }
      if([0,2,10,11].includes(count)) await captureElement(region(label),label.toLowerCase()+'-'+count+'-records');
      if(label==='Batch'&&count===2) { await page.evaluate('window.scrollTo(0,0)'); await capture('after-batches-two-desktop'); }
      measurements.push({label,records:count,...m});
    }
    dataset(label,361); await mount(label); let p=await assertPagination(label);
    assert.deepEqual(p.numbers,[1,2,3,37]); await summary(label,1,10,361);
    assert.equal(await page.evaluate('document.querySelector('+JSON.stringify(pagination(label)+' button')+').disabled'),true,'Previous disabled first');
    await captureElement('.f02-pagination',label.toLowerCase()+'-pagination-start');
    await jump(label,19); p=await assertPagination(label); assert.deepEqual(p.numbers,[1,17,18,19,20,21,37]); await summary(label,181,190,361);
    await page.evaluate('window.scrollTo(0,180);window.keptTable=document.querySelector('+JSON.stringify(region(label)+' table')+');window.keptHead=window.keptTable.tHead;void 0'); const before=await tableMetrics(label);
    const sortLabel=label==='Category'?'ID':label==='Product'?'Cost price':'Batch code';
    if(label==='Product') state.heldSearches.add('');
    await ariaClick('Sort by '+sortLabel);
    if(label==='Product') { await until("document.querySelector('.f02-table-frame').getAttribute('aria-busy')==='true'",'Held refetch'); const during=await tableMetrics(label); assert.equal(during.height,before.height); state.heldSearches.delete(''); }
    await settled(label); const after=await tableMetrics(label);
    assert.equal(await page.evaluate('window.keptTable===document.querySelector('+JSON.stringify(region(label)+' table')+')&&window.keptHead===window.keptTable.tHead'),true,'DOM retained');
    before.widths.forEach((w,index)=>assert.ok(Math.abs(w-after.widths[index])<1.1,label+' stable column '+index+' '+JSON.stringify({before,after}))); assert.ok(Math.abs(before.height-after.height)<1.1,label+' same-size height '+JSON.stringify({before,after})); assert.ok(Math.abs(before.y-after.y)<1.1,'Sort keeps scroll');
    await jump(label,19); await captureElement('.f02-pagination',label.toLowerCase()+'-pagination-middle');
    await pageClick(label,37); await summary(label,361,361,361); p=await assertPagination(label); assert.deepEqual(p.numbers,[1,35,36,37]); assert.equal((await tableMetrics(label)).count,1);
    assert.equal(await page.evaluate('[...document.querySelectorAll('+JSON.stringify(pagination(label)+' button')+')].at(-1).disabled'),true,'Next disabled last'); await captureElement('.f02-pagination',label.toLowerCase()+'-pagination-end');
    await page.call('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true}); await sleep(60); await assertPagination(label);
    assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true,'Mobile no page overflow');
    assert.equal(await page.evaluate('(()=>{const n=document.querySelector('+JSON.stringify(pagination(label))+'),numbers=n.querySelector(".f02-page-numbers"),status=n.querySelector(".f02-page-position");return !numbers.getClientRects().length&&status.getClientRects().length>0&&status.textContent==="Page 37 of 37"})()'),true,'Mobile Previous / Page X of Y / Next');
    await captureElement('.f02-pagination',label.toLowerCase()+'-pagination-mobile');
    if(label==='Product') { assert.equal(await page.evaluate("document.querySelector('.f02-product-cards').getBoundingClientRect().height<400"),true,'Single card has no 640px minimum'); }
    await page.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await jump(label,19);
    const searchLabel=label==='Category'?'Search category name':label==='Product'?'Search name or SKU':'Search batch code';
    const search=label==='Category'?'Category 0361':label==='Product'?'SKU-00000000361':'BATCH-20261119-361';
    await input(searchLabel,search); await sleep(50); await settled(label); await summary(label,1,1,1); assert.equal((await tableMetrics(label)).count,1); assert.equal(await page.evaluate('Boolean(document.querySelector('+JSON.stringify(pagination(label))+'))'),false,'Filter clamps to single page');
    await input(searchLabel,'no-matches'); await sleep(50); await settled(label); await summary(label,0,0,0); assert.equal((await tableMetrics(label)).count,0); assert.ok((await tableMetrics(label)).height<=190); await click('Clear filters'); await settled(label);
    checks.push(label+': counts 0/1/2/9/10/11, 37 pages, last single row, AND-filter page reset, fixed columns/DOM/scroll under sort, compact mobile pagination');
  }
  dataset('Batch',11); await mount('Batch'); await selectProduct(2,'SKU-00000000002'); await settled('Batch'); assert.equal((await tableMetrics('Batch')).count,2); assert.ok((await tableMetrics('Batch')).height<220); await selectProduct(1,'SKU-00000000001'); await settled('Batch'); assert.equal((await tableMetrics('Batch')).count,10);
  dataset('Batch',2); await mount('Batch'); await page.call('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true}); await capture('after-batches-two-mobile');
  assert.equal(await page.evaluate("document.querySelectorAll('.f02-table-space').length"),0,'No spacers remain');
  checks.push('Batch no Product disables filters; Product switch 11 ? 2 ? 11; actions and Inventory Summary preserved');
}
try {
  const portFile=join(profile,'DevToolsActivePort');for(let i=0;i<150&&!existsSync(portFile);i++)await sleep(100);assert.ok(existsSync(portFile),'Chrome started');
  const port=readFileSync(portFile,'utf8').split('\n')[0],targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((done,reject)=>{ws.addEventListener('open',done,{once:true});ws.addEventListener('error',reject,{once:true})});page=new CDP(ws);
  page.on('Fetch.requestPaused',data=>fixture(data).catch(error=>{if(!closing&&!/Invalid InterceptionId/.test(error.message))errors.push(error.message)}));page.on('Runtime.exceptionThrown',data=>errors.push(data.exceptionDetails.exception?.description||data.exceptionDetails.text));
  await page.call('Page.enable');await page.call('Runtime.enable');await page.call('Fetch.enable',{patterns:[{urlPattern:'*'}]});await page.call('Emulation.setTimezoneOverride',{timezoneId:'Asia/Ho_Chi_Minh'});await page.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await page.call('Page.navigate',{url:origin+'/login'});await has('Sign in to the system');await login();
  if(phase==='before') { dataset('Batch',2);await mount('Batch');await capture('before-batches-two-desktop');await page.call('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true});await capture('before-batches-two-mobile'); }
  else await afterChecks();
  assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);console.log(JSON.stringify({result:'PASS (height/pagination controlled fixtures)',phase,checks,measurements,realBackendWrites:0,artifacts},null,2));
} catch(error) {try{if(page)await capture('failure')}catch{}console.log(JSON.stringify({result:'FAIL',error:error.stack,checks,errors,unexpected,lastCalls:calls.slice(-8),artifacts},null,2));process.exitCode=1;
} finally {closing=true;state.hold=false;if(page){try{await page.call('Browser.close')}catch{}page.ws.close()}if(chrome.exitCode===null)await Promise.race([new Promise(done=>chrome.once('exit',done)),sleep(2000)]);if(chrome.exitCode===null)chrome.kill();const target=resolve(profile);if(dirname(target)===base&&basename(target).startsWith('paspm-f02-pagination-browser-')){try{rmSync(target,{recursive:true,force:true,maxRetries:3,retryDelay:100})}catch{}}}
