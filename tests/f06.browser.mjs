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
const state = { role: 'MERCHANDISER', storeId: 1, mode: 'normal', noRequests: false, holdWrite: false, holdHistory: false, runStatus: 'COMPLETED', savedEmpty:false, holdRun:null };
const session = "(await (window.fixtureAuth ??= import(performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/services/authService.ts').name))).authService";
async function until(expression, label) {
  const end = Date.now() + 12000;
  while (Date.now() < end) { if (await page.evaluate(expression)) return; await sleep(40); }
  throw new Error('UI timeout: ' + label);
}
const has = text => until(`document.body.innerText.includes(${JSON.stringify(text)})`, text);
async function click(label) {
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
  if(['MERCHANDISER','STORE_ADMIN'].includes(role))await until('!!document.querySelector("#f06-dashboard-title")','Recommendations workspace');
}
async function chooseSource(requestId=17,runId=42) {
  await until('!!document.querySelector("#f06-ranked-request")','analysis picker');await select('f06-ranked-request',String(requestId));
  await until('document.querySelector("#f06-ranked-run")?.options.length>1','completed results');
  await select('f06-ranked-run',String(runId));await has('1 matching recommendations');
}
async function selectCompleted() {
  if(!await page.evaluate('!!document.querySelector("[aria-label=\\"Selected analysis\\"]")'))await chooseSource();
  await click('Generate Recommendations');await until('!!document.querySelector("#f06-generate-form")','Selected source reused for generation');
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
    const p=Number(url.searchParams.get('page')||0);body={items:state.noRequests?[]:[{...source,requestId:p===0?17:101}],page:p,pageSize:20,totalElements:state.noRequests?0:45};
  } else if (/^\/api\/mining\/requests\/\d+\/progress$/.test(url.pathname)) body={...progressFixture('FAILED',state.storeId),requestId:Number(url.pathname.split('/').at(-2))};
  else if (/^\/api\/mining\/requests\/\d+$/.test(url.pathname)) body={...source,requestId:Number(url.pathname.split('/').at(-1))};
  else if (/^\/api\/mining\/requests\/\d+\/runs$/.test(url.pathname)) {const id=Number(url.pathname.split('/').at(-2));body=[{...run,requestId:id,runId:id===101?902:42}];}
  else if (/^\/api\/mining\/runs\/\d+\/patterns$/.test(url.pathname)) body={items:[],page:0,pageSize:20,totalElements:0};
  else if (/^\/api\/mining\/runs\/\d+$/.test(url.pathname)) {
    const id=Number(url.pathname.split('/').at(-1));while(state.holdRun===id&&!closing)await sleep(20);
    if(id===777){responseCode=404;body={error:'Run not found'};}
    else body={...run,runId:id,requestId:id===902?101:17,storeId:id===778?state.storeId+1:state.storeId,status:id===779?'RUNNING':state.runStatus};
  }
  else if (/^\/api\/products\/\d+$/.test(url.pathname)) body = { id: Number(url.pathname.split('/').at(-1)), name: url.pathname.endsWith('/31') ? 'Fixture milk' : 'Fixture bread' };
  else if (url.pathname === '/api/recommendations/config') body = policy;
  else if (url.pathname === '/api/recommendations') {
    const runId=Number(url.searchParams.get('miningRunId'));assert.ok(Number.isSafeInteger(runId)&&runId>0,'No unscoped Library request');
    const requestedType=url.searchParams.get('type');assert.ok(['BUNDLE','CROSS_SELL','FBT','BANNER'].includes(requestedType),'A concrete type is required');
    const record=recommendation({type:requestedType,anchorProductId:requestedType==='CROSS_SELL'?31:null,storeId:state.storeId,reviewStatus:state.mode==='reused'?'APPROVED':'PENDING_REVIEW',version:state.mode==='reused'?8:1,sources:recommendation().sources.map(source=>({...source,runId})),rank:1});
    body={items:state.savedEmpty||url.searchParams.get('type')==='BANNER'?[]:[record],page:Number(url.searchParams.get('page')||0),pageSize:Number(url.searchParams.get('pageSize')||20),totalElements:state.savedEmpty||url.searchParams.get('type')==='BANNER'?0:1,ordering:'RANKED_WITHIN_SOURCE_RUN'};
  }
  else if (url.pathname === '/api/recommendations/generate') {
    assert.equal(request.method, 'POST');
    const input = JSON.parse(request.postData); assert.equal(input.miningRunId,42);
    assert.deepEqual(Object.keys(input).sort(), ['miningRunId', 'types']);
    assert.equal(new Set(input.types).size, input.types.length);
    while (state.holdWrite && !closing) await sleep(20);
    if (state.mode === 'tooMany') {responseCode=409;body={error:'Generation exceeds the 10000 candidate safety limit; request fewer types'};}
    else if (state.mode === 'conflict') { responseCode = 409; body = { error: 'Frozen mining source is inconsistent or unavailable' }; }
    else body = state.mode === 'empty' ? { ...generation, createdCount: 0, reusedCount: 0, recommendationIds: [], skipped: [] } : state.mode==='reused'?{...generation,createdCount:0,reusedCount:1}:generation;
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
  await login();await has('Choose Analysis');
  assert.equal(calls.some(c=>c.path==='/api/recommendations'),false,'Direct entry never reads all runs');
  assert.equal(await page.evaluate('!document.querySelector("#f06-generate-form")'),true);
  await navigate('/mining?view=history&requestId=17');await has('Analysis Overview');await click('View Results');await has('View Recommendations');
  const writesBeforeNavigation=calls.filter(c=>c.path.endsWith('/generate')).length;
  await click('View Recommendations');await has('1 matching recommendations');
  assert.equal(await page.evaluate('location.pathname+location.search'),'/recommendations?miningRunId=42');
  assert.equal(calls.filter(c=>c.path.endsWith('/generate')).length,writesBeforeNavigation);
  await page.evaluate('history.back()');await until('location.pathname==="/mining"','Back to F05');await has('View Results');
  await page.evaluate('history.forward()');await has('1 matching recommendations');
  assert.equal(await page.evaluate('location.search'),'?miningRunId=42');
  checks.push('Completed displayed F05 result navigates with exact run ID; Back/Forward retains source; no Mining/Generate from navigation');

  await page.evaluate('window.phase1ReloadMarker=true');await page.call('Page.reload');
  await until('!window.phase1ReloadMarker&&(!!document.querySelector("#f06-dashboard-title")||!!document.querySelector("#identifier"))','refresh with authentication recovery');
  if(await page.evaluate('!!document.querySelector("#identifier")')) {
    assert.equal(await page.evaluate('new URLSearchParams(location.search).get("returnTo")'),'/recommendations?miningRunId=42');await signInThroughForm();
  }
  await has('1 matching recommendations');assert.equal(await page.evaluate('location.search'),'?miningRunId=42');
  await click('Change Analysis');await has('Choose Analysis');await click('Next sources');await until("[...document.querySelectorAll('#f06-ranked-request option')].some(option=>option.value==='101')",'Historical analysis on page 2');assert.equal(new URLSearchParams(calls.filter(c=>c.path==='/api/mining/requests').at(-1).query).get('page'),'1');await chooseSource(101,902);
  assert.equal(await page.evaluate('location.search'),'?miningRunId=902');
  await page.evaluate('history.back()');await has('Choose Analysis');await page.evaluate('history.forward()');await has('1 matching recommendations');
  assert.equal(new URLSearchParams(calls.filter(c=>c.path==='/api/recommendations').at(-1).query).get('miningRunId'),'902');
  await click('Banner');await has('No banner recommendations were found for this analysis');
  assert.equal(await page.evaluate('document.querySelector("#f06-browse-panel").innerText.includes("No saved recommendations for this analysis")'),false);
  await click('Bundle');await has('1 matching recommendations');
  assert.equal(new URLSearchParams(calls.filter(c=>c.path==='/api/recommendations').at(-1).query).get('miningRunId'),'902');
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
  await selectCompleted();
  assert.equal(await page.evaluate('document.querySelector("main h1").parentElement.firstElementChild.tagName'),'H1');
  assert.equal(await page.evaluate('!!document.querySelector("nav[aria-label=Breadcrumb]")'),false);
  assert.equal(await page.evaluate('!!document.querySelector("#f06-request")'),false,'Generation reuses selected source');
  assert.equal(await page.evaluate('document.querySelectorAll("#f06-generate-form input[type=checkbox]:checked").length'),4,'All four types selected by default');
  for(const description of ['Suggest groups of products to offer together.','Suggest additional products based on what a customer buys.','Find product groups that customers often purchase together.','Identify products or groups worth considering for promotion.'])await has(description);
  await page.evaluate('document.querySelector("input[value=FBT]").click();[...document.querySelectorAll("#f06-generate-form summary")].find(e=>e.textContent.startsWith("Store rules")).click()');
  assert.equal(await page.evaluate('document.querySelector("input[value=FBT]").checked'),false);await has('At least 2 transactions and 5%');
  await page.evaluate('document.querySelector("input[value=FBT]").focus()');await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:' ',text:' ',code:'Space',windowsVirtualKeyCode:32});await page.call('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await until('document.querySelector("input[value=FBT]").checked','Space toggles type');
  await page.evaluate('for(const e of document.querySelectorAll("#f06-generate-form input[type=checkbox]"))e.click()');await has('Select at least one recommendation format.');
  assert.equal(await page.evaluate('document.querySelector("#f06-generate-form button[type=submit]").disabled'),true);
  await page.evaluate('document.querySelector("input[value=BUNDLE]").click()');state.holdWrite=true;
  await page.evaluate('const form=document.querySelector("#f06-generate-form");form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));');await has('Generating recommendations...');
  await sleep(100);assert.equal(calls.filter(c=>c.path.endsWith('/generate')).length,1);
  assert.equal(await page.evaluate('document.querySelector("#f06-generate-back").disabled'),true);state.holdWrite=false;await has('1 new suggestion');await has('1 matching recommendations');
  assert.deepEqual(JSON.parse(calls.filter(c=>c.path.endsWith('/generate')).at(-1).body),{miningRunId:42,types:['BUNDLE']});
  assert.equal(await page.evaluate('location.search'),'?miningRunId=42');assert.equal(await page.evaluate('!!document.querySelector("#f06-result-title")'),false,'No technical intermediate results screen');
  await page.evaluate('[...document.querySelectorAll("summary")].find(e=>e.textContent.startsWith("Why some suggestions were skipped")).click()');await has('This format needs at least two products.');
  checks.push('Run switch cancels stale reads; bad/foreign/non-completed links fail closed; default four types, manual deselection, keyboard, no types, double submit safety; successful generation returns directly to same run');

  state.mode='empty';state.savedEmpty=true;await selectCompleted();await click('Generate recommendations');await has('0 new suggestions');await has('No suggestions were created.');await has('No bundle recommendations were found for this analysis');
  state.mode='reused';state.savedEmpty=false;await selectCompleted();await click('Generate recommendations');await has('1 reused suggestion');await has('keep their review decisions');await has('1 matching recommendations');
  state.mode='conflict';await selectCompleted();await click('Generate recommendations');await has('The saved analysis cannot be used right now');const writes=calls.filter(c=>c.path.endsWith('/generate')).length;await sleep(150);assert.equal(calls.filter(c=>c.path.endsWith('/generate')).length,writes);
  await click('Generate recommendations');await sleep(100);assert.equal(calls.filter(c=>c.path.endsWith('/generate')).length,writes+1);
  state.mode='tooMany';await click('Generate recommendations');await has('Select fewer recommendation types');
  checks.push('Zero-result generation remains successful with explanations; reused decisions retained; 409 and safety-limit advice never auto-retry');

  state.mode='normal';await login('STORE_ADMIN',1,42);await has('1 matching recommendations');assert.equal(await page.evaluate('!!document.querySelector("#f06-generate-tab")'),false);
  state.savedEmpty=true;await click('Refresh');await has('A Merchandiser can generate suggestions.');state.savedEmpty=false;
  await navigate('/mining?view=history&requestId=17');await has('Analysis Overview');await click('View Results');await click('View Recommendations');await has('1 matching recommendations');
  state.runStatus='RUNNING';await navigate('/mining?view=history&requestId=17');await has('Analysis Overview');
  assert.equal(await page.evaluate('[...document.querySelectorAll("button")].some(e=>e.textContent==="View Recommendations")'),false);state.runStatus='COMPLETED';
  for(const role of ['SYSTEM_ADMIN','END_CUSTOMER']){await login(role);await until('!document.querySelector("#f06-dashboard-title")','Restricted actor');assert.equal(await page.evaluate('[...document.querySelectorAll("nav[aria-label=\\"Main Navigation\\"] button")].some(e=>e.textContent.trim()==="Recommendations")'),false);}
  state.noRequests=true;await login();await has('No source requests are available');state.noRequests=false;
  state.holdRun=42;await navigate('/recommendations?miningRunId=42');await has('Checking selected analysis');state.noRequests=true;await login('MERCHANDISER',2);state.holdRun=null;await has('No source requests are available');
  assert.equal(await page.evaluate('!!document.querySelector("[data-product-group]")'),false);state.noRequests=false;
  await navigate('/recommendations?miningRunId=42');await has('1 matching recommendations');await selectCompleted();
  for(const width of [390,820,1440]){await page.call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true);}
  await click('Back to Recommendations');await page.evaluate('document.querySelector("#f06-type-BUNDLE").focus()');await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await until('document.querySelector("#f06-type-CROSS_SELL").getAttribute("aria-selected")==="true"','Keyboard selects Cross-sell');await has('1 matching recommendations');
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
