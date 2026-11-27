// Run only via: npx.cmd --no-install tsx tests/f05.browser.mjs
// A temporary Chrome profile and CDP intercept ALL /api requests before navigation.
// No real API request is forwarded; fake writes exist only in this test process.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname, basename } from 'node:path';
import { user, payload, configuration, snapshot, requestFixture, runFixture, benchmarkFixture, progressFixture, efimRequestFixture, conversionRequestFixture, conversionRunFixture } from './f05.fixtures.ts';
import { configView as weightConfig } from './f03.fixtures.ts';

const origin=process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3000';
const chrome=process.env.F05_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base=resolve(tmpdir()), profile=mkdtempSync(join(base,'paspm-f05-sync-test-'));
const processChrome=spawn(chrome,['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-sync','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fixtureRole, cdp, initId, postBodies=[], unexpected=[], browserErrors=[];
const sampleUsers=[
 {userId:1,name:'Administrator Fixture',email:'admin@example.invalid',roleCode:'SYSTEM_ADMIN',status:'ACTIVE',emailVerified:true,storeId:null,avatarUrl:'/api/users/1/avatar'},
 {userId:5,name:'Merchandiser Fixture',email:'merch@example.invalid',roleCode:'MERCHANDISER',status:'INACTIVE',emailVerified:true,storeId:1,avatarUrl:'/api/users/5/avatar'},
 {userId:6,name:'Store Staff',email:'store@example.invalid',roleCode:'STORE_ADMIN',status:'ACTIVE',emailVerified:true,storeId:1,avatarUrl:'/unavailable-avatar.png'},
 {userId:7,name:'Customer Fixture',email:'customer@example.invalid',roleCode:'END_CUSTOMER',status:'PENDING_VERIFICATION',emailVerified:false,storeId:null,avatarUrl:null}
];
let precisionFixture=false;
const state={systemHistoryCount:1,singleStore:false,conversion:'legacy',emptyPatterns:false,failedRun:false,storeHistory:'normal',users:sampleUsers.map(x=>({...x})),usersError:false,userSaveError:false,userRoleError:false,activationBlocked:false,holdAccountWrites:false,missingRuntime:false,snapshotCount:1,snapshotWarnings:[],submitError:null,progressOverride:null,progressError:null,legacySingle:false,policy:{scoringVersion:'W2_EXPIRY_SEASON_V1',lambdaMax:0.5,version:1},config:{version:0,algorithm:'EFIM',minUtilMode:null,minUtilValue:null,changedBy:null,changedAt:null},conflict:false,hasRequest:false,failPost:true,compare:true,requestReads:0,mismatchStore2:false,slowHistory:false,holdConfig:false,calls:[]};
class CDP {
  pending=new Map();id=0;listeners=new Map();
  constructor(ws){this.ws=ws;ws.addEventListener('message',event=>{
    const data=JSON.parse(event.data);
    if(data.id){const p=this.pending.get(data.id);if(!p)return;this.pending.delete(data.id);data.error?p.reject(new Error(data.error.message)):p.resolve(data.result);}
    else for(const callback of this.listeners.get(data.method)||[])void callback(data.params);
  });}
  call(method,params={}){return new Promise((resolve,reject)=>{
    const id=++this.id;const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('CDP timeout: '+method));},method==='Page.captureScreenshot'?30000:10000);
    this.pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});
    this.ws.send(JSON.stringify({id,method,params}));
  });}
  on(name,callback){this.listeners.set(name,[...(this.listeners.get(name)||[]),callback]);}
}
async function evaluate(expression){
  const result=await cdp.call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.text+': '+result.exceptionDetails.exception?.description);
  return result.result?.value;
}
async function until(expression,label,timeout=10000){
  const end=Date.now()+timeout;
  while(Date.now()<end){if(await evaluate(expression))return;await sleep(80);}
  throw new Error('UI timeout: '+label);
}
const visibleText="([...document.querySelectorAll('main,header,section,[role=alert],[role=status]')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>e.innerText).join(' ').replace(/\\s+/g,' '))";
async function textIncludes(text){await until(visibleText+'.toLowerCase().includes('+JSON.stringify(text.toLowerCase())+')',text);}
async function click(text){
  await until("[...document.querySelectorAll('button')].some(b=>b.getClientRects().length&&!b.disabled&&b.innerText.replace(/\\s+/g,' ').trim()==="+JSON.stringify(text)+")",'Clickable button '+text);
  const ok=await evaluate("(()=>{const b=[...document.querySelectorAll('button')].sort((a,b)=>Number(Boolean(b.closest('main')))-Number(Boolean(a.closest('main')))).find(b=>b.getClientRects().length&&b.innerText.replace(/\\s+/g,' ').trim()==="+JSON.stringify(text)+");if(!b||b.disabled)return false;b.click();return true;})()");
  assert.equal(ok,true,'Clickable button: '+text);
}
async function openConfirmation(){await until("[...document.querySelectorAll('main button[type=submit]')].some(e=>e.getClientRects().length&&!e.disabled)",'Mining submit enabled');await evaluate("[...document.querySelectorAll('main button[type=submit]')].find(e=>e.getClientRects().length&&!e.disabled).click()");await until("document.querySelector('dialog[open]')?.innerText.includes('Confirm Analysis')",'Single short confirmation');assert.equal(await evaluate("!!document.querySelector('input[type=checkbox]')"),false);}
async function submitMining(){await openConfirmation();await evaluate("(()=>{const b=[...document.querySelectorAll('dialog[open] button')].find(e=>e.innerText==='Confirm Run');b.click();b.click();})()");}
async function noSystemDetailsDebug(){await until('document.querySelectorAll("dialog [data-result-card]").length===2','System result cards loaded');assert.equal(await evaluate('(()=>{const d=document.querySelector("dialog[open]");return d.querySelectorAll("details,summary,[data-execution-run]").length===0&&!/Execution Details|Technical Details|Request key|Snapshot hash|Input hash|SPMF|Java Heap|library version|conversion metadata|STORED_LEGACY_V0/i.test(d.textContent);})()'),true,'System summary never exposes diagnostic information');}

