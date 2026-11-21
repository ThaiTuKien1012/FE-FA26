import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { authService } from '../src/services/authService';
import { parseSafeMiningJson } from '../src/features/f05/f05.numbers';
import { ExactRecommendationNumber, parseRecommendationJson } from '../src/features/f06/f06.numbers';
import { isRecPage, isRecView } from '../src/features/f06/f06.read-contracts';
import { f06Api, F06ApiError } from '../src/features/f06/f06.api';
import { recommendationNumber, recommendationPercent } from '../src/features/f06/components/F06ReadShared';
import { F06RecommendationDetailContent } from '../src/features/f06/components/F06RecommendationDetails';
import { F06RecommendationTable } from '../src/features/f06/components/F06RecommendationTable';
import { recommendation } from './f06.fixtures';
import { user } from './f05.fixtures';

// Backend ExpiryRiskCalculator uses divide(..., 18, HALF_UP). This is a
// source-derived reproducer, not an export from the user's authenticated API.
const expiryScore = '0.692307692307692308';
const rawItem = () => JSON.stringify(recommendation()).replaceAll('"expiryPriorityScore":null', '"expiryPriorityScore":'+expiryScore);

test('18-place Backend expiry scores survive list/detail parsing and rendering exactly',()=>{
  assert.throws(()=>parseSafeMiningJson(rawItem()), /cannot preserve safely/);
  const item=parseRecommendationJson(rawItem());assert.ok(isRecView(item));
  const score=item.currentEligibility.products[0].expiryPriorityScore;
  assert.ok(score instanceof ExactRecommendationNumber);assert.equal(score.source,expiryScore);assert.equal(String(score),expiryScore);
  assert.equal(item.recommendationId,62);assert.equal(item.version,1);assert.equal(item.utility,40.123456);
  const page={items:[item],page:0,pageSize:20,totalElements:1,ordering:'CREATED_DESC' as const};assert.ok(isRecPage(page));
  const details=renderToStaticMarkup(createElement(F06RecommendationDetailContent,{item,technical:false}));
  assert.ok(details.includes(expiryScore));assert.equal(details.includes('0.6923076923076923<'),false);
  assert.ok(renderToStaticMarkup(createElement(F06RecommendationTable,{data:page,onOpen:()=>{}})).includes('View Details'));
});

test('Decimal utility, source utility, support/confidence and percentages preserve every digit',()=>{
  for(const raw of ['1234567890123.123456','9007199254740993','9007199254740991.1','-1234567890123.123456','1.234567890123456789e-6','1e309','1e-999']){
    const value=parseRecommendationJson(raw);assert.ok(value instanceof ExactRecommendationNumber,raw);assert.equal(value.source,raw);
    assert.throws(()=>Number(value),/cannot be coerced/);assert.throws(()=>JSON.stringify({value}),/cannot be serialized/);
    assert.ok(!recommendationNumber(value).includes('Infinity'));
  }
  assert.equal(recommendationNumber(parseRecommendationJson('1234567890123.123456') as ExactRecommendationNumber),'1,234,567,890,123.123456');
  assert.equal(recommendationPercent(parseRecommendationJson('0.100000000000000005') as ExactRecommendationNumber),'10.0000000000000005%');
  const raw=rawItem().replaceAll('40.123456','1234567890123.123456').replace('0.333333','0.333333333333333333');
  const item=parseRecommendationJson(raw);assert.ok(isRecView(item));assert.equal(String(item.utility),'1234567890123.123456');
  assert.equal(String(item.sources[0].patternUtility),'1234567890123.123456');assert.equal(recommendationPercent(item.evidence.supportRatio),'33.3333333333333333%');
});

test('unsafe long IDs/counts, fractional IDs and quoted numerics still fail closed',()=>{
  for(const field of ['recommendationId','version','storeId'] as const){
    for(const raw of ['9007199254740993','0.100000000000000005','1e309','"62"']){
      const original=JSON.stringify(recommendation());
      assert.equal(isRecView(parseRecommendationJson(original.replace(new RegExp('"'+field+'":\\d+'), '"'+field+'":'+raw))),false,field+' '+raw);
    }
  }
  const safe=parseRecommendationJson('{"id":9007199254740991,"n":1.250000,"s":"9007199254740993"}') as Record<string,unknown>;
  assert.equal(safe.id,Number.MAX_SAFE_INTEGER);assert.equal(safe.n,1.25);assert.equal(safe.s,'9007199254740993');
  assert.equal(isRecView(parseRecommendationJson(rawItem().replace('"sellableQuantity":10','"sellableQuantity":9007199254740993'))),false);
});

test('parser keeps escaped numeric strings/keys, marker collisions and JSON syntax checks',()=>{
  const plain={'\0paspm-number':1,'\0paspm-number_':{'\0paspm-number':0},message:'Escaped "123" and 9007199254740993',nested:[null,true,{},[1,2]]};
  assert.deepEqual(parseRecommendationJson(JSON.stringify(plain)),plain);
  assert.deepEqual(parseRecommendationJson('{"x":"\\u0031","n":-0.125e1}'),{x:'1',n:-1.25});
  for(const raw of ['[01]','[+1]','[.1]','[NaN]','[Infinity]','{"x":1e}','{"x":}','{"x":"\\x00"}'])assert.throws(()=>parseRecommendationJson(raw),SyntaxError,raw);
});

test('GET list/detail and review retain exact read-only decimals while sending numeric versions only',async t=>{
  t.mock.method(authService,'getCurrentUser',()=>({...user,role:'Merchandiser',storeId:1}));
  t.mock.method(authService,'getSessionId',()=> 'precision-test');t.mock.method(authService,'getToken',()=> 'fixture-only');
  const calls:Array<{url:string;body:unknown}>=[];
  t.mock.method(authService,'request',async (url:string,init:RequestInit={})=>{
    calls.push({url,body:init.body});
    const body=url.includes('?')?'{"items":['+rawItem()+'],"page":0,"pageSize":20,"totalElements":1,"ordering":"CREATED_DESC"}':rawItem();
    return new Response(body,{status:200});
  });
  const list=await f06Api.list({snapshotId:2,type:'BUNDLE',reviewStatus:'PENDING_REVIEW'});
  assert.ok(calls[0].url.includes('snapshotId=2&type=BUNDLE&reviewStatus=PENDING_REVIEW'));
  assert.equal(String(list.items[0].currentEligibility.products[0].expiryPriorityScore),expiryScore);
  const detail=await f06Api.get(62);assert.equal(String(detail.generationEligibility.products[0].expiryPriorityScore),expiryScore);
  await f06Api.approve(62,{expectedVersion:detail.version,reason:'Fixture decision'});
  assert.deepEqual(JSON.parse(String(calls[2].body)),{expectedVersion:1,reason:'Fixture decision'});
  assert.equal(calls.length,3);
  t.mock.method(authService,'request',async()=>new Response(rawItem().replace('"version":1','"version":9007199254740993')));
  await assert.rejects(f06Api.get(62),(e:unknown)=>e instanceof F06ApiError&&e.status===200);
});
