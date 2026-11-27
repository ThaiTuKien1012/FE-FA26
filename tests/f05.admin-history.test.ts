import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement as h} from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {authService} from '../src/services/authService';
import {f05SystemApi} from '../src/features/f05/f05.system.api';
import {exactMiningValue} from '../src/features/f05/f05.precision';
import {SystemHistoryList} from '../src/features/f05/components/SystemHistoryList';
import {SystemAnalysisContent,systemAnalysisFailure,systemAnalysisReadError} from '../src/features/f05/components/SystemAnalysisDetails';
import {F05ApiError} from '../src/features/f05/f05.api';
import {SystemHistoryDialog} from '../src/features/f05/components/SystemHistoryDialog';
import {SystemHistoryStorePicker,SystemHistoryStoreRows} from '../src/features/f05/components/SystemHistoryStorePicker';
import {benchmarkFixture,progressFixture,requestFixture,user} from './f05.fixtures';

test('System History list uses frozen snapshot dates and request IDs in server order without submitting-user columns',()=>{
 const items=[{...requestFixture('FAILED'),requestId:39},requestFixture('COMPLETED')],before=JSON.stringify(items);
 const html=render(h(SystemHistoryList,{items,selectedId:39,onSelect:()=>{}}));
 for(const text of ['Analysis #39','Sales Period','01/09/2026','30/09/2026','Snapshot #2','Status','Created On','Actions','View Details','aria-pressed="true"'])assert.ok(html.includes(text),text);
 assert.ok(html.indexOf('Analysis #39')<html.indexOf('Analysis #17'));assert.equal(html.includes('Submitted By'),false);assert.equal(html.includes('User #'),false);
 assert.equal(JSON.stringify(items),before);assert.match(html,/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}</);
});

test('System Analysis has two summary cards, separate overlapping counts and exact minimum utility without diagnostic markup',()=>{
 const exact=exactMiningValue('12345678901.123456'),request={...requestFixture('COMPLETED'),requestedBy:123,minUtilMode:'ABSOLUTE' as const,minUtilValue:exact,effectiveMinUtility:exact},runs=[{...benchmarkFixture().run,patternCount:11},{...benchmarkFixture('EFIM').run,patternCount:17}],data={request,runs,runDetail:runs[1],progress:progressFixture('COMPLETED')};
 const before=JSON.stringify(runs),html=render(h(SystemAnalysisContent,{data}));
 for(const text of ['Analysis Results','Transactions Analyzed','Product Combinations','counts may overlap','Run #42','Run #43','12,345,678,901.123456 frozen utility units','01/09/2026','Source Snapshot','Created On','Analysis Method'])assert.ok(html.includes(text),text);
 assert.equal((html.match(/data-result-card=/g)||[]).length,2);assert.ok(html.includes('auto-rows-fr'));assert.match(html,/>11<\/dd>/);assert.match(html,/>17<\/dd>/);assert.equal(html.includes('>28<'),false);
 for(const text of ['Execution Details','Technical Details','Java Heap','Library version','SPMF','Conversion','Input hash','Request key','User #123',request.requestKey,'test environment','Recommendations','Generate','<details','<summary','<button'])assert.equal(html.includes(text),false,text);
 assert.equal(JSON.stringify(runs),before);assert.equal(request.effectiveMinUtility,exact);
});

test('System Analysis keeps zero, missing results and historical progress distinct without exposing failure diagnostics',()=>{
 const request=requestFixture('FAILED'),run={...benchmarkFixture().run,status:'TIMED_OUT' as const,runtimeMillis:0,memoryMiB:null,patternCount:null,failureCode:'TIMEOUT',failureMessage:'Fixture timeout evidence'};
 const data={request,runs:[run],runDetail:run,progress:{...progressFixture('FAILED'),stage:'LEGACY' as const,percent:0}};
 const html=render(h(SystemAnalysisContent,{data}));
 for(const text of ['Not measured','Detailed progress was not recorded','took too long and was stopped','Review the sales period'])assert.ok(html.includes(text),text);
 for(const text of ['Fixture timeout evidence','TIMEOUT','0 ms','Java Heap','Execution Details'])assert.equal(html.includes(text),false);
 assert.equal(run.failureMessage,'Fixture timeout evidence');
 const zero=render(h(SystemAnalysisContent,{data:{...data,runs:[{...run,patternCount:0}]}}));assert.match(zero,/>0<\/p>/);
 const empty=render(h(SystemAnalysisContent,{data:{...data,runs:[],runDetail:null}}));assert.ok(empty.includes('Not recorded'));assert.ok(empty.includes('ask support'));
});

