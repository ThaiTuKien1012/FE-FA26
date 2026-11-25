// Chrome UI fixtures only. All API traffic fails closed; no backend or database writes.
// Start Vite; PASPM_TEST_ORIGIN=http://127.0.0.1:3105 node tests/date-picker.browser.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';

const origin = process.env.PASPM_TEST_ORIGIN || 'http://127.0.0.1:3000';
const base = resolve(tmpdir()), profile = mkdtempSync(join(base, 'paspm-date-browser-')), artifacts = mkdtempSync(join(base, 'paspm-date-preview-'));
const chrome = spawn(process.env.DATE_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--lang=en-US', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-sync', '--disable-extensions', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, cdp, closing = false;
const api = [], errors = [], checks = [];
class CDP {
  id = 0; pending = new Map(); listeners = new Map();
  constructor(socket) { this.ws = socket; socket.addEventListener('message', event => { const d = JSON.parse(event.data); if (d.id) { const p = this.pending.get(d.id); if (p) { this.pending.delete(d.id); d.error ? p.reject(new Error(d.error.message)) : p.resolve(d.result); } } else for (const f of this.listeners.get(d.method) || []) void f(d.params); }); }
  call(method, params = {}) { return new Promise((resolve, reject) => { const id = ++this.id; const timer = setTimeout(() => reject(new Error('CDP timeout ' + method)), 10000); this.pending.set(id, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); } }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  on(method, f) { this.listeners.set(method, [...this.listeners.get(method) || [], f]); }
}
async function evaluate(expression) { const r = await cdp.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; }
async function until(expression, label = expression) { for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await sleep(40); } throw Error('UI timeout ' + label); }
async function fill(selector, value) { await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`); await sleep(30); }
async function click(selector) { assert.equal(await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)return false;e.click();return true;})()`), true, selector); await sleep(30); }
async function key(key, modifiers = 0) { const windowsVirtualKeyCode = ({ Tab: 9, Escape: 27, Enter: 13, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39, PageUp: 33, PageDown: 34, Home: 36, End: 35 })[key] || 0; for (const type of ['keyDown', 'keyUp']) await cdp.call('Input.dispatchKeyEvent', { type, key, windowsVirtualKeyCode, modifiers }); await sleep(30); }
const date = '#fixture-date', datetime = '#fixture-datetime', optional = '#fixture-optional';
const trigger = id => id + ' + button';
async function shot(name) { const r = await cdp.call('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(artifacts, name + '.png'), Buffer.from(r.data, 'base64')); }
try {
  for (let i = 0; i < 100 && !existsSync(join(profile, 'DevToolsActivePort')); i++) await sleep(100);
  const port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0]);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }); });
  cdp = new CDP(ws);
  cdp.on('Fetch.requestPaused', async ({ requestId, request }) => { api.push(request.url); try { await cdp.call('Fetch.fulfillRequest', { requestId, responseCode: 503, body: Buffer.from('{}').toString('base64') }); } catch (e) { if (!closing) errors.push(e.message); } });
  cdp.on('Runtime.exceptionThrown', e => errors.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
  await cdp.call('Page.enable'); await cdp.call('Runtime.enable');
  await cdp.call('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*', requestStage: 'Request' }] });
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: 'localStorage.clear();sessionStorage.clear();' });
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp.call('Page.navigate', { url: origin + '/login' });
  await until("performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname==='/node_modules/.vite/deps/react-dom_client.js')");
  await until("window.$RefreshReg$ && Boolean(document.querySelector('#root input'))", 'React app initialized');
  // Mount the production component, with its real React dependency and app stylesheet.
  await evaluate(`(async()=>{const resources=performance.getEntriesByType('resource');const ReactModule=await import(resources.find(e=>new URL(e.name).pathname==='/node_modules/.vite/deps/react.js').name);const React=ReactModule.default||ReactModule;const DOM=await import(resources.find(e=>new URL(e.name).pathname==='/node_modules/.vite/deps/react-dom_client.js').name);const {AppDatePicker,AppDateTimePicker}=await import('/src/components/common/AppDatePicker.tsx');window.dateUtils=await import('/src/utils/dateTime.ts');window.batchForms=await import('/src/features/store/f02.forms.ts');const h=React.createElement;document.querySelector('#root').style.display='none';const host=document.createElement('div');document.body.append(host);window.fixtureState={submits:0};function Fixture(){const [date,setDate]=React.useState('2026-11-18'),[time,setTime]=React.useState('2026-11-18T14:30'),[optional,setOptional]=React.useState(''),[disabled,setDisabled]=React.useState(false),[reset,setReset]=React.useState(0);Object.assign(window.fixtureState,{date,time,optional});window.fixtureReset=()=>{setDate('2026-11-18');setTime('2026-11-18T14:30');setOptional('');setReset(x=>x+1)};const field='mt-2 w-full rounded-xl border border-[#E7E2D8] bg-white px-3 py-2.5 text-sm';return h('dialog',{id:'fixture-dialog',style:{margin:'auto',padding:'24px',borderRadius:'16px',border:'1px solid #e7e2d8',width:'min(600px,calc(100vw - 24px))',maxHeight:'90vh',overflow:'auto'}},h('h1',{style:{fontSize:'22px',fontWeight:600,marginBottom:'20px'}},'Date & time — UI fixture'),h('form',{noValidate:true,onSubmit:e=>{e.preventDefault();window.fixtureState.submits++}},h('label',null,'Analysis Date',h(AppDatePicker,{id:'fixture-date','aria-label':'Analysis Date',required:true,value:date,onChange:setDate,className:field,resetKey:reset})),h('label',{style:{display:'block',marginTop:'16px'}},'Received at (your local time)',h(AppDateTimePicker,{id:'fixture-datetime','aria-label':'Received at',required:true,value:time,onChange:setTime,className:field,resetKey:reset})),h('label',{style:{display:'block',marginTop:'16px'}},'Optional Push Day',h(AppDatePicker,{id:'fixture-optional','aria-label':'Push Day',value:optional,onChange:setOptional,min:'2026-11-05',max:'2026-11-30',disabled,className:field,resetKey:reset})),h('button',{id:'fixture-submit',type:'submit',style:{padding:'12px',marginTop:'20px',background:'#1e3a2f',color:'white',borderRadius:'8px'}},'Save fixture'),h('button',{id:'fixture-disable',type:'button',onClick:()=>setDisabled(x=>!x),style:{marginLeft:'12px'}},'Toggle disabled')))}window.dateFixtureRoot=(DOM.createRoot||DOM.default.createRoot)(host);window.dateFixtureRoot.render(h(Fixture));})()`);
  await until("Boolean(document.querySelector('#fixture-date'))"); await evaluate("document.querySelector('#fixture-dialog').showModal()");
  for (const locale of ['en-US', 'vi-VN']) {
    await cdp.call('Emulation.setLocaleOverride', { locale });
    await fill(date, '05/11/2026'); assert.equal(await evaluate('fixtureState.date'), '2026-11-05');
    assert.equal(await evaluate(`document.querySelector('${date}').value`), '05/11/2026');
    await click(trigger(date)); await until("Boolean(document.querySelector('.app-calendar:popover-open'))");
    await click('[data-date="2026-11-18"]'); assert.equal(await evaluate('fixtureState.date'), '2026-11-18');
    assert.equal(await evaluate(`document.querySelector('${date}').value`), '18/11/2026');
    assert.equal(await evaluate(`document.activeElement.id`), 'fixture-date');
    checks.push(locale + ': fixed DD/MM/YYYY typed and calendar-selected, ISO state unchanged');
  }
  for (const invalid of ['29/02/2026', '31/04/2026', '00/11/2026', '18/13/2026', '18/11']) {
    await fill(date, invalid); const before = await evaluate('fixtureState.submits'); await click('#fixture-submit');
    assert.equal(await evaluate('fixtureState.submits'), before); assert.equal(await evaluate('fixtureState.date'), '2026-11-18');
    assert.equal(await evaluate(`document.querySelector('${date}').value`), invalid, 'Invalid/partial draft is preserved');
  }
  await fill(date, ''); let before = await evaluate('fixtureState.submits'); await click('#fixture-submit');
  assert.equal(await evaluate('fixtureState.submits'), before); assert.equal(await evaluate('fixtureState.date'), '');
  await fill(date, '29/02/2024'); await click('#fixture-submit'); assert.equal(await evaluate('fixtureState.submits'), before + 1);
  checks.push('Strict leap days, invalid dates, incomplete drafts and empty required block noValidate submit; no stale ISO submission');
  await fill(optional, '04/11/2026'); before = await evaluate('fixtureState.submits'); await click('#fixture-submit'); assert.equal(await evaluate('fixtureState.submits'), before);
  assert.equal(await evaluate('fixtureState.optional'), '');
  await fill(optional, '05/11/2026'); assert.equal(await evaluate('fixtureState.optional'), '2026-11-05');
  await fill(optional, '01/12/2026'); await click('#fixture-submit'); assert.equal(await evaluate('fixtureState.submits'), before);
  await click(trigger(optional)); assert.equal(await evaluate("document.querySelector('[data-date=\"2026-11-04\"]').disabled"), true);
  await click('[data-date="2026-11-30"]'); assert.equal(await evaluate('fixtureState.optional'), '2026-11-30');
  await click(trigger(optional)); await evaluate("[...document.querySelectorAll('.app-calendar button')].find(e=>e.innerText==='Clear date').click()"); await sleep(40);
  assert.equal(await evaluate('fixtureState.optional'), ''); await click('#fixture-submit'); assert.equal(await evaluate('fixtureState.submits'), before + 1);
  await click('#fixture-disable'); assert.equal(await evaluate(`document.querySelector('${trigger(optional)}').disabled`), true); await click('#fixture-disable');
  checks.push('Optional clear, min/max including calendar disabled dates, required/disabled states');
  await evaluate("document.querySelector('#fixture-dialog form').noValidate=false");
  await fill(date, '31/04/2026'); before = await evaluate('fixtureState.submits'); await click('#fixture-submit');
  assert.equal(await evaluate('fixtureState.submits'), before);
  assert.equal(await evaluate(`document.querySelector('${date}').getAttribute('aria-invalid')`), 'true');
  await evaluate("document.querySelector('#fixture-dialog form').noValidate=true");
  await fill(date, '28/02/2024'); await evaluate(`document.querySelector('${date}').focus()`); await key('ArrowDown');
  await key('ArrowRight'); assert.equal(await evaluate('document.activeElement.dataset.date'), '2024-02-29');
  await key('ArrowDown'); assert.equal(await evaluate('document.activeElement.dataset.date'), '2024-03-07');
  await key('Home'); assert.equal(await evaluate('document.activeElement.dataset.date'), '2024-03-04');
  await key('End'); assert.equal(await evaluate('document.activeElement.dataset.date'), '2024-03-10');
  await key('PageUp'); assert.equal(await evaluate('document.activeElement.dataset.date'), '2024-02-10');
  await key('PageDown', 8); assert.equal(await evaluate('document.activeElement.dataset.date'), '2025-02-10');
  await evaluate("[...document.querySelectorAll('.app-calendar button')].find(e=>e.innerText==='Close calendar').focus()");
  await key('Tab'); assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Previous month');
  await key('Tab', 8); assert.equal(await evaluate('document.activeElement.innerText'), 'Close calendar');
  await key('Escape'); assert.equal(await evaluate("document.querySelector('#fixture-dialog').open"), true); assert.equal(await evaluate('document.activeElement.id'), 'fixture-date');
  await click(trigger(date)); await fill('[aria-label="Calendar year"]', '2040'); assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Calendar year');
  await evaluate("(()=>{const e=document.querySelector('[aria-label=\"Calendar month\"]');e.value='2';e.dispatchEvent(new Event('change',{bubbles:true}))})()"); await sleep(40);
  await click('[data-date="2040-02-29"]'); assert.equal(await evaluate('fixtureState.date'), '2040-02-29');
  checks.push('Arrow/week/Home/End/Page month/Shift Page year navigation; distant year typing retains focus; Escape closes only calendar and restores focus inside modal');
  await fill(datetime, '18/11/2026 14:30'); assert.equal(await evaluate('fixtureState.time'), '2026-11-18T14:30');
  const expectedInstant = await evaluate("new Date('2026-11-18T14:30').toISOString()");
  assert.equal(await evaluate("batchForms.batchCreateRequest({batchCode:'Fixture',receivedAt:fixtureState.time,expiryDate:'',initialQuantity:'1',remainingQuantity:'1',pushDay:''},false).receivedAt"), expectedInstant);
  await fill(datetime, '18/11/2026 24:00'); before = await evaluate('fixtureState.submits'); await click('#fixture-submit'); assert.equal(await evaluate('fixtureState.submits'), before);
  await fill(datetime, '18/11/2026 23:45'); await click(trigger(datetime)); await fill('[aria-label="Calendar time"]', '08:05'); await click('[data-date="2026-11-19"]');
  assert.equal(await evaluate('fixtureState.time'), '2026-11-19T08:05'); assert.equal(await evaluate(`document.querySelector('${datetime}').value`), '19/11/2026 08:05');
  checks.push('24-hour DateTime typing/calendar/time selection and unchanged F02 browser-local instant conversion');
  for (const width of [390, 820, 1440]) {
    await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
    await evaluate('fixtureReset()'); await sleep(40); await click(trigger(date));
    await until("Boolean(document.querySelector('.app-calendar:popover-open'))");
    assert.equal(await evaluate("(()=>{const e=document.querySelector('.app-calendar'),r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&e.scrollWidth<=e.clientWidth+1})()"), true, 'Calendar fits ' + width);
    assert.equal(await evaluate("(()=>{const e=document.querySelector('[data-date=\"2026-11-18\"]'),r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e})()"), true, 'Calendar is above modal, not clipped');
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), true);
    await shot('calendar-' + width); await key('Escape'); await click(trigger(datetime)); await shot('datetime-' + width); await key('Escape');
  }
  checks.push('390/820/1440: date and datetime screenshots; native dialog top layer, visible day hit testing, no horizontal overflow');
  assert.deepEqual(errors, []); assert.equal(api.some(url => !url.endsWith('/api/auth/refresh')), false, 'No feature APIs called');
  console.log(JSON.stringify({ result: 'PASS (UI fixtures only)', checks, blockedApiRequests: api, realBackendWrites: 0, artifacts }, null, 2));
} catch (error) { try { await shot('failure'); } catch {} console.log(JSON.stringify({ result: 'FAIL', error: error.stack, checks, errors, api, artifacts }, null, 2)); process.exitCode = 1; }
finally {
  closing = true;
  if (cdp) { try { await cdp.call('Browser.close'); } catch {} ws.close(); }
  if (chrome.exitCode === null) await Promise.race([new Promise(r => chrome.once('exit', r)), sleep(2000)]);
  if (chrome.exitCode === null) chrome.kill();
  const target = resolve(profile); if (dirname(target) === base && basename(target).startsWith('paspm-date-browser-')) { try { rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {} }
}
