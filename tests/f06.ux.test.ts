import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { authService } from '../src/services/authService';
import { F06WorkspaceView } from '../src/features/f06/components/F06WorkspaceView';
import { F06Pages } from '../src/features/f06/components/F06Pages';
import { F06RecommendationDetailContent } from '../src/features/f06/components/F06RecommendationDetails';
import { F06RunPicker } from '../src/features/f06/components/F06RunPicker';
import { RecommendationGeneration } from '../src/features/f06/f06.generate';
import { recommendation } from './f06.fixtures';
import { user, requestFixture, runFixture } from './f05.fixtures';

test('F06 landing prioritizes saved suggestions and limits Generate to Merchandiser', t=>{
  t.mock.method(authService,'getSessionId',()=>null);
  for(const role of ['Merchandiser','Store Admin'] as const){
    t.mock.method(authService,'getCurrentUser',()=>({...user,role,storeId:1}));
    const html=renderToStaticMarkup(createElement(F06WorkspaceView));
    assert.ok(html.includes('Recommendation Library'));assert.ok(html.includes('Recommendation filters'));
    assert.equal(html.includes('f06-generate-tab'),role==='Merchandiser');
    assert.equal(/f06-source-title|f06-generate-form/.test(html),false);assert.ok(html.includes('role="tablist"'));
  }
});
test('F06 pager hides a single page and shows exact server page size with compact navigation',()=>{
  for(const totalElements of [0,1,20]){
    const html=renderToStaticMarkup(createElement(F06Pages,{data:{items:[],totalElements,page:0,pageSize:20},label:'recommendations',onPage:()=>{}}));
    assert.equal(html,'');
  }
  const html=renderToStaticMarkup(createElement(F06Pages,{data:{items:Array(20),totalElements:45,page:1,pageSize:20},label:'recommendations',onPage:()=>{}}));
  assert.ok(html.includes('Showing 21–40 of 45 recommendations'));assert.ok(html.includes('Page 2 of 3'));
  assert.ok(html.includes('aria-current="page">2'));
});
test('F06 details put review history before collapsed sources and retain references without raw dumps',()=>{
  const item=recommendation(),before=JSON.stringify(item);
  const html=renderToStaticMarkup(createElement(F06RecommendationDetailContent,{item,technical:false,names:{31:'Milk',32:'Bread'}}));
  for(const label of ['Products','Why this was suggested','Availability','Review History','Source Details','Product references','Product #31','Shopping data snapshot','Rules Applied'])assert.ok(html.includes(label),label);
  assert.ok(html.indexOf('Review History')<html.indexOf('>Source Details</summary>'));
  assert.equal(/<pre|Technical stock reference/.test(html),false);
  assert.match(html,/<details[^>]*><summary[^>]*>Technical source references/);
  assert.ok(html.includes('Input hash'));assert.ok(html.includes('SPMF threshold'));
  assert.equal(JSON.stringify(item),before);
});
test('F06 source picker keeps completed legacy results selectable without presenting debug or comparison codes',t=>{
  t.mock.method(authService,'getCurrentUser',()=>({...user,role:'Merchandiser',storeId:1}));
  const workflow=new RecommendationGeneration(),request=requestFixture('FAILED');
  const state={...workflow.getSnapshot(),history:{items:[request],page:0,pageSize:20,totalElements:1},request,runs:[runFixture('COMPLETED'),{...runFixture('FAILED'),runId:43}]};
  const html=renderToStaticMarkup(createElement(F06RunPicker,{state,workflow}));
  assert.ok(html.includes('HUI-Miner results'));assert.ok(html.includes('Source references'));
  assert.match(html,/aria-label="Select run #42"[^>]*\/>/);assert.match(html,/aria-label="Select run #43"[^>]*disabled/);
  assert.equal(/Request key|Input hash|Comparison result|Attempt|SPMF|LOSSLESS/.test(html),false);
});
