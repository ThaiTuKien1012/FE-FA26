import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/features/merchandising-mock/mock.engine';
import { approvedGroups, mockProducts } from '../src/features/merchandising-mock/mock.fixtures';
import type { CustomerPlacement } from '../src/features/customer/merchandising';
const merchant = { role: 'Merchandiser' } as const;
const admin = { role: 'Store Admin' } as const;
const store = 'store-d1';
const placement = (): CustomerPlacement => {
  const group = approvedGroups(store)[0];
  return { id: 'placement-1', type: 'BUNDLE', order: 0, title: 'Dinner', groupId: group.id, items: group.items.map(i => ({...i})) };
};
const draft = () => engine.saveDraft(engine.initialMockState(), merchant, store, 'Dinner', [placement()]);
const campaign = () => { const s = draft(); return engine.createCampaign(s, merchant, store, 'Test', s.layouts[0].id, null); };
test('draft versions never implicitly become active and input arrays are isolated', () => {
  const placements = [placement()]; const initial = engine.initialMockState();
  const first = engine.saveDraft(initial, merchant, store, 'One', placements);
  placements[0].items[0].quantity = 999;
  assert.equal(first.layouts[0].placements[0].items[0].quantity, 1);
  const second = engine.saveDraft(first, merchant, store, 'Two', [placement()]);
  assert.equal(second.layouts[1].version, 2); assert.equal(first.layouts.length, 1);
  assert.equal(engine.projectActiveLayout(second, store), null); assert.equal(initial.revision, 0);
});
test('roles, store scope, approved product sets and stock are enforced without mutation', () => {
  const state = draft(); const before = JSON.stringify(state);
  assert.throws(() => engine.saveDraft(state, admin, store, 'No', [placement()]));
  assert.throws(() => engine.createCampaign(state, merchant, 'store-q1', 'No', state.layouts[0].id, null));
  for (const change of [(p:CustomerPlacement)=>p.items[0].quantity=999, (p:CustomerPlacement)=>p.groupId='fake', (p:CustomerPlacement)=>p.items[1].productId=p.items[0].productId, (p:CustomerPlacement)=>p.items[0].productId='bd-bread']) {
    const p=placement(); change(p); assert.throws(()=>engine.saveDraft(state,merchant,store,'Bad',[p]));
  }
  assert.equal(JSON.stringify(state),before);
});
test('seeded simulation is reproducible and revenue uses current retail prices, utility uses fixture units', () => {
  const s=campaign(); const id=s.campaigns[0].id;
  const one=engine.simulateCampaign(s,merchant,id,42,1000);
  assert.deepEqual(one.campaigns[0].result!.b,engine.simulateCampaign(s,merchant,id,42,1000).campaigns[0].result!.b);
  const result=one.campaigns[0].result!;
  const total=placement().items.reduce((sum,i)=>sum+mockProducts(store).find(p=>p.id===i.productId)!.priceVnd*i.quantity,0);
  assert.ok(result.b.orders>0); assert.equal(result.b.revenue,result.b.orders*total);
  assert.equal(result.b.utility,result.b.orders*approvedGroups(store)[0].utility);
  assert.deepEqual(result.a,{orders:0,revenue:0,utility:0,clicks:0,ctr:0,conversion:0});
  for (const n of [NaN,Infinity,-1,1.5,2**32]) assert.throws(()=>engine.simulateCampaign(s,merchant,id,n,100));
  for (const n of [0,NaN,Infinity,1.5,1000001]) assert.throws(()=>engine.simulateCampaign(s,merchant,id,1,n));
});
test('publication needs matching simulation, activation needs admin and isolates saved versions', () => {
  let s=campaign(); const id=s.campaigns[0].id; const layoutId=s.layouts[0].id;
  assert.throws(()=>engine.publishCampaign(s,merchant,id));
  assert.throws(()=>engine.activateLayout(s,admin,store,layoutId));
  s=engine.simulateCampaign(s,merchant,id,1,100);
  const tampered=structuredClone(s); tampered.campaigns[0].result!.b.revenue++;
  assert.throws(()=>engine.publishCampaign(tampered,merchant,id));
  s=engine.publishCampaign(s,merchant,id); assert.equal(engine.projectActiveLayout(s,store),null);
  assert.throws(()=>engine.activateLayout(s,merchant,store,layoutId));
  assert.throws(()=>engine.activateLayout(s,admin,'store-q1',layoutId));
  s=engine.activateLayout(s,admin,store,layoutId);
  const active=engine.projectActiveLayout(s,store)!; assert.equal(active.status,'ACTIVE');
  s=engine.saveDraft(s,merchant,store,'Later',[placement()]); assert.deepEqual(engine.projectActiveLayout(s,store),active);
});
test('restore rejects malformed persisted data and invalid active pointers safely', () => {
  for (const value of [null,{},[],{schemaVersion:1,revision:0,layouts:[null],campaigns:[],activeByStore:{}}, {schemaVersion:1,revision:0,layouts:[],campaigns:[],activeByStore:{evil:'x'}}]) assert.deepEqual(engine.restoreMockState(value),engine.initialMockState());
  const s=draft(); assert.deepEqual(engine.restoreMockState(JSON.parse(JSON.stringify(s))),s);
  s.activeByStore[store]=s.layouts[0].id;
  assert.equal(engine.projectActiveLayout(s,store),null);
  assert.deepEqual(engine.restoreMockState(s),engine.initialMockState());
});
test('cross-sell validates anchor and cannot substitute a product outside its approved evidence', () => {
  const p=placement(); p.type='CROSS_SELL'; p.anchorProductId=p.items[0].productId; p.items=p.items.slice(1);
  assert.equal(engine.saveDraft(engine.initialMockState(),merchant,store,'Cross sell',[p]).layouts.length,1);
  p.anchorProductId='td-chili'; assert.throws(()=>engine.saveDraft(engine.initialMockState(),merchant,store,'Bad',[p]));
});
test('only merchants create, simulate and publish campaigns', () => {
  let s=campaign(); const id=s.campaigns[0].id;
  assert.throws(()=>engine.createCampaign(s,admin,store,'Denied',s.layouts[0].id,null));
  assert.throws(()=>engine.simulateCampaign(s,admin,id,1,20));
  s=engine.simulateCampaign(s,merchant,id,1,20);
  assert.throws(()=>engine.publishCampaign(s,admin,id));
});
test('restore cannot accept a published layout without eligible campaign evidence or duplicate versions', () => {
  const forged=draft(); forged.layouts[0].status='PUBLISHED'; forged.activeByStore[store]=forged.layouts[0].id;
  assert.deepEqual(engine.restoreMockState(forged),engine.initialMockState());
  const duplicate=draft(); duplicate.layouts.push({...duplicate.layouts[0],id:'layout-2'}); duplicate.revision=2;
  assert.deepEqual(engine.restoreMockState(duplicate),engine.initialMockState());
  let valid=campaign(); valid=engine.simulateCampaign(valid,merchant,valid.campaigns[0].id,4,50);
  valid=engine.publishCampaign(valid,merchant,valid.campaigns[0].id);
  valid=engine.activateLayout(valid,admin,store,valid.layouts[0].id);
  assert.deepEqual(engine.restoreMockState(JSON.parse(JSON.stringify(valid))),valid);
});
test('each arm has one visitor budget and only distinct bundle groups contribute revenue', () => {
  const p=placement(); const other=approvedGroups(store)[1];
  const placements=[p,{...p,id:'duplicate',order:1},{...p,id:'banner',type:'BANNER' as const,order:2},{...p,id:'second',order:3,groupId:other.id,items:other.items}];
  let s=engine.saveDraft(engine.initialMockState(),merchant,store,'Groups',placements);
  s=engine.createCampaign(s,merchant,store,'Traffic',s.layouts[0].id,null);
  const result=engine.simulateCampaign(s,merchant,s.campaigns[0].id,42,1000).campaigns[0].result!;
  let clean=engine.saveDraft(engine.initialMockState(),merchant,store,'Groups',[p,placements[3]]);
  clean=engine.createCampaign(clean,merchant,store,'Traffic',clean.layouts[0].id,null);
  assert.deepEqual(result.b,engine.simulateCampaign(clean,merchant,clean.campaigns[0].id,42,1000).campaigns[0].result!.b);
  assert.ok(result.b.orders<=1000);
});
