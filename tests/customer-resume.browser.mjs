// Run with Vite serving locally: node --import tsx tests/customer-resume.browser.mjs
// Post-login return paths, driven in a real (headless) browser:
//   1. a guest opens a storefront product URL, signs in as End-Customer and lands on the same Store and product;
//   2. a guest opens the Store storefront URL, signs in as End-Customer and lands on the same Store;
//   3. a guest opens a F06 run URL, signs in as Merchandiser and returns to the same F06 run;
//   4. a guest opens a F06 run URL, signs in as End-Customer and is NOT sent to F06 (customer destination wins).
// All API traffic is intercepted with fixtures, never a real backend, account or cart write.
// Any request outside the fixtures lands in `unexpected` and fails the test.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { storefrontFixture, STOREFRONT_PRODUCT, STOREFRONT_PRODUCT_ID, STOREFRONT_SLUG } from './storefront.fixtures.ts';
import { policy } from './f06.fixtures.ts';
import { conversionRequestFixture, conversionRunFixture } from './f05.fixtures.ts';

const origin = process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3000';
const base = resolve(tmpdir());
const profile = mkdtempSync(join(base, 'paspm-customer-resume-'));
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
const state = { role: 'END_CUSTOMER', storeId: null };
async function until(expression, label) {
  const end = Date.now() + 12000;
  while (Date.now() < end) { if (await page.evaluate(expression)) return; await sleep(40); }
  throw new Error('UI timeout: ' + label);
}
const has = text => until(`document.body.innerText.includes(${JSON.stringify(text)})`, text);
const where = () => page.evaluate('location.pathname + location.search');
async function openAsGuest(path) {
  // A fresh navigation with no session: clear any stored session first.
  await page.call('Page.navigate', { url: origin + path });
  await until(`location.pathname + location.search === ${JSON.stringify(path)} || location.pathname === "/login"`, 'page ' + path);
}
// A button is found by its visible text or, for icon buttons, by its accessible label.
const buttonByLabel = label => `[...document.querySelectorAll("button")].find(b=>(b.innerText.trim()===${JSON.stringify(label)}||b.getAttribute("aria-label")===${JSON.stringify(label)})&&!b.disabled)`;
async function clickText(label) {
  await until(`!!(${buttonByLabel(label)})`, 'button ' + label);
  assert.equal(await page.evaluate(`(()=>{const b=${buttonByLabel(label)};if(!b)return false;b.click();return true;})()`), true, 'Clickable button: ' + label);
}
async function setValue(id, value) {
  await page.evaluate('(()=>{const e=document.getElementById(' + JSON.stringify(id) + ');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(e,' + JSON.stringify(value) + ');e.dispatchEvent(new Event("input",{bubbles:true}));})()');
}
async function signInThroughForm(role) {
  state.role = role; state.storeId = role === 'MERCHANDISER' ? 1 : null;
  await until('!!document.querySelector("#identifier")', 'Sign-in form');
  await setValue('identifier', 'fixture@example.invalid'); await setValue('passcode', 'Fixture-password-2026!');
  await page.evaluate('document.querySelector("#identifier").closest("form").requestSubmit()');
}
// A guest has no session, so a stale one from an earlier scenario must be gone before the next scenario.
async function signOutLocally() {
  await page.evaluate('localStorage.clear();sessionStorage.clear()');
  await page.call('Network.clearBrowserCookies');
}
async function fixture({ requestId, request }) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/videos/')) return page.call('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
  if (!url.pathname.startsWith('/api/')) return page.call(url.origin === origin ? 'Fetch.continueRequest' : 'Fetch.failRequest', {
    requestId, ...(url.origin === origin ? {} : { errorReason: 'BlockedByClient' })
  });
  calls.push({ path: url.pathname, method: request.method });
  let responseCode = 200, body, front;
  if (['/api/auth/login', '/api/auth/refresh'].includes(url.pathname)) body = { accessToken: 'fixture-access', expiresIn: 3600, tokenType: 'Bearer', csrfToken: 'fixture-csrf' };
  else if (url.pathname === '/api/auth/me') body = { userId: 12, name: 'Customer Fixture', email: 'fixture@example.invalid', roleCode: state.role, storeId: state.storeId, status: 'ACTIVE', emailVerified: true };
  else if (front = storefrontFixture(url.pathname, request.method)) { responseCode = front.status; body = front.body; }
  else if (url.pathname === '/api/recommendations/config') body = policy;
  // The F06 run screen reads the analysis list and detail, the selected run, its recommendations and the expiry alerts (all empty pages).
  else if (url.pathname === '/api/mining/requests') body = { items: [{ ...conversionRequestFixture('WHOLE_UNIT_HALF_UP', 'FAILED', state.storeId), comparisonStatus: 'FAILED', requestId: 17 }], page: 0, pageSize: 20, totalElements: 1 };
  else if (url.pathname === '/api/mining/requests/17') body = { ...conversionRequestFixture('WHOLE_UNIT_HALF_UP', 'FAILED', state.storeId), comparisonStatus: 'FAILED', requestId: 17 };
  else if (/^\/api\/mining\/runs\/\d+$/.test(url.pathname)) body = { ...conversionRunFixture('WHOLE_UNIT_HALF_UP', 'COMPLETED', state.storeId), runId: Number(url.pathname.split('/').at(-1)), requestId: 17 };
  else if (url.pathname === '/api/recommendations') body = { items: [], page: Number(url.searchParams.get('page') || 0), pageSize: Number(url.searchParams.get('pageSize') || 20), totalElements: 0, ordering: 'RANKED_WITHIN_SOURCE_RUN' };
  else if (url.pathname === '/api/recommendations/expiry-push') body = { items: [], page: 0, pageSize: Number(url.searchParams.get('pageSize') || 20), totalElements: 0, asOfDate: '2026-11-26', timeZone: 'Asia/Ho_Chi_Minh', checkedAt: '2026-11-25T17:00:00Z', warnings: [] };
  else { unexpected.push(request.method + ' ' + url.pathname + url.search); responseCode = 500; body = { error: 'Unexpected fixture endpoint' }; }
  return page.call('Fetch.fulfillRequest', { requestId, responseCode, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') });
}
try {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; !existsSync(portFile) && i < 150; i++) await sleep(100);
  assert.ok(existsSync(portFile), 'Chrome DevTools started');
  const port = readFileSync(portFile, 'utf8').split('\n')[0];
  const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  const ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((done, reject) => { ws.addEventListener('open', done, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  page = new CDP(ws);
  page.on('Fetch.requestPaused', data => fixture(data).catch(error => { if (!closing && !/Invalid InterceptionId/.test(error.message)) errors.push(error.message); }));
  page.on('Runtime.exceptionThrown', data => errors.push(data.exceptionDetails.exception?.description || data.exceptionDetails.text));
  await page.call('Page.enable'); await page.call('Runtime.enable'); await page.call('Network.enable');
  await page.call('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });

  // 1. Guest on a storefront product page -> sign in as End-Customer -> same Store and product.
  const productPath = `/product/${STOREFRONT_PRODUCT_ID}?store=${STOREFRONT_SLUG}`;
  await openAsGuest(productPath);
  await has(STOREFRONT_PRODUCT.name);
  await clickText('Đăng nhập');
  await until('location.pathname==="/login"', 'login page');
  assert.equal(await where(), `/login?returnStore=${STOREFRONT_SLUG}&returnProduct=${STOREFRONT_PRODUCT_ID}`, 'Login URL remembers the Store and product');
  await signInThroughForm('END_CUSTOMER');
  await until(`location.pathname + location.search === ${JSON.stringify(productPath)}`, 'back on the product page');
  await has(STOREFRONT_PRODUCT.name);
  assert.equal(await page.evaluate('!document.querySelector("#identifier")'), true, 'Sign-in form is gone');
  checks.push('Guest product URL -> login -> End-Customer returns to the same Store and product');

  // 2. Guest on the Store storefront -> sign in as End-Customer -> same Store.
  await signOutLocally();
  const storePath = `/storefront?store=${STOREFRONT_SLUG}`;
  await openAsGuest(storePath);
  await has('Fixture Store');
  await clickText('Đăng nhập');
  await until('location.pathname==="/login"', 'login page');
  assert.equal(await where(), `/login?returnStore=${STOREFRONT_SLUG}`, 'Login URL remembers the Store');
  await signInThroughForm('END_CUSTOMER');
  await until(`location.pathname + location.search === ${JSON.stringify(storePath)}`, 'back on the Store storefront');
  checks.push('Guest Store storefront URL -> login -> End-Customer returns to the same Store');

  // 3. Guest on a F06 run URL -> sign in as Merchandiser -> same F06 run.
  await signOutLocally();
  const f06Path = '/recommendations?miningRunId=42';
  await openAsGuest(f06Path);
  await until('location.pathname==="/login"', 'guest is sent to login');
  assert.equal(await page.evaluate('new URLSearchParams(location.search).get("returnTo")'), f06Path, 'Login URL carries the F06 returnTo');
  await signInThroughForm('MERCHANDISER');
  await until(`location.pathname + location.search === ${JSON.stringify(f06Path)}`, 'back on the F06 run');
  await until('!!document.querySelector("#f06-dashboard-title,#f06-ranked-source-title")', 'the F06 recommendations screen is shown');
  checks.push('Guest F06 run URL -> login -> Merchandiser returns to the same F06 run');

  // 4. The customer destination wins over a F06 returnTo for an End-Customer.
  await signOutLocally();
  await openAsGuest(f06Path);
  await until('location.pathname==="/login"', 'guest is sent to login');
  await signInThroughForm('END_CUSTOMER');
  await sleep(600);
  assert.notEqual((await where()).split('?')[0], '/recommendations', 'An End-Customer must not land on F06');
  checks.push('End-Customer signing in from a F06 returnTo does not land on F06');

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
  if (dirname(target) === base && basename(target).startsWith('paspm-customer-resume-')) {
    try { rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {}
  }
}
