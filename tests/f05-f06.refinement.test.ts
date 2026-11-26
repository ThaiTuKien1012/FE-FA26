import assert from './f06.assert';
import { test, type TestContext } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { authService, type AuthUser } from '../src/services/authService';
import { f05Api } from '../src/features/f05/f05.api';
import { f06Api, F06ApiError } from '../src/features/f06/f06.api';
import { RecommendationBrowser } from '../src/features/f06/f06.browse';
import { F06DashboardContent } from '../src/features/f06/components/F06DashboardView';
import { StoreAnalysisDetails, initialCompletedRunId, recommendationRun } from '../src/features/f05/components/StoreAnalysisDetails';
import type { RecListParams, RecPage } from '../src/features/f06/f06.types';
import { recommendation } from './f06.fixtures';
import { user, requestFixture, runFixture, progressFixture } from './f05.fixtures';

function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return{promise,resolve};}
function setup(t:TestContext,role:AuthUser['role']='Merchandiser'){
  let actor:AuthUser|null={...user,role,storeId:1},epoch='refinement',notify=()=>{};
  t.mock.method(authService,'getCurrentUser',()=>actor);t.mock.method(authService,'getToken',()=>actor?'fixture':null);t.mock.method(authService,'getSessionId',()=>epoch);
  t.mock.method(authService,'subscribe',(listener:()=>void)=>{notify=listener;return()=>{};});
  t.mock.method(globalThis,'fetch',async()=>{throw Error('No live HTTP');});
  t.mock.method(authService,'request',async()=>new Response(null,{status:404}));
  t.mock.method(f05Api,'getRun',async(id:number)=>({...runFixture('COMPLETED'),runId:id}));t.mock.method(f05Api,'getRequest',async()=>requestFixture());
  t.mock.method(f05Api,'listRequests',async()=>({items:[],page:0,pageSize:20,totalElements:0}));
  const totals=new Map([[42,1],[43,1]]);
  const read=async(params:RecListParams={}):Promise<RecPage>=>{
    assert.ok(params.miningRunId,'No unscoped list');
    const total=totals.get(params.miningRunId!)??0;
    if(!params.type)assert.deepEqual(params,{miningRunId:params.miningRunId,page:0,pageSize:1});
    const matches=total>0&&(!params.type||params.type==='BANNER')&&!params.reviewStatus;
    return{items:matches?[recommendation({type:'BANNER',sources:recommendation().sources.map(source=>({...source,runId:params.miningRunId!}))})]:[],page:params.page??0,pageSize:params.pageSize??20,totalElements:matches?total:0,ordering:'RANKED_WITHIN_SOURCE_RUN'};
  };
  const list=t.mock.method(f06Api,'list',read),browser=new RecommendationBrowser();browser.start(false);t.after(browser.stop);
  const html=(attempted=false)=>render(createElement(F06DashboardContent,{state:browser.getSnapshot(),workflow:browser,onGenerate:()=>{},generationAttempted:attempted}));
  return{browser,list,read,totals,html,change:(next:AuthUser|null)=>{actor=next;epoch+='changed';notify();}};
}

test('run-wide zero alone displays the prominent empty panel and a single Generate action',async t=>{
  const f=setup(t);f.totals.set(42,0);await f.browser.selectSource(42);
  assert.equal(f.browser.getSnapshot().runTotal,0);assert.equal(f.list.mock.callCount(),1);
  const html=f.html();for(const text of ['Ready to Generate Recommendations','Recommendation Library','Selected analysis','Change Analysis'])assert.ok(html.includes(text),text);
  assert.equal(html.includes('Store tools'),false,'Store utilities live outside the run-dependent library');
  assert.equal((html.match(/>Generate Recommendations<\/button>/g)??[]).length,1);
  assert.doesNotMatch(html,/role="tab"|f06-filter-review|f06-filter-size|matching recommendations|Review one suggestion|recommendations pages/);
  const attempted=f.html(true);assert.ok(attempted.includes('No Recommendations Found'));assert.ok(attempted.includes('No recommendations met your store'));assert.equal(attempted.includes('no recommendations have been generated yet'),false);
});

