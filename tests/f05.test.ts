import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { setImmediate as flush } from 'node:timers/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { authService, ROLE_PERMISSIONS } from '../src/services/authService';
import type { AuthUser } from '../src/services/authService';
import { f05Api, F05ApiError } from '../src/features/f05/f05.api';
import { f05SystemApi, validateConfiguration, validateManualRequest } from '../src/features/f05/f05.system.api';
import { F05NumberError, parseMiningId, parseMinUtilInput, parseSafeMiningJson } from '../src/features/f05/f05.numbers';
import { readMiningLocation } from '../src/features/f05/f05.navigation';
import { clearPendingSubmission, readPendingSubmission, sendSubmission } from '../src/features/f05/f05.submission';
import { systemMiningReader, storeMiningReader } from '../src/features/f05/f05.reader';
import { watchMiningRequest } from '../src/features/f05/f05.progress';
import type { MiningProgress } from '../src/features/f05/f05.progress';
import { assessBenchmarkComparison, assertBenchmarkContext } from '../src/features/f05/f05.results';
import { F05WorkspaceView } from '../src/features/f05/components/F05WorkspaceView';
import { MiningRunResults } from '../src/features/f05/components/MiningRunResults';
import { MiningPatternsView } from '../src/features/f05/components/MiningPatternsView';
import { user, payload, configuration, snapshot, requestFixture, runFixture, benchmarkFixture } from './f05.fixtures';

// All HTTP is replaced in tests. No live endpoint, credential or database is used.
class MemoryStorage implements Storage {
  private values=new Map<string,string>();
  get length(){return this.values.size;}
  clear(){this.values.clear();}
  getItem(k:string){return this.values.get(k)??null;}
  key(i:number){return [...this.values.keys()][i]??null;}
  removeItem(k:string){this.values.delete(k);}
  setItem(k:string,v:string){this.values.set(k,v);}
}
function globals(t:TestContext,key:string,value:unknown) {
  const old=Object.getOwnPropertyDescriptor(globalThis,key);
  Object.defineProperty(globalThis,key,{value,configurable:true});
  t.after(()=>{if(old)Object.defineProperty(globalThis,key,old);else Reflect.deleteProperty(globalThis,key);});
}
function actor(t:TestContext,role:AuthUser['role']='System Admin') {
  t.mock.method(authService,'getCurrentUser',()=>({...user,role}));
  t.mock.method(authService,'getToken',()=> 'test-only-token');
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('Unexpected test request: no live fetch is permitted');});
}
const page=<T>(items:T[],page=0,pageSize=20,totalElements=items.length)=>({items,page,pageSize,totalElements});
const hasStatus=(status:number|null)=>(e:unknown)=>e instanceof F05ApiError && e.status===status;

test('numeric input and raw JSON preserve decimal meaning without silent rounding',()=>{
  for(const s of ['0.5','0.000001','0.123456','100.000000'])assert.equal(parseMinUtilInput(s,'PERCENTAGE'),Number(s));
  for(const s of ['0000.500000','123456789.123456','9007199254740991'])assert.equal(parseMinUtilInput(s,'ABSOLUTE'),Number(s));
  for(const s of ['','0','-1','NaN','Infinity','0.1234567','1e-6','0,5','1.','100.000001','101'])assert.throws(()=>parseMinUtilInput(s,'PERCENTAGE'),F05NumberError);
  for(const s of ['9007199254740993','9007199254.740991','1234567890123456789012345'])assert.throws(()=>parseMinUtilInput(s,'ABSOLUTE'),F05NumberError);
  assert.deepEqual(parseSafeMiningJson('{"id":9007199254740991,"utility":1.230000,"small":1e-6}'),{id:Number.MAX_SAFE_INTEGER,utility:1.23,small:1e-6});
  for(const s of ['{"id":9007199254740993}','{"utility":1234567890123.123456}','[1e309]','[1e-999]','[0.100000000000000005]'])assert.throws(()=>parseSafeMiningJson(s),F05NumberError);
  const text=JSON.stringify({text:'9007199254740993 and "1234567890123.123456"',date:'2026-11-03'});
  assert.deepEqual(parseSafeMiningJson(text),JSON.parse(text));
  assert.equal(parseMiningId('9007199254740991'),Number.MAX_SAFE_INTEGER);
  for(const s of ['9007199254740993','1.5','001','-1','abc'])assert.throws(()=>parseMiningId(s),F05NumberError);
});

