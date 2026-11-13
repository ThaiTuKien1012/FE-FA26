import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeActiveLayout, resolvePlacement, canPurchase, getProductPlacements, normalizeCustomerProducts } from '../src/features/customer/merchandising';
import type { CustomerPlacement } from '../src/features/customer/merchandising';
const product = { id:'p1',sku:'one',name:'One',category:'Food',priceVnd:100,stockQuantity:3,status:'In Stock' as const,isActive:true,thumbnail:'' };
const placement: CustomerPlacement = {id:'b',type:'BUNDLE',order:2,title:'Pair',groupId:'g',items:[{productId:'p1',quantity:2},{productId:'p2',quantity:1}]};
const layout = {id:'l',version:'1',status:'ACTIVE',storeId:'s',placements:[placement,{...placement,id:'a',order:1},{...placement,id:'unknown',type:'UNKNOWN'}]};
test('only active layouts for requested store survive and placement order is respected',()=>{
 assert.equal(normalizeActiveLayout({...layout,status:'DRAFT'},'s'),null);
 assert.equal(normalizeActiveLayout(layout,'other'),null);
 assert.deepEqual(normalizeActiveLayout(layout,'s')?.placements.map(p=>p.id),['a','b']);
});
test('missing products keep group invalid; current prices and quantities determine total',()=>{
 const missing=resolvePlacement(placement,[product]);assert.equal(missing.valid,false);assert.equal(missing.items[1].product,null);
 const resolved=resolvePlacement(placement,[product,{...product,id:'p2',priceVnd:50}]);
 assert.equal(resolved.total,250);assert.equal(resolved.valid,true);
 assert.equal(canPurchase(resolved.items,{}),true);assert.equal(canPurchase(resolved.items,{p1:2}),false);
});
test('invalid quantities, prices, missing stock and inactive products cannot be purchased',()=>{
 for(const patch of [{priceVnd:NaN},{priceVnd:-1},{stockQuantity:NaN},{stockQuantity:0},{isActive:false},{status:'Out of Stock' as const}]) {
  assert.equal(canPurchase([{productId:'p1',quantity:1,product:{...product,...patch}}],{}),false);
 }
 for(const quantity of [0,-1,1.5,Infinity]) assert.equal(canPurchase([{productId:'p1',quantity,product}],{}),false);
 assert.equal(canPurchase([],{}),false);
});
test('duplicate product references coalesce without duplicate cart additions',()=>{
 const group=resolvePlacement({...placement,items:[{productId:'p1',quantity:1},{productId:'p1',quantity:2}]},[product]);
 assert.equal(group.items.length,1);assert.equal(group.items[0].quantity,3);assert.equal(group.valid,false);
 assert.equal(canPurchase([{productId:'p1',quantity:2,product},{productId:'p1',quantity:2,product}],{}),false);
});
test('FBT contains current product; cross sell requires explicit anchor',()=>{
 const active=normalizeActiveLayout({...layout,placements:[{...placement,type:'FBT'},{...placement,id:'x',type:'CROSS_SELL',anchorProductId:'p2'}]},'s');
 assert.equal(getProductPlacements(active,'p1','FBT').length,1);
 assert.equal(getProductPlacements(active,'p1','CROSS_SELL').length,0);
 assert.equal(getProductPlacements(active,'p2','CROSS_SELL').length,1);
});
test('sanitization strips internal evidence and rejects malformed identifiers and duplicate placements',()=>{
 const safe=normalizeActiveLayout({...layout,utility:999,placements:[{...placement,utility:999},placement]},'s');
 assert.equal(safe?.placements.length,1);assert.equal('utility' in safe!,false);assert.equal('utility' in safe!.placements[0],false);
 assert.equal(normalizeActiveLayout({...layout,id:''},'s'),null);
 const products=normalizeCustomerProducts([{...product,utility:999,costPriceVnd:1,targetUtilityScore:22}, {...product,id:'p2',priceVnd:'100'}]);
 assert.equal(products.length,1);assert.equal('costPriceVnd' in products[0],false);assert.equal('utility' in products[0],false);
});
test('group limits and malformed quantities fail closed without arbitrary replacements',()=>{
 const products=Array.from({length:5},(_,i)=>({...product,id:`p${i}`}));
 for(const count of [1,5]) {
  const group=resolvePlacement({...placement,items:products.slice(0,count).map(p=>({productId:p.id,quantity:1}))},products);
  assert.equal(group.valid,false);
 }
 for(const quantity of [0,1.5,-1]) assert.deepEqual(normalizeActiveLayout({...layout,placements:[{...placement,items:[{productId:'p1',quantity}]}]},'s')?.placements,[]);
});
test('revalidation replaces the layout version and never retains inactive content',()=>{
 const first=normalizeActiveLayout(layout,'s');
 const second=normalizeActiveLayout({...layout,version:'2',placements:[]},'s');
 assert.equal(first?.placements.length,2);assert.equal(second?.version,'2');assert.deepEqual(second?.placements,[]);
 assert.equal(normalizeActiveLayout({...layout,status:'INACTIVE'},'s'),null);
});
test('overflow never exposes a nonfinite group total or valid purchase',()=>{
 const group=resolvePlacement(placement,[{...product,priceVnd:Number.MAX_VALUE},{...product,id:'p2'}]);
 assert.equal(group.valid,false);assert.equal(Number.isFinite(group.total),true);assert.equal(canPurchase(group.items,{}),false);
});
test('group validity represents structure separately from live purchase availability',()=>{
 const group=resolvePlacement(placement,[{...product,stockQuantity:0},{...product,id:'p2'}]);
 assert.equal(group.valid,true);assert.equal(canPurchase(group.items,{}),false);
});
test('malformed references and unknown placement types are omitted, with no evidence fields copied',()=>{
 const placements=[{...placement,id:'unknown',type:'MINING'},
  {...placement,id:'missing-id',items:[{quantity:1}]},
  {...placement,id:'empty-id',items:[{productId:'',quantity:1}]},
  {...placement,id:'null-item',items:[null]},
  {...placement,id:'good',description:'Món ăn',imageUrl:'javascript:alert(1)',evidence:{utility:9}}];
 const normalized=normalizeActiveLayout({...layout,placements},'s');
 assert.deepEqual(normalized?.placements.map(p=>p.id),['good']);
 assert.equal(normalized?.placements[0].imageUrl,undefined);
 assert.equal('evidence' in normalized!.placements[0],false);
});
test('normalizer excludes bundle and FBT groups outside two to four unique products',()=>{
 for(const type of ['BUNDLE','FBT']) {
  for(const ids of [['p1'],['p1','p1'],['p1','p2','p3','p4','p5']]) {
   const candidate={...placement,type,items:ids.map(productId=>({productId,quantity:1}))};
   assert.deepEqual(normalizeActiveLayout({...layout,placements:[candidate]},'s')?.placements,[]);
  }
  assert.equal(normalizeActiveLayout({...layout,placements:[{...placement,type}]},'s')?.placements.length,1);
 }
});
