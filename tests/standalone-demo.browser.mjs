// Controlled local browser fixtures; no backend writes or external requests.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const origin=process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3005';
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
async function capture(name){await page.evaluate('window.scrollTo(0,0)');const shot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(artifacts,'standalone-'+name+'.png'),Buffer.from(shot.data,'base64'))}
async function widths(label){for(const width of [1440,390,320]){await page.call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await sleep(100);assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),true,label+' overflow '+width);if(width===390)await capture(label+'-mobile')}await page.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})}
async function newPage(url){const target=await browser.call('Target.createTarget',{url:'about:blank'});const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();const p=await connect(targets.find(t=>t.id===target.targetId).webSocketDebuggerUrl);pages.push(p);await p.call('Page.enable');await p.call('Runtime.enable');p.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));p.on('Runtime.consoleAPICalled',e=>{if(e.type==='error')errors.push(e.args.map(a=>a.value||a.description).join(' '))});await p.call('Fetch.enable',{patterns:[{urlPattern:'*'}]});p.on('Fetch.requestPaused',async({requestId,request})=>{try{const u=new URL(request.url);if(u.pathname.startsWith('/api/')||!['data:','blob:'].includes(u.protocol)&&u.origin!==origin){api.push(request.url);await p.call('Fetch.failRequest',{requestId,errorReason:'ConnectionRefused'})}else await p.call('Fetch.continueRequest',{requestId});}catch(e){if(!/Invalid InterceptionId|closed/i.test(e.message))errors.push(e.message)}});await p.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await p.call('Page.navigate',{url:origin+url});return p}
const editor=`document.querySelector('[aria-label="Trình soạn bố cục"]')`;
const cards=`${editor}.querySelector('[aria-label="Các vị trí theo thứ tự"]')`;
async function editCard(index,label,value){await page.evaluate(`(()=>{const a=${cards}.querySelectorAll('article')[${index}];const l=[...a.querySelectorAll('label')].find(l=>l.textContent.startsWith(${JSON.stringify(label)}));const e=l.control||l.querySelector('input,select');Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);await sleep(60)}
async function persona(value){await page.evaluate(`(()=>{const e=document.querySelector('[aria-label="Demo persona"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}))})()`);await sleep(150)}
try{
const end=Date.now()+15000;while(!existsSync(join(profile,'DevToolsActivePort'))&&Date.now()<end)await sleep(100);assert.ok(existsSync(join(profile,'DevToolsActivePort')),'Chrome started');const parts=readFileSync(join(profile,'DevToolsActivePort'),'utf8').trim().split(/\r?\n/);port=parts[0];browser=await connect('ws://127.0.0.1:'+port+parts[1]);
page=await newPage('/merchandising/lab');await until(`document.body.innerText.includes('Soạn bố cục cửa hàng')`,'standalone startup');
await widths('startup');await capture('startup');checks.push('Startup without API or external network');
await field('Tên bản nháp','Standalone browser layout');await click('Thêm vào bố cục',editor);await click('Thêm vào bố cục',editor);await editCard(0,'Loại hiển thị','BANNER');await editCard(0,'Tiêu đề','Standalone ACTIVE banner');await editCard(1,'Loại hiển thị','BUNDLE');await click('Lưu bản nháp');await until(`document.body.innerText.includes('Đã lưu phiên bản DRAFT mới')`,'saved draft');
await click('F08 · Campaign & A/B');await field('Tên chiến dịch','Standalone campaign');const draftId=await page.evaluate(`[...document.querySelectorAll('.mock-form-grid select')][1].options[[...document.querySelectorAll('.mock-form-grid select')][1].options.length-1].value`);await field('Layout B',draftId);await click('Tạo chiến dịch');const scope=`[...document.querySelectorAll('.mock-campaign-card')].find(a=>a.querySelector('h3').textContent==='Standalone campaign')`;await click('Chạy mô phỏng A/B',scope);await click('Công bố layout B',scope);assert.ok(!await page.evaluate(`document.querySelector('.mock-context').textContent.includes('Standalone browser layout')`));
await persona('Store Admin');await click('F08 · Campaign & A/B');await click('Kích hoạt layout B',scope);await persona('End-Customer');await until(`document.body.innerText.includes('Standalone ACTIVE banner')`,'active layout');await click('Khám phá bộ sản phẩm');await until(`document.querySelector('dialog[open]')`,'group dialog');await click('Thêm cả nhóm',`document.querySelector('dialog[open]')`);await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await page.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await page.evaluate(`document.querySelector('.fm-cart-trigger').click()`);await until(`document.querySelector('dialog[open]')?.textContent.includes('Broccoli')`,'cart group');await page.call('Page.reload');await sleep(500);await until(`document.body.innerText.includes('Standalone ACTIVE banner')`,'refresh active');await page.evaluate(`document.querySelector('.fm-cart-trigger').click()`);await until(`document.querySelector('dialog[open]')?.textContent.includes('Broccoli')`,'persisted cart');await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await page.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await widths('customer');await capture('customer');checks.push('Draft → campaign → publish → persona activation → ACTIVE storefront → atomic group cart → refresh');
await persona('Merchandiser');await click('F11 · Analytics');await until(`document.body.innerText.includes('Benchmark unavailable')`,'honest benchmarks');await widths('analytics');await capture('analytics');
await click('Reset demo data');await until(`document.body.innerText.includes('Soạn bố cục cửa hàng')`,'reset');assert.ok(!await page.evaluate(`document.body.innerText.includes('Standalone browser layout')`));checks.push('Analytics labels and reset scenario');
await persona('Store Admin');await click('Categories');await until(`document.body.innerText.includes('Category Management')`,'category page');await click('Add category');await field('Category name','Demo browser category');await click('Save');await until(`document.querySelector('table')?.textContent.includes('Demo browser category')`,'category CRUD');await page.call('Page.reload');await sleep(500);await click('Categories');await until(`document.querySelector('table')?.textContent.includes('Demo browser category')`,'category persistence');
await click('Products');await until(`document.body.innerText.includes('Broccoli')`,'inventory loaded');
await persona('Merchandiser');await page.call('Page.navigate',{url:origin+'/merchandiser/recommendations'});await until(`document.body.innerText.includes('Nhóm sản phẩm đề xuất')`,'F06 page');await click('Duyệt nhóm');await click('Mở Layout Editor');await until(`document.querySelector('aside article')?.parentElement.textContent.includes('Gợi ý mới')`,'approved group feeds editor');
await persona('System Admin');await sleep(400);assert.ok(!await page.evaluate(`document.body.innerText.includes('Checking your session')`));await capture('system');checks.push('Category CRUD persists, inventory loads, F06 approval feeds F07, System Admin starts without network');
assert.deepEqual(api,[]);assert.deepEqual(errors,[]);writeFileSync(join(artifacts,'standalone-results.json'),JSON.stringify({result:'PASS',checks,api,errors},null,2));console.log(JSON.stringify({result:'PASS',checks,api,errors},null,2));
}catch(error){try{await capture('failure');console.log((await page.evaluate('document.body.innerText')).slice(-8000));console.log(await page.evaluate(`Array.from(document.querySelectorAll('*')).filter(e=>e.getBoundingClientRect().right>innerWidth+2).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width})).slice(0,15)`))}catch{}console.log(JSON.stringify({result:'FAIL',error:error.stack,checks,errors,api},null,2));process.exitCode=1}
finally{try{await browser?.call('Browser.close')}catch{}browser?.ws.close();for(const p of pages)p.ws.close();if(chrome.exitCode===null)await Promise.race([new Promise(res=>chrome.once('exit',res)),sleep(2000)]);if(chrome.exitCode===null)chrome.kill();rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100})}
