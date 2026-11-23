import assert from 'node:assert/strict';
import test from 'node:test';
import { ExactMiningNumber, parseMiningResponse, miningText, compareMining, exactMiningValue } from '../src/features/f05/f05.precision';
import { formatMiningNumber } from '../src/features/f05/f05.display';
import { parseMinUtilInput, parseMiningId, parseSafeMiningJson } from '../src/features/f05/f05.numbers';
import { isRequestView, isRunView, isMiningProgressView, isBenchmarkView, isPatternView } from '../src/features/f05/f05.read-contracts';
import { benchmarkRuntimeDifference, assertBenchmarkContext } from '../src/features/f05/f05.results';
import { f05Api } from '../src/features/f05/f05.api';
import { f05SystemApi } from '../src/features/f05/f05.system.api';
import { authService } from '../src/services/authService';
import { conversionRequestFixture, conversionRunFixture, progressFixture, benchmarkFixture, requestFixture, user, configuration } from './f05.fixtures';
import { RecommendationGeneration } from '../src/features/f06/f06.generate';
import { f06Api } from '../src/features/f06/f06.api';
import { policy, generation } from './f06.fixtures';

for(const [raw,display] of [
 ['12345678901.123456','12,345,678,901.123456'], ['0.333333333333333333','0.333333333333333333'],
 ['1.234567890123456000','1.234567890123456'],['1e-18','0.000000000000000001'],
 ['999999999999999999999999.123456','999,999,999,999,999,999,999,999.123456'], ['0','0'],['1e6','1,000,000']
])test('Mining BigDecimal reads/displays exactly '+raw,()=>{
 const parsed=parseMiningResponse('{"utility":'+raw+'}') as any;
 assert.equal(formatMiningNumber(parsed.utility),display);
 if(parsed.utility instanceof ExactMiningNumber) { assert.equal(parsed.utility.source,raw); assert.throws(()=>Number(parsed.utility)); assert.throws(()=>JSON.stringify(parsed.utility)); }
});
test('Null, safe IDs, int64 metadata, fractional/overflow integers and quoted decimals stay distinct',()=>{
 const value=parseMiningResponse('{"requestId":9007199254740991,"divisor":9007199254740993,"totalScaledUtility":9223372036854775807,"elapsedMs":null}') as any;
 assert.equal(value.requestId,Number.MAX_SAFE_INTEGER);assert.equal(String(value.divisor),'9007199254740993');assert.equal(String(value.totalScaledUtility),'9223372036854775807');assert.equal(value.elapsedMs,null);
 for(const field of ['requestId','runId','patternId','totalElements','version']) assert.throws(()=>parseMiningResponse('{"'+field+'":9007199254740993}'),new RegExp(field+'.*9007199254740993.*navigation'));
 for(const raw of ['9223372036854775808','1.5']) assert.throws(()=>parseMiningResponse('{"elapsedMs":'+raw+'}'),/Invalid int64/);
 assert.throws(()=>parseMiningId('9007199254740993'));
 const pattern={patternId:1,runId:42,productIds:[1],utility:'12345678901.123456',utilitySpmf:1,patternSize:1,supportCount:null};assert.equal(isPatternView(pattern),false);
 assert.deepEqual(parseMiningResponse('{"warnings":["12345678901.123456"],"utility":null}'),{warnings:['12345678901.123456'],utility:null});
 // The existing strict scalar guard remains available to F06 and stored submission keys.
 assert.throws(()=>parseSafeMiningJson('12345678901.123456'));
});
const raw=(value:unknown)=>JSON.stringify(value).replaceAll('"totalWeightedUtility":48.123456','"totalWeightedUtility":12345678901.123456');
function actor(t:any, role:'Merchandiser'|'System Admin'='Merchandiser') {
 t.mock.method(authService,'getCurrentUser',()=>({...user,role,storeId:1}));t.mock.method(authService,'getToken',()=> 'fixture');t.mock.method(authService,'getSessionId',()=> 'precision-fixture');t.mock.method(authService,'subscribe',()=>()=>{});
}
for(const mode of ['LOSSLESS','WHOLE_UNIT_HALF_UP'] as const)test(mode+' actual F05 reads feed F06 source selection and Generate with exact run ID',async t=>{
 actor(t);const source=conversionRequestFixture(mode,'COMPLETED'),run=conversionRunFixture(mode,'COMPLETED');const writes:any[]=[];
 t.mock.method(authService,'request',async (path:string,init:RequestInit={})=>{
  if(path==='/api/mining/requests/17')return new Response(raw(source));
  if(path.startsWith('/api/mining/requests?'))return new Response(raw({items:[source],page:0,pageSize:20,totalElements:1}));
  if(path==='/api/mining/requests/17/runs')return new Response(raw([run]));
  if(path==='/api/mining/runs/42')return new Response(raw({...run,runtimeMillis:4}).replace('"runtimeMillis":4','"runtimeMillis":9007199254740993'));
  if(path==='/api/recommendations/generate'){writes.push(JSON.parse(String(init.body)));return Response.json(generation);}
  throw Error('Unexpected fixture request '+path);
 });
 t.mock.method(f06Api,'getConfig',async()=>policy);
 const history=await f05Api.listRequests();assert.equal(String(history.items[0].snapshot.totalWeightedUtility),'12345678901.123456');
 const workflow=new RecommendationGeneration();t.after(workflow.stop);workflow.start();await new Promise(r=>setTimeout(r,20));
 await workflow.selectRequest(17);workflow.selectRun(42);await workflow.generate();
 assert.equal(workflow.getSnapshot().generationError,'');assert.deepEqual(writes,[{miningRunId:42,types:['BUNDLE']}]);
 assert.equal(formatMiningNumber((await f05Api.getRun(42)).runtimeMillis),'9,007,199,254,740,993');
});
test('Request/History/Pattern/Progress preserve precise values and enforce errors/session fences without mining replay',async t=>{
 actor(t);let response=raw(conversionRequestFixture('LOSSLESS','COMPLETED')).replace('"totalScaledUtility":100','"totalScaledUtility":9007199254740993');let calls=0;
 t.mock.method(authService,'request',async()=>{calls++;return new Response(response);});
 assert.ok(isRequestView(await f05Api.getRequest(17)));
 response=raw({...progressFixture('RUNNING'),elapsedMs:4}).replace('"elapsedMs":4','"elapsedMs":9007199254740993');
 const progress=await f05Api.getProgress(17);assert.ok(isMiningProgressView(progress));assert.equal(String(progress.elapsedMs),'9007199254740993');
 response='{"items":[{"patternId":1,"runId":42,"productIds":[1],"utility":12345678901.123456,"utilitySpmf":1,"patternSize":1,"supportCount":null}],"page":0,"pageSize":20,"totalElements":1}';
 assert.equal(String((await f05Api.listPatterns(42)).items[0].utility),'12345678901.123456');
 response=raw(conversionRunFixture('LOSSLESS','COMPLETED'));t.mock.method(authService,'request',async()=>{calls++;t.mock.method(authService,'getSessionId',()=> 'changed');return new Response(response);});
 await assert.rejects(f05Api.getRun(42),/session changed/);assert.equal(calls,4);
});
test('Large metadata, decimal provenance and benchmark runtime differences compare exactly',()=>{
 const request=requestFixture('COMPLETED');const a=benchmarkFixture(),b=benchmarkFixture('EFIM');
 const divisor=()=>exactMiningValue('9007199254740993');request.divisor=divisor();a.divisor=divisor();b.divisor=divisor();
 request.effectiveMinUtility=exactMiningValue('12345678901.123456');a.effectiveMinUtility=exactMiningValue('12345678901.123456');b.effectiveMinUtility=exactMiningValue('12345678901.123456');
 a.run.runtimeMillis=exactMiningValue('9007199254740993');b.run.runtimeMillis=exactMiningValue('9007199254740995');
 assert.ok(isBenchmarkView(a));assert.doesNotThrow(()=>assertBenchmarkContext(a,request,a.run));
 assert.deepEqual(benchmarkRuntimeDifference(request,[a,b]),{algorithm:'HUI_MINER',differenceMillis:2});
 assert.equal(compareMining(exactMiningValue('0.333333333333333333'),exactMiningValue('0.333333333333333334')),-1);
 assert.equal(formatMiningNumber(exactMiningValue('12.345000000000000001'),2),'12.35');
});
test('System policy writes exact JSON numbers and keeps manual mining disabled',async t=>{
 actor(t,'System Admin');const input='999999999999999999999999.123456',value=parseMinUtilInput(input,'ABSOLUTE');let body='';let count=0;
 t.mock.method(authService,'request',async (_path:string,init:RequestInit={})=>{count++;body=String(init.body);return new Response(JSON.stringify({...configuration,version:2,minUtilMode:'ABSOLUTE',minUtilValue:1}).replace('"minUtilValue":1','"minUtilValue":'+input));});
 const result=await f05SystemApi.updateConfiguration({minUtilMode:'ABSOLUTE',minUtilValue:value,expectedVersion:1});
 assert.equal(miningText(result.minUtilValue!),input);assert.ok(body.includes('"minUtilValue":'+input));assert.equal(body.includes('"minUtilValue":"'),false);
 await assert.rejects(f05SystemApi.createRequest({storeId:1,snapshotId:2,requestKey:'009f3ef1-d4ba-4291-9854-b74c6878d26b'}),/Manual analysis is disabled/);assert.equal(count,1);
});

test('Product label lookup accepts the full ProductView with decimal prices',async t=>{
 actor(t);t.mock.method(authService,'request',async()=>new Response('{"id":7,"name":"Milk","sku":"SKU-00000000007","sellingPrice":12.75,"costPrice":10.25,"stockQuantity":10}'));
 assert.equal(await f05Api.getProductLabel(7),'Milk');
});
