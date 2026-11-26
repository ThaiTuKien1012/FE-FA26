import { f05Api } from '../src/features/f05/f05.api';
import { requestFixture,runFixture } from './f05.fixtures';
import assert from './f06.assert';
import { test } from 'node:test';
import { setImmediate as flush } from 'node:timers/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { groupRecommendationPage, repeatedRecommendationIds } from '../src/features/f06/f06.groups';
import { recommendationProductImage } from '../src/features/f06/f06.products';
import { F06RecommendationCards } from '../src/features/f06/components/F06RecommendationCards';
import { F06RecommendationOptions } from '../src/features/f06/components/F06RecommendationGroupDetails';
import { F06ProductImage } from '../src/features/f06/components/F06ProductImage';
import { F06RecommendationDetailContent } from '../src/features/f06/components/F06RecommendationDetails';
import { RecommendationBrowser, readRecommendationProductNames } from '../src/features/f06/f06.browse';
import { f06Api } from '../src/features/f06/f06.api';
import { authService } from '../src/services/authService';
import { parseRecommendationJson } from '../src/features/f06/f06.numbers';
import { recommendation } from './f06.fixtures';
import { user } from './f05.fixtures';
import type { RecView, RecListParams } from '../src/features/f06/f06.types';

const variants=():RecView[]=>[
  recommendation({recommendationId:62,type:'BUNDLE'}),
  recommendation({recommendationId:63,type:'CROSS_SELL',anchorProductId:31,evidence:{...recommendation().evidence,anchorSupportCount:4,confidence:0.5}}),
  recommendation({recommendationId:64,type:'CROSS_SELL',anchorProductId:32,evidence:{...recommendation().evidence,anchorSupportCount:3,confidence:0.666667}}),
  recommendation({recommendationId:65,type:'BANNER'}),
  recommendation({recommendationId:66,type:'FBT'})
];

