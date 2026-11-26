import assert from './f06.assert';
import {test,type TestContext} from 'node:test';
import {setImmediate as flush} from 'node:timers/promises';
import {createElement} from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {authService,type AuthUser} from '../src/services/authService';
import {f06Api,F06ApiError} from '../src/features/f06/f06.api';
import {f05Api} from '../src/features/f05/f05.api';
import {RecommendationBrowser} from '../src/features/f06/f06.browse';
import {LiveRecommendationExpiry,confirmedProductBatches,type LiveExpiryState,type ProductExpiry,EXPIRY_CACHE_MS} from '../src/features/f06/f06.expiry';
import {batchExpiryLabel,calendarDay,confirmedDueBatch,daysUntilExpiry,expiryLabel,missingPushDayWarning,pushDayLabel,quantityLabel,sellingPriorityLabel} from '../src/features/f06/f06.expiry.presentation';
import {F06ExpiryNoticeContent,F06ExpiryBatchCard,F06SellingPriorityContent,MissingPushDayWarnings} from '../src/features/f06/components/F06ExpiryPriority';
import {F06RuleGroups,F06StoreRulesButton} from '../src/features/f06/components/F06Utilities';
import {F06ProductTiles} from '../src/features/f06/components/F06ProductImage';
import {readExpiryProducts} from '../src/features/f06/components/F06ExpiryProductPicker';
import {ruleInputs,parseRuleInputs} from '../src/features/f06/f06.settings';
import type {RecExpiryBatch,RecExpiryPage,RecExpiryParams,RecListParams} from '../src/features/f06/f06.types';
import {policy,recommendation} from './f06.fixtures';
import {user,runFixture,requestFixture} from './f05.fixtures';

const batch=(productId=31,batchId=239):RecExpiryBatch=>({productId,batchId,pushDay:'2026-11-17',expiryDate:'2026-11-29',daysToPush:-9,remainingQuantity:24,pushRequired:true,checkedAt:'2026-11-25T17:00:00Z',warnings:[]});
const page=(params:RecExpiryParams={},items=[batch(params.productId??31)],totalElements=items.length):RecExpiryPage=>({items,page:params.page??0,pageSize:params.pageSize??1,totalElements,asOfDate:'2026-11-26',timeZone:'Asia/Ho_Chi_Minh',checkedAt:'2026-11-25T17:00:00Z',warnings:[]});
const ready=(data:RecExpiryPage):ProductExpiry=>({status:'ready',data,readAt:Date.now()});
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return{promise,resolve};}
function setup(t:TestContext,role:AuthUser['role']='Merchandiser'){
  let actor:AuthUser|null={...user,role,storeId:1},epoch='expiry',notify=()=>{};
  t.mock.method(authService,'getCurrentUser',()=>actor);t.mock.method(authService,'getSessionId',()=>epoch);t.mock.method(authService,'getToken',()=>actor?'fixture':null);t.mock.method(authService,'subscribe',(listener:()=>void)=>{notify=listener;return()=>{};});
  t.mock.method(globalThis,'fetch',async()=>{throw Error('No live HTTP');});
  const list=t.mock.method(f06Api,'listExpiryPush',async(params:RecExpiryParams={})=>page(params));
  const model=new LiveRecommendationExpiry();t.after(model.stop);
  return{model,list,change:(next:AuthUser|null)=>{actor=next;epoch+='changed';notify();}};
}