test('all four actors are gated before fetching; retired endpoints are absent',async t=>{
  actor(t);let role:AuthUser['role']='System Admin';let calls=0;
  t.mock.method(authService,'getCurrentUser',()=>({...user,role}));
  t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json(page([]));});
  for(const next of ['System Admin','Store Admin','Merchandiser','End-Customer'] as const){
    role=next;const before=calls;
    if(next==='System Admin'){
      await f05SystemApi.listStores();await assert.rejects(f05Api.listSnapshots(),hasStatus(403));
      assert.equal(calls,before+1);
    } else if(next==='End-Customer'){
      await assert.rejects(f05Api.listSnapshots(),hasStatus(403));await assert.rejects(f05SystemApi.listStores(),hasStatus(403));assert.equal(calls,before);
    } else {
      await f05Api.listSnapshots();await assert.rejects(f05SystemApi.createRequest(payload),hasStatus(403));
      await assert.rejects(f05SystemApi.getBenchmark(1,42),hasStatus(403));assert.equal(calls,before+1);
    }
    assert.equal(ROLE_PERMISSIONS[next].allowedScreens.includes('f05-mining'),next!=='End-Customer');
  }
  assert.equal('createRequest' in f05Api,false);assert.equal('getBenchmark' in f05Api,false);
  assert.equal('listPatterns' in f05SystemApi,false);
  assert.ok(ROLE_PERMISSIONS.Merchandiser.allowedScreens.includes('f03-preview'));
  t.mock.method(authService,'getCurrentUser',()=>null);
  await assert.rejects(f05SystemApi.listStores(),hasStatus(401));
});

test('restoreSession and real-login mapping agree on F05 for every role',async t=>{
  const storage=new MemoryStorage();globals(t,'localStorage',storage);
  const Constructor=authService.constructor as {new():typeof authService};
  for(const [role,code] of [['System Admin','SYSTEM_ADMIN'],['Store Admin','STORE_ADMIN'],['Merchandiser','MERCHANDISER'],['End-Customer','END_CUSTOMER']] as const){
    storage.setItem('retailspace_auth_user',JSON.stringify({...user,role,allowedScreens:[]}));
    const service=new Constructor();assert.equal(service.isScreenAllowed(service.getCurrentUser(),'f05-mining'),role!=='End-Customer');
    t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL)=>String(url).endsWith('/login')?Response.json({accessToken:'test-only-token'}):Response.json({userId:7,name:'Test',email:user.email,roleCode:code}));
    const result=await service.login({email:user.email,password:'fixture-only'});
    assert.equal(result.success,true);assert.equal(service.isScreenAllowed(service.getCurrentUser(),'f05-mining'),role!=='End-Customer');
  }
});

test('configuration version zero is valid and PUT sends expectedVersion=0 with numeric 0.5',async t=>{
  actor(t);const calls:{url:string;init?:RequestInit}[]=[];
  t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL,init?:RequestInit)=>{
    calls.push({url:String(url),init});
    return Response.json(init?.method==='PUT'?configuration:{version:0,algorithm:null,minUtilMode:null,minUtilValue:null,changedBy:null,changedAt:null});
  });
  assert.equal((await f05SystemApi.getConfiguration()).version,0);
  assert.equal((await f05SystemApi.updateConfiguration({algorithm:'HUI_MINER',minUtilMode:'PERCENTAGE',minUtilValue:0.5,expectedVersion:0})).version,1);
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)),{algorithm:'HUI_MINER',minUtilMode:'PERCENTAGE',minUtilValue:0.5,expectedVersion:0});
  assert.equal(calls[0].url,'/api/system/mining/config');
  assert.equal(new Headers(calls[0].init?.headers).get('Content-Type'),null);
  assert.equal(new Headers(calls[1].init?.headers).get('Authorization'),'Bearer test-only-token');
  assert.equal(new Headers(calls[1].init?.headers).get('Accept'),'application/json');
});

