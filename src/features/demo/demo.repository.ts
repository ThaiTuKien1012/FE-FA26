import { CUSTOMER_PRODUCTS, type CustomerProduct } from '../customer/data/customerCatalog';
import { CUSTOMER_STORES } from '../customer/data/customerStores';
import type { F02Product, F02Category, F02Batch } from '../store/store.api';
import type { F03Config, F03Policy, F03Snapshot, F03MatrixPage } from '../f03/f03.api';
import type { MiningConfiguration, RequestView, RunView, PatternView } from '../f05/f05.types';
import type { TransactionView, ImportSummary, ImportError } from '../f04/f04.types';
export const DEMO_DATA_KEY = 'paspm.demo.business.v1';
export interface DemoProduct extends F02Product { storeId: number; customerId: string; presentation: CustomerProduct }
export interface DemoUser { userId:number; name:string; email:string; roleCode:string; storeId:number|null; status:string; emailVerified:boolean }
export interface DemoState {
  schemaVersion:1; nextId:number; products:DemoProduct[]; categories:(F02Category & {storeId:number})[];
  batches:(F02Batch & {storeId:number})[]; users:DemoUser[];
  stores:{storeId:number; name:string; fixtureId:string; status:string}[];
  configs:Record<number,F03Config>; policy:F03Policy; miningConfig:MiningConfiguration;
  matrices:Record<number,F03MatrixPage>; snapshots:F03Snapshot[]; requests:RequestView[]; runs:RunView[]; patterns:PatternView[];
  transactions:(TransactionView & {storeId:number})[];
  imports:(ImportSummary & {storeId:number; errors:ImportError[]})[];
  scores:Record<string,{stockPriorityScore:number; seasonalPriorityScore:number}>;
}
const config = ():F03Config => ({enableStock:true,enableExpiry:true,enableSeason:true,alpha:1,beta:1,gamma:1,lambda:1,expiryWindowDays:7,version:1,scoringVersion:'1.2'});
export function seedDemoRepository():DemoState {
 const stores=CUSTOMER_STORES.map((s,i)=>({storeId:i+1,name:s.name,fixtureId:s.id,status:'ACTIVE'}));
 const categories:DemoState['categories']=[];
 const products=CUSTOMER_PRODUCTS.map((p,i)=>{
  const storeId=stores.find(s=>s.fixtureId===p.storeId)!.storeId;
  let category=categories.find(c=>c.storeId===storeId&&c.name===p.category);
  if(!category){category={id:categories.length+1,name:p.category,status:'ACTIVE',storeId};categories.push(category);}
  return {id:i+1,storeId,customerId:p.id,presentation:{...p},sku:p.sku,name:p.name,unit:p.unit,requiresExpiry:true,category,sellingPrice:p.priceVnd,costPrice:Math.round(p.priceVnd*.7),status:'ACTIVE' as const,stockQuantity:p.stockQuantity,expiryPushDays:7};
 });
 return {schemaVersion:1,nextId:1000,stores,categories,products,
 batches:products.map(p=>({id:p.id,storeId:p.storeId,productId:p.id,batchCode:`DEMO-${p.id}`,receivedAt:'2026-11-01',expiryDate:'2026-12-01',initialQuantity:p.stockQuantity,remainingQuantity:p.stockQuantity,status:'ACTIVE'})),
 users:[{userId:1,name:'Demo System Admin',email:'system@demo.local',roleCode:'SYSTEM_ADMIN',storeId:null,status:'ACTIVE',emailVerified:true},...stores.flatMap(s=>[{userId:s.storeId*10,name:`${s.name} Admin`,email:`admin${s.storeId}@demo.local`,roleCode:'STORE_ADMIN',storeId:s.storeId,status:'ACTIVE',emailVerified:true},{userId:s.storeId*10+1,name:`${s.name} Merchandiser`,email:`merch${s.storeId}@demo.local`,roleCode:'MERCHANDISER',storeId:s.storeId,status:'ACTIVE',emailVerified:true}])],
 configs:Object.fromEntries(stores.map(s=>[s.storeId,config()])),policy:{lambdaMin:0,lambdaMax:10,version:1},
 miningConfig:{version:1,algorithm:'EFIM',minUtilMode:'PERCENTAGE',minUtilValue:10,changedBy:1,changedAt:'2026-11-01T00:00:00Z'},
 matrices:{},snapshots:stores.map(s=>({snapshotId:s.storeId,storeId:s.storeId,createdBy:1,rangeStart:'2026-11-01',rangeEnd:'2026-11-10',asOfDate:'2026-11-10',sourceHash:`demo-reference-${s.storeId}`,matrixHash:`demo-matrix-${s.storeId}`,totalWeightedUtility:100000,roundingScale:2,status:'READY',createdAt:'2026-11-10T00:00:00Z',warnings:['Synthetic reference fixture'],configuration:undefined})),requests:[],runs:[],patterns:[],scores:{},imports:[],
 transactions:stores.map(s=>{const p=products.filter(p=>p.storeId===s.storeId).slice(0,3);return {transactionId:s.storeId,storeId:s.storeId,sourceSystem:'DEMO_REFERENCE',sourceOrderId:`REFERENCE-${s.storeId}`,occurredAt:'2026-11-10T09:00:00Z',status:'COMPLETED',f03Eligible:true,totalAmount:p.reduce((a,b)=>a+b.sellingPrice,0),items:p.map(x=>({transactionItemId:x.id,productId:x.id,sku:x.sku,productName:x.name,quantity:1,unitPrice:x.sellingPrice,unitCost:x.costPrice}))};})};
}
let memory:DemoState|undefined;
const listeners=new Set<()=>void>();
export function getDemoRepository():DemoState {
 if(!memory){try {const saved=JSON.parse(localStorage.getItem(DEMO_DATA_KEY)||'null');if(saved?.schemaVersion===1&&Array.isArray(saved.products)&&Array.isArray(saved.stores)&&Array.isArray(saved.batches)&&Array.isArray(saved.users)&&saved.configs&&saved.policy&&saved.miningConfig&&Array.isArray(saved.snapshots)&&Array.isArray(saved.transactions)&&Array.isArray(saved.requests)&&Array.isArray(saved.runs)&&Array.isArray(saved.categories)&&Array.isArray(saved.imports)&&saved.scores){saved.patterns=Array.isArray(saved.patterns)?saved.patterns:[];saved.matrices=saved.matrices&&typeof saved.matrices==='object'&&!Array.isArray(saved.matrices)?saved.matrices:{};memory=saved;}}catch{/* Storage unavailable/corrupt: deterministic reset. */}memory??=seedDemoRepository();}
 return memory;
}
export function saveDemoRepository(state:DemoState):void {try{localStorage.setItem(DEMO_DATA_KEY,JSON.stringify(state));}catch{/* In-memory demo remains usable. */}memory=state;listeners.forEach(f=>f());}
export function resetDemoRepository():void {saveDemoRepository(seedDemoRepository());}
export function subscribeDemoRepository(listener:()=>void):()=>void {listeners.add(listener);return ()=>listeners.delete(listener);}
export function getDemoCustomerProducts(storeId:string):CustomerProduct[] {const s=getDemoRepository();const id=s.stores.find(x=>x.fixtureId===storeId)?.storeId;return s.products.filter(p=>p.storeId===id&&p.status==='ACTIVE').map(p=>({...p.presentation,id:p.customerId,name:p.name,sku:p.sku,category:p.category?.name??'Other',priceVnd:p.sellingPrice,stockQuantity:p.stockQuantity,unit:p.unit,isActive:true,status:p.stockQuantity===0?'Out of Stock':p.stockQuantity<=10?'Low Stock':'In Stock'}));}

if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key===DEMO_DATA_KEY){memory=undefined;listeners.forEach(listener=>listener());}});
