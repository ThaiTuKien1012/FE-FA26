// Browser integration with HTTP fixtures only; never a real Backend E2E result.
// Start Vite, then node --import tsx tests/f03.browser.mjs.
// ALL /api requests are intercepted before navigation; unexpected requests fail closed.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { configView, scores, matrix, legacyMatrix, season, snapshot } from './f03.fixtures.ts';

const origin = process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3000';
const root = resolve(tmpdir()), profile = mkdtempSync(join(root, 'paspm-f03-browser-')), artifacts = process.env.PASPM_TEST_NO_ARTIFACTS === '1' ? null : mkdtempSync(join(root, 'paspm-f03-preview-'));
const chrome = spawn(process.env.F03_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-sync', '--disable-extensions', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fixtureRole, cdp, initId;
const calls = [], unexpected = [], errors = [], checks = [];
let compactListApiMutations = 0;
let precisionFixture = false;
const state = { singleMatrix:false,catalogUnavailable:false,config: structuredClone(configView), seasons: [structuredClone(season)], memberships: new Map([[1, []]]), seasonConflict: false, seasonDelay: 0, duplicate: false, deleteConflict: false, assignError: false, assignExisting: false, scores: structuredClone(scores), scoreDelay: 0, expiryEmpty: false, expiryError: false, historyEmpty: false, historyError: false, created: false, empty: false, ready: true, warnings: [], previewDelay: 0, createDelay: 0, snapshotError: false, snapshotNetworkError: false, createId: 122, createdCount: 0, lastCreatedSnapshot: null, snapshotTotal: null, previewError: false, configError: false, forbiddenMatrix: false, matrixMode: 'W2', unsupported: false };
class CDP {
  next = 0; pending = new Map(); listeners = new Map();
  constructor(ws) { this.ws = ws; ws.addEventListener('message', e => { const data = JSON.parse(e.data); if (data.id) { const p = this.pending.get(data.id); if (!p) return; this.pending.delete(data.id); data.error ? p.reject(new Error(data.error.message)) : p.resolve(data.result); } else for (const handler of this.listeners.get(data.method) || []) void handler(data.params); }); }
  call(method, params = {}) { return new Promise((resolve, reject) => { const id = ++this.next; const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, method === 'Page.captureScreenshot' ? 30000 : 10000); this.pending.set(id, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); } }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  on(name, callback) { this.listeners.set(name, [...this.listeners.get(name) || [], callback]); }
}
async function evaluate(expression) { const r = await cdp.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result?.value; }
async function until(expression, label) { const end = Date.now() + 10000; while (Date.now() < end) { if (await evaluate(expression)) return; await sleep(50); } throw new Error('UI timeout: ' + label); }
const visible = "([...document.querySelectorAll('main')].map(e=>e.innerText).join(' ').replace(/\\s+/g,' '))";
const has = text => until(visible + '.toLowerCase().includes(' + JSON.stringify(text.toLowerCase()) + ')', text);
const buttons = "[...(document.querySelector('dialog[open]')||document.querySelector('main')).querySelectorAll('button')].filter(b=>b.getClientRects().length)";
async function click(text) { await until(buttons + '.some(b=>b.innerText.trim()===' + JSON.stringify(text) + '&&!b.disabled)', 'click ' + text); await evaluate(buttons + '.find(b=>b.innerText.trim()===' + JSON.stringify(text) + ').click()'); }
async function aria(label) { const expr = "[...document.querySelectorAll('main button')].find(b=>b.getAttribute('aria-label')===" + JSON.stringify(label) + '&&b.getClientRects().length&&!b.disabled)'; await until('Boolean(' + expr + ')', label); await evaluate(expr + '.focus()'); await evaluate(expr + '.click()'); }
async function enabled(text) { return evaluate(buttons + '.some(b=>b.innerText.trim()===' + JSON.stringify(text) + '&&!b.disabled)'); }
async function tab(text) { await click(text); await has(({ Configuration: 'Utility Configuration', Seasons: 'Seasons', 'Product Weights': 'Product Weights', 'Weight Settings': 'Weight Settings', Preview: 'Utility Preview', Snapshots: 'Utility Snapshots' })[text]); }
async function input(label, value) { await until("[...document.querySelectorAll('input[aria-label="+JSON.stringify(label)+"]')].some(e=>e.getClientRects().length&&!e.matches(':disabled'))", 'Ready '+label); if (value && /^\d{4}-\d{2}-\d{2}/.test(value) && await evaluate('Boolean(document.querySelector('+JSON.stringify('input[aria-label='+JSON.stringify(label)+'][data-app-date-kind]')+'))')) { const [date,time] = value.split('T'); value = date.split('-').reverse().join('/') + (time ? ' '+time : ''); } assert.equal(await evaluate("(()=>{const e=[...document.querySelectorAll('input[aria-label=" + JSON.stringify(label) + "]')].find(e=>e.getClientRects().length);if(!e||e.disabled)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e," + JSON.stringify(value) + ");e.dispatchEvent(new Event('input',{bubbles:true}));return true;})()"), true, label); }
async function choose(id) { await input('Select product', 'SKU-' + id); await until("[...document.querySelectorAll('[role=option]')].some(e=>e.innerText.split('\\n')[0].trim().split(' ')[0]===" + JSON.stringify('SKU-' + id) + ')', 'Product SKU-' + id); await evaluate("[...document.querySelectorAll('[role=option]')].find(e=>e.innerText.split('\\n')[0].trim().split(' ')[0]===" + JSON.stringify('SKU-' + id) + ').click()'); }
async function selectFilter(label, value) {
  await evaluate("(()=>{const e=document.querySelector('select[aria-label=" + JSON.stringify(label) + "]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e," + JSON.stringify(value) + ");e.dispatchEvent(new Event('change',{bubbles:true}));})()");
}
async function openProduct(id) {
  await input('Search Name or SKU', 'Product ' + String(id).padStart(3, '0'));
  await sleep(300);
  await aria('View Details for Product ' + String(id).padStart(3, '0') + ' (SKU-' + id + ')');
  await has('Product Priority Details');
}
async function merchantProductChecks() {
  const before = calls.length, scoreCalls = () => calls.filter(c => /\/products\/\d+\/scores$/.test(c.path)).length;
  const catalog = "document.querySelector('table[aria-label=\"Product priorities catalog\"]')";
  const dialog = "document.querySelector('dialog[open][aria-label=\"Product Priority Details\"]')";
  const initialScores = scoreCalls();
  state.categoryError=true; await tab('Product Weights'); await has('Product 001');
  await has('Fixture categories unavailable'); state.categoryError=false; await click('Retry Categories');
  await until("document.querySelector('select[aria-label=\"Filter Category\"]').options.length===3",'Category retry');
  assert.equal(await evaluate(catalog + '.tBodies[0].rows.length'), 10);
  assert.equal(scoreCalls(), initialScores, 'Listing never requests priorities for each row');
  assert.equal(calls.slice(before).some(c => c.path === '/api/utility/expiry-push-batches'), false);
  assert.equal(await evaluate("[...document.querySelectorAll('input[aria-label=\"Select product\"]')].some(e=>e.getClientRects().length)"), false);
  await pageNext('products'); await has('Page 2 of 13'); await has('Product 011');
  await aria('Sort by Stock'); await has('Page 1 of 13');
  await until(catalog + ".tBodies[0].rows[0].innerText.includes('Product 001')", 'Server stock ascending');
  await aria('Sort by Stock'); await until(catalog + ".tBodies[0].rows[0].innerText.includes('Product 121')", 'Server stock descending across all pages');
  assert.ok(calls.some(c => c.path === '/api/products' && c.query.includes('sortBy=stockQuantity') && c.query.includes('sortDirection=desc') && c.query.includes('pageSize=10')));
  await selectFilter('Filter Category','1'); await selectFilter('Filter Status','INACTIVE');
  await input('Search Name or SKU','Product 00'); await sleep(300);
  await until(catalog + '.tBodies[0].rows.length===2', 'Combined catalog filters');
  assert.ok(calls.some(c=>c.path==='/api/products'&&new URLSearchParams(c.query).get('categoryId')==='1'&&new URLSearchParams(c.query).get('status')==='INACTIVE'&&new URLSearchParams(c.query).get('search')==='Product 00'));
  await input('Search Name or SKU','no such product'); await has('No products match');
  await selectFilter('Filter Category',''); await selectFilter('Filter Status',''); await input('Search Name or SKU',''); await has('Product 121');
  state.productError = true; await click('Refresh Products'); await has('Fixture products unavailable'); state.productError = false; await click('Retry Products'); await has('Product 121');
  assert.equal(await evaluate("document.querySelectorAll('select[aria-label=\"Product sort field\"],button[aria-label=\"Toggle product sort direction\"]').length"),0,'No separate sort toolbar');
  assert.equal(await evaluate(catalog + ".querySelectorAll('thead th button[aria-label=\"Sort by SKU\"]').length"),0,'Product header has no secondary SKU action');
  assert.equal(await evaluate('[...' + catalog + ".querySelectorAll('thead th')].every(e=>e.querySelectorAll('button').length<=1)"),true,'One sort action per column');
  assert.equal(await evaluate('[...'+catalog+".querySelectorAll('thead th')].every(e=>getComputedStyle(e).fontSize==='13px'&&getComputedStyle(e).fontWeight==='600')&&[..."+catalog+".querySelectorAll('.paspm-product-sort')].every(e=>getComputedStyle(e).color==='rgb(75, 85, 99)'&&getComputedStyle(e).backgroundColor==='rgba(0, 0, 0, 0)'&&getComputedStyle(e).fontWeight===(e.dataset.active==='true'?'700':'600'))"),true,'F03 neutral semibold header styling');
  await aria('Sort by Product name'); await has('Product 001');
  assert.equal(await evaluate("[..."+catalog+".querySelectorAll('.paspm-product-sort svg')].every(e=>getComputedStyle(e).width==='14px'&&getComputedStyle(e).height==='14px')"),true,'F03 uses shared F02 product sort icon size');
  const beforeSortLayout=await evaluate(`(()=>{const t=${catalog};return {widths:[...t.tHead.rows[0].cells].map(e=>e.getBoundingClientRect().width),height:t.tHead.getBoundingClientRect().height}})()`);
  state.productDelay=350;await aria('Sort by Category');
  await until(catalog+".closest('[aria-busy]').getAttribute('aria-busy')==='true'",'Catalog sort pending');
  assert.deepEqual(await evaluate(`(()=>{const t=${catalog};return {widths:[...t.tHead.rows[0].cells].map(e=>e.getBoundingClientRect().width),height:t.tHead.getBoundingClientRect().height}})()`),beforeSortLayout,'Catalog header stays stable during sorting');
  await until(catalog+".closest('[aria-busy]').getAttribute('aria-busy')==='false'",'Catalog sort settled');state.productDelay=0;
  for (const width of [1280,1366,1440,1920,1024,820,390,320]) {
    await cdp.call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true,'Catalog page fits '+width);
    if(width>=1280) assert.equal(await evaluate(`(()=>{const t=${catalog},r=t.tBodies[0].rows[0],b=r.querySelector('button').getBoundingClientRect(),c=r.cells[5].getBoundingClientRect();return t.scrollWidth<=t.clientWidth+1&&b.right<=c.right&&b.left>=c.left&&getComputedStyle(t).tableLayout==='fixed'})()`),true,'View Details visible without horizontal scroll '+width);
    else assert.equal(await evaluate("document.querySelector('ul[aria-label=\"Product priority cards\"]').getClientRects().length>0"),true);
  }
  await cdp.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await click('View All Batches Due for Push'); await has('2 days overdue');
  assert.equal(calls.filter(c=>c.path==='/api/utility/expiry-push-batches').at(-1).query.includes('productId='),false);
  await click('Hide All Batches');
  const beforeOpenBatches=count('/api/utility/expiry-push-batches');
  await openProduct(1); await has('Selected Season'); await has('Holiday');
  assert.equal(scoreCalls(),initialScores+1); assert.equal(count('/api/utility/expiry-push-batches'),beforeOpenBatches,'Opening priorities does not automatically load batches');
  assert.equal(await evaluate(dialog + ".querySelectorAll('input,select,textarea').length"),0,'Priorities are read-only');
  assert.equal(await evaluate(dialog + ".innerText.includes('Clear Product')"),false);
  await evaluate(dialog + ".querySelector('button[aria-label=\"Close dialog\"]').focus()"); await key('Tab',8);
  assert.equal(await evaluate('document.activeElement.innerText'),'Close','Shift Tab wraps to last control'); await key('Tab');
  assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'),'Close dialog','Tab traps focus');
  state.scores={...structuredClone(scores),seasonId:3,seasonWeight:0.9,activeSeasons:[{...scores.activeSeasons[0],seasonId:7,name:'Equal Weight Later ID',weight:0.9},{...scores.activeSeasons[0],seasonId:3,name:'Backend Selected Season',weight:0.9}]};
  await click('Refresh Weights'); await has('Backend Selected Season');
  state.scores={...structuredClone(scores),seasonId:null,seasonWeight:0,activeSeasons:[],expiryRisk:0,batchesMissingPushDay:[10],warnings:['MISSING_PUSH_DAY','SLOW_MOVING_NO_RECENT_SALES']};
  await click('Refresh Weights'); await has('No active season');
  await evaluate(dialog + ".querySelector('details > summary').parentElement.open=true"); await has('No recent sales');
  state.scores={...state.scores,ready:false,lambdaValid:false,weightValue:null}; await click('Refresh Weights'); await has('Unavailable'); await has('Priority Strength exceeds');
  state.scoreError=true; await click('Refresh Weights'); await has('Fixture priorities unavailable'); state.scoreError=false;
  state.scores=structuredClone(scores); await click('Retry Weights'); await has('Readiness');
  state.wrongScore=true; await click('Refresh Weights'); await has('do not match this product'); state.wrongScore=false; await click('Retry Weights'); await has('Readiness');
  state.scores={...structuredClone(scores),weightValue:9.99};state.scoreDelay=700;await click('Refresh Weights');await has('Loading product priorities');
  await key('Escape'); await until('!'+dialog,'Escape closes read in flight');
  assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'),'View Details for Product 001 (SKU-1)','Close restores opener focus');
  state.scores=structuredClone(scores);state.scoreDelay=0;await openProduct(2);await has('Readiness');await sleep(750);
  assert.equal(await evaluate(dialog + ".querySelector('[data-priority-product]').dataset.priorityProduct"),'2');
  assert.equal(await evaluate(dialog + ".innerText.includes('9.99')"),false,'Late Product 1 response never appears in Product 2');
  await evaluate("[..."+dialog+".querySelectorAll('summary')].find(e=>e.innerText==='Batches Due for Push').parentElement.open=true");await has('Batches for Product 002');await has('2 days overdue');
  await input('Push Analysis Date','2026-11-10');await has('As of 10/11/2026');
  assert.ok(calls.some(c=>c.path==='/api/utility/expiry-push-batches'&&c.query.includes('productId=2')&&c.query.includes('asOfDate=2026-11-10')));
  state.expiryEmpty=true;await click('Refresh Batches');await has('No batches are due');state.expiryEmpty=false;state.expiryError=true;await click('Refresh Batches');await has('Fixture expiry unavailable');state.expiryError=false;await click('Refresh Batches');await has('2 days overdue');
  for (const width of [1440,820,390,320]) {
    await cdp.call('Emulation.setDeviceMetricsOverride',{width,height:800,deviceScaleFactor:1,mobile:width<768});
    assert.equal(await evaluate(`(()=>{const d=${dialog},r=d.getBoundingClientRect(),body=d.querySelector('.f03-season-dialog-body');return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&d.scrollWidth<=d.clientWidth+1&&body.scrollHeight>body.clientHeight&&document.documentElement.scrollWidth<=innerWidth+1})()`),true,'Priority modal scrolls internally at '+width);
  }
  await click('Close'); await until('!'+dialog,'Close button closes Details');
  await cdp.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await openProduct(121);await has('Readiness');
  await evaluate("history.pushState({},'', '/f03/preview');window.dispatchEvent(new PopStateEvent('popstate'))");await has('Utility Preview');await until('!'+dialog,'Route change removes priorities modal');
  await tab('Product Weights');assert.equal(await evaluate('Boolean('+dialog+')'),false);
  assert.equal(calls.slice(before).some(c=>c.method!=='GET'&&!c.path.startsWith('/api/auth/')),false,'Catalog, scores and batches never write');
  assert.equal(calls.slice(before).filter(c=>c.path==='/api/products').every(c=>new URLSearchParams(c.query).get('pageSize')==='10'),true,'Only ten products fetched per page');
  checks.push('Merchandiser catalog: GET-only 10/page, combined search/category/status, backend global sort and pagination, empty/error/retry; no eager score/batch reads; modal refresh/error/mismatch/late-response isolation, native focus/Escape/restore, lazy scoped Push Day batches, all-store batches and 1280–1920 desktop/320–1024 responsive layout');
}
async function openSeason(name) { await aria((fixtureRole === 'Store Admin' ? 'View ' : 'Edit ') + name); await has('Season Details'); }
async function storeAdminChecks() {
  const before=calls.length;
  await session('Store Admin','/f03/configuration');await has('View only. A Merchandiser manages these settings.');
  assert.deepEqual(await evaluate("[...document.querySelectorAll('nav[aria-label=\"Utility Planner tabs\"] button')].map(e=>e.innerText)"),['Weight Settings','Seasons','Product Weights','Snapshots']);
  assert.equal(await enabled('Save Configuration'),false);
  assert.equal(await evaluate("[...document.querySelectorAll('form input')].every(e=>e.matches(':disabled'))"),true);
  await evaluate("document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");
  await tab('Seasons');await has('Holiday');assert.equal(await enabled('Add Season'),false);
  await openSeason('Holiday');await has('Assigned Products');assert.equal(await enabled('Assign Product'),false);
  assert.equal(await evaluate("document.querySelector('[data-season-identity]').querySelectorAll('button').length"),0);
  await click('Close');
  const scoreCount=calls.filter(c=>/\/products\/\d+\/scores$/.test(c.path)).length;
  await tab('Product Weights');await has('Product 001');
  assert.equal(await evaluate("[...document.querySelectorAll('table[aria-label=\"Product priorities catalog\"] thead th')].every(e=>e.querySelectorAll('button').length<=1&&getComputedStyle(e).fontSize==='13px')"),true,'Store Admin shares single-action readable headers');
  assert.equal(calls.filter(c=>/\/products\/\d+\/scores$/.test(c.path)).length,scoreCount,'Store Admin catalog does not preload scores');
  assert.equal(await evaluate("[...document.querySelectorAll('input[aria-label=\"Select product\"]')].some(e=>e.getClientRects().length)"),false);
  assert.equal(await evaluate("document.querySelector('table[aria-label=\"Product priorities catalog\"]').tBodies[0].rows.length"),10);
  await aria('Sort by Stock');await pageNext('products');await has('Page 2 of 13');
  await openProduct(1);await has('Readiness');
  const priorities="document.querySelector('dialog[open][aria-label=\"Product Priority Details\"]')";
  assert.equal(await evaluate(priorities+".innerText.includes('Manage Seasons')"),false);
  assert.equal(await evaluate(priorities+".querySelectorAll('input,select,textarea,form').length"),0);
  await click('Refresh Weights');await has('Readiness');
  await key('Escape');await until('!'+priorities,'Read-only priorities Escape');
  assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'),'View Details for Product 001 (SKU-1)');
  const originals=['Product 1: MISSING_PUSH_DAY','Product 1: MISSING_PUSH_DAY','MISSING_PUSH_DAY','Other original evidence'];
  state.historyCount=6;state.historyWarnings={6:originals,5:['MISSING_PUSH_DAY']};
  await tab('Snapshots');await has('Snapshot #6');
  const list="document.querySelector('ul[aria-label=\"Saved snapshots\"]')";
  const history="[...document.querySelectorAll('section')].find(s=>s.querySelector('h2')?.innerText==='Saved Snapshots')";
  assert.equal(await enabled('Create Snapshot'),false);assert.equal(await enabled('Preview'),false);
  assert.equal(await evaluate(history+".innerText.includes('Details require Merchandiser access')"),false);
  assert.equal(await evaluate(list+".innerText.includes('Analysis date')&&"+list+".innerText.includes('Total weighted utility')&&!/Created At|Scoring Version|View Warnings/i.test("+list+'.innerText)'),true);
  const beforeDetails=calls.length;
  await aria('View Details for Snapshot #6');await has('Saved Weight Settings');await has('4 warnings');
  const metadata="document.querySelector('dialog[open][aria-label=\"Snapshot #6 Details\"]')";
  assert.equal(await evaluate('location.pathname'),'/f03/snapshots');
  assert.equal(await evaluate(metadata+".querySelectorAll('table,form,input').length"),0);
  assert.equal(await evaluate(metadata+".innerText.includes('Snapshot Matrix')"),false);
  assert.equal(await evaluate(metadata+".querySelectorAll('pre').length"),0,'Store Admin sees labeled saved settings without raw JSON');
  assert.equal(await evaluate(metadata+".textContent.includes('Expiry Importance')&&"+metadata+".textContent.includes('Saved Settings Details')"),true);
  const savedSettings = snapshot(6).configuration.config;
  assert.deepEqual(await evaluate('Object.fromEntries([...'+metadata+".querySelectorAll('dt')].filter(e=>['Expiry Importance','Season Importance','Priority Strength','Sales Window (days)'].includes(e.textContent)).map(e=>[e.textContent,e.nextElementSibling.textContent]))"),{'Expiry Importance':String(savedSettings.alpha),'Season Importance':String(savedSettings.beta),'Priority Strength':String(savedSettings.lambda),'Sales Window (days)':String(savedSettings.salesWindowDays)});
  await has('Other original evidence');await has('Repeated 2 times');assert.deepEqual(state.historyWarnings[6],originals,'Saved warning evidence remains unchanged');
  await has('05/11/2026 02:00 UTC');
  assert.equal(calls.slice(beforeDetails).some(c=>/^\/api\/utility\/snapshots\//.test(c.path)),false,'Metadata Details never calls restricted endpoints');
  await evaluate(metadata+".querySelector('button[aria-label=\"Close dialog\"]').focus()");await key('Tab',8);assert.equal(await evaluate('document.activeElement.innerText'),'Close');await key('Tab');assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'),'Close dialog');
  for(const width of [1440,820,390,320]){
    await cdp.call('Emulation.setDeviceMetricsOverride',{width,height:800,deviceScaleFactor:1,mobile:width<768});
    assert.equal(await evaluate(`(()=>{const d=${metadata},r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&d.scrollWidth<=d.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth+1})()`),true,'Read-only metadata modal fits '+width);
  }
  await key('Escape');await until('!'+metadata,'Metadata Escape');assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'),'View Details for Snapshot #6');
  for(const width of [1280,1440,820,390,320]){
    await cdp.call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true,'Shared Store Admin cards fit '+width);
    assert.equal(await evaluate(`(()=>{const r=${list}.children[0],b=r.querySelector('button').getBoundingClientRect(),box=r.getBoundingClientRect();return b.right<=box.right&&b.left>=box.left&&r.querySelector('.f03-snapshot-metrics').getBoundingClientRect().width>0})()`),true);
  }
  await cdp.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  state.historyCount=1;state.historyOverrides={1:{configuration:null}};await click('Refresh Snapshots');await has('Snapshot #1');
  await until(list+'.children.length===1','Single saved metadata row');
  assert.equal(await evaluate(history+".querySelectorAll('nav').length"),0);
  await aria('View Details for Snapshot #1');await has('Saved settings are not available');await has('No warnings were recorded');await click('Close');
  state.historyOverrides={};state.historyCount=0;await click('Refresh Snapshots');await has('No saved snapshots yet');
  assert.equal(await evaluate(history+".innerText.includes('Calculate a Preview')"),false);
  state.historyCount=21;await click('Refresh Snapshots');await has('Snapshot #21');await pageNext('snapshots');await has('Page 2 of 2');await click('Refresh Snapshots');await has('Page 2 of 2');
  await aria('View Details for Snapshot #1');await has('Saved Weight Settings');
  await evaluate("history.pushState({},'', '/f03/configuration');window.dispatchEvent(new PopStateEvent('popstate'))");await has('View only. A Merchandiser manages these settings.');await until("!document.querySelector('dialog[open]')",'Metadata closes on navigation');
  assert.equal(calls.slice(before).some(c=>c.path.startsWith('/api/utility/')&&c.method!=='GET'),false,'Store Admin never mutates F03');
  assert.equal(calls.slice(before).some(c=>/^\/api\/utility\/snapshots\//.test(c.path)),false,'Store Admin never reads forbidden Snapshot/Matrix routes');
  state.historyCount=null;state.historyWarnings={};
  checks.push('Store Admin: shared catalog/modal and four tabs; read-only settings/Season/weights; no F03 writes or restricted Snapshot/Matrix GET; list-only Details preserves saved config/warnings, no raw JSON or fake Matrix; focus/Escape/close, refresh, zero/one/multiple pages and responsive cards/modal');
}
async function pageNext(label) { const expr = "[...document.querySelectorAll('nav[aria-label=" + JSON.stringify(label + ' pagination') + "] button')].find(b=>b.innerText==='Next'&&b.getClientRects().length&&!b.disabled)"; await until('Boolean(' + expr + ')', 'Next ' + label); await evaluate(expr + '.click()'); }
async function session(role, path = '/f03/configuration') {
  fixtureRole = role;
  if (initId) await cdp.call('Page.removeScriptToEvaluateOnNewDocument', { identifier: initId });
  const source = "localStorage.clear();sessionStorage.clear();document.cookie='PASPM-CSRF=" + (role ? 'fixture-csrf; path=/' : '; Max-Age=0; path=/') + "';";
  initId = (await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source })).identifier;
  await cdp.call('Page.navigate', { url: origin + path });
}
async function capture(name) { if (!artifacts) return; await cdp.call('Page.bringToFront'); await evaluate('window.scrollTo(0,0)'); await sleep(100); const shot = await cdp.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !(await evaluate('Boolean(document.querySelector("dialog[open]"))')) }); writeFileSync(join(artifacts, name + '.png'), Buffer.from(shot.data, 'base64')); }
async function captureCreate(name) { if (!artifacts) return; const rect = await evaluate("(()=>{const r=document.querySelector('[data-create-snapshot]').closest('section').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()"); const shot=await cdp.call('Page.captureScreenshot',{format:'png',clip:rect,captureBeyondViewport:true});writeFileSync(join(artifacts,name+'.png'),Buffer.from(shot.data,'base64')); }
async function key(key, modifiers = 0) { const windowsVirtualKeyCode = key === 'Tab' ? 9 : key === 'Escape' ? 27 : 0; await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', key, modifiers, windowsVirtualKeyCode }); await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key, modifiers, windowsVirtualKeyCode }); }
const count = (path, method) => calls.filter(c => c.path === path && (!method || c.method === method)).length;
Object.assign(state, { historyCount: null, historyWarnings: {}, historyDelay: 0, historyOverrides: {} });
const savedSnapshot = id => ({ ...snapshot(id), ...state.historyOverrides[id], warnings: state.historyWarnings[id] || [] });

async function savedSnapshotUiChecks() {
  state.config = structuredClone(configView);
  const snapshotPosts = count('/api/utility/snapshots', 'POST');
  await session('Merchandiser'); await has('Save Configuration');
  await input('Sales Window', '31'); await tab('Preview'); await has('Weight Settings have unsaved changes');
  assert.equal(await evaluate("document.querySelector('[data-preview-notice]').compareDocumentPosition([...document.querySelectorAll('h2')].find(e=>e.innerText==='Select Sales Period')) & Node.DOCUMENT_POSITION_FOLLOWING"), 4);
  await tab('Weight Settings'); const savedVersion = state.config.config.version + 1; await click('Save Configuration'); await has('Configuration version ' + savedVersion + ' saved');
  await tab('Preview'); await has('Calculate Preview again');
  assert.equal(await evaluate("document.querySelector('[data-preview-notice]').innerText.includes('unsaved')"), false);
  await click('Calculate Preview'); await has('Expiry Risk');
  assert.equal(await evaluate("Boolean(document.querySelector('[data-preview-notice]'))"), false);
  await input('Analysis Date', '2026-11-06'); await has('Analysis Date changed');
  await click('Calculate Preview'); await has('Expiry Risk');
  await until("!document.querySelector('[data-preview-notice]')", 'Successful Preview clears notice');
  state.config = structuredClone(configView);
  checks.push('Preview notice above sales period: unsaved settings, saved settings, analysis date and successful recalculation');

  state.historyCount = 1;
  await session('Merchandiser', '/f03/snapshots'); await has('Snapshot #1');
  const list = "document.querySelector('ul[aria-label=\"Saved snapshots\"]')";
  const history = "[...document.querySelectorAll('section')].find(s=>s.querySelector('h2')?.innerText==='Saved Snapshots')";
  assert.equal(await evaluate(history + ".querySelectorAll('table').length"), 0);
  assert.equal(await evaluate(list + '.children.length'), 1);
  assert.equal(await evaluate(list + '.querySelectorAll("dl").length'), 1);
  assert.equal(await evaluate("/Analysis date/i.test(" + list + '.innerText)&&/Total weighted utility/i.test(' + list + '.innerText)&&!/Created at|Scoring Version/i.test(' + list + '.innerText)'), true);
  assert.equal(await evaluate(history + ".querySelectorAll('nav').length"), 0);
  assert.equal(await evaluate(history + ".innerText.includes('0 warnings')"), false);
  const rowsBefore = await evaluate(list + '.innerText');
  const widthsBefore = await evaluate('[...' + list + '.children[0].children].map(c=>c.getBoundingClientRect().width)');
  state.historyDelay = 400; await click('Refresh Snapshots');
  await until(history + ".querySelector('[aria-busy=true]')!==null", 'History refreshing');
  assert.equal(await evaluate(list + '.innerText'), rowsBefore, 'Refresh retains saved rows');
  assert.deepEqual(await evaluate('[...' + list + '.children[0].children].map(c=>c.getBoundingClientRect().width)'), widthsBefore);
  assert.equal(await evaluate(list + '.querySelector("button").disabled'), true);
  await until(history + ".querySelector('[aria-busy=true]')===null", 'History refreshed'); state.historyDelay = 0;
  assert.equal(await evaluate(list + '.innerText'), rowsBefore);

  const originals = ['Product 1: MISSING_PUSH_DAY', 'Product 1: MISSING_PUSH_DAY', 'MISSING_PUSH_DAY', 'Product 2: MISSING_PUSH_DAY', 'Product 2: MISSING_PUSH_DAY', 'Product 2: MISSING_PUSH_DAY', 'Unmapped warning with original evidence', 'Product 1: MISSING_PUSH_DAY'];
  state.historyCount = 6; state.historyWarnings = { 6: originals, 5: ['MISSING_PUSH_DAY'] };
  await click('Refresh Snapshots'); await has('Snapshot #6');
  for (const width of [1280, 1366, 1440, 1920]) {
    await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    assert.equal(await evaluate(`(()=>{const l=${list},r=l.children[0],i=r.children[0].getBoundingClientRect(),s=r.querySelector('.f03-snapshot-status'),sr=s.getBoundingClientRect(),a=r.querySelector('.f03-snapshot-controls'),b=a.querySelector('button').getBoundingClientRect(),w=a.querySelector('.f03-snapshot-warning'),wr=w.getBoundingClientRect(),heights=[...l.children].map(e=>e.getBoundingClientRect().height),h=${history},title=h.querySelector('h2').getBoundingClientRect(),refresh=[...h.querySelectorAll('button')].find(e=>e.innerText==='Refresh Snapshots').getBoundingClientRect();return l.children.length===6&&r.querySelectorAll('h3').length===1&&r.querySelectorAll('button').length===1&&i.right<=a.getBoundingClientRect().left&&sr.right<=wr.left&&wr.left-sr.right<=9&&wr.right<=b.left&&b.left-wr.right<=9&&Math.abs((sr.top+sr.bottom)-(b.top+b.bottom))<2&&b.right<=r.getBoundingClientRect().right&&w.innerText==='8 warnings'&&s.innerText.includes('READY')&&getComputedStyle(w).backgroundColor!=='rgba(0, 0, 0, 0)'&&parseFloat(getComputedStyle(w).fontSize)<parseFloat(getComputedStyle(r.querySelector('h3')).fontSize)&&Math.max(...heights)-Math.min(...heights)<1&&Math.max(...heights)<90&&parseFloat(getComputedStyle(l).rowGap)===8&&Math.abs(title.top-refresh.top)<5&&refresh.left>title.right})()`), true, 'Compact horizontal card with grouped right controls at ' + width);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), true);
  }
  assert.equal(await evaluate(history + ".innerText.includes('View Warnings')"), false);
  assert.equal(await evaluate(list + ".children[1].querySelector('.f03-snapshot-controls').innerText.includes('1 warning')"), true);
  assert.equal(await evaluate(list + ".children[2].querySelector('.f03-snapshot-controls').innerText.includes('warning')"), false);
  for (const width of [1024, 820, 640, 390, 320]) {
    await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 });
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), true);
    assert.equal(await evaluate(`(()=>{const l=${list},r=l.children[0],b=r.querySelector('button').getBoundingClientRect(),box=r.getBoundingClientRect(),s=r.querySelector('.f03-snapshot-status').getBoundingClientRect(),w=r.querySelector('.f03-snapshot-warning').getBoundingClientRect(),heights=[...l.children].map(e=>e.getBoundingClientRect().height),h=${history},refresh=[...h.querySelectorAll('button')].find(e=>e.innerText==='Refresh Snapshots').getBoundingClientRect();return l.getClientRects().length>0&&l.children.length===6&&r.innerText.includes('8 warnings')&&b.left>=box.left&&b.right<=box.right&&s.right<=box.right&&(innerWidth>=640?s.right<=w.left&&w.right<=b.left:s.bottom<=w.top&&w.right<=b.left)&&Math.max(...heights)-Math.min(...heights)<1&&refresh.right<=h.getBoundingClientRect().right&&r.querySelectorAll('button').length===1})()`), true, 'Responsive card without duplicate actions at ' + width);
  }
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp.call('Page.bringToFront');
  await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  await evaluate("[...document.querySelectorAll('button[aria-label=\"View Details for Snapshot #6\"]')].find(b=>b.getClientRects().length).focus()");
  await until("document.activeElement.getAttribute('aria-label')==='View Details for Snapshot #6'", 'Details keyboard focus');
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await has('Snapshot Warnings'); await has('Product 001'); await has('Repeated 3 times');
  assert.deepEqual(await evaluate("Object.fromEntries([...([...document.querySelectorAll('section')].find(s=>s.querySelector('h2')?.innerText==='Summary')).querySelectorAll('dt')].filter(e=>['Analysis Date','Total Weighted Utility','Created At'].includes(e.innerText)).map(e=>[e.innerText,e.nextElementSibling.innerText]))"), {'Analysis Date':'05/11/2026','Total Weighted Utility':'242.35554','Created At':'05/11/2026 02:00 UTC'});
  assert.equal(await evaluate('location.search'), '?id=6');
  const warnings = "[...document.querySelectorAll('section')].find(s=>s.querySelector('h2')?.innerText==='Snapshot Warnings')";
  assert.equal(await evaluate(warnings + ".querySelectorAll('pre').length"), 0, 'No raw warning JSON in Merchandiser details');
  assert.equal(await evaluate("/Technical Details|Matrix Hash|Source Hash|Original warnings/.test(document.querySelector('main').textContent)"), false, 'No technical dumps in Merchandiser Snapshot Details');
  assert.equal(await evaluate(warnings + ".innerText.includes('Saved status: READY')"), true);
  assert.equal(await evaluate("Boolean(document.querySelector('dialog[open]'))"), false);
  await click('Back to Snapshots'); await has('Snapshot #6');
  await aria('View Details for Snapshot #5'); await has('1 warning.');
  await click('Back to Snapshots'); await has('Snapshot #4');
  await aria('View Details for Snapshot #4'); await has('No warnings were recorded');
  await click('Back to Snapshots'); await has('Snapshot #6');
  state.historyCount = 0; await click('Refresh Snapshots'); await has('No saved snapshots yet');
  assert.equal(await evaluate(history + ".querySelectorAll('nav').length"), 0);
  state.historyCount = 21; await click('Refresh Snapshots'); await has('Snapshot #21'); await pageNext('snapshots'); await has('Page 2 of 2');
  await has('Snapshot #1'); assert.equal(await evaluate(list + '.children.length'), 1);
  await click('Refresh Snapshots'); await has('Page 2 of 2');
  assert.equal(count('/api/utility/snapshots', 'POST'), snapshotPosts, 'History, details and refresh never create snapshots');
  state.historyCount = null; state.historyWarnings = {};
  checks.push('Compact horizontal Snapshot cards: identity/period, right-aligned independent status plus amber 0/1/8 warnings and View Details; uniform row heights and gaps; Analysis Date and Total Weighted Utility in shared cards, Created At and full original warnings only in Details; keyboard/mouse routes, stable refresh, empty/single/multiple pages; desktop 1280/1366/1440/1920 and responsive 1024/820/640/390/320');
}
const categories = [{id:1,name:'Dairy',status:'ACTIVE'}, {id:2,name:'Seasonal',status:'INACTIVE'}];
const product = id => ({ id, name: `Product ${String(id).padStart(3, '0')}`, sku: 'SKU-' + id, unit: 'EA', requiresExpiry: id % 2 === 1, category: categories[(id - 1) % 2], sellingPrice: 20, costPrice: 10, status: id % 3 === 0 ? 'INACTIVE' : 'ACTIVE', stockQuantity: id * 3 });
Object.assign(state, { productError:false, categoryError:false, scoreError:false, wrongScore:false, productDelay:0 });
async function paused({ requestId, request }) {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  calls.push({ path, method, query: url.search, body: request.postData, role: fixtureRole });
  const page = Number(url.searchParams.get('page') || 0), size = Number(url.searchParams.get('pageSize') || 20), payload = request.postData ? JSON.parse(request.postData) : undefined;
  let body, code = 200, emptyBody = false;
  try {
    if (path === '/api/auth/refresh') body = { accessToken: 'browser-test-only-token', expiresIn: 3600, tokenType: 'Bearer', csrfToken: 'fixture-csrf' };
    else if (path === '/api/auth/me') body = { userId: fixtureRole === 'System Admin' ? 1 : 12, name: 'Fixture User', email: 'fixture@example.invalid', roleCode: ({ 'System Admin': 'SYSTEM_ADMIN', 'Store Admin': 'STORE_ADMIN', Merchandiser: 'MERCHANDISER', 'End-Customer': 'END_CUSTOMER' })[fixtureRole], storeId: fixtureRole === 'System Admin' ? null : 1, status: 'ACTIVE', emailVerified: true };
    else if (path === '/api/utility/config') {
      if (method === 'PUT') { if (state.configError) { code = 409; body = { error: 'Fixture configuration conflict' }; } else { state.config.config = { ...state.config.config, ...payload, version: state.config.config.version + 1 }; body = state.config; } } else body = state.config;
    } else if (path === '/api/categories') { if(state.categoryError){code=503;body={error:'Fixture categories unavailable'};}else body=categories;
    } else if (path === '/api/products') {
      const search = (url.searchParams.get('search') || '').toLowerCase();
      const categoryId=Number(url.searchParams.get('categoryId')||0),status=url.searchParams.get('status'),sortBy=url.searchParams.get('sortBy')||'name',direction=url.searchParams.get('sortDirection')==='desc'?-1:1;
      const all = Array.from({ length: 121 }, (_, i) => product(i + 1)).filter(p => (!search || p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search))&&(!categoryId||p.category.id===categoryId)&&(!status||p.status===status));
      all.sort((a,b)=>{const x=sortBy==='category'?a.category.name:a[sortBy],y=sortBy==='category'?b.category.name:b[sortBy];return direction*(typeof x==='string'?x.localeCompare(y):Number(x)-Number(y))||a.id-b.id;});
      body = { content: all.slice(page * size, (page + 1) * size), page, pageSize: size, totalElements: all.length, totalPages: Math.ceil(all.length / size) };
      await sleep(state.productDelay);if(state.productError){code=503;body={error:'Fixture products unavailable'};}
    } else if (/^\/api\/products\/\d+$/.test(path)) { body=product(Number(path.split('/').at(-1)));if(state.catalogUnavailable){code=404;body={error:'Catalog label unavailable'};}
    } else if (path === '/api/utility/seasons' && method === 'GET') body = { items: state.seasons.slice(page * size, (page + 1) * size), page, pageSize: size, totalElements: state.seasons.length };
    else if (path === '/api/utility/seasons' && method === 'POST') {
      await sleep(state.seasonDelay);
      if (state.duplicate) { code = 409; body = { error: 'A season with this name already exists in the Store' }; }
      else { body = { ...season, ...payload, seasonId: 2, version: 1, productCount: 0 }; state.seasons.push(body); state.memberships.set(2, []); code = 201; }
    } else if (/^\/api\/utility\/seasons\/\d+$/.test(path)) {
      const id = Number(path.split('/').at(-1)), view = state.seasons.find(s => s.seasonId === id);
      if (method === 'PUT') {
        await sleep(state.seasonDelay);
        if (state.seasonConflict) { view.version++; code = 409; body = { error: 'Season was changed by another request; reload it' }; }
        else { assert.equal(payload.expectedVersion, view.version); Object.assign(view, payload, { version: view.version + 1 }); delete view.expectedVersion; body = view; }
      } else if (method === 'DELETE') {
        if (state.deleteConflict || view.productCount > 0) { code = 409; body = { error: 'Unassign every product before deleting the season' }; }
        else { state.seasons = state.seasons.filter(s => s.seasonId !== id); code = 204; emptyBody = true; }
      } else body = view;
    } else if (/^\/api\/utility\/seasons\/\d+\/products(?:\/\d+)?$/.test(path)) {
      const id = Number(path.split('/')[4]), members = state.memberships.get(id) || [], pid = Number(path.split('/')[6]);
      if (method === 'GET') body = { items: members.slice(page * size, (page + 1) * size), page, pageSize: size, totalElements: members.length };
      else if (state.assignError) { code = 404; body = { error: 'Product is unavailable in this store' }; }
      else if (method === 'PUT') { if (!members.some(p => p.productId === pid)) members.push({ ...product(pid), productId: pid, assignedBy: 12, assignedAt: '2026-11-05T02:00:00Z' }); state.memberships.set(id, members); code = state.assignExisting ? 200 : 201; emptyBody = true; }
      else { state.memberships.set(id, members.filter(p => p.productId !== pid)); code = 204; emptyBody = true; }
      state.seasons.find(s => s.seasonId === id).productCount = state.memberships.get(id).length;
    } else if (/^\/api\/utility\/products\/\d+\/scores$/.test(path) && method === 'GET') { const result = { ...structuredClone(state.scores), productId: state.wrongScore?999:Number(path.split('/')[4]) }; const scoreError=state.scoreError;await sleep(state.scoreDelay); body = result;if(scoreError){code=503;body={error:'Fixture priorities unavailable'};} }
    else if (path === '/api/utility/expiry-push-batches') {
      body = { items: [{ productId: Number(url.searchParams.get('productId') || 1), batchId: page + 1, pushDay: '2026-11-03', expiryDate: null, remainingQuantity: 12, daysToPush: -2 }], page, pageSize: size, totalElements: 21, asOfDate: url.searchParams.get('asOfDate') || '2026-11-05', timeZone: 'Asia/Ho_Chi_Minh', warnings: [] };
      if (state.expiryEmpty) body = { ...body, items: [], totalElements: 0 }; if (state.expiryError) { code = 503; body = { error: 'Fixture expiry unavailable' }; }
    } else if (path === '/api/utility/preview') {
      const result = { ...matrix(payload.page), ready: state.ready, warnings: [...state.warnings] };if(state.singleMatrix)Object.assign(result,{items:result.items.slice(0,2),page:0,totalElements:2,totalWeightedUtility:23.08148}); if (state.empty) Object.assign(result, { items: [], totalElements: 0, totalWeightedUtility: 0 });
      await sleep(state.previewDelay); body = result; if (state.previewError) { code = 409; body = { error: 'Priority Strength exceeds Lambda Policy' }; }
    } else if (path === '/api/utility/snapshots' && method === 'POST') {
      await sleep(state.createDelay);
      if (state.snapshotError) { code = 503; body = { error: 'Fixture snapshot creation failed' }; } else { state.created = true; state.createdCount++; body = { ...snapshot(state.createId), ...payload, ...(state.snapshotTotal === null ? {} : { totalWeightedUtility: state.snapshotTotal }) }; state.lastCreatedSnapshot = body; code = 201; if (state.snapshotNetworkError) { await cdp.call('Fetch.failRequest', { requestId, errorReason: 'ConnectionClosed' }); return; } }
    } else if (path === '/api/mining/snapshots') {
      await sleep(state.historyDelay);
      if (state.historyError) { code = 503; body = { error: 'Fixture history unavailable' }; } else { const count = state.historyEmpty ? 0 : state.historyCount ?? 121 + state.createdCount; body = { items: Array.from({ length: Math.max(0, Math.min(size, count - page * size)) }, (_, i) => state.historyCount === null && state.created && page === 0 && i === 0 ? state.lastCreatedSnapshot : savedSnapshot(count - page * size - i)), page, pageSize: size, totalElements: count }; }
    } else if (/^\/api\/utility\/snapshots\/\d+$/.test(path)) {
      body = Number(path.split('/').at(-1)) === state.lastCreatedSnapshot?.snapshotId ? state.lastCreatedSnapshot : savedSnapshot(Number(path.split('/').at(-1))); if (state.matrixMode !== 'W2') body.configuration = legacyMatrix(state.matrixMode).configuration;
      if (state.unsupported) body.configuration = { ...body.configuration, config: { ...body.configuration.config, scoringVersion: 'FUTURE_V9' } };
    } else if (/^\/api\/utility\/snapshots\/\d+\/matrix$/.test(path)) { body = state.matrixMode === 'W2' ? matrix(page) : legacyMatrix(state.matrixMode); if (state.forbiddenMatrix) { code = 403; body = { error: 'Forbidden matrix fixture' }; } }
    else if (path === '/api/mining/requests') body = { items: [], page, pageSize: size, totalElements: 0 };
    else if (path === '/api/system/utility/lambda-policy') { if (method === 'PUT') { state.config.lambdaPolicy = { ...state.config.lambdaPolicy, ...payload, version: state.config.lambdaPolicy.version + 1 }; } body = state.config.lambdaPolicy; }
    else { unexpected.push({ path, method }); code = 500; body = { error: 'Unexpected API blocked by fixtures' }; }
    await cdp.call('Fetch.fulfillRequest', { requestId, responseCode: code, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], ...(emptyBody ? {} : { body: Buffer.from(precisionFixture ? JSON.stringify(body).replace(/("totalWeightedUtility":)[-\d.eE+]+/g,'$1'+'12345678901.123456').replace(/("expiryRisk":)[-\d.eE+]+/g,'$1'+'0.333333333333333333') : JSON.stringify(body)).toString('base64') }) });
  } catch (e) { if (!/Invalid InterceptionId|Invalid Fetch|No resource|closed/.test(e.message)) { errors.push(e.stack); try { await cdp.call('Fetch.fulfillRequest', { requestId, responseCode: 500 }); } catch {} } }
}
try {
  const end = Date.now() + 10000; while (!existsSync(join(profile, 'DevToolsActivePort')) && Date.now() < end) await sleep(100);
  const port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0]);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(), ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  cdp = new CDP(ws); cdp.on('Fetch.requestPaused', paused); cdp.on('Runtime.exceptionThrown', e => errors.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
  await cdp.call('Page.enable'); await cdp.call('Runtime.enable'); await cdp.call('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*', requestStage: 'Request' }] });
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  await session('Merchandiser', '/f03/snapshots'); await has('Calculate a Preview before creating a snapshot.');
  assert.equal(await evaluate("document.querySelector('[data-create-snapshot]').dataset.state"), 'preview-required');
  assert.equal(await enabled('Create Snapshot'), false); await has('Save a frozen utility dataset for mining.');
  await captureCreate('create-snapshot-preview-required');
  const postsBeforePreviewNavigation = count('/api/utility/snapshots', 'POST'); await click('Go to Preview'); await has('Utility Preview'); assert.equal(count('/api/utility/snapshots', 'POST'), postsBeforePreviewNavigation);
  state.config.config.alpha=0.333333;state.config.config.beta=0.666667;
  await session('Merchandiser'); await has('Save Configuration');await has('Saved importance uses finer precision');
  assert.equal(await evaluate("document.querySelector('input[aria-label=\"Expiry Importance\"]').value"),'0.3');
  assert.equal(count('/api/utility/config','PUT'),0,'loading must not rewrite the saved coefficients');
  await input('Priority Strength','0.4');await click('Save Configuration');await has('Configuration version 8 saved');
  const preserved=JSON.parse(calls.findLast(c=>c.path==='/api/utility/config'&&c.method==='PUT').body);assert.equal(preserved.alpha,0.333333);assert.equal(preserved.beta,0.666667);

  assert.equal(await evaluate("document.querySelectorAll('nav[aria-label=\"Utility Planner tabs\"] button').length"), 5);
  await evaluate("(()=>{const e=document.querySelector('nav[aria-label=\"Utility Planner tabs\"] button');e.focus();e.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));})()");
  assert.equal(await evaluate('document.activeElement.innerText'), 'Seasons');
  await input('Expiry Importance', '0.3'); assert.equal(await evaluate("document.querySelector('input[aria-label=\"Season Importance\"]').value"), '0.7');
  await input('Priority Strength', '0.500001'); assert.equal(await enabled('Save Configuration'), false);
  await input('Priority Strength', '0.3'); await input('Sales Window', '366'); assert.equal(await enabled('Save Configuration'), false);
  await input('Sales Window', '30'); state.configError = true; await click('Save Configuration'); await has('Fixture configuration conflict'); assert.equal(await evaluate("document.querySelector('input[aria-label=\"Expiry Importance\"]').value"), '0.3');
  state.configError = false; await click('Save Configuration'); await has('Configuration version 9 saved');
  assert.deepEqual(Object.keys(JSON.parse(calls.findLast(c => c.path === '/api/utility/config' && c.method === 'PUT').body)).sort(), ['alpha', 'beta', 'lambda', 'salesWindowDays']);
  await capture('configuration-1440'); checks.push('W2 config exact complement, validation, preserved failed draft, four-field PUT');
  state.config.lambdaValid = false; state.config.config.lambda = 0.7; await click('Refresh Configuration'); await has("The current Priority Strength exceeds the system's allowed range");
  assert.equal(await evaluate("document.querySelector('input[aria-label=\"Priority Strength\"]').value"), '0.7');
  state.config.lambdaValid = true; state.config.config.lambda = 0.3; await click('Refresh Configuration'); await has('Valid');

  await tab('Seasons'); await has('Holiday');
  assert.equal(await evaluate("document.querySelectorAll('dialog[open]').length"), 0);
  assert.equal(await evaluate("(()=>{const h=document.querySelector('[data-season-header]'),r=h.getBoundingClientRect(),bs=[...h.querySelectorAll('button')].map(b=>b.getBoundingClientRect());return bs.length===2&&Math.abs(bs[0].top-bs[1].top)<1&&Math.abs(bs[0].height-bs[1].height)<1&&bs[0].top<r.top+16&&bs[1].right<=r.right+1})()"), true, 'Header actions align on the desktop title row');
  assert.equal(await evaluate(visible + ".includes('Status uses Store time')"), false);
  assert.equal(await evaluate("(()=>{const rows=[...document.querySelectorAll('.f03-season-list > li')];return rows.length===1&&rows.every(r=>{const bs=[...r.querySelectorAll('button')];return bs.length===1&&bs[0].innerText==='Edit'&&!bs[0].querySelector('svg')})})()"), true);
  assert.equal(await evaluate("(()=>{const row=document.querySelector('.f03-season-list-row'),meta=row.querySelector('.f03-season-list-meta');return !document.querySelector('section[aria-label=\"Seasons list\"] table')&&meta.children.length===4&&meta.innerText.includes('Priority: 0.8')&&meta.innerText.includes('0 products')&&meta.innerText.includes('Version 2')&&[...meta.children].every(e=>getComputedStyle(e).backgroundColor==='rgba(0, 0, 0, 0)'&&getComputedStyle(e).borderWidth==='0px')&&parseFloat(getComputedStyle(meta).fontSize)<parseFloat(getComputedStyle(row.querySelector('h2')).fontSize)})()"), true, 'Compact metadata is labelled, secondary and unboxed');
  assert.equal(await evaluate("document.querySelector('section[aria-label=\"Seasons list\"]').querySelectorAll('nav').length"), 0, 'One page has no disabled pagination controls');
  const listWrites = () => calls.filter(c => c.path.startsWith('/api/utility/') && c.method !== 'GET').length;
  const listWritesBefore = listWrites(), originalList = state.seasons;
  const longSeasonName = 'Holiday essentials and everyday groceries promotion for families across all neighbourhood stores';
  state.seasons = [
    { ...season, seasonId: 701, name: 'November Promotion 2026', startDate: '2026-11-01', endDate: '2026-11-30', weight: 0.8, productCount: 3, version: 1 },
    { ...season, seasonId: 702, name: longSeasonName, activeToday: false, weight: 0.6, productCount: 1 },
    { ...season, seasonId: 703, name: 'Winter essentials', startDate: '2026-12-01', endDate: '2027-01-31', activeToday: false, productCount: 0 }
  ];
  state.memberships.set(701, Array.from({ length: 3 }, (_, i) => ({ ...product(i + 1), productId: i + 1, assignedBy: 12, assignedAt: '2026-11-05T02:00:00Z' })));
  await click('Refresh Seasons'); await has(longSeasonName); await has('3 products'); await has('1 product'); await has('Not active today');
  assert.equal(await evaluate("document.querySelectorAll('.f03-season-list > li').length"), 3);
  assert.equal(await evaluate("document.querySelectorAll('.f03-season-list > li')[2].querySelector('.f03-season-list-meta > li').innerText"), '01/12/2026 – 31/01/2027');
  for (const width of [1440, 820, 390]) {
    await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 });
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), true);
    assert.equal(await evaluate("(()=>{const rows=[...document.querySelectorAll('.f03-season-list-row')],buttons=rows.map(r=>r.querySelector('button').getBoundingClientRect());return buttons.every(r=>Math.abs(r.height-buttons[0].height)<1&&Math.abs(r.right-buttons[0].right)<1&&r.right<=innerWidth)&&rows.every(r=>r.querySelector('.f03-season-list-heading').getBoundingClientRect().right<=r.querySelector('button').getBoundingClientRect().left)})()"), true, 'Long names do not overlap consistently aligned actions');
    if (width === 1440) assert.equal(await evaluate("(()=>{const m=[...document.querySelector('.f03-season-list-meta').children].map(e=>e.getBoundingClientRect());return m.every(r=>Math.abs(r.top-m[0].top)<1)})()"), true, 'Desktop metadata stays on one line');
    await capture('compact-seasons-' + width);
  }
  await openSeason('November Promotion 2026'); await has('Product 003');
  assert.equal(await evaluate("[...document.querySelectorAll('[data-season-summary] dt')].map(e=>e.innerText).join('|')"), 'Date Range|Seasonal Priority|Products');
  assert.equal(await enabled('Delete'), false); await click('Close');
  state.seasons = originalList; await click('Refresh Seasons'); await has('Holiday');
  compactListApiMutations = listWrites() - listWritesBefore;
  assert.equal(compactListApiMutations, 0, 'Compact list browsing and opening/closing details only send GET requests');
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  checks.push('Compact list: one/many/long names, active/inactive, compact and cross-year dates, labelled unboxed metadata, aligned single action, 1440/820/390 screenshots, unchanged modal and zero feature API mutations');
  await click('Add Season'); await until("document.activeElement?.getAttribute('aria-label')==='Season Name'", 'Editor starts at name'); await click('Save Season'); await has('dd/mm/yyyy'); await input('Start Date', '2026-12-01'); await input('End Date', '2026-12-31'); await click('Save Season'); await has('Enter a season name');
  await input('Season Name', 'New Season'); await input('Start Date', '2026-12-01'); await input('End Date', '2026-12-31'); await input('Seasonal Priority', '0.7');
  state.duplicate = true; await click('Save Season'); await has('already exists'); assert.equal(await evaluate("document.querySelector('input[aria-label=\"Season Name\"]').value"), 'New Season');
  state.duplicate = false; state.seasonDelay = 500; const beforeCreateSeason = count('/api/utility/seasons', 'POST'); await click('Save Season'); await key('Escape'); assert.equal(await evaluate("Boolean(document.querySelector('dialog[open][aria-label=\"Add Season\"]'))"), true); assert.equal(await enabled('Cancel'), false); await has('Season created successfully'); assert.equal(count('/api/utility/seasons', 'POST'), beforeCreateSeason + 1); state.seasonDelay = 0;
  assert.equal('expectedVersion' in JSON.parse(calls.findLast(c => c.path === '/api/utility/seasons' && c.method === 'POST').body), false);
  await openSeason('New Season'); await has('No products are assigned');
  await evaluate("void(window.seasonDialogIdentity=document.querySelector('dialog[open]'))");
  assert.equal(await evaluate("[...document.querySelectorAll('[data-season-summary] dt')].map(e=>e.innerText).join('|')"), 'Date Range|Seasonal Priority|Products');
  assert.equal(await evaluate("(()=>{const d=document.querySelector('dialog[open]'),id=d.querySelector('[data-season-identity]'),sum=d.querySelector('[data-season-summary]');return id.getBoundingClientRect().bottom<=sum.getBoundingClientRect().top&&[...d.querySelectorAll('footer button')].map(b=>b.innerText).join('|')==='Close'&&id.querySelectorAll('button').length===2&&!id.querySelector('button svg')})()"), true, 'Identity actions precede three summary cards; footer only closes');
  assert.equal(await evaluate("document.querySelector('dialog[open] details').open"), false, 'Weight explanation starts collapsed');
  await click('Edit Season'); await has('Save Changes'); assert.equal(await evaluate("document.querySelector('dialog[open]')===window.seasonDialogIdentity"), true, 'Edit uses the existing dialog DOM node');
  await input('Season Name', 'Updated Season'); state.seasonConflict = true; await click('Save Changes'); await has('updated elsewhere');
  const conflicts = count('/api/utility/seasons/2', 'PUT'); await sleep(100); assert.equal(count('/api/utility/seasons/2', 'PUT'), conflicts); assert.equal(await enabled('Save Changes'), false);
  state.seasonConflict = false; await click('Reload Latest Version'); await has('Your draft is preserved'); assert.equal(await evaluate("document.querySelector('input[aria-label=\"Season Name\"]').value"), 'Updated Season');
  await click('Save Changes'); await has('Season updated successfully'); await has('No products are assigned');
  assert.equal(await evaluate("document.querySelector('dialog[open]')===window.seasonDialogIdentity"), true);
  await input('Select product', 'SKU-'); await until("document.querySelectorAll('[role=option]').length===20", 'First product page'); await click('Load more products'); await until("document.querySelectorAll('[role=option]').length===40", 'Second product page');
  await choose(121); state.assignError = true; await click('Assign Product'); await has('Product is unavailable'); state.assignError = false;
  await click('Assign Product'); await has('Product assigned'); await has('Product 121'); assert.equal(await enabled('Delete'), false);
  await click('Close'); await openSeason('Holiday'); await has('No products are assigned'); await choose(121); await click('Assign Product'); await has('Product assigned'); await has('Product 121');
  assert.equal(state.memberships.get(1)[0].productId, 121); assert.equal(state.memberships.get(2)[0].productId, 121);
  await click('Close'); await openSeason('Updated Season'); await has('Product 121');
  await aria('Unassign Product 121'); await has('Product unassigned'); await has('No products are assigned');
  state.assignExisting = true; await choose(121); await click('Assign Product'); await has('Product assigned'); await has('Product 121'); state.assignExisting = false;
  await aria('Unassign Product 121'); await has('No products are assigned');
  const deleteBeforeCancel = count('/api/utility/seasons/2', 'DELETE'); await click('Delete'); await has('Delete Season'); await click('Cancel'); await has('Assigned Products'); assert.equal(count('/api/utility/seasons/2', 'DELETE'), deleteBeforeCancel);
  await click('Delete'); state.deleteConflict = true; await click('Delete Season'); await has('Unassign every product'); state.deleteConflict = false; await click('Delete Season'); await has('Season deleted');
  await openSeason('Holiday'); await has('Product 121'); await aria('Unassign Product 121'); await has('No products are assigned'); await click('Close');
  checks.push('Header alignment, compact labelled list and single role action; in-place edit/save and 409 draft recovery; unchanged CRUD/membership, empty 201/200/204, delete confirmation/Cancel/409, server Product search beyond 100');

  const november = { ...season, seasonId: 901, name: 'November Promotion 2026', startDate: '2026-11-01', endDate: '2026-11-30', productCount: 3, version: 1 };
  state.seasons.unshift(november); state.memberships.set(901, Array.from({ length: 3 }, (_, i) => ({ ...product(i + 1), productId: i + 1, assignedBy: 12, assignedAt: '2026-11-05T02:00:00Z' })));
  state.seasons.push({ ...season, seasonId: 902, name: 'Future Season', startDate: '2099-01-01', endDate: '2099-12-31', activeToday: false }, { ...season, seasonId: 903, name: 'Past Season', startDate: '2000-01-01', endDate: '2000-12-31', activeToday: false });
  await click('Refresh Seasons'); await has('Not active today'); assert.equal(await evaluate(visible + ".includes('Upcoming')||" + visible + ".includes('Ended')"), false, 'No client-clock season status');
  assert.equal(await evaluate("[...document.querySelectorAll('.f03-season-list-row')].every(r=>r.querySelector('.f03-season-list-heading h2')&&r.querySelector('.f03-season-badge')&&r.querySelector('.f03-season-list-meta').children.length===4&&r.querySelectorAll('button').length===1)"), true, 'Each compact row keeps its information together');
  await capture('seasons-list-desktop'); await openSeason('November Promotion 2026'); await has('Product 003');
  assert.equal(await enabled('Delete'), false); await has('Unassign all products before deleting this season.');
  assert.equal(await evaluate("[...document.querySelectorAll('[data-season-summary] dd')].at(-1).innerText"), '3');
  await capture('season-details-desktop'); await evaluate("void(window.seasonDialogIdentity=document.querySelector('dialog[open]'))");
  await click('Edit Season'); await has('Save Changes'); await capture('season-edit-mode');
  assert.equal(await evaluate("document.querySelector('dialog[open]')===window.seasonDialogIdentity"), true);
  assert.equal(await enabled('Delete'), false); const writesBeforeDraft = calls.filter(c => c.path.startsWith('/api/utility/seasons') && c.method !== 'GET').length;
  await input('Start Date', '18/11'); await key('Escape'); await has('Discard unsaved changes?'); await click('Keep Editing'); assert.equal(await evaluate("document.querySelector('input[aria-label=\"Start Date\"]').value"), '18/11'); await input('Start Date', '2026-11-01');
  await input('Season Name', 'Unsaved Season Draft'); await key('Escape'); await has('Discard unsaved changes?'); await click('Keep Editing');
  assert.equal(await evaluate("document.querySelector('input[aria-label=\"Season Name\"]').value"), 'Unsaved Season Draft');
  await aria('Close dialog'); await has('Discard unsaved changes?'); await key('Escape'); await has('Save Changes');
  await click('Cancel'); await has('Product 003'); assert.equal(state.seasons.find(s => s.seasonId === 901).name, november.name);
  await click('Edit Season'); await input('Season Name', 'Discard this draft'); await aria('Close dialog'); await click('Discard Changes'); await until("!document.querySelector('dialog[open]')", 'Explicit discard closes modal');
  assert.equal(calls.filter(c => c.path.startsWith('/api/utility/seasons') && c.method !== 'GET').length, writesBeforeDraft);
  await openSeason('November Promotion 2026'); await has('Product 003');
  for (const width of [820, 390]) {
    await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 });
    assert.equal(await evaluate("(()=>{const d=document.querySelector('dialog[open]'),r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&d.scrollWidth<=d.clientWidth+1})()"), true);
    await capture('season-details-' + width);
  }
  await evaluate("document.querySelector('dialog[open] footer button').focus()"); await key('Tab'); assert.equal(await evaluate("document.querySelector('dialog[open]').contains(document.activeElement)"), true); await key('Tab', 8); assert.equal(await evaluate("document.querySelector('dialog[open]').contains(document.activeElement)"), true);
  await key('Escape'); await until("!document.querySelector('dialog[open]')", 'Escape closes overview'); assert.equal(await evaluate("document.activeElement?.getAttribute('aria-label')"), 'Edit November Promotion 2026');
  const originalMembers = state.memberships.get(1); state.memberships.set(1, Array.from({ length: 45 }, (_, i) => ({ ...product(i + 1), productId: i + 1, assignedBy: 12, assignedAt: '2026-11-05T02:00:00Z' }))); state.seasons.find(s => s.seasonId === 1).productCount = 45;
  await openSeason('Holiday'); await has('Product 020'); assert.equal(await evaluate("(()=>{const e=document.querySelector('.f03-season-products');return e.scrollHeight>e.clientHeight})()"), true);
  await pageNext('assigned products'); await has('Product 021'); await has('Page 2 of 3'); await click('Close');
  state.memberships.set(1, originalMembers); state.seasons = state.seasons.filter(s => s.seasonId < 900); state.seasons[0].productCount = originalMembers.length;
  await click('Refresh Seasons'); await openSeason('Holiday'); await has('No products are assigned');
  await evaluate("history.pushState({},'', '/f03/preview');window.dispatchEvent(new PopStateEvent('popstate'))"); await has('Utility Preview'); await until("!document.querySelector('dialog[open]')", 'No orphaned modal on navigation'); await tab('Seasons');
  const savedSeasons = state.seasons; state.seasons = []; await click('Refresh Seasons'); await has('No seasons yet'); state.seasons = savedSeasons; await click('Refresh Seasons'); await has('Holiday');
  state.seasons = Array.from({ length: 21 }, (_, i) => ({ ...season, seasonId: i + 1000, name: `Paged Season ${i + 1}` })); await click('Refresh Seasons'); await has('Paged Season 1'); await pageNext('seasons'); await has('Paged Season 21'); await has('Page 2 of 2'); state.seasons = savedSeasons; await click('Refresh Seasons'); await has('Holiday');
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  checks.push('One dialog DOM node across overview/edit/confirmation; three summary cards and top actions; safe Save/Escape, unsaved Keep/Discard/Cancel, native focus trap/restore, read-only access, server-only status, real pagination, 45 assigned products and 390/820/1440 modal bounds');
  await merchantProductChecks();

  await tab('Preview'); await input('Start Date', '2026-10-01'); await input('End Date', '2026-10-31'); await input('Analysis Date', '2026-11-05');
  assert.equal(await evaluate("document.querySelector('input[aria-label=\"Start Date\"]').value"), '01/10/2026');
  state.warnings=['Product 1: inactive Product; historical transactions retained, not currently sellable','MISSING_PUSH_DAY','Unlinked warning'];
  await click('Calculate Preview'); await has('Expiry Risk');await has('Needs Attention');await has('Product 001');
  assert.equal(await evaluate("[...document.querySelectorAll('details > summary')].find(e=>e.innerText.includes('3 warnings')).parentElement.open"),false,'warning list starts collapsed');
  await evaluate("[...document.querySelectorAll('details > summary')].find(e=>e.innerText.includes('View Issue')).parentElement.open=true");
  assert.equal(await evaluate("[...document.querySelectorAll('details > summary')].find(e=>e.innerText.includes('View Issue')).parentElement.innerText.includes('Unlinked warning')"),false,'unlinked warning is never attached to a row');
  assert.equal(await evaluate("document.querySelector('.f03-data-table:not(.f03-catalog-table) thead button').disabled"),true,'partial matrix cannot be sorted as a page');
  state.singleMatrix=true;state.warnings=[];await click('Calculate Preview');await until("document.querySelector('.f03-data-table:not(.f03-catalog-table) tbody').rows.length===2",'complete matrix');
  const sortPosts=count('/api/utility/preview');await click('Transaction');await until("document.querySelector('.f03-data-table:not(.f03-catalog-table) th[aria-sort=ascending]')!==null",'ascending sort');await evaluate("document.querySelector('.f03-data-table:not(.f03-catalog-table) thead button').click()");
  await until("document.querySelector('.f03-data-table:not(.f03-catalog-table) tbody tr td').innerText==='#2'",'whole dataset sort');assert.equal(count('/api/utility/preview'),sortPosts,'sorting does not recalculate utility');
  state.singleMatrix=false;await click('Calculate Preview');await until("document.querySelector('.f03-data-table:not(.f03-catalog-table) tbody').rows.length===20",'paged matrix restored');
  checks.push('importance tenths preserve legacy precision; explicit all-Store push scope; product names; collapsed and exactly linked warnings; complete-dataset sort only, without Preview replay');
  const beforeInvalidDate = count('/api/utility/preview'); await input('Start Date', '31/04/2026'); await click('Calculate Preview'); await has('Enter a valid date'); assert.equal(count('/api/utility/preview'), beforeInvalidDate);
  await tab('Snapshots'); assert.equal(await enabled('Create Snapshot'), false); await tab('Preview'); await input('Start Date', '2026-10-01');
  state.previewError = true; await click('Calculate Preview'); await has('Priority Strength exceeds Lambda Policy'); await has('Review Configuration'); state.previewError = false;
  state.empty = true; await click('Calculate Preview'); await has('No utility rows'); await tab('Snapshots'); assert.equal(await enabled('Create Snapshot'), false); state.empty = false;
  await tab('Preview'); state.ready = false; await click('Calculate Preview'); await has('Not Ready'); await tab('Snapshots'); assert.equal(await enabled('Create Snapshot'), false); state.ready = true;
  await tab('Preview'); state.warnings = ['MISSING_PUSH_DAY', 'SLOW_MOVING_NO_RECENT_SALES']; await click('Calculate Preview'); await has('Expiry Risk');await until("[...document.querySelectorAll('details > summary')].some(e=>e.innerText.includes('View All'))",'Preview warning summary loaded');await evaluate("[...document.querySelectorAll('details > summary')].find(e=>e.innerText.includes('View All')).parentElement.open=true"); await has('No recent sales'); await pageNext('matrix rows'); await has('Page 2 of 2'); await capture('preview-1440');
  await tab('Snapshots'); await has('Preview Ready');
  assert.equal(await evaluate("document.querySelector('[data-create-snapshot]').dataset.state"), 'ready');
  assert.equal(await enabled('Review Preview'), true); assert.equal(await enabled('Create Snapshot'), true);
  assert.equal(await evaluate("[...document.querySelectorAll('[data-create-snapshot] dt')].find(e=>e.innerText==='Matrix Row Count').nextElementSibling.innerText"), '21');
  for (const width of [1440, 390]) {
    await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 });
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), true); await captureCreate('create-snapshot-ready-' + width);
  }
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const postsBeforeReview = count('/api/utility/snapshots', 'POST'); await click('Review Preview'); await has('Utility Preview'); assert.equal(count('/api/utility/snapshots', 'POST'), postsBeforeReview);
  const previewPosts = count('/api/utility/preview'); await tab('Weight Settings'); await input('Sales Window', '31'); await tab('Snapshots'); assert.equal(await enabled('Create Snapshot'), false);
  await tab('Preview'); await click('Calculate Preview'); await tab('Seasons'); await openSeason('Holiday'); await has('No products are assigned'); await choose(121); await click('Assign Product'); await has('Product assigned'); await click('Close'); await tab('Snapshots'); assert.equal(await enabled('Create Snapshot'), false);
  await tab('Preview'); state.previewDelay = 650; await click('Calculate Preview'); await tab('Seasons'); await openSeason('Holiday'); await has('Product 121'); await aria('Unassign Product 121'); await has('Product unassigned'); await sleep(700); state.previewDelay = 0; await click('Close'); await tab('Snapshots'); assert.equal(await enabled('Create Snapshot'), false);
  await tab('Preview'); await click('Calculate Preview'); await tab('Snapshots'); state.snapshotError = true; let before = count('/api/utility/snapshots', 'POST'); await click('Create Snapshot'); await has('No automatic retry'); await sleep(100); assert.equal(count('/api/utility/snapshots', 'POST'), before + 1); assert.equal(await enabled('Create Snapshot'), false);
  state.snapshotError = false; await tab('Preview'); await click('Calculate Preview'); await tab('Snapshots'); state.createDelay = 500; before = count('/api/utility/snapshots', 'POST');
  await evaluate(buttons + ".find(b=>b.innerText.trim()==='Create Snapshot').click()");
  await until("document.querySelector('[data-create-snapshot]').dataset.state==='creating'", 'Creating status');
  assert.equal(await enabled('Review Preview'), false); await evaluate(buttons + ".find(b=>b.innerText.trim()==='Creating…')?.click()"); await has('Snapshot #122 created successfully'); assert.equal(count('/api/utility/snapshots', 'POST'), before + 1); assert.equal(await enabled('Create Snapshot'), false); state.createDelay = 0;
  assert.equal(await evaluate("document.querySelector('[data-create-snapshot]').dataset.state"), 'created');
  assert.equal(await evaluate("(()=>{const e=document.querySelector('[data-create-snapshot]');return e.innerText.includes('Your utility snapshot is saved and ready for mining.')&&e.innerText.includes('A new Preview is required to create another snapshot.')&&!e.innerText.includes('Recalculation required')&&!e.innerText.includes('Snapshot creation was submitted')&&!e.innerText.includes('View Created Snapshot')&&!e.innerText.includes('Preview Ready')})()"), true, 'Saved readiness never masquerades as a reusable Preview');
  assert.ok(count('/api/utility/preview') > previewPosts); assert.deepEqual(Object.keys(JSON.parse(calls.findLast(c => c.path === '/api/utility/snapshots' && c.method === 'POST').body)).sort(), ['asOfDate', 'rangeEnd', 'rangeStart']);
  await pageNext('snapshots'); await has('Page 2 of 7'); state.historyError = true; await click('Refresh Snapshots'); await has('Fixture history unavailable'); state.historyError = false; state.historyEmpty = true; await click('Refresh Snapshots'); await has('No saved snapshots yet'); state.historyEmpty = false; await click('Refresh Snapshots'); await has('READY');
  await click('View Snapshot #122'); await has('Frozen Configuration'); assert.equal(await evaluate('location.search'), '?id=122'); await click('Back to Snapshots'); await has('Snapshot #122 created successfully');
  await click('Run New Preview'); await has('Utility Preview'); await click('Calculate Preview'); await tab('Snapshots'); await has('Preview Ready');
  assert.equal(await evaluate("document.querySelector('[data-create-snapshot]').dataset.state"), 'ready', 'New Preview replaces the previous confirmation in the form');
  state.snapshotNetworkError = true; state.createId = 935; before = count('/api/utility/snapshots', 'POST'); await click('Create Snapshot'); await has('Unable to reach the server'); await has('No automatic retry');
  assert.equal(await evaluate("document.querySelector('[data-create-snapshot]').dataset.state"), 'preview-required');
  assert.equal(await evaluate("document.querySelector('[data-create-snapshot]').innerText.includes('created successfully')"), false);
  assert.equal(count('/api/utility/snapshots', 'POST'), before + 1); assert.equal(await enabled('Create Snapshot'), false);
  await click('Refresh Snapshots'); await has('#935'); assert.equal(count('/api/utility/snapshots', 'POST'), before + 1, 'History reconciles a lost response without replaying POST'); state.snapshotNetworkError = false;
  state.createId = 936; state.snapshotTotal = 432.123456;
  await click('Go to Preview'); await has('Utility Preview'); await click('Calculate Preview'); await tab('Snapshots'); await has('Preview Ready'); await click('Create Snapshot'); await has('Snapshot #936 created successfully');
  assert.equal(await evaluate("[...document.querySelectorAll('[data-create-snapshot] dt')].find(e=>e.innerText==='Total Weighted Utility').nextElementSibling.innerText"), '432.123456', 'Success values come from the confirmed response');
  for (const width of [1440, 390]) {
    await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 });
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), true); await captureCreate('create-snapshot-created-' + width);
  }
  await click('View Snapshot #936'); await has('Frozen Configuration'); assert.equal(await evaluate('location.search'), '?id=936'); await click('Back to Snapshots'); await has('Snapshot #936 created successfully'); await click('Run New Preview'); await has('Utility Preview');
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  checks.push('Create Snapshot: required/ready/creating/confirmed states; no misleading consumed-preview warning; response-specific ID/total; ready/created desktop/mobile screenshots; correct View/Run New Preview routes; new Preview overrides old confirmation; lost-response history reconciliation and no POST replay');
  checks.push('Preview empty/unready/warnings/pagination; invalidation on dates/config and season membership including in-flight result; snapshot consumes reviewed preview, no retry, double-submit guard, history pagination/error/empty');

  for (const version of ['W2', 'F03_LINEAR_V1', 'EXPIRY_PRODUCT_EARLIEST_BATCH_BINARY_V1']) { state.matrixMode = version; await session('Merchandiser', '/f03/snapshot/detail?id=21'); await has('Frozen Configuration'); await has(version === 'W2' ? 'Expiry Risk' : 'Historical scoring model'); await has('Snapshot Matrix'); await capture('snapshot-' + version); }
  state.matrixMode = 'W2'; state.unsupported = true; const beforeUnsupported = count('/api/utility/snapshots/21'); await session('Merchandiser', '/f03/snapshot/detail?id=21'); await has('Contact your administrator'); assert.equal(await enabled('Retry Snapshot'), false); await sleep(150); assert.equal(count('/api/utility/snapshots/21'), beforeUnsupported + 1); state.unsupported = false;
  state.forbiddenMatrix = true; await session('Merchandiser', '/f03/snapshot/matrix?id=21'); await has('Access denied (403)'); await has('Frozen Configuration'); state.forbiddenMatrix = false;
  checks.push('W2 and both frozen legacy snapshots, unknown scoring version blocked without retry, matrix 403');

  await savedSnapshotUiChecks();
  await storeAdminChecks();
  const featureCalls = () => calls.filter(c => !c.path.startsWith('/api/auth/')).length, beforeDenied = featureCalls();
  for (const [role, path] of [['Store Admin', '/f03/preview'], ['Store Admin', '/f03/snapshot/detail?id=21'], ['System Admin', '/f03/seasons'], ['End-Customer', '/f03/seasons']]) { await session(role, path); await has('Access Restricted'); }
  assert.equal(featureCalls(), beforeDenied);
  await session('Store Admin', '/f03/expiry-window'); await has('Product Weights');
  await session('Merchandiser', '/f03/snapshot'); await has('Utility Snapshots'); assert.equal(await enabled('Create Snapshot'), false);
  await session('Merchandiser'); await has('Save Configuration');
  for (const width of [390, 820]) {
    await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 });
    await tab('Weight Settings'); assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), true); await capture('configuration-' + width);
    await tab('Seasons'); await has('Holiday'); assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), true); await capture('seasons-' + width);
    await click('Add Season'); await capture('season-form-' + width); await aria('Open calendar for Start Date'); await until("Boolean(document.querySelector('.app-calendar:popover-open'))", 'Calendar in Season dialog'); assert.equal(await evaluate("document.querySelector('dialog[open]').contains(document.querySelector('.app-calendar'))"), true); await capture('season-calendar-' + width); await key('Escape'); assert.equal(await evaluate("Boolean(document.querySelector('dialog[open]'))"), true); await click('Cancel');
    await tab('Preview'); await click('Calculate Preview'); await has('Expiry Risk'); assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), true); await capture('preview-' + width);
    await tab('Snapshots'); await has('READY'); assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), true); await capture('snapshots-' + width);
  }
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 1000, deviceScaleFactor: 1, mobile: true });
  await session('System Admin', '/admin/lambda-policy'); await has('Priority Strength Policy'); assert.equal(await evaluate("!!document.querySelector('input[aria-label=\"Minimum Lambda\"]')"), false);
  await input('Maximum Priority Strength (λ)', '0.4'); await click('Save Policy'); await has('Priority Strength Policy updated'); assert.deepEqual(JSON.parse(calls.findLast(c => c.path === '/api/system/utility/lambda-policy' && c.method === 'PUT').body), { lambdaMax: 0.4 }); await capture('lambda-policy-390');
  checks.push('Store Admin read-only across four tabs; role denial without feature requests; legacy links; System Admin lambdaMax-only policy; responsive 1440/820/390 without page overflow');
  precisionFixture = true; state.matrixMode = 'W2'; state.forbiddenMatrix = false; state.unsupported = false;
  const beforePrecisionWrites = calls.filter(c=>c.method !== 'GET' && !c.path.startsWith('/api/auth/')).length;
  await session('Merchandiser', '/f03/snapshot/detail?id=21'); await has('12,345,678,901.123456'); await has('0.333333333333333333');
  await session('Store Admin', '/f03/snapshots'); await has('12,345,678,901.123456');
  assert.equal(calls.filter(c=>c.method !== 'GET' && !c.path.startsWith('/api/auth/')).length,beforePrecisionWrites);
  checks.push('Raw numeric JSON: scale-6 utility and scale-18 risk retain exact digits in frozen Snapshot/Matrix and read-only history; no feature mutations');
  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []); assert.equal(calls.some(c => c.method === 'PATCH' && c.path.includes('/scores')), false);
  console.log(JSON.stringify({ result: 'PASS (HTTP fixtures only; real E2E not run)', checks, interceptedApiCalls: calls.length, compactListApiMutations, realBackendWrites: 0, artifacts }, null, 2));
} catch (error) { try { await capture('failure'); } catch {} console.log(JSON.stringify({ result: 'FAIL', error: error.stack, checks, errors, unexpected, pageDiagnostics: await evaluate("({location:location.href,active:document.activeElement?.tagName,text:document.querySelector('main')?.innerText.slice(0,2200)})").catch(()=>null), modalDiagnostics: await evaluate("[...document.querySelectorAll('dialog')].map(e=>({label:e.getAttribute('aria-label'),open:e.open,text:e.innerText.slice(-500)}))").catch(()=>null), artifacts }, null, 2)); process.exitCode = 1; }
finally {
  if (cdp) { try { await cdp.call('Browser.close'); } catch {} cdp.ws.close(); }
  if (chrome.exitCode === null) await Promise.race([new Promise(r => chrome.once('exit', r)), sleep(2000)]);
  if (chrome.exitCode === null) chrome.kill();
  const target = resolve(profile); if (dirname(target) === root && basename(target).startsWith('paspm-f03-browser-')) { try { rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {} }
}