test('configuration rejects unsafe versions/decimals; 409 is preserved without automatic retry',async t=>{
  actor(t);let calls=0;
  for(const p of [
    {...configuration,expectedVersion:-1},{...configuration,expectedVersion:Number.MAX_SAFE_INTEGER},
    {...configuration,expectedVersion:0,minUtilValue:0},{...configuration,expectedVersion:0,minUtilValue:101},
    {...configuration,expectedVersion:0,minUtilValue:0.1234567}
  ]) assert.throws(()=>validateConfiguration(p as Parameters<typeof validateConfiguration>[0]),hasStatus(400));
  t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({error:'Mining configuration version conflict'},{status:409});});
  await assert.rejects(f05SystemApi.updateConfiguration({algorithm:'EFIM',minUtilMode:'ABSOLUTE',minUtilValue:30,expectedVersion:1}),hasStatus(409));
  assert.equal(calls,1);
  t.mock.method(globalThis,'fetch',async()=>new Response('{"version":9007199254740993}'));
  await assert.rejects(f05SystemApi.getConfiguration(),hasStatus(200));
  t.mock.method(globalThis,'fetch',async()=>Response.json({...configuration,version:0}));
  await assert.rejects(f05SystemApi.getConfiguration(),hasStatus(200));
});

test('Store picker pages and all administrative reads keep explicit Store scope',async t=>{
  actor(t);const urls:string[]=[];
  t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL)=>{
    const u=String(url);urls.push(u);
    if(u.includes('/system/stores?'))return Response.json(page([{storeId:1,name:'Store A'}],1,10,11));
    if(u.includes('/snapshots?'))return Response.json(page([snapshot()]));
    if(u.endsWith('/requests/17/runs'))return Response.json([runFixture()]);
    if(u.endsWith('/requests/17'))return Response.json(requestFixture());
    return Response.json(page([requestFixture()]));
  });
  await f05SystemApi.listStores(1,10);await f05SystemApi.listSnapshots(1);
  await f05SystemApi.listRequests(1);await f05SystemApi.getRequest(1,17);await f05SystemApi.listRuns(1,17);
  assert.deepEqual(urls,['/api/system/stores?page=1&pageSize=10','/api/system/mining/stores/1/snapshots?page=0&pageSize=20',
    '/api/system/mining/stores/1/requests?page=0&pageSize=20','/api/system/mining/stores/1/requests/17','/api/system/mining/stores/1/requests/17/runs']);
  await assert.rejects(f05SystemApi.listStores(100001),hasStatus(400));
  await assert.rejects(f05SystemApi.listSnapshots(2147483648),hasStatus(400));
  await assert.rejects(f05SystemApi.listRequests(1,0,101),hasStatus(400));
});

test('cross-Store snapshots, requests, runs and benchmarks are rejected before display',async t=>{
  actor(t);
  for(const [read,body] of [
    [()=>f05SystemApi.listSnapshots(1),page([snapshot(2)])],
    [()=>f05SystemApi.listRequests(1),page([requestFixture('PENDING',2)])],
    [()=>f05SystemApi.getRequest(1,17),requestFixture('PENDING',2)],
    [()=>f05SystemApi.listRuns(1,17),[runFixture('PENDING',2)]],
    [()=>f05SystemApi.getBenchmark(1,42),{...benchmarkFixture(),run:{...benchmarkFixture().run,storeId:2}}]
  ] as const){
    t.mock.method(globalThis,'fetch',async()=>Response.json(body));await assert.rejects(read(),hasStatus(200));
  }
});

test('manual request sends only four DTO fields, handles compare true/false and never resends policy',async t=>{
  actor(t);
  for(const compareAlgorithms of [false,true]){
    t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL,init?:RequestInit)=>{
      assert.equal(url,'/api/system/mining/requests');assert.equal(init?.method,'POST');
      const sent=JSON.parse(String(init?.body));assert.deepEqual(sent,{...payload,compareAlgorithms});
      return Response.json({...requestFixture(),algorithms:compareAlgorithms?['HUI_MINER','EFIM']:['EFIM']},{status:202});
    });
    const result=await f05SystemApi.createRequest({...payload,compareAlgorithms,algorithm:'HUI_MINER',minUtilValue:99} as typeof payload);
    assert.equal(result.algorithms.length,compareAlgorithms?2:1);assert.equal(result.status,'PENDING');
  }
  for(const invalid of [{...payload,storeId:0},{...payload,snapshotId:1.5},{...payload,requestKey:'bad'},{...payload,compareAlgorithms:null}]){
    assert.throws(()=>validateManualRequest(invalid as typeof payload),hasStatus(400));
  }
});

