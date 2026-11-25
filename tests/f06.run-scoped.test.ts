import { parseRecommendationJson } from '../src/features/f06/f06.numbers';
import assert from './f06.assert';
import { test, type TestContext } from 'node:test';
import { setImmediate as flush } from 'node:timers/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { authService, type AuthUser } from '../src/services/authService';
import { f05Api } from '../src/features/f05/f05.api';
import { f06Api, F06ApiError } from '../src/features/f06/f06.api';
import { RecommendationBrowser } from '../src/features/f06/f06.browse';
import { RecommendationGeneration, generationErrorMessage } from '../src/features/f06/f06.generate';
import { readRecommendationLocation, recommendationPath, recommendationReturnPath } from '../src/features/f06/f06.navigation';
import { F06DashboardContent } from '../src/features/f06/components/F06DashboardView';
import { F06GenerationSummary } from '../src/features/f06/components/F06GenerationResult';
import { StoreAnalysisContent } from '../src/features/f05/components/StoreAnalysisDetails';
import type { RunView } from '../src/features/f05/f05.types';
import type { RecListParams, RecPage, RecView } from '../src/features/f06/f06.types';
import { generation, recommendation, policy } from './f06.fixtures';
import { user, requestFixture, runFixture, progressFixture } from './f05.fixtures';

function deferred<T>() { let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return{promise,resolve}; }
function setup(t:TestContext,role:AuthUser['role']='Merchandiser') {
  let actor:AuthUser|null={...user,role,storeId:1},epoch='run-scope',notify=()=>{};
  t.mock.method(authService,'getCurrentUser',()=>actor);t.mock.method(authService,'getSessionId',()=>epoch);t.mock.method(authService,'getToken',()=>actor?'fixture':null);
  t.mock.method(authService,'subscribe',(listener:()=>void)=>{notify=listener;return()=>{};});
  t.mock.method(globalThis,'fetch',async()=>{throw Error('No live HTTP');});
  t.mock.method(authService,'request',async()=>new Response(null,{status:404}));
  const run=t.mock.method(f05Api,'getRun',async(id:number)=>({...runFixture('COMPLETED'),runId:id}));
  const request=t.mock.method(f05Api,'getRequest',async()=>requestFixture('FAILED'));
  const history=t.mock.method(f05Api,'listRequests',async()=>({items:[requestFixture('FAILED')],page:0,pageSize:20,totalElements:1}));
  const runs=t.mock.method(f05Api,'listRuns',async()=>[runFixture('COMPLETED')]);
  const list=t.mock.method(f06Api,'list',async(params:RecListParams={}):Promise<RecPage>=>{
    assert.ok(params.miningRunId,'Every Library request must include a run');
    const item=recommendation({sources:recommendation().sources.map(source=>({...source,runId:params.miningRunId!}))});
    return{items:[item],page:params.page??0,pageSize:params.pageSize??20,totalElements:45,ordering:'RANKED_WITHIN_SOURCE_RUN' as const};
  });
  t.mock.method(f06Api,'getConfig',async()=>policy);
  const generate=t.mock.method(f06Api,'generate',async()=>generation);
  const browser=new RecommendationBrowser();t.after(browser.stop);
  return{browser,run,request,history,runs,list,generate,change:(next:AuthUser|null)=>{actor=next;epoch+='-new';notify();}};
}

