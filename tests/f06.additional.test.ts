import assert from './f06.assert';
import {test,type TestContext} from 'node:test';
import {setImmediate as flush} from 'node:timers/promises';
import {createElement as h} from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {authService} from '../src/services/authService';
import {f05Api} from '../src/features/f05/f05.api';
import {f06Api,F06ApiError} from '../src/features/f06/f06.api';
import {RecommendationBrowser} from '../src/features/f06/f06.browse';
import {defaultGenerationTypes,RecommendationGeneration} from '../src/features/f06/f06.generate';
import {REC_TYPES} from '../src/features/f06/f06.validation';
import type {RecListParams,RecPage,RecType} from '../src/features/f06/f06.types';
import {F06GenerationPanel} from '../src/features/f06/components/F06GenerationModal';
import {F06GenerationSummary} from '../src/features/f06/components/F06GenerationResult';
import {F06AnalysisSummary} from '../src/features/f06/components/F06AnalysisSummary';
import {F06RankedSource} from '../src/features/f06/components/F06RankedSource';
import {F06DashboardContent} from '../src/features/f06/components/F06DashboardView';
import {requestFixture,runFixture,user} from './f05.fixtures';
import {generation,policy,recommendation} from './f06.fixtures';

const source={request:requestFixture('FAILED'),run:runFixture('COMPLETED')};
const counts:Record<RecType,number>={BUNDLE:32,CROSS_SELL:0,FBT:4,BANNER:0};
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return{promise,resolve};}
function setup(t:TestContext){
 let actor={...user,role:'Merchandiser' as const,storeId:1},session='more-fixture',notify=()=>{};
 t.mock.method(authService,'getCurrentUser',()=>actor);t.mock.method(authService,'getToken',()=> 'fixture');t.mock.method(authService,'getSessionId',()=>session);t.mock.method(authService,'subscribe',(fn:()=>void)=>{notify=fn;return()=>{};});
 t.mock.method(globalThis,'fetch',async()=>{throw Error('No live HTTP');});t.mock.method(authService,'request',async()=>new Response(null,{status:404}));
 t.mock.method(f05Api,'getRun',async(id:number)=>({...source.run,runId:id,storeId:actor.storeId}));t.mock.method(f05Api,'getRequest',async()=>({...source.request,storeId:actor.storeId}));t.mock.method(f05Api,'listRequests',async()=>({items:[],page:0,pageSize:20,totalElements:0}));
 t.mock.method(f06Api,'getConfig',async()=>policy);const post=t.mock.method(f06Api,'generate',async()=>generation);
 const read=async(params:RecListParams={}):Promise<RecPage>=>({items:[],page:params.page??0,pageSize:params.pageSize??20,totalElements:params.type?counts[params.type]:36,ordering:'RANKED_WITHIN_SOURCE_RUN'});
 const list=t.mock.method(f06Api,'list',read),browser=new RecommendationBrowser();browser.start(false);t.after(browser.stop);
 return{browser,list,read,post,change:()=>{actor={...actor,storeId:2};session+='changed';notify();}};
}

test('saved type counts use four bounded scoped totalElements reads across every review status and cache through filters',async t=>{
 const f=setup(t);await f.browser.selectSource(42);await flush();assert.deepEqual(f.browser.getSnapshot().typeCounts,counts);
 const metadata=f.list.mock.calls.filter(call=>call.arguments[0]?.type&&call.arguments[0]?.pageSize===1);
 assert.equal(metadata.length,4);for(const call of metadata){const p=call.arguments[0]!;assert.deepEqual(p,{miningRunId:42,type:p.type,page:0,pageSize:1});}
 assert.equal(f.browser.getSnapshot().typeCounts.BUNDLE,32,'totalElements is authoritative even though items is empty');
 await f.browser.applyFilters({type:'BUNDLE',reviewStatus:'REJECTED',pageSize:10});await f.browser.setPage(1);assert.equal(f.list.mock.calls.filter(call=>call.arguments[0]?.type&&call.arguments[0]?.pageSize===1).length,4);
 await f.browser.refresh(true);await flush();assert.equal(f.list.mock.calls.filter(call=>call.arguments[0]?.type&&call.arguments[0]?.pageSize===1).length,8,'explicit refresh invalidates counts');
});

