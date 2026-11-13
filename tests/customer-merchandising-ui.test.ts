import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StorefrontLayoutRenderer, GroupDetail, ProductRecommendations } from '../src/features/customer/components/StorefrontMerchandising';
import type { CustomerPlacement, CustomerActiveLayout } from '../src/features/customer/merchandising';
import type { CustomerDisplayProduct } from '../src/features/customer/customer.types';
const products: CustomerDisplayProduct[] = ['a', 'b', 'c'].map((id, index) => ({id, name:`Sản phẩm ${id}`, sku:id, category:'Rau', unit:'kg', priceVnd:10000*(index+1), stockQuantity:10, status:'In Stock', isActive:true, thumbnail:''}));
const placement = (id:string, type:CustomerPlacement['type'], order=1):CustomerPlacement => ({id, groupId:id, type, order, title:`Nhóm ${id}`, items:[{productId:'a',quantity:2},{productId:'b',quantity:1}]});
const layout = (placements:CustomerPlacement[]):CustomerActiveLayout => ({id:'layout', version:'1', status:'ACTIVE', storeId:'store', placements});
const shared = {products, cart:{}, onAddGroup:()=>{}, onOpenProduct:()=>{}};
test('homepage respects placement order and does not expose product-only placements', () => {
 const html=renderToStaticMarkup(React.createElement(StorefrontLayoutRenderer,{...shared, layout:layout([placement('later','BUNDLE',8), placement('private','FBT'), placement('first','BANNER',0)]),onOpenGroup:()=>{}}));
 assert.ok(html.indexOf('Nhóm first')<html.indexOf('Nhóm later')); assert.ok(!html.includes('Nhóm private')); assert.match(html,/Khám phá bộ sản phẩm/);
});
test('group detail renders quantities and estimated total from prices, blocks missing item purchase',()=>{
 const html=renderToStaticMarkup(React.createElement(GroupDetail,{...shared,placement:placement('pair','BUNDLE')}));
 assert.match(html,/40\.000/); assert.match(html,/× 2/); assert.match(html,/Thêm cả nhóm/);
 const missing=renderToStaticMarkup(React.createElement(GroupDetail,{...shared,products:products.slice(0,1),placement:placement('pair','BUNDLE')}));
 assert.match(missing,/disabled/); assert.match(missing,/Sản phẩm không còn khả dụng/);
});
test('product recommendations filter FBT membership and directional cross-sell',()=>{
 const unrelated={...placement('unrelated','FBT'),items:[{productId:'b',quantity:1},{productId:'c',quantity:1}]};
 const cross={...placement('extra','CROSS_SELL'),anchorProductId:'a', items:[{productId:'a',quantity:1},{productId:'c',quantity:1}]};
 const html=renderToStaticMarkup(React.createElement(ProductRecommendations,{...shared,productId:'a',layout:layout([placement('together','FBT'),unrelated,cross])}));
 assert.match(html,/Thường mua cùng/); assert.match(html,/Có thể bạn cần thêm/); assert.ok(!html.includes('Nhóm unrelated')); assert.match(html,/type="checkbox"/);
});
test('unavailable FBT items are not selectable',()=>{
 const html=renderToStaticMarkup(React.createElement(ProductRecommendations,{...shared, products:products.map(p=>p.id==='b'?{...p,stockQuantity:0,status:'Out of Stock' as const}:p),productId:'a',layout:layout([placement('together','FBT')])}));
 assert.match(html,/Tạm hết hàng/); assert.match(html,/type="checkbox"[^>]*disabled/);
});
