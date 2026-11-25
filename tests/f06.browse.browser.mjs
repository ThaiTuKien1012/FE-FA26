// node --import tsx tests/f06.browse.browser.mjs (Vite must be running).
// All /api requests are intercepted before navigation. No real backend writes.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { recommendation, eligibility, policy } from './f06.fixtures.ts';
import { requestFixture, runFixture } from './f05.fixtures.ts';

const origin = process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3000';
const base = resolve(tmpdir()), profile = mkdtempSync(join(base, 'paspm-f06-browse-browser-'));
const artifacts = process.env.PASPM_TEST_NO_ARTIFACTS === '1' ? null : mkdtempSync(join(base, 'paspm-f06-browse-preview-'));
const chrome = spawn(process.env.F06_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
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
const calls = [], errors = [], unexpected = [], checks = [];
const state = { role: 'MERCHANDISER', storeId: 1, listStatus: 200, detailStatus: 200, empty: false, holdList: false, network: false, ready: false, availability: null, reviewStatus: 'APPROVED', namesUnavailable: false, visual:false, longNames:false, noImages:false };
const session = "(await (window.fixtureAuth ??= import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/services/authService.ts').name))).authService";
async function until(expression, label) {
  const end = Date.now() + 12000;
  while (Date.now() < end) { if (await page.evaluate(expression)) return; await sleep(40); }
  throw new Error('UI timeout: ' + label);
}
const has = text => until(`document.body.innerText.includes(${JSON.stringify(text)}) || [...document.querySelectorAll(".f02-page-position")].some(e=>e.textContent===${JSON.stringify(text)})`, text);
async function click(label) {
  assert.equal(await page.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.closest('[hidden]'));if(!b||b.disabled)return false;b.click();return true;})()`), true, 'Clickable: ' + label);
}
async function select(id, value) {
  await page.evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});const setter=Object.getOwnPropertyDescriptor(e.tagName==='INPUT'?HTMLInputElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLSelectElement.prototype,'value').set;setter.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);
}
async function login(role = 'MERCHANDISER', storeId = 1) {
  state.role = role; state.storeId = storeId;
  await page.evaluate(`(async()=>{const auth=${session};auth.endLocal();await auth.authenticate('/api/auth/login',{email:'fixture@example.invalid',password:'fixture-only'});history.pushState({},'','/recommendations?miningRunId=42');dispatchEvent(new PopStateEvent('popstate'));})()`);
  if (role === 'MERCHANDISER') {
    await until("!!document.querySelector('#f06-dashboard-title')", 'workspace mounted');

  }
  if (role === 'STORE_ADMIN') await until("!!document.querySelector('#f06-dashboard-title')", 'Store Admin list mounted');
}
async function dashboard() {

  await until("!!document.querySelector('#f06-dashboard-title')", 'dashboard mounted');
}
const types=['BUNDLE','CROSS_SELL','FBT','BANNER'];
async function chooseType(type) {
  await page.evaluate('document.querySelector('+JSON.stringify('#f06-type-'+type)+').click()');
  await until('document.querySelector('+JSON.stringify('#f06-type-'+type)+')?.getAttribute("aria-selected")==="true"&&document.querySelector("#f06-type-panel")?.getAttribute("aria-busy")==="false"','type '+type+' loaded');
}
async function openDetails(id) {
  const type=types[Math.floor(id/1000)]??'BUNDLE';
  if(await page.evaluate('document.querySelector('+JSON.stringify('#f06-type-'+type)+')?.getAttribute("aria-selected")!=="true"'))await chooseType(type);
  const selector='button[data-candidate-id="'+id+'"]';await until('Boolean(document.querySelector('+JSON.stringify(selector)+'))','candidate ready');
  await page.evaluate('document.querySelector('+JSON.stringify(selector)+').click()');
  await until('document.querySelector("dialog")?.dataset.recommendationDetail==='+JSON.stringify(String(id))+'&&!!document.querySelector("dialog [aria-label=\\"Historical purchase evidence\\"]")','Exact Details response');
}
async function closeDetails() {
  await page.evaluate('document.querySelector("[aria-label=\\"Close recommendation details\\"]").click()');await until('!document.querySelector("dialog")','Details closed');
}
async function capture(name) { if (!artifacts) return;
  const result = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(join(artifacts, name + '.png'), Buffer.from(result.data, 'base64'));
}
function item(id,storeId) {
 const local=id%1000,type=types[Math.floor(id/1000)]??'BUNDLE',pending=state.reviewStatus==='PENDING_REVIEW';
 return recommendation({recommendationId:id,storeId,type,anchorProductId:type==='CROSS_SELL'?(local%2?32:31):null,productIds:type==='BANNER'&&local%2===0?[31]:[31,32],reviewStatus:state.reviewStatus,version:pending?1:2,
  reviewedBy:pending?null:7,reviewedAt:pending?null:'2026-11-07T00:00:00Z',reviewReason:pending?null:'Reviewed frozen evidence',readyForConsumption:state.ready,inventoryChanged:true,currentEligibility:eligibility(state.availability??(state.ready?'ELIGIBLE':'INELIGIBLE')),
  ...(local%2?{}:{evidence:{totalTransactions:0,supportCount:null,supportRatio:null,anchorSupportCount:null,confidence:null,status:'EVIDENCE_UNAVAILABLE'}}),
  reviewHistory:pending?[]:[{oldStatus:'PENDING_REVIEW',newStatus:state.reviewStatus,reviewedBy:7,reviewedAt:'2026-11-07T00:00:00Z',reason:'Reviewed frozen evidence',resultingVersion:2,eligibilityCheck:eligibility()}]
 });
}
function visualItems(pageIndex=0,type='BUNDLE') {
 const first=recommendation({storeId:state.storeId}),offset=pageIndex*20;
 const records=type==='BUNDLE'?[{...first,recommendationId:62+offset},{...first,recommendationId:67+offset,policy:{...first.policy,version:2}}]
 :type==='CROSS_SELL'?[{...first,recommendationId:1063+offset,type,anchorProductId:31,evidence:{...first.evidence,anchorSupportCount:4,confidence:0.5}},{...first,recommendationId:1064+offset,type,anchorProductId:32,evidence:{...first.evidence,anchorSupportCount:3,confidence:0.666667}}]
 :type==='FBT'?[{...first,recommendationId:2066+offset,type}]:[{...first,recommendationId:3065+offset,type,productIds:[31]}];
 return records.map((record,index)=>({...record,rank:pageIndex*20+index+1}));
}
async function fixture({ requestId, request }) {
  const url = new URL(request.url), path = url.pathname;
  // Background Login video is unrelated to these fixture-only UI checks.
  if (path.startsWith('/videos/')) return page.call('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
  if (!path.startsWith('/api/')) return page.call(url.origin === origin ? 'Fetch.continueRequest' : 'Fetch.failRequest', { requestId, ...(url.origin === origin ? {} : { errorReason: 'BlockedByClient' }) });
  calls.push({ path, query: url.search, method: request.method });
  let body, responseCode = 200;
  const storeId = state.storeId;
  if (path === '/api/auth/login') body = { accessToken: 'fixture-only-access', expiresIn: 3600, tokenType: 'Bearer', csrfToken: 'fixture-only-csrf' };
  else if (path === '/api/auth/me') body = { userId: 12, name: 'F06 Fixture', email: 'fixture@example.invalid', roleCode: state.role, storeId, status: 'ACTIVE', emailVerified: true };
  else if (path === '/api/recommendations') {
    if (state.network) return page.call('Fetch.failRequest', { requestId, errorReason: 'InternetDisconnected' });
    for (const key of url.searchParams.keys()) assert.ok(['page', 'pageSize', 'miningRunId', 'snapshotId', 'type', 'reviewStatus'].includes(key));
    assert.equal(url.searchParams.get('miningRunId'),'42','Library must stay run-scoped');
    const pageIndex = Number(url.searchParams.get('page') || 0), size = Number(url.searchParams.get('pageSize') || 20);
    const type=url.searchParams.get('type');assert.ok(types.includes(type),'Every list request must include the active type');assert.equal(url.searchParams.has('snapshotId'),false,'No manually entered snapshot filter');
    const offset=types.indexOf(type)*1000;
    let items=state.empty?[]:[item(offset+62+pageIndex*size,storeId),item(offset+63+pageIndex*size,storeId)].map((record,index)=>({...record,rank:pageIndex*size+index+1}));
    if(state.visual)items=visualItems(pageIndex,type);
    if(url.searchParams.has('reviewStatus'))items=items.filter(record=>record.reviewStatus===url.searchParams.get('reviewStatus'));
    body={items,page:pageIndex,pageSize:size,totalElements:items.length?(state.visual?25:45):0,ordering:'RANKED_WITHIN_SOURCE_RUN'};
    while (state.holdList && !closing) await sleep(20);
    responseCode = state.listStatus;
    if (responseCode !== 200) body = { error: responseCode === 409 ? 'Rank scope exceeds 10000 candidates' : 'Controlled list failure' };
  } else if (/^\/api\/recommendations\/\d+$/.test(path)) {
    responseCode = state.detailStatus; body = responseCode === 200 ? (state.visual?[0,1].flatMap(page=>types.flatMap(type=>visualItems(page,type))).find(row=>row.recommendationId===Number(path.split('/').at(-1))):item(Number(path.split('/').at(-1)), storeId)) : { error: 'Recommendation not found' };
  } else if (state.visual&&/^\/api\/products\/\d+\/image$/.test(path)){
    const ok=path.includes('/31/');return page.call('Fetch.fulfillRequest',{requestId,responseCode:ok?200:404,responseHeaders:[{name:'Content-Type',value:ok?'image/png':'application/json'}],body:ok?'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=':Buffer.from('{}').toString('base64')});
  } else if (/^\/api\/products\/\d+$/.test(path)) {
    responseCode = state.namesUnavailable ? 404 : 200;
    body = state.namesUnavailable ? { error: 'Product not found' } : { id: Number(path.split('/').at(-1)), name: (path.endsWith('/31') ? 'Fixture milk' : 'Fixture bread')+(state.longNames?' extra long product description '+('ExtraLongWordWithoutSpaces'.repeat(8)):''),...(state.visual&&!state.noImages?{imageUrl:'/api/products/'+path.split('/').at(-1)+'/image'}:{}) };
  }
  else if (path === '/api/recommendations/config') body = policy;
  else if (path === '/api/mining/runs/42') body=runFixture('COMPLETED',storeId);
  else if (path === '/api/mining/requests/17') body=requestFixture('FAILED',storeId);
  else if (path === '/api/mining/requests') body = { items: [{ ...requestFixture('FAILED', storeId), comparisonStatus: 'FAILED' }], page: 0, pageSize: 20, totalElements: 1 };
  else if (path === '/api/mining/requests/17/runs') body = [runFixture('COMPLETED', storeId), { ...runFixture('FAILED', storeId), runId: 43 }];
  else if (path === '/api/products') body = { content: [], page: 0, pageSize: 20, totalElements: 0, totalPages: 0 };
  else if (['/api/categories', '/api/system/stores'].includes(path)) body = [];
  else if (path === '/api/system/mining/config') body = { version: 0, algorithm: null, minUtilMode: null, minUtilValue: null, changedBy: null, changedAt: null };
  else if (path === '/api/utility/config') body = { config: { enableStock: true, enableExpiry: true, enableSeason: true, alpha: 1, beta: 1, gamma: 1, lambda: 0.1, expiryWindowDays: null, version: 1, scoringVersion: 'v1.2' }, lambdaPolicy: { lambdaMin: 0, lambdaMax: 0.5, version: 1 }, lambdaValid: true };
  else { unexpected.push(path); responseCode = 500; body = { error: 'Unexpected fixture endpoint' }; }
  if (path !== '/api/auth/login') assert.equal(request.method, 'GET', 'Phase 2B must not write');
  // Source-derived BigDecimal regression, injected as raw JSON tokens before parsing.
  const wire=JSON.stringify(body).replaceAll('"expiryPriorityScore":null','"expiryPriorityScore":0.692307692307692308').replaceAll('40.123456','1234567890123.123456');
  await page.call('Fetch.fulfillRequest', { requestId, responseCode, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(wire).toString('base64') });
}
try {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 150 && !existsSync(portFile); i++) await sleep(100);
  assert.ok(existsSync(portFile), 'Chrome started');
  const port = readFileSync(portFile, 'utf8').split('\n')[0];
  const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  const ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((done, reject) => { ws.addEventListener('open', done, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  page = new CDP(ws);
  page.on('Fetch.requestPaused', data => fixture(data).catch(error => { if (!closing && !/Invalid InterceptionId/.test(error.message)) errors.push(error.message); }));
  page.on('Runtime.exceptionThrown', data => errors.push(data.exceptionDetails.exception?.description || data.exceptionDetails.text));
  await page.call('Page.enable'); await page.call('Runtime.enable'); await page.call('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.navigate', { url: origin + '/login' });
  await until("performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname==='/src/services/authService.ts')", 'session module');
  await login();await has('45 matching recommendations');
  assert.deepEqual(await page.evaluate('[...document.querySelectorAll("[data-candidate-id]")].map(el=>el.dataset.candidateId)'),['62','63']);
  assert.equal(await page.evaluate('document.querySelectorAll("[role=tab]").length'),4);
  assert.equal(await page.evaluate('/Snapshot #|Rule set|Historical utility|Suggestion #/.test([...document.querySelectorAll("[data-recommendation-card]")].map(el=>el.innerText).join(" "))'),false);
  await click('Next recommendations');await has('Page 2 of 3');await select('f06-filter-review','APPROVED');await select('f06-filter-size','10');await has('Page 1 of 5');
  assert.deepEqual(Object.fromEntries(new URLSearchParams(calls.filter(c=>c.path==='/api/recommendations').at(-1).query)),{page:'0',pageSize:'10',type:'BUNDLE',reviewStatus:'APPROVED',miningRunId:'42'});
  await select('f06-filter-review','');await select('f06-filter-size','20');await has('Page 1 of 3');
  await click('Change Analysis');await until('!!document.querySelector("#f06-ranked-request")','analysis selection');await select('f06-ranked-request','17');await until('document.querySelector("#f06-ranked-run")?.options.length===3','historical run choices');
  assert.equal(await page.evaluate('document.querySelector("#f06-ranked-run").options[2].disabled'),true);await select('f06-ranked-run','42');await has('45 matching recommendations');
  assert.equal(await page.evaluate('document.querySelector("[data-rank]").dataset.rank'),'1');
  state.listStatus=409;await click('Refresh');await has('Narrow the review status filter');const limitReads=calls.filter(c=>c.path==='/api/recommendations').length;await sleep(100);assert.equal(calls.filter(c=>c.path==='/api/recommendations').length,limitReads);
  state.listStatus=200;await click('Refresh');await has('45 matching recommendations');
  checks.push('run/type/review filters and page size use Backend params immediately; pagination/reset page, exact server order, historical completed source and ranked limit without retry');

  await openDetails(1062);await has('Fixture bread');
  assert.equal(await page.evaluate('document.querySelector("dialog [aria-label=\\"Suggested cross-sell targets\\"]").textContent.includes("Fixture milk")'),false);
  assert.equal(await page.evaluate('document.activeElement.getAttribute("aria-label")'),'Close recommendation details');
  await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await page.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until('!document.querySelector("dialog")','Escape closes Details');
  await openDetails(62);await has('Historical purchase data is unavailable.');
  assert.equal(await page.evaluate('[...document.querySelectorAll("dialog summary")].find(el=>el.textContent==="Additional analysis evidence").parentElement.open'),false);
  await page.evaluate('[...document.querySelectorAll("dialog summary")].find(el=>el.textContent==="Additional analysis evidence").click()');await has('1,234,567,890,123.123456');
  for(const field of ['Purchase frequency','Total analyzed transactions','Transactions containing all products'])assert.equal(await page.evaluate('(()=>{const dt=[...document.querySelectorAll("dialog dt")].find(el=>el.textContent==='+JSON.stringify(field)+');return dt.nextElementSibling.textContent})()'),'Unavailable');
  assert.equal(await page.evaluate('document.querySelector("dialog [data-readiness]").dataset.readiness'),'not-ready');
  assert.equal(await page.evaluate('/SPMF|Input hash|Matrix hash|Fingerprint|expectedVersion/.test(document.querySelector("dialog").textContent)'),false);
  state.reviewStatus='PENDING_REVIEW';state.availability='ELIGIBLE';await click('Refresh details');await has('Needs review. Products are currently available.');
  state.reviewStatus='APPROVED';state.ready=true;state.availability='ELIGIBLE';await click('Refresh details');await has('Ready for Layout.');
  state.namesUnavailable=true;await click('Refresh details');await has('Some product names are unavailable.');assert.equal(await page.evaluate('document.querySelector("dialog").textContent.includes("Product name unavailable")'),true);assert.equal(await page.evaluate('document.querySelector("dialog").textContent.includes("Fixture milk")'),false);state.namesUnavailable=false;
  state.detailStatus=404;await click('Refresh details');await has('unavailable for your store');assert.equal(await page.evaluate('document.querySelector("dialog").textContent.includes("Fixture milk")'),false);await closeDetails();state.detailStatus=200;
  checks.push('Details loads only selected candidate, exact decimals in optional evidence, missing evidence stays unavailable, distinct cross-sell targets, friendly errors and fresh readiness/names without technical diagnostics');

  state.empty=true;await click('Refresh');await has('No bundle recommendations were found');state.network=true;await click('Refresh');await has('Check your connection');state.network=false;
  state.empty=false;state.holdList=true;await click('Refresh');await has('Loading recommendations...');state.empty=true;await login('MERCHANDISER',2);state.holdList=false;await has('No bundle recommendations were found');assert.equal(await page.evaluate('!!document.querySelector("[data-recommendation-card]")'),false);
  state.empty=false;const beforeStore=calls.length;await login('STORE_ADMIN');await has('45 matching recommendations');
  assert.equal(await page.evaluate('[...document.querySelectorAll("button")].some(el=>el.textContent==="Generate Recommendations")'),false);
  assert.equal(calls.slice(beforeStore).some(call=>call.path.endsWith('/generate')),false);assert.ok(calls.slice(beforeStore).some(call=>call.path==='/api/mining/runs/42'));
  await has('Fixture milk');const nameReads=calls.filter(call=>/^\/api\/products\/\d+$/.test(call.path)).length;await click('Next recommendations');await has('Page 2 of 3');await has('Fixture milk');assert.equal(calls.filter(call=>/^\/api\/products\/\d+$/.test(call.path)).length,nameReads);await click('Previous recommendations');await has('Page 1 of 3');
  for(const [review,availability,ready] of [['PENDING_REVIEW','INELIGIBLE',false],['APPROVED','ELIGIBLE',true],['REJECTED','NEEDS_RECHECK',false]]){
    state.reviewStatus=review;state.availability=availability;state.ready=ready;await click('Refresh');await has('45 matching recommendations');
    assert.equal(await page.evaluate('Boolean(document.querySelector('+JSON.stringify('[data-recommendation-card] [data-status="'+review+'"]')+'))'),true);
    await openDetails(62);assert.equal(await page.evaluate('Boolean(document.querySelector('+JSON.stringify('dialog [data-status="'+availability+'"]')+'))'),true);assert.equal(await page.evaluate('!!document.querySelector("#f06-review-reason")'),false);await closeDetails();
  }
  state.reviewStatus='APPROVED';state.availability='ELIGIBLE';state.ready=true;await click('Refresh');await has('45 matching recommendations');
  for(const width of [390,768,1440]){await page.call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true);await openDetails(62);assert.equal(await page.evaluate('document.querySelector("dialog").scrollWidth<=innerWidth+1'),true);assert.equal(await page.evaluate('[...document.querySelectorAll("[data-status]")].filter(el=>el.getClientRects().length).every(el=>getComputedStyle(el).whiteSpace==="nowrap")'),true);await closeDetails();}
  state.namesUnavailable=true;await login('STORE_ADMIN');await has('45 matching recommendations');await openDetails(62);await has('Some product names are unavailable.');await closeDetails();state.namesUnavailable=false;
  for(const role of ['SYSTEM_ADMIN','END_CUSTOMER']){await login(role);await until('!document.querySelector("#f06-dashboard-title")','denied actor');}
  checks.push('loading/network/empty states, session and Store changes discard stale reads; Store Admin cards/Details read-only, cached names, approved/unavailable/recheck statuses, responsive labels and denied actors');

  state.visual=true;state.reviewStatus='PENDING_REVIEW';state.availability='ELIGIBLE';state.empty=false;state.ready=false;await login();await has('25 matching recommendations');
  const expected={BUNDLE:['62','67'],CROSS_SELL:['1063','1064'],FBT:['2066'],BANNER:['3065']};
  for(const type of types){await chooseType(type);assert.deepEqual(await page.evaluate('[...document.querySelectorAll("[data-candidate-id]")].map(el=>el.dataset.candidateId)'),expected[type]);assert.equal(await page.evaluate('[...document.querySelectorAll("[data-recommendation-card]")].every(el=>el.querySelectorAll("button").length===1)'),true);assert.equal(new URLSearchParams(calls.filter(call=>call.path==='/api/recommendations').at(-1).query).get('type'),type);}
  assert.equal(await page.evaluate('document.querySelector("[data-recommendation-card]").textContent.includes("Present in 2 of 6 analyzed transactions")'),true,'Single-product Banner describes historical presence');
  assert.equal(await page.evaluate('document.querySelector("[data-recommendation-card]").textContent.includes("Bought together")'),false);
  await chooseType('CROSS_SELL');await has('50%');await has('66.6667%');assert.equal(await page.evaluate('[...document.querySelectorAll("[data-retail-proposal]")].some(el=>el.textContent.includes("Suggest Fixture milk when customers select Fixture bread"))'),true);
  await openDetails(1064);await has('2 of 3 transactions containing Fixture bread also included Fixture milk (66.6667%).');
  await select('f06-review-reason','Unfinished directional review');await click('Refresh details');await until('document.querySelector("#f06-review-reason")?.value==="Unfinished directional review"','Refresh retains reason');await page.evaluate('document.querySelector("[aria-label=\\"Close recommendation details\\"]").click()');await has('Keep your unfinished review?');await click('Keep Editing');await until('document.activeElement?.id==="f06-review-reason"','Keep Editing restores reason focus');
  await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await has('Keep your unfinished review?');await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until('!document.querySelector("[aria-label=\\"Unsaved review\\"]")','Escape preserves unfinished draft');await page.evaluate('document.querySelector("[aria-label=\\"Close recommendation details\\"]").click()');await has('Keep your unfinished review?');await click('Discard & Close');await until('!document.querySelector("dialog")&&document.activeElement?.dataset.candidateId==="1064"','Explicit discard returns focus to exact candidate');
  await chooseType('BUNDLE');await page.evaluate('document.querySelector("[data-candidate-id]").scrollIntoView({block:"center"})');await until('[...document.querySelectorAll("[data-recommendation-card] img")].some(el=>el.complete&&el.naturalWidth>0)','Authorized image loads');assert.equal(await page.evaluate('!!document.querySelector("[aria-label=\\"Image unavailable for Fixture bread\\"]")'),true,'Broken image fallback');
  await click('Next recommendations');await has('Page 2 of 2');assert.deepEqual(await page.evaluate('[...document.querySelectorAll("[data-candidate-id]")].map(el=>el.dataset.candidateId)'),['82','87']);await click('Previous recommendations');await has('Page 1 of 2');
  await page.evaluate('document.querySelector("#f06-type-BUNDLE").focus()');await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await until('document.querySelector("#f06-type-CROSS_SELL").getAttribute("aria-selected")==="true"','Arrow key selects next type');await chooseType('BUNDLE');
  for(const key of ['Enter',' ']){await page.evaluate('document.querySelector("button[data-candidate-id=\\"62\\"]").focus()');await page.call('Input.dispatchKeyEvent',{type:'keyDown',key,text:key==='Enter'?'\r':' ',code:key==='Enter'?'Enter':'Space',windowsVirtualKeyCode:key==='Enter'?13:32});await page.call('Input.dispatchKeyEvent',{type:'keyUp',key,code:key==='Enter'?'Enter':'Space',windowsVirtualKeyCode:key==='Enter'?13:32});await until('document.querySelector("dialog")?.dataset.recommendationDetail==="62"','Native card keyboard');await until('!!document.querySelector("#f06-review-reason")','Details review ready');await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});await page.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});assert.equal(await page.evaluate('!!document.activeElement.closest("dialog")'),true,'Focus trapped inside Details');await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await page.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until('!document.querySelector("dialog")&&document.activeElement?.dataset.candidateId==="62"','Escape restores native card focus');}
  checks.push('all four server-filtered tabs retain separate same-product candidates and reverse anchors; exact group/directional evidence, single Banner, image fallback, pages/ranks, native card keyboard, focus/Escape and unfinished-review protections');

  state.noImages=true;
  for(const missingNames of [false,true]){state.longNames=!missingNames;state.namesUnavailable=missingNames;await login();await has('25 matching recommendations');if(!missingNames)await has('extra long product description');else await until('document.querySelector("[data-recommendation-card]").textContent.includes("Product name unavailable")','Missing name state');
    for(const width of [320,390,820,1280,1920]){await page.call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true);await openDetails(62);assert.equal(await page.evaluate('document.querySelector("dialog").scrollWidth<=document.querySelector("dialog").clientWidth+1'),true,'Long/fallback Details fits '+width);await closeDetails();}
  }
  await openDetails(62);await page.evaluate('(async()=>{const auth='+session+';auth.endLocal();})()');await until('!document.querySelector("dialog")&&!document.querySelector("[data-recommendation-card]")','Logout removes old data');
  await login();await has('25 matching recommendations');await openDetails(62);await login('STORE_ADMIN',2);await has('25 matching recommendations');assert.equal(await page.evaluate('!!document.querySelector("dialog")'),false);await openDetails(1063);assert.equal(await page.evaluate('!!document.querySelector("#f06-review-reason")'),false);await closeDetails();
  assert.equal(calls.some(call=>call.method!=='GET'&&call.path!=='/api/auth/login'),false,'No feature writes in browse suite');
  checks.push('long names, missing names/images, 320-1920px layouts, logout and Store/session change clear modal and cards, Store Admin read-only across tabs');

  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS (controlled browser fixtures)', checks, interceptedApiCalls: calls.length, realBackendWrites: 0, artifacts }, null, 2));
} catch (error) {
  try { if (page) await capture('failure'); } catch {}
  console.log(JSON.stringify({ result: 'FAIL', error: error.stack, checks, unexpected, errors, artifacts }, null, 2)); process.exitCode = 1;
} finally {
  closing = true; state.holdList = false;
  if (page) { try { await page.call('Browser.close'); } catch {} page.ws.close(); }
  if (chrome.exitCode === null) await Promise.race([new Promise(done => chrome.once('exit', done)), sleep(2000)]);
  if (chrome.exitCode === null) chrome.kill();
  const target = resolve(profile);
  if (dirname(target) === base && basename(target).startsWith('paspm-f06-browse-browser-')) {
    try { rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {}
  }
}
