// Run with Vite serving locally: node --import tsx tests/customer-home.browser.mjs
// The customer home (/customer-home), driven in a real (headless) browser. Every Store, product, price and
// bundle on it comes from the public F09 API, answered here by the shared storefrontFixture():
//   1. the restored design is shown with real data: header and navigation, hero carousel, product cards, Store cards;
//   2. Store cards (icon/banner behaviour), hero banner fallback (art when the Store has no banner or it fails);
//   3. navigation: Store card -> storefront, back to the home, product card -> product page, bundle -> its Store;
//   4. search, Store-local category and saved filters; loading/empty/error/partial-failure states; bundles from the API;
//   5. a 390 px wide screen has no horizontal overflow; a signed-in End-Customer keeps the home (no join banner).
// All API traffic is intercepted with fixtures, never a real backend, account or cart write.
// Any request outside the fixtures lands in `unexpected` and fails the test.
import assert from 'node:assert/strict';
import { waitForDevToolsPage } from './browser-devtools.mjs';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { storefrontFixture, STOREFRONT_PRODUCT, STOREFRONT_PRODUCT_ID, STOREFRONT_SLUG, STOREFRONT_STORE,
  STOREFRONT_WITH_IMAGES, STOREFRONT_WITH_BROKEN_IMAGES } from './storefront.fixtures.ts';

