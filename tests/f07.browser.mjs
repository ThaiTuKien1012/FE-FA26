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
let role = 'MERCHANDISER', conflict = false, invalidSave = false, emptyRecommendations = false;
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
const placement = (id, option = null, index = 0) => ({ productId: id, productName: product(id).name, sku: product(id).sku, recommendationId: option?.recommendationId ?? null, sourceRecommendationId: option?.recommendationId ?? null, recommendationType: option?.type ?? null, zone: option?.type ?? 'BASELINE', blockNo: index + 1, position: index + 1, snapshotWeightedUtility: 18000, valid: true, validationErrors: [] });
const a = { layoutId: 1, campaignId: 1, snapshotId: 1, role: 'A', name: 'A Baseline', status: 'READY', version: 1, valid: true, validationErrors: [], placements: Array.from({ length: 10 }, (_, i) => placement(i + 1, null, i)), weightedUtilityScore: 180000, priorityCoverage: 0.4, priorityCoverageDenominator: 10, equalSizeBaselineScore: null, equalSizeProductCount: null };
const b = { ...a, layoutId: 2, role: 'B', name: 'B Recommendations', status: 'DRAFT', valid: false, placements: [], weightedUtilityScore: 0, priorityCoverage: null, priorityCoverageDenominator: 0, equalSizeBaselineScore: 0, equalSizeProductCount: 0, validationErrors: ['Layout B requires at least one valid block'] };
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
async function checkScoreDescriptions(viewport) {
  const cards = await evaluate(`Array.from(document.querySelectorAll('.f07-score')).slice(0,2).map(card => {
    const lines = Array.from(card.querySelectorAll('small'));
    return lines.length === 2 && lines[1].getBoundingClientRect().top >= lines[0].getBoundingClientRect().bottom;
  })`);
  assert.deepEqual(cards, [true, true], `Product count and Priority coverage occupy separate lines on ${viewport}`);
}
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
  else if (path === '/api/layouts/products') {
    assert.equal(url.searchParams.get('snapshotId'), '1');
    assert.equal(url.searchParams.get('pageSize'), '20');
    const q = url.searchParams.get('q') || '';
    const items = Array.from({ length: 12 }, (_, index) => product(index + 1))
      .filter(item => (item.name + item.sku).toLowerCase().includes(q.toLowerCase()))
      .map(item => ({ productId: item.id, sku: item.sku, productName: item.name, productStatus: 'ACTIVE',
        deleted: false, sellableQuantity: item.id === 12 ? 0 : 4, snapshotWeightedUtility: 18000,
        eligible: item.id !== 12, validationErrors: item.id === 12 ? ['Out of stock'] : [] }));
    body = { ...page(items), pageSize: 20 };
  }
  else if (path === '/api/layouts/recommendations') body = page(emptyRecommendations ? [] : options);
  else if (path === '/api/layouts/1') body = a;
  else if (path === '/api/layouts/2' || path === '/api/layouts/2/preview') body = b;
  else if (path === '/api/layouts/2/placements') {
    const value = JSON.parse(request.postData);
    assert.deepEqual(Object.keys(value).sort(), ['expectedVersion', 'placements']);
    for (const row of value.placements) {
      assert.deepEqual(Object.keys(row).sort(), ['blockNo', 'position', 'productId', 'sourceRecommendationId', 'zone']);
      assert.ok(row.blockNo > 0 && row.position > 0);
    }
    if (invalidSave) { invalidSave = false; code = 400; body = { error: 'Fixture validation rejected the placement' }; }
    else if (conflict || value.expectedVersion !== b.version) {
      if (conflict) b.version++;
      conflict = false; code = 409; body = { error: 'Layout version is stale' };
    } else {
      b.version++; b.status = 'DRAFT';
      b.placements = value.placements.map(row => ({ ...placement(row.productId, options.find(item => item.recommendationId === row.sourceRecommendationId)), ...row }));
      b.valid = b.placements.length > 0; b.validationErrors = []; b.weightedUtilityScore = b.placements.length * 18000;
      b.equalSizeProductCount = b.placements.length; b.equalSizeBaselineScore = b.placements.length * 17000;
      b.priorityCoverage = 0; b.priorityCoverageDenominator = b.placements.length;
      campaign.version++; campaign.decision = null; body = b;
    }
  } else if (path === '/api/layouts/2/ready') { assert.equal(JSON.parse(request.postData).expectedVersion, b.version); b.status = 'READY'; body = b; }
  else if (path === '/api/campaigns/1/reports') body = page(reports);
  else if (path === '/api/campaigns/1/simulations') {
    const value = JSON.parse(request.postData);
    assert.equal(value.expectedCampaignVersion, campaign.version); assert.equal(value.expectedLayoutBVersion, b.version);
    body = { reportId: 1, campaignId: 1, snapshotId: 1, createdBy: 12, sourceNamespace: 'F04_DATABASE_V1', createdAt: '2026-11-25T00:00:00Z', rangeStart: value.rangeStart, rangeEnd: value.rangeEnd, datasetHash: 'fixture-dataset-hash', evaluationCount: 20, simulated: true, algorithmVersion: 'OFFLINE_REPLAY_V4', assumptions: { comparisonMode: 'EQUAL_SIZE_TOP_N_OF_A', comparedProductCountN: b.placements.length }, layouts: [a, b].map(layout => ({ layoutId: layout.layoutId, role: layout.role, layoutVersion: layout.version, hitRate: { numerator: 10, denominator: 20, rate: 0.5 }, capturedUtility: { numerator: 200, denominator: 400, rate: 0.5 }, bundleConversion: { numerator: 0, denominator: 20, rate: 0 }, priorityCoverage: 0, priorityCoverageDenominator: b.placements.length })) };
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
  await until("Boolean(document.querySelector('[aria-label=\"Add manual product 11\"]'))");
  await click('Add recommendation 101');
  assert.equal(await evaluate("document.querySelector('[aria-label=\"Add product 1 from recommendation 105\"]').disabled"), true);
  assert.equal(await evaluate("document.querySelector('[aria-label=\"Add product 8 from recommendation 105\"]').disabled"), false);
  await click('Remove product 2');
  await click('Add recommendation 102'); await click('Add recommendation 103'); await click('Add recommendation 104'); await click('Add recommendation 106');
  await click('Move product 9 down');
  assert.equal(await evaluate("document.querySelector('[aria-label=\"Add manual product 12\"]').disabled"), true);
  const select = async (label, value) => evaluate(`(()=>{const select=document.querySelector('[aria-label="'+${JSON.stringify(label)}+'"]');select.value=${JSON.stringify(value)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await select('Manual product zone', 'BANNER');
  await click('Add manual product 11');
  await capture('f07-draft-desktop');
  await click('Save Layout B'); await until("document.body.innerText.includes('Layout B saved.')");
  const writes = () => calls.filter(item => item.path.endsWith('/placements'));
  const first = JSON.parse(writes()[0].body);
  assert.equal(first.expectedVersion, 1);
  assert.deepEqual(first.placements.find(row => row.productId === 1), { productId: 1, zone: 'BUNDLE', blockNo: 1, position: 1, sourceRecommendationId: 101 });
  assert.deepEqual(first.placements.find(row => row.productId === 11), { productId: 11, zone: 'BANNER', blockNo: 2, position: 2, sourceRecommendationId: null });
  assert.ok(!first.placements.some(row => row.productId === 2), 'removed recommendation member is not recreated');
  assert.ok(first.placements.find(row => row.productId === 9).position > first.placements.find(row => row.productId === 10).position);
  await click('Validate'); await until("document.body.innerText.includes('Saved layout is valid')");
  await click('Mark ready'); await until("document.body.innerText.includes('Layout B is ready for')");
  checks.push('per-product save, sourced and manual provenance, duplicate prevention, individual reorder, preview and READY');
  await capture('f07-saved-desktop');
  await checkScoreDescriptions('desktop');
  await click('Remove product 3'); invalidSave = true; await click('Save Layout B');
  await until("document.body.innerText.includes('Fixture validation rejected the placement')");
  assert.equal(await evaluate("Boolean(document.querySelector('[aria-label=\"Remove product 3\"]'))"), false, '400 preserves draft');
  conflict = true; await click('Save Layout B');
  await until("document.body.innerText.includes('Latest saved state loaded')");
  await until("Boolean(document.querySelector('[aria-label=\"Remove product 3\"]'))");
  assert.equal(writes().length, 3, '409 must not replay writes');
  checks.push('400 retains edits, 409 reloads current server state without retrying the write');
  await click('A · Baseline'); assert.equal(await evaluate("document.querySelector('[aria-label=\"Add recommendation 101\"]')===null||document.querySelector('[aria-label=\"Add recommendation 101\"]').disabled"), true);
  await capture('f07-baseline'); await click('B · Recommendations');
  await click('F08 · Campaign & simulation');
  await evaluate("(()=>{for(const [label,value] of [['Evaluation start','2026-11-11'],['Evaluation end','2026-11-20']]){const input=document.querySelector('[aria-label=\"'+label+'\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));}})()");
  await click('Run offline simulation'); await until("document.body.innerText.includes('Offline simulation report saved')");
  await click('Choose Layout B'); await until("document.body.innerText.includes('Campaign decision saved')");
  await click('Publish campaign'); await until("document.body.innerText.includes('Campaign publish completed')");
  await capture('f08-campaign'); await click('F07 · Layout design');
  checks.push('offline simulation, matching report decision and publishing use current versions');
  // Keep dates valid: empty date fields used to hide the missing campaign-state guard.
  const fillSimulationDates = async () => evaluate("(()=>{for(const [label,value] of [['Evaluation start','2026-11-11'],['Evaluation end','2026-11-20']]){const input=document.querySelector('[aria-label=\"'+label+'\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));}})()");
  for (const status of ['PUBLISHED', 'ACTIVE', 'ENDED']) {
    campaign.status = status;
    await go('/layouts-campaigns');
    await until("document.body.innerText.includes('F06 #101')");
    await click('F08 · Campaign & simulation');
    await fillSimulationDates();
    await until("document.querySelector('[aria-label=\"Evaluation end\"]').value==='2026-11-20'");
    assert.equal(await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Run offline simulation').disabled"), true, status + ' must disable simulation even with valid dates and READY layouts');
    const simulationsBefore = calls.filter(item => item.path.endsWith('/simulations')).length;
    await evaluate("document.querySelector('[aria-label=\"Evaluation start\"]').form.requestSubmit()");
    await sleep(120);
    assert.equal(calls.filter(item => item.path.endsWith('/simulations')).length, simulationsBefore, status + ' form submission must not send an API request');
    assert.equal(await evaluate("Boolean(document.querySelector('[aria-label=\"Saved simulation reports\"]'))"), true, 'Historical reports remain readable');
  }
  checks.push('PUBLISHED, ACTIVE and ENDED block simulation with valid dates, including direct form submission; reports remain readable');
  campaign.status = 'PUBLISHED';
  await go('/layouts-campaigns');
  await until("document.body.innerText.includes('F06 #101')");
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await capture('f07-mobile'); assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth+2'), false, 'No mobile page overflow');
  await checkScoreDescriptions('mobile');
  checks.push('A/B Product counts and Priority coverage use separate non-overlapping lines on desktop and mobile');
  checks.push('read-only A and mobile layout');
  role = 'STORE_ADMIN'; await go('/store/layout'); await until("document.body.innerText.includes('View-only.')");
  assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Save Layout B')"), false);
  assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Store Layout')"), false);
  checks.push('Store Admin read-only and legacy route opens F07 without duplicate navigation');
  await click('F08 · Campaign & simulation'); await click('Activate campaign'); await until("document.body.innerText.includes('Campaign activate completed')");
  await click('Restore previous campaign'); await until("document.body.innerText.includes('Campaign rollback completed')");
  checks.push('Store Admin activation and rollback consume their correct response types');
  emptyRecommendations = true; b.placements[0].valid = false; b.placements[0].validationErrors = ['Fixture inventory changed'];
  await go('/layouts-campaigns'); await until("document.body.innerText.includes('Fixture inventory changed') && document.body.innerText.includes('F06 #101')");
  checks.push('saved rows still render without a recommendation picker match and display server validation');
  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS', checks, realBackendWrites: 0, artifacts }, null, 2));
} finally { ws?.close(); chrome.kill(); }