test('Store-local calendar days stay exact across leap days, year boundaries and daylight saving',()=>{
  for(const [asOf,expiry,days] of [['2024-02-28','2024-03-01',2],['2023-02-28','2023-03-01',1],['2026-12-31','2027-01-01',1],['2026-03-08','2026-03-09',1],['2026-11-26','2026-11-26',0]] as const)assert.equal(daysUntilExpiry(expiry,asOf),days);
  for(const invalid of ['2026-02-29','2026-04-31','2026-13-01','2026-01-00','0000-01-01','bad','2026-11-26T00:00:00Z'])assert.equal(calendarDay(invalid),null);
  assert.equal(daysUntilExpiry(null,'2026-11-26'),null);assert.equal(daysUntilExpiry('2026-11-29','bad'),null);
});
test('expiry and Push Day copy handles singular, plural, zero, unknown and unexpected expired rows',()=>{
  assert.equal(pushDayLabel(0),'Push Day is today');assert.equal(pushDayLabel(-1),'Push Day overdue by 1 day');assert.equal(pushDayLabel(-9),'Push Day overdue by 9 days');
  assert.equal(expiryLabel('2026-11-26','2026-11-26'),'Expires today');assert.equal(expiryLabel('2026-11-27','2026-11-26'),'1 day left');assert.equal(expiryLabel('2026-11-29','2026-11-26'),'3 days left');
  assert.equal(expiryLabel(null,'2026-11-26'),'Expiry date not recorded');assert.equal(expiryLabel('bad','2026-11-26'),'Expiry date unavailable');assert.equal(expiryLabel('2026-11-25','2026-11-26'),'Expiry date passed 1 day ago');
  assert.equal(quantityLabel(1,'unit'),'1 unit');assert.equal(quantityLabel(24,'unit'),'24 units');
});
test('expiry modal copy tells the batch selling-priority story without changing facts or hiding missing dates',()=>{
  assert.equal(sellingPriorityLabel(-9),'Selling priority overdue by 9 days');assert.equal(sellingPriorityLabel(-1),'Selling priority overdue by 1 day');assert.equal(sellingPriorityLabel(0),'Selling priority starts today');assert.equal(sellingPriorityLabel(Number.NaN),'Selling-priority date unavailable');assert.equal(sellingPriorityLabel(2).includes('overdue'),false);
  for(const [date,expected] of [['2026-11-29','Expires in 3 days'],['2026-11-27','Expires in 1 day'],['2026-11-26','Expires today'],['2026-11-25','Expiry date passed 1 day ago'],[null,'Expiry date not recorded'],['bad','Expiry date unavailable']] as const)assert.equal(batchExpiryLabel(date,'2026-11-26'),expected);
  assert.equal(batchExpiryLabel('2026-11-29','bad'),'Expiry date unavailable');
  const value={...batch(),remainingQuantity:169},before=JSON.stringify(value),html=render(createElement(F06ExpiryBatchCard,{batch:value,data:page(),name:'Fresh milk'}));
  for(const text of ['Selling priority overdue by 9 days','Expires in 3 days','169 units remaining in this batch'])assert.ok(html.includes(text),text);assert.equal(JSON.stringify(value),before);assert.equal(html.includes('Push Day overdue by'),false);
});

test('only confirmed current batch data establishes priority, never an expiry risk score or missing metadata',()=>{
  assert.equal(confirmedDueBatch(batch(),'2026-11-26'),true);assert.equal(confirmedDueBatch({...batch(),expiryDate:null},'2026-11-26'),true);
  for(const bad of [{...batch(),pushRequired:false},{...batch(),daysToPush:1},{...batch(),pushDay:'2026-11-27'},{...batch(),expiryDate:'2026-11-25'},{...batch(),remainingQuantity:0},{...batch(),expiryDate:'bad'},{...batch(),pushDay:'bad'}])assert.equal(confirmedDueBatch(bad,'2026-11-26'),false);
  assert.deepEqual(confirmedProductBatches(undefined),[]);assert.deepEqual(confirmedProductBatches({status:'error',data:null,readAt:0}),[]);
});
test('missing Push Day retains exact product/batch references and never fabricates names or due counts',()=>{
  const original='Product 2225: batches [239, 240, 239] have no push day';assert.deepEqual(missingPushDayWarning(original),{productId:2225,batchIds:[239,240],original});
  for(const text of ['Product 999999999999999999: batches [239] have no push day','Product 31: batches [-1] have no push day','Product 31: batches [] have no push day'])assert.equal(missingPushDayWarning(text),null);
  const html=render(createElement(MissingPushDayWarnings,{warnings:[original,original],names:{2225:'Fresh milk'}}));assert.ok(html.includes('Missing Push Day (1 notice)'));assert.ok(html.includes('Fresh milk'));assert.ok(html.includes('Batch #239, Batch #240'));assert.equal(html.includes(original),false);
  assert.ok(html.includes('Store Admin needs to set a Push Day for these batches before selling-priority alerts can be calculated.'));
  assert.ok(html.indexOf('</details>')<html.indexOf('Store Admin needs to set a Push Day'),'Configuration guidance stays outside the collapsed batch list');
  assert.ok(render(createElement(MissingPushDayWarnings,{warnings:[original]})).includes('Product #2225'));
});
test('clickable expiry notification remains visible for due, zero, missing, loading and error states',()=>{
  const state:LiveExpiryState={role:'Merchandiser',summary:page({},[batch()],250),loading:false,error:'',products:{},scopeRevision:1};
  const html=(next:LiveExpiryState)=>render(createElement(F06ExpiryNoticeContent,{state:next,onOpen:()=>{}}));
  for(const next of [state,{...state,summary:page({},[],0)},{...state,summary:null,loading:true},{...state,summary:null,error:'Offline'}]){const value=html(next);assert.ok(value.startsWith('<button type="button"'));assert.ok(value.includes('aria-haspopup="dialog"'));assert.ok(value.includes('data-expiry-notice'));assert.ok(value.includes('Expiry Alerts'));assert.equal((value.match(/<button/g)||[]).length,1);}
  assert.ok(html(state).includes('250 batches need attention'));assert.ok(html({...state,summary:page({},[batch()],1)}).includes('1 batch needs attention'));
  const zero=html({...state,summary:page({},[],0)});assert.ok(zero.includes('No batches currently require selling priority.'));assert.ok(zero.includes('data-expiry-state="empty"'));assert.equal(zero.includes('bg-amber-50'),false);
  const missing=html({...state,summary:{...page({},[],0),warnings:['Product 31: batches [239] have no push day']}});assert.ok(missing.includes('Some batches need a Push Day.'));assert.ok(missing.includes('data-expiry-state="missing"'));assert.equal(missing.includes('0 batches need attention'),false);
  for(const next of [{...state,loading:true},{...state,error:'Offline'}]){const value=html(next);assert.equal(value.includes('250 batches'),false);assert.equal(value.includes('data-due-count='),false);}
});