test('network-uncertain submission restores and retries byte-for-byte with the original UUID',async t=>{
  actor(t);const storage=new MemoryStorage();globals(t,'sessionStorage',storage);
  const bodies:string[]=[];
  t.mock.method(globalThis,'fetch',async(_url:RequestInfo|URL,init?:RequestInit)=>{bodies.push(String(init?.body));if(bodies.length===1)throw new TypeError('offline');return Response.json(requestFixture(),{status:202});});
  await assert.rejects(sendSubmission(user.id,payload),hasStatus(null));
  const restored=readPendingSubmission(user.id);assert.deepEqual(restored,payload);
  await sendSubmission(user.id,restored!);assert.equal(bodies[0],bodies[1]);
  assert.ok(readPendingSubmission(user.id));clearPendingSubmission(user.id);assert.equal(readPendingSubmission(user.id),null);
});

test('one pending POST joins duplicate clicks and blocks a different payload/key or clear while active',async t=>{
  actor(t);globals(t,'sessionStorage',new MemoryStorage());
  let release!:(r:Response)=>void;let calls=0;
  t.mock.method(globalThis,'fetch',()=>{calls++;return new Promise<Response>(resolve=>{release=resolve;});});
  const a=sendSubmission(user.id,payload);const b=sendSubmission(user.id,{...payload});assert.equal(a,b);assert.equal(calls,1);
  assert.throws(()=>sendSubmission(user.id,{...payload,storeId:2}),/in progress/);
  assert.throws(()=>clearPendingSubmission(user.id),/Wait/);
  release(Response.json(requestFixture(),{status:202}));await a;clearPendingSubmission(user.id);
});

test('unresolved saved payload cannot be overwritten, unsafe 202 and storage errors retain a safe retry boundary',async t=>{
  actor(t);const storage=new MemoryStorage();globals(t,'sessionStorage',storage);
  let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('{"requestId":9007199254740993}',{status:202});});
  await assert.rejects(sendSubmission(user.id,payload),hasStatus(202));
  assert.deepEqual(readPendingSubmission(user.id),payload);
  assert.throws(()=>sendSubmission(user.id,{...payload,compareAlgorithms:false}),/Resolve/);assert.equal(calls,1);
  clearPendingSubmission(user.id);
  t.mock.method(storage,'setItem',()=>{throw new Error('storage denied');});
  assert.throws(()=>sendSubmission(user.id,payload),/No new request/);assert.equal(calls,1);
});

test('legacy Store drafts are ignored; administrative restore is explicit and never auto-submits',t=>{
  actor(t);const storage=new MemoryStorage();globals(t,'sessionStorage',storage);let calls=0;
  storage.setItem('paspm:f05:pending:'+encodeURIComponent(user.id),JSON.stringify({requestKey:payload.requestKey,snapshotId:2,algorithms:['EFIM'],minUtilValue:30}));
  t.mock.method(globalThis,'fetch',async()=>{calls++;throw new Error('Unexpected request');});
  assert.equal(readPendingSubmission(user.id),null);assert.equal(calls,0);
  storage.setItem('paspm:f05:system:v2:pending:'+encodeURIComponent(user.id),'corrupt');
  assert.throws(()=>readPendingSubmission(user.id));assert.equal(calls,0);
});

test('all relevant HTTP errors and empty/invalid envelopes preserve status with no retry',async t=>{
  actor(t);
  for(const status of [400,401,403,404,409,503]){
    let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('',{status});});
    await assert.rejects(f05SystemApi.getConfiguration(),hasStatus(status));assert.equal(calls,1);
  }
  t.mock.method(globalThis,'fetch',async()=>new Response('not JSON'));await assert.rejects(f05SystemApi.getConfiguration(),hasStatus(200));
  t.mock.method(globalThis,'fetch',async()=>{throw new TypeError('offline');});await assert.rejects(f05SystemApi.getConfiguration(),hasStatus(null));
});

