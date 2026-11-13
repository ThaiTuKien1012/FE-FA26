import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCartItems } from '../src/features/customer/cartRules';
const product = { id:'a',name:'A',sku:'a',category:'Food',priceVnd:100,stockQuantity:3,status:'In Stock' as const,thumbnail:'',isActive:true };
test('group update is atomic and observes current cart stock', () => {
 const cart={a:2};
 assert.equal(applyCartItems(cart,[{product,quantity:2}]),null);
 assert.deepEqual(cart,{a:2});
 assert.deepEqual(applyCartItems(cart,[{product,quantity:1}]),{a:3});
});
test('duplicates are combined before checking stock; invalid prices and unavailable products rejected',()=>{
 assert.equal(applyCartItems({},[{product,quantity:2},{product,quantity:2}]),null);
 assert.equal(applyCartItems({},[{product:{...product,isActive:false},quantity:1}]),null);
 assert.equal(applyCartItems({},[{product:{...product,priceVnd:NaN},quantity:1}]),null);
 assert.equal(applyCartItems({},[{product,quantity:0}]),null);
 assert.equal(applyCartItems({},[]),null);
});
test('corrupt existing cart never turns into a valid addition',()=>{
 for(const count of [-1,NaN,Infinity,0.5]) assert.equal(applyCartItems({a:count},[{product,quantity:1}]),null);
 assert.equal(applyCartItems({other:-1},[{product,quantity:1}]),null);
});
test('unsafe monetary totals and prototype-like identifiers fail safely',()=>{
 assert.equal(applyCartItems({},[{product:{...product,priceVnd:Number.MAX_VALUE},quantity:2}]),null);
 assert.equal(applyCartItems({},[{product:{...product,id:'__proto__'},quantity:1}]),null);
});
