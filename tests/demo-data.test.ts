import test from 'node:test';
import assert from 'node:assert/strict';
import { demoRequest, resetDemoRepository, getDemoCustomerProducts } from '../src/features/demo/demo.api';
import { DEMO_DATA_KEY, getDemoRepository } from '../src/features/demo/demo.repository';
const admin={role:'Store Admin',storeId:1},merch={role:'Merchandiser',storeId:1},system={role:'System Admin'};
const data=async(path:string,method='GET',body?:unknown,actor:{role:string;storeId?:number|null}=admin)=>{const r=await demoRequest(path,{method,...(body===undefined?{}:{body:JSON.stringify(body)})},actor);return {status:r.status,value:await r.json()};};
test('local CRUD updates persisted catalog and enforces store permissions',async()=>{
 const storage=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)}});
 resetDemoRepository();const before=getDemoCustomerProducts('store-d1')[0];
 const p=(await data('/api/products/1')).value;
 const changed=await data('/api/products/1','PUT',{...p,name:'Rau cải demo',categoryId:p.category.id,sellingPrice:31000});assert.equal(changed.status,200);assert.equal(getDemoCustomerProducts('store-d1')[0].priceVnd,31000);
 assert.equal(JSON.parse(storage.get(DEMO_DATA_KEY)!).products[0].name,'Rau cải demo');
 assert.equal((await data('/api/products/7')).status,404);
 assert.equal((await data('/api/products/1/status','PATCH',{status:'INACTIVE'},merch)).status,403);
 assert.equal((await data('/api/products','GET',undefined,{role:'End-Customer',storeId:1})).status,403);
 assert.equal(getDemoCustomerProducts('store-q1')[0].priceVnd,45000);
 const b=await data('/api/inventory-batches/1','PATCH',{remainingQuantity:0});assert.equal(b.status,200);assert.equal(getDemoCustomerProducts('store-d1')[0].stockQuantity,0);
 assert.equal((await data('/api/inventory-batches/1','PATCH',{remainingQuantity:-1})).status,400);
 resetDemoRepository();assert.equal(getDemoCustomerProducts('store-d1')[0].priceVnd,before.priceVnd);assert.equal(getDemoCustomerProducts('store-d1')[0].stockQuantity,before.stockQuantity);
});
test('config version conflicts and synthetic mining keep benchmark measurements unavailable',async()=>{
 resetDemoRepository();assert.equal((await data('/api/system/mining/config','GET')).status,403);
 const c=await data('/api/system/mining/config','PUT',{algorithm:'EFIM',minUtilMode:'PERCENTAGE',minUtilValue:10,expectedVersion:0},system);assert.equal(c.status,409);
 const body={storeId:1,snapshotId:1,requestKey:'01234567-1234-1234-1234-123456789012',compareAlgorithms:true};
 const r=await data('/api/system/mining/requests','POST',body,system);assert.equal(r.status,202);assert.equal(r.value.status,'COMPLETED');
 const again=await data('/api/system/mining/requests','POST',body,system);assert.equal(again.value.requestId,r.value.requestId);
 const runs=await data(`/api/mining/requests/${r.value.requestId}/runs`);assert.equal(runs.value.length,2);assert.equal(runs.value[0].runtimeMillis,null);
 const patterns=await data(`/api/mining/runs/${runs.value[0].runId}/patterns`);assert.equal(patterns.value.items.length,1);assert.equal(patterns.value.items[0].productIds.length,3);
 const unknown=await data('/api/not-implemented');assert.equal(unknown.status,501);
});
test('CSV orders persist atomically, reject invalid groups and handle duplicate replay',async()=>{
 resetDemoRepository();const form=new FormData();const text='source_order_id,occurred_at,sku,quantity,unit_price,unit_cost,status\nNEW-1,2026-11-11T10:00:00Z,RS-TD-001,2,28000,19000,COMPLETED\nBAD-1,2026-11-11T10:00:00Z,RS-TD-001,1,28000,19000,COMPLETED\nBAD-1,2026-11-11T10:00:00Z,OTHER-STORE,1,28000,19000,COMPLETED';form.set('file',new Blob([text]),'sales.csv');
 const r=await demoRequest('/api/transactions/imports/csv',{method:'POST',body:form},admin);assert.equal(r.status,201);const summary=await r.json();assert.equal(summary.acceptedOrderCount,1);assert.equal(summary.rejectedOrderCount,1);assert.equal(summary.rejectedCount,2);
 assert.equal(getDemoRepository().transactions.filter(t=>t.sourceOrderId==='BAD-1').length,0);
 const replay=await demoRequest('/api/transactions/imports/csv',{method:'POST',body:form},admin);assert.equal((await replay.json()).duplicateOrderCount,1);
});
test('synthetic mining uses percentage and absolute thresholds without measured algorithm claims',async()=>{
 resetDemoRepository();
 const runRequest=async(key:string)=>{
  const result=await data('/api/system/mining/requests','POST',{storeId:1,snapshotId:1,requestKey:key,compareAlgorithms:true},system);
  assert.equal(result.status,202);
  const runs=(await data(`/api/mining/requests/${result.value.requestId}/runs`)).value;
  const patterns=(await data(`/api/mining/runs/${runs[0].runId}/patterns`)).value.items;
  assert.equal(runs[0].patternCount,patterns.length);assert.equal(runs[0].runtimeMillis,null);assert.match(runs[0].environment,/SIMULATED/);
  return {request:result.value,patterns};
 };
 const low=await runRequest('00000000-0000-0000-0000-000000000001');
 assert.equal(low.request.effectiveMinUtility,10000);assert.equal(low.request.minUtilSpmf,1000000);assert.equal(low.patterns.length,1);
 await data('/api/system/mining/config','PUT',{algorithm:'EFIM',minUtilMode:'PERCENTAGE',minUtilValue:99,expectedVersion:1},system);
 const high=await runRequest('00000000-0000-0000-0000-000000000002');assert.equal(high.request.effectiveMinUtility,99000);assert.equal(high.patterns.length,0);
 await data('/api/system/mining/config','PUT',{algorithm:'EFIM',minUtilMode:'ABSOLUTE',minUtilValue:1,expectedVersion:2},system);
 const absolute=await runRequest('00000000-0000-0000-0000-000000000003');assert.equal(absolute.request.effectiveMinUtility,1);assert.equal(absolute.request.minUtilSpmf,100);assert.equal(absolute.patterns.length,1);
});