test('Store read-only history/snapshots/pattern pagination and nullable support retain backend order',async t=>{
  actor(t,'Merchandiser');const urls:string[]=[];
  t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL,init?:RequestInit)=>{
    urls.push(String(url));assert.equal(init?.method,undefined);assert.equal(new Headers(init?.headers).get('Content-Type'),null);
    if(String(url).includes('/patterns?'))return Response.json(page([{patternId:99,runId:42,productIds:[7,2],utility:12.123456,utilitySpmf:12,patternSize:2,supportCount:null}],1,20,21));
    if(String(url).includes('/snapshots?'))return Response.json(page([snapshot()]));
    return Response.json(page([requestFixture()]));
  });
  await f05Api.listSnapshots();await f05Api.listRequests();
  const patterns=await f05Api.listPatterns(42,1,20);assert.deepEqual(patterns.items[0].productIds,[7,2]);assert.equal(patterns.items[0].supportCount,null);
  assert.deepEqual(urls,['/api/mining/snapshots?page=0&pageSize=20','/api/mining/requests?page=0&pageSize=20','/api/mining/runs/42/patterns?page=1&pageSize=20']);
  t.mock.method(globalThis,'fetch',async()=>Response.json(page([])));assert.deepEqual((await f05Api.listPatterns(42)).items,[]);
});

test('pattern validation rejects wrong run IDs, invalid items and unsafe raw decimals/IDs',async t=>{
  actor(t,'Store Admin');
  const valid={patternId:91,runId:42,productIds:[7,2],utility:12.123456,utilitySpmf:12,patternSize:2,supportCount:null};
  for(const item of [{...valid,runId:43},{...valid,productIds:[2,2]},{...valid,patternSize:3},{...valid,utility:-1},{...valid,supportCount:undefined}]){
    t.mock.method(globalThis,'fetch',async()=>Response.json(page([item])));await assert.rejects(f05Api.listPatterns(42),hasStatus(200));
  }
  for(const body of [JSON.stringify(page([valid])).replace('"patternId":91','"patternId":9007199254740993'),JSON.stringify(page([valid])).replace('12.123456','1234567890123.123456')]){
    t.mock.method(globalThis,'fetch',async()=>new Response(body));await assert.rejects(f05Api.listPatterns(42),hasStatus(200));
  }
});

test('System benchmark keeps null/zero metrics, real statuses and compatible MATCH semantics',async t=>{
  actor(t);
  for(const comparisonStatus of ['NOT_REQUESTED','PENDING','MATCH','FAILED','BLOCKED'] as const){
    const row={...benchmarkFixture(),comparisonStatus,run:{...benchmarkFixture().run,runtimeMillis:null,memoryMiB:null,patternCount:null}};
    t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL)=>{assert.equal(url,'/api/system/mining/stores/1/runs/42/benchmark');return Response.json(row);});
    const result=await f05SystemApi.getBenchmark(1,42);assert.equal(result.run.runtimeMillis,null);assert.equal(result.comparisonStatus,comparisonStatus);
  }
  const rows=[benchmarkFixture(),benchmarkFixture('EFIM')];const request=requestFixture('COMPLETED');
  assert.equal(assessBenchmarkComparison(request,rows).comparable,true);
  assert.equal(rows[0].run.runtimeMillis,0);assert.equal(rows[0].run.patternCount,0);
  for(const patch of [{environment:null},{environment:'other'},{runtimeMillis:null},{memoryMiB:null},{patternCount:null},{memoryMethod:'RSS'},{status:'TIMED_OUT' as const}]){
    assert.equal(assessBenchmarkComparison(request,[rows[0],{...rows[1],run:{...rows[1].run,...patch}}]).comparable,false);
  }
  for(const comparisonStatus of ['NOT_REQUESTED','PENDING','FAILED','BLOCKED'] as const)assert.equal(assessBenchmarkComparison({...request,comparisonStatus},rows).comparable,false);
  assert.throws(()=>assertBenchmarkContext({...rows[0],divisor:2},request,rows[0].run),F05ApiError);
  const single=assessBenchmarkComparison({...request,algorithms:['EFIM'],comparisonStatus:'BLOCKED'},[rows[1]]);
  assert.equal(single.comparable,false);assert.match(single.message,/BLOCKED/);
});

