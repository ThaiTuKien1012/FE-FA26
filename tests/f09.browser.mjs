// Isolated browser fixtures: no requests or writes reach a real backend.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const origin = process.env.F09_TEST_ORIGIN || 'http://127.0.0.1:3000';
const artifacts = mkdtempSync(join(tmpdir(), 'paspm-f09-browser-'));
const chrome = spawn(process.env.F09_TEST_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + artifacts, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws, serial = 0, mode = 'empty', closing = false;
const pending = new Map(), calls = [], errors = [], unexpected = [], checks = [];
const stores = [{ storeSlug: 'shop-a', name: 'Cửa hàng A' }, { storeSlug: 'shop-b', name: 'Cửa hàng B' }];
const product = id => ({ productId: id, name: `Sản phẩm API ${id}`, description: 'Mô tả từ API', imageUrl: null, unit: 'pack', sellingPrice: id * 1000, category: { categoryId: 7, name: 'Đồ khô' }, availability: id === 2 ? 'UNAVAILABLE' : 'AVAILABLE' });
const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++serial; const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000); pending.set(id, { resolve: result => { clearTimeout(timer); resolve(result); }, reject }); ws.send(JSON.stringify({ id, method, params })); });
async function evaluate(expression) { const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result?.value; }
async function until(expression, label = expression) { for (let i = 0; i < 160; i++) { if (await evaluate(expression)) return; await sleep(60); } throw new Error('UI timeout: ' + label); }
const has = text => until(`document.body.innerText.includes(${JSON.stringify(text)})`, text);
async function click(text) { const selector = `[...document.querySelectorAll('button')].find(button=>!button.disabled&&(button.getAttribute('aria-label')===${JSON.stringify(text)}||button.textContent.trim()===${JSON.stringify(text)}))`; await until(`Boolean(${selector})`, text); await evaluate(`${selector}.click()`); }
async function go(path) { await call('Page.navigate', { url: origin + path }); await until('document.readyState === "complete"'); }
async function capture(name) { const result = await call('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(artifacts, name + '.png'), Buffer.from(result.data, 'base64')); }
async function fixture({ requestId, request }) {
  const url = new URL(request.url), path = url.pathname;
  if (!path.startsWith('/api/')) return call(url.origin === origin ? 'Fetch.continueRequest' : 'Fetch.failRequest', { requestId, ...(url.origin === origin ? {} : { errorReason: 'BlockedByClient' }) });
  calls.push({ path, method: request.method, query: url.search, headers: request.headers });
  let body, code = 200;
  if (path.startsWith('/api/auth/')) { code = 401; body = { error: 'Anonymous fixture' }; }
  else if (path === '/api/storefront/stores') {
    if (mode === 'network') return call('Fetch.failRequest', { requestId, errorReason: 'InternetDisconnected' });
    body = mode === 'empty' ? [] : stores;
  } else if (path.startsWith('/api/storefront/missing/')) { code = 404; body = { error: 'Storefront not found' }; }
  else if (/^\/api\/storefront\/shop-[ab]\/home$/.test(path)) {
    const store = path.includes('shop-a') ? stores[0] : stores[1];
    if (mode === 'home-unavailable') { code = 503; body = { error: 'Storefront layout capacities are not configured' }; }
    else body = { store, campaignName: store === stores[0] ? 'Campaign API' : null, fallbackType: store === stores[1] ? 'DEFAULT_CATALOG' : null, zones: store === stores[0] ? [{ name: 'BUNDLE', placements: [{ type: 'BUNDLE', blockNo: 3, startPosition: 1, products: [product(1), product(2)] }] }] : [], catalog: [] };
  } else if (/^\/api\/storefront\/shop-[ab]\/products$/.test(path)) {
    const currentMode = mode;
    if (currentMode === 'slow-a' && path.includes('shop-a')) await sleep(600);
    const page = Number(url.searchParams.get('page')), search = url.searchParams.get('search') || '';
    const items = path.includes('shop-b') || search === 'no matches' ? [] : search ? [product(21)] : Array.from({ length: page === 0 ? 20 : 1 }, (_, index) => product(page * 20 + index + 1));
    body = { items, page, pageSize: 20, totalElements: path.includes('shop-b') || search === 'no matches' ? 0 : search ? 1 : 21 };
  } else if (path === '/api/storefront/shop-a/products/1') body = product(1);
  else if (path === '/api/storefront/shop-a/products/999') { code = 404; body = { error: 'Product not found' }; }
  else { unexpected.push(path); code = 599; body = { error: 'Unexpected fixture endpoint' }; }
  await call('Fetch.fulfillRequest', { requestId, responseCode: code, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') });
}
try {
  for (let i = 0; i < 100 && !existsSync(join(artifacts, 'DevToolsActivePort')); i++) await sleep(100);
  const port = readFileSync(join(artifacts, 'DevToolsActivePort'), 'utf8').split('\n')[0];
  const target = (await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()).find(tab => tab.type === 'page');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  ws.addEventListener('message', event => {
    const data = JSON.parse(event.data);
    if (data.id) { const promise = pending.get(data.id); pending.delete(data.id); if (promise) data.error ? promise.reject(new Error(data.error.message)) : promise.resolve(data.result); }
    else if (data.method === 'Fetch.requestPaused') void fixture(data.params).catch(error => { if (!closing && !error.message.includes('Invalid InterceptionId')) errors.push(error.message); });
    else if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
  });
  await call('Runtime.enable'); await call('Page.enable'); await call('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await go('/customer-home'); await has('Chưa có cửa hàng nào được mở công khai.');
  assert.equal(await evaluate("document.querySelectorAll('.fm-product').length"), 0);
  checks.push('empty store list has no invented stores or products');
  mode = 'network'; await go('/customer-home'); await has('Không tải được dữ liệu cửa hàng.');
  mode = 'active'; await click('Thử lại'); await has('Campaign API'); await has('1–20 / 21 sản phẩm');
  assert.equal(await evaluate("document.body.innerText.includes('Tạm hết hàng')"), true);
  assert.equal(await evaluate("document.body.innerText.includes('Tạp hóa Thảo Điền') || document.body.innerText.includes('Thêm vào giỏ') || document.body.innerText.includes('Bản xem thử')"), false);
  await capture('f09-home-desktop');
  await click('Sau'); await has('21–21 / 21 sản phẩm');
  await evaluate("(()=>{const input=document.querySelector('[aria-label=\"Tìm sản phẩm\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'no matches');input.dispatchEvent(new Event('input',{bubbles:true}));})()");
  await has('Không tìm thấy sản phẩm phù hợp.');
  assert.ok(calls.some(item => item.query.includes('search=no+matches')));
  await click('Xóa bộ lọc'); await has('1–20 / 21 sản phẩm');
  checks.push('public API home, availability, server pagination, search and reset');
  await click('Xem Sản phẩm API 1'); await has('Mô tả từ API');
  assert.equal(await evaluate('location.pathname'), '/storefront/shop-a/products/1');
  await call('Page.reload'); await has('Mô tả từ API');
  assert.ok(calls.filter(item => item.path === '/api/storefront/shop-a/products/1').length >= 2);
  await capture('f09-product-desktop');
  checks.push('Store-scoped product detail survives reload');
  await go('/storefront/shop-a/products/999'); await has('Sản phẩm không còn được công khai');
  await go('/storefront/missing'); await has('Cửa hàng không tồn tại');
  mode = 'home-unavailable'; await go('/storefront/shop-a'); await has('Trang trưng bày của cửa hàng tạm thời chưa sẵn sàng'); await has('1–20 / 21 sản phẩm');
  checks.push('404 and 503 are shown without mock fallback; catalog is independent of homepage failure');
  mode = 'slow-a'; await go('/storefront/shop-a'); await has('Cửa hàng B');
  await evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Cửa hàng B')).click()");
  await has('Cửa hàng chưa có sản phẩm công khai.'); await sleep(750);
  assert.equal(await evaluate('location.pathname'), '/storefront/shop-b');
  assert.equal(await evaluate("document.querySelectorAll('.fm-product').length"), 0);
  checks.push('switching Stores discards pending results and preserves an empty Store');
  mode = 'active'; await go('/storefront/shop-a'); await has('1–20 / 21 sản phẩm');
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await capture('f09-mobile');
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth + 2'), false, 'No mobile overflow');
  const publicCalls = calls.filter(item => item.path.startsWith('/api/storefront/'));
  assert.ok(publicCalls.every(item => item.method === 'GET' && !Object.keys(item.headers).some(name => name.toLowerCase() === 'authorization')));
  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS', checks, realBackendWrites: 0, artifacts }, null, 2));
} finally { closing = true; ws?.close(); chrome.kill(); }