test('Store Admin run-wide zero is read-only without a Generate action',async t=>{
  const f=setup(t,'Store Admin');f.totals.set(42,0);await f.browser.selectSource(42);
  const html=f.html();assert.ok(html.includes('Awaiting Recommendations'));assert.ok(html.includes('awaiting recommendations from your Merchandiser'));assert.doesNotMatch(html,/>Generate Recommendations<\/button>|role="tab"/);
});

test('empty type and empty review filter retain normal controls and cannot become run-wide empty',async t=>{
  const f=setup(t);await f.browser.selectSource(42);
  assert.equal(f.browser.getSnapshot().runTotal,1);assert.ok(f.html().includes('No bundle recommendations found for this analysis.'));
  assert.equal((f.html().match(/role="tab"/g)??[]).length,4);assert.equal(f.html().includes('Ready to Generate Recommendations'),false);
  await f.browser.applyFilters({type:'BANNER'});assert.equal(f.browser.getSnapshot().list!.items.length,1);
  await f.browser.applyFilters({type:'BANNER',reviewStatus:'APPROVED'});assert.ok(f.html().includes('No recommendations match the selected review status.'));assert.ok(f.html().includes('Clear Review Filter'));
  await f.browser.applyFilters({...f.browser.getSnapshot().filters,reviewStatus:undefined});assert.equal(f.browser.getSnapshot().list!.items.length,1);
  assert.equal(f.list.mock.calls.filter(call=>!call.arguments[0]?.type).length,1,'No repeated availability check when filtering');
});

test('manual refresh and successful generation recheck availability, paging/filtering do not',async t=>{
  const f=setup(t);f.totals.set(42,0);await f.browser.selectSource(42);assert.ok(f.html().includes('Ready to Generate Recommendations'));
  f.totals.set(42,1);await f.browser.applyFilters({type:'BANNER'},true);assert.equal(f.browser.getSnapshot().runTotal,1);assert.ok(f.html().includes('data-recommendation-card'));
  await f.browser.applyFilters({type:'BANNER',pageSize:10});await f.browser.setPage(0);
  assert.equal(f.list.mock.calls.filter(call=>!call.arguments[0]?.type).length,2);
  f.totals.set(42,0);await f.browser.refresh(true);assert.equal(f.browser.getSnapshot().runTotal,0);assert.ok(f.html().includes('Ready to Generate Recommendations'));
  assert.equal(f.list.mock.calls.filter(call=>!call.arguments[0]?.type).length,3);
});

test('availability loading, failure and ranked limit remain unknown, never fabricated zero',async t=>{
  const f=setup(t),pending=deferred<RecPage>();f.list.mock.mockImplementation(()=>pending.promise);
  const selection=f.browser.selectSource(42);await new Promise(done=>setImmediate(done));
  assert.equal(f.browser.getSnapshot().availabilityLoading,true);assert.ok(f.html().includes('Checking saved recommendations'));assert.equal(f.html().includes('Ready to Generate Recommendations'),false);
  pending.resolve({items:[],page:0,pageSize:1,totalElements:0,ordering:'RANKED_WITHIN_SOURCE_RUN'});await selection;
  f.list.mock.mockImplementation(async()=>{throw new F06ApiError(409,'Rank scope exceeds 10000 candidates');});await f.browser.refresh(true);
  assert.equal(f.browser.getSnapshot().runTotal,null);assert.ok(f.html().includes('Choose another analysis'));assert.ok(f.html().includes('Retry Recommendations'));assert.equal(f.html().includes('Ready to Generate Recommendations'),false);
  const calls=f.list.mock.callCount();await new Promise(done=>setImmediate(done));assert.equal(f.list.mock.callCount(),calls,'No automatic retry');
  f.list.mock.mockImplementation(f.read);await f.browser.refresh(true);assert.equal(f.browser.getSnapshot().runTotal,1);
});