test('batch cards keep batch quantity distinct from stock, show dates honestly and hide technical fields',()=>{
  const html=render(createElement(F06ExpiryBatchCard,{batch:batch(),data:page(),name:'Fresh milk'}));
  for(const text of ['Fresh milk','Batch #239','Selling priority overdue by 9 days','Expires in 3 days','24 units remaining in this batch','17/11/2026','29/11/2026'])assert.ok(html.includes(text),text);
  assert.doesNotMatch(html,/>-9<|Push required|Asia\/Ho_Chi_Minh|expiryPriorityScore/);
  assert.ok(html.includes('role="img" aria-label="Image unavailable for Fresh milk"'));assert.equal(html.includes('No image'),false,'Compact placeholder keeps accessible information without a tiny caption');
  const expired=render(createElement(F06ExpiryBatchCard,{batch:{...batch(),expiryDate:'2026-11-25'},data:page(),name:'Milk'}));assert.ok(expired.includes('Check current inventory availability'));
});

test('Store Rules has one consistent native action with a role-specific tooltip',()=>{
  for(const [merchant,text] of [[true,'View Store Rules'],[false,'Manage Store Rules']] as const){
    const html=render(createElement(F06StoreRulesButton,{merchant,onClick:()=>{}}));
    assert.ok(html.startsWith('<button type="button"'));assert.ok(html.includes('>Store Rules</button>'));assert.ok(html.includes('title="'+text+'"'));assert.ok(html.includes('aria-hidden="true"'));assert.doesNotMatch(html,/aria-hidden="true"[^>]*>View|disabled|role="menuitem"/);
  }
});
test('notification keeps authoritative totals separate from unknown and generic inventory warnings',()=>{
 const state:LiveExpiryState={role:'Store Admin',summary:page({},[],65),loading:false,error:'',products:{},scopeRevision:1};
 const renderNotice=(next:LiveExpiryState)=>render(createElement(F06ExpiryNoticeContent,{state:next,onOpen:()=>{}}));
 assert.ok(renderNotice(state).includes('data-due-count="65"'));assert.ok(renderNotice({...state,summary:page({},[],0)}).includes('data-due-count="0"'));
 const warning=renderNotice({...state,summary:{...page({},[],0),warnings:['Check inventory information']}});assert.ok(warning.includes('data-expiry-state="warning"'));assert.ok(warning.includes('Some inventory information needs checking.'));assert.equal(warning.includes('batches need attention'),false);
 assert.ok(renderNotice({...state,error:'Offline'}).includes('Expiry alerts are temporarily unavailable.'));
});