test('direct entry, refresh/reset and legacy history mode cannot issue an unscoped Library request',async t=>{
  const f=setup(t);f.browser.start();await flush();
  await f.browser.refresh();await f.browser.applyFilters({type:'BUNDLE'});await f.browser.setPage(1);
  assert.equal(f.list.mock.callCount(),0);assert.equal(f.generate.mock.callCount(),0);
  await f.browser.selectSource(42);await f.browser.applyFilters({reviewStatus:'APPROVED',pageSize:10});await f.browser.setPage(2);await f.browser.applyFilters({pageSize:20,type:'BUNDLE'});await f.browser.refresh();
  assert.ok(f.list.mock.calls.every(call=>call.arguments[0]?.miningRunId===42));
  assert.equal(f.browser.getSnapshot().page,0);assert.equal(f.browser.getSnapshot().miningRunId,42);
  f.browser.setMode('history');await flush();await f.browser.refresh();
  assert.ok(f.list.mock.calls.every(call=>call.arguments[0]?.miningRunId===42));
});
test('historical URL run resolves directly outside the first history page and preserves source identity',async t=>{
  const f=setup(t);f.browser.start(false);await f.browser.selectSource(902);
  assert.equal(f.history.mock.callCount(),0);assert.equal(f.run.mock.calls[0].arguments[0],902);
  assert.equal(f.request.mock.calls[0].arguments[0],17);assert.equal(f.browser.getSnapshot().sourceRun?.runId,902);
  assert.equal(f.list.mock.calls[0].arguments[0]?.miningRunId,902);assert.equal(f.generate.mock.callCount(),0);
});
for(const status of ['PENDING','RUNNING','FAILED','TIMED_OUT'] as const)test(`${status} run is rejected before recommendations or generation`,async t=>{
  const f=setup(t);f.run.mock.mockImplementation(async()=>runFixture(status));f.browser.start(false);await f.browser.selectSource(42);
  assert.match(f.browser.getSnapshot().error,/completed results/);assert.equal(f.list.mock.callCount(),0);assert.equal(f.generate.mock.callCount(),0);
});
test('wrong Store, mismatched source, absent run and unsafe ID fail closed without fallback',async t=>{
  const f=setup(t);f.browser.start(false);
  f.run.mock.mockImplementation(async()=>runFixture('COMPLETED',2));await f.browser.selectSource(42);assert.match(f.browser.getSnapshot().error,/unavailable/);
  f.run.mock.mockImplementation(async()=>runFixture('COMPLETED'));f.request.mock.mockImplementation(async()=>({...requestFixture(),snapshotId:9}));
  await f.browser.selectSource(42);assert.match(f.browser.getSnapshot().error,/could not be verified/);
  f.run.mock.mockImplementation(async()=>{throw new F06ApiError(404,'Analysis not found');});await f.browser.selectSource(99);assert.match(f.browser.getSnapshot().error,/unavailable/);
  await f.browser.selectSource(Number.MAX_SAFE_INTEGER+1);assert.equal(f.list.mock.callCount(),0);assert.equal(f.browser.getSnapshot().sourceRun,null);
});
test('switching run clears details, filters and pagination and rejects late source and list responses',async t=>{
  const f=setup(t);f.browser.start(false);await f.browser.selectSource(42);await f.browser.applyFilters({type:'BUNDLE',pageSize:10});await f.browser.setPage(1);
  t.mock.method(f06Api,'get',async()=>recommendation());await f.browser.openDetail(62);
  const late=deferred<RunView>();f.run.mock.mockImplementation((id:number)=>id===43?late.promise:Promise.resolve({...runFixture('COMPLETED'),runId:id}));
  const old=f.browser.selectSource(43);const oldSignal=f.run.mock.calls.at(-1)!.arguments[1];
  assert.equal(f.browser.getSnapshot().list,null);assert.equal(f.browser.getSnapshot().detailId,null);assert.equal(f.browser.getSnapshot().page,0);assert.deepEqual(f.browser.getSnapshot().filters,{pageSize:20,type:'BUNDLE'});
  await f.browser.selectSource(44);late.resolve({...runFixture('COMPLETED'),runId:43});await old;
  assert.equal(oldSignal?.aborted,true);assert.equal(f.browser.getSnapshot().miningRunId,44);
  const pending=deferred<RecPage>();f.list.mock.mockImplementation(()=>pending.promise);const oldList=f.browser.refresh();const listSignal=f.list.mock.calls.at(-1)!.arguments[1];
  f.list.mock.mockImplementation(async(params:RecListParams={})=>({items:[],page:0,pageSize:20,totalElements:0,ordering:'RANKED_WITHIN_SOURCE_RUN' as const}));
  await f.browser.selectSource(45);pending.resolve({items:[recommendation()],page:0,pageSize:20,totalElements:1,ordering:'RANKED_WITHIN_SOURCE_RUN' as const});await oldList;
  assert.equal(listSignal?.aborted,true);assert.equal(f.browser.getSnapshot().miningRunId,45);assert.equal(f.browser.getSnapshot().list?.items.length,0);
});
test('Store/session change cancels source validation and requires a new selection',async t=>{
  const f=setup(t);f.browser.start(false);const pending=deferred<RunView>();f.run.mock.mockImplementation(()=>pending.promise);
  const old=f.browser.selectSource(42);const signal=f.run.mock.calls[0].arguments[1];f.change({...user,role:'Merchandiser',storeId:2});pending.resolve(runFixture('COMPLETED'));await old;
  assert.equal(signal?.aborted,true);assert.equal(f.browser.getSnapshot().sourceRun,null);assert.equal(f.list.mock.callCount(),0);
});
test('source change cancels a pending review and ignores a late write response without replay',async t=>{
  const f=setup(t);f.browser.start(false);await f.browser.selectSource(42);
  t.mock.method(f06Api,'get',async()=>recommendation());const pending=deferred<RecView>();
  const approve=t.mock.method(f06Api,'approve',()=>pending.promise);
  await f.browser.openDetail(62);f.browser.prepareReview('approve','Review this exact suggestion.');const write=f.browser.confirmReview();
  const signal=approve.mock.calls[0].arguments[2];assert.equal(f.browser.getSnapshot().reviewPending,true);
  await f.browser.selectSource(43);pending.resolve(recommendation({reviewStatus:'APPROVED',version:2}));await write;
  assert.equal(signal?.aborted,true);assert.equal(approve.mock.callCount(),1);assert.equal(f.browser.getSnapshot().miningRunId,43);assert.equal(f.browser.getSnapshot().detail,null);assert.equal(f.browser.getSnapshot().reviewNotice,'');
});
test('mismatched recommendation source relations fail closed for list and Details',async t=>{
  const f=setup(t);f.browser.start(false);
  f.list.mock.mockImplementation(async()=>({items:[recommendation({snapshotId:9,sources:recommendation().sources.map(source=>({...source,snapshotId:9}))})],page:0,pageSize:20,totalElements:1,ordering:'RANKED_WITHIN_SOURCE_RUN' as const}));
  await f.browser.selectSource(42);assert.equal(f.browser.getSnapshot().list,null);assert.match(f.browser.getSnapshot().error,/could not be verified/);
  t.mock.method(f06Api,'get',async()=>recommendation({sources:recommendation().sources.map(source=>({...source,runId:43}))}));
  await f.browser.openDetail(62);assert.equal(f.browser.getSnapshot().detail,null);assert.match(f.browser.getSnapshot().detailError,/unavailable/);
});
test('empty filtered results never claim the run has no saved recommendations',async t=>{
  const f=setup(t);f.browser.start(false);await f.browser.selectSource(42);
  f.list.mock.mockImplementation(async()=>({items:[],page:0,pageSize:20,totalElements:0,ordering:'RANKED_WITHIN_SOURCE_RUN' as const}));await f.browser.applyFilters({type:'BANNER'});
  const html=renderToStaticMarkup(createElement(F06DashboardContent,{state:f.browser.getSnapshot(),workflow:f.browser}));
  assert.ok(html.includes('No banner recommendations were found for this analysis'));assert.equal(html.includes('No saved recommendations for this analysis'),false);assert.equal(f.generate.mock.callCount(),0);
});
test('selected-run generation defaults to four types, reuses validated source and does not load history or auto-submit',async t=>{
  const f=setup(t),flow=new RecommendationGeneration();t.after(flow.stop);
  flow.start({request:requestFixture('FAILED'),run:runFixture('COMPLETED')});await flush();
  assert.equal(f.history.mock.callCount(),0);assert.equal(f.generate.mock.callCount(),0);
  assert.deepEqual(flow.getSnapshot().types,['BUNDLE','CROSS_SELL','FBT','BANNER']);assert.equal(flow.getSnapshot().selectedRunId,42);
  await flow.generate();assert.deepEqual(f.generate.mock.calls[0].arguments[0],{miningRunId:42,types:['BUNDLE','CROSS_SELL','FBT','BANNER']});
  flow.toggleType('FBT');await flow.generate();assert.deepEqual(f.generate.mock.calls[1].arguments[0]?.types,['BUNDLE','CROSS_SELL','BANNER']);
});
test('Store Admin selected run cannot generate; generation safety limit gives fewer-types advice',async t=>{
  const f=setup(t,'Store Admin'),flow=new RecommendationGeneration();t.after(flow.stop);flow.start({request:requestFixture(),run:runFixture('COMPLETED')});await flow.generate();
  assert.equal(f.generate.mock.callCount(),0);assert.match(generationErrorMessage(new F06ApiError(409,'Generation exceeds the 10000 candidate safety limit; request fewer types')),/Select fewer recommendation types/);
});
test('reused approved candidates retain their identity, decision, source relations and exact utility',async t=>{
  const f=setup(t);const saved=recommendation({recommendationId:900,reviewStatus:'APPROVED',version:8,utility:(parseRecommendationJson('{"utility":12345678901.123456}') as RecView).utility,sources:[...recommendation().sources,{...recommendation().sources[0],runId:43}]});
  const frozen=JSON.stringify({...saved,utility:String(saved.utility)});f.list.mock.mockImplementation(async()=>({items:[saved],page:0,pageSize:20,totalElements:1,ordering:'RANKED_WITHIN_SOURCE_RUN' as const}));f.browser.start(false);await f.browser.selectSource(43);
  assert.equal(f.browser.getSnapshot().list?.items[0],saved);assert.equal(JSON.stringify({...saved,utility:String(saved.utility)}),frozen);assert.equal(f.generate.mock.callCount(),0);
  const html=renderToStaticMarkup(createElement(F06GenerationSummary,{result:{...generation,createdCount:0,reusedCount:1}}));assert.ok(html.includes('0 new suggestions'));assert.ok(html.includes('keep their review decisions'));assert.equal(html.includes('recommendation references'),false);
});
test('F05 completed displayed run exposes primary navigation only to its own Store roles',t=>{
  for(const role of ['Merchandiser','Store Admin','System Admin','End-Customer'] as const)for(const status of ['COMPLETED','RUNNING','FAILED','TIMED_OUT'] as const){
    setup(t,role);const run=runFixture(status),data={request:requestFixture('COMPLETED'),runs:[run],runDetail:run,progress:progressFixture('COMPLETED')};
    const html=renderToStaticMarkup(createElement(StoreAnalysisContent,{data,selectedRunId:42,onRun:()=>{},onReadError:()=>{}}));
    assert.equal(html.includes('>View Recommendations</button>'),status==='COMPLETED'&&(role==='Merchandiser'||role==='Store Admin'));
  }
});
test('run URL parsing, canonical paths and login recovery reject ambiguous/unsafe IDs and external redirects',()=>{
  assert.equal(recommendationPath(42),'/recommendations?miningRunId=42');assert.equal(readRecommendationLocation('?miningRunId=42').runId,42);
  for(const value of ['0','-1','1.2','1e3','9007199254740992','', '42&miningRunId=43'])assert.ok(readRecommendationLocation('?miningRunId='+value).error);
  assert.equal(readRecommendationLocation('').runId,null);assert.equal(recommendationReturnPath('?returnTo='+encodeURIComponent(recommendationPath(42))),recommendationPath(42));
  for(const value of ['https://evil.invalid/recommendations','//evil.invalid/recommendations','/admin/overview'])assert.equal(recommendationReturnPath('?returnTo='+encodeURIComponent(value)),null);
});