test('late availability zero cannot replace another analysis and logout clears its cached total',async t=>{
  const f=setup(t),pending=deferred<RecPage>();f.list.mock.mockImplementation((params:RecListParams={})=>params.miningRunId===42&&!params.type?pending.promise:f.read(params));
  const first=f.browser.selectSource(42);await new Promise(done=>setImmediate(done));const signal=f.list.mock.calls[0].arguments[1];
  await f.browser.selectSource(43);pending.resolve({items:[],page:0,pageSize:1,totalElements:0,ordering:'RANKED_WITHIN_SOURCE_RUN'});await first;
  assert.equal(signal?.aborted,true);assert.equal(f.browser.getSnapshot().miningRunId,43);assert.equal(f.browser.getSnapshot().runTotal,1);assert.equal(f.html().includes('Ready to Generate Recommendations'),false);
  const afterLogout=deferred<RecPage>();f.list.mock.mockImplementation(()=>afterLogout.promise);
  const refreshing=f.browser.refresh(true),logoutSignal=f.list.mock.calls.at(-1)!.arguments[1];f.change(null);
  afterLogout.resolve({items:[],page:0,pageSize:1,totalElements:0,ordering:'RANKED_WITHIN_SOURCE_RUN'});await refreshing;
  assert.equal(logoutSignal?.aborted,true);assert.equal(f.browser.getSnapshot().runTotal,null);assert.equal(f.browser.getSnapshot().sourceRun,null);
});

test('availability rejects another Store/snapshot/source even when totalElements is positive',async t=>{
  const f=setup(t);
  for(const item of [recommendation({storeId:2}),recommendation({snapshotId:9}),recommendation({sources:[{...recommendation().sources[0],runId:99}]})]){
    f.list.mock.mockImplementation(async():Promise<RecPage>=>({items:[item],page:0,pageSize:1,totalElements:1,ordering:'RANKED_WITHIN_SOURCE_RUN'}));await f.browser.selectSource(42);
    assert.equal(f.browser.getSnapshot().runTotal,null);assert.ok(f.browser.getSnapshot().availabilityError);assert.equal(f.html().includes('Ready to Generate Recommendations'),false);
  }
});

test('Store analysis auto-selection is explicit and validated navigation is rendered only once in the modal footer',t=>{
  setup(t);const request=requestFixture('COMPLETED'),run=runFixture('COMPLETED'),progress=progressFixture('COMPLETED');
  const data={request,runs:[run],runDetail:run,progress};assert.equal(initialCompletedRunId(data),42);assert.equal(recommendationRun(data,42)?.runId,42);
  const html=render(createElement(StoreAnalysisDetails,{data,loading:false,selectedRunId:42,onRun:()=>{},onRefresh:()=>{},onClose:()=>{},onReadError:()=>{}}));
  assert.ok(html.includes('<dialog'));assert.ok(html.includes('aria-modal="true"'));assert.match(html,/<footer[^>]*>.*View Recommendations/s);
  assert.equal((html.match(/>View Recommendations<\/button>/g)??[]).length,1);assert.ok(html.includes('Loading product combinations'));
  assert.doesNotMatch(html,/View Results|Hide Results|data-store-run-grid|max-w-2xl/);
  assert.ok(html.includes('Utility Score reflects weighted product value, not revenue, profit, or purchase frequency.'));
  const second={...run,runId:43};assert.equal(initialCompletedRunId({...data,runs:[run,second],progress:{...progress,currentRunId:43}}),43);
  assert.equal(initialCompletedRunId({...data,runs:[{...run,status:'RUNNING'}]}),null);
  for(const bad of [{...run,status:'RUNNING' as const},{...run,storeId:2},{...run,requestId:19},{...run,snapshotId:9},{...run,inputHash:'other'}])assert.equal(recommendationRun({...data,runDetail:bad},42),null);
  const selectedSecond={...data,runs:[run,second],runDetail:second};assert.equal(recommendationRun(selectedSecond,43)?.runId,43);
  const multi=render(createElement(StoreAnalysisDetails,{data:selectedSecond,loading:false,selectedRunId:43,onRun:()=>{},onRefresh:()=>{},onClose:()=>{},onReadError:()=>{}}));assert.ok(multi.includes('f05-result-run'));assert.ok(multi.includes('Run #43'));assert.equal((multi.match(/>View Recommendations<\/button>/g)??[]).length,1);
  const partial=render(createElement(StoreAnalysisDetails,{data:{...data,runs:[run,{...second,status:'FAILED'}]},loading:false,selectedRunId:42,onRun:()=>{},onRefresh:()=>{},onClose:()=>{},onReadError:()=>{}}));assert.equal(partial.includes('f05-result-run'),false,'No redundant selector for one completed result');
});
