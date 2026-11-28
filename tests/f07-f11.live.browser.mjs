// Live local smoke test: no Fetch interception, mock API or fixture responses.
// Configuration is supplied as JSON on stdin so credentials never enter argv or artifacts.
// Writes are restricted to the explicitly supplied QA Store and test accounts.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { waitForDevToolsPage } from './browser-devtools.mjs';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const config = JSON.parse(input);
input = '';
const origin = config.origin ?? 'http://localhost:3000';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Local origins only');
assert.ok(config.allowWrites && /^qa-f07-f11-[a-z0-9]+$/.test(config.slug), 'Explicit isolated QA Store required');
const profile = await mkdtemp(join(tmpdir(), 'paspm-live-profile-'));
const artifacts = await mkdtemp(join(tmpdir(), 'paspm-live-f07-f11-'));
const chrome = spawn(process.env.SESSION_TEST_CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  '--disable-sync', '--disable-extensions', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
], { stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const checks = [], responses = [], errors = [], pages = [];
let browser, merchant, customer, owner;
class CDP {
  id = 0; pending = new Map(); listeners = new Map();
  constructor(ws) {
    this.ws = ws;
    ws.addEventListener('message', event => {
      const data = JSON.parse(event.data);
      if (data.id) {
        const task = this.pending.get(data.id); if (!task) return;
        this.pending.delete(data.id);
        data.error ? task.reject(new Error(data.error.message)) : task.resolve(data.result);
      } else for (const handler of this.listeners.get(data.method) ?? []) handler(data.params);
    });
  }
  call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000);
      this.pending.set(id, {
        resolve: value => { clearTimeout(timer); resolve(value); },
        reject: error => { clearTimeout(timer); reject(error); },
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(name, handler) { this.listeners.set(name, [...this.listeners.get(name) ?? [], handler]); }
  async evaluate(expression) {
    const value = await this.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (value.exceptionDetails) throw new Error(value.exceptionDetails.text);
    return value.result?.value;
  }
}
async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  return new CDP(ws);
}
async function newPage() {
  const context = await browser.call('Target.createBrowserContext');
  const target = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId: context.browserContextId });
  const port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split(/\r?\n/)[0];
  const list = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  const page = await connect(list.find(item => item.id === target.targetId).webSocketDebuggerUrl);
  pages.push(page);
  page.on('Network.responseReceived', ({ response }) => {
    const url = new URL(response.url);
    if (url.pathname.startsWith('/api/')) responses.push({ path: url.pathname + url.search, status: response.status });
  });
  page.on('Runtime.exceptionThrown', ({ exceptionDetails }) => errors.push(exceptionDetails.exception?.description ?? exceptionDetails.text));
  await page.call('Page.enable'); await page.call('Runtime.enable'); await page.call('Network.enable');
  await page.call('Network.setCacheDisabled', { cacheDisabled: true });
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  return page;
}
async function until(page, expression, label) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) { if (await page.evaluate(expression)) return; await sleep(70); }
  throw new Error('UI timeout: ' + label);
}
const has = (page, text) => until(page, `document.body.innerText.includes(${JSON.stringify(text)})`, text);
async function navigate(page, path) { await page.call('Page.navigate', { url: origin + path }); }
async function route(page, path) {
  await page.evaluate(`history.pushState({}, '', ${JSON.stringify(path)}); window.dispatchEvent(new Event('popstate'));`);
}
async function click(page, label) {
  const button = `[...document.querySelectorAll('button')].find(b => b.getClientRects().length && !b.disabled && (b.innerText.trim() === ${JSON.stringify(label)} || b.getAttribute('aria-label') === ${JSON.stringify(label)}))`;
  await until(page, `!!(${button})`, 'button ' + label);
  await page.evaluate(button + '.click()');
}
async function setInput(page, selector, value) {
  await until(page, `!!document.querySelector(${JSON.stringify(selector)})`, 'input ' + selector);
  await page.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(String(value))});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
}
async function select(page, selector, value) {
  await until(page, `!!document.querySelector(${JSON.stringify(selector)})`, 'select ' + selector);
  await page.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(String(value))});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
}
async function login(page, account, path) {
  await navigate(page, '/login');
  await setInput(page, '#identifier', account.email); await setInput(page, '#passcode', account.password);
  await page.evaluate('document.querySelector("#passcode").form.requestSubmit()');
  await until(page, '!document.querySelector("#passcode")', 'authenticated');
  await sleep(450);
  await route(page, path);
}
async function capture(page, name) {
  const shot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(join(artifacts, name + '.png'), Buffer.from(shot.data, 'base64'));
}
async function responsive(page, name) {
  for (const width of [1440, 390]) {
    await page.call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await sleep(150);
    assert.equal(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `${name} fits ${width}px`);
    await capture(page, name + '-' + width);
  }
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
}
let uiCampaignId;
try {
  await waitForDevToolsPage(profile);
  const [port, browserPath] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split(/\r?\n/);
  browser = await connect(`ws://127.0.0.1:${port}${browserPath}`);
  merchant = await newPage();
  await login(merchant, config.merch, '/layouts-campaigns');
  await has(merchant, 'Layout Simulator'); await click(merchant, 'New campaign');
  const name = 'QA browser F07-F11 ' + config.runId;
  await setInput(merchant, 'dialog input', name);
  await select(merchant, 'select[aria-label="Ready snapshot"]', config.snapshotId);
  await click(merchant, 'Create campaign');
  await has(merchant, 'Campaign created.');
  await until(merchant, `document.querySelector('#f07-campaign')?.selectedOptions[0]?.textContent.includes(${JSON.stringify(name)})`, 'new campaign selected');
  uiCampaignId = Number(await merchant.evaluate('document.querySelector("#f07-campaign").value'));
  await click(merchant, `Add manual product ${config.products[0].id}`);
  await click(merchant, `Add manual product ${config.products[1].id}`);
  await select(merchant, `select[aria-label="Block for product ${config.products[1].id}"]`, 1);
  await click(merchant, 'Save Layout B'); await has(merchant, 'Layout B saved.');
  await click(merchant, 'Mark ready'); await has(merchant, 'Layout B is ready');
  await responsive(merchant, 'f07-layout');
  await click(merchant, 'F08 · Campaign & simulation');
  await setInput(merchant, 'input[aria-label="Evaluation start"]', '2026-11-21');
  await setInput(merchant, 'input[aria-label="Evaluation end"]', '2026-11-21');
  await click(merchant, 'Run offline simulation'); await has(merchant, 'Offline simulation report saved.');
  await has(merchant, '3 evaluation transactions');
  await click(merchant, 'Choose Layout B'); await has(merchant, 'Campaign decision saved.');
  await click(merchant, 'Publish campaign'); await has(merchant, 'Campaign publish completed.');
  await click(merchant, 'Withdraw to draft'); await has(merchant, 'Campaign withdraw completed.');
  await click(merchant, 'Choose Layout B'); await has(merchant, 'Campaign decision saved.');
  await click(merchant, 'Publish campaign'); await has(merchant, 'Campaign publish completed.');
  await responsive(merchant, 'f08-campaign');
  checks.push('F07/F08 real UI: create, group manual products, save, READY, simulate, decide, publish, withdraw, republish');

  owner = await newPage(); await login(owner, config.owner, '/layouts-campaigns');
  await has(owner, 'Layout Simulator'); await select(owner, '#f07-campaign', uiCampaignId);
  await click(owner, 'F08 · Campaign & simulation'); await click(owner, 'Activate campaign');
  await has(owner, 'Campaign activate completed.');
  checks.push('F08 Store Admin activates the published UI campaign through the real API');

  customer = await newPage();
  await navigate(customer, '/storefront?store=' + config.slug);
  await has(customer, name); await has(customer, config.products[0].name);
  await responsive(customer, 'f09-storefront');
  await click(customer, 'Thêm gói vào giỏ');
  await until(customer, 'location.pathname === "/login"', 'guest sign-in redirect');
  await setInput(customer, '#identifier', config.shopper.email); await setInput(customer, '#passcode', config.shopper.password);
  await customer.evaluate('document.querySelector("#passcode").form.requestSubmit()');
  await has(customer, name);
  await until(customer, '!!document.querySelector(".storefront-bundle-card button:not(:disabled)")', 'server cart loaded');
  const cartLabel = await customer.evaluate('document.querySelector(".fm-cart-trigger").getAttribute("aria-label")');
  if (!cartLabel.includes('(0)')) {
    await click(customer, cartLabel);
    await click(customer, 'Xóa toàn bộ'); await click(customer, 'Xác nhận xóa');
    await has(customer, 'Giỏ hàng đang trống.'); await click(customer, 'Đóng giỏ hàng');
  }
  await click(customer, 'Thêm gói vào giỏ'); await has(customer, 'Đã thêm 1/1');
  await until(customer, 'document.querySelector(".fm-cart-trigger")?.getAttribute("aria-label").includes("(2)")', 'two units');
  await click(customer, 'Thêm gói vào giỏ');
  await until(customer, 'document.querySelector(".fm-cart-trigger")?.getAttribute("aria-label").includes("(4)")', 'four units');
  await click(customer, 'Thêm gói vào giỏ'); await has(customer, 'Đã thêm 0/1');
  await click(customer, 'Mở giỏ hàng (5)'); await click(customer, 'Mở trang giỏ hàng');
  await has(customer, '97.002 ₫');
  await responsive(customer, 'f10-cart');
  await click(customer, 'Xóa toàn bộ'); await click(customer, 'Hủy');
  await has(customer, '97.002 ₫');
  await click(customer, 'Xóa toàn bộ'); await click(customer, 'Xác nhận xóa'); await has(customer, 'Giỏ hàng đang trống.');
  checks.push('F09/F10 real UI: public active layout, guest sign-in return, whole/partial bundle add, actual counts, VND rounding, full cart and confirmed clear');

  await route(owner, '/store/dashboard');
  await has(owner, 'Store dashboard'); await has(owner, '#'+config.snapshotId);
  await setInput(owner, 'input[type=number]', config.snapshotId); await click(owner, 'Find snapshot');
  await has(owner, '#'+config.snapshotId);
  await owner.evaluate(`(()=>{const e=[...document.querySelectorAll('.f11-panel')][1].querySelector('select');e.value=${JSON.stringify(String(uiCampaignId))};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await click(owner, 'Apply filters');
  await until(owner, `document.querySelector('.f11-totals dd')?.textContent.trim() === '3'`, 'three UI bundle actions');
  await owner.evaluate(`(()=>{const e=[...document.querySelectorAll('.f11-panel')][2].querySelector('select');e.value=${JSON.stringify(String(uiCampaignId))};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await has(owner, 'Saved report');
  await owner.evaluate(`(()=>{const labels=[...document.querySelectorAll('label')];const e=labels.find(x=>x.textContent.startsWith('Saved report')).querySelector('select');e.value=e.options[1].value;e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await has(owner, '3 evaluation transactions');
  await responsive(owner, 'f11-dashboard');
  await route(merchant, '/store/dashboard'); await has(merchant, 'Store dashboard'); await has(merchant, '#'+config.snapshotId);
  checks.push('F11 real UI: both staff roles, snapshot filter, 3 actual bundle actions on the UI campaign, saved A/B report, desktop/mobile');
  assert.deepEqual(errors, [], 'No uncaught browser errors');
  console.log(JSON.stringify({ result: 'PASS (live Backend, no interception)', checks, responses, errors, artifacts, uiCampaignId }, null, 2));
} catch (error) {
  const contexts = [];
  for (const [index, page] of pages.entries()) {
    await capture(page, 'failure-' + index).catch(() => {});
    contexts.push(await page.evaluate('({path:location.pathname+location.search,text:document.body.innerText.slice(-1800)})').catch(() => null));
  }
  console.log(JSON.stringify({ result: 'FAIL (live Backend)', error: error.message, checks, responses, errors, contexts, artifacts, uiCampaignId }, null, 2));
  process.exitCode = 1;
} finally {
  if (browser) { await browser.call('Browser.close').catch(() => {}); browser.ws.close(); }
  for (const page of pages) page.ws.close();
  if (chrome.exitCode === null) await Promise.race([new Promise(done => chrome.once('exit', done)), sleep(2000)]);
  if (chrome.exitCode === null) chrome.kill();
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