test('rule explanations keep actual values, two FBT conditions, exact percent precision and immutable drafts',()=>{
  const value={...policy,maxBundleSize:7,minSupportCount:3,minSupportRatio:0.123456,minConfidence:0.987654,minimumSellableQuantity:2},before=JSON.stringify(value);
  const html=render(createElement(F06RuleGroups,{policy:value}));
  for(const text of ['Each bundle can contain up to 7 products.','At least 98.7654% of transactions','at least 3 transactions and 12.3456%','at least 2 sellable units'])assert.ok(html.includes(text),text);
  assert.deepEqual([...html.matchAll(/data-rule-card[^>]*>/g)].length,4);
  const labels=[...html.matchAll(/<h3[^>]*>.*?<\/h3>/g)].map(match=>match[0].replace(/<[^>]*>/g,''));assert.deepEqual(labels,['Bundle','Cross-sell','Frequently Bought Together','Product Availability']);
  const draft={...ruleInputs(value),maxBundleSize:'9'},draftBefore=JSON.stringify(draft),edit=render(createElement(F06RuleGroups,{policy:value,draft,onEdit:()=>{}}));
  assert.ok(edit.includes('Each bundle can contain up to 9 products.'));assert.equal(JSON.stringify(draft),draftBefore);assert.equal(JSON.stringify(value),before);const singular=render(createElement(F06RuleGroups,{policy:{...value,minSupportCount:1,minimumSellableQuantity:1}}));assert.ok(singular.includes('at least 1 transaction and'));assert.ok(singular.includes('at least 1 sellable unit to be eligible.'));
});

