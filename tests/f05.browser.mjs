// Run only via: npx.cmd --no-install tsx tests/f05.browser.mjs
// A temporary Chrome profile and CDP intercept ALL /api requests before navigation.
// No real API request is forwarded; fake writes exist only in this test process.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname, basename } from 'node:path';
import { user, payload, configuration, snapshot, requestFixture, runFixture, benchmarkFixture } from './f05.fixtures.ts';

const origin='http://localhost:3000';
const chrome=process.env.F05_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base=resolve(tmpdir()), profile=mkdtempSync(join(base,'paspm-f05-sync-test-'));
const processChrome=spawn(chrome,['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-sync','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let cdp, initId, postBodies=[], unexpected=[], browserErrors=[];
const state={config:{version:0,algorithm:null,minUtilMode:null,minUtilValue:null,changedBy:null,changedAt:null},conflict:false,hasRequest:false,failPost:true,compare:true,requestReads:0,mismatchStore2:false,slowHistory:false,holdConfig:false,calls:[]};
class CDP {
  pending=new Map();id=0;listeners=new Map();
  constructor(ws){this.ws=ws;ws.addEventListener('message',event=>{
    const data=JSON.parse(event.data);
    if(data.id){const p=this.pending.get(data.id);if(!p)return;this.pending.delete(data.id);data.error?p.reject(new Error(data.error.message)):p.resolve(data.result);}
    else for(const callback of this.listeners.get(data.method)||[])void callback(data.params);
  });}
  call(method,params={}){return new Promise((resolve,reject)=>{
    const id=++this.id;const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('CDP timeout: '+method));},10000);
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
const visibleText="([...document.querySelectorAll('main,header,section,[role=alert],[role=status]')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>e.innerText).join(' '))";
async function textIncludes(text){await until(visibleText+'.toLowerCase().includes('+JSON.stringify(text.toLowerCase())+')',text);}
async function click(text){
  await until("[...document.querySelectorAll('button')].some(b=>b.getClientRects().length&&!b.disabled&&b.innerText.trim()==="+JSON.stringify(text)+")",'Clickable button '+text);
  const ok=await evaluate("(()=>{const b=[...document.querySelectorAll('button')].sort((a,b)=>Number(Boolean(b.closest('main')))-Number(Boolean(a.closest('main')))).find(b=>b.getClientRects().length&&b.innerText.trim()==="+JSON.stringify(text)+");if(!b||b.disabled)return false;b.click();return true;})()");
  assert.equal(ok,true,'Clickable button: '+text);
}
async function input(label,value){
  assert.equal(await evaluate("(()=>{const e=document.querySelector('input[aria-label="+JSON.stringify(label)+"]');if(!e||e.disabled)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,"+JSON.stringify(value)+");e.dispatchEvent(new Event('input',{bubbles:true}));return true;})()"),true,'Input '+label);
}
async function session(role,url='/mining',legacy=false){
  if(initId)await cdp.call('Page.removeScriptToEvaluateOnNewDocument',{identifier:initId});
  const actor=role?{...user,role}:null;
  const code="localStorage.clear();sessionStorage.clear();"+(actor?
    "localStorage.setItem('retailspace_auth_user',"+JSON.stringify(JSON.stringify(actor))+");localStorage.setItem('retailspace_auth_token','browser-test-only-token');":"")+
    (legacy?"sessionStorage.setItem('paspm:f05:pending:"+encodeURIComponent(user.id)+"',"+JSON.stringify(JSON.stringify({requestKey:payload.requestKey,snapshotId:2,algorithms:['EFIM'],minUtilValue:30}))+");":"");
  initId=(await cdp.call('Page.addScriptToEvaluateOnNewDocument',{source:"try{"+code+"}catch{}"})).identifier;
  await cdp.call('Page.navigate',{url:origin+url});
}
function responsePage(items,query){return {items,page:Number(query.get('page')||0),pageSize:Number(query.get('pageSize')||20),totalElements:items.length};}
async function paused({requestId,request}){
  const url=new URL(request.url),path=url.pathname,method=request.method;
  state.calls.push({method,path,search:url.search});
  let body,code=200;
  try {
    if(path==='/api/users')body=[];
    else if(path==='/api/roles')body=[{roleId:1,code:'SYSTEM_ADMIN',displayName:'System Administrator'},{roleId:2,code:'STORE_ADMIN',displayName:'Store Administrator'},{roleId:3,code:'MERCHANDISER',displayName:'Merchandiser'},{roleId:4,code:'END_CUSTOMER',displayName:'End Customer'}];
    else if(path==='/api/system/utility/lambda-policy')body={lambdaMin:0,lambdaMax:0.5,version:1};
    else if(path==='/api/system/stores')body=responsePage([{storeId:1,name:'Store A'},{storeId:2,name:'Store B'}],url.searchParams);
    else if(path==='/api/system/mining/config'){
      if(method==='PUT'){
        const sent=JSON.parse(request.postData);
        if(state.conflict){state.conflict=false;code=409;body={error:'Mining configuration version conflict'};}
        else {assert.equal(sent.expectedVersion,state.config.version);state.config={...configuration,...sent,version:state.config.version+1};delete state.config.expectedVersion;body=state.config;}
        await sleep(120);
      }else {while(state.holdConfig)await sleep(20);body=state.config;}
    }else if(path==='/api/system/mining/requests'&&method==='POST'){
      const sent=JSON.parse(request.postData);postBodies.push(request.postData);
      assert.deepEqual(Object.keys(sent).sort(),['compareAlgorithms','requestKey','snapshotId','storeId']);
      state.compare=sent.compareAlgorithms;state.hasRequest=true;
      if(state.failPost){state.failPost=false;await cdp.call('Fetch.failRequest',{requestId,errorReason:'ConnectionReset'});return;}
      code=202;body={...requestFixture(),requestKey:sent.requestKey,algorithms:sent.compareAlgorithms?['HUI_MINER','EFIM']:[state.config.algorithm]};
    }else {
      const storeId=Number(path.match(/\/stores\/(\d+)\//)?.[1]||1);
      if(path.endsWith('/snapshots'))body=responsePage(storeId===1?[snapshot()]:[],url.searchParams);
      else if(/\/requests$/.test(path)){
        if(state.slowHistory&&storeId===1)await sleep(500);
        body=responsePage((storeId===1||state.mismatchStore2)&&state.hasRequest?[requestFixture('COMPLETED')]:[],url.searchParams);
      }else if(/\/requests\/17$/.test(path)){
        state.requestReads++;
        body=requestFixture(state.requestReads<2?'PENDING':state.requestReads<3?'RUNNING':'COMPLETED');
      }else if(path.endsWith('/requests/17/runs')){
        const status=state.requestReads<3?'RUNNING':'COMPLETED';
        body=[runFixture(status),{...runFixture(status),runId:43,algorithm:'EFIM'}];
      }else if(/\/runs\/(42|43)\/benchmark$/.test(path))body=benchmarkFixture(path.includes('/43/')?'EFIM':'HUI_MINER');
      else if(path.endsWith('/runs/42/patterns'))body=responsePage([{patternId:91,runId:42,productIds:[7,2],utility:12.123456,utilitySpmf:12,patternSize:2,supportCount:null}],url.searchParams);
      else if(path.endsWith('/runs/42'))body=runFixture('COMPLETED');
      else {unexpected.push({method,path});code=500;body={error:'Unexpected test API route'};}
    }
    await cdp.call('Fetch.fulfillRequest',{requestId,responseCode:code,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(body)).toString('base64')});
  }catch(e){
    // Cancelled reads during navigation can no longer be fulfilled.
    if(!/Invalid InterceptionId|Invalid Fetch|No resource|Session closed|Target closed/.test(e.message))browserErrors.push(e.message);
    try{await cdp.call('Fetch.failRequest',{requestId,errorReason:'Aborted'});}catch{}
  }
}
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


  await session(null,'/admin/lambda-policy');await textIncludes('Sign in to the system');await session(null);await textIncludes('Sign in to the system');checks.push('guest direct /mining -> Login');
  await session('System Admin');await expectRoute('/admin/overview','Dashboard');
  assert.equal(await evaluate("document.querySelectorAll('main form,main input').length"),0);
  await textIncludes('No global mining policy');
  await click('Algorithm Configuration');await expectRoute('/admin/setup','Algorithm Configuration');await textIncludes('Configuration version 0');
  await input('Minimum utility','0.5');await click('Save mining configuration');await textIncludes('Configuration version 1');
  await textIncludes('Changed by');assert.equal(state.config.minUtilValue,0.5);checks.push('Dashboard is read-only and version 0 config saves with audit metadata');
  state.conflict=true;await input('Minimum utility','1');await click('Save mining configuration');await textIncludes('HTTP 409');
  const configReads=state.calls.filter(x=>x.path==='/api/system/mining/config'&&x.method==='GET').length;
  await sleep(250);assert.equal(state.calls.filter(x=>x.path==='/api/system/mining/config'&&x.method==='GET').length,configReads);
  await click('Refresh configuration');await textIncludes('Configuration version 1');checks.push('409 blocks writes until manual config refresh');

  await click('Run Mining');await expectRoute('/admin/mining/run','Run Mining');
  await textIncludes('Store A');await click('Store A #1');await textIncludes('Snapshot #2');
  assert.equal(await evaluate("(()=>{const e=document.querySelector('input[name=snapshotId]');if(!e||e.disabled)return false;e.click();return true;})()"),true);
  assert.equal(await evaluate("(()=>{const e=document.querySelector('input[aria-label=\"Compare both algorithms\"]');e.click();return e.checked;})()"),true);
  await evaluate("(()=>{const b=[...document.querySelectorAll('main button')].find(b=>b.innerText.trim()==='Run Mining');b.click();b.click();})()");
  await textIncludes('Could not connect to the mining service');assert.equal(postBodies.length,1);
  await click('Mining History');await expectRoute('/admin/mining/history','Mining History');await textIncludes('Mining request history');await click('Run Mining');
  await click('Retry same submission');await expectRoute('/admin/mining/history','Mining History');await textIncludes('Algorithm runs');
  assert.equal(postBodies.length,2);assert.equal(postBodies[0],postBodies[1]);assert.match(JSON.parse(postBodies[0]).requestKey,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  checks.push('UUID retry survives page changes; success opens History details automatically');
  await click('View run #42');await textIncludes('Request is terminal');
  await click('Open algorithm benchmark');await expectRoute('/admin/benchmark','Algorithm Benchmark');await textIncludes('backend reports MATCH');
  assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b=>b.innerText==='Show patterns')"),false);
  const beforePolicyWrites=state.calls.filter(x=>x.method==='PUT').length;
  await click('Review EFIM as active algorithm');await expectRoute('/admin/setup','Algorithm Configuration');await textIncludes('Benchmark choice: EFIM');
  assert.equal(state.calls.filter(x=>x.method==='PUT').length,beforePolicyWrites);
  await click('Save mining configuration');await textIncludes('Configuration version 2');assert.equal(state.config.algorithm,'EFIM');
  checks.push('Benchmark is independent; active choice requires explicit Save');

  await click('Dashboard');await expectRoute('/admin/overview','Dashboard');await textIncludes('Recent mining requests');
  assert.equal(await evaluate("document.querySelectorAll('main form,main input').length"),0);
  await textIncludes('Open request #17');await click('Open request #17');await expectRoute('/admin/mining/history','Mining History');await textIncludes('Algorithm runs');
  state.slowHistory=true;await click('Refresh history');await textIncludes('Refresh history');
  await click('Store B #2');await textIncludes('No mining requests were returned');
  state.mismatchStore2=true;await click('Refresh history');await textIncludes('invalid or mismatched page');state.mismatchStore2=false;
  await click('Algorithm Configuration');assert.equal(await evaluate("new URLSearchParams(location.search).get('storeId')"),'2');
  await click('Run Mining');await expectRoute('/admin/mining/run','Run Mining');await textIncludes('No READY snapshots found');
  assert.equal(await evaluate("document.querySelector('main button[type=submit]').disabled"),true);
  await click('Store A #1');await textIncludes('Snapshot #2');
  await evaluate("document.querySelector('input[name=snapshotId]').click()");
  await evaluate("document.querySelector('input[aria-label=\"Compare both algorithms\"]').click()");
  await click('Run Mining');await expectRoute('/admin/mining/history','Mining History');await textIncludes('Algorithm runs');
  assert.equal(postBodies.length,3);assert.equal(JSON.parse(postBodies[2]).compareAlgorithms,false);
  assert.notEqual(JSON.parse(postBodies[2]).requestKey,JSON.parse(postBodies[0]).requestKey);
  checks.push('Store persists across menus, foreign rows rejected, empty snapshots block submit, new intent has new UUID');

  await click('Lambda Policy');await expectRoute('/admin/lambda-policy','Lambda Policy');await textIncludes('Global Lambda Policy');
  assert.ok(state.calls.some(x=>x.path==='/api/system/utility/lambda-policy'));
  assert.equal(state.calls.some(x=>x.path==='/api/utility/config'),false);
  await click('Users & Roles');await expectRoute('/admin/users','Users & Roles');
  await until("document.querySelector('main').innerText.length>20",'Users page');
  await click('Dashboard');await expectRoute('/admin/overview','Dashboard');
  assert.equal(await evaluate("new URLSearchParams(location.search).get('storeId')"),'1');
  assert.equal(await evaluate("document.querySelector('nav[aria-label=\"Main Navigation\"]').innerText.includes('API Connections')"),false);
  checks.push('Lambda uses authorized policy API; Users unchanged; no API Connections menu');

  for(const role of ['Merchandiser','Store Admin']){
    state.requestReads=5;
    const before=state.calls.length;
    await session(role,'/mining?view=history',true);await textIncludes('Read-only access');
    await textIncludes('View request #17');await click('View request #17');await textIncludes('Algorithm runs');await click('View run #42');await click('Show patterns');await textIncludes('Not measured');
    assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b=>['Run Mining','Show benchmark'].includes(b.innerText))"),false);
    assert.ok(state.calls.slice(before).every(x=>x.method==='GET'&&x.path.startsWith('/api/mining/')));
  }
  checks.push('Merchandiser and Store Admin keep read-only F05; legacy drafts never replay');
  const beforeCustomer=state.calls.length;await session('End-Customer');await textIncludes('Access Restricted');assert.equal(state.calls.length,beforeCustomer);
  checks.push('Customer blocked without API reads');
  await session('System Admin','/admin/api-connections');await expectRoute('/admin/overview','Dashboard');
  assert.equal(state.calls.some(x=>/connection/i.test(x.path)),false);
  await session('System Admin','/admin/benchmark?storeId=1&requestId=17&runId=42');await textIncludes('backend reports MATCH');
  await expectRoute('/admin/benchmark','Algorithm Benchmark');
  await click('Run Mining');await click('Algorithm Configuration');
  await evaluate('history.back()');await expectRoute('/admin/mining/run','Run Mining');
  await evaluate('history.forward()');await expectRoute('/admin/setup','Algorithm Configuration');
  checks.push('forbidden deep link redirects; refresh, back/forward and active sidebar agree');
  // A benchmark choice must survive the first delayed policy response.
  state.config={...configuration,version:2};state.holdConfig=true;
  await session('System Admin','/admin/benchmark?storeId=1&requestId=17&runId=42');
  await textIncludes('backend reports MATCH');
  await click('Review EFIM as active algorithm');await textIncludes('Benchmark choice: EFIM');
  state.holdConfig=false;await textIncludes('Configuration version 2');
  assert.equal(await evaluate("document.querySelector('select[aria-label=\"Active algorithm\"]').value"),'EFIM','Delayed policy must preserve the benchmark choice');
  await click('Save mining configuration');await textIncludes('Configuration version 3');
  assert.equal(state.config.algorithm,'EFIM');
  await evaluate("(()=>{const e=document.querySelector('select[aria-label=\"Active algorithm\"]');e.value='HUI_MINER';e.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await click('Save mining configuration');await textIncludes('Configuration version 4');
  assert.equal(state.config.algorithm,'HUI_MINER');
  await click('Refresh configuration');await textIncludes('Configuration version 4');
  assert.equal(await evaluate("document.querySelector('select[aria-label=\"Active algorithm\"]').value"),'HUI_MINER','A consumed benchmark choice must not override a later save or refresh');
  checks.push('benchmark choice survives delayed configuration and requires explicit save');

  await evaluate("document.querySelector('button[aria-label=\"Account menu\"]').click()");await click('Sign out');await textIncludes('Sign in to the system');
  checks.push('Logout returns Login');

  assert.deepEqual(unexpected,[]);assert.deepEqual(browserErrors,[]);
  assert.ok(state.calls.filter(x=>x.method!=='GET').every(x=>x.path==='/api/system/mining/config'||x.path==='/api/system/mining/requests'));
  console.log(JSON.stringify({result:'PASS (test-only HTTP fixtures)',checks,interceptedApiCalls:state.calls.length,manualPosts:postBodies.length,realBackendWrites:0},null,2));
}catch(e){
  console.log(JSON.stringify({result:'FAIL',error:e.message,browserErrors,unexpected,checks},null,2));
  process.exitCode=1;
}finally{
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
