import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockStore, MOCK_STORAGE_KEY } from '../src/features/merchandising-mock/mock.store';
test('shared mock store persists transactions and notifies subscribers',()=>{
 const data=new Map<string,string>(); const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value)}};
 const store=createMockStore(()=>storage);let changes=0;store.subscribe(()=>changes++);
 store.update(current=>({...current,revision:current.revision+1}));
 assert.equal(changes,1);assert.equal(JSON.parse(data.get(MOCK_STORAGE_KEY)!).revision,1);
 assert.equal(createMockStore(()=>storage).getSnapshot().revision,1);
});
test('mock transaction failures do not notify or alter persistent state',()=>{
 const store=createMockStore(()=>undefined);const before=store.getSnapshot();let changes=0;store.subscribe(()=>changes++);
 assert.throws(()=>store.update(()=>{throw new Error('not eligible')}));assert.equal(store.getSnapshot(),before);assert.equal(changes,0);
});
test('unavailable localStorage retains in-memory work with an explicit warning',()=>{
 const store=createMockStore(()=>{throw new Error('storage disabled')});
 store.update(s=>({...s,revision:s.revision+1}));
 assert.equal(store.getSnapshot().revision,1);assert.ok(store.getWarning().length>0);
});
