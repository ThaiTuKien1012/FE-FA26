import assert from './f06.assert';
import {test,type TestContext} from 'node:test';
import {createElement as h} from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {setImmediate as flush} from 'node:timers/promises';
import {authService} from '../src/services/authService';
import {f06Api,F06ApiError} from '../src/features/f06/f06.api';
import {f05Api} from '../src/features/f05/f05.api';
import {RecommendationBrowser} from '../src/features/f06/f06.browse';
import {RecommendationGeneration} from '../src/features/f06/f06.generate';
import {readRecommendationSource} from '../src/features/f06/f06.source';
import {F06RankedSource} from '../src/features/f06/components/F06RankedSource';
import {F06AnalysisSummary,analysisTimestamp} from '../src/features/f06/components/F06AnalysisSummary';
import {F06GenerationPanel} from '../src/features/f06/components/F06GenerationModal';
import {F06DashboardContent} from '../src/features/f06/components/F06DashboardView';
import {requestFixture,runFixture,user} from './f05.fixtures';
import {policy,generation} from './f06.fixtures';
const request={...requestFixture('FAILED'),createdAt:'2026-11-24T02:30:00Z'},run={...runFixture('COMPLETED'),completedAt:'2026-11-25T15:46:00Z',patternCount:87};
function setup(t:TestContext){t.mock.method(authService,'getCurrentUser',()=>({...user,role:'Merchandiser' as const,storeId:1}));t.mock.method(authService,'getSessionId',()=> 'analysis-fixture');t.mock.method(authService,'getToken',()=> 'fixture');t.mock.method(authService,'subscribe',()=>()=>{});t.mock.method(globalThis,'fetch',async()=>{throw Error('No live HTTP');});}
test('same sales periods remain distinguishable by actual Analysis IDs and creation instants without run reads',t=>{
 setup(t);const workflow=new RecommendationBrowser(),second={...request,requestId:18,createdAt:'2026-11-25T02:30:00Z'};
 const state={...workflow.getSnapshot(),requests:{items:[request,second],page:0,pageSize:20,totalElements:45}};
 const before=JSON.stringify(state),html=render(h(F06RankedSource,{state,workflow}));
 for(const text of ['Choose an Analysis','Analysis #17','Analysis #18',analysisTimestamp(request.createdAt),analysisTimestamp(second.createdAt),'Select Analysis','Next sources'])assert.ok(html.includes(text),text);
 assert.doesNotMatch(html,/<select|Result 1|Completed results<\/label>/);assert.equal(JSON.stringify(state),before);
});
test('selected summary separates request ID, creation, completion and product count from snapshot as-of',()=>{
 const before=JSON.stringify({request,run}),html=render(h(F06AnalysisSummary,{request,run}));
 for(const text of ['Analysis #17','data-selected-run="42"','Created on','Completed on',analysisTimestamp(request.createdAt),analysisTimestamp(run.completedAt),'Product combinations found','87'])assert.ok(html.includes(text),text);
 assert.doesNotMatch(html,/>Analysis #42<|Analysis date:|Result 1/);assert.equal(JSON.stringify({request,run}),before);
 const missing=render(h(F06AnalysisSummary,{request,run:{...run,patternCount:null,completedAt:null}}));assert.ok(missing.includes('Not recorded'));assert.equal(analysisTimestamp('bad'),'Not recorded');
});
test('multiple completed results show actual completion/count/reference and exclude failed choices',t=>{
 setup(t);const workflow=new RecommendationBrowser(),state={...workflow.getSnapshot(),request,runs:[run,{...run,runId:43,patternCount:123,completedAt:'2026-11-26T02:00:00Z'},{...run,runId:44,status:'FAILED' as const}]};
 const html=render(h(F06RankedSource,{state,workflow}));for(const text of ['Result #42','Result #43','87 product combinations','123 product combinations',analysisTimestamp(run.completedAt)])assert.ok(html.includes(text),text);assert.equal(html.includes('data-select-run="44"'),false);assert.equal((html.match(/data-select-run=/g)||[]).length,2);
 const none=render(h(F06RankedSource,{state:{...state,runs:[{...run,status:'RUNNING'}]},workflow}));assert.ok(none.includes('No completed results are available for this analysis.'));assert.equal(none.includes('data-select-run='),false);
});
test('generation modal keeps the selected analysis, four native choices and explicit fixed footer without another selector',t=>{
 setup(t);const html=render(h(F06GenerationPanel,{source:{request,run},onGenerated:()=>{},onPendingChange:()=>{},onClose:()=>{},onCheckSaved:()=>{}}));
 for(const text of ['<dialog','Generate Recommendations','Analysis #17','87','Choose the types of recommendations you want to generate.','Recommendations will follow your store','data-generation-body'])assert.ok(html.includes(text),text);
 assert.equal((html.match(/type="checkbox"/g)||[]).length,4);assert.equal((html.match(/checked=""/g)||[]).length,4);assert.match(html,/<footer/);assert.doesNotMatch(html,/<select|Refresh Rules|Store rules.*Read-only/);
});
test('run-wide empty presentation is role-specific and has no central refresh, filters or duplicate generation',t=>{
 setup(t);const workflow=new RecommendationBrowser(),base={...workflow.getSnapshot(),request,sourceRun:run,miningRunId:42,runTotal:0};
 const merchant=render(h(F06DashboardContent,{state:base,workflow,onGenerate:()=>{}}));assert.ok(merchant.includes('Ready to Generate Recommendations'));assert.equal((merchant.match(/>Generate Recommendations<\/button>/g)||[]).length,1);assert.doesNotMatch(merchant,/role="tab"|f06-filter-review/);
 const admin=render(h(F06DashboardContent,{state:{...base,role:'Store Admin'},workflow,onGenerate:()=>{}}));assert.ok(admin.includes('Awaiting Recommendations'));assert.doesNotMatch(admin,/>Generate Recommendations<\/button>/);
 const attempted=render(h(F06DashboardContent,{state:base,workflow,onGenerate:()=>{},generationAttempted:true}));assert.ok(attempted.includes('No Recommendations Found'));assert.equal(attempted.includes('Ready to Generate Recommendations'),false);
});
test('uncertain generation is not replayed or discarded by changing types',async t=>{
 setup(t);t.mock.method(f06Api,'getConfig',async()=>policy);const post=t.mock.method(f06Api,'generate',async()=>{throw new F06ApiError(null,'Lost response');});
 const workflow=new RecommendationGeneration();workflow.start({request,run});t.after(workflow.stop);await flush();await workflow.generate();assert.equal(workflow.getSnapshot().needsRecheck,true);const types=[...workflow.getSnapshot().types];workflow.toggleType('BUNDLE');await workflow.generate();assert.equal(post.mock.callCount(),1);assert.deepEqual(workflow.getSnapshot().types,types);assert.equal(workflow.getSnapshot().result,null);
});
test('source validation still rejects cross-Store, wrong snapshot and non-completed runs before any generation',async t=>{
 setup(t);let current=run;const get=t.mock.method(f05Api,'getRun',async()=>current);t.mock.method(f05Api,'getRequest',async()=>request);const post=t.mock.method(f06Api,'generate',async()=>generation);
 for(const value of [{...run,storeId:2},{...run,status:'RUNNING' as const},{...run,snapshotId:999}]){current=value as typeof run;await assert.rejects(readRecommendationSource(42,new AbortController().signal));}
 assert.equal(get.mock.callCount(),3);assert.equal(post.mock.callCount(),0);
});
