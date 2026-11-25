// Controlled fixtures: every /api request is intercepted; no real Backend writes.
// Start Vite first. Optional F07_TEST_ORIGIN / F07_TEST_CHROME overrides.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const origin = process.env.F07_TEST_ORIGIN || 'http://localhost:3000';
const chromePath = process.env.F07_TEST_CHROME || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : 'google-chrome');
const artifacts = mkdtempSync(join(tmpdir(), 'paspm-f07-browser-'));
const chrome = spawn(chromePath, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + artifacts, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws, serial = 0;
const pending = new Map(), errors = [], calls = [], unexpected = [], checks = [];
let role = 'MERCHANDISER', conflict = false, emptyRecommendations = false;
const reports = [];
const names = ['Sữa tươi nguyên chất', 'Cà phê rang xay', 'Trà xanh thanh mát', 'Bánh quy bơ', 'Mật ong hoa nhãn', 'Gạo thơm', 'Dầu ăn thực vật', 'Nước cam tươi', 'Sữa chua', 'Ngũ cốc'];
const product = id => ({ id, sku: 'SKU-' + id, name: names[id - 1] || 'Product ' + id });
const options = [
  { recommendationId: 101, type: 'BUNDLE', productIds: [1, 2] },
  { recommendationId: 102, type: 'CROSS_SELL', productIds: [3, 4] },
  { recommendationId: 103, type: 'BANNER', productIds: [5] },
  { recommendationId: 104, type: 'FBT', productIds: [6, 7] },
  { recommendationId: 105, type: 'BUNDLE', productIds: [1, 8] },
  { recommendationId: 106, type: 'BUNDLE', productIds: [9, 10] }
].map(option => ({ ...option, snapshotId: 1, utility: 52000, version: 1 }));
const campaign = { campaignId: 1, snapshotId: 1, name: 'Weekend essentials', status: 'DRAFT', version: 1, layoutAId: 1, layoutBId: 2, selectedLayoutId: null, decision: null, decisionReportId: null, reportIds: [], createdAt: '2026-11-01T00:00:00Z' };
const placement = (id, option = null, index = 0) => ({ productId: id, productName: product(id).name, sku: product(id).sku, recommendationId: option?.recommendationId ?? null, recommendationType: option?.type ?? null, zone: option?.type ?? 'BASELINE', blockNo: index + 1, position: index + 1, snapshotWeightedUtility: 18000, valid: true, validationErrors: [] });
const a = { layoutId: 1, campaignId: 1, snapshotId: 1, role: 'A', name: 'A Baseline', status: 'READY', version: 1, valid: true, validationErrors: [], placements: Array.from({ length: 10 }, (_, i) => placement(i + 1, null, i)), weightedUtilityScore: 180000, equalSizeBaselineScore: null, equalSizeProductCount: null };
const b = { ...a, layoutId: 2, role: 'B', name: 'B Recommendations', status: 'DRAFT', valid: false, placements: [], weightedUtilityScore: 0, equalSizeBaselineScore: 0, equalSizeProductCount: 0, validationErrors: ['Layout B requires at least one valid block'] };
const page = items => ({ items, page: 0, pageSize: 100, totalElements: items.length });
const policy = { utilityScoreLabel: 'Weighted utility (snapshot)', utilityScoreDefinition: 'Frozen snapshot utility', capacityPolicy: 'UNCONFIGURED_LIMITS_ARE_UNBOUNDED', zones: [
  { zone: 'BASELINE', recommendationType: null, maxBlocks: 35, maxProducts: 35 },
  ...['BANNER', 'BUNDLE', 'CROSS_SELL', 'FBT'].map(type => ({ zone: type, recommendationType: type, maxBlocks: type === 'BUNDLE' ? 2 : 3, maxProducts: type === 'BANNER' ? 3 : 8 }))
] };
const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++serial; const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000); pending.set(id, { resolve: result => { clearTimeout(timer); resolve(result); }, reject }); ws.send(JSON.stringify({ id, method, params })); });
async function evaluate(expression) { const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result?.value; }
async function until(expression, label = expression) { for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await sleep(80); } throw new Error('UI timeout: ' + label); }
async function click(label) { const expr = '[...document.querySelectorAll("button")].find(b=>b.getClientRects().length&&!b.disabled&&(b.getAttribute("aria-label")===' + JSON.stringify(label) + '||b.textContent.trim()===' + JSON.stringify(label) + '))'; await until('Boolean(' + expr + ')', label); await evaluate(expr + '.click()'); }
async function go(path) { await call('Page.navigate', { url: origin + path }); await sleep(500); }
async function capture(name) { const shot = await call('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(artifacts, name + '.png'), Buffer.from(shot.data, 'base64')); }
async function fixture({ requestId, request }) {
  const url = new URL(request.url), path = url.pathname;
  if (!path.startsWith('/api/')) return call(url.origin === origin ? 'Fetch.continueRequest' : 'Fetch.failRequest', { requestId, ...(url.origin === origin ? {} : { errorReason: 'BlockedByClient' }) });
  calls.push({ path, method: request.method, body: request.postData });
  let body, code = 200;
  const headers = [{ name: 'Content-Type', value: 'application/json' }];
  if (['/api/auth/login', '/api/auth/refresh'].includes(path)) { body = { accessToken: 'fixture-access', expiresIn: 3600, tokenType: 'Bearer', csrfToken: 'fixture-csrf' }; headers.push({ name: 'Set-Cookie', value: 'PASPM-CSRF=fixture-csrf; Path=/; SameSite=Strict' }); }
  else if (path === '/api/auth/me') body = { userId: 12, name: 'Layout Designer', email: 'fixture@example.invalid', roleCode: role, storeId: 1, status: 'ACTIVE', emailVerified: true };
  else if (path === '/api/utility/config') body = { config: { alpha: 0.5, beta: 0.5, lambda: 0, salesWindowDays: 30, version: 1, scoringVersion: 'W2_EXPIRY_SEASON_V1' }, lambdaPolicy: { lambdaMax: 0.5, version: 1, scoringVersion: 'W2_EXPIRY_SEASON_V1' }, lambdaValid: true };
  else if (path === '/api/layouts/policy') body = policy;
  else if (path === '/api/campaigns/1') body = campaign;
  else if (path === '/api/campaigns') body = page([campaign]);
  else if (path === '/api/mining/snapshots') body = page([{ snapshotId: 1, status: 'READY', rangeStart: '2026-11-01', rangeEnd: '2026-11-10', asOfDate: '2026-11-10' }]);
  else if (path === '/api/layouts/recommendations') body = page(emptyRecommendations ? [] : options);
  else if (path === '/api/layouts/1') body = a;
  else if (path === '/api/layouts/2' || path === '/api/layouts/2/preview') body = b;
  else if (path === '/api/layouts/2/placements') {
    const value = JSON.parse(request.postData); assert.deepEqual(Object.keys(value).sort(), ['expectedVersion', 'recommendationIds']);
    if (conflict || value.expectedVersion !== b.version) { conflict = false; code = 409; body = { error: 'Layout version is stale' }; }
    else { b.version++; b.status = 'DRAFT'; b.placements = value.recommendationIds.flatMap(id => { const option = options.find(item => item.recommendationId === id); return option.productIds.map((id, index) => placement(id, option, index)); }); b.valid = b.placements.length > 0; b.validationErrors = []; b.weightedUtilityScore = b.placements.length * 18000; b.equalSizeProductCount = b.placements.length; b.equalSizeBaselineScore = b.placements.length * 17000; campaign.version++; campaign.decision = null; body = b; }
  } else if (path === '/api/layouts/2/ready') { assert.equal(JSON.parse(request.postData).expectedVersion, b.version); b.status = 'READY'; body = b; }
  else if (path === '/api/campaigns/1/reports') body = page(reports);
  else if (path === '/api/campaigns/1/simulations') {
    const value = JSON.parse(request.postData);
    assert.equal(value.expectedCampaignVersion, campaign.version); assert.equal(value.expectedLayoutBVersion, b.version);
    body = { reportId: 1, campaignId: 1, snapshotId: 1, rangeStart: value.rangeStart, rangeEnd: value.rangeEnd, datasetHash: 'fixture-dataset-hash', evaluationCount: 20, simulated: true, algorithmVersion: 'OFFLINE_REPLAY_V2', assumptions: { comparisonMode: 'EQUAL_SIZE_TOP_N_OF_A', comparedProductCountN: b.placements.length }, layouts: [a, b].map(layout => ({ layoutId: layout.layoutId, role: layout.role, layoutVersion: layout.version, hitRate: { numerator: 10, denominator: 20, rate: 0.5 }, capturedUtility: { numerator: 200, denominator: 400, rate: 0.5 }, priorityCoverage: null })) };
    reports.push(body);
  }
  else if (path === '/api/campaigns/1/decision') { const value = JSON.parse(request.postData); assert.equal(value.expectedVersion, campaign.version); assert.equal(value.reportId, 1); campaign.decision = value.decision; campaign.selectedLayoutId = value.decision === 'KEEP_A' ? 1 : 2; campaign.version++; body = campaign; }
  else if (path === '/api/campaigns/1/publish') { assert.equal(JSON.parse(request.postData).expectedVersion, campaign.version); campaign.status = 'PUBLISHED'; campaign.version++; body = campaign; }
  else if (path === '/api/campaigns/1/activate') { assert.equal(role, 'STORE_ADMIN'); assert.equal(JSON.parse(request.postData).expectedVersion, campaign.version); campaign.status = 'ACTIVE'; campaign.version++; body = campaign; }
  else if (path === '/api/campaigns/1/rollback') { assert.equal(role, 'STORE_ADMIN'); campaign.status = 'ENDED'; campaign.version++; body = { defaultLayout: true, campaign: null, layout: null }; }
  else if (path === '/api/storefront/active-layout') body = { defaultLayout: true, campaign: null, layout: null };
  else if (/^\/api\/products\/\d+$/.test(path)) body = product(Number(path.split('/').at(-1)));
  else { unexpected.push(path); code = 599; body = { error: 'Unconfigured fixture endpoint' }; }
  return call('Fetch.fulfillRequest', { requestId, responseCode: code, responseHeaders: headers, body: Buffer.from(JSON.stringify(body)).toString('base64') });
}

try {
  for (let i = 0; i < 100 && !existsSync(join(artifacts, 'DevToolsActivePort')); i++) await sleep(100);
  const port = readFileSync(join(artifacts, 'DevToolsActivePort'), 'utf8').split('\n')[0];
  const target = (await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()).find(tab => tab.type === 'page');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  ws.addEventListener('message', event => { const data = JSON.parse(event.data); if (data.id) { const promise = pending.get(data.id); pending.delete(data.id); if (promise) data.error ? promise.reject(data.error) : promise.resolve(data.result); } else if (data.method === 'Fetch.requestPaused') void fixture(data.params).catch(error => errors.push(error.message)); else if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text); else if (data.method === 'Page.javascriptDialogOpening') void call('Page.handleJavaScriptDialog', { accept: true }); });
  await call('Runtime.enable'); await call('Page.enable'); await call('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await call('Emulation.setDeviceMetricsOverride', { width: 1480, height: 1100, deviceScaleFactor: 1, mobile: false });
  await go('/login');
  const service = "(await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/services/authService.ts').name)).authService";
  await until("performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname==='/src/services/authService.ts')");
  assert.equal(await evaluate('(async()=> (await ' + service + ".login({email:'fixture@example.invalid',password:'fixture'})).success)()"), true);
  await go('/layouts-campaigns');
  await until("Boolean(document.querySelector('[aria-label=\"Add recommendation 101\"]'))");
  await click('Add recommendation 101');
  assert.equal(await evaluate("document.querySelector('[aria-label=\"Add recommendation 105\"]').disabled"), true, 'Overlapping-product block is disabled');
  await click('Add recommendation 102'); await click('Add recommendation 103'); await click('Add recommendation 104'); await click('Add recommendation 106');
  await click('Move block 106 up');
  await capture('f07-draft-desktop');
  await click('Save layout'); await until("document.body.innerText.includes('Proposed layout saved.')");
  assert.deepEqual(JSON.parse(calls.find(item => item.path.endsWith('/placements')).body).recommendationIds, [106, 102, 103, 104, 101]);
  await click('Check products'); await until("document.body.innerText.includes('Product checks passed')");
  await click('Finish layout'); await until("document.body.innerText.includes('Proposed layout is ready.')");
  checks.push('full-block add, duplicate prevention, reorder, API save/version, preview and READY');
  await capture('f07-saved-desktop');
  await click('Remove recommendation 102'); conflict = true; await click('Save layout'); await until("document.body.innerText.includes('This campaign has changed since you opened it.')");
  assert.equal(await evaluate("document.querySelector('.f07-alert details').open"), false, 'Raw service errors stay collapsed');
  await evaluate("document.querySelector('.f07-alert details').open=true");
  assert.equal(await evaluate("document.body.innerText.includes('Layout version is stale')"), true, 'Original error remains available for support');
  await click('Refresh'); await until("Boolean(document.querySelector('[aria-label=\"Remove recommendation 102\"]'))");
  checks.push('409 conflict preserves draft until explicit refresh');
  await click('A · Reference'); assert.equal(await evaluate("document.querySelector('[aria-label=\"Add recommendation 101\"]')===null||document.querySelector('[aria-label=\"Add recommendation 101\"]').disabled"), true);
  await capture('f07-baseline'); await click('B · Proposed');
  await click('Compare & apply');
  await evaluate("(()=>{for(const [label,value] of [['Comparison start','2026-11-11'],['Comparison end','2026-11-20']]){const input=document.querySelector('[aria-label=\"'+label+'\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));}})()");
  await click('Compare layouts'); await until("document.body.innerText.includes('Comparison saved')");
  await click('Use proposed (B)'); await until("document.body.innerText.includes('Campaign decision saved')");
  await click('Send to store manager'); await until("document.body.innerText.includes('Campaign sent to the store manager')");
  await capture('f08-campaign'); await click('Arrange products');
  checks.push('offline simulation, matching report decision and publishing use current versions');
  // Keep dates valid: empty date fields used to hide the missing campaign-state guard.
  const fillSimulationDates = async () => evaluate("(()=>{for(const [label,value] of [['Comparison start','2026-11-11'],['Comparison end','2026-11-20']]){const input=document.querySelector('[aria-label=\"'+label+'\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));}})()");
  for (const status of ['PUBLISHED', 'ACTIVE', 'ENDED']) {
    campaign.status = status;
    await go('/layouts-campaigns');
    await until("Boolean(document.querySelector('[aria-label=\"Placed recommendation 101\"]'))");
    await click('Compare & apply');
    await fillSimulationDates();
    await until("document.querySelector('[aria-label=\"Comparison end\"]').value==='2026-11-20'");
    assert.equal(await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Compare layouts').disabled"), true, status + ' must disable simulation even with valid dates and READY layouts');
    const simulationsBefore = calls.filter(item => item.path.endsWith('/simulations')).length;
    await evaluate("document.querySelector('[aria-label=\"Comparison start\"]').form.requestSubmit()");
    await sleep(120);
    assert.equal(calls.filter(item => item.path.endsWith('/simulations')).length, simulationsBefore, status + ' form submission must not send an API request');
    assert.equal(await evaluate("Boolean(document.querySelector('[aria-label=\"Saved comparisons\"]'))"), true, 'Historical reports remain readable');
  }
  checks.push('PUBLISHED, ACTIVE and ENDED block simulation with valid dates, including direct form submission; reports remain readable');
  campaign.status = 'PUBLISHED';
  await go('/layouts-campaigns');
  await until("Boolean(document.querySelector('[aria-label=\"Placed recommendation 101\"]'))");
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await capture('f07-mobile'); assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth+2'), false, 'No mobile page overflow');
  checks.push('read-only A and mobile layout');
  role = 'STORE_ADMIN'; await go('/store/layout'); await until("document.body.innerText.includes('View-only.')");
  assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Save layout')"), false);
  assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Store Layout')"), false);
  checks.push('Store Admin read-only and legacy route opens F07 without duplicate navigation');
  await click('Compare & apply'); await click('Apply to storefront'); await until("document.body.innerText.includes('Campaign applied to the storefront')");
  await click('Restore previous layout'); await until("document.body.innerText.includes('Previous storefront layout restored')");
  checks.push('Store Admin activation and rollback consume their correct response types');
  emptyRecommendations = true; await go('/layouts-campaigns'); await until("document.body.innerText.includes('no longer approved and ready')");
  checks.push('previously saved ineligible blocks remain visible');
  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS', checks, realBackendWrites: 0, artifacts }, null, 2));
} finally { ws?.close(); chrome.kill(); }