test('failed or invalid count responses remain unknown and do not block the Library or valid generation',async t=>{
 const f=setup(t);f.list.mock.mockImplementation(async(p:RecListParams={})=>{
  if(p.pageSize===1&&p.type==='FBT')throw new F06ApiError(409,'Rank scope exceeds 10000 candidates');
  if(p.pageSize===1&&p.type==='BUNDLE')return{...await f.read(p),items:[recommendation({storeId:2})]};
  return f.read(p);
 });
 await f.browser.selectSource(42);await flush();assert.deepEqual(f.browser.getSnapshot().typeCounts,{CROSS_SELL:0,BANNER:0});assert.equal(f.browser.getSnapshot().countsLoading,false);assert.equal(f.browser.getSnapshot().error,'');
 const flow=new RecommendationGeneration();flow.start(source);t.after(flow.stop);await flow.generate();assert.equal(f.post.mock.callCount(),1);
});

test('late count responses are aborted and ignored after run selection and Store change',async t=>{
 const f=setup(t),pending=deferred<RecPage>();let held=true;
 f.list.mock.mockImplementation((p:RecListParams={})=>held&&p.pageSize===1&&p.type?pending.promise:f.read(p));
 await f.browser.selectSource(42);const old=f.list.mock.calls.filter(call=>call.arguments[0]?.type&&call.arguments[0]?.pageSize===1);assert.equal(old.length,2,'two reads in flight at most');
 held=false;await f.browser.selectSource(43);await flush();pending.resolve({items:[],page:0,pageSize:1,totalElements:999,ordering:'RANKED_WITHIN_SOURCE_RUN'});await flush();
 assert.ok(old.every(call=>call.arguments[1]?.aborted));assert.deepEqual(f.browser.getSnapshot().typeCounts,counts);
 f.change();assert.deepEqual(f.browser.getSnapshot().typeCounts,{});assert.equal(f.browser.getSnapshot().countsLoading,false);f.browser.stop();
});

test('refresh supersedes count reads and unmount prevents late count updates',async t=>{
 const f=setup(t);let pending=deferred<RecPage>(),held=true;
 f.list.mock.mockImplementation((p:RecListParams={})=>held&&p.pageSize===1&&p.type?pending.promise:f.read(p));
 await f.browser.selectSource(42);const signals=f.list.mock.calls.filter(call=>call.arguments[0]?.type&&call.arguments[0]?.pageSize===1).map(call=>call.arguments[1]);
 held=false;await f.browser.refresh(true);await flush();pending.resolve({items:[],page:0,pageSize:1,totalElements:999,ordering:'RANKED_WITHIN_SOURCE_RUN'});await flush();assert.ok(signals.every(signal=>signal?.aborted));assert.deepEqual(f.browser.getSnapshot().typeCounts,counts);
 pending=deferred<RecPage>();held=true;await f.browser.refresh(true);f.browser.stop();const before=f.browser.getSnapshot();pending.resolve({items:[],page:0,pageSize:1,totalElements:777,ordering:'RANKED_WITHIN_SOURCE_RUN'});await flush();assert.equal(f.browser.getSnapshot(),before);
});

test('analysis rows keep both years across year boundaries and show actual status without selection decorations',t=>{
 setup(t);const workflow=new RecommendationBrowser(),request={...source.request,snapshot:{...source.request.snapshot,rangeStart:'2025-12-24',rangeEnd:'2026-01-05'}};
 const state={...workflow.getSnapshot(),requests:{items:[request],page:0,pageSize:20,totalElements:1}},html=render(h(F06RankedSource,{state,workflow}));
 assert.ok(html.includes('24/12/2025'));assert.ok(html.includes('05/01/2026'));assert.ok(html.includes('Failed'));assert.ok(html.includes('data-analysis-columns'));assert.equal(html.includes('<svg'),false);assert.equal(html.includes('type="radio"'),false);assert.equal(html.includes('<dialog'),false);assert.ok(html.includes('Select Analysis'));
});