test('benchmark invalid/unsafe data is rejected without inventing measurements',async t=>{
  actor(t);const valid=benchmarkFixture();
  for(const body of [
    {...valid,run:{...valid.run,runId:43}}, {...valid,run:{...valid.run,runtimeMillis:-1}},
    {...valid,comparisonStatus:'COMPLETED'},{...valid,divisor:0},{...valid,repetitionPolicy:null}
  ]){
    t.mock.method(globalThis,'fetch',async()=>Response.json(body));await assert.rejects(f05SystemApi.getBenchmark(1,42),hasStatus(200));
  }
  t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify(valid).replace('"divisor":1','"divisor":9007199254740993')));
  await assert.rejects(f05SystemApi.getBenchmark(1,42),hasStatus(200));
});

test('polling follows request state, never polls history, and stops at a terminal request',async t=>{
  actor(t,'Merchandiser');t.mock.timers.enable({apis:['setTimeout']});
  const updates:MiningProgress[]=[];const errors:unknown[]=[];const paths:string[]=[];let reads=0;
  const states=['PENDING','RUNNING','COMPLETED'] as const;
  t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL)=>{const s=String(url);paths.push(s);return Response.json(s.endsWith('/runs')?[runFixture()]:requestFixture(states[reads++]));});
  const stop=watchMiningRequest(17,x=>updates.push(x),e=>errors.push(e));t.after(stop);
  await flush();assert.equal(updates.length,1);
  t.mock.timers.tick(1500);await flush();assert.equal(updates[1].request.status,'RUNNING');
  t.mock.timers.tick(1500);await flush();assert.equal(updates[2].request.status,'COMPLETED');
  t.mock.timers.tick(60000);await flush();assert.equal(reads,3);assert.deepEqual(errors,[]);
  assert.ok(paths.every(p=>p==='/api/mining/requests/17'||p==='/api/mining/requests/17/runs'));
});

test('administrative polling uses scoped run list for details, never invents a GET run or pattern route',async t=>{
  actor(t);const urls:string[]=[];let update:MiningProgress|undefined;
  t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL)=>{urls.push(String(url));return Response.json(String(url).endsWith('/runs')?[runFixture('COMPLETED')]:requestFixture('COMPLETED'));});
  const stop=watchMiningRequest(17,x=>update=x,()=>assert.fail('Unexpected polling callback'),42,systemMiningReader(1));await flush();stop();
  assert.equal(update?.runDetail?.runId,42);
  assert.deepEqual(urls,['/api/system/mining/stores/1/requests/17','/api/system/mining/stores/1/requests/17/runs']);
});

test('slow polling does not overlap, navigation aborts and late Store responses do not update',async t=>{
  actor(t);t.mock.timers.enable({apis:['setTimeout']});
  let release!:(r:Response)=>void;let signal:AbortSignal|undefined;let calls=0;
  t.mock.method(globalThis,'fetch',(_url:RequestInfo|URL,init?:RequestInit)=>{calls++;signal=init?.signal as AbortSignal;return new Promise<Response>(r=>{release=r;});});
  const stop=watchMiningRequest(17,()=>assert.fail('stale Store response'),()=>assert.fail('Unexpected polling callback'),null,systemMiningReader(1));
  t.mock.timers.tick(60000);await flush();assert.equal(calls,1);stop();assert.equal(signal?.aborted,true);
  release(Response.json(requestFixture()));await flush();assert.equal(calls,1);
});

test('polling errors stop until manual retry; session changes hide stale data',async t=>{
  actor(t);t.mock.timers.enable({apis:['setTimeout']});let calls=0;const errors:unknown[]=[];
  t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('',{status:503});});
  const stop=watchMiningRequest(17,()=>assert.fail('Unexpected polling callback'),e=>errors.push(e),null,systemMiningReader(1));await flush();
  t.mock.timers.tick(60000);await flush();stop();assert.equal(calls,1);assert.ok(hasStatus(503)(errors[0]));
  let token='before';t.mock.method(authService,'getToken',()=>token);
  t.mock.method(globalThis,'fetch',async()=>{token='after';return Response.json(requestFixture());});
  const stop2=watchMiningRequest(17,()=>assert.fail('previous session'),e=>errors.push(e),null,systemMiningReader(1));await flush();stop2();assert.ok(hasStatus(401)(errors[1]));
});

