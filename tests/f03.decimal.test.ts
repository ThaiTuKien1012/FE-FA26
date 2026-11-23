import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseF03Json, decimalText, compareDecimal, decimalBody } from '../src/features/f03/f03.decimal';
import { utilityNumber, sortMatrix, configDraftDirty } from '../src/features/f03/f03.presentation';
import { configErrors, draftFromConfig, validLambda } from '../src/features/f03/f03.validation';
import { f03Api, type F03MatrixPage } from '../src/features/f03/f03.api';
import { authService } from '../src/services/authService';
import { configView, matrix, snapshot, legacyMatrix, scores } from './f03.fixtures';
import { user } from './f05.fixtures';
import { SnapshotMetadataContent } from '../src/features/f03/components/SnapshotMetadataDetails';
import { Matrix } from '../src/features/f03/components/UtilityMatrix';

for (const [raw, text] of [
  ['12345678901.123456','12,345,678,901.123456'],
  ['0.333333333333333333','0.333333333333333333'],
  ['1e-18','0.000000000000000001'], ['0','0'], ['-0.000000000000000001','-0.000000000000000001'],
  ['999999999999999999999999.123456','999,999,999,999,999,999,999,999.123456']
]) test('F03 decimal token preserved and displayed: '+raw, () => {
  const parsed=parseF03Json('{"totalWeightedUtility":'+raw+',"snapshotId":21,"totalElements":1}') as any;
  assert.equal(utilityNumber(parsed.totalWeightedUtility),text);
  assert.equal(parsed.snapshotId,21); assert.equal(typeof parsed.snapshotId,'number'); assert.equal(parsed.totalElements,1);
});
test('Nulls, strings, marker-like keys and unsafe integers are handled deliberately', () => {
  assert.equal(utilityNumber((parseF03Json('{"weightValue":null}') as any).weightValue),'Unavailable');
  assert.deepEqual(parseF03Json('{"warnings":["12345678901.123456"],"productIds":[1,2]}'),{warnings:['12345678901.123456'],productIds:[1,2]});
  for(const key of ['snapshotId','totalElements','version','productId']) assert.throws(()=>parseF03Json('{"'+key+'":9007199254740993}'),/unsafe F03 integer/);
  assert.throws(()=>parseF03Json('{"snapshotId":1.5}'),/unsafe F03 integer/);
  assert.throws(()=>parseF03Json('{"weightValue":NaN}'));
  assert.deepEqual(parseF03Json('{"\\u0000f03-number":0,"weightValue":0.333333333333333333}'),{'\0f03-number':0,weightValue:'0.333333333333333333'});
});
test('Exact sort handles adjacent decimals, ties, negatives, nulls and complete-page boundary', () => {
  const base=matrix().items[0];
  const data={...matrix(),page:0,totalElements:5,items:[
    {...base,transactionId:1,weightedUtility:'12345678901.123457'},
    {...base,transactionId:2,weightedUtility:'12345678901.123456'},
    {...base,transactionId:3,weightedUtility:'12345678901.1234560'},
    {...base,transactionId:4,weightedUtility:'-0.000000000000000001'},
    {...base,transactionId:5,weightedUtility:null}
  ]};
  assert.deepEqual(sortMatrix(data,{key:'weightedUtility',direction:'asc'}).map(r=>r.transactionId),[4,2,3,1,5]);
  assert.deepEqual(sortMatrix(data,{key:'weightedUtility',direction:'desc'}).map(r=>r.transactionId),[1,2,3,4,5]);
  assert.deepEqual(sortMatrix({...data,totalElements:6},{key:'weightedUtility',direction:'asc'}),data.items);
  assert.equal(compareDecimal('-1.000000000000000001','-1'),-1); assert.equal(compareDecimal('1e-18','0'),1);
});
test('Large saved lambda retains exact drafts, dirty checks, policy validation and numeric JSON writes', () => {
  const config={...configView.config,lambda:'999999999999999999999998.123456'};
  const draft=draftFromConfig(config), policy={...configView.lambdaPolicy,lambdaMax:'999999999999999999999999.123456'};
  assert.equal(draft.lambda,config.lambda); assert.equal(configDraftDirty(draft,config),false);
  assert.equal(configDraftDirty({...draft,lambda:'999999999999999999999998.123457'},config),true);
  assert.deepEqual(configErrors(draft,policy),[]); assert.ok(configErrors({...draft,lambda:'999999999999999999999999.123457'},policy).length);
  assert.ok(configErrors({...draft,alpha:'0.333333',beta:'0.666666'},policy).length);
  assert.equal(validLambda('1000000000000000000000000'),false);
  assert.equal(decimalBody({lambda:draft.lambda,name:'literal 42'},['lambda']),'{"lambda":999999999999999999999998.123456,"name":"literal 42"}');
  assert.throws(()=>decimalBody({lambda:'1,\"injected\":1'},['lambda']));
});
test('Preview, Snapshot, Matrix, history, scores and legacy transport keep exact values without real API calls', async t => {
  t.mock.method(authService,'getCurrentUser',()=>({...user,role:'Merchandiser',storeId:1}));
  t.mock.method(authService,'getToken',()=> 'fixture-only');
  const raw=(v:unknown)=>JSON.stringify(v).replaceAll('242.35554','12345678901.123456').replaceAll('0.25','0.333333333333333333');
  let response=raw(matrix()); const writes:string[]=[];
  t.mock.method(authService,'request',async (_path:string, init:RequestInit={})=>{if(init.body)writes.push(String(init.body));return new Response(response,{status:200,headers:{'Content-Type':'application/json'}});});
  const dates={rangeStart:'2026-10-01',rangeEnd:'2026-10-31',asOfDate:'2026-11-05'};
  const preview=await f03Api.preview(dates); assert.equal(utilityNumber(preview.totalWeightedUtility),'12,345,678,901.123456');
  response=raw(snapshot()); const saved=await f03Api.createSnapshot(dates); assert.equal(saved.totalWeightedUtility,'12345678901.123456');
  assert.deepEqual(writes.map(value => JSON.parse(value)),[dates,dates]);
  const html=renderToStaticMarkup(createElement(SnapshotMetadataContent,{snapshot:saved})); assert.ok(html.includes('12,345,678,901.123456'));
  response=raw(matrix()); const page=await f03Api.getMatrix(21); assert.equal(utilityNumber(page.items[0].expiryRisk),'0.333333333333333333');
  assert.ok(renderToStaticMarkup(createElement(Matrix,{result:page,names:{1:'Product One'},loadPage:()=>{},busy:false})).includes('0.333333333333333333'));
  response=raw({items:[snapshot()],page:0,pageSize:20,totalElements:1}); assert.equal((await f03Api.listSnapshots()).items[0].totalWeightedUtility,'12345678901.123456');
  response=raw(scores); assert.equal(utilityNumber((await f03Api.getScores(1)).expiryRisk),'0.333333333333333333');
  response=raw(legacyMatrix()); const legacy=await f03Api.getMatrix(21); assert.equal(legacy.items[0].expiryRisk,null); assert.equal(legacy.configuration?.config.scoringVersion,'F03_LINEAR_V1');
  response=raw(configView); await f03Api.updateConfig({...configView.config,lambda:'12345678901.123456'});
  assert.ok(writes.at(-1)!.includes('"lambda":12345678901.123456')); assert.equal(writes.at(-1)!.includes('"lambda":"'),false);
});