test('adjacent types/directions are visual options, with every candidate and anchor preserved',()=>{
  const items=variants(),before=JSON.stringify(items);items.forEach(item=>Object.freeze(item.productIds));
  const groups=groupRecommendationPage(items);assert.equal(groups.length,1);assert.deepEqual(groups[0].items.map(x=>x.recommendationId),[62,63,64,65,66]);
  assert.equal(groupRecommendationPage(items,false).length,5);
  const html=renderToStaticMarkup(createElement(F06RecommendationCards,{data:{items,page:0,pageSize:20,totalElements:85,ordering:'CREATED_DESC'},names:{31:'Milk',32:'Bread'},onOpen:()=>{}}));
  assert.equal((html.match(/data-product-group="true"/g)??[]).length,5);
  assert.equal((html.match(/data-group-open=/g)??[]).length,5);
  assert.equal(/Each type is a separate|Suggestion #|Snapshot #|Rule set/.test(html),false);assert.equal((html.match(/data-candidate-id=/g)??[]).length,5);assert.ok(html.includes('data-status='));
  for(const label of ['Milk','Bread','Purchase frequency','Bought together','View Details'])assert.ok(html.includes(label),label);
  const options=renderToStaticMarkup(createElement(F06RecommendationOptions,{items,names:{31:'Milk',32:'Bread'},onSelect:()=>{}}));
  for(const id of [62,63,64,65,66])assert.ok(options.includes('data-candidate-id="'+id+'"'));
  assert.ok(options.includes('From Milk → Bread'));assert.ok(options.includes('From Bread → Milk'));
  assert.ok(options.includes('66.6667%'));assert.equal(JSON.stringify(items),before);
});

test('snapshot, complete policy, source evidence and utility differences never merge',()=>{
  const base=recommendation();
  const changed=[{...base,snapshotId:3},{...base,policy:{...base.policy,version:2}},
    {...base,policy:{...base.policy,minimumSellableQuantity:2}},
    {...base,sources:[{...base.sources[0],inputHash:'other-frozen-input'}]},
    {...base,utility:0},{...base,productIds:[31,33]},{...base,evidence:{...base.evidence,supportCount:3}}];
  for(const next of changed)assert.equal(groupRecommendationPage([base,{...next,recommendationId:63}]).length,2);
  assert.equal(groupRecommendationPage([base,{...base,recommendationId:63,sources:[]}]).length,2);
});

test('All suggestions has one native full-card action per record and no per-suggestion list',()=>{
  const items=variants(),before=JSON.stringify(items);
  const html=renderToStaticMarkup(createElement(F06RecommendationCards,{data:{items,page:0,pageSize:20,totalElements:85,ordering:'CREATED_DESC'},grouped:false,names:{31:'Milk',32:'Bread'},onOpen:()=>{}}));
  assert.equal((html.match(/data-product-group="true"/g)??[]).length,5);
  assert.equal((html.match(/<button/g)??[]).length,5);
  for(const item of items)assert.ok(html.includes(`data-candidate-id="${item.recommendationId}"`));
  for(const label of ['Bundle','Cross-sell','Banner','Frequently Bought Together'])assert.ok(html.includes(label));
  assert.equal(/Each type is a separate|Suggestion #|Snapshot #/.test(html),false);assert.ok(html.includes('View Details'));assert.ok(html.includes('data-status='));
  assert.equal(JSON.stringify(items),before);
});

test('group options retain independent review, availability, ID and version without mutating frozen evidence',()=>{
  const items=variants().slice(0,3).map((item,index)=>({...item,version:index+4,reviewStatus:(['APPROVED','REJECTED','PENDING_REVIEW'] as const)[index]}));
  const before=JSON.stringify(items);
  const html=renderToStaticMarkup(createElement(F06RecommendationOptions,{items,onSelect:()=>{}}));
  assert.equal((html.match(/data-candidate-id=/g)??[]).length,3);
  for(const item of items)assert.ok(html.includes(`data-status="${item.reviewStatus}"`));
  assert.equal(JSON.stringify(items),before);
});

test('nonadjacent groups and page boundaries retain server order, ranks and counts',()=>{
  const first=variants().slice(0,2),other=recommendation({recommendationId:80,snapshotId:9});
  const items=[first[0],other,first[1]];const groups=groupRecommendationPage(items);
  assert.equal(groups.length,3);assert.deepEqual(groups.flatMap(g=>g.items),items);
  assert.equal(groupRecommendationPage(first.slice(0,1)).length,1);assert.equal(groupRecommendationPage(first.slice(1)).length,1);
  const page={items:first.map((x,i)=>({...x,rank:21+i})),page:1,pageSize:20,totalElements:85,ordering:'RANKED_WITHIN_SOURCE_RUN' as const};
  const html=renderToStaticMarkup(createElement(F06RecommendationCards,{data:page,onOpen:()=>{}}));
  const options=renderToStaticMarkup(createElement(F06RecommendationOptions,{items:page.items,onSelect:()=>{}}));
  assert.equal(html.includes('data-rank='),true);assert.ok(options.includes('data-rank="21"'));assert.ok(options.includes('data-rank="22"'));assert.equal(page.totalElements,85);
  const repeats=[first[0],first[0]];assert.deepEqual(repeatedRecommendationIds(repeats),[62]);assert.equal(groupRecommendationPage(repeats)[0].items.length,2);
});

test('equivalent source algorithms retain provenance and exact BigDecimal values during grouping',()=>{
  const original=recommendation();
  const equivalent={...original,recommendationId:63,type:'BANNER' as const,sources:[...original.sources,{...original.sources[0],runId:43,algorithm:'EFIM'}]};
  assert.equal(groupRecommendationPage([original,equivalent]).length,1);assert.equal(equivalent.sources.length,2);
  const details=renderToStaticMarkup(createElement(F06RecommendationDetailContent,{item:equivalent,technical:false}));
  assert.equal(details.includes('Mining run #43'),false);assert.equal(details.includes('Technical source references'),false);assert.equal(equivalent.sources[1].runId,43);
  assert.equal(equivalent.sources[0].inputHash,original.sources[0].inputHash);
  const exact=parseRecommendationJson(JSON.stringify(original).replaceAll('40.123456','1234567890123.123456')) as RecView;
  assert.doesNotThrow(()=>groupRecommendationPage([exact,{...exact,recommendationId:63}]));
  const html=renderToStaticMarkup(createElement(F06RecommendationCards,{data:{items:[exact],page:0,pageSize:20,totalElements:1,ordering:'CREATED_DESC'},onOpen:()=>{}}));
  assert.equal(html.includes('1,234,567,890,123.123456'),false);assert.ok(renderToStaticMarkup(createElement(F06RecommendationDetailContent,{item:exact})).includes('1,234,567,890,123.123456'));assert.equal(String(exact.utility),'1234567890123.123456');
});

test('optional advertised product media uses authorized product reads, caching and safe placeholders',async t=>{
  t.mock.method(authService,'request',async()=>Response.json({id:31,name:'Milk',imageUrl:'/api/products/31/image'}));
  const names=new Map<number,string|null>(),images=new Map<number,string>(),signal=new AbortController().signal;
  assert.deepEqual(await readRecommendationProductNames([31,31],signal,names,images),{31:'Milk'});assert.equal(images.get(31),'/api/products/31/image');
  assert.deepEqual(await readRecommendationProductNames([31],signal,names,images),{31:'Milk'});
  for(const value of ['javascript:alert(1)','data:image/png;base64,aaa','//external.invalid/image','https://user:secret@external.invalid/image'])assert.equal(recommendationProductImage(value),null);
  const html=renderToStaticMarkup(createElement(F06ProductImage,{id:31,name:'Milk'}));assert.ok(html.includes('Image unavailable for Milk'));assert.equal(html.includes('<img'),false);
});

test('view generated results is a scoped ranked GET without generation, mining or review replay',async t=>{
  t.mock.method(authService,'getCurrentUser',()=>({...user,role:'Merchandiser',storeId:1}));t.mock.method(authService,'getToken',()=> 'fixture');t.mock.method(authService,'getSessionId',()=> 'visual-session');
  t.mock.method(f05Api,'getRun',async()=>runFixture('COMPLETED'));t.mock.method(f05Api,'getRequest',async()=>requestFixture());t.mock.method(f05Api,'listRequests',async()=>({items:[],page:0,pageSize:20,totalElements:0}));
  const calls:unknown[]=[];t.mock.method(f06Api,'list',async (params:RecListParams={})=>{calls.push(params);return{items:[recommendation()],page:params.page??0,pageSize:params.pageSize??20,totalElements:1,ordering:params.miningRunId?'RANKED_WITHIN_SOURCE_RUN':'CREATED_DESC'};});
  t.mock.method(authService,'request',async()=>Response.json({id:31,name:'Milk'}));
  t.mock.method(f06Api,'generate',async()=>{throw Error('Generation must not run');});
  const workflow=new RecommendationBrowser();t.after(workflow.stop);workflow.start();await flush();await workflow.showGeneratedResults(42);
  assert.deepEqual(calls.filter(params=>(params as RecListParams).pageSize===20).at(-1),{page:0,pageSize:20,miningRunId:42,type:'BUNDLE'});assert.equal(calls.length,6);assert.equal(workflow.getSnapshot().mode,'ranked');assert.equal(workflow.getSnapshot().miningRunId,42);
});
