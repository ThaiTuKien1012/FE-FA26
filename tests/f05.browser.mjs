// Run only via: npx.cmd --no-install tsx tests/f05.browser.mjs
// A temporary Chrome profile and CDP intercept ALL /api requests before navigation.
// No real API request is forwarded; fake writes exist only in this test process.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname, basename } from 'node:path';
import { user, payload, configuration, snapshot, requestFixture, runFixture, benchmarkFixture } from './f05.fixtures.ts';

const origin='http://127.0.0.1:3000';
const chrome=process.env.F05_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base=resolve(tmpdir()), profile=mkdtempSync(join(base,'paspm-f05-sync-test-'));
const processChrome=spawn(chrome,['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-sync','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let cdp, initId, postBodies=[], unexpected=[], browserErrors=[];
const sampleUsers=[
 {userId:1,name:'Administrator Fixture',email:'admin@example.invalid',roleCode:'SYSTEM_ADMIN',status:'ACTIVE',emailVerified:true,storeId:null,avatarUrl:'/api/users/1/avatar'},
 {userId:5,name:'Merchandiser Fixture',email:'merch@example.invalid',roleCode:'MERCHANDISER',status:'INACTIVE',emailVerified:true,storeId:1,avatarUrl:'/api/users/5/avatar'},
 {userId:6,name:'Store Staff',email:'store@example.invalid',roleCode:'STORE_ADMIN',status:'ACTIVE',emailVerified:true,storeId:1,avatarUrl:'/unavailable-avatar.png'},
 {userId:7,name:'Customer Fixture',email:'customer@example.invalid',roleCode:'END_CUSTOMER',status:'PENDING_VERIFICATION',emailVerified:false,storeId:null,avatarUrl:null}
];
const state={users:sampleUsers.map(x=>({...x})),usersError:false,userSaveError:false,userRoleError:false,activationBlocked:false,holdAccountWrites:false,missingRuntime:false,policy:{lambdaMin:0,lambdaMax:0.5,version:1},config:{version:0,algorithm:null,minUtilMode:null,minUtilValue:null,changedBy:null,changedAt:null},conflict:false,hasRequest:false,failPost:true,compare:true,requestReads:0,mismatchStore2:false,slowHistory:false,holdConfig:false,calls:[]};
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
const visibleText="([...document.querySelectorAll('main,header,section,[role=alert],[role=status]')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>e.innerText).join(' ').replace(/\\s+/g,' '))";
async function textIncludes(text){await until(visibleText+'.toLowerCase().includes('+JSON.stringify(text.toLowerCase())+')',text);}
async function click(text){
  await until("[...document.querySelectorAll('button')].some(b=>b.getClientRects().length&&!b.disabled&&b.innerText.replace(/\\s+/g,' ').trim()==="+JSON.stringify(text)+")",'Clickable button '+text);
  const ok=await evaluate("(()=>{const b=[...document.querySelectorAll('button')].sort((a,b)=>Number(Boolean(b.closest('main')))-Number(Boolean(a.closest('main')))).find(b=>b.getClientRects().length&&b.innerText.replace(/\\s+/g,' ').trim()==="+JSON.stringify(text)+");if(!b||b.disabled)return false;b.click();return true;})()");
  assert.equal(ok,true,'Clickable button: '+text);
}
async function input(label,value){
  assert.equal(await evaluate("(()=>{const e=document.querySelector('input[aria-label="+JSON.stringify(label)+"]');if(!e||e.disabled)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,"+JSON.stringify(value)+");e.dispatchEvent(new Event('input',{bubbles:true}));return true;})()"),true,'Input '+label);
}
async function session(role,url='/mining',legacy=false){
  if(initId)await cdp.call('Page.removeScriptToEvaluateOnNewDocument',{identifier:initId});
  const actor=role?{...user,role,id:role==='System Admin'?'1':user.id}:null;
  const code="localStorage.clear();sessionStorage.clear();"+(actor?
    "localStorage.setItem('retailspace_auth_user',"+JSON.stringify(JSON.stringify(actor))+");localStorage.setItem('retailspace_auth_token','browser-test-only-token');":"")+
    (legacy?"sessionStorage.setItem('paspm:f05:pending:"+encodeURIComponent(user.id)+"',"+JSON.stringify(JSON.stringify({requestKey:payload.requestKey,snapshotId:2,algorithms:['EFIM'],minUtilValue:30}))+");":"");
  initId=(await cdp.call('Page.addScriptToEvaluateOnNewDocument',{source:"try{"+code+"}catch{}"})).identifier;
  await cdp.call('Page.navigate',{url:origin+url});
}
function responsePage(items,query){return {items,page:Number(query.get('page')||0),pageSize:Number(query.get('pageSize')||20),totalElements:items.length};}
async function paused({requestId,request}){
  const url=new URL(request.url),path=url.pathname,method=request.method;
  state.calls.push({method,path,search:url.search,body:request.postData??null});
  let body,code=200;
  try {
    if(path==='/api/users'){
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
      if(method==='PUT'){const sent=JSON.parse(request.postData);assert.deepEqual(Object.keys(sent).sort(),['lambdaMax','lambdaMin']);state.policy={...sent,version:state.policy.version+1};}body=state.policy;
    }
    else if(path==='/api/utility/config')body={config:{...snapshot().configuration.config,alpha:0.5,beta:0.2,gamma:0.3},lambdaPolicy:state.policy,lambdaValid:true};
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
      if(path.endsWith('/snapshots'))body=responsePage(storeId===1?[{...snapshot(),totalWeightedUtility:898000}]:[],url.searchParams);
      else if(/\/requests$/.test(path)){
        if(state.slowHistory&&storeId===1)await sleep(500);
        body=responsePage((storeId===1||state.mismatchStore2)&&state.hasRequest?[requestFixture('COMPLETED')]:[],url.searchParams);
      }else if(/\/requests\/17$/.test(path)){
        state.requestReads++;
        body={...requestFixture(state.requestReads<2?'PENDING':state.requestReads<3?'RUNNING':'COMPLETED'),algorithms:state.compare?['HUI_MINER','EFIM']:[state.config.algorithm],comparisonStatus:state.compare?(state.requestReads<3?'PENDING':'MATCH'):'NOT_REQUESTED'};
      }else if(path.endsWith('/requests/17/runs')){
        const status=state.requestReads<3?'RUNNING':'COMPLETED';
        body=state.compare?[runFixture(status),{...runFixture(status),runId:43,algorithm:'EFIM'}]:[{...runFixture(status),algorithm:state.config.algorithm}];
      }else if(/\/runs\/(42|43)\/benchmark$/.test(path)){body=benchmarkFixture(path.includes('/43/')?'EFIM':state.compare?'HUI_MINER':state.config.algorithm);body.run.runId=Number(path.match(/\/runs\/(\d+)/)[1]);body.run.runtimeMillis=state.missingRuntime?null:body.run.algorithm==='EFIM'?242:289;body.run.memoryMiB=11.135678;body.run.patternCount=25;body.comparisonStatus=state.compare?'MATCH':'NOT_REQUESTED';}
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
const artifactDirectory=mkdtempSync(join(base,'paspm-f05-redesign-preview-'));
async function capture(name){await sleep(100);const shot=await cdp.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:!(/^(add-account|edit-)/.test(name))});writeFileSync(join(artifactDirectory,name+'.png'),Buffer.from(shot.data,'base64'));}
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


  await session(null,'/admin/lambda-policy');await textIncludes('Sign in to the system');await session(null);await textIncludes('Sign in to the system');checks.push('guest direct routes return Login');
  state.holdConfig=true;await session('System Admin');await textIncludes('Loading...');
  state.holdConfig=false;await expectRoute('/admin/overview','Dashboard');await textIncludes('No global mining configuration');
  assert.equal(await evaluate("document.querySelectorAll('main form,main input').length"),0);
  assert.equal(await evaluate("Boolean(document.querySelector('nav[aria-label=Breadcrumb]'))"),false);
  assert.equal(await evaluate("(()=>{const a=document.getElementById('dashboard-global-config'),b=document.getElementById('mining-stores-title');return Boolean(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING);})()"),true);
  await click('Algorithm Configuration');await textIncludes('Configuration Version 0');
  for(const invalid of ['0','101','0.1234567','9007199254740993']){
    await input('Minimum Utility Threshold',invalid);await click('Save Configuration');
    await until("document.querySelector('main [role=alert]')!==null",'invalid minimum utility');
  }
  assert.equal(state.calls.filter(x=>x.method==='PUT').length,0);
  await input('Minimum Utility Threshold','0.5');await click('Save Configuration');await textIncludes('Configuration version 1 saved');
  const savedWrites=state.calls.filter(x=>x.method==='PUT').length;
  assert.equal(await evaluate("document.querySelector('main button[type=submit]').disabled"),true);
  await input('Minimum Utility Threshold','1');await sleep(150);
  assert.equal(state.calls.filter(x=>x.method==='PUT').length,savedWrites);
  await click('Reset Changes');assert.equal(await evaluate("document.querySelector('input[aria-label=\"Minimum Utility Threshold\"]').value"),'0.5');
  state.conflict=true;await input('Minimum Utility Threshold','1');await click('Save Configuration');await textIncludes('HTTP 409');
  const configReads=state.calls.filter(x=>x.path==='/api/system/mining/config'&&x.method==='GET').length;
  await sleep(250);assert.equal(state.calls.filter(x=>x.path==='/api/system/mining/config'&&x.method==='GET').length,configReads);
  assert.equal(await evaluate("document.querySelector('main button[type=submit]').disabled"),true);
  await click('Refresh configuration');await textIncludes('Configuration Version 1');
  checks.push('global configuration loading/version zero, string validation, no-op Save, draft Reset and 409 manual recovery');

  await click('Run Mining');await expectRoute('/admin/mining/run','Run Mining');await textIncludes('Select a snapshot to continue.');
  await textIncludes('Store A');await click('Store A #1');await textIncludes('Available Snapshots');await textIncludes('898,000');
  assert.equal(await evaluate("document.querySelector('article details')?.textContent.includes('Scoring Version: v1.2')"),true);
  await evaluate("document.querySelector('input[name=snapshotId]').click()");
  await evaluate("(()=>{const e=document.querySelector('input[aria-label=\"Compare HUI-Miner and EFIM\"]');if(!e.checked)e.click();})()");
  await evaluate("(()=>{const b=[...document.querySelectorAll('main button')].find(b=>b.innerText.replace(/\\s+/g,' ').trim()==='Run Mining');b.click();b.click();})()");
  await textIncludes('Could not connect to the mining service');assert.equal(postBodies.length,1);
  assert.equal(await evaluate("[...document.querySelectorAll('[aria-label=\"Store selection\"] button')].every(b=>b.disabled)"),true);
  await click('Mining History');await expectRoute('/admin/mining/history','Mining History');await click('Run Mining');
  await click('Retry same submission');await expectRoute('/admin/mining/history','Mining History');await textIncludes('Algorithm Runs');
  assert.equal(postBodies.length,2);assert.equal(postBodies[0],postBodies[1]);
  assert.equal(JSON.parse(postBodies[0]).compareAlgorithms,true);
  assert.match(JSON.parse(postBodies[0]).requestKey,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  checks.push('snapshot selection, locked pending submission, double click and byte-for-byte UUID retry preserved');

  await click('View run #42');await click('Open algorithm benchmark');await expectRoute('/admin/benchmark','Algorithm Benchmark');
  await textIncludes('EFIM completed 47 ms faster in this test');await textIncludes('11.14 MiB');
  assert.equal(await evaluate("[...document.querySelectorAll('main button')].some(b=>/Review .*as active|Choose Default|Set Active|Apply Algorithm|Auto Select|Run #4[23]/.test(b.innerText))"),false);
  assert.equal(await evaluate("document.querySelectorAll('main details').length"),1);
  const writesBeforeBenchmark=state.calls.filter(x=>x.method!=='GET').length;
  await click('Refresh comparison');await textIncludes('EFIM completed 47 ms faster in this test');
  assert.equal(state.calls.filter(x=>x.method!=='GET').length,writesBeforeBenchmark);
  await capture('benchmark-desktop');
  state.missingRuntime=true;await click('Refresh comparison');await textIncludes('Not measured');
  assert.equal(await evaluate(visibleText+".includes('47 ms faster')"),false);
  state.missingRuntime=false;await click('Refresh comparison');await textIncludes('47 ms faster');
  await session('System Admin','/admin/benchmark?storeId=1&requestId=17&runId=999');await textIncludes('This run does not belong');
  await session('System Admin','/admin/benchmark?storeId=1&requestId=17&runId=43');await textIncludes('47 ms faster');
  checks.push('Benchmark is read-only; compatible per-test summary, nullable metrics and run deep links checked');

  await click('Algorithm Configuration');await textIncludes('Current System Configuration');
  await select('Default Algorithm','EFIM');await click('Save Configuration');await textIncludes('Configuration version 2 saved');
  assert.equal(state.config.algorithm,'EFIM');
  await click('Dashboard');await click('Store A #1');await textIncludes('Recent Mining Activity');
  const globalBefore=JSON.stringify(state.config);
  await click('Store B #2');await textIncludes('This store has no mining requests yet');
  assert.equal(JSON.stringify(state.config),globalBefore);
  state.mismatchStore2=true;await click('Refresh dashboard');await textIncludes('invalid or mismatched page');state.mismatchStore2=false;
  await click('Run Mining');await textIncludes('No READY snapshots found');
  assert.equal(await evaluate("document.querySelector('main button[type=submit]').disabled"),true);
  await click('Store A #1');await textIncludes('Snapshot #2');await evaluate("document.querySelector('input[name=snapshotId]').click()");
  await evaluate("(()=>{const e=document.querySelector('input[aria-label=\"Compare HUI-Miner and EFIM\"]');if(e.checked)e.click();})()");
  await click('Run Mining');await expectRoute('/admin/mining/history','Mining History');await textIncludes('Algorithm Runs');
  assert.equal(postBodies.length,3);assert.equal(JSON.parse(postBodies[2]).compareAlgorithms,false);
  assert.notEqual(JSON.parse(postBodies[2]).requestKey,JSON.parse(postBodies[0]).requestKey);
  await click('View run #42');await click('Open algorithm benchmark');await textIncludes('This request used one algorithm');
  assert.equal(await evaluate(visibleText+".includes('ms faster')"),false);
  checks.push('Store switching keeps global settings; foreign data rejected; empty snapshot disabled; single algorithm remains supported');

  await click('Lambda Policy');await textIncludes('Current Lambda Range');await textIncludes('Before saving');
  assert.ok(state.calls.some(x=>x.path==='/api/system/utility/lambda-policy'));
  await input('Maximum Lambda','0.7');await click('Save Policy');await textIncludes('Lambda policy updated');
  assert.deepEqual(state.policy,{lambdaMin:0,lambdaMax:0.7,version:2});
  assert.equal(state.calls.some(x=>x.path==='/api/utility/config'),false);
  await capture('lambda-desktop');
  checks.push('Lambda global range, helper text, warning and existing GET/PUT contract preserved');

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
    ['/admin/overview?storeId=1','Recent Mining Activity','dashboard'],
    ['/admin/setup?storeId=1','Update Configuration','configuration'],
    ['/admin/mining/run?storeId=1','Available Snapshots','run'],
    ['/admin/mining/history?storeId=1&requestId=17','Algorithm Runs','history'],
    ['/admin/benchmark?storeId=1&requestId=17&runId=42','47 ms faster','benchmark'],
    ['/admin/users','User Management','users'],
    ['/admin/lambda-policy','Current Lambda Range','lambda']
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
        assert.equal(await evaluate("document.querySelector('[data-account-statistics]').lastElementChild.innerText.includes('not system-wide totals')"),true);
      }
      if(width===390||width===1440)await capture(name+'-'+width);
      if(width<768)assert.equal(await evaluate("document.querySelector('aside').getBoundingClientRect().height<innerHeight/2"),true,'Mobile navigation must leave content accessible');
    }
  }
  await cdp.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  checks.push('all seven System Admin pages: desktop/tablet/mobile overflow, one heading and no breadcrumbs');

  for(const role of ['Merchandiser','Store Admin']){
    state.requestReads=5;const before=state.calls.length;
    await session(role,'/mining?view=history',true);await textIncludes('Read-only access');
    await click('View request #17');await textIncludes('Algorithm runs');await click('View run #42');await click('Show patterns');await textIncludes('Not measured');
    assert.ok(state.calls.slice(before).every(x=>x.method==='GET'&&x.path.startsWith('/api/mining/')));
    assert.equal(await evaluate("Boolean(document.querySelector('nav[aria-label=Breadcrumb]'))"),true);
  }
  await session('Merchandiser','/f03/configuration');await textIncludes('Save Configuration');
  assert.equal(await evaluate("[...document.querySelectorAll('main button')].find(b=>b.innerText.includes('Save Configuration')).disabled"),false);
  const beforeCustomer=state.calls.length;await session('End-Customer');await textIncludes('Access Restricted');assert.equal(state.calls.length,beforeCustomer);
  await session('Store Admin','/admin/setup');await textIncludes('Access Restricted');
  await session('System Admin','/admin/api-connections');await expectRoute('/admin/overview','Dashboard');
  assert.equal(state.calls.some(x=>/connection/i.test(x.path)),false);
  await click('Run Mining');await click('Algorithm Configuration');await evaluate('history.back()');await expectRoute('/admin/mining/run','Run Mining');await evaluate('history.forward()');await expectRoute('/admin/setup','Algorithm Configuration');
  await evaluate("document.querySelector('button[aria-label=\"Account menu\"]').click()");await click('Sign out');await textIncludes('Sign in to the system');
  checks.push('Store/Merch read-only F05, Merch F03 permissions, Customer/admin isolation, back/forward and Logout preserved');

  assert.deepEqual(unexpected,[]);assert.deepEqual(browserErrors,[]);
  assert.ok(state.calls.filter(x=>x.method!=='GET').every(x=>x.path==='/api/system/mining/config'||x.path==='/api/system/mining/requests'||x.path==='/api/system/utility/lambda-policy'||/^\/api\/users(?:\/\d+(?:\/role|\/status)?)?$/.test(x.path)));
  console.log(JSON.stringify({result:'PASS (test-only HTTP fixtures)',checks,interceptedApiCalls:state.calls.length,manualPosts:postBodies.length,realBackendWrites:0,artifactDirectory},null,2));
}catch(e){
  try{await capture('failure');}catch{}
  console.log(JSON.stringify({result:'FAIL',error:e.message,browserErrors,unexpected,checks,artifactDirectory},null,2));
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
