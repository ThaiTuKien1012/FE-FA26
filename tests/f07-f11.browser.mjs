// Controlled local browser fixtures; no backend writes or external requests.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const origin=process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3003';
const profile=mkdtempSync(join(tmpdir(),'paspm-f07-'));
const artifacts=resolve('docs/qa'); mkdirSync(artifacts,{recursive:true});
const chrome=spawn(process.env.STOREFRONT_TEST_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-sync','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
class CDP {
  id = 0; pending = new Map(); listeners = new Map(); closed = false;
  constructor(ws) {
    this.ws = ws;
    ws.addEventListener('message', event => {
      const data = JSON.parse(event.data);
      if (data.id) {
        const pending = this.pending.get(data.id); if (!pending) return;
        this.pending.delete(data.id); data.error ? pending.reject(new Error(data.error.message)) : pending.resolve(data.result);
      } else for (const listener of this.listeners.get(data.method) || []) void listener(data.params);
    });
    ws.addEventListener('close', () => {
      this.closed = true;
      this.pending.forEach(pending => pending.reject(new Error('Browser connection closed')));
      this.pending.clear();
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
  on(name, listener) { this.listeners.set(name, [...this.listeners.get(name) || [], listener]); }
  async evaluate(expression) {
    const result = await this.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).catch(error => { throw new Error(error.message + ' while evaluating: ' + expression.slice(0, 180)); });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result?.value;
  }
}

let browser,page,port;const pages=[],checks=[],errors=[],api=[];let role='MERCHANDISER',serial=0;
async function connect(url){const ws=new WebSocket(url);await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej});return new CDP(ws)}
async function until(expression,label){const end=Date.now()+15000;while(Date.now()<end){if(await page.evaluate('Boolean('+expression+')'))return;await sleep(50)}throw Error('UI timeout: '+label)}
async function click(text,scope='document'){const q=`[...${scope}.querySelectorAll('button')].find(b=>b.getClientRects().length&&!b.disabled&&b.textContent.trim()===${JSON.stringify(text)})`;await until(`!!(${q})`,'click '+text);await page.evaluate(q+'.click()');await sleep(80)}
async function field(label,value){await page.evaluate(`(()=>{const l=[...document.querySelectorAll('label')].find(l=>l.getClientRects().length&&l.textContent.trim().startsWith(${JSON.stringify(label)}));if(!l)throw Error('Missing label '+${JSON.stringify(label)});const e=l.control||l.querySelector('input,select');Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);await sleep(60)}
async function capture(name){await page.evaluate('window.scrollTo(0,0)');const shot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(artifacts,'f07-f11-'+name+'.png'),Buffer.from(shot.data,'base64'))}
async function widths(label){for(const width of [1440,390,320]){await page.call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await sleep(100);assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),true,label+' overflow '+width)}await page.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})}
async function newPage(url){const target=await browser.call('Target.createTarget',{url:'about:blank'});const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();const p=await connect(targets.find(t=>t.id===target.targetId).webSocketDebuggerUrl);pages.push(p);await p.call('Page.enable');await p.call('Runtime.enable');p.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));await p.call('Fetch.enable',{patterns:[{urlPattern:'*'}]});p.on('Fetch.requestPaused',async({requestId,request})=>{try{const u=new URL(request.url);if(!u.pathname.startsWith('/api/'))return await p.call(u.origin===origin?'Fetch.continueRequest':'Fetch.fulfillRequest',u.origin===origin?{requestId}:{requestId,responseCode:200,body:''});api.push(u.pathname);let body={},responseCode=200,responseHeaders=[{name:'Content-Type',value:'application/json'}];if(['/api/auth/login','/api/auth/refresh'].includes(u.pathname)){serial++;body={accessToken:'fixture-access-'+serial,expiresIn:3600,tokenType:'Bearer',csrfToken:'fixture-csrf-'+serial};responseHeaders.push({name:'Set-Cookie',value:'PASPM-CSRF=fixture-csrf-'+serial+'; Path=/; SameSite=Strict'},{name:'Set-Cookie',value:'PASPM-REFRESH=fixture-refresh; HttpOnly; Path=/; SameSite=Strict'});}else if(u.pathname==='/api/auth/me')body={userId:12,email:'fixture@example.invalid',name:'F07 Fixture',roleCode:role,storeId:1,status:'ACTIVE',emailVerified:true,avatarUrl:null};else if(u.pathname==='/api/utility/config')body={config:{enableStock:true,enableExpiry:true,enableSeason:true,alpha:0.5,beta:0.3,gamma:0.2,lambda:0.1,version:1,scoringVersion:'v1.2'},lambdaPolicy:{lambdaMin:0,lambdaMax:0.5,version:1},lambdaValid:true};else if(u.pathname==='/api/stores'||u.pathname==='/api/categories')body=[];else if(u.pathname==='/api/products')body={content:[],page:0,pageSize:20,totalElements:0,totalPages:0};else {responseCode=401;body={};}await p.call('Fetch.fulfillRequest',{requestId,responseCode,responseHeaders,body:Buffer.from(JSON.stringify(body)).toString('base64')});}catch(e){if(!/Invalid InterceptionId|closed/i.test(e.message))errors.push(e.message)}});await p.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await p.call('Page.navigate',{url:origin+url});return p}
const editor=`document.querySelector('[aria-label="Trình soạn bố cục"]')`;
const cards=`${editor}.querySelector('[aria-label="Các vị trí theo thứ tự"]')`;
async function editCard(index,label,value){await page.evaluate(`(()=>{const a=${cards}.querySelectorAll('article')[${index}];const l=[...a.querySelectorAll('label')].find(l=>l.textContent.startsWith(${JSON.stringify(label)}));const e=l.control||l.querySelector('input,select');Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);await sleep(60)}
async function campaign(name,version){await click('F08 · Campaign & A/B');await field('Tên chiến dịch',name);await field('Layout A','');const id=await page.evaluate(`[...document.querySelectorAll('.mock-form-grid select')][1].options[${version}].value`);await field('Layout B',id);await click('Tạo chiến dịch');const scope=`[...document.querySelectorAll('.mock-campaign-card')].find(a=>a.querySelector('h3').textContent===${JSON.stringify(name)})`;await click('Chạy mô phỏng A/B',scope);await until(`${scope}.textContent.includes('seed 42')`,'seed');await click('Công bố layout B',scope);assert.match(await page.evaluate(scope+'.textContent'),/PUBLISHED/);}
try{
const end=Date.now()+15000;while(!existsSync(join(profile,'DevToolsActivePort'))&&Date.now()<end)await sleep(100);assert.ok(existsSync(join(profile,'DevToolsActivePort')),'Chrome started');const parts=readFileSync(join(profile,'DevToolsActivePort'),'utf8').trim().split(/\r?\n/);port=parts[0];browser=await connect('ws://127.0.0.1:'+port+parts[1]);
page=await newPage('/login');
await until(`!!document.querySelector('input[type=email]')`,'login form');
await field('Sign-in email','fixture@example.invalid');await field('Password','FixturePassword12');await click('Sign in');
await until(`!!document.querySelector('[data-purpose="sidebar"]')`,'real authenticated shell');
await click('F07–F11 Workspace');await until(`document.body.innerText.includes('Soạn bố cục cửa hàng')`,'authenticated merchant lab');assert.match(await page.evaluate('document.body.innerText'),/Merchandiser/);
await field('Tên bản nháp','Browser layout A');for(let i=0;i<3;i++)await click('Thêm vào bố cục',editor);
await page.evaluate(`(()=>{const dataTransfer=new DataTransfer();${editor}.querySelector('aside article').dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer}));${cards}.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer}));})()`);
await until(`${cards}.querySelectorAll('article').length===4`,'approved group drag/drop');
for(const [i,type] of ['BANNER','BUNDLE','FBT','CROSS_SELL'].entries()){await editCard(i,'Loại hiển thị',type);await editCard(i,'Tiêu đề',type+' browser A')}
await editCard(0,'Số lượng','2');await click('Xuống',`${cards}.querySelectorAll('article')[0]`);await click('Lên',`${cards}.querySelectorAll('article')[1]`);
assert.equal(await page.evaluate(`${cards}.querySelector('article input').value`),'BANNER browser A');
await click('Di động · 390px');assert.ok(await page.evaluate(`document.querySelector('[aria-label="Xem trước bố cục"] [style]').getBoundingClientRect().width<=390`));await click('Máy tính');await field('Xem gợi ý trên sản phẩm','td-broccoli');await until(`document.querySelector('[aria-label="Thường mua cùng"]')`,'FBT preview');await click('Thêm cả nhóm',`document.querySelector('[aria-label="Thường mua cùng"]')`);assert.match(await page.evaluate(`${editor}.textContent`),/Chỉ xem trước: không thay đổi giỏ hàng/);
await click('Lưu bản nháp');await until(`document.body.innerText.includes('Đã lưu phiên bản nháp mới')`,'save first');await widths('editor');await capture('editor');
await editCard(0,'Tiêu đề','Unsaved change');const restore=await page.evaluate(`${editor}.querySelectorAll('select')[0].options[1].value`);await field('Khôi phục phiên bản',restore);assert.equal(await page.evaluate(`${cards}.querySelector('article input').value`),'BANNER browser A');
await field('Tên bản nháp','Browser layout B');await editCard(0,'Tiêu đề','BANNER browser B');await click('Lưu bản nháp');await until(`${editor}.querySelectorAll('select')[0].options.length===3`,'two versions');checks.push('Four placement types, quantities, keyboard/touch reorder, isolated FBT preview, immutable save and restore');
await campaign('Campaign A',1);assert.match(await page.evaluate('document.querySelector(".mock-context").textContent'),/Chưa kích hoạt/);await campaign('Campaign B',1);await widths('campaigns');await capture('campaigns');
await click('F11 · Analytics');await until(`document.body.innerText.includes('Benchmark unavailable')`,'analytics');assert.match(await page.evaluate('document.body.innerText'),/Benchmark unavailable/);assert.match(await page.evaluate('document.body.innerText'),/simulated|Simulated/);await widths('analytics');await capture('analytics');checks.push('Seed 42 / 1000 simulation, publication leaves ACTIVE empty, explicit unavailable measured benchmarks');
const merchant=page;const customer=await newPage('/customer-home');page=customer;await until(`document.querySelector('.sf-product-grid')`,'neutral customer');assert.equal(await page.evaluate('document.querySelectorAll("[data-placement]").length'),0);
page=merchant;role='STORE_ADMIN';await page.call('Page.reload');await until(`document.body.innerText.includes('Store Admin · Read-only')`,'admin authenticated');await click('F07–F11 Workspace');await until(`document.body.innerText.includes('Vai trò: Store Admin')`,'admin refresh');await click('F08 · Campaign & A/B');await click('Kích hoạt layout B',`document.querySelectorAll('.mock-campaign-card')[0]`);
page=customer;await until(`document.querySelectorAll('[data-placement]').length===2`,'storage activation received');const firstTitle=await page.evaluate(`document.querySelector('[data-placement] h2').textContent`);await click('Khám phá bộ sản phẩm');await until(`document.querySelector('dialog[open]')`,'banner group');await click('Thêm cả nhóm',`document.querySelector('dialog[open]')`);await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await page.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await page.evaluate(`document.querySelector('.fm-cart-trigger').click()`);await until(`document.querySelector('dialog[open]')?.textContent.includes('Broccoli')`,'whole group in cart');await page.call('Page.reload');await until(`document.querySelector('.fm-cart-trigger')`,'customer reload');await page.evaluate(`document.querySelector('.fm-cart-trigger').click()`);await until(`document.querySelector('dialog[open]')?.textContent.includes('Broccoli')`,'cart persisted');await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await page.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await widths('customer');await capture('customer-active');
await page.evaluate('window.activationDocumentMarker="same-document"');page=merchant;await click('Kích hoạt layout B',`document.querySelectorAll('.mock-campaign-card')[1]`);page=customer;await until(`document.querySelector('[data-placement] h2').textContent!==${JSON.stringify(firstTitle)}`,'second activation without reload');assert.equal(await page.evaluate('window.activationDocumentMarker'),'same-document');checks.push('Admin activation, cross-tab active projection, banner group purchase, cart persistence, second activation without reload');
page=merchant;role='END_CUSTOMER';await page.call('Page.reload');await until(`!document.querySelector('.mock-workspace')`,'customer denied lab');await sleep(500);assert.equal(await page.evaluate('!!document.querySelector(".mock-workspace")'),false);checks.push('End-Customer role denied merchandising lab');assert.deepEqual(errors,[]);writeFileSync(join(artifacts,'f07-f11-results.json'),JSON.stringify({result:'PASS',checks,api,errors},null,2));console.log(JSON.stringify({result:'PASS',checks,api,errors},null,2));
}catch(error){try{await capture('failure');console.log(await page.evaluate(`Array.from(document.querySelectorAll('*')).filter(e=>e.getBoundingClientRect().right>innerWidth+2).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right})).slice(0,25)`));console.log((await page.evaluate('document.body.innerText')).slice(-8000))}catch{}console.log(JSON.stringify({result:'FAIL',error:error.stack,checks,errors},null,2));process.exitCode=1}
finally{try{await browser?.call('Browser.close')}catch{}browser?.ws.close();for(const p of pages)p.ws.close();if(chrome.exitCode===null)await Promise.race([new Promise(res=>chrome.once('exit',res)),sleep(2000)]);if(chrome.exitCode===null)chrome.kill();rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100})}
