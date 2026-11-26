// Run with Vite serving locally: node --import tsx tests/f06.browser.mjs
// All API traffic is intercepted. This tests browser integration with fixtures,
// never a real backend, account, mining submission or recommendation write.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { conversionRequestFixture, conversionRunFixture, progressFixture } from './f05.fixtures.ts';
import { generation, policy, recommendation } from './f06.fixtures.ts';

const origin = process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3000';
const base = resolve(tmpdir());
const profile = mkdtempSync(join(base, 'paspm-f06-browser-'));
const artifacts = process.env.PASPM_TEST_NO_ARTIFACTS === '1' ? null : mkdtempSync(join(base, 'paspm-f06-preview-'));
const chrome = spawn(process.env.F06_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
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
const state = { role: 'MERCHANDISER', storeId: 1, mode: 'normal', noRequests: false, holdWrite: false, holdHistory: false, runStatus: 'COMPLETED', savedEmpty:false, holdRun:null, multiRuns:false, patternTotal:25, holdAvailability:false, availabilityStatus:200, holdCounts:false };
const session = "(await (window.fixtureAuth ??= import(performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/services/authService.ts').name))).authService";
async function until(expression, label) {
  const end = Date.now() + 12000;
  while (Date.now() < end) { if (await page.evaluate(expression)) return; await sleep(40); }
  throw new Error('UI timeout: ' + label);
}
const has = text => until(`document.body.innerText.includes(${JSON.stringify(text)})`, text);
async function click(label) {
 if(label==='Generate Recommendations'&&await page.evaluate('!!document.querySelector("dialog #f06-generate-form")')){await page.evaluate('[...document.querySelectorAll("dialog footer button")].find(button=>button.textContent.trim()==="Generate Recommendations")?.click()');return;}

  await until('[...document.querySelectorAll("button")].some(b=>b.innerText.trim()==='+JSON.stringify(label)+'&&!b.disabled)','button '+label);
  const clicked = await page.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()===${JSON.stringify(label)});if(!b||b.disabled)return false;b.click();return true;})()`);
  assert.equal(clicked, true, 'Clickable button: ' + label);
}
async function navigate(path) {
  await page.evaluate('history.pushState({},"",'+JSON.stringify(path)+');dispatchEvent(new PopStateEvent("popstate"))');
}
async function select(id,value) {
  await page.evaluate('(()=>{const e=document.getElementById('+JSON.stringify(id)+');const p=e.tagName==="SELECT"?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,"value").set.call(e,'+JSON.stringify(value)+');e.dispatchEvent(new Event(e.tagName==="SELECT"?"change":"input",{bubbles:true}));})()');
}
async function login(role='MERCHANDISER',storeId=1,runId=null) {
  state.role=role;state.storeId=storeId;
  await page.evaluate('(async()=>{const auth='+session+';auth.endLocal();await auth.authenticate("/api/auth/login",{email:"fixture@example.invalid",password:"fixture-only"});})()');
  await navigate('/recommendations'+(runId===null?'':'?miningRunId='+runId));
  if(['MERCHANDISER','STORE_ADMIN'].includes(role))await until('!!document.querySelector("#f06-dashboard-title,#f06-ranked-source-title")','Recommendations workspace');
}
async function chooseSource(requestId=17,runId=42){
   const selector='[data-select-analysis="'+requestId+'"]';await until('!!document.querySelector('+JSON.stringify(selector)+')','Analysis row');await page.evaluate('document.querySelector('+JSON.stringify(selector)+').click()');
   const run='[data-select-run="'+runId+'"]';await until('!!document.querySelector('+JSON.stringify(run)+')||(!document.querySelector("[data-analysis-picker]")&&!!document.querySelector('+JSON.stringify('[data-selected-run="'+runId+'"]')+'))','Auto selected or explicit completed result');
   if(await page.evaluate('!!document.querySelector('+JSON.stringify(run)+')'))await page.evaluate('document.querySelector('+JSON.stringify(run)+').click()');await has('1 matching recommendations');
  }
async function selectCompleted() {
  if(!await page.evaluate('!!document.querySelector("[aria-label=\\"Selected analysis\\"]")'))await chooseSource();
  await click(await page.evaluate('[...document.querySelectorAll("button")].some(b=>b.textContent==="Generate More"&&b.getClientRects().length)')?'Generate More':'Generate Recommendations');await until('!!document.querySelector("#f06-generate-form")','Selected source reused for generation');
}
async function signInThroughForm() {
  await until('!!document.querySelector("#identifier")','Sign-in form');await select('identifier','fixture@example.invalid');await select('passcode','Fixture-password-2026!');
  await page.evaluate('document.querySelector("#identifier").closest("form").requestSubmit()');
}
async function capture(name) { if (!artifacts) return;
  const screenshot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(join(artifacts, name + '.png'), Buffer.from(screenshot.data, 'base64'));
}
async function fixture({ requestId, request }) {
  const url = new URL(request.url);
  // Background Login video is unrelated to these fixture-only UI checks.
  if (url.pathname.startsWith('/videos/')) return page.call('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
  if (!url.pathname.startsWith('/api/')) return page.call(url.origin === origin ? 'Fetch.continueRequest' : 'Fetch.failRequest', {
    requestId, ...(url.origin === origin ? {} : { errorReason: 'BlockedByClient' })
  });
  calls.push({ path: url.pathname, query:url.search,method: request.method, body: request.postData });
  let responseCode = 200, body;
  const source = { ...conversionRequestFixture('WHOLE_UNIT_HALF_UP', 'FAILED', state.storeId), comparisonStatus: 'FAILED' };
  const run = { ...conversionRunFixture('WHOLE_UNIT_HALF_UP', state.runStatus, state.storeId), patternCount: 8 };
  if (['/api/auth/login','/api/auth/refresh'].includes(url.pathname)) body = { accessToken: 'fixture-access', expiresIn: 3600, tokenType: 'Bearer', csrfToken: 'fixture-csrf' };
  else if (url.pathname === '/api/auth/me') body = { userId: 12, name: 'F06 Fixture', email: 'fixture@example.invalid', roleCode: state.role, storeId: state.storeId, status: 'ACTIVE', emailVerified: true };
  else if (url.pathname === '/api/mining/requests') {
    while (state.holdHistory && !closing) await sleep(20);
    const p=Number(url.searchParams.get('page')||0);body={items:state.noRequests?[]:p===0?[{...source,requestId:17},{...source,requestId:18,createdAt:'2026-11-25T15:46:00Z'}]:[{...source,requestId:101}],page:p,pageSize:20,totalElements:state.noRequests?0:45};
  } else if (/^\/api\/mining\/requests\/\d+\/progress$/.test(url.pathname)) body={...progressFixture('FAILED',state.storeId),requestId:Number(url.pathname.split('/').at(-2))};
  else if (/^\/api\/mining\/requests\/\d+$/.test(url.pathname)) body={...source,requestId:Number(url.pathname.split('/').at(-1))};
  else if (/^\/api\/mining\/requests\/\d+\/runs$/.test(url.pathname)) {const id=Number(url.pathname.split('/').at(-2));body=id===18?[{...run,requestId:18,runId:180,status:'RUNNING'}]:[{...run,requestId:id,runId:id===101?902:42,patternCount:87,completedAt:'2026-11-25T15:46:00Z'},...(state.multiRuns?[{...run,requestId:id,runId:43,patternCount:123,completedAt:'2026-11-25T16:00:00Z'}]:[])];}
  else if (/^\/api\/mining\/runs\/\d+\/patterns$/.test(url.pathname)) {const runId=Number(url.pathname.split('/').at(-2)),p=Number(url.searchParams.get('page')||0),size=Number(url.searchParams.get('pageSize')||20);body={items:Array.from({length:Math.max(0,Math.min(size,state.patternTotal-p*size))},(_,i)=>({patternId:900+p*size+i,runId,productIds:[31,32],utility:40.123456,utilitySpmf:1,patternSize:2,supportCount:null})),page:p,pageSize:size,totalElements:state.patternTotal};}
  else if (/^\/api\/mining\/runs\/\d+$/.test(url.pathname)) {
    const id=Number(url.pathname.split('/').at(-1));while(state.holdRun===id&&!closing)await sleep(20);
    if(id===777){responseCode=404;body={error:'Run not found'};}
    else body={...run,runId:id,requestId:id===902?101:17,storeId:id===778?state.storeId+1:state.storeId,status:id===779?'RUNNING':state.runStatus};
  }
  else if (/^\/api\/products\/\d+$/.test(url.pathname)) body = { id: Number(url.pathname.split('/').at(-1)), name: url.pathname.endsWith('/31') ? 'Fixture milk' : 'Fixture bread' };
  else if (url.pathname === '/api/recommendations/config') body = policy;
  else if (url.pathname === '/api/recommendations/expiry-push') body={items:[],page:Number(url.searchParams.get('page')||0),pageSize:Number(url.searchParams.get('pageSize')||20),totalElements:0,asOfDate:'2026-11-26',timeZone:'Asia/Ho_Chi_Minh',checkedAt:'2026-11-25T17:00:00Z',warnings:[]};
  else if (url.pathname === '/api/recommendations') {
    const runId=Number(url.searchParams.get('miningRunId'));assert.ok(Number.isSafeInteger(runId)&&runId>0,'No unscoped Library request');
    if(url.searchParams.has('type')&&url.searchParams.get('pageSize')==='1'){assert.equal(url.searchParams.has('reviewStatus'),false,'Saved counts include every review status');assert.equal(url.searchParams.get('page'),'0');while(state.holdCounts&&!closing)await sleep(20);}
    const requestedType=url.searchParams.get('type')||'BUNDLE';assert.ok(['BUNDLE','CROSS_SELL','FBT','BANNER'].includes(requestedType));
    if(!url.searchParams.has('type'))assert.deepEqual([...url.searchParams.keys()].sort(),['miningRunId','page','pageSize']);
    if(!url.searchParams.has('type'))assert.equal(url.searchParams.get('pageSize'),'1');
    const record=recommendation({type:requestedType,anchorProductId:requestedType==='CROSS_SELL'?31:null,storeId:state.storeId,reviewStatus:state.mode==='reused'?'APPROVED':'PENDING_REVIEW',version:state.mode==='reused'?8:1,sources:recommendation().sources.map(source=>({...source,runId})),rank:1});
    const empty=state.savedEmpty||url.searchParams.get('type')==='BANNER'||url.searchParams.has('reviewStatus')&&url.searchParams.get('reviewStatus')!==record.reviewStatus;
    body={items:empty?[]:[record],page:Number(url.searchParams.get('page')||0),pageSize:Number(url.searchParams.get('pageSize')||20),totalElements:empty?0:1,ordering:'RANKED_WITHIN_SOURCE_RUN'};
    if(!url.searchParams.has('type')){while(state.holdAvailability&&!closing)await sleep(20);responseCode=state.availabilityStatus;if(responseCode!==200)body={error:'Controlled availability failure'};}
  }
  else if (url.pathname === '/api/recommendations/generate') {
    assert.equal(request.method, 'POST');
    const input = JSON.parse(request.postData); assert.equal(input.miningRunId,42);
    assert.deepEqual(Object.keys(input).sort(), ['miningRunId', 'types']);
    assert.equal(new Set(input.types).size, input.types.length);
    while (state.holdWrite && !closing) await sleep(20);
    if (state.mode === 'tooMany') {responseCode=409;body={error:'Generation exceeds the 10000 candidate safety limit; request fewer types'};}
    else if (state.mode === 'conflict') { responseCode = 409; body = { error: 'Frozen mining source is inconsistent or unavailable' }; }
    else if(state.mode==='lost'){state.savedEmpty=false;return page.call('Fetch.failRequest',{requestId,errorReason:'Failed'});}
    else {body = state.mode === 'empty' ? { ...generation, createdCount: 0, reusedCount: 0, recommendationIds: [], skipped: [] } : state.mode==='reused'?{...generation,createdCount:0,reusedCount:1}:generation;state.savedEmpty=state.mode==='empty';}
  } else if (url.pathname === '/api/products') body = { content: [], page: 0, pageSize: 20, totalElements: 0, totalPages: 0 };
  else if (url.pathname === '/api/categories' || url.pathname === '/api/system/stores') body = [];
  else if (url.pathname === '/api/system/mining/config') body = { version: 0, algorithm: null, minUtilMode: null, minUtilValue: null, changedBy: null, changedAt: null };
  else if (url.pathname === '/api/utility/config') body = { config: { enableStock: true, enableExpiry: true, enableSeason: true, alpha: 1, beta: 1, gamma: 1, lambda: 0.1, expiryWindowDays: null, version: 1, scoringVersion: 'v1.2' }, lambdaPolicy: { lambdaMin: 0, lambdaMax: 0.5, version: 1 }, lambdaValid: true };
  else { unexpected.push(url.pathname); responseCode = 500; body = { error: 'Unexpected fixture endpoint' }; }
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
  await page.call('Page.enable'); await page.call('Runtime.enable');
  await page.call('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.navigate', { url: origin + '/login' });
  await until("performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname==='/src/services/authService.ts')", 'session module');
  await login();await has('Choose an Analysis');
  await until('document.querySelectorAll("[data-analysis-id]").length===2','Distinct saved analyses');assert.equal(await page.evaluate('document.querySelectorAll("[data-analysis-id]")[0].innerText.includes("Analysis #17")&&document.querySelectorAll("[data-analysis-id]")[1].innerText.includes("Analysis #18")'),true);assert.notEqual(await page.evaluate('document.querySelectorAll("[data-analysis-id]")[0].innerText'),await page.evaluate('document.querySelectorAll("[data-analysis-id]")[1].innerText'),'Same period is distinguished by ID and created time');
  for(const width of [320,390,820,1440]){await page.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});assert.equal(await page.evaluate('[...document.querySelectorAll("[data-analysis-id]")].every(row=>{const r=row.getBoundingClientRect();return row.scrollWidth<=row.clientWidth+1&&r.left>=0&&r.right<=innerWidth;})'),true,'Rendered analysis rows fit '+width);}
  await page.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  const analysisColumns=await page.evaluate('(()=>{const head=document.querySelector("[data-analysis-columns]"),rows=[...document.querySelectorAll("[data-analysis-id]")];return{head:[...head.children].map(el=>el.getBoundingClientRect().x),rows:rows.map(row=>[...row.children].map(el=>el.getBoundingClientRect().x)),heights:rows.map(row=>row.getBoundingClientRect().height),decorations:rows.some(row=>row.querySelector("svg,input"))};})()');assert.equal(analysisColumns.decorations,false);assert.ok(analysisColumns.rows.every(row=>row.every((x,i)=>Math.abs(x-analysisColumns.head[i])<=1)),'Desktop Analysis, period, created and action columns align');assert.ok(Math.max(...analysisColumns.heights)-Math.min(...analysisColumns.heights)<1,'Row heights stay consistent');
  const runReadsBeforeSelection=calls.filter(call=>/\/api\/mining\/requests\/\d+\/runs$/.test(call.path)).length;assert.equal(runReadsBeforeSelection,0,'No run query for each analysis row');
  await page.evaluate('document.querySelectorAll("[data-select-analysis]")[1].click()');await has('No completed results are available for this analysis.');assert.equal(await page.evaluate('!!document.querySelector("[data-select-run]")'),false);

  assert.equal(calls.some(c=>c.path==='/api/recommendations'),false,'Direct entry never reads all runs');
  assert.equal(await page.evaluate('!document.querySelector("#f06-generate-form")'),true);
  await navigate('/mining?view=history');await click('View Details');await has('Analysis Overview');await has('View Recommendations');await has('Product Combinations');
  assert.equal(await page.evaluate('document.querySelector("dialog")?.open&&!!document.querySelector("table[aria-label=\\"Analysis History\\"]")'),true,'History stays behind a real modal');
  assert.equal(await page.evaluate('[...document.querySelectorAll("dialog button")].some(el=>/^(View|Hide) Results$/.test(el.textContent))'),false);
  await until('document.querySelector("dialog nav [aria-current=page]")?.textContent==="1"','First pattern page');await has('Showing 1–20 of 25 product combinations');await page.evaluate('[...document.querySelectorAll("dialog nav[aria-label=\\"Product combination pages\\"] button")].find(el=>el.textContent==="Next").click()');await until('document.querySelector("dialog nav [aria-current=page]")?.textContent==="2"','Second pattern page');
  assert.equal(new URLSearchParams(calls.filter(call=>call.path.endsWith('/patterns')).at(-1).query).get('page'),'1');
  assert.equal(new URLSearchParams(calls.filter(call=>call.path.endsWith('/patterns')).at(-1).query).get('pageSize'),'20');
  await click('Refresh Results');await until('document.querySelector("dialog nav [aria-current=page]")?.textContent==="2"','Refresh keeps pattern page');
  assert.equal(await page.evaluate('(()=>{const note=document.querySelector("[data-utility-note]");return note.getBoundingClientRect().height<=parseFloat(getComputedStyle(note).lineHeight)+1;})()'),true,'Desktop note uses the available width');
  assert.equal(await page.evaluate('(()=>{const body=document.querySelector("[data-analysis-body]");body.scrollTop=body.scrollHeight;const action=document.querySelector("dialog footer button").getBoundingClientRect();return action.top>=0&&action.bottom<=innerHeight;})()'),true,'Primary action remains visible beyond the table');
  await page.evaluate('document.querySelector("dialog footer button").focus()');await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',windowsVirtualKeyCode:9});await page.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await page.evaluate('document.querySelector("dialog").contains(document.activeElement)'),true,'Tab stays within the modal');
  await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',windowsVirtualKeyCode:27});await page.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',windowsVirtualKeyCode:27});await until('!document.querySelector("dialog")','Escape closes Analysis Overview');
  assert.equal(await page.evaluate('document.activeElement.getAttribute("aria-label")'),'View details for analysis #17');
  state.multiRuns=true;await click('View Details');await has('View Recommendations');await select('f05-result-run','43');await has('View Recommendations');
  await until('document.querySelector("#f05-result-run")?.value==="43"&&!!document.querySelector("#f05-patterns-title")','Explicit second run');
  assert.equal(calls.filter(call=>call.path.endsWith('/patterns')).at(-1).path,'/api/mining/runs/43/patterns');
  await select('f05-result-run','42');await has('View Recommendations');
  await page.call('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true});
  assert.equal(await page.evaluate('document.querySelector("dialog").scrollWidth<=innerWidth+1&&document.documentElement.scrollWidth<=innerWidth+1'),true);
  await page.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});
  state.multiRuns=false;
  const writesBeforeNavigation=calls.filter(c=>c.path.endsWith('/generate')).length;
  await click('View Recommendations');await has('1 matching recommendations');
  assert.equal(await page.evaluate('location.pathname+location.search'),'/recommendations?miningRunId=42');
  assert.equal(calls.filter(c=>c.path.endsWith('/generate')).length,writesBeforeNavigation);
  await page.evaluate('history.back()');await until('location.pathname==="/mining"','Back to F05');await has('View Recommendations');
  await page.evaluate('history.forward()');await has('1 matching recommendations');
  assert.equal(await page.evaluate('location.search'),'?miningRunId=42');
  await has('CURRENTLY VIEWING');await has('Recommendations from Analysis #17');assert.equal(await page.evaluate('getComputedStyle(document.querySelector("[data-selected-run] > div")).backgroundColor'),'rgb(29, 60, 48)');for(const width of [320,390,820,1440]){await page.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});assert.equal(await page.evaluate('(()=>{const el=document.querySelector("[data-selected-run]");return el.scrollWidth<=el.clientWidth+1&&el.getBoundingClientRect().right<=innerWidth;})()'),true,'Selected summary fits '+width);}await page.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});
  checks.push('Completed displayed F05 result navigates with exact run ID; Back/Forward retains source; no Mining/Generate from navigation');

  await page.evaluate('window.phase1ReloadMarker=true');await page.call('Page.reload');
  await until('!window.phase1ReloadMarker&&(!!document.querySelector("#f06-dashboard-title")||!!document.querySelector("#identifier"))','refresh with authentication recovery');
  if(await page.evaluate('!!document.querySelector("#identifier")')) {
    assert.equal(await page.evaluate('new URLSearchParams(location.search).get("returnTo")'),'/recommendations?miningRunId=42');await signInThroughForm();
  }
  await has('1 matching recommendations');assert.equal(await page.evaluate('location.search'),'?miningRunId=42');
  await select('f06-filter-review','PENDING_REVIEW');await has('1 matching recommendations');await click('Change Analysis');await has('Choose an Analysis');assert.equal(await page.evaluate('location.search'),'?miningRunId=42');await click('Back to Current Analysis');await has('1 matching recommendations');assert.equal(await page.evaluate('location.search'),'?miningRunId=42');assert.equal(await page.evaluate('document.querySelector("#f06-filter-review").value'),'PENDING_REVIEW','Cancel retains the old source and filters');await select('f06-filter-review','');await has('1 matching recommendations');await click('Change Analysis');await has('Choose an Analysis');await click('Next sources');await until('!!document.querySelector("[data-select-analysis]")','Historical analysis on page 2');assert.equal(new URLSearchParams(calls.filter(c=>c.path==='/api/mining/requests').at(-1).query).get('page'),'1');await chooseSource(101,902);
  assert.equal(await page.evaluate('location.search'),'?miningRunId=902');
  await page.evaluate('history.back()');await has('1 matching recommendations');assert.equal(await page.evaluate('location.search'),'?miningRunId=42');await page.evaluate('history.forward()');await has('1 matching recommendations');
  assert.equal(new URLSearchParams(calls.filter(c=>c.path==='/api/recommendations').at(-1).query).get('miningRunId'),'902');
  await click('Banner');await has('No banner recommendations found for this analysis');
  assert.equal(await page.evaluate('document.querySelector("#f06-browse-panel").innerText.includes("No saved recommendations for this analysis")'),false);
  await click('Bundle');await has('1 matching recommendations');
  const availabilityReads=()=>calls.filter(call=>call.path==='/api/recommendations'&&!new URLSearchParams(call.query).has('type')).length;
  const beforeFilter=availabilityReads();await select('f06-filter-review','APPROVED');await has('No recommendations match the selected review status.');
  assert.equal(await page.evaluate('document.querySelectorAll("[role=tab]").length===4&&!document.querySelector("[data-run-empty]")'),true);await click('Clear Review Filter');await has('1 matching recommendations');assert.equal(availabilityReads(),beforeFilter);
  state.savedEmpty=true;state.holdAvailability=true;await click('Refresh');await has('Checking saved recommendations');assert.equal(await page.evaluate('!!document.querySelector("[data-run-empty]")'),false);
  state.holdAvailability=false;await has('Ready to Generate Recommendations');await click('Generate Recommendations');await has('Choose the recommendation types you want to generate.');assert.equal(await page.evaluate('document.querySelectorAll("#f06-generate-form input:checked").length'),4,'First generation selects every type');assert.equal(await page.evaluate('document.querySelector("#f06-generate-title").textContent'),'Generate Recommendations');await click('Cancel');
  assert.equal(await page.evaluate('document.querySelectorAll("[role=tab],#f06-filter-review,#f06-filter-size").length'),0);
  assert.equal(await page.evaluate('[...document.querySelectorAll("button")].filter(el=>el.textContent==="Generate Recommendations"&&el.getClientRects().length).length'),1);
  state.availabilityStatus=503;await click('Refresh');await has('Retry Recommendations');assert.equal(await page.evaluate('!!document.querySelector("[data-run-empty]")'),false);
  state.availabilityStatus=200;await click('Retry Recommendations');await has('Ready to Generate Recommendations');
  state.savedEmpty=false;await click('Refresh');await has('1 matching recommendations');
  checks.push('F05 native modal auto-loads paged results, exact multi-run selector, focus/Escape restore, desktop note, fixed footer and mobile; F06 distinguishes whole-run/type/status empties with bounded cached availability, loading and recoverable errors');
  assert.equal(new URLSearchParams(calls.filter(c=>c.path==='/api/recommendations').at(-1).query).get('miningRunId'),'902');
  assert.equal(await page.evaluate('!!document.querySelector("[data-expiry-notice]")'),true,'Expiry notification survives actual page refresh and login recovery');
  checks.push('Refresh/login return path, historical run outside first page, Back/Forward and filter reset preserve exact selected run; filtered empty is not run-empty');

  state.holdRun=42;await navigate('/recommendations?miningRunId=42');await has('Checking selected analysis');
  assert.equal(await page.evaluate('!!document.querySelector("[data-product-group]")'),false);
  await navigate('/recommendations?miningRunId=902');await has('1 matching recommendations');state.holdRun=null;await sleep(100);
  assert.equal(await page.evaluate("document.querySelector('[data-selected-run]')?.dataset.selectedRun==='902'"),true);
  for(const id of ['777','778','779','9007199254740992','bad']) {
    const reads=calls.filter(c=>c.path==='/api/recommendations').length;await navigate('/recommendations?miningRunId='+id);
    await until('!!document.querySelector("[role=alert]")','Invalid/foreign/incomplete analysis');
    assert.equal(await page.evaluate('!!document.querySelector("[data-product-group]")'),false);assert.equal(calls.filter(c=>c.path==='/api/recommendations').length,reads);
  }
  await navigate('/recommendations?miningRunId=42');await has('1 matching recommendations');
  assert.equal(calls.filter(c=>c.path.endsWith('/generate')).length,0,'Existing saved suggestions never auto-generate');
  state.holdCounts=true;await click('Refresh');await has('1 matching recommendations');await selectCompleted();
  await has('Generate More Recommendations');await has('Recommendation count unavailable');assert.equal(await page.evaluate('document.querySelectorAll("#f06-generate-form input:checked").length'),4,'Unknown counts fall back to all four');
  await click('Deselect all');await page.evaluate('document.querySelector("input[value=BUNDLE]").click();document.querySelector("input[value=FBT]").click()');state.holdCounts=false;await has('No saved recommendations');await until('document.querySelectorAll("[data-saved-count]").length===4&&!document.querySelector("dialog").innerText.includes("Recommendation count unavailable")','Type counts finish');assert.equal(await page.evaluate('document.querySelectorAll("#f06-generate-form input:checked").length'),2,'Late counts do not override manual choices');await click('Cancel');await selectCompleted();
  assert.equal(await page.evaluate('document.querySelectorAll("#f06-generate-form input:checked").length'),1,'Additional generation defaults to the one zero-count type');assert.equal(await page.evaluate('document.querySelector("input[value=BANNER]").checked'),true);await click('Select all');
  assert.equal(await page.evaluate('document.querySelector("main h1").parentElement.firstElementChild.tagName'),'H1');
  assert.equal(await page.evaluate('!!document.querySelector("nav[aria-label=Breadcrumb]")'),false);
  assert.equal(await page.evaluate('!!document.querySelector("#f06-request")'),false,'Generation reuses selected source');
  assert.equal(await page.evaluate('document.querySelectorAll("#f06-generate-form input[type=checkbox]:checked").length'),4,'All four types selected by default');
  for(const width of [320,390,820,1440]){await page.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});const layout=await page.evaluate('(()=>{const modal=document.querySelector("dialog"),cards=[...modal.querySelectorAll("[data-generation-type]")].map(card=>{const r=card.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}});return{overflow:modal.scrollWidth>modal.clientWidth+1,header:modal.querySelector("header").getBoundingClientRect().top,footer:modal.querySelector("footer").getBoundingClientRect().bottom,cards}})()');assert.equal(layout.overflow,false,'Generation modal fits '+width);assert.ok(layout.header>=0&&layout.footer<=900);if(width>=640){assert.ok(Math.max(...layout.cards.map(card=>card.w))-Math.min(...layout.cards.map(card=>card.w))<1);assert.ok(Math.max(...layout.cards.map(card=>card.h))-Math.min(...layout.cards.map(card=>card.h))<1);assert.ok(layout.cards[0].y===layout.cards[1].y&&layout.cards[2].y===layout.cards[3].y);}else assert.ok(layout.cards[1].y>layout.cards[0].y);}
  await page.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});

  for(const description of ['Offer products together as a bundle.','Suggest additional products to customers.','Show products that customers often purchase together.','Highlight products in promotional banners.'])await has(description);
  await page.evaluate('document.querySelector("input[value=FBT]").click()');
  assert.equal(await page.evaluate('document.querySelector("input[value=FBT]").checked'),false);assert.equal(await page.evaluate('!!document.querySelector("#f06-generate-form summary")'),false,'No duplicated Store Rules panel');
  await page.evaluate('document.querySelector("input[value=FBT]").focus()');await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:' ',text:' ',code:'Space',windowsVirtualKeyCode:32});await page.call('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await until('document.querySelector("input[value=FBT]").checked','Space toggles type');
  await page.evaluate('for(const e of document.querySelectorAll("#f06-generate-form input[type=checkbox]"))e.click()');await has('Select at least one recommendation type.');
  assert.equal(await page.evaluate('document.querySelector("dialog button[form=f06-generate-form]").disabled'),true);
  await page.evaluate('document.querySelector("input[value=BUNDLE]").click()');state.holdWrite=true;
  await page.evaluate('const form=document.querySelector("#f06-generate-form");form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));');await has('Generating recommendations...');
  await sleep(100);assert.equal(calls.filter(c=>c.path.endsWith('/generate')).length,1);
  assert.equal(await page.evaluate('document.querySelector("dialog header button").disabled'),true);await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await page.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});assert.equal(await page.evaluate('!!document.querySelector("dialog[open]")'),true,'Pending generation blocks Escape');await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});assert.equal(await page.evaluate('document.querySelector("dialog").contains(document.activeElement)'),true,'Focus stays inside pending modal');state.holdWrite=false;await has('1 new recommendation added.');await has('1 matching recommendations');
  assert.deepEqual(JSON.parse(calls.filter(c=>c.path.endsWith('/generate')).at(-1).body),{miningRunId:42,types:['BUNDLE']});
  assert.equal(await page.evaluate('location.search'),'?miningRunId=42');assert.equal(await page.evaluate('!!document.querySelector("#f06-result-title")'),false,'No technical intermediate results screen');
  await page.evaluate('[...document.querySelectorAll("summary")].find(e=>e.textContent.startsWith("Why some suggestions were skipped")).click()');await has('This format needs at least two products.');
  checks.push('Run switch cancels stale reads; bad/foreign/non-completed links fail closed; default four types, manual deselection, keyboard, no types, double submit safety; successful generation returns directly to same run');

  state.mode='empty';state.savedEmpty=true;await selectCompleted();await click('Generate Recommendations');await has('No new recommendations were added.');await has('No suggestions were created.');await has('No Recommendations Found');await has("No recommendations met your store's rules.");
  state.mode='reused';state.savedEmpty=false;await selectCompleted();await click('Generate Recommendations');await has('1 existing recommendation retained.');await has('keep their review decisions');await has('1 matching recommendations');
  state.mode='conflict';await selectCompleted();await click('Generate Recommendations');await has('The saved analysis cannot be used right now');const writes=calls.filter(c=>c.path.endsWith('/generate')).length;await sleep(150);assert.equal(calls.filter(c=>c.path.endsWith('/generate')).length,writes);
  await click('Generate Recommendations');await sleep(100);assert.equal(calls.filter(c=>c.path.endsWith('/generate')).length,writes+1);
  state.mode='tooMany';await click('Generate Recommendations');await has('Select fewer recommendation types');
  checks.push('Zero-result generation remains successful with explanations; reused decisions retained; 409 and safety-limit advice never auto-retry');

  state.mode='lost';const uncertainWrites=calls.filter(call=>call.path.endsWith('/generate')).length;await click('Generate Recommendations');await has('The submission could not be confirmed');assert.equal(await page.evaluate('document.querySelector("#f06-generate-form fieldset").disabled'),true);await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await has('Check saved recommendations before trying again.');await click('Check Saved Recommendations');await until('!document.querySelector("dialog")','Explicit uncertain close checks saved library');await has('1 matching recommendations');assert.equal(calls.filter(call=>call.path.endsWith('/generate')).length,uncertainWrites+1,'No replay of an uncertain write');await has('Saved recommendations were checked.');
  state.mode='normal';await login('STORE_ADMIN',1,42);await has('1 matching recommendations');assert.equal(await page.evaluate('!!document.querySelector("#f06-generate-tab")'),false);
  state.savedEmpty=true;await click('Refresh');await has('Awaiting Recommendations');await has('awaiting recommendations from your Merchandiser');state.savedEmpty=false;
  await navigate('/mining?view=history&requestId=17');await has('Analysis Overview');await click('View Recommendations');await has('1 matching recommendations');
  state.runStatus='RUNNING';await navigate('/mining?view=history&requestId=17');await has('Analysis Overview');
  assert.equal(await page.evaluate('[...document.querySelectorAll("button")].some(e=>e.textContent==="View Recommendations")'),false);state.runStatus='COMPLETED';
  for(const role of ['SYSTEM_ADMIN','END_CUSTOMER']){await login(role);await until('!document.querySelector("#f06-dashboard-title")','Restricted actor');assert.equal(await page.evaluate('[...document.querySelectorAll("nav[aria-label=\\"Main Navigation\\"] button")].some(e=>e.textContent.trim()==="Recommendations")'),false);}
  state.noRequests=true;await login();await has('No saved analyses are available');state.noRequests=false;
  state.holdRun=42;await navigate('/recommendations?miningRunId=42');await has('Checking selected analysis');state.noRequests=true;await login('MERCHANDISER',2);state.holdRun=null;await has('No saved analyses are available');
  assert.equal(await page.evaluate('!!document.querySelector("[data-product-group]")'),false);state.noRequests=false;
  await navigate('/recommendations?miningRunId=42');await has('1 matching recommendations');await selectCompleted();
  for(const width of [390,820,1440]){await page.call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true);}
  await click('Cancel');await page.evaluate('document.querySelector("#f06-type-BUNDLE").focus()');await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await until('document.querySelector("#f06-type-CROSS_SELL").getAttribute("aria-selected")==="true"','Keyboard selects Cross-sell');await has('1 matching recommendations');
  assert.equal(new URLSearchParams(calls.filter(c=>c.path==='/api/recommendations').at(-1).query).get('type'),'CROSS_SELL');assert.equal(await page.evaluate('location.search'),'?miningRunId=42');
  checks.push('Store Admin run-scoped read-only and F05 navigation; running results hide action; denied actors, no history, session/Store change during validation; responsive desktop/mobile and tab keyboard behavior');
  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS (controlled browser fixtures)', checks, interceptedApiCalls: calls.length, realBackendWrites: 0, artifacts }, null, 2));
} catch (error) {
  try { if (page) await capture('failure'); } catch {}
  const context=page?await page.evaluate('({url:location.pathname+location.search,text:document.body.innerText.slice(-1800)})').catch(()=>null):null;
  console.log(JSON.stringify({ result: 'FAIL', error: error.stack, checks, unexpected, errors, context,recentReads:calls.slice(-12).map(({path,query,method})=>({path,query,method})),artifacts }, null, 2));
  process.exitCode = 1;
} finally {
  closing = true; state.holdWrite = false; state.holdHistory = false;
  if (page) { try { await page.call('Browser.close'); } catch {} page.ws.close(); }
  if (chrome.exitCode === null) await Promise.race([new Promise(done => chrome.once('exit', done)), sleep(2000)]);
  if (chrome.exitCode === null) chrome.kill();
  const target = resolve(profile);
  if (dirname(target) === base && basename(target).startsWith('paspm-f06-browser-')) {
    try { rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {}
  }
}
