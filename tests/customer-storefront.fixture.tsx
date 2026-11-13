// Isolated browser-test entry. Never imported by the production application.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { CustomerStorefrontView } from '../src/features/customer/components/CustomerStorefrontView';
import type { CustomerStorefrontSource } from '../src/features/customer/hooks/useActiveStorefront';
import type { CustomerPlacement } from '../src/features/customer/merchandising';
const fixture = { mode:'active', version:'1', calls:0 };
Object.assign(window, { storefrontFixture: fixture });
const products = ['a','b','c','out'].map((id,index)=>({id,name:`Sản phẩm ${id}`,sku:id,category:'Rau củ',brand:'Fixture',unit:'gói',priceVnd:(index+1)*10000,stockQuantity:id==='out'?0:8,status:id==='out'?'Out of Stock' as const:'In Stock' as const,isActive:true,thumbnail:'',image:`/images/customer-home/fresh/${['broccoli.png','cucumber.webp','green-bell-pepper.webp','red-onions.webp'][index]}`}));
const make = (id:string,type:CustomerPlacement['type'],order:number,items=[{productId:'a',quantity:2},{productId:'b',quantity:1}]):CustomerPlacement=>({id,type,order,groupId:id,title:`Nhóm ${id}`,items});
const source:CustomerStorefrontSource = async(storeId,signal)=>{
 fixture.calls++;
 if(fixture.mode==='error') throw new Error('Controlled source error');
 if(fixture.mode==='slow') await new Promise(resolve=>setTimeout(resolve,200));
 if(signal.aborted) throw new DOMException('Aborted','AbortError');
 const placements=[make('bundle','BUNDLE',3),make('banner','BANNER',0),make('fbt','FBT',4),{...make('cross','CROSS_SELL',5,[{productId:'c',quantity:1}]),anchorProductId:'a'},make('missing','BUNDLE',7,[{productId:'a',quantity:1},{productId:'missing',quantity:1}]),make('unavailable','BUNDLE',6,[{productId:'a',quantity:1},{productId:'out',quantity:1}])];
 placements[1].imageUrl='/images/customer-home/banners/garden.jpg';
 placements[1].title=`Căn bếp xanh ${fixture.version}`;
 return {storeId,products,activeLayout:fixture.mode==='empty'?null:{id:'fixture-layout',version:fixture.version,status:fixture.mode==='draft'?'DRAFT':'ACTIVE',storeId:fixture.mode==='wrong'?'wrong-store':storeId,placements}};
};
createRoot(document.getElementById('root')!).render(<CustomerStorefrontView source={source} onLogout={()=>{}} onProfile={()=>{}} onHome={()=>{}} onLogin={()=>{}} />);