test('Selling Priority shows exact relevant batches, complete product total and retains the original recommendation evidence',()=>{
  const item=recommendation(),before=JSON.stringify(item),products={31:ready(page({productId:31},[batch(),{...batch(31,240),remainingQuantity:1,expiryDate:'2026-11-27'}],8)),32:ready(page({productId:32},[],0))};
  const html=render(createElement(F06SellingPriorityContent,{ids:item.productIds,names:{31:'Milk',32:'Cookies'},products,refresh:()=>{}}));
  assert.ok(html.includes('Selling Priority'));assert.ok(html.includes('Batch #239'));assert.ok(html.includes('Batch #240'));assert.ok(html.includes('1 unit remaining'));assert.ok(html.includes('Showing 2 of 8 due batches'));assert.equal(html.includes('Cookies'),false);
  assert.equal(JSON.stringify(item),before);assert.equal(render(createElement(F06SellingPriorityContent,{ids:[32],products,refresh:()=>{}})),'');
  const tiles=render(createElement(F06ProductTiles,{ids:[31,32],names:{31:'Milk',32:'Cookies'},expiryPriority:new Set([31])}));assert.equal((tiles.match(/data-expiry-product=/g)??[]).length,1);assert.ok(tiles.includes('data-expiry-product="31"'));
});
test('rules retain all five exact values in four groups, proper units and no technical version heading',()=>{
  const value={...policy,minSupportRatio:0.123456,minimumSellableQuantity:1},before=JSON.stringify(value),html=render(createElement(F06RuleGroups,{policy:value}));
  for(const text of ['Bundle','Frequently Bought Together','Cross-sell','Product Availability','4 products','2 transactions','12.3456%','50%','1 unit'])assert.ok(html.includes(text),text);
  assert.equal((html.match(/<section/g)??[]).length,4);assert.doesNotMatch(html,/Rules version|Rule version|expectedVersion|Banner|<input/);
  const draft=ruleInputs(value),edited=render(createElement(F06RuleGroups,{policy:value,draft,onEdit:()=>{}}));assert.equal((edited.match(/<input/g)??[]).length,5);
  assert.equal(parseRuleInputs(draft,12).minSupportRatio,0.123456);assert.equal(parseRuleInputs(draft,12).expectedVersion,12);assert.equal(JSON.stringify(value),before);
});
test('summary loads before any analysis and duplicate visible products share bounded filtered reads',async t=>{
  const f=setup(t);f.model.start();await flush();assert.deepEqual(f.list.mock.calls[0].arguments[0],{page:0,pageSize:1});
  const first=f.model.watchProducts([31,31,32]),second=f.model.watchProducts([31]);await flush();
  assert.equal(f.list.mock.calls.filter(call=>call.arguments[0]?.productId===31).length,1);assert.equal(f.list.mock.calls.filter(call=>call.arguments[0]?.productId===32).length,1);
  assert.ok(f.list.mock.calls.every(call=>call.arguments[0]?.productId===undefined||call.arguments[0]?.pageSize===3));first();second();
});
test('a due product outside the global first page is confirmed by its own query; unknown reads stay optional',async t=>{
  const f=setup(t);f.list.mock.mockImplementation(async(params:RecExpiryParams={})=>{if(params.productId===99)throw new F06ApiError(500,'Offline');return params.productId===32?page(params,[],0):page(params,[batch(params.productId??31)],200);});
  f.model.start();await flush();const stop=f.model.watchProducts([44,32,99]);await flush();
  assert.equal(f.model.getSnapshot().summary!.items[0].productId,31);assert.equal(confirmedProductBatches(f.model.getSnapshot().products[44]).length,1);assert.deepEqual(confirmedProductBatches(f.model.getSnapshot().products[32]),[]);assert.equal(f.model.getSnapshot().products[99].status,'error');assert.equal(f.model.getSnapshot().error,'');stop();
});
test('expiry requests have at most three workers and stop when products leave the view',async t=>{
  const f=setup(t),pending=new Map<number,ReturnType<typeof deferred<RecExpiryPage>>>();
  f.list.mock.mockImplementation((params:RecExpiryParams={})=>{if(!params.productId)return Promise.resolve(page(params));const job=deferred<RecExpiryPage>();pending.set(params.productId,job);return job.promise;});
  f.model.start();await flush();const stop=f.model.watchProducts([31,32,33,34,35,36]);await flush();assert.equal(pending.size,3);
  const calls=f.list.mock.calls.filter(call=>call.arguments[0]?.productId);stop();assert.ok(calls.every(call=>call.arguments[1]?.aborted));
  for(const [id,job] of pending)job.resolve(page({productId:id,pageSize:3}));await flush();assert.equal(pending.size,3);assert.equal(f.model.getSnapshot().products[31],undefined);
});
test('manual refresh invalidates product caches; focus refresh is TTL bounded',async t=>{
  const f=setup(t);let now=100000;t.mock.method(Date,'now',()=>now);f.model.start();await flush();const stop=f.model.watchProducts([31]);await flush();
  const reads=f.list.mock.callCount();f.model.refreshIfStale();await flush();assert.equal(f.list.mock.callCount(),reads);
  now+=EXPIRY_CACHE_MS+1;f.model.refreshIfStale();await flush();assert.equal(f.list.mock.callCount(),reads+2);assert.equal(f.model.getSnapshot().products[31].status,'ready');stop();
});
test('Store/session change discards a late positive expiry result and cached product identity',async t=>{
  const f=setup(t),pending=deferred<RecExpiryPage>();f.model.start();await flush();
  f.list.mock.mockImplementation((params:RecExpiryParams={})=>params.productId?pending.promise:Promise.resolve(page(params,[],0)));
  f.model.watchProducts([31]);const signal=f.list.mock.calls.at(-1)!.arguments[1];f.change({...user,role:'Store Admin',storeId:2});await flush();pending.resolve(page({productId:31,pageSize:3}));await flush();
  assert.equal(signal?.aborted,true);assert.deepEqual(f.model.getSnapshot().products,{});assert.equal(f.model.getSnapshot().summary!.totalElements,0);
});
test('summary failures are never zero and wrong-product responses never produce an indicator',async t=>{
  const f=setup(t);f.list.mock.mockImplementation(async()=>{throw new F06ApiError(500,'Offline');});f.model.start();await flush();assert.equal(f.model.getSnapshot().summary,null);assert.ok(f.model.getSnapshot().error);
  f.list.mock.mockImplementation(async(params:RecExpiryParams={})=>page(params,[batch(99)]));f.model.watchProducts([31]);await flush();assert.equal(f.model.getSnapshot().products[31].status,'error');assert.deepEqual(confirmedProductBatches(f.model.getSnapshot().products[31]),[]);
});
for(const role of ['Merchandiser','Store Admin'] as const)test(role+' catalog picker uses actual paged server search and advertised images',async t=>{
  setup(t,role);const request=t.mock.method(authService,'request',async()=>Response.json({content:[{id:31,name:'Actual milk',sku:'SKU-31',imageUrl:'/api/products/31/image'}],page:1,pageSize:20,totalPages:4,totalElements:80}));
  const result=await readExpiryProducts('milk',1,new AbortController().signal),url=new URL(String(request.mock.calls[0].arguments[0]),'http://fixture');
  assert.equal(url.searchParams.get('search'),'milk');assert.equal(url.searchParams.get('page'),'1');assert.equal(url.searchParams.get('pageSize'),'20');assert.equal(result.hasMore,true);assert.deepEqual(result.items[0],{id:31,name:'Actual milk',sku:'SKU-31',imageUrl:'/api/products/31/image'});
});
test('catalog search rejects stale sessions and cannot be used by unauthorized roles',async t=>{
  const f=setup(t),pending=deferred<Response>(),request=t.mock.method(authService,'request',()=>pending.promise),read=readExpiryProducts('',0,new AbortController().signal);
  f.change({...user,role:'Merchandiser',storeId:2});pending.resolve(Response.json({content:[{id:31,name:'Old Store'}],page:0,totalPages:1}));await assert.rejects(read,/verified/);
  f.change({...user,role:'System Admin',storeId:null});await assert.rejects(readExpiryProducts('',0,new AbortController().signal));assert.equal(request.mock.callCount(),1);
});
test('optional expiry failure cannot block review or alter historical evidence, ranking or readiness',async t=>{
  const f=setup(t);f.list.mock.mockImplementation(async()=>{throw new F06ApiError(500,'Offline');});f.model.start();await flush();
  const item=recommendation(),before=JSON.stringify(item);t.mock.method(f05Api,'getRun',async()=>runFixture('COMPLETED'));t.mock.method(f05Api,'getRequest',async()=>requestFixture());
  t.mock.method(authService,'request',async()=>new Response(null,{status:404}));
  t.mock.method(f06Api,'list',async(params:RecListParams={})=>({items:[item],page:params.page??0,pageSize:params.pageSize??20,totalElements:1,ordering:'RANKED_WITHIN_SOURCE_RUN' as const}));t.mock.method(f06Api,'get',async()=>item);
  const approve=t.mock.method(f06Api,'approve',async()=>({...item,reviewStatus:'APPROVED' as const,version:2,readyForConsumption:false}));
  const browser=new RecommendationBrowser();browser.start(false);t.after(browser.stop);await browser.selectSource(42);await browser.openDetail(62);browser.prepareReview('approve','Current availability checked.');await browser.confirmReview();
  assert.equal(approve.mock.callCount(),1);assert.equal(browser.getSnapshot().detail!.reviewStatus,'APPROVED');assert.equal(browser.getSnapshot().detail!.readyForConsumption,false);assert.equal(JSON.stringify(item),before);
});

