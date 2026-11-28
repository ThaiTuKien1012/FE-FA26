// Audits real local assets/APIs; no API interception and no business-data writes.
// Renders the three native SVG Store icons as PNG for F01's image contract.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { waitForDevToolsPage } from '../tests/browser-devtools.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(join(root, 'scripts/data/catalogue-media-2026-11-28.json'), 'utf8'));
const origin = process.env.MEDIA_ORIGIN ?? manifest.assetOrigin;
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Local audit only');
const profile = await mkdtemp(join(tmpdir(), 'paspm-media-profile-'));
const artifacts = await mkdtemp(join(tmpdir(), 'paspm-catalogue-media-'));
const chrome = spawn(process.env.SESSION_TEST_CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  '--disable-sync', '--disable-extensions', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
], { stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
const pending = new Map();
let id = 0;
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const key = ++id;
    const timer = setTimeout(() => { pending.delete(key); reject(new Error('CDP timeout: ' + method)); }, 20000);
    pending.set(key, { resolve: value => { clearTimeout(timer); resolve(value); }, reject });
    ws.send(JSON.stringify({ id: key, method, params }));
  });
}
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result?.value;
}
async function until(expression, label) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) { if (await evaluate(expression)) return; await sleep(100); }
  throw new Error('UI timeout: ' + label);
}
const absolute = path => new URL(path, origin).href;
const html = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
async function screenshot(name, full = false) {
  const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full });
  await writeFile(join(artifacts, name + '.png'), Buffer.from(result.data, 'base64'));
}
const results = { assetGroups: [], publicStores: [], pages: [], artifacts };
try {
  ws = new WebSocket(await waitForDevToolsPage(profile));
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);
    message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
  });
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: absolute('/') });
  await until(`location.origin === ${JSON.stringify(origin)} && document.readyState === 'complete'`, 'same-origin HTML document');
  for (const store of manifest.stores) {
    const data = await evaluate(`(async () => { const image = new Image(); image.src = ${JSON.stringify(absolute(store.iconSvg))}; await image.decode(); const canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas'); canvas.width = canvas.height = 256; canvas.getContext('2d').drawImage(image, 0, 0, 256, 256); return canvas.toDataURL('image/png').split(',')[1]; })()`);
    await writeFile(join(root, 'public', store.icon), Buffer.from(data, 'base64'));
  }
  const entries = [
    ...manifest.groups.map(group => ({ key: group.key, path: group.path, label: group.products.map(p => `#${p.id} ${p.name}`).join(' · ') })),
    ...manifest.stores.flatMap(store => ['icon', 'banner'].map(kind => ({ key: `store-${store.storeId}-${kind}`, path: store[kind], label: `Store ${store.storeId}: ${kind}` }))),
  ];
  const frame = (await call('Page.getFrameTree')).frameTree.frame.id;
  await call('Page.setDocumentContent', { frameId: frame, html: `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:20px;font:14px system-ui;background:#eef2f6;color:#162337}h1{font-size:24px}.grid{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}figure{background:white;border:1px solid #ccd5df;border-radius:8px;margin:0;padding:8px;min-height:190px}img{width:100%;height:135px;object-fit:contain}figcaption{font-size:12px;line-height:1.4;margin-top:5px}</style></head><body><h1>Ảnh catalogue — kiểm tra theo tên sản phẩm</h1><div class="grid">${entries.map(entry => `<figure><img src="${html(absolute(entry.path))}" alt="${html(entry.key)}"><figcaption>${html(entry.label)}</figcaption></figure>`).join('')}</div></body></html>` });
  results.assetGroups = await evaluate(`Promise.all([...document.images].map(async image => { try { await image.decode(); return {key:image.alt,width:image.naturalWidth,height:image.naturalHeight,ok:true}; } catch { return {key:image.alt,ok:false}; } }))`);
  assert.equal(results.assetGroups.length, entries.length, 'All gallery images are present');
  assert.equal(results.assetGroups.filter(image => !image.ok).length, 0, 'All catalogue assets decode');
  await screenshot('catalogue-contact-sheet', true);

  if (process.argv.includes('--live')) {
    for (const store of manifest.stores) {
      const response = await fetch(absolute(`/api/storefront/${store.slug}/products?page=0&pageSize=100`));
      assert.equal(response.status, 200, 'Public product API');
      const data = await response.json();
      const products = data.items;
      assert.ok(Array.isArray(products) && products.length === data.totalElements, 'Complete public product page');
      const checks = await evaluate(`Promise.all(${JSON.stringify(products)}.map(async product => {const image = new Image(); image.src = product.imageUrl; try {await image.decode();return {id:product.productId,ok:!!product.imageUrl&&image.naturalWidth>0,description:!!product.description};}catch{return {id:product.productId,ok:false,description:!!product.description};}}))`);
      assert.ok(checks.every(check => check.ok && check.description), 'All public products have valid images and descriptions');
      results.publicStores.push({ storeId: store.storeId, total: data.totalElements, products: checks });
    }
    for (const [name, path] of [
      ['customer-home', '/customer-home'],
      ['store-a', `/storefront?store=${manifest.stores[0].slug}`],
      ['oat-milk-detail', `/product/64?store=${manifest.stores[2].slug}`],
    ]) {
      await call('Page.navigate', { url: absolute(path) });
      await until(`location.pathname === ${JSON.stringify(path.split('?')[0])} && document.readyState === 'complete' && document.querySelector('#root')?.innerText.length > 100`, name);
      await sleep(1500);
      const images = await evaluate(`Promise.all([...document.images].map(async image => { image.loading='eager'; try{await image.decode();return {src:image.getAttribute('src'),ok:image.naturalWidth>0};}catch{return {src:image.getAttribute('src'),ok:false};} }))`);
      results.pages.push({ name, path, imageCount: images.length, broken: images.filter(image => !image.ok) });
      assert.ok(images.length > 0 && images.every(image => image.ok), name + ' images load');
      await screenshot(name);
    }
  }
  await writeFile(join(artifacts, 'audit.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results));
} finally {
  ws?.close(); chrome.kill('SIGTERM');
  await new Promise(resolve => { if (chrome.exitCode !== null) resolve(); else { chrome.once('exit', resolve); setTimeout(resolve, 2000).unref(); } });
  await rm(profile, { recursive: true, force: true });
}
