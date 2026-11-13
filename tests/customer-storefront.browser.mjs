// Controlled local browser fixtures; no backend writes or external requests.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const origin=process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3000';
const profile=mkdtempSync(join(tmpdir(),'paspm-storefront-'));
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

let browser,page; const checks=[],errors=[],api=[];
async function connect(url){const ws=new WebSocket(url);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});return new CDP(ws)}
async function until(expression,label){const end=Date.now()+12000;while(Date.now()<end){if(await page.evaluate(expression))return;await sleep(50)}throw new Error('UI timeout: '+label)}
async function click(text,scope='document'){const q=`[...${scope}.querySelectorAll('button')].find(b=>b.getClientRects().length&&!b.disabled&&b.textContent.trim()===${JSON.stringify(text)})`;await until(`!!(${q})`,'click '+text);await page.evaluate(q+'.click()');await sleep(50)}
async function press(key,code){await page.call('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:code});await page.call('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:code});await sleep(50)}
async function capture(name){await page.evaluate(`document.querySelector('.sf-toast button')?.click();window.scrollTo(0,0)`);await sleep(100);const shot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(artifacts,name+'.png'),Buffer.from(shot.data,'base64'))}
async function setMode(mode,version){await page.evaluate(`Object.assign(window.storefrontFixture,${JSON.stringify({mode,...(version?{version}:{})})});window.dispatchEvent(new Event('focus'))`);await until(`!document.body.innerText.includes('Đang cập nhật')`,'source settled');await sleep(100)}
async function cart(){await page.evaluate(`document.querySelector('.fm-cart-trigger').click()`);await until(`document.querySelector('dialog[open]')?.textContent.includes('Giỏ hàng của bạn')`,'cart');}
async function close(){await press('Escape',27);await until(`!document.querySelector('dialog[open]')`,'dialog closed')}
try{
 const end=Date.now()+15000;while(!existsSync(join(profile,'DevToolsActivePort'))&&Date.now()<end)await sleep(100);
 assert.ok(existsSync(join(profile,'DevToolsActivePort')),'Chrome started');
 const [port,path]=readFileSync(join(profile,'DevToolsActivePort'),'utf8').trim().split(/\r?\n/);
 browser=await connect('ws://127.0.0.1:'+port+path);
 const target=await browser.call('Target.createTarget',{url:'about:blank'});
 const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 page=await connect(targets.find(t=>t.id===target.targetId).webSocketDebuggerUrl);
 await page.call('Page.enable');await page.call('Runtime.enable');await page.call('Fetch.enable',{patterns:[{urlPattern:'*'}]});
 page.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
 page.on('Runtime.consoleAPICalled',e=>{if(e.type==='error')errors.push(e.args.map(a=>a.value||a.description).join(' '))});
 page.on('Fetch.requestPaused',async({requestId,request})=>{const url=new URL(request.url);if(url.pathname.startsWith('/api/')){api.push(url.pathname);await page.call('Fetch.fulfillRequest',{requestId,responseCode:401,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from('{}').toString('base64')});}else if(url.origin===origin)await page.call('Fetch.continueRequest',{requestId});else await page.call('Fetch.fulfillRequest',{requestId,responseCode:200,body:''});});
 await page.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await page.call('Page.navigate',{url:origin+'/customer-home'});await until(`document.querySelector('.sf-product-grid')?.children.length===6`,'default catalog');
 assert.equal(await page.evaluate(`document.querySelectorAll('[data-placement]').length`),0);
 await page.evaluate(`document.querySelector('.fm-logo').click()`);assert.equal(await page.evaluate('location.pathname'),'/customer-home');
 checks.push('Default homepage has six existing products and no fabricated groups; logo preserves home navigation');
 await capture('storefront-desktop');
 for(const width of [768,390,320]){await page.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await sleep(100);assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'no overflow '+width);if(width===390)await capture('storefront-mobile')}
 await page.evaluate(`(()=>{const e=document.querySelector('input[type=search]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'Broccoli');e.dispatchEvent(new Event('input',{bubbles:true}))})()`);await until(`document.querySelector('.sf-product-grid').children.length===1`,'search filtered');
 await page.evaluate(`document.querySelector('.fm-picture-button').click()`);await until(`!!document.querySelector('dialog[open]')`,'product modal');await click('Thêm vào giỏ',"document.querySelector('dialog[open]')");await close();await cart();assert.match(await page.evaluate(`document.querySelector('dialog[open]').textContent`),/Broccoli/);await close();
 await page.call('Page.reload');await until(`document.querySelector('.sf-product-grid')?.children.length===6`,'reload catalog');await cart();assert.match(await page.evaluate(`document.querySelector('dialog[open]').textContent`),/Broccoli/);await close();
 await page.evaluate(`(()=>{const e=document.querySelector('.sf-store-context select');e.value='store-q1';e.dispatchEvent(new Event('change',{bubbles:true}))})()`);await until(`document.querySelector('.sf-product-grid')?.textContent.includes('Bread')`,'store switch');await cart();assert.match(await page.evaluate(`document.querySelector('dialog[open]').textContent`),/Giỏ hàng đang trống/);await close();
 checks.push('Search, product modal add, per-store cart isolation and reload persistence');
 await page.evaluate(`sessionStorage.removeItem('retailspace_customer_shopping_v1');sessionStorage.removeItem('retailspace_customer_store')`);
 await page.call('Page.navigate',{url:origin+'/tests/customer-storefront.fixture.html'});await until(`document.querySelectorAll('[data-placement]').length===4`,'fixture active');
 assert.deepEqual(await page.evaluate(`[...document.querySelectorAll('[data-placement]')].map(e=>e.dataset.placement)`),['banner','bundle','unavailable','missing']);
 for(const id of ['unavailable','missing'])assert.equal(await page.evaluate(`document.querySelector('[data-placement=${id}] button.sf-button').disabled`),true);
 await page.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await capture('storefront-active-desktop');
 await click('Khám phá bộ sản phẩm');assert.match(await page.evaluate(`document.querySelector('dialog[open]').textContent`),/Căn bếp xanh 1/);assert.match(await page.evaluate(`document.querySelector('dialog[open]').textContent`),/40.000/);
 await press('Tab',9);assert.equal(await page.evaluate(`!!document.activeElement.closest('dialog[open]')`),true);await close();
 await click('Khám phá bộ sản phẩm');await click('Thêm cả nhóm',"document.querySelector('dialog[open]')");await close();await cart();assert.match(await page.evaluate(`document.querySelector('dialog[open]').textContent`),/Giỏ hàng của bạn \(3\)/);await close();
 checks.push('Activated order, banner destination, quantity-derived total, atomic group cart, unavailable/missing blocking, Tab/Escape');
 await page.evaluate(`document.querySelector('.sf-product-grid .fm-picture-button').click()`);await until(`document.querySelector('dialog[open]')?.textContent.includes('Thường mua cùng')`,'FBT');
 assert.match(await page.evaluate(`document.querySelector('dialog[open]').textContent`),/Có thể bạn cần thêm/);
 await page.evaluate(`document.querySelector('dialog[open] input[aria-label="Chọn Sản phẩm b"]').click()`);
 assert.match(await page.evaluate(`document.querySelector('section[aria-label="Thường mua cùng"]').textContent`),/Tổng đã chọn \(1\)/);
 await click('Thêm sản phẩm đã chọn',"document.querySelector('dialog[open]')");
 await click('Thêm vào giỏ',`document.querySelector('section[aria-label="Có thể bạn cần thêm"]')`);await close();await cart();
 const cartText=await page.evaluate(`document.querySelector('dialog[open]').textContent`);assert.match(cartText,/Sản phẩm c/);assert.match(cartText,/Giỏ hàng của bạn \(6\)/);
 await page.evaluate(`(()=>{const b=document.querySelector('button[aria-label="Tăng Sản phẩm a"]');for(let i=0;i<10;i++)b.click()})()`);await sleep(100);assert.equal(await page.evaluate(`document.querySelector('button[aria-label="Tăng Sản phẩm a"]').disabled`),true);assert.equal(await page.evaluate(`document.querySelector('button[aria-label="Tăng Sản phẩm a"]').previousElementSibling.textContent`),'8');await close();
 checks.push('FBT selection, selected purchase, explicit cross-sell quick add, rapid-click stock cap');
 for(const width of [768,390,320]){await page.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await sleep(100);assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'active no overflow '+width);if(width===390)await capture('storefront-active-mobile');}
 await click('Khám phá bộ sản phẩm');
 assert.equal(await page.evaluate(`document.querySelector('dialog[open]').scrollWidth <= document.querySelector('dialog[open]').clientWidth`),true,'group detail fits 320px');
 await page.call('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:false});await capture('storefront-group-mobile');await close();
 await setMode('active','2');await until(`document.body.innerText.includes('Căn bếp xanh 2')`,'version update');
 for(const mode of ['draft','wrong','empty']){await setMode(mode);assert.equal(await page.evaluate(`document.querySelectorAll('[data-placement]').length`),0,mode+' hides layout')}
 await setMode('error');await until(`!!document.querySelector('[role=alert]')`,'error recovery');await page.evaluate(`window.storefrontFixture.mode='active'`);await click('Thử lại');await until(`document.querySelectorAll('[data-placement]').length===4`,'retry successful');
 checks.push('Focus revalidation updates activation version; draft/wrong-store/empty fail closed; source error retries');
 assert.deepEqual(errors,[]);assert.ok(api.every(path=>path.startsWith('/api/auth/')),'no internal recommendation/catalog API calls');
 console.log(JSON.stringify({result:'PASS',checks,consoleErrors:errors,apiCalls:api,artifacts},null,2));
}catch(error){try{if(page)await capture('storefront-failure')}catch{}console.log(JSON.stringify({result:'FAIL',error:error.stack,checks,errors},null,2));process.exitCode=1;}
finally{if(browser){try{await browser.call('Browser.close')}catch{}browser.ws.close()}page?.ws.close();if(chrome.exitCode===null)await Promise.race([new Promise(resolve=>chrome.once('exit',resolve)),sleep(2000)]);if(chrome.exitCode===null)chrome.kill();rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100});}
