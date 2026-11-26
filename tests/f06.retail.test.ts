import assert from './f06.assert';
import { test, type TestContext } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { authService, type AuthUser } from '../src/services/authService';
import { f05Api } from '../src/features/f05/f05.api';
import { f06Api, F06ApiError } from '../src/features/f06/f06.api';
import { RecommendationBrowser } from '../src/features/f06/f06.browse';
import { ExactRecommendationNumber, parseRecommendationJson } from '../src/features/f06/f06.numbers';
import { productNames, recommendationRationale, recommendationPurchaseEvidence, recommendationWarning } from '../src/features/f06/f06.presentation';
import { recommendationError } from '../src/features/f06/f06.errors';
import { F06RecommendationCards } from '../src/features/f06/components/F06RecommendationCards';
import { F06RecommendationDetailContent, F06RecommendationDetails } from '../src/features/f06/components/F06RecommendationDetails';
import { F06ReviewForm } from '../src/features/f06/components/F06ReviewForm';
import { F06DashboardContent } from '../src/features/f06/components/F06DashboardView';
import { recommendationReadiness } from '../src/features/f06/components/F06ReadShared';
import type { RecListParams, RecView, RecType, RecPage, RecReviewRequest } from '../src/features/f06/f06.types';
import { recommendation, eligibility } from './f06.fixtures';
import { user, requestFixture, runFixture } from './f05.fixtures';

const names={31:'Noodles',32:'Sausages',33:'Eggs',34:'Sauce'};
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return{promise,resolve};}
function setup(t:TestContext,role:AuthUser['role']='Merchandiser') {
  let actor:AuthUser|null={...user,role,storeId:1},epoch='retail',notify=()=>{};
  t.mock.method(authService,'getCurrentUser',()=>actor);t.mock.method(authService,'getSessionId',()=>epoch);t.mock.method(authService,'getToken',()=>actor?'fixture':null);
  t.mock.method(authService,'subscribe',(listener:()=>void)=>{notify=listener;return()=>{};});
  t.mock.method(globalThis,'fetch',async()=>{throw Error('No live HTTP');});
  t.mock.method(authService,'request',async(input:RequestInfo|URL)=>{const id=Number(String(input).split('/').at(-1));return Response.json({id,name:names[id as keyof typeof names]??'Fixture product'});});
  t.mock.method(f05Api,'getRun',async(id:number)=>({...runFixture('COMPLETED'),runId:id}));t.mock.method(f05Api,'getRequest',async()=>requestFixture());
  t.mock.method(f05Api,'listRequests',async()=>({items:[],page:0,pageSize:20,totalElements:0}));
  const records=new Map<number,RecView>([
    [62,recommendation()],[63,recommendation({recommendationId:63})],
    [64,recommendation({recommendationId:64,type:'CROSS_SELL',anchorProductId:31})],
    [65,recommendation({recommendationId:65,type:'FBT'})],[66,recommendation({recommendationId:66,type:'BANNER',productIds:[31]})]
  ]);
  const listRead=async(params:RecListParams={}):Promise<RecPage>=>{
    assert.ok(params.miningRunId,'Every request must specify the run');
    if(!params.type)assert.deepEqual(params,{miningRunId:42,page:0,pageSize:1},'Only the bounded run-wide check omits type/status');
    const items=[...records.values()].filter(item=>(!params.type||item.type===params.type)&&(!params.reviewStatus||item.reviewStatus===params.reviewStatus));
    const page=params.page??0,size=params.pageSize??20;
    return{items:items.slice(page*size,(page+1)*size),page,pageSize:size,totalElements:items.length,ordering:'RANKED_WITHIN_SOURCE_RUN' as const};
  };
  const list=t.mock.method(f06Api,'list',listRead);
  const getRead=async(id:number)=>{const item=records.get(id);if(!item)throw new F06ApiError(404,'Missing');return item;};
  const get=t.mock.method(f06Api,'get',getRead);
  const save=(id:number,status:'APPROVED'|'REJECTED',version:number,reason:string)=>{
    const current=records.get(id)!;assert.equal(version,current.version);
    const result={...current,reviewStatus:status,version:version+1,reviewReason:reason,reviewedAt:'2026-11-25T00:00:00Z',reviewedBy:12,readyForConsumption:status==='APPROVED',reviewHistory:[{oldStatus:'PENDING_REVIEW' as const,newStatus:status,reviewedBy:12,reviewedAt:'2026-11-25T00:00:00Z',reason,resultingVersion:version+1,eligibilityCheck:eligibility()}]};records.set(id,result);return result;
  };
  const approve=t.mock.method(f06Api,'approve',async(id:number,request:RecReviewRequest)=>save(id,'APPROVED',request.expectedVersion,request.reason));
  const reject=t.mock.method(f06Api,'reject',async(id:number,request:RecReviewRequest)=>save(id,'REJECTED',request.expectedVersion,request.reason));
  const browser=new RecommendationBrowser();browser.start(false);t.after(browser.stop);
  return{browser,records,list,get,listRead,getRead,approve,reject,change:(next:AuthUser|null)=>{actor=next;epoch+='-changed';notify();}};
}
async function review(f:ReturnType<typeof setup>,id=62,action:'approve'|'reject'='approve') {
  await f.browser.selectSource(42);await f.browser.applyFilters({type:'BUNDLE',reviewStatus:'PENDING_REVIEW'});await f.browser.openDetail(id);
  f.browser.prepareReview(action,'Reviewed the recorded evidence.');await f.browser.confirmReview();
}