async function noStoreDebug(){assert.equal(await evaluate("/Technical Details|Additional details|Request key|Snapshot hash|Input hash|SPMF|WHOLE_UNIT_HALF_UP|LOSSLESS|NOT_REQUESTED|outputBytes|Java Heap|STORED_LEGACY_V0|009f3ef1-d4ba-4291-9854-b74c6878d26b/i.test(document.querySelector('main').textContent)"),false,'Store views contain no technical dumps, even collapsed');}
async function input(label,value){
  assert.equal(await evaluate("(()=>{const e=document.querySelector('input[aria-label="+JSON.stringify(label)+"]');if(!e||e.disabled)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,"+JSON.stringify(value)+");e.dispatchEvent(new Event('input',{bubbles:true}));return true;})()"),true,'Input '+label);
}
let sessionRevision=0;
async function session(role,url='/mining',legacy=false){
  fixtureRole=role;
  const marker='f05-session-'+(++sessionRevision);
  if(initId)await cdp.call('Page.removeScriptToEvaluateOnNewDocument',{identifier:initId});
  const code="window.f05SessionMarker="+JSON.stringify(marker)+";localStorage.clear();sessionStorage.clear();document.cookie='PASPM-CSRF="+(role?'fixture-csrf; path=/':'; Max-Age=0; path=/')+"';"+
    (legacy?"sessionStorage.setItem('paspm:f05:pending:"+encodeURIComponent(user.id)+"',"+JSON.stringify(JSON.stringify({requestKey:payload.requestKey,snapshotId:2,algorithms:['EFIM'],minUtilValue:30}))+ ");":"");
  initId=(await cdp.call('Page.addScriptToEvaluateOnNewDocument',{source:code})).identifier;
  await cdp.call('Page.navigate',{url:origin+url});
  await until("window.f05SessionMarker==="+JSON.stringify(marker)+"&&document.readyState!=='loading'&&document.getElementById('root')?.childElementCount>0",'New session document rendered',20000);
}
function responsePage(items,query){const page=Number(query.get('page')||0),pageSize=Number(query.get('pageSize')||20);return {items:items.slice(page*pageSize,(page+1)*pageSize),page,pageSize,totalElements:items.length};}
async function paused({requestId,request}){
  const url=new URL(request.url),path=url.pathname,method=request.method;
  state.calls.push({method,path,search:url.search,body:request.postData??null});
  let body,code=200;
  try {
    assert.equal(fixtureRole==='System Admin'&&path.startsWith('/api/mining/'),false,'System Admin must use System-scoped mining endpoints');
    assert.equal(method==='POST'&&path==='/api/system/mining/requests',false,'Temporary Frontend policy forbids System manual analysis');
    assert.equal(fixtureRole==='System Admin'&&/\/(patterns|benchmark)$/.test(path),false,'System monitoring must never read raw patterns or benchmarks');
    assert.equal(fixtureRole==='Merchandiser'&&path==='/api/system/mining/config',false,'Merchandiser must not read System policy');
    if (path === '/api/auth/refresh') {
      body = { accessToken: 'browser-test-only-token', expiresIn: 3600, tokenType: 'Bearer', csrfToken: 'fixture-csrf' };
    } else if (path === '/api/auth/logout') {
      body = { message: 'Logged out' };
    } else if (path === '/api/auth/me') {
      body = { userId: fixtureRole === 'System Admin' ? 1 : 12, name: 'Fixture User', email: 'fixture@example.invalid', roleCode: ({ 'System Admin': 'SYSTEM_ADMIN', 'Store Admin': 'STORE_ADMIN', Merchandiser: 'MERCHANDISER', 'End-Customer': 'END_CUSTOMER' })[fixtureRole], storeId: fixtureRole === 'System Admin' ? null : 1, status: 'ACTIVE', emailVerified: true };
    } else if(path==='/api/users'){
      if(method==='POST'){while(state.holdAccountWrites)await sleep(20);const sent=JSON.parse(request.postData);assert.deepEqual(Object.keys(sent).sort(),['email','name','roleCode','storeId']);const created={...sent,userId:8,status:'PENDING_VERIFICATION',emailVerified:false};state.users.push(created);body=created;code=201;}
      else if(state.usersError){code=503;body={error:'Accounts unavailable'};}else body=state.users;
    }
    else if(/^\/api\/users\/\d+(\/role|\/status)?$/.test(path)){
      if(method!=='GET')while(state.holdAccountWrites)await sleep(20);
      if(method!=='GET'&&(state.userSaveError||(state.userRoleError&&path.endsWith('/role')))){code=500;body={error:'Test account update failed'};}
      else if(method==='PATCH'&&path.endsWith('/status')&&state.activationBlocked&&JSON.parse(request.postData).status==='ACTIVE'){code=400;body={error:'Account must complete OTP activation first'};}
      else {body=state.users.find(x=>x.userId===Number(path.split('/')[3]));if(method!=='GET')Object.assign(body,JSON.parse(request.postData));}

    }
    else if(path==='/api/roles')body=[{code:'SYSTEM_ADMIN',display_name:'System Admin'},{code:'STORE_ADMIN',display_name:'Store Admin'},{code:'MERCHANDISER',display_name:'Merchandiser'},{code:'END_CUSTOMER',display_name:'End-Customer'}];
    else if(path==='/api/system/utility/lambda-policy'){
      if(method==='PUT'){const sent=JSON.parse(request.postData);assert.deepEqual(Object.keys(sent).sort(),['lambdaMax']);state.policy={...state.policy,...sent,version:state.policy.version+1};}body=state.policy;
    }
    else if(path==='/api/utility/config')body={...structuredClone(weightConfig),lambdaPolicy:state.policy};
    else if(path==='/api/system/stores')body=responsePage(state.singleStore?[{storeId:1,name:'Store A'}]:[{storeId:1,name:'Store A'},{storeId:2,name:'Store B'}],url.searchParams);
    else if(path==='/api/system/mining/config'){
      if(method==='PUT'){
        const sent=JSON.parse(request.postData);
        if(state.conflict){state.conflict=false;code=409;body={error:'Mining configuration version conflict'};}
        else {assert.equal(sent.expectedVersion,state.config.version);state.config={...configuration,...sent,version:state.config.version+1};delete state.config.expectedVersion;body=state.config;}
        await sleep(120);
      }else {while(state.holdConfig)await sleep(20);body=state.config;}
    }else if((path==='/api/system/mining/requests'||path==='/api/mining/requests')&&method==='POST'){
      const sent=JSON.parse(request.postData);postBodies.push(request.postData);
      assert.deepEqual(Object.keys(sent).sort(),path.startsWith('/api/system/')?['requestKey','snapshotId','storeId']:['requestKey','snapshotId']);if(path==='/api/mining/requests')assert.equal(fixtureRole,'Merchandiser');
      state.compare=false;state.hasRequest=true;state.requestReads=0;
      if(state.submitError){code=state.submitError.code;body={error:state.submitError.message};}else {
      if(state.failPost){state.failPost=false;await cdp.call('Fetch.failRequest',{requestId,errorReason:'ConnectionReset'});return;}
      code=202;body={...efimRequestFixture(),snapshotId:sent.snapshotId,requestKey:sent.requestKey};}
    }else {
      const storeId=Number(path.match(/\/stores\/(\d+)\//)?.[1]||1);
      if(path.endsWith('/snapshots'))body=responsePage(storeId===1?Array.from({length:state.snapshotCount},(_,i)=>({...snapshot(),warnings:state.snapshotWarnings,snapshotId:i+2,totalWeightedUtility:898000})):[],url.searchParams);
      else if(/\/requests$/.test(path)){
        if(path==='/api/mining/requests')while(state.storeHistory==='hold')await sleep(20);
        if(state.slowHistory&&storeId===1)await sleep(500);
        body=responsePage((storeId===1||state.mismatchStore2)&&state.hasRequest?(fixtureRole==='System Admin'?Array.from({length:state.systemHistoryCount},(_,index)=>({...requestFixture('COMPLETED'),requestId:17+state.systemHistoryCount-1-index})):[requestFixture('COMPLETED')]):[],url.searchParams);
        if(path==='/api/mining/requests'&&state.storeHistory==='empty')body=responsePage([],url.searchParams);
        if(path==='/api/mining/requests'&&state.storeHistory==='error'){code=503;body={error:'Fixture analysis history unavailable'};}
      }else if(/\/requests\/17\/progress$/.test(path)){
        state.requestReads++;
        const status=state.requestReads<2?'PENDING':state.requestReads<3?'RUNNING':'COMPLETED';
        body=state.progressOverride??progressFixture(status,storeId);
        if(state.compare)body={...body,totalSteps:5,completedSteps:status==='COMPLETED'?5:0,percent:status==='COMPLETED'?100:0,algorithm:status==='PENDING'?null:'HUI_MINER',comparisonStatus:status==='COMPLETED'?'MATCH':'PENDING'};
        if(state.progressError){code=state.progressError;body={error:'Fixture progress unavailable'};}
      }else if(/\/requests\/17$/.test(path)){
        body={...requestFixture(state.requestReads<2?'PENDING':state.requestReads<3?'RUNNING':'COMPLETED'),snapshot:{...snapshot(),warnings:state.snapshotWarnings},algorithms:state.compare?['HUI_MINER','EFIM']:[state.legacySingle?'HUI_MINER':'EFIM'],comparisonStatus:state.compare?(state.requestReads<3?'PENDING':'MATCH'):'NOT_REQUESTED'};
      }else if(path.endsWith('/requests/17/runs')){
        const status=state.requestReads<3?'RUNNING':'COMPLETED';
        body=state.compare?[runFixture(status),{...runFixture(status),runId:43,algorithm:'EFIM'}]:[{...runFixture(status),algorithm:state.legacySingle?'HUI_MINER':'EFIM',runtimeMillis:status!=='COMPLETED'||state.missingRuntime?null:242,memoryMiB:status==='COMPLETED'?11.135678:null,patternCount:status==='COMPLETED'?25:null}];
      }
      else if(path.endsWith('/runs/42/patterns'))body=responsePage([{patternId:91,runId:42,productIds:[7,2],utility:12.123456,utilitySpmf:12,patternSize:2,supportCount:null}],url.searchParams);
      else if(path.endsWith('/runs/42'))body={...runFixture('COMPLETED'),algorithm:state.compare||state.legacySingle?'HUI_MINER':'EFIM'};
      else if(/^\/api\/products\/\d+$/.test(path))body={id:Number(path.split('/').at(-1)),name:'Product '+path.split('/').at(-1)};
      else {unexpected.push({method,path});code=500;body={error:'Unexpected test API route'};}
    }
    if (code < 300 && state.conversion !== 'legacy') {
      const decorate = row => {
        if (!row || typeof row !== 'object' || typeof row.conversionVersion !== 'string') return row;
        const metadata = state.conversion === 'unknown' ? { conversionMode:null,roundingUnit:null,conversionVersion:'STORED_LEGACY_V0' } : (() => {
          const expected = row.runId ? conversionRunFixture(state.conversion, row.status, row.storeId) : conversionRequestFixture(state.conversion, row.status, row.storeId);
          return Object.fromEntries(['conversionMode','roundingUnit','conversionVersion','minUtilSpmf',...(row.runId?[]:['effectiveMinUtility','utilityScale','divisor','totalScaledUtility'])].map(key=>[key,expected[key]]));
        })();
        return {...row,...metadata,...(row.runId && state.emptyPatterns && row.status==='COMPLETED'?{patternCount:0}:{}),...(state.failedRun?row.runId?{status:'TIMED_OUT',failureCode:'TIMED_OUT',failureMessage:'Execution time limit exceeded',patternCount:null}:{status:'FAILED'}:{})};
      };
      body=Array.isArray(body)?body.map(decorate):body?.items?{...body,items:body.items.map(decorate)}:decorate(body);
      if(path.endsWith('/runs/42/patterns')) body=state.emptyPatterns?responsePage([],url.searchParams):responsePage([{patternId:91,runId:42,productIds:[7,2],utility:state.conversion==='WHOLE_UNIT_HALF_UP'?12:12.123456,utilitySpmf:state.conversion==='WHOLE_UNIT_HALF_UP'?12:12123456,patternSize:2,supportCount:null}],url.searchParams);
    }
    await cdp.call('Fetch.fulfillRequest',{requestId,responseCode:code,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(precisionFixture ? JSON.stringify(body).replace(/("utility":)[-\d.eE+]+/g,'$1'+'12345678901.123456').replace(/("totalWeightedUtility":)[-\d.eE+]+/g,'$1'+'12345678901.123456').replace(/("totalScaledUtility":)[-\d.eE+]+/g,'$1'+'9223372036854775807').replace(/("divisor":)[-\d.eE+]+/g,'$1'+'9007199254740993').replace(/("runtimeMillis":)[-\d.eE+]+/g,'$1'+'9007199254740993') : JSON.stringify(body)).toString('base64')});
  }catch(e){
    // Cancelled reads during navigation can no longer be fulfilled.
    if(!/Invalid InterceptionId|Invalid Fetch|No resource|Session closed|Target closed/.test(e.message))browserErrors.push(e.message);
    try{await cdp.call('Fetch.failRequest',{requestId,errorReason:'Aborted'});}catch{}
  }
}
const artifactDirectory=process.env.PASPM_TEST_NO_ARTIFACTS === '1' ? null : mkdtempSync(join(base,'paspm-f05-redesign-preview-'));
async function capture(name){assert.equal(await evaluate("/remaining runs|next available run|runs per week|runs per month/i.test(document.querySelector('main')?.innerText||'')"),false,'No invented quota UI');if (!artifactDirectory) return;await sleep(100);const shot=await cdp.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:!(/^(add-account|edit-)/.test(name))});writeFileSync(join(artifactDirectory,name+'.png'),Buffer.from(shot.data,'base64'));}
async function select(label,value){assert.equal(await evaluate("(()=>{const e=document.querySelector('select[aria-label="+JSON.stringify(label)+"]');if(!e||e.disabled)return false;e.value="+JSON.stringify(value)+";e.dispatchEvent(new Event('change',{bubbles:true}));return true;})()"),true,'Select '+label);}
const checks=[];
try{
  await untilFile();
  const port=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split(/\r?\n/)[0]);
  const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  cdp=new CDP(ws);cdp.on('Fetch.requestPaused',paused);cdp.on('Runtime.exceptionThrown',x=>browserErrors.push(x.exceptionDetails.exception?.description||x.exceptionDetails.text));
  await cdp.call('Page.enable');await cdp.call('Runtime.enable');
  await cdp.call('Fetch.enable',{patterns:[{urlPattern:'*://*/api/*',requestStage:'Request'}]});
  await cdp.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});


  if(process.env.F05_CONVERSION_ONLY !== 'true') {
  await session(null,'/admin/lambda-policy');await textIncludes('Sign in to the system');await session(null);await textIncludes('Sign in to the system');checks.push('guest direct routes return Login');
  state.holdConfig=true;await session('System Admin');await textIncludes('Loading...');
  state.holdConfig=false;await expectRoute('/admin/overview','Mining Overview');await textIncludes("Mining settings haven't been configured yet.");
  assert.equal(await evaluate("[...document.querySelectorAll('main form,main input')].filter(e=>e.getClientRects().length).length"),0);
  assert.equal(await evaluate("Boolean(document.querySelector('nav[aria-label=Breadcrumb]'))"),false);
  assert.equal(await evaluate("(()=>{const a=document.getElementById('dashboard-global-config'),b=document.getElementById('mining-stores-title');return Boolean(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING);})()"),true);
  await click('Mining Settings');await textIncludes('Configuration Version 0');
  for(const invalid of ['0','101','0.1234567','9007199254740993']){
    await input('Minimum Utility Value',invalid);await click('Save Settings');
    await until("document.querySelector('main [role=alert]')!==null",'invalid minimum utility');
  }
  assert.equal(state.calls.filter(x=>x.method==='PUT').length,0);
  await input('Minimum Utility Value','0.5');await click('Save Settings');await textIncludes('Settings saved');
  const savedWrites=state.calls.filter(x=>x.method==='PUT').length;
  assert.equal(await evaluate("document.querySelector('main button[type=submit]').disabled"),true);
  await input('Minimum Utility Value','1');await sleep(150);
  assert.equal(state.calls.filter(x=>x.method==='PUT').length,savedWrites);
  await click('Discard Changes');assert.equal(await evaluate("document.querySelector('input[aria-label=\"Minimum Utility Value\"]').value"),'0.5');
  state.conflict=true;await input('Minimum Utility Value','1');await click('Save Settings');await textIncludes('HTTP 409');
  const configReads=state.calls.filter(x=>x.path==='/api/system/mining/config'&&x.method==='GET').length;
  await sleep(250);assert.equal(state.calls.filter(x=>x.path==='/api/system/mining/config'&&x.method==='GET').length,configReads);
  assert.equal(await evaluate("document.querySelector('main button[type=submit]').disabled"),true);
  await click('Refresh Configuration');await textIncludes('Configuration Version 1');
  checks.push('global configuration loading/version zero, string validation, no-op Save, draft Reset and 409 manual recovery');

  // Monitoring UI: no Store means no Store request read, and empty history has no pager.
  const noStoreStart=state.calls.length;await session('System Admin','/admin/mining/history');await textIncludes('Select a store to view its mining history.');
  assert.equal(state.calls.slice(noStoreStart).some(c=>/\/mining\/stores\/\d+\/requests/.test(c.path)),false);
  state.hasRequest=true;state.systemHistoryCount=0;await click('Change Store');await until("!!document.querySelector('dialog[open] button[aria-label=\"Select Store Store A\"]')",'Store picker row');await evaluate("document.querySelector('dialog[open] button[aria-label=\"Select Store Store A\"]').click()");await textIncludes('No analyses have been recorded for this store yet.');
  assert.equal(await evaluate(`!!document.querySelector('[aria-label="Mining history pages"]')`),false);
  state.systemHistoryCount=45;await click('Refresh history');await textIncludes('Page 1 of 3');await click('Next analyses');await textIncludes('Page 2 of 3');await click('Next analyses');await textIncludes('Page 3 of 3');
  assert.equal(await evaluate('new URLSearchParams(location.search).get("storeId")'),'1');
  await evaluate(`document.querySelector('button[aria-label="View details for analysis #17"]').click()`);await textIncludes('Analysis #17');await textIncludes('Analysis Results');
  await click('Close');await textIncludes('Page 3 of 3');
  state.singleStore=true;await session('System Admin','/admin/overview?storeId=1');await textIncludes('Selected store');
  assert.equal(await evaluate(`document.querySelector('[aria-label="Store selection"]').querySelectorAll("button").length`),0);
  await click('Refresh Overview');await textIncludes('Recent Analyses');assert.equal(await evaluate('new URLSearchParams(location.search).get("storeId")'),'1');
  state.singleStore=false;state.systemHistoryCount=1;state.hasRequest=false;
  checks.push('System History without Store performs no Store read; empty pager hidden; 45 analyses paginate and retain page/Store through details; single selected Store has no redundant selection action; Overview refresh retains Store');

  // Existing records are test-only reads; administrative navigation must never POST.
  state.hasRequest=true;state.compare=false;state.requestReads=0;
  const systemPosts=postBodies.length;
  for(const url of ['/admin/mining/run?storeId=1','/admin/overview?view=setup&storeId=1','/admin/mining/history?view=setup&storeId=1','/mining?view=setup&storeId=1']){
    await session('System Admin',url);await expectRoute('/admin/overview','Mining Overview');
    assert.equal(await evaluate(visibleText+".includes('Run Analysis')||"+visibleText+".includes('Run Mining')"),false);
    assert.equal(await evaluate("!!document.querySelector('main button[type=submit]')"),false);
  }
  // Legacy System drafts stay untouched and are never restored/replayed by this role.
  const legacyKey='paspm:f05:efim:v3:System%20Admin:1:store:1';
  await evaluate('sessionStorage.setItem('+JSON.stringify(legacyKey)+',"legacy-pending")');
  await cdp.call('Page.removeScriptToEvaluateOnNewDocument',{identifier:initId});initId=null;await cdp.call('Page.reload');await textIncludes('Mining Overview');
  assert.equal(await evaluate('sessionStorage.getItem('+JSON.stringify(legacyKey)+')'),'legacy-pending');
  assert.equal(postBodies.length,systemPosts);
  await click('Store A #1');await textIncludes('Recent Analyses');await capture('system-dashboard');
  await click('View Details');await textIncludes('Analysis Results');await until("document.querySelector('dialog [role=status]')?.textContent==='Analyzing'",'System running progress');await capture('progress-running');await until("document.querySelector('dialog [role=status]')?.textContent==='Completed'",'System completed progress');await capture('progress-completed');
  await noSystemDetailsDebug();assert.equal(await evaluate(visibleText+".includes('Open algorithm benchmark')"),false);
  const benchmarkCalls=()=>state.calls.filter(x=>x.path.endsWith('/benchmark')).length;assert.equal(benchmarkCalls(),0);
  await session('System Admin','/admin/benchmark?storeId=1&requestId=17&runId=42');await expectRoute('/admin/mining/history','Mining History');await textIncludes('Analysis Results');
  assert.equal(await evaluate('location.search.includes("storeId=1")&&location.search.includes("requestId=17")'),true);assert.equal(benchmarkCalls(),0);assert.equal(postBodies.length,systemPosts);
  checks.push('System Admin has no Run action or submit form; all legacy run URLs redirect without POST, old pending drafts remain untouched; Dashboard/History/progress/run metrics remain available');
  await click('Mining Settings');await textIncludes('Current Mining Settings');await capture('system-mining-configuration');
  assert.equal(await evaluate("!!document.querySelector('select[aria-label=\"Default Algorithm\"]')"),false);
  await input('Minimum Utility Value','1');await click('Save Settings');await textIncludes('Settings saved');
  await click('Mining Overview');await click('Store A #1');await textIncludes('Recent Analyses');const globalBefore=JSON.stringify(state.config);
  await click('Store B #2');await textIncludes('No analyses have been recorded for this store yet.');assert.equal(JSON.stringify(state.config),globalBefore);
  state.mismatchStore2=true;await click('Refresh Overview');await textIncludes('invalid or mismatched page');state.mismatchStore2=false;
  checks.push('Store switching preserves global settings and rejects foreign request data');

  await session('Merchandiser','/mining?view=setup');await textIncludes('Select Snapshot');await textIncludes('Snapshot #2');
  state.snapshotCount=0;await click('Refresh snapshots');await textIncludes('No READY snapshots');
  state.snapshotCount=11;await click('Refresh snapshots');await textIncludes('Snapshot #11');await click('Next');await textIncludes('Snapshot #12');await until("document.querySelector('nav[aria-label=\"Snapshot pages\"] [aria-current=page]')?.innerText==='2'",'Snapshot page 2');assert.ok(state.calls.some(c=>c.path==='/api/mining/snapshots'&&c.search.includes('page=1')));await click('Previous');await textIncludes('Snapshot #2');state.snapshotCount=1;await click('Refresh snapshots');await until("document.querySelectorAll('input[name=snapshotId]').length===1",'One compact snapshot');assert.equal(await evaluate("!!document.querySelector('nav[aria-label=\"Snapshot pages\"]')"),false);await noStoreDebug();
  await textIncludes('01/09/2026');await textIncludes('30/09/2026');await textIncludes('27/10/2026');
  for(const count of [1,8,0]){state.snapshotWarnings=Array(count).fill('MISSING_PUSH_DAY');await click('Refresh snapshots');await until("document.querySelectorAll('input[name=snapshotId]').length===1",'Snapshot loaded');if(count)await textIncludes(count+(count===1?' warning':' warnings'));assert.equal(await evaluate("document.querySelector('[aria-label=\"Snapshot selection\"]').textContent.includes('MISSING_PUSH_DAY')"),false);}state.snapshotWarnings=['MISSING_PUSH_DAY'];
  const storePostBefore=postBodies.length;
  await evaluate("document.querySelector('input[name=snapshotId]').click()");await openConfirmation();await cdp.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until("!document.querySelector('dialog[open]')",'Escape cancels analysis confirmation');assert.equal(postBodies.length,storePostBefore);await openConfirmation();await click('Cancel');assert.equal(postBodies.length,storePostBefore);await capture('merchandiser-run-mining');
  for(const width of [390,820,1440]){await cdp.call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true);if(width===390)assert.equal(await evaluate("document.querySelector('aside').getBoundingClientRect().height<innerHeight/2"),true);await capture('merchandiser-run-'+width);}
  state.submitError={code:409,message:'Configure mining policy before execution'};await submitMining();await textIncludes('Contact a System Admin');assert.equal(postBodies.length,storePostBefore+1);
  await click('Discard saved attempt');state.submitError={code:400,message:'Product 7 TWU exceeds SPMF int32 capacity'};await submitMining();await textIncludes('Use a smaller sales period');await click('Discard saved attempt');
  state.submitError=null;state.failPost=true;await submitMining();await textIncludes('Outcome not confirmed');
  assert.equal(postBodies.length,storePostBefore+3,'Double click sends one POST for this intent');
  const unknownBody=postBodies.at(-1),beforeReload=postBodies.length;
  if(initId){await cdp.call('Page.removeScriptToEvaluateOnNewDocument',{identifier:initId});initId=null;}await cdp.call('Page.reload');await textIncludes('Saved submission');assert.equal(postBodies.length,beforeReload);
  await click('Retry same submission');await textIncludes('Analysis History');assert.equal(postBodies.at(-1),unknownBody);assert.deepEqual(Object.keys(JSON.parse(unknownBody)).sort(),['requestKey','snapshotId']);assert.match(JSON.parse(unknownBody).requestKey,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  await until("document.querySelector('[aria-label=\"Analysis Progress\"] [role=status]')?.innerText==='Completed'",'Real terminal progress');await click('View Details');await textIncludes('Product Combinations');await textIncludes('Utility Score');await textIncludes('Product 7');await textIncludes('Snapshot warnings (1)');await evaluate("[...document.querySelectorAll('summary')].find(e=>e.textContent.includes('Snapshot warnings')).click()");await textIncludes('Some batches have no Push Day');await noStoreDebug();await capture('merchandiser-results');
  const merchantCalls=state.calls.filter(x=>x.path==='/api/mining/requests'&&x.method==='POST');assert.ok(merchantCalls.length>=3);
  state.progressOverride={...progressFixture('RUNNING'),stage:'SAVING',completedSteps:1,percent:50};await click('Refresh Details');await textIncludes('Saving Results');assert.equal(await evaluate("document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')"),'50');
  state.progressOverride={...progressFixture('RUNNING'),attemptNo:2,percent:0};await click('Refresh Details');await textIncludes('Analyzing');assert.equal(await evaluate("document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')"),'0');
  state.progressOverride={...progressFixture('FAILED'),completedSteps:1,percent:50};await click('Refresh Details');await until("document.querySelector('[aria-label=\"Analysis Progress\"] [role=status]')?.innerText==='Failed'",'Real failed progress');assert.equal(await evaluate("document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')"),'50');
  state.progressOverride=null;state.requestReads=5;
  checks.push('Merchandiser owns-Store two-field POST, no policy GET, no-policy/numeric errors, uncertain reload retains UUID without POST replay, real DTO percentage including recovery decrease and failure below 100%, results with nullable support');

  await session('System Admin','/admin/lambda-policy');await textIncludes('Current Priority Strength Policy');await click('Priority Strength Policy');await textIncludes('Current Priority Strength Policy');await textIncludes('Lowering this limit');
  assert.ok(state.calls.some(x=>x.path==='/api/system/utility/lambda-policy'));
  await input('Maximum Priority Strength (λ)','0.7');await click('Save Policy');await textIncludes('Priority Strength Policy updated');
  assert.deepEqual(state.policy,{scoringVersion:'W2_EXPIRY_SEASON_V1',lambdaMax:0.7,version:2});
  assert.equal(state.calls.some(x=>x.path==='/api/utility/config'),false);
  await capture('lambda-desktop');
  checks.push('W2 Lambda global range, helper text, warning and lambdaMax-only GET/PUT contract');

  state.usersError=true;await click('Users & Roles');await textIncludes('Accounts could not be loaded');
  assert.equal(await evaluate("document.querySelector('[data-account-statistics]').innerText.includes('Account data unavailable')"),true);
  state.usersError=false;state.users=[];await click('Retry accounts');await textIncludes('No accounts were returned');
  state.users=sampleUsers.filter(x=>x.status!=='PENDING_VERIFICATION').map(x=>({...x}));await click('Refresh accounts');
  await until("document.querySelector('[data-account-value]')?.innerText==='3'",'Accounts without pending loaded');
  assert.equal(await evaluate("Boolean(document.querySelector('[data-account-pending]'))"),false,'No pending badge when count is zero');
  state.users=sampleUsers.map(x=>({...x}));await click('Refresh accounts');
  await until("document.querySelector('[data-account-value]')?.innerText==='4'",'Mixed account states loaded');
  await textIncludes('Store Staff Accounts');
  assert.deepEqual(await evaluate("[...document.querySelectorAll('[data-account-statistics] [data-account-value]')].map(e=>e.innerText)"),['4','2','1','2']);
  await textIncludes('Pending Activation');
  assert.equal(await evaluate("!document.querySelector('[data-account-statistics]').innerText.toLowerCase().includes('pending')"),true);
  assert.equal(await evaluate("document.querySelector('[data-account-statistics]').innerText.includes('awaiting activation')||document.querySelector('[data-account-statistics]').innerText.includes('Account Overview')"),false);
  assert.equal(await evaluate("document.querySelectorAll('tbody img').length"),0,'Owner-only avatars keep initials in account management');
  assert.equal(state.calls.some(x=>/\/users\/\d+\/avatar/.test(x.path)),false,'Never request another account avatar');
  assert.equal(await evaluate("[...document.querySelectorAll('tbody tr')].every(row=>!row.querySelector('button svg')&&row.querySelectorAll('button').length===1&&row.querySelector('button').innerText==='Edit')"),true);
  await input('Search accounts','missing-account');await textIncludes('No accounts match');await input('Search accounts','');
  await select('Filter by role','store');assert.equal(await evaluate("document.querySelectorAll('tbody tr button').length"),1);
  await select('Filter by role','all');await select('Filter by status','inactive');assert.equal(await evaluate("document.querySelectorAll('tbody tr button').length"),1);
  await select('Filter by status','pending_verification');assert.equal(await evaluate("document.querySelectorAll('tbody tr button').length"),1);await select('Filter by status','all');
  const userWrites=()=>state.calls.filter(x=>x.method!=='GET'&&x.path.startsWith('/api/users'));
  const openAccount=async name=>{
    await cdp.call('Page.bringToFront');
    await evaluate("(()=>{const b=[...document.querySelectorAll('tbody tr')].find(tr=>tr.innerText.includes("+JSON.stringify(name)+"))?.querySelector('button');if(!b)throw Error('Missing account row');b.focus();b.click();})()");
    await until("Boolean(document.querySelector('[role=dialog] input[aria-label=\"Full Name\"]'))",'Account details loaded');
    await until("document.activeElement===document.querySelector('[role=dialog] input[aria-label=\"Full Name\"]')",'Initial account focus');
  };
  const chooseStore=async value=>{
    await until("Boolean(document.querySelector('select[aria-label=\"Assigned Store\"]'))&&!document.querySelector('select[aria-label=\"Assigned Store\"]').disabled",'Assigned Store list ready');
    await select('Assigned Store',value);
  };
  const currentStatus="document.querySelector('[role=dialog] section dd')?.innerText.trim()";
  await openAccount('Store Staff');assert.equal(await evaluate(currentStatus),'Active');
  assert.equal(await evaluate("document.querySelector('select[aria-label=\"Account Status\"]').disabled"),false);
  const activeStart=userWrites().length;await select('Account Status','Inactive');await textIncludes('signs this account out');
  state.holdAccountWrites=true;
  await evaluate("(()=>{const b=document.querySelector('[role=dialog] button[type=submit]');b.click();b.click();})()");
  await until("document.querySelector('[role=dialog] button[type=submit]').disabled",'Save in flight');
  assert.equal(userWrites().length,activeStart+1);assert.equal(await evaluate(currentStatus),'Active');
  await cdp.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await evaluate("document.activeElement===document.querySelector('[role=dialog]')"),true);
  await cdp.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert.equal(await evaluate("Boolean(document.querySelector('[role=dialog]'))"),true);
  state.holdAccountWrites=false;await textIncludes('Account changes saved');
  assert.equal(state.users.find(x=>x.userId===6).status,'INACTIVE');
  assert.deepEqual(userWrites().slice(activeStart).map(x=>[x.method,x.path,JSON.parse(x.body)]),[['PATCH','/api/users/6/status',{status:'INACTIVE'}]]);
  checks.push('ACTIVE disable waits for backend; duplicate Save and Escape while writing are blocked');

  await openAccount('Merchandiser Fixture');assert.equal(await evaluate(currentStatus),'Inactive');
  assert.equal(await evaluate("document.querySelector('select[aria-label=\"Account Status\"]').disabled"),false);
  await capture('edit-inactive-verified-desktop');
  const reactivateStart=userWrites().length;await select('Account Status','Active');await click('Save Changes');await textIncludes('Account changes saved');
  assert.deepEqual(userWrites().slice(reactivateStart).map(x=>[x.method,x.path,JSON.parse(x.body)]),[['PATCH','/api/users/5/status',{status:'ACTIVE'}]]);
  assert.equal(state.users.find(x=>x.userId===5).status,'ACTIVE');

  state.users.find(x=>x.userId===5).status='INACTIVE';state.activationBlocked=true;
  await openAccount('Merchandiser Fixture');await select('Account Status','Active');await click('Save Changes');await textIncludes('Account must complete OTP activation first');
  assert.equal(await evaluate(currentStatus),'Inactive');
  assert.equal(await evaluate("document.querySelector('select[aria-label=\"Account Status\"]').value"),'Active');
  assert.equal(await evaluate("Boolean(document.querySelector('[role=dialog]'))"),true);
  state.activationBlocked=false;await click('Cancel');
  checks.push('verified INACTIVE reactivates with PATCH ACTIVE; backend password eligibility refusal keeps draft and actual status');

  await openAccount('Customer Fixture');assert.equal(await evaluate(currentStatus),'Pending Activation');
  assert.equal(await evaluate("document.querySelector('select[aria-label=\"Account Status\"]').disabled"),true);
  await textIncludes('Activate account');await capture('edit-pending-desktop');
  const pendingStart=userWrites().length;await input('Full Name','Pending Customer');await click('Save Changes');await textIncludes('Account changes saved');
  assert.deepEqual(userWrites().slice(pendingStart).map(x=>[x.method,x.path]),[['PUT','/api/users/7']]);
  assert.equal(state.users.find(x=>x.userId===7).status,'PENDING_VERIFICATION');
  await openAccount('Merchandiser Fixture');
  const nameStart=userWrites().length;await input('Full Name','Merchandiser Updated');await click('Save Changes');await textIncludes('Account changes saved');
  assert.deepEqual(userWrites().slice(nameStart).map(x=>[x.method,x.path]),[['PUT','/api/users/5']]);
  assert.equal(state.users.find(x=>x.userId===5).status,'INACTIVE');
  checks.push('pending status and verification stay distinct; name-only edits never PATCH status or PUT role');

  await openAccount('Store Staff');await select('Account Role','Merchandiser');await chooseStore('2');
  const accessStart=userWrites().length;await click('Save Changes');await textIncludes('Account changes saved');
  assert.deepEqual(userWrites().slice(accessStart).map(x=>[x.method,x.path,JSON.parse(x.body)]),[['PUT','/api/users/6/role',{roleCode:'MERCHANDISER',storeId:2}]]);
  assert.equal(state.users.find(x=>x.userId===6).status,'INACTIVE');
  await openAccount('Store Staff');await input('Full Name','Edited Store Staff');await chooseStore('1');state.userRoleError=true;
  const partialStart=userWrites().length;await click('Save Changes');await textIncludes('Test account update failed');
  assert.equal(await evaluate("document.querySelector('input[aria-label=\"Full Name\"]').value"),'Edited Store Staff');
  assert.equal(await evaluate("document.querySelector('select[aria-label=\"Assigned Store\"]').value"),'1');
  assert.equal(state.users.find(x=>x.userId===6).storeId,2);
  const retryStart=userWrites().length;state.userRoleError=false;await click('Save Changes');await textIncludes('Account changes saved');
  assert.deepEqual(userWrites().slice(partialStart,retryStart).map(x=>x.path),['/api/users/6','/api/users/6/role']);
  assert.deepEqual(userWrites().slice(retryStart).map(x=>x.path),['/api/users/6/role']);
  checks.push('Role/Store updates leave status unchanged; partial failure preserves draft and retries only unconfirmed changes');

  await openAccount('Administrator Fixture');
  assert.equal(await evaluate("document.querySelector('select[aria-label=\"Account Role\"]').disabled"),true);
  assert.equal(await evaluate("document.querySelector('select[aria-label=\"Account Status\"] option[value=Inactive]').disabled"),true);
  assert.equal(await evaluate("document.querySelector('[role=dialog] button[type=submit]').disabled"),true);
  await evaluate("document.querySelector('button[aria-label=\"Close account dialog\"]').focus()");
  await cdp.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
  assert.equal(await evaluate("document.activeElement.innerText"),'Cancel');
  await cdp.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"),'Close account dialog');
  await cdp.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await until("!document.querySelector('[role=dialog]')",'Escape closes idle modal');
  await until("document.activeElement.getAttribute('aria-label')==='Edit Administrator Fixture'",'Focus restored');
  await openAccount('Administrator Fixture');const selfStart=userWrites().length;
  await input('Full Name','Administrator Updated');await click('Save Changes');await textIncludes('Account changes saved');
  assert.deepEqual(userWrites().slice(selfStart).map(x=>[x.method,x.path]),[['PUT','/api/users/1']]);
  assert.equal(state.users.find(x=>x.userId===1).roleCode,'SYSTEM_ADMIN');
  checks.push('current System Admin keeps active access; focus trap, Escape and focus restoration work');

  await click('Add Account');await chooseStore('1');
  const invalidStart=userWrites().length;
  await click('Create & Send Invitation');
  assert.equal(await evaluate("document.querySelector('input[aria-label=\"Full Name\"]').validity.valueMissing"),true);
  assert.equal(userWrites().length,invalidStart,'Blank invitation must not POST');
  await input('Full Name','Invited Fixture');await input('Email Address','invalid-email');
  await click('Create & Send Invitation');
  assert.equal(await evaluate("document.querySelector('input[aria-label=\"Email Address\"]').validity.typeMismatch"),true);
  assert.equal(userWrites().length,invalidStart,'Invalid email must not POST');
  await input('Email Address','invited@example.invalid');await chooseStore('1');
  await select('Account Role','System Admin');await textIncludes('does not require a Store assignment');
  assert.equal(await evaluate("Boolean(document.querySelector('select[aria-label=\"Assigned Store\"]'))"),false);
  await select('Account Role','Merchandiser');await chooseStore('1');
  assert.equal(await evaluate("document.querySelector('[role=dialog]').getBoundingClientRect().width>=540&&document.querySelector('[role=dialog]').getBoundingClientRect().width<=600"),true);
  assert.equal(await evaluate("[...document.querySelectorAll('[role=dialog] select')].every(s=>getComputedStyle(s).appearance==='none'&&s.parentElement.querySelectorAll('svg.lucide-chevron-down').length===1&&s.getBoundingClientRect().height>=44)"),true,'One custom chevron per native select');
  await textIncludes('Invitation email');
  assert.equal(await evaluate("document.querySelector('[role=dialog]').innerText.includes('Email activation required')"),false);
  await evaluate("document.querySelector('select[aria-label=\"Account Role\"]').focus()");
  await cdp.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await cdp.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"),'Assigned Store','Native role to Store keyboard traversal');
  for(const key of ['ArrowDown','ArrowUp']){
    await cdp.call('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:key==='ArrowDown'?40:38});
    await cdp.call('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:key==='ArrowDown'?40:38});
    await sleep(50);
    assert.equal(await evaluate("document.querySelector('select[aria-label=\"Assigned Store\"]').value"),key==='ArrowDown'?'2':'1','Native Store keyboard selection');
  }
  await capture('add-account-desktop');
  const inviteStart=userWrites().length;state.holdAccountWrites=true;
  await evaluate("(()=>{const b=document.querySelector('[role=dialog] button[type=submit]');b.click();b.click();})()");
  await until("document.querySelector('[role=dialog] button[type=submit]').disabled",'Invitation in flight');
  assert.equal(userWrites().length,inviteStart+1);state.holdAccountWrites=false;
  await textIncludes('Account created. An activation invitation was sent');
  assert.equal(state.users.at(-1).status,'PENDING_VERIFICATION');assert.equal(state.users.at(-1).emailVerified,false);
  assert.deepEqual(JSON.parse(userWrites().at(-1).body),{name:'Invited Fixture',email:'invited@example.invalid',roleCode:'MERCHANDISER',storeId:1});
  for(const width of [1024,820,390]){
    await cdp.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
    await click('Add Account');await input('Full Name','Mobile Draft');await input('Email Address','mobile@example.invalid');await chooseStore('1');
    assert.equal(await evaluate("(()=>{const r=document.querySelector('[role=dialog]').getBoundingClientRect();return r.width<=innerWidth-23&&r.height<=innerHeight-23&&r.top>=0;})()"),true);
    assert.equal(await evaluate("[...document.querySelectorAll('[role=dialog] select')].every(s=>{const r=s.getBoundingClientRect(),i=s.parentElement.querySelector('svg').getBoundingClientRect();return getComputedStyle(s).appearance==='none'&&i.right<r.right&&i.right>r.right-40&&Math.abs(i.top+i.height/2-r.top-r.height/2)<1;})"),true,'Mobile/tablet chevrons stay inside and centered');
    await capture('add-account-'+width);await click('Cancel');
    await openAccount('Merchandiser Updated');
    assert.equal(await evaluate("(()=>{const r=document.querySelector('[role=dialog]').getBoundingClientRect();return r.width<=innerWidth-23&&r.height<=innerHeight-23&&r.top>=0;})()"),true);
    await capture('edit-account-'+width);await click('Cancel');
  }
  await cdp.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  checks.push('invitation uses Store names and exact IDs, remains pending; duplicate create blocked; Add/Edit responsive');

  state.compare=true;state.requestReads=5;
  const pages=[
    ['/admin/overview?storeId=1','Recent Analyses','dashboard'],
    ['/admin/setup?storeId=1','Edit Mining Settings','configuration'],
    ['/admin/mining/run?storeId=1','Recent Analyses','legacy-run-dashboard'],
    ['/admin/mining/history?storeId=1&requestId=17','Analysis Results','history'],
    ['/admin/benchmark?storeId=1&requestId=17&runId=42','Analysis Results','legacy-history'],
    ['/admin/users','User Management','users'],
    ['/admin/lambda-policy','Current Priority Strength Policy','lambda']
  ];
  for(const width of [1440,1024,820,390]){
    await cdp.call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
    for(const [url,text,name] of pages){
      await session('System Admin',url);await textIncludes(text);await sleep(80);
      assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth+1"),true,'No page overflow '+name+' '+width);
      assert.equal(await evaluate("document.querySelectorAll('main h1').length"),1,'One page heading '+name);
      assert.equal(await evaluate("Boolean(document.querySelector('nav[aria-label=Breadcrumb]'))"),false);
      if(name==='users')assert.equal(await evaluate("(()=>{const heights=[...document.querySelectorAll('[data-account-statistics] article')].map(e=>e.getBoundingClientRect().height);return heights.length===4&&Math.max(...heights)-Math.min(...heights)<1;})()"),true,'Four equally tall KPI cards');
      if(name==='users'){
        assert.equal(await evaluate("document.querySelector('[data-account-statistics]').innerText.toLowerCase().includes('pending')"),false,'KPI cards never show pending information');
        assert.equal(await evaluate("[...document.querySelectorAll('[data-account-statistics] article')].every(e=>!e.innerText.includes('Loaded list only'))"),true);
        assert.equal(await evaluate("document.querySelector('[data-account-statistics]').innerText.includes('Statistics reflect the loaded account list, not system-wide totals.')"),false,'Loaded-list scope sentence is hidden');
        assert.equal(await evaluate("[...document.querySelectorAll('[data-account-statistics] article')].every(e=>e.title.includes('not a system-wide total')&&e.getAttribute('aria-label').includes('loaded account list only'))"),true,'Loaded-list scope remains in accessible labels and tooltips');
      }
      if(width===390||width===1440)await capture(name+'-'+width);
      if(width<768)assert.equal(await evaluate("document.querySelector('aside').getBoundingClientRect().height<innerHeight/2"),true,'Mobile navigation must leave content accessible');
    }
  }
  await cdp.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  checks.push('System Admin management and legacy redirects: desktop/tablet/mobile overflow, one heading and no breadcrumbs');

  for(const role of ['Merchandiser','Store Admin']){
    state.requestReads=5;const before=state.calls.length;
    await session(role,'/mining?view=history',true);await textIncludes(role==='Store Admin'?'Analysis History':'Product Combination Analysis');
    await click('View Details');await textIncludes('Product Combinations');await textIncludes('01/09/2026');await textIncludes('30/09/2026');await textIncludes('Utility Score');await noStoreDebug();
    assert.ok(state.calls.slice(before).filter(x=>!x.path.startsWith('/api/auth/')).every(x=>x.method==='GET'&&(x.path.startsWith('/api/mining/')||x.path.startsWith('/api/products/'))));
    assert.equal(await evaluate("Boolean(document.querySelector('nav[aria-label=Breadcrumb]'))"),false);
    if(role==='Store Admin'){
      assert.equal(await evaluate("[...document.querySelectorAll('nav[aria-label=\"Mining workspace\"] button')].some(e=>e.innerText==='Run Analysis')"),false);
      for(const count of [2,1]){
        state.compare=count===2;state.legacySingle=true;await click('Refresh Details');
        await until(count===2?"document.querySelector('#f05-result-run')?.options.length===3":"!document.querySelector('#f05-result-run')&&!!document.querySelector('#f05-patterns-title')",'Compact run selector only for multiple runs');
        for(const width of [1440,768,390]){
          await cdp.call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
          assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true);
          assert.equal(await evaluate("document.querySelector('dialog').scrollWidth<=innerWidth+1"),true,'Modal stays within viewport');
          assert.equal(await evaluate("document.querySelector('#f05-details-title').closest('dialog').innerText.includes('HUI-Miner')"),true);
          await capture('store-admin-results-'+count+'-'+width);
        }
      }
      await evaluate("document.querySelector('[aria-label=\"Close analysis details\"]').click()");assert.equal(await evaluate("!!document.querySelector('#f05-details-title')"),false);
      state.storeHistory='empty';await click('Refresh history');await textIncludes('No analyses have been recorded for this store yet.');
      state.storeHistory='error';await click('Refresh history');await textIncludes('The analysis service is unavailable');
      state.storeHistory='hold';await click('Refresh history');await textIncludes('Loading analysis history');
      state.storeHistory='normal';await until("!!document.querySelector('button[aria-label=\"View details for analysis #17\"]')",'history restored');
      state.compare=true;
      await cdp.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    }
  }

  }
  // New conversion modes are read-only fixtures; no mining or recommendation POST.
  const conversionPosts=postBodies.length;
  state.compare=false;state.legacySingle=false;state.hasRequest=true;state.storeHistory='normal';
  for(const role of ['System Admin','Merchandiser','Store Admin']) {
    for(const mode of ['LOSSLESS','WHOLE_UNIT_HALF_UP','unknown']) {
      state.conversion=mode;state.emptyPatterns=mode==='WHOLE_UNIT_HALF_UP';state.requestReads=5;
      await session(role,role==='System Admin'?'/admin/mining/history?storeId=1&requestId=17':'/mining?view=history&requestId=17');
      if(role==='System Admin')await noSystemDetailsDebug();
      else await until("!!document.querySelector('dialog[open] #f05-patterns-title')",'Completed run details loaded automatically');
      const beforePatterns=state.calls.filter(call=>call.path.endsWith('/patterns')).length;
      if(role==='System Admin'){
        const expected=mode==='WHOLE_UNIT_HALF_UP'?'0':'25';
        assert.equal(await evaluate('document.querySelector("dialog [data-result-card=combinations]").textContent.includes('+JSON.stringify(expected)+')'),true,'Actual per-run count remains visible for '+mode);
        assert.equal(state.calls.filter(call=>call.path.endsWith('/patterns')).length,beforePatterns);
        assert.equal(await evaluate("!!document.querySelector('main button[type=submit]')"),false);
      }else{await noStoreDebug();if(mode==='WHOLE_UNIT_HALF_UP'){await textIncludes('rounded to whole');await textIncludes('Zero product combinations is a valid result');await textIncludes('saved snapshot is unchanged');}if(mode==='unknown')await textIncludes('not recorded for this historical analysis');}
      const completedReads=state.calls.filter(call=>call.path.endsWith('/progress')).length;await sleep(1650);assert.equal(state.calls.filter(call=>call.path.endsWith('/progress')).length,completedReads,'Terminal stops polling: '+role+' / '+mode);
      if(mode==='WHOLE_UNIT_HALF_UP') await evaluate("document.querySelectorAll('[aria-label=\"Analysis input conversion\"]').forEach(e=>{const details=e.closest('details');if(details)details.open=true})");
      if(mode==='WHOLE_UNIT_HALF_UP') for(const width of [1440,820,390]) {
        await cdp.call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
        assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true,'Conversion details fit '+role+' '+width);
        assert.equal(await evaluate("[...document.querySelectorAll('[aria-label=\"Analysis input conversion\"]')].every(e=>!e.closest('[role=alert]'))"),true,'Accepted fallback is not a warning');
        await capture('conversion-'+role.toLowerCase().replaceAll(' ','-')+'-'+width);
      }
      await cdp.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    }
  }
  state.conversion='WHOLE_UNIT_HALF_UP';state.failedRun=true;state.progressOverride={...progressFixture('FAILED'),percent:50,completedSteps:1};state.requestReads=5;
  const patternsBeforeFailure=state.calls.filter(call=>call.path.endsWith('/patterns')).length;
  await session('Merchandiser','/mining?view=history&requestId=17');await until("document.querySelector('[aria-label=\"Analysis Progress\"] [role=status]')?.innerText==='Failed'",'Failed analysis');await textIncludes('took too long and was stopped');await noStoreDebug();assert.equal(await evaluate("!!document.querySelector('button[data-analysis-run]')"),false,'Failed runs cannot open results');assert.equal(state.calls.filter(call=>call.path.endsWith('/patterns')).length,patternsBeforeFailure);
  await capture('conversion-failed-run');
  assert.equal(postBodies.length,conversionPosts);assert.equal(state.calls.some(call=>call.path.endsWith('/benchmark')||call.path.includes('/schedules')||call.path==='/api/recommendations/generate'),false);
  state.conversion='legacy';state.emptyPatterns=false;state.failedRun=false;state.progressOverride=null;state.requestReads=5;
  checks.push('LOSSLESS/WHOLE_UNIT_HALF_UP/unknown-null Request and Run details for all 3 roles; accepted fallback neutral, exact snapshot kept, terminal poll stop, completed empty patterns, timed-out failure blocked; 1440/820/390 screenshots; no mining/F06/scheduler/benchmark POST');

  precisionFixture=true;state.conversion='LOSSLESS';state.requestReads=5;state.hasRequest=true;state.emptyPatterns=false;
  const beforePrecisionPosts=postBodies.length;
  await session('Merchandiser','/mining?view=history&requestId=17');await textIncludes('Product Combinations');await textIncludes('12,345,678,901.123456');
  await session('System Admin','/admin/mining/history?storeId=1&requestId=17');await textIncludes('Analysis Results');
  await noSystemDetailsDebug();await textIncludes('Minimum Utility');await textIncludes('0.5%');
  assert.equal(postBodies.length,beforePrecisionPosts);precisionFixture=false;state.conversion='legacy';
  checks.push('Raw numeric precision: exact BigDecimal Pattern results, System summary with hidden int64 diagnostics, completed history and no Mining replay');
  await session('Merchandiser','/f03/configuration');await textIncludes('Save Configuration');
  assert.equal(await evaluate("[...document.querySelectorAll('main button')].find(b=>b.innerText.includes('Save Configuration')).disabled"),false);
  const featureCalls=()=>state.calls.filter(c=>!c.path.startsWith('/api/auth/')).length;const beforeCustomer=featureCalls();await session('End-Customer');await textIncludes('Access Restricted');assert.equal(featureCalls(),beforeCustomer);
  await session('Store Admin','/admin/setup');await textIncludes('Access Restricted');
  await session('System Admin','/admin/api-connections');await expectRoute('/admin/overview','Mining Overview');
  assert.equal(state.calls.some(x=>/connection/i.test(x.path)),false);
  await click('Mining History');await click('Mining Settings');await evaluate('history.back()');await expectRoute('/admin/mining/history','Mining History');await evaluate('history.forward()');await expectRoute('/admin/setup','Mining Settings');
  await evaluate("document.querySelector('button[aria-label=\"Account menu\"]').click()");await click('Sign out');await textIncludes('Sign in to the system');
  checks.push('Store Admin read-only and legacy HUI/dual-run rendering; Merchandiser reads and F03 permissions; Customer/admin isolation, back/forward and Logout preserved');

  assert.equal(state.calls.some(x=>x.path.endsWith('/benchmark')),false);
  assert.equal(state.calls.some(x=>x.method==='POST'&&x.path==='/api/system/mining/requests'),false);
  assert.equal(state.calls.some(x=>/quota|usage-limit|remaining-runs/i.test(x.path)),false);
  assert.deepEqual(unexpected,[]);assert.deepEqual(browserErrors,[]);
  assert.ok(state.calls.filter(x=>x.method!=='GET').every(x=>x.path==='/api/auth/refresh'||x.path==='/api/auth/logout'||x.path==='/api/system/mining/config'||x.path==='/api/mining/requests'||x.path==='/api/system/utility/lambda-policy'||/^\/api\/users(?:\/\d+(?:\/role|\/status)?)?$/.test(x.path)));
  console.log(JSON.stringify({result:'PASS (test-only HTTP fixtures)',checks,interceptedApiCalls:state.calls.length,manualPosts:postBodies.length,realBackendWrites:0,artifactDirectory},null,2));
}catch(e){
  try{await capture('failure');}catch{}
  console.log(JSON.stringify({result:'FAIL',error:e.stack,browserErrors,unexpected,checks,diagnostics:await evaluate("({url:location.href,ready:document.readyState,root:document.getElementById('root')?.innerText.slice(0,300)})").catch(()=>null),artifactDirectory},null,2));
  process.exitCode=1;
}finally{
  state.storeHistory='normal';
  if(cdp){try{await cdp.call('Browser.close');}catch{}cdp.ws.close();}
  if(processChrome.exitCode===null){await Promise.race([new Promise(r=>processChrome.once('exit',r)),sleep(3000)]);}
  if(processChrome.exitCode===null)processChrome.kill();
  const target=resolve(profile);
  if(dirname(target)===base&&basename(target).startsWith('paspm-f05-sync-test-')){
    try{rmSync(target,{recursive:true,force:true,maxRetries:3,retryDelay:100});}catch{console.log('Temporary test profile could not be fully removed: '+target);}
  }
}
async function expectRoute(path,label){
  await until('location.pathname==='+JSON.stringify(path),'route '+path);
  await until("document.querySelector('nav[aria-label=\"Main Navigation\"] button[aria-current=page]')?.innerText==="+JSON.stringify(label),'active '+label);
}
async function untilFile(){
  const end=Date.now()+10000;
  while(Date.now()<end){if(existsSync(join(profile,'DevToolsActivePort')))return;await sleep(100);}
  throw new Error('Chrome did not start; run with an approved native browser environment.');
}
