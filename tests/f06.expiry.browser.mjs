// Fixture-only F06 retail rules/expiry browser coverage. No screenshots, reports or real API writes.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {requestFixture,runFixture} from './f05.fixtures.ts';
import {policy,recommendation,eligibility} from './f06.fixtures.ts';
const origin=process.env.PASPM_TEST_ORIGIN||'http://127.0.0.1:3102',base=resolve(tmpdir()),profile=mkdtempSync(join(base,'paspm-f06-expiry-browser-'));
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-sync','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
class CDP{
  id=0;pending=new Map();listeners=new Map();
  constructor(ws){this.ws=ws;ws.addEventListener('message',event=>{const value=JSON.parse(event.data);if(value.id){const job=this.pending.get(value.id);if(job){this.pending.delete(value.id);value.error?job.reject(Error(value.error.message)):job.resolve(value.result);}}else for(const listener of this.listeners.get(value.method)||[])void listener(value.params);});}
  call(method,params={}){return new Promise((resolve,reject)=>{const id=++this.id,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('CDP timeout '+method));},15000);this.pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});this.ws.send(JSON.stringify({id,method,params}));});}
  on(method,listener){this.listeners.set(method,[...this.listeners.get(method)||[],listener]);}
  async evaluate(expression){const value=await this.call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(value.exceptionDetails)throw Error(value.exceptionDetails.exception?.description||value.exceptionDetails.text);return value.result.value;}
}
let page,closing=false;const calls=[],errors=[],unexpected=[],checks=[];
const state={role:'MERCHANDISER',storeId:1,expiry:'due',empty:false,config:{...policy},configMode:'normal',review:'PENDING_REVIEW',version:1,holdSummary:false,holdProduct:0,holdConfig:false,namesFail:false};
const media='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9WQAAAAASUVORK5CYII=';
const products=[{id:31,name:'Fresh Milk',sku:'MILK-31',imageUrl:'/api/products/31/image'},{id:32,name:'Butter Cookies',sku:'COOKIE-32'},{id:33,name:'Plain Yogurt',sku:'YOG-33'},{id:44,name:'Orange Juice',sku:'JUICE-44'},...Array.from({length:44},(_,i)=>({id:2000+i,name:'Catalog product '+String(i).padStart(2,'0'),sku:'CAT-'+i}))];
const due=(productId,batchId,pushDay,expiryDate,remainingQuantity)=>({productId,batchId,pushDay,expiryDate,daysToPush:pushDay==='2026-11-17'?-9:pushDay==='2026-11-26'?0:-1,remainingQuantity,pushRequired:true,checkedAt:'2026-11-25T17:00:00Z',warnings:[]});
const rows=[due(31,101,'2026-11-17','2026-11-29',24),...Array.from({length:62},(_,i)=>due(44,200+i,'2026-11-25','2026-12-01',4)),due(33,399,'2026-11-25','2026-11-26',5),due(31,102,'2026-11-26','2026-11-27',1)];
const missing='Product 32: batches [555] have no push day';
const item=()=>recommendation({storeId:state.storeId,reviewStatus:state.review,version:state.version,readyForConsumption:false,reviewReason:state.review==='APPROVED'?'Considered the current batch information.':null,productIds:[31,32,33],currentEligibility:{...eligibility(),products:[31,32,33].map(productId=>({...eligibility().products[0],productId,expiryPriorityScore:productId===32?0.9:0,sellableQuantity:777}))}});
async function fixture({requestId,request}){
  const url=new URL(request.url),path=url.pathname;
  if(path.startsWith('/videos/'))return page.call('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'});
  if(!path.startsWith('/api/'))return page.call(url.origin===origin?'Fetch.continueRequest':'Fetch.failRequest',{requestId,...(url.origin===origin?{}:{errorReason:'BlockedByClient'})});
  const capturedStore=state.storeId;calls.push({path,method:request.method,query:url.search,storeId:capturedStore,payload:request.postData?JSON.parse(request.postData):null});let body,code=200,contentType='application/json',binary=false;
  if(path==='/api/auth/login')body={accessToken:'expiry-fixture',expiresIn:3600,tokenType:'Bearer',csrfToken:'fixture-csrf'};
  else if(path==='/api/auth/me')body={userId:12,name:'Expiry Fixture',email:'fixture@example.invalid',roleCode:state.role,storeId:state.storeId,status:'ACTIVE',emailVerified:true};
  else if(path==='/api/recommendations/config'){
    if(request.method==='PUT'){
      while(state.holdConfig&&!closing)await sleep(20);
      assert.equal(state.role,'STORE_ADMIN');const payload=JSON.parse(request.postData);assert.equal(payload.expectedVersion,state.config.version);assert.deepEqual(Object.keys(payload).sort(),['expectedVersion','maxBundleSize','minConfidence','minSupportCount','minSupportRatio','minimumSellableQuantity']);assert.ok(Object.values(payload).every(value=>typeof value==='number'));
      if(state.configMode==='conflict'){state.config={...state.config,version:state.config.version+1,maxBundleSize:6};code=409;body={error:'Rule configuration version changed'};}
      else{state.config={...state.config,...payload,version:state.config.version+1};if(state.configMode==='lost')return page.call('Fetch.failRequest',{requestId,errorReason:'Failed'});body=state.config;}
    }else body=state.config;
  }else if(path==='/api/recommendations/expiry-push'){
    assert.equal(request.method,'GET');for(const key of url.searchParams.keys())assert.ok(['productId','page','pageSize'].includes(key));
    const productId=url.searchParams.has('productId')?Number(url.searchParams.get('productId')):undefined,p=Number(url.searchParams.get('page')||0),size=Number(url.searchParams.get('pageSize')||20);
    const source=capturedStore===2?[due(131,800,'2026-11-26','2026-11-29',2)]:rows;
    const filtered=(state.expiry==='zero'||state.expiry==='missing'?[]:source).filter(row=>productId===undefined||row.productId===productId);
    body={items:filtered.slice(p*size,(p+1)*size),page:p,pageSize:size,totalElements:filtered.length,asOfDate:'2026-11-26',timeZone:'Asia/Ho_Chi_Minh',checkedAt:'2026-11-25T17:00:00Z',warnings:capturedStore===1&&state.expiry!=='zero'&&(productId===undefined||productId===32)?[missing]:[]};
    while(!closing&&((state.holdSummary&&productId===undefined)||(state.holdProduct===productId)))await sleep(20);
    if(state.expiry==='error'){code=503;body={error:'Expiry data temporarily unavailable'};}
  }else if(path==='/api/products'){
    assert.equal(request.method,'GET');const query=(url.searchParams.get('search')||'').toLowerCase(),p=Number(url.searchParams.get('page')||0),size=Number(url.searchParams.get('pageSize')||20);
    const found=products.filter(product=>product.name.toLowerCase().includes(query)||product.sku.toLowerCase().includes(query));
    body={content:found.slice(p*size,(p+1)*size),page:p,pageSize:size,totalElements:found.length,totalPages:Math.ceil(found.length/size)};
  }else if(/^\/api\/products\/\d+\/image$/.test(path)){body=media;binary=true;contentType='image/png';}
  else if(/^\/api\/products\/\d+$/.test(path)){const id=Number(path.split('/').at(-1));body=products.find(product=>product.id===id)??{id,name:'Store 2 product'};if(state.namesFail){code=404;body={error:'Product unavailable'};}}
  else if(path==='/api/mining/requests')body={items:[],page:0,pageSize:20,totalElements:0};
  else if(path==='/api/mining/runs/42')body=runFixture('COMPLETED',state.storeId);
  else if(path==='/api/mining/requests/17')body=requestFixture('COMPLETED',state.storeId);
  else if(path==='/api/recommendations'){
    assert.equal(url.searchParams.get('miningRunId'),'42');const p=Number(url.searchParams.get('page')||0),size=Number(url.searchParams.get('pageSize')||20),type=url.searchParams.get('type'),status=url.searchParams.get('reviewStatus');
    const matches=!state.empty&&(!type||type==='BUNDLE')&&(!status||status===state.review);body={items:matches?[item()]:[],page:p,pageSize:size,totalElements:matches?1:0,ordering:'RANKED_WITHIN_SOURCE_RUN'};
  }else if(path==='/api/recommendations/62')body=item();
  else if(path==='/api/recommendations/62/approve'){
    assert.equal(state.role,'MERCHANDISER');const payload=JSON.parse(request.postData);assert.deepEqual(payload,{expectedVersion:state.version,reason:'Considered the current batch information.'});state.review='APPROVED';state.version++;body=item();
  }else if(path==='/api/categories'||path==='/api/system/stores')body=[];
  else if(path==='/api/system/mining/config')body={version:0,algorithm:null,minUtilMode:null,minUtilValue:null,changedBy:null,changedAt:null};
  else if(path==='/api/utility/config')body={config:{enableStock:true,enableExpiry:true,enableSeason:true,alpha:1,beta:1,gamma:1,lambda:0.1,expiryWindowDays:null,version:1,scoringVersion:'v1.2'},lambdaPolicy:{lambdaMin:0,lambdaMax:0.5,version:1},lambdaValid:true};
  else{unexpected.push(path);code=500;body={error:'Unexpected fixture API'};}
  return page.call('Fetch.fulfillRequest',{requestId,responseCode:code,responseHeaders:[{name:'Content-Type',value:contentType}],body:binary?body:Buffer.from(JSON.stringify(body)).toString('base64')});
}
async function until(expression,label=expression){for(let i=0;i<200;i++){if(await page.evaluate(expression))return;await sleep(40);}throw Error('UI timeout: '+label);}
const has=text=>until('document.body.innerText.includes('+JSON.stringify(text)+')||[...document.querySelectorAll(".f02-page-position")].some(el=>el.textContent==='+JSON.stringify(text)+')',text);
async function click(text){await until('[...document.querySelectorAll("button")].some(el=>el.textContent.trim()==='+JSON.stringify(text)+'&&!el.disabled&&!el.closest("[hidden]"))','button '+text);assert.equal(await page.evaluate('(()=>{const button=[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==='+JSON.stringify(text)+'&&!el.closest("[hidden]"));if(!button||button.disabled)return false;button.focus();button.click();return true;})()'),true);}
async function input(selector,value){await page.evaluate('(()=>{const node=document.querySelector('+JSON.stringify(selector)+');node.focus();Object.getOwnPropertyDescriptor(node.tagName==="SELECT"?HTMLSelectElement.prototype:node.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,"value").set.call(node,'+JSON.stringify(value)+');node.dispatchEvent(new Event(node.tagName==="SELECT"?"change":"input",{bubbles:true}));})()');}
async function key(value,modifiers=0){for(const type of ['keyDown','keyUp'])await page.call('Input.dispatchKeyEvent',{type,key:value,windowsVirtualKeyCode:{Tab:9,Escape:27,ArrowDown:40,Enter:13}[value]||0,modifiers});}
async function navigate(path){await page.evaluate('history.pushState({},"",'+JSON.stringify(path)+');dispatchEvent(new PopStateEvent("popstate"))');}
async function login(role='MERCHANDISER',storeId=1,runId=null){state.role=role;state.storeId=storeId;await page.evaluate('(async()=>{const {authService}=await import("/src/services/authService.ts");authService.endLocal();await authService.authenticate("/api/auth/login",{email:"fixture@example.invalid",password:"fixture-only"});})()');await navigate('/recommendations'+(runId===null?'':'?miningRunId='+runId));await has('Recommendations');}
async function close(title){const selector='button[aria-label="Close '+title+'"]';await page.evaluate('document.querySelector('+JSON.stringify(selector)+').click()');await until('!document.querySelector('+JSON.stringify(selector)+')','Closed '+title);}
const writes=()=>calls.filter(call=>!['GET','HEAD'].includes(call.method)&&!call.path.startsWith('/api/auth/'));
try{
  for(let i=0;!existsSync(join(profile,'DevToolsActivePort'))&&i<150;i++)await sleep(100);
  const port=readFileSync(join(profile,'DevToolsActivePort'),'utf8').split(/\r?\n/)[0],targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json(),ws=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
  await new Promise((done,reject)=>{ws.addEventListener('open',done,{once:true});ws.addEventListener('error',reject,{once:true});});page=new CDP(ws);
  page.on('Fetch.requestPaused',request=>fixture(request).catch(error=>{if(!closing&&!/Invalid InterceptionId/i.test(error.message))errors.push(error.message);}));page.on('Runtime.exceptionThrown',value=>errors.push(value.exceptionDetails.exception?.description||value.exceptionDetails.text));
  await page.call('Page.enable');await page.call('Runtime.enable');await page.call('Fetch.enable',{patterns:[{urlPattern:'*'}]});await page.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await page.call('Emulation.setTimezoneOverride',{timezoneId:'Pacific/Honolulu'});
  await page.call('Page.navigate',{url:origin+'/login'});await until('performance.getEntriesByType("resource").some(row=>new URL(row.name).pathname==="/src/services/authService.ts")','session module');
  await login();await has('65 batches have reached their Push Day');await has('Choose Analysis');
  assert.equal(await page.evaluate('[...document.querySelectorAll("summary")].some(el=>el.textContent==="Store tools")'),false);assert.equal(calls.some(call=>call.path==='/api/recommendations'),false);
  await click('Store Rules');await has('Managed by Store Admin');for(const text of ['4 products','2 transactions','5%','50%','1 unit'])await has(text);
  assert.equal(await page.evaluate('document.querySelector("dialog").querySelectorAll("input,button[type=submit]").length'),0);assert.equal(await page.evaluate('/Rules version|expectedVersion|F06_RULES/.test(document.querySelector("dialog").textContent)'),false);
  for(const width of [390,820,1440]){await page.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});assert.equal(await page.evaluate('(()=>{const dialog=document.querySelector("dialog"),header=dialog.querySelector("header").getBoundingClientRect(),footer=dialog.querySelector("footer").getBoundingClientRect();return dialog.scrollWidth<=innerWidth+1&&header.top>=0&&footer.bottom<=innerHeight;})()'),true,'Read-only rules remain readable with accessible actions');}
  await key('Escape');await until('!document.querySelector("dialog")','Rules Escape');assert.equal(await page.evaluate('document.activeElement.textContent.trim()'),'Store Rules');
  checks.push('Expiry count and Store Rules are available before analysis; no Store tools dropdown; Merchandiser has actual read-only values, no version dumps, Escape/focus restore');

  await click('View Expiry Alerts');await has('65 due batches');await has('Push Day overdue by 9 days');await has('3 days left');await has('24 units remaining');await has('Batch #101');
  assert.equal(await page.evaluate('["Push required","Days to Push","Asia/Ho_Chi_Minh"].some(text=>document.querySelector("dialog").innerText.includes(text))'),false);
  await click('Next alerts');await has('Page 2 of 4');assert.equal(new URLSearchParams(calls.filter(call=>call.path.endsWith('/expiry-push')).at(-1).query).get('page'),'1');
  await input('#f06-expiry-size','10');await has('Page 1 of 7');
  await page.evaluate('document.querySelector("dialog input[role=combobox]").click()');await has('Load more products');assert.equal(await page.evaluate('document.querySelectorAll("dialog [role=option]").length'),20);await click('Load more products');await until('document.querySelectorAll("dialog [role=option]").length===40','Paged catalog search');
  await input('dialog input[role=combobox]','Catalog product 43');await until('document.querySelectorAll("dialog [role=option]").length===1&&document.querySelector("dialog [role=option]").textContent.includes("Catalog product 43")','Server search beyond the loaded pages');
  await input('dialog input[role=combobox]','Milk');await until('document.querySelectorAll("dialog [role=option]").length===1&&document.querySelector("dialog [role=option]").textContent.includes("Fresh Milk")','Global product search by name');await key('ArrowDown');await key('Enter');await has('2 due batches for Fresh Milk');await has('Push Day is today');await has('1 day left');await has('1 unit remaining');
  assert.ok(calls.some(call=>call.path==='/api/products'&&new URLSearchParams(call.query).get('search')==='Milk'));assert.equal(new URLSearchParams(calls.filter(call=>call.path.endsWith('/expiry-push')).at(-1).query).get('productId'),'31');
  await page.evaluate('document.querySelector("dialog [aria-label=\\"Clear product filter\\"]").click()');await has('65 due batches');
  await page.evaluate('document.querySelector("dialog input[role=combobox]").click()');await input('dialog input[role=combobox]','Cookies');await until('document.querySelectorAll("dialog [role=option]").length===1','Cookies search');await page.evaluate('document.querySelector("dialog [role=option]").click()');await has('0 due batches for Butter Cookies');await has('Missing Push Day');
  await page.evaluate('[...document.querySelectorAll("dialog summary")].find(el=>el.textContent.includes("Missing Push Day")).click()');await has('Butter Cookies');await has('Batch #555');assert.equal(await page.evaluate('document.querySelector("dialog").innerText.includes("Product 32: batches [555] have no push day")'),false);
  for(const width of [320,390,820,1440]){await page.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1&&document.querySelector("dialog").scrollWidth<=innerWidth+1'),true);}
  await page.evaluate('[...document.querySelectorAll("dialog button")].at(-1).focus()');await key('Tab');assert.equal(await page.evaluate('document.querySelector("dialog").contains(document.activeElement)'),true);await close('Expiry Alerts');
  checks.push('Expiry modal: 65 authoritative batches, server ordering/pages, stock per batch, Store-local dates under Honolulu timezone, name search beyond one page, keyboard selection/clear, friendly missing Push Day, 320–1440px');

  await page.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await navigate('/recommendations?miningRunId=42');await has('1 matching recommendations');await until('document.querySelectorAll("[data-expiry-product]").length===2','Confirmed priorities including a product outside global page 1');
  const ids=await page.evaluate('[...document.querySelectorAll("[data-expiry-product]")].map(el=>el.dataset.expiryProduct)');assert.deepEqual(ids,['31','33']);assert.equal(ids.includes('32'),false,'Historical positive expiry score is not a due-batch alert');
  const summaryReads=calls.filter(call=>call.path.endsWith('/expiry-push')&&!new URLSearchParams(call.query).has('productId')&&new URLSearchParams(call.query).get('pageSize')==='1').length;
  await click('Banner');await has('No banner recommendations found');await click('Bundle');await has('1 matching recommendations');await until('document.querySelectorAll("[data-expiry-product]").length===2','Cached priority reused');assert.equal(calls.filter(call=>call.path.endsWith('/expiry-push')&&!new URLSearchParams(call.query).has('productId')&&new URLSearchParams(call.query).get('pageSize')==='1').length,summaryReads,'Changing recommendation type does not refetch Store expiry summary');
  await page.evaluate('document.querySelector("[data-candidate-id]").click()');await has('Selling Priority');await has('Batch #101: 3 days left; 24 units remaining.');await has('Batch #102: 1 day left; 1 unit remaining.');await has('Batch #399: Expires today; 5 units remaining.');
  assert.equal(await page.evaluate('document.querySelector("[aria-label=\\"Selling Priority\\"]").textContent.includes("777")'),false);assert.equal(await page.evaluate('document.querySelector("dialog").querySelectorAll("button").length>0&&document.querySelector("dialog").textContent.includes("Find Related Recommendations")'),false);await close('recommendation details');
  checks.push('Current expiry badges match exact product IDs, not historical scores or only the first global page; cards retain ranking/types; Details has multiple batch-specific quantities and dates without changing evidence or readiness');

  state.empty=true;await click('Refresh');await has('No Recommendations Yet');await has('65 batches have reached their Push Day');await click('View Expiry Alerts');await has('65 due batches');await close('Expiry Alerts');
  state.expiry='zero';await navigate('/recommendations');await page.evaluate('window.dispatchEvent(new Event("focus"))');await login();await has('Expiry Alerts (0)');assert.equal(await page.evaluate('!!document.querySelector("[data-expiry-notice]")'),false);
  state.expiry='missing';state.namesFail=true;await login();await has('Some batches need a Push Day');await click('Expiry Alerts');await has('Missing Push Day');await page.evaluate('[...document.querySelectorAll("dialog summary")].find(el=>el.textContent.includes("Missing Push Day")).click()');await has('Product #32');await has('Batch #555');await close('Expiry Alerts');state.namesFail=false;
  state.expiry='error';state.empty=false;await login('MERCHANDISER',1,42);await has('Expiry alerts unavailable');await has('1 matching recommendations');assert.equal(await page.evaluate('!!document.querySelector("[data-expiry-product]")'),false);
  const frozen=JSON.stringify({utility:item().utility,evidence:item().evidence,sources:item().sources});await page.evaluate('document.querySelector("[data-candidate-id]").click()');await has('Your decision');assert.equal(await page.evaluate('!!document.querySelector("[aria-label=\\"Selling Priority\\"]")'),false);await input('#f06-review-reason','Considered the current batch information.');await click('Approve');await click('Confirm Approval');await has('not currently ready for Layout');assert.equal(writes().filter(call=>call.path.endsWith('/approve')).length,1);assert.equal(JSON.stringify({utility:item().utility,evidence:item().evidence,sources:item().sources}),frozen);await close('recommendation details');
  checks.push('Expiry remains accessible with no analysis/no recommendations; zero vs missing vs unavailable stay distinct; optional failures do not block explicit review or alter frozen evidence/Backend readiness');

  state.expiry='due';await login('STORE_ADMIN');await has('65 batches have reached their Push Day');await click('Store Rules');await until('document.querySelectorAll("dialog input").length===5','Store Admin editable grouped fields');
  for(const width of [320,390,820,1440]){await page.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});assert.equal(await page.evaluate('(()=>{const dialog=document.querySelector("dialog"),box=dialog.getBoundingClientRect();return dialog.scrollWidth<=innerWidth+1&&[...dialog.querySelectorAll("input")].every(input=>{const r=input.getBoundingClientRect();return r.left>=box.left&&r.right<=box.right;})&&dialog.querySelector("footer").getBoundingClientRect().bottom<=innerHeight;})()'),true,'Editable rules fit desktop/mobile');}
  await input('#f06-rule-maxBundleSize','9');await key('Escape');await has('Discard unsaved changes?');await click('Keep Editing');assert.equal(await page.evaluate('document.getElementById("f06-rule-maxBundleSize").value'),'9');await key('Escape');await click('Discard Changes');await until('!document.querySelector("dialog")','Explicit discard');
  await click('Store Rules');await until('!!document.querySelector("#f06-rule-supportPercent")','Rule inputs');await input('#f06-rule-supportPercent','12.34567');const puts=writes().length;await click('Save Changes');await has('at most four decimal places');assert.equal(writes().length,puts);
  await input('#f06-rule-supportPercent','12.3456');state.holdConfig=true;const beforePending=writes().length;await click('Save Changes');await has('Saving rules...');await key('Escape');assert.equal(await page.evaluate('!!document.querySelector("dialog[open][aria-label=\\"Store Rules\\"]")'),true);await key('Tab');assert.equal(await page.evaluate('document.querySelector("dialog").contains(document.activeElement)'),true);assert.equal(writes().length,beforePending+1);state.holdConfig=false;await has('Store rules saved successfully.');assert.equal(state.config.minSupportRatio,0.123456);assert.equal(await page.evaluate('/Rules version|expectedVersion/.test(document.querySelector("dialog").textContent)'),false);
  state.configMode='conflict';await input('#f06-rule-maxBundleSize','9');await click('Save Changes');await has('Current saved rules');assert.equal(await page.evaluate('document.getElementById("f06-rule-maxBundleSize").value'),'9');await click('Keep My Edits');state.configMode='lost';const uncertainPuts=writes().length;await click('Save Changes');await has('Save was not confirmed.');await has('Current saved rules');await sleep(150);assert.equal(writes().length,uncertainPuts+1,'No uncertain policy PUT replay');await click('Use Current Rules');await close('Store Rules');
  assert.equal(calls.some(call=>/^\/api\/(layouts|campaigns)/.test(call.path)),false);assert.equal(writes().some(call=>!['/api/recommendations/config','/api/recommendations/62/approve'].includes(call.path)),false);
  checks.push('Store Admin grouped rules: actual values, exact 12.3456% numeric payload, validation, safe Escape/discard, expectedVersion conflicts and lost-response reconciliation without automatic PUT retry');

  state.holdSummary=true;await login('MERCHANDISER',1);await has('Checking expiry alerts');await login('MERCHANDISER',2);state.holdSummary=false;await has('1 batch has reached its Push Day');assert.equal(await page.evaluate('document.body.innerText.includes("65 batches have reached")'),false);assert.equal(await page.evaluate('!!document.querySelector("[data-expiry-product]")'),false);
  checks.push('Store/session switch cancels stale expiry reads and removes old priorities/counts; no Layout/Campaign routes, inventory mutation, generated candidates or fake related-search action');
  assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);console.log(JSON.stringify({result:'PASS (controlled browser fixtures)',checks,interceptedApiCalls:calls.length,realBackendWrites:0,artifacts:null},null,2));
}catch(error){console.log(JSON.stringify({result:'FAIL',error:error.stack,checks,errors,unexpected,context:page?await page.evaluate('({url:location.pathname+location.search,text:document.body.innerText.slice(-2200)})').catch(()=>null):null,realBackendWrites:0,artifacts:null},null,2));process.exitCode=1;}
finally{closing=true;state.holdSummary=false;state.holdProduct=0;if(page){try{await page.call('Browser.close');}catch{}page.ws.close();}if(chrome.exitCode===null)await Promise.race([new Promise(done=>chrome.once('exit',done)),sleep(3000)]);if(chrome.exitCode===null)chrome.kill();const target=resolve(profile);if(dirname(target)===base&&basename(target).startsWith('paspm-f06-expiry-browser-')){try{rmSync(target,{recursive:true,force:true,maxRetries:3,retryDelay:100});}catch{}}}