test('System Analysis failure and read errors provide guidance without leaking arbitrary service diagnostics',()=>{
 const raw='java.lang.Exception inputHash=deadbeef requestKey=private-reference';
 for(const [code,expected] of [['TIMED_OUT','took too long'],['OUT_OF_MEMORY','available memory'],['OUTPUT_LIMIT','more results'],['INT32_CAPACITY','selected data'],['SPMF_FAILURE','service could not finish'],['UNKNOWN_FAILURE','ask support']]){
  const reason=systemAnalysisFailure({status:'FAILED',failureCode:code,failureMessage:code==='UNKNOWN_FAILURE'?'private-reference':null});assert.ok(reason.includes(expected),code);assert.equal(reason.includes(code),false);assert.equal(reason.includes('private-reference'),false);
 }
 for(const status of [null,200,401,403,404,500,503]){const message=systemAnalysisReadError(new F05ApiError(status,raw));assert.equal(message.includes(raw),false);assert.equal(/inputHash|requestKey|java\.lang/.test(message),false);}
});

test('an earlier failed run does not relabel a completed analysis or replace its successful result',()=>{
 const runs=[{...benchmarkFixture().run,status:'FAILED' as const,patternCount:null,failureCode:'UNKNOWN_FAILURE',failureMessage:'private diagnostic'}, {...benchmarkFixture('EFIM').run,patternCount:17}];
 const html=render(h(SystemAnalysisContent,{data:{request:requestFixture('COMPLETED'),runs,runDetail:null,progress:progressFixture('COMPLETED')}}));
 assert.ok(html.includes('Some results are unavailable'));assert.equal(html.includes('>Analysis could not be completed</h3>'),false);assert.ok(html.includes('>17</dd>'));assert.ok(html.includes('Not measured'));assert.equal(html.includes('private diagnostic'),false);
});

test('System History Store search uses the supported q with bounded server pagination and leaves existing callers unchanged',async t=>{
 t.mock.method(authService,'getCurrentUser',()=>user);t.mock.method(authService,'getToken',()=> 'fixture');t.mock.method(authService,'getSessionId',()=> 'fixture');
 const paths:string[]=[];t.mock.method(authService,'request',async(path:unknown)=>{paths.push(String(path));return Response.json({items:[{storeId:1,name:'Store A'}],page:2,pageSize:20,totalElements:45});});
 await f05SystemApi.listStores(2,20,undefined,' A & B ');await f05SystemApi.listStores(2,20);
 assert.equal(paths[0],'/api/system/stores?page=2&pageSize=20&q=A+%26+B');assert.equal(paths[1],'/api/system/stores?page=2&pageSize=20');
});

test('System History dialogs provide labelled internal scrolling and Close controls without mutation actions',()=>{
 const html=render(h(SystemHistoryDialog,{title:'Analysis #17',subtitle:'Store A',onClose:()=>{},children:'Fixture body',footer:h('button',null,'Close')}));
 for(const text of ['aria-modal="true"','aria-labelledby','aria-describedby','data-system-history-body','overflow-y-auto','Close analysis details','Analysis #17','Store A'])assert.ok(html.includes(text));
 for(const text of ['Run Analysis','Generate Recommendations'])assert.equal(html.includes(text),false);
});

test('System History selected-store card always has a Change Store dialog trigger and no list-state controls',t=>{
 t.mock.method(authService,'getToken',()=> 'fixture');t.mock.method(authService,'getSessionId',()=> 'fixture');
 for(const storeId of [null,1,2]){
  const html=render(h(SystemHistoryStorePicker,{storeId,onSelect:()=>{},onResolved:()=>{}}));
  assert.ok(html.includes('Change Store'));assert.ok(html.includes('chevron-down'));assert.ok(html.includes('aria-haspopup="dialog"'));assert.ok(html.includes('aria-expanded="false"'));
  assert.equal((html.match(/<button /g)||[]).length,1);assert.equal(html.includes('Refresh Stores'),false);assert.equal(html.includes('Retry Stores'),false);assert.equal(html.includes('Loading stores'),false);assert.equal(html.includes('role="alert"'),false);
 }
});

test('Store picker rows identify the current Store without an action or repeated icons, and keep other selections available',()=>{
 const items=[{storeId:1,name:'Store A'},{storeId:2,name:'<Store B>'}],html=render(h(SystemHistoryStoreRows,{items,storeId:1,onSelect:()=>{}}));
 assert.equal((html.match(/aria-current="true"/g)||[]).length,1);assert.ok(html.includes('Currently viewing'));assert.ok(html.includes('Selected</span>'));
 assert.equal(html.includes('aria-label="Select Store Store A"'),false);assert.ok(html.includes('aria-label="Select Store &lt;Store B&gt;"'));assert.ok(html.includes('&lt;Store B&gt;'));
 assert.equal((html.match(/<svg /g)||[]).length,1,'Only the selected check-circle appears in rows');assert.equal((html.match(/<button /g)||[]).length,1);
 const visibleText=html.replace(/<[^>]*>/g,'');for(const text of ['#1','#2','Refresh','confirm'])assert.equal(visibleText.includes(text),false);
 const unselected=render(h(SystemHistoryStoreRows,{items,storeId:null,onSelect:()=>{}}));assert.equal((unselected.match(/<button /g)||[]).length,2);assert.equal(unselected.includes('Currently viewing'),false);assert.equal(unselected.includes('<svg'),false);
 const single=render(h(SystemHistoryStoreRows,{items:[items[0]],storeId:1,onSelect:()=>{}}));assert.ok(single.includes('Currently viewing'));assert.equal(single.includes('<button'),false);
});