// Exercise the real FE HTTP parser and expiry response validator with HTTP 200 fixtures.
test('HTTP 200 summary is validated, isolated from product pages, deduplicated and never replaced by a false zero',async t=>{
 const f=setup(t);f.list.mock.restore();let mode:'ten'|'zero'|'invalid'='ten';
 const requests:URL[]=[];t.mock.method(authService,'request',async(input:RequestInfo|URL)=>{
  const url=new URL(String(input),'http://fixture');requests.push(url);assert.equal(url.pathname,'/api/recommendations/expiry-push');
  const productId=url.searchParams.has('productId')?Number(url.searchParams.get('productId')):undefined;
  const params={productId,page:Number(url.searchParams.get('page')),pageSize:Number(url.searchParams.get('pageSize'))};
  const data=productId===undefined?page(params,mode==='zero'?[]:[batch()],mode==='zero'?0:10):page(params,[batch(productId)],1);
  return Response.json(productId===undefined&&mode==='invalid'?{...data,totalElements:'10'}:data);
 });
 f.model.start();await flush();assert.equal(f.model.getSnapshot().summary?.totalElements,10);
 const stop=f.model.watchProducts([31,31,32]);await flush();assert.equal(f.model.getSnapshot().summary?.totalElements,10);
 assert.equal(requests.filter(url=>!url.searchParams.has('productId')).length,1);assert.equal(requests.filter(url=>url.searchParams.get('productId')==='31').length,1);
 mode='zero';await f.model.refresh();await flush();assert.equal(f.model.getSnapshot().summary?.totalElements,0);assert.ok(confirmedProductBatches(f.model.getSnapshot().products[31]).length>0);
 mode='invalid';await f.model.refresh();await flush();assert.equal(f.model.getSnapshot().summary,null);assert.ok(f.model.getSnapshot().error);
 const html=render(createElement(F06ExpiryNoticeContent,{state:f.model.getSnapshot(),onOpen:()=>{}}));assert.ok(html.includes('data-expiry-state="error"'));assert.equal(html.includes('data-due-count='),false);stop();
});