test('first generation, missing types, existing types and incomplete counts get the specified defaults',()=>{
 assert.deepEqual(defaultGenerationTypes(false,counts),REC_TYPES);
 assert.deepEqual(defaultGenerationTypes(true,counts),['CROSS_SELL','BANNER']);
 assert.deepEqual(defaultGenerationTypes(true,{BUNDLE:1,CROSS_SELL:2,FBT:3,BANNER:4}),REC_TYPES);
 for(const partial of [{},{BUNDLE:0},{...counts,FBT:undefined},{...counts,FBT:-1}])assert.deepEqual(defaultGenerationTypes(true,partial),REC_TYPES);
});

for(const size of [1,2,3,4])test(`${size} selected type(s) submit only those types and existing types stay selectable`,async t=>{
 const f=setup(t),types=[...REC_TYPES].slice(0,size),flow=new RecommendationGeneration();flow.start(source,defaultGenerationTypes(true,counts));t.after(flow.stop);
 flow.selectTypes(types);await flow.generate();assert.deepEqual(f.post.mock.calls[0].arguments[0],{miningRunId:42,types});
 flow.selectTypes([]);await flow.generate();assert.equal(f.post.mock.callCount(),1);assert.ok(flow.getSnapshot().generationError.includes('Select at least one'));
});

test('additional modal displays known, zero and unknown saved counts and compact source with selected count',t=>{
 setup(t);const html=render(h(F06GenerationPanel,{source,additional:true,savedCounts:{BUNDLE:32,CROSS_SELL:0,FBT:4},onClose:()=>{},onCheckSaved:()=>{},onGenerated:()=>{},onPendingChange:()=>{}}));
 for(const text of ['Generate More Recommendations','32 saved recommendations','No saved recommendations','Recommendation count unavailable','4 of 4 types selected','Deselect all','Existing recommendations and review decisions will be preserved.'])assert.ok(html.includes(text),text);
 assert.equal(html.includes('CURRENTLY VIEWING'),false);assert.equal(html.includes('Created on'),false);assert.equal((html.match(/type="checkbox"/g)||[]).length,4);
 const defaults=render(h(F06GenerationPanel,{source,additional:true,savedCounts:counts,onClose:()=>{},onCheckSaved:()=>{},onGenerated:()=>{},onPendingChange:()=>{}}));assert.ok(defaults.includes('2 of 4 types selected'));assert.equal((defaults.match(/checked=""/g)||[]).length,2);
});

test('main summary and generation action retain actual request/run identity and separate read-only roles',t=>{
 setup(t);const flow=new RecommendationBrowser(),state={...flow.getSnapshot(),request:source.request,sourceRun:source.run,miningRunId:42,runTotal:36};
 const summary=render(h(F06AnalysisSummary,{...source}));for(const text of ['CURRENTLY VIEWING','Analysis #17','Result #42','#1D3C30','#F7FAF7','Analysis completed'])assert.ok(summary.includes(text),text);
 const merchant=render(h(F06DashboardContent,{state,workflow:flow,onGenerate:()=>{}}));assert.equal((merchant.match(/>Generate More<\/button>/g)||[]).length,1);assert.ok(merchant.includes('Recommendations from Analysis #17'));assert.equal(merchant.includes('>Generate Recommendations</button>'),false);
 const admin=render(h(F06DashboardContent,{state:{...state,role:'Store Admin'},workflow:flow,onGenerate:()=>{}}));assert.equal(admin.includes('>Generate More</button>'),false);
});

test('generation feedback accurately distinguishes new, reused and no-result responses without altering decisions',()=>{
 for(const [created,reused,expected] of [[12,0,'12 new recommendations added.'],[0,8,'8 existing recommendations retained.'],[0,0,'No new recommendations were added.']] as const){const result={...generation,createdCount:created,reusedCount:reused},before=JSON.stringify(result),html=render(h(F06GenerationSummary,{result}));assert.ok(html.includes(expected));assert.equal(JSON.stringify(result),before);if(created===0)assert.equal(html.includes('new recommendations added.'),false);}
});
