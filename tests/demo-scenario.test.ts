import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoMerchandisingScenario} from '../src/features/merchandising-mock/mock.scenario';
import {mockStores} from '../src/features/merchandising-mock/mock.fixtures';
import {projectActiveLayout,restoreMockState} from '../src/features/merchandising-mock/mock.engine';
import {createApprovalRepository} from '../src/features/demo/demo.approvals';
import {createMockStore} from '../src/features/merchandising-mock/mock.store';
test('populated scenario has active and draft layouts per store with restorable evidence',()=>{
 const state=createDemoMerchandisingScenario();const restored=restoreMockState(state);
 assert.equal(restored.layouts.length,mockStores.length*2);
 for(const store of mockStores){assert.equal(projectActiveLayout(restored,store.id)?.placements.length,4);assert.ok(restored.layouts.some(l=>l.storeId===store.id&&l.status==='DRAFT'))}
});
test('F06 approvals persist, enforce actor and store, and reset only their key',()=>{
 const data=new Map<string,string>([['real-session','preserve']]);const storage={getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>{data.set(k,v)}};
 const repo=createApprovalRepository(storage);const group=repo.getSnapshot().groups[0];
 assert.throws(()=>repo.approve({role:'Store Admin',storeId:group.storeId},group.id));assert.throws(()=>repo.approve({role:'Merchandiser',storeId:'store-q1'},group.id));
 repo.approve({role:'Merchandiser',storeId:group.storeId},group.id);assert.equal(createApprovalRepository(storage).getSnapshot().groups[0].approved,true);
 repo.reset();assert.equal(repo.getSnapshot().groups[0].approved,false);assert.equal(data.get('real-session'),'preserve');
});
test('standalone merchandising storage is separate from prior opt-in fixture store',()=>{
 const data=new Map<string,string>([['paspm_merchandising_mock_v1','preserve']]);const store=createMockStore(()=>({getItem:k=>data.get(k)||null,setItem:(k,v)=>{data.set(k,v)}}),{key:'paspm_demo_merchandising_v1',seed:createDemoMerchandisingScenario});
 store.update(s=>({...s,revision:s.revision+1}));assert.equal(data.get('paspm_merchandising_mock_v1'),'preserve');assert.ok(data.has('paspm_demo_merchandising_v1'));
});