test('retail proposals use names, correct conjunctions and no invented commercial outcomes',()=>{
  const expected:Record<RecType,string>={BUNDLE:'Offer Noodles and Sausages as a bundle.',CROSS_SELL:'Suggest Sausages when customers select Noodles.',FBT:'Display Noodles and Sausages together based on past purchases.',BANNER:'Feature Noodles and Sausages in a promotional banner.'};
  for(const type of Object.keys(expected) as RecType[])assert.equal(recommendationRationale(recommendation({type,anchorProductId:type==='CROSS_SELL'?31:null}),names),expected[type]);
  assert.equal(productNames([31,32,33,34],names),'Noodles, Sausages, Eggs, and Sauce');
  assert.equal(productNames([31],names),'Noodles');assert.equal(productNames([31,32],{}),'these products');
  for(const type of Object.keys(expected) as RecType[])assert.doesNotMatch(recommendationRationale(recommendation({type,anchorProductId:31}),{}),/Product #|profit|increase|discount|guarantee|already active/);
});
test('overall and directional evidence use different exact saved denominators',()=>{
  const item=recommendation({type:'CROSS_SELL',anchorProductId:31,evidence:{totalTransactions:1000,supportCount:120,supportRatio:0.12,anchorSupportCount:300,confidence:0.4,status:'AVAILABLE'}});
  const before=JSON.stringify(item),evidence=recommendationPurchaseEvidence(item,names);
  assert.equal(evidence.groupSentence,'Bought together in 120 of 1,000 analyzed transactions.');assert.equal(evidence.groupPercent,'12%');
  assert.equal(evidence.directionalSentence,'120 of 300 transactions containing Noodles also included Sausages (40%).');assert.equal(JSON.stringify(item),before);
  assert.equal(recommendationPurchaseEvidence({...item,anchorProductId:32},names).directionalSentence,'120 of 300 transactions containing Sausages also included Noodles (40%).');
});
test('single-product Banner describes presence, missing evidence is unavailable and a real zero stays zero',()=>{
  const one=recommendation({type:'BANNER',productIds:[31]});assert.equal(recommendationPurchaseEvidence(one).groupSentence,'Present in 2 of 6 analyzed transactions.');
  const missing=recommendation({evidence:{totalTransactions:0,supportCount:null,supportRatio:null,anchorSupportCount:null,confidence:null,status:'EVIDENCE_UNAVAILABLE'}});
  assert.equal(recommendationPurchaseEvidence(missing).groupSentence,'Historical purchase data is unavailable.');assert.equal(recommendationPurchaseEvidence(missing).groupPercent,null);
  const missingDetails=render(createElement(F06RecommendationDetailContent,{item:missing,names}));
  assert.ok(missingDetails.includes('Historical purchase data is unavailable.'));
  assert.match(missingDetails,/Total analyzed transactions<\/dt><dd[^>]*>Unavailable<\/dd>/);
  const zero={...missing,evidence:{...missing.evidence,totalTransactions:100,supportCount:0,supportRatio:0,status:'AVAILABLE'}};
  assert.equal(recommendationPurchaseEvidence(zero).groupPercent,'0%');assert.match(recommendationPurchaseEvidence(zero).groupSentence,/0 of 100/);
  assert.equal(recommendationPurchaseEvidence({...zero,type:'CROSS_SELL',anchorProductId:31,evidence:{...zero.evidence,anchorSupportCount:0,confidence:null}}).directionalAvailable,false);
});
test('precise ratios and utility survive formatting; cards hide detailed utility while optional evidence retains it',()=>{
  const item=parseRecommendationJson(JSON.stringify(recommendation({type:'CROSS_SELL',anchorProductId:31})).replaceAll('40.123456','12345678901.123456').replace('"supportRatio":0.333333','"supportRatio":0.123456789012345678').replace('"anchorSupportCount":null','"anchorSupportCount":3').replace('"confidence":null','"confidence":0.666666666666666667')) as RecView;
  const before=String(item.utility);assert.ok(item.utility instanceof ExactRecommendationNumber);
  assert.equal(recommendationPurchaseEvidence(item).groupPercent,'12.3456789012345678%');
  const cards=render(createElement(F06RecommendationCards,{data:{items:[item],page:0,pageSize:20,totalElements:1,ordering:'RANKED_WITHIN_SOURCE_RUN'},names,onOpen:()=>{}}));
  assert.equal(cards.includes('Historical utility'),false);const details=render(createElement(F06RecommendationDetailContent,{item,names}));
  assert.ok(details.includes('12,345,678,901.123456'));assert.ok(details.includes('66.6666666666666667%'));assert.equal(String(item.utility),before);
});
test('cards retain every ID/type/direction/decision in Backend order without technical text or nested buttons',()=>{
  const first=recommendation(),items=[first,{...first,recommendationId:63,type:'CROSS_SELL' as const,anchorProductId:31},{...first,recommendationId:64,type:'CROSS_SELL' as const,anchorProductId:32},{...first,recommendationId:65,type:'FBT' as const},{...first,recommendationId:66,type:'BANNER' as const}];
  const before=JSON.stringify(items),html=render(createElement(F06RecommendationCards,{data:{items,page:0,pageSize:20,totalElements:5,ordering:'RANKED_WITHIN_SOURCE_RUN'},names,onOpen:()=>{}}));
  assert.equal((html.match(/data-recommendation-card/g)??[]).length,5);assert.equal((html.match(/<button /g)??[]).length,5);
  assert.deepEqual([...html.matchAll(/data-candidate-id="(\d+)"/g)].map(match=>Number(match[1])),[62,63,64,65,66]);
  assert.doesNotMatch(html,/Suggestion #|Snapshot #|Rule set|SPMF|fingerprint|Input hash/);assert.ok(html.includes('Cross-sell direction'));assert.equal(JSON.stringify(items),before);
  const escaped=render(createElement(F06RecommendationDetailContent,{item:first,names:{31:'<script>alert(1)</script>'}}));assert.equal(escaped.includes('<script>'),false);assert.ok(escaped.includes('&lt;script&gt;'));
});
test('four server-filtered tabs keep run/review status and reset pages without main-screen technical controls',async t=>{
  const f=setup(t);await f.browser.selectSource(42);await f.browser.applyFilters({reviewStatus:'PENDING_REVIEW'});
  for(const type of ['CROSS_SELL','FBT','BANNER','BUNDLE'] as const){await f.browser.setPage(0);await f.browser.applyFilters({...f.browser.getSnapshot().filters,type});assert.equal(f.browser.getSnapshot().page,0);assert.ok(f.browser.getSnapshot().list!.items.every(item=>item.type===type));}
  assert.ok(f.list.mock.calls.every(call=>call.arguments[0]?.miningRunId===42));
  assert.deepEqual(f.list.mock.calls[0].arguments[0],{miningRunId:42,page:0,pageSize:1});
  assert.ok(f.list.mock.calls.slice(2).every(call=>call.arguments[0]?.type&&call.arguments[0]?.reviewStatus==='PENDING_REVIEW'));
  const html=render(createElement(F06DashboardContent,{state:f.browser.getSnapshot(),workflow:f.browser}));
  assert.equal((html.match(/role="tab"/g)??[]).length,4);assert.ok(html.includes('id="f06-type-BUNDLE"'));
  assert.doesNotMatch(html,/f06-filter-snapshot|f06-filter-type|All saved suggestions|Analysis scope|Apply Filters|Reset Filters|Product groups/);
  assert.doesNotMatch(html,/Store tools|>Store Rules<|>Expiry Alerts</,'Store utilities are outside the library');
});
test('changing type aborts old list/details and cannot display another type after a late response',async t=>{
  const f=setup(t);await f.browser.selectSource(42);await f.browser.openDetail(62);
  const pending=deferred<Awaited<ReturnType<typeof f06Api.list>>>();
  f.list.mock.mockImplementation((params:RecListParams={})=>params.type==='FBT'?pending.promise:f.listRead(params));
  const old=f.browser.applyFilters({type:'FBT'}),signal=f.list.mock.calls.at(-1)!.arguments[1];await f.browser.applyFilters({type:'CROSS_SELL'});
  pending.resolve({items:[f.records.get(65)!],page:0,pageSize:20,totalElements:1,ordering:'RANKED_WITHIN_SOURCE_RUN'});await old;
  assert.equal(signal?.aborted,true);assert.equal(f.browser.getSnapshot().detailId,null);assert.equal(f.browser.getSnapshot().filters.type,'CROSS_SELL');assert.deepEqual(f.browser.getSnapshot().list!.items.map(item=>item.recommendationId),[64]);
});
test('successful review preserves exact ID/version/reason and Review Next opens fresh pending within current type/run',async t=>{
  const f=setup(t);await review(f);
  assert.equal(f.browser.getSnapshot().reviewNotice,'Approved and ready for layout.');assert.equal(f.browser.getSnapshot().reviewedId,62);
  assert.deepEqual(f.approve.mock.calls[0].arguments.slice(0,2),[62,{expectedVersion:1,reason:'Reviewed the recorded evidence.'}]);
  assert.deepEqual(f.browser.getSnapshot().list!.items.map(item=>item.recommendationId),[63]);await f.browser.reviewNext();
  assert.equal(f.browser.getSnapshot().detailId,63);assert.equal(f.browser.getSnapshot().detail!.reviewStatus,'PENDING_REVIEW');assert.equal(f.browser.getSnapshot().reviewedId,null);
  assert.equal(f.records.get(64)!.reviewStatus,'PENDING_REVIEW');assert.ok(f.list.mock.calls.every(call=>call.arguments[0]?.miningRunId===42&&(!call.arguments[0]?.type||call.arguments[0]?.type==='BUNDLE')));
  const reads=f.list.mock.callCount();await f.browser.reviewNext();assert.equal(f.list.mock.callCount(),reads,'Review Next cannot skip a suggestion before a saved decision');
});
test('Review Next skips a candidate whose decision changed between list and fresh GET',async t=>{
  const f=setup(t);f.records.set(67,recommendation({recommendationId:67}));await review(f);
  f.get.mock.mockImplementation(async(id:number)=>id===63?{...f.records.get(63)!,reviewStatus:'APPROVED' as const}:f.getRead(id));await f.browser.reviewNext();
  assert.equal(f.browser.getSnapshot().detailId,67);assert.equal(f.browser.getSnapshot().detail!.reviewStatus,'PENDING_REVIEW');
});

test('a returned review decision for another type is not displayed and is reconciled without retry',async t=>{
  const f=setup(t);await f.browser.selectSource(42);await f.browser.openDetail(62);
  f.approve.mock.mockImplementation(async()=>({...f.records.get(62)!,type:'BANNER' as const,reviewStatus:'APPROVED' as const}));
  f.browser.prepareReview('approve','Verify the saved decision.');await f.browser.confirmReview();
  assert.equal(f.approve.mock.callCount(),1);assert.equal(f.browser.getSnapshot().detail!.type,'BUNDLE');
  assert.equal(f.browser.getSnapshot().detail!.reviewStatus,'PENDING_REVIEW');assert.equal(f.browser.getSnapshot().reviewedId,null);
  assert.match(f.browser.getSnapshot().reviewError,/could not be verified.*no automatic retry/);
  assert.equal(f.get.mock.callCount(),2,'Reconcile with a fresh GET of the original candidate');
});
test('Review Next handles no pending candidates and rejects foreign type/source responses',async t=>{
  const f=setup(t);f.records.delete(63);await review(f);await f.browser.reviewNext();
  assert.match(f.browser.getSnapshot().nextMessage,/No pending recommendations remain/);assert.equal(f.browser.getSnapshot().detailId,62);
  f.list.mock.mockImplementation(async(params:RecListParams={})=>({items:[f.records.get(64)!],page:params.page??0,pageSize:params.pageSize??20,totalElements:1,ordering:'RANKED_WITHIN_SOURCE_RUN' as const}));
  await f.browser.reviewNext();assert.ok(f.browser.getSnapshot().nextError);assert.equal(f.browser.getSnapshot().detailId,62);assert.equal(f.approve.mock.callCount(),1);
});
test('Review Next skips a missing candidate and keeps its bounded read limit',async t=>{
  const f=setup(t);f.records.set(67,recommendation({recommendationId:67}));await review(f);
  const before=f.get.mock.callCount();
  f.get.mock.mockImplementation(async(id:number)=>{if(id===63)throw new F06ApiError(404,'Removed');return f.getRead(id);});
  await f.browser.reviewNext();assert.equal(f.browser.getSnapshot().detailId,67);assert.equal(f.get.mock.callCount()-before,2);assert.equal(f.approve.mock.callCount(),1);
});

test('Review Next follows server pages in order and bounds concurrent-change scans',async t=>{
  const f=setup(t);f.records.set(67,recommendation({recommendationId:67}));await review(f);
  const start=f.list.mock.callCount();
  f.list.mock.mockImplementation(async(params:RecListParams={}):Promise<RecPage>=>({items:[f.records.get(params.page===0?63:67)!],page:params.page??0,pageSize:1,totalElements:2,ordering:'RANKED_WITHIN_SOURCE_RUN'}));
  f.get.mock.mockImplementation(async(id:number)=>id===63?{...f.records.get(63)!,reviewStatus:'REJECTED' as const}:f.getRead(id));
  await f.browser.reviewNext();assert.equal(f.browser.getSnapshot().detailId,67);
  assert.deepEqual(f.list.mock.calls.slice(start).map(call=>call.arguments[0]?.page),[0,1]);
  f.browser.prepareReview('reject','No longer suitable.');await f.browser.confirmReview();
  f.list.mock.mockImplementation(async(params:RecListParams={}):Promise<RecPage>=>({items:Array.from({length:20},(_,index)=>recommendation({recommendationId:100+(params.page??0)*20+index})),page:params.page??0,pageSize:20,totalElements:1000,ordering:'RANKED_WITHIN_SOURCE_RUN'}));
  f.get.mock.mockImplementation(async(id:number)=>recommendation({recommendationId:id,reviewStatus:'APPROVED'}));
  const beforeLists=f.list.mock.callCount(),beforeGets=f.get.mock.callCount();await f.browser.reviewNext();
  assert.equal(f.list.mock.callCount()-beforeLists,1);assert.equal(f.get.mock.callCount()-beforeGets,3);
  assert.equal(f.browser.getSnapshot().detailId,67);assert.match(f.browser.getSnapshot().nextMessage,/changed while checking/);
  f.list.mock.mockImplementation(async():Promise<RecPage>=>({items:[recommendation()],page:0,pageSize:20,totalElements:1,ordering:'CREATED_DESC'}));
  await f.browser.reviewNext();assert.ok(f.browser.getSnapshot().nextError);assert.equal(f.browser.getSnapshot().detailId,67);
});
test('Review Next cancels on close/logout, ignores late reads and is unavailable to Store Admin',async t=>{
  const f=setup(t);await review(f);const pending=deferred<Awaited<ReturnType<typeof f06Api.list>>>();f.list.mock.mockImplementation(()=>pending.promise);
  const next=f.browser.reviewNext(),signal=f.list.mock.calls.at(-1)!.arguments[1];f.change(null);pending.resolve({items:[recommendation({recommendationId:63})],page:0,pageSize:20,totalElements:1,ordering:'RANKED_WITHIN_SOURCE_RUN'});await next;
  assert.equal(signal?.aborted,true);assert.equal(f.browser.getSnapshot().detailId,null);assert.equal(f.browser.getSnapshot().nextLoading,false);
});
test('Approve/Reject UI keeps required reason, final confirmation and eligibility without showing versions',async t=>{
  const f=setup(t);await f.browser.selectSource(42);await f.browser.openDetail(62);
  let html=render(createElement(F06ReviewForm,{state:f.browser.getSnapshot(),workflow:f.browser,reason:' '}));assert.match(html,/required=""/);assert.match(html,/maxLength="1000"/);assert.match(html,/disabled=""[^>]*>Approve/);assert.match(html,/disabled=""[^>]*>Reject/);
  f.browser.prepareReview('approve','Confirmed recorded purchases.');html=render(createElement(F06ReviewForm,{state:f.browser.getSnapshot(),workflow:f.browser}));
  assert.ok(html.includes('Approve this recommendation?'));assert.doesNotMatch(html,/expectedVersion|Version 1|Recommendation #62/);assert.equal(f.approve.mock.callCount(),0);
  f.browser.cancelReview();f.records.set(62,{...f.records.get(62)!,currentEligibility:eligibility('INELIGIBLE')});await f.browser.openDetail(62);
  html=render(createElement(F06ReviewForm,{state:f.browser.getSnapshot(),workflow:f.browser,reason:'Stock needs checking.'}));assert.match(html,/disabled=""[^>]*>Approve/);assert.equal(html.match(/<button[^>]*>Reject<\/button>/)![0].includes(' disabled=""'),false);
});
test('Store Admin has no review/generation controls, including Review Next invoked directly',async t=>{
  const f=setup(t,'Store Admin');await f.browser.selectSource(42);await f.browser.openDetail(62);const reads=f.list.mock.callCount();await f.browser.reviewNext();f.browser.prepareReview('approve','Not allowed');await f.browser.confirmReview();
  assert.equal(f.list.mock.callCount(),reads);assert.equal(f.approve.mock.callCount(),0);assert.equal(render(createElement(F06ReviewForm,{state:f.browser.getSnapshot(),workflow:f.browser})), '');
});
test('ready-for-layout follows Backend flag and does not turn approval into publishing or inventory reservation',()=>{
  const pending=recommendation(),approved={...pending,reviewStatus:'APPROVED' as const};assert.match(recommendationReadiness(approved),/not yet ready/);
  assert.match(recommendationReadiness({...approved,readyForConsumption:true}),/^Ready for Layout/);assert.match(recommendationReadiness({...approved,currentEligibility:eligibility('INELIGIBLE')}),/Currently unavailable/);
  const html=render(createElement(F06RecommendationDetailContent,{item:{...approved,readyForConsumption:true}}));
  assert.doesNotMatch(html,/Continue to Layout|Layout workspace is not connected|f06-layout-note/);
});

test('approval notice follows the saved Backend readyForConsumption flag without Layout handoff',async t=>{
  const f=setup(t);await f.browser.selectSource(42);await f.browser.openDetail(62);
  f.approve.mock.mockImplementation(async()=>{const saved={...f.records.get(62)!,reviewStatus:'APPROVED' as const,version:2,readyForConsumption:false};f.records.set(62,saved);return saved;});
  f.browser.prepareReview('approve','Check current availability.');await f.browser.confirmReview();
  assert.equal(f.browser.getSnapshot().detail!.reviewStatus,'APPROVED');assert.equal(f.browser.getSnapshot().detail!.readyForConsumption,false);
  assert.match(f.browser.getSnapshot().reviewNotice,/not currently ready for Layout/);assert.doesNotMatch(f.browser.getSnapshot().reviewNotice,/Approved and ready for layout/);
  assert.equal(f.approve.mock.callCount(),1);assert.equal(f.browser.getSnapshot().reviewedId,62);
  for(const readyForConsumption of [false,true]){
    const state=f.browser.getSnapshot();
    const html=render(createElement(F06RecommendationDetails,{state:{...state,detail:{...state.detail!,readyForConsumption}},workflow:f.browser}));
    assert.doesNotMatch(html,/Continue to Layout|Layout workspace is not connected|f06-layout-note|href="[^"]*(?:layouts|campaigns)/);
  }
});
test('friendly warning/error copy never leaks technical identifiers or hides uncertain writes',()=>{
  assert.match(recommendationWarning('Product 31: MISSING_PUSH_DAY',names),/^Noodles:.*Push Day/);
  assert.equal(recommendationWarning('SUPPORT_POLICY_NOT_MET'),'These products were not purchased together often enough.');
  assert.equal(recommendationWarning('CONFIDENCE_POLICY_NOT_MET'),"These products did not meet your store's add-on purchase requirements.");
  assert.doesNotMatch(recommendationWarning('fingerprint deadbeefbeef00000000000000000000'),/fingerprint|deadbeef/);
  for(const status of [400,401,403,404,409,500,null])assert.doesNotMatch(recommendationError(new F06ApiError(status,'UUID 123; raw backend error'),'review'),/HTTP|UUID|raw backend/);
  assert.match(recommendationError(new F06ApiError(null,'Lost'),'generate'),/could not be confirmed/);assert.match(recommendationError(new F06ApiError(409,'request fewer types'),'generate'),/fewer recommendation types/);
});