test('Store run details retain TIMED_OUT/null metrics and refuse mixed provenance',async t=>{
  actor(t,'Store Admin');let wrong=false;let seen:MiningProgress|undefined;const errors:unknown[]=[];
  t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL)=>{
    if(String(url).endsWith('/runs/42'))return Response.json({...runFixture('TIMED_OUT'),storeId:wrong?2:1,failureCode:'TIMED_OUT'});
    if(String(url).endsWith('/runs'))return Response.json([runFixture('TIMED_OUT')]);
    return Response.json(requestFixture('FAILED'));
  });
  const stop=watchMiningRequest(17,x=>seen=x,e=>errors.push(e),42);await flush();stop();
  assert.equal(seen?.runDetail?.status,'TIMED_OUT');assert.equal(seen?.runDetail?.runtimeMillis,null);
  wrong=true;const stop2=watchMiningRequest(17,()=>assert.fail('foreign run'),e=>errors.push(e),42);await flush();stop2();assert.ok(hasStatus(200)(errors[0]));
});

test('result and snapshot reads propagate abort signals',async t=>{
  actor(t);const c=new AbortController();
  t.mock.method(globalThis,'fetch',(_url:RequestInfo|URL,init?:RequestInit)=>new Promise<Response>((_resolve,reject)=>{assert.equal(init?.signal,c.signal);c.signal.addEventListener('abort',()=>reject(c.signal.reason),{once:true});}));
  const reads=[f05SystemApi.getBenchmark(1,42,c.signal),f05SystemApi.listSnapshots(1,0,20,c.signal)];
  c.abort();for(const read of reads)await assert.rejects(read,e=>e instanceof DOMException&&e.name==='AbortError');
});

test('workspace RBAC and result actions match all four actors; old drafts never show a Store submit',t=>{
  actor(t);globals(t,'sessionStorage',new MemoryStorage());globals(t,'window',{location:{search:''}});
  for(const role of ['System Admin','Store Admin','Merchandiser','End-Customer'] as const){
    const html=renderToStaticMarkup(createElement(F05WorkspaceView,{currentUser:{...user,role}}));
    if(role==='End-Customer')assert.equal(html,'');
    else if(role==='System Admin'){assert.ok(html.includes('Dashboard'));assert.equal(html.includes('<form'),false);}
    else {assert.ok(html.includes('Read-only access'));assert.equal(html.includes('Run Mining'),false);assert.ok(html.includes('Request history'));}
  }
  for(const reader of [storeMiningReader,systemMiningReader(1)]){
    const html=renderToStaticMarkup(createElement(MiningRunResults,{reader,request:requestFixture(),runs:[runFixture()],run:runFixture(),onReadError:()=>{},onOpenBenchmark:()=>{}}));
    assert.equal(html.includes('Show patterns'),reader.kind==='store');
    assert.equal(html.includes('Open algorithm benchmark'),reader.kind==='system');
  }
  for(const status of ['PENDING','RUNNING','FAILED','TIMED_OUT'] as const){
    const html=renderToStaticMarkup(createElement(MiningPatternsView,{run:runFixture(status),onReadError:()=>{}}));assert.ok(html.includes('Patterns unavailable'));assert.equal(html.includes('<table'),false);
  }
});

test('mining URL parsing preserves refresh/back context and rejects unsafe IDs',t=>{
  globals(t,'window',{location:{search:'?view=history&storeId=2&requestId=17'}});
  assert.deepEqual(readMiningLocation(true,'history'),{view:'history',storeId:2,requestId:17,runId:null,error:''});
  assert.equal(readMiningLocation(false,'history').storeId,null);
  (window.location as {search:string}).search='?view=history&storeId=2147483648';
  assert.ok(readMiningLocation(true,'history').error);
  (window.location as {search:string}).search='?requestId=9007199254740993';
  assert.ok(readMiningLocation(false,'history').error);
});