const origin = process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3000';
const base = resolve(tmpdir());
const profile = mkdtempSync(join(base, 'paspm-customer-home-'));
const chrome = spawn(process.env.CUSTOMER_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
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
// `stores`, `productsStatus` and `bundle` bend the shared fixture for the empty/error/partial/bundle states only.
const state = { role: 'END_CUSTOMER', storeId: null, storefront: STOREFRONT_STORE, stores: null, productsStatus: 200, bundle: false };
const pixelPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
async function until(expression, label) {
  const end = Date.now() + 12000;
  while (Date.now() < end) { if (await page.evaluate(expression)) return; await sleep(40); }
  throw new Error('UI timeout: ' + label);
}
const where = () => page.evaluate('location.pathname + location.search');
const text = () => page.evaluate('document.body.innerText');
const has = label => until(`document.body.innerText.includes(${JSON.stringify(label)})`, label);
const hasNot = label => until(`!document.body.innerText.includes(${JSON.stringify(label)})`, 'absent: ' + label);
async function openHome(width = 1440) {
  await page.call('Emulation.setDeviceMetricsOverride', { width, height: width < 600 ? 844 : 1080, deviceScaleFactor: 1, mobile: width < 600 });
  await page.call('Page.navigate', { url: origin + '/customer-home' });
  await until('location.pathname === "/customer-home"', 'home URL');
}
const buttonByLabel = label => `[...document.querySelectorAll("button")].find(b=>(b.innerText.trim()===${JSON.stringify(label)}||b.getAttribute("aria-label")===${JSON.stringify(label)})&&!b.disabled)`;
async function clickText(label) {
  await until(`!!(${buttonByLabel(label)})`, 'button ' + label);
  assert.equal(await page.evaluate(`(()=>{const b=${buttonByLabel(label)};if(!b)return false;b.click();return true;})()`), true, 'Clickable button: ' + label);
}
async function setValue(id, value) {
  await page.evaluate('(()=>{const e=document.getElementById(' + JSON.stringify(id) + ');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(e,' + JSON.stringify(value) + ');e.dispatchEvent(new Event("input",{bubbles:true}));})()');
}
async function setSearch(value) {
  await page.evaluate('(()=>{const e=document.querySelector("input[aria-label=\\"Tìm sản phẩm\\"]");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(e,' + JSON.stringify(value) + ');e.dispatchEvent(new Event("input",{bubbles:true}));})()');
}
async function signInThroughForm(role) {
  state.role = role; state.storeId = role === 'MERCHANDISER' ? 1 : null;
  await until('!!document.querySelector("#identifier")', 'Sign-in form');
  await setValue('identifier', 'fixture@example.invalid'); await setValue('passcode', 'Fixture-password-2026!');
  await page.evaluate('document.querySelector("#identifier").closest("form").requestSubmit()');
}
async function signOutLocally() {
  await page.evaluate('localStorage.clear();sessionStorage.clear()');
  await page.call('Network.clearBrowserCookies');
}
const json = (value, status = 200) => ({ status, body: value });
async function fixture({ requestId, request }) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/videos/')) return page.call('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
  if (!url.pathname.startsWith('/api/')) return page.call(url.origin === origin ? 'Fetch.continueRequest' : 'Fetch.failRequest', {
    requestId, ...(url.origin === origin ? {} : { errorReason: 'BlockedByClient' })
  });
  calls.push({ path: url.pathname, method: request.method, query: url.searchParams });
  if ([STOREFRONT_WITH_IMAGES.iconUrl, STOREFRONT_WITH_IMAGES.bannerUrl].includes(url.pathname)) {
    return page.call('Fetch.fulfillRequest', { requestId, responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'image/png' }], body: pixelPng });
  }
  let responseCode = 200, body, front;
  if (['/api/auth/login', '/api/auth/refresh'].includes(url.pathname)) body = { accessToken: 'fixture-access', expiresIn: 3600, tokenType: 'Bearer', csrfToken: 'fixture-csrf' };
  else if (url.pathname === '/api/auth/me') body = { userId: 12, name: 'Customer Fixture', email: 'fixture@example.invalid', roleCode: state.role, storeId: state.storeId, status: 'ACTIVE', emailVerified: true };
  else if ([STOREFRONT_WITH_BROKEN_IMAGES.iconUrl, STOREFRONT_WITH_BROKEN_IMAGES.bannerUrl].includes(url.pathname)) {
    responseCode = 404; body = { error: 'Missing image fixture' };
  }
  else if (url.pathname === '/api/storefront/stores' && state.stores) ({ status: responseCode, body } = state.stores);
  else if (url.pathname === `/api/storefront/${STOREFRONT_SLUG}/products` && state.productsStatus !== 200) {
    responseCode = state.productsStatus; body = { error: 'Fixture products failure' };
  }
  else if (front = storefrontFixture(url.pathname, request.method, state.storefront)) {
    responseCode = front.status; body = front.body;
    if (state.bundle && url.pathname === `/api/storefront/${STOREFRONT_SLUG}/products` && url.searchParams.get('pageSize') === '100') {
      const page = Number(url.searchParams.get('page'));
      const item = page === 0 ? STOREFRONT_PRODUCT : { ...STOREFRONT_PRODUCT, productId: 503, category: { categoryId: 8, name: 'Pantry' } };
      body = { items: [item], page, pageSize: 100, totalElements: 101 };
    }
    if (state.bundle && url.pathname === `/api/storefront/${STOREFRONT_SLUG}/home`) {
      body = { ...body, fallbackType: null, catalog: [], zones: [{ name: 'BUNDLE', placements: [{
        type: 'BUNDLE', blockNo: 1, startPosition: 1, bundleKey: 'bundle-key-1',
        products: [STOREFRONT_PRODUCT, { ...STOREFRONT_PRODUCT, productId: 502, name: 'Fixture granola', availability: 'OUT_OF_STOCK' }] }] }] };
    }
  }
  else { unexpected.push(request.method + ' ' + url.pathname + url.search); responseCode = 500; body = { error: 'Unexpected fixture endpoint' }; }
  return page.call('Fetch.fulfillRequest', { requestId, responseCode, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') });
}
const bannerImage = id => `document.querySelector('[data-banner-id="store-${STOREFRONT_SLUG}"] img')`;
try {
  const pageUrl = await waitForDevToolsPage(profile);
  assert.ok(pageUrl, 'Chrome DevTools started');
  const ws = new WebSocket(pageUrl);
  await new Promise((done, reject) => { ws.addEventListener('open', done, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  page = new CDP(ws);
  page.on('Fetch.requestPaused', data => fixture(data).catch(error => { if (!closing && !/Invalid InterceptionId/.test(error.message)) errors.push(error.message); }));
  page.on('Runtime.exceptionThrown', data => errors.push(data.exceptionDetails.exception?.description || data.exceptionDetails.text));
  await page.call('Page.enable'); await page.call('Runtime.enable'); await page.call('Network.enable');
  await page.call('Network.setCacheDisabled', { cacheDisabled: true });
  await page.call('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  // Keep the carousel still so slide checks do not race with the timer.
  await page.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

  const saveEvidence = async name => {
    if (!process.env.PASPM_UX_EVIDENCE) return;
    const screenshot = await page.call('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(process.env.PASPM_UX_EVIDENCE, name + '.png'), Buffer.from(screenshot.data, 'base64'));
  };

  // 1. The restored design, fed by the F09 fixture.
  await openHome();
  await until('!!document.querySelector(".fm-product")', 'product card');
  for (const [selector, label] of [['.fm-topbar', 'top bar'], ['.fm-header', 'header'], ['.fm-navbar', 'navigation bar'],
    ['section[aria-roledescription="carousel"]', 'hero carousel'], ['#fm-products', 'product section'],
    ['#fm-stores', 'Store section'], ['#fm-collections', 'collection tiles'], ['#fm-help', 'help section'], ['#fm-join', 'join banner'], ['#fm-footer', 'footer']]) {
    assert.equal(await page.evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), true, 'Restored section: ' + label);
  }
  assert.equal(await page.evaluate('document.title'), 'RetailSpace | Stores, Brands & Everyday Favorites');
  const card = await page.evaluate('document.querySelector(".fm-product").innerText');
  for (const expected of [STOREFRONT_PRODUCT.name, 'Dairy', 'Bán tại Fixture Store', '32.001 ₫', 'Xem sản phẩm']) assert.ok(card.includes(expected), 'Product card shows ' + expected + ': ' + card);
  assert.equal(await page.evaluate('!document.querySelector(".fm-add-cart")'), true, 'The home has no add-to-cart: a cart belongs to one Store');
  assert.equal(await page.evaluate("document.querySelector('#fm-stores h2')?.textContent"), 'Khám phá cửa hàng');
  assert.equal(await page.evaluate("!document.querySelector('#fm-categories,.fm-category-tabs') && (document.querySelector('#fm-stores').compareDocumentPosition(document.querySelector('#fm-products')) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0"), true);
  assert.ok(calls.some(call => call.method === 'GET' && call.path === '/api/storefront/stores'));
  assert.equal(await page.evaluate("[...document.querySelectorAll('.fm-header button')].filter(b=>b.innerText.trim()==='Đăng nhập').length"), 1);
  await saveEvidence('after-home-header');
  await page.evaluate("document.querySelector('#fm-stores').scrollIntoView()");
  await saveEvidence('after-home-directory');
  const page1 = await text();
  assert.ok(page1.includes('1 sản phẩm'), 'Store card shows the API product total');
  // Mock leftovers of the old design must not come back.
  for (const forbidden of ['Bản xem thử', 'minh họa', 'Ưu đãi', 'Mới trên', 'Thảo Điền', 'Ba Đình', 'Hải Châu', 'Ninh Kiều']) assert.ok(!page1.includes(forbidden), 'No mock copy: ' + forbidden);
  assert.equal(await page.evaluate('!document.querySelector("#fm-bundles")'), true, 'No bundle section without a bundle placement');
  assert.equal(await page.evaluate('[...document.images].every(i=>!i.src.includes("/images/customer-home/fresh/")||i.closest("#fm-collections,.fm-join"))'), true, 'No static mock product pictures');
  checks.push('Restored homepage design with Store, product and price data from the F09 fixture');

  // 2. Store card icon/banner behaviour and the hero banner fallback, for each Store image state.
  const cardIcon = 'img[alt="Biểu tượng Fixture Store"]';
  const cardBanner = 'img[alt="Ảnh bìa Fixture Store"]';
  const loaded = selector => `document.querySelector(${JSON.stringify('.home-store-card ' + selector)})?.naturalWidth > 0`;
  for (const [mode, store] of [['available', STOREFRONT_WITH_IMAGES], ['null', STOREFRONT_STORE], ['broken', STOREFRONT_WITH_BROKEN_IMAGES]]) {
    state.storefront = store;
    await openHome();
    await until('!!document.querySelector(".home-store-card")', 'Store card: ' + mode);
    if (mode === 'available') {
      await until(`${loaded(cardIcon)} && ${loaded(cardBanner)}`, 'Store card icon and banner decoded');
      await until(`${bannerImage()}?.dataset.bannerSource === "store" && ${bannerImage()}.naturalWidth > 0`, 'Hero uses the Store banner');
      assert.equal(await page.evaluate(`${bannerImage()}.getAttribute("alt")`), 'Ảnh bìa Fixture Store');
    } else {
      await until('!!document.querySelector(".home-store-card svg.lucide-store")', 'Default Store icon: ' + mode);
      await until(`!document.querySelector(${JSON.stringify('.home-store-card ' + cardBanner)})`, 'No Store card banner: ' + mode);
      // Hero: decorative art, never a broken image, whether the Store has no banner or its banner is a 404.
      await until(`${bannerImage()}?.dataset.bannerSource === "art" && ${bannerImage()}.naturalWidth > 0`, 'Hero falls back to the static art: ' + mode);
      assert.match(await page.evaluate(`${bannerImage()}.getAttribute("src")`), /^\/images\/customer-home\/banners\/[a-z]+\.jpg$/);
      assert.equal(await page.evaluate(`${bannerImage()}.getAttribute("alt")`), '', 'Decorative art has empty alt');
    }
    checks.push('Store images and hero banner: ' + mode);
  }
  state.storefront = STOREFRONT_STORE;

  // 3. Navigation from the home.
  await openHome();
  await until('!!document.querySelector(".home-store-card")', 'Store card');
  await page.evaluate('document.querySelector(".home-store-card").click()');
  await until(`location.pathname + location.search === "/storefront?store=${STOREFRONT_SLUG}"`, 'Store storefront');
  await until('document.querySelector("#shop-main h1")?.textContent === "Fixture Store"', 'Store heading');
  await until("!!document.querySelector('#shop-products select[aria-label=\"Danh mục sản phẩm\"] option[value=\"7\"]')", 'category from Store products');
  const from = calls.length;
  await page.evaluate(`(()=>{const select=document.querySelector('#shop-products select[aria-label="Danh mục sản phẩm"]');select.value='7';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await until("document.querySelector('#shop-products select').value==='7' && document.querySelector('#shop-products').innerText.includes('Fixture oat milk')", 'selected Store category');
  assert.ok(calls.slice(from).some(call=>call.path===`/api/storefront/${STOREFRONT_SLUG}/products` && call.query.get('categoryId')==='7'));
  await page.evaluate("document.querySelector('#shop-products').scrollIntoView()");
  await saveEvidence('after-store-category');
  await clickText('Các cửa hàng');
  await until('location.pathname === "/customer-home" && !!document.querySelector(".home-store-card")', 'back on the home');
  await page.evaluate('document.querySelector(".fm-view-product").click()');
  await until(`location.pathname + location.search === "/product/${STOREFRONT_PRODUCT_ID}?store=${STOREFRONT_SLUG}"`, 'product page');
  await has(STOREFRONT_PRODUCT.name);
  checks.push('Home -> Store -> back to home -> product page');

  // 4a. Search, Store and saved filters on the home.
  await openHome();
  await until('!!document.querySelector(".fm-product")', 'product card');
  await setSearch('OAT'); await has('Hiển thị 1/1 sản phẩm');
  await setSearch('khong co'); await has('Không tìm thấy sản phẩm');
  assert.equal(await page.evaluate('document.querySelectorAll(".fm-product").length'), 0);
  await clickText('Xóa bộ lọc'); await until('document.querySelectorAll(".fm-product").length === 1', 'filters cleared');
  await setSearch('sua'); await has('Không tìm thấy sản phẩm'); await clickText('Xóa bộ lọc');
  await clickText(`Lưu ${STOREFRONT_PRODUCT.name}`);
  await until(`!!document.querySelector('button[aria-label="Sản phẩm đã lưu (1)"]')`, 'saved count');
  await clickText('Sản phẩm đã lưu (1)'); await until('document.querySelectorAll(".fm-product").length === 1', 'saved only');
  await clickText('Sản phẩm đã lưu (1)');
  await clickText(`Bỏ lưu ${STOREFRONT_PRODUCT.name}`); await clickText('Sản phẩm đã lưu (0)');
  await has('Chưa có sản phẩm đã lưu'); await clickText('Sản phẩm đã lưu (0)');
  checks.push('Search (case and diacritics), saved filters and Store-local category');

  // 4b. Loading is followed by empty, error, retry and partial-failure states.
  state.stores = json([]);
  await openHome();
  await has('Chưa có cửa hàng đang hoạt động.'); await has('Chưa có sản phẩm để hiển thị');
  assert.equal(await page.evaluate('document.querySelectorAll("section[aria-roledescription=carousel] [data-banner-id]").length'), 1, 'Only the decorative welcome slide');
  state.stores = json({ error: 'down' }, 503);
  await openHome();
  await has('Dịch vụ tạm thời không khả dụng. Vui lòng thử lại.');
  assert.equal(await page.evaluate('!document.querySelector(".home-store-card")'), true);
  state.stores = null;
  await clickText('Thử lại'); await until('!!document.querySelector(".home-store-card")', 'retry recovers');
  state.productsStatus = 500;
  await openHome();
  await has('Chưa tải đủ sản phẩm của 1/1 cửa hàng');
  await until('!!document.querySelector(".home-store-card")', 'Store card despite product failure');
  state.productsStatus = 200;
  checks.push('Empty, error + retry and partial-failure states');

  // 4c. Bundles come from the BUNDLE placements of the Store homepage and open their Store.
  state.bundle = true;
  await openHome();
  await until('!!document.querySelector("#fm-bundles .home-bundle-card")', 'bundle card');
  const bundleText = await page.evaluate('document.querySelector("#fm-bundles").innerText');
  for (const expected of ['Gói sản phẩm', `${STOREFRONT_PRODUCT.name} + Fixture granola`, 'Bán tại Fixture Store', 'Một số sản phẩm hết hàng']) assert.ok(bundleText.includes(expected), 'Bundle card shows ' + expected);
  await clickText('Xem gói tại cửa hàng');
  await until(`location.pathname + location.search === "/storefront?store=${STOREFRONT_SLUG}"`, 'bundle opens its Store');
  await until('[...document.querySelectorAll("button")].some(b=>b.innerText.includes("Thêm gói vào giỏ"))', 'bundle add stays on the Store page');
  await until("document.querySelector('#shop-products select option[value=\"8\"]')?.textContent==='Pantry'", 'category from a later catalog page during an active campaign');
  state.bundle = false;
  checks.push('Bundles open in their Store; campaign Store categories include unplaced products from later catalog pages');

  // 5a. A narrow screen has no horizontal overflow.
  await openHome(390);
  await until('!!document.querySelector(".home-store-card")', 'mobile home');
  const overflow = await page.evaluate('document.documentElement.scrollWidth - window.innerWidth');
  assert.ok(overflow <= 0, 'No horizontal overflow at 390 px: ' + overflow);
  await clickText('Mở menu'); await until('!!document.querySelector(".fm-navigation a[href=\\"#fm-stores\\"]")', 'mobile menu');
  checks.push('390 px width: no horizontal overflow, menu opens');

  // 5b. A signed-in End-Customer stays on the home; the join banner is gone.
  await openHome();
  await signOutLocally();
  await openHome();
  await clickText('Đăng nhập');
  await until('location.pathname === "/login"', 'login page');
  assert.equal(await where(), '/login', 'Login from the home has no Store to return to');
  await signInThroughForm('END_CUSTOMER');
  await until('location.pathname === "/customer-home" && !!document.querySelector(".home-store-card")', 'End-Customer lands on /customer-home');
  assert.equal(await page.evaluate('!document.querySelector("#fm-join")'), true, 'Join banner hidden when signed in');
  await hasNot('Tạo tài khoản');
  assert.equal(await page.evaluate("[...document.querySelectorAll('.fm-header button')].some(b=>b.innerText.trim()==='Đăng nhập')"), false);
  checks.push('End-Customer signs in from the home and lands on /customer-home');

  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS (controlled browser fixtures)', checks, interceptedApiCalls: calls.length, realBackendWrites: 0 }, null, 2));
} catch (error) {
  const context = page ? await page.evaluate('({url:location.pathname+location.search,text:document.body.innerText.slice(-900)})').catch(() => null) : null;
  console.log(JSON.stringify({ result: 'FAIL', error: error.stack, checks, unexpected, errors, context, recentCalls: calls.slice(-12) }, null, 2));
  process.exitCode = 1;
} finally {
  closing = true;
  if (page) { try { await page.call('Browser.close'); } catch {} page.ws.close(); }
  if (chrome.exitCode === null) await Promise.race([new Promise(done => chrome.once('exit', done)), sleep(2000)]);
  if (chrome.exitCode === null) chrome.kill();
  const target = resolve(profile);
  if (dirname(target) === base && basename(target).startsWith('paspm-customer-home-')) {
    try { rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {}
  }
}
