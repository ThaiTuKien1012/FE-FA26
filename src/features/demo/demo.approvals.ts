import { CUSTOMER_STORES } from '../customer/data/customerStores';
import { getCustomerProducts } from '../customer/data/customerCatalog';
import type { ApprovedGroup } from '../merchandising-mock/mock.types';

export const APPROVAL_KEY='paspm_demo_approvals_v1';
interface ApprovalState {schemaVersion:1; groups:ApprovedGroup[]}
const seed=():ApprovalState=>({schemaVersion:1,groups:CUSTOMER_STORES.map(store=>({id:`${store.id}-candidate`,storeId:store.id,title:`Gợi ý mới · ${store.name}`,items:getCustomerProducts(store.id).slice(0,2).map(p=>({productId:p.id,quantity:1})),utility:20,approved:false}))});
export function createApprovalRepository(storage?:Pick<Storage,'getItem'|'setItem'>) {
  let state=seed(); const listeners=new Set<()=>void>();
  try {
    const value=JSON.parse(storage?.getItem(APPROVAL_KEY)||'null');
    if(value?.schemaVersion===1 && Array.isArray(value.groups)) {
      const known=seed();
      state={schemaVersion:1,groups:known.groups.map(g=>({...g,approved:value.groups.find((v:ApprovedGroup)=>v.id===g.id)?.approved===true}))};
    }
  } catch { /* An incompatible snapshot resets to deterministic candidates. */ }
  const save=()=>{try{storage?.setItem(APPROVAL_KEY,JSON.stringify(state))}catch{/* Memory fallback. */}listeners.forEach(fn=>fn())};
  return {
    getSnapshot:()=>state,
    subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn)}},
    approve:(actor:{role:string;storeId:string},id:string)=>{
      if(actor.role!=='Merchandiser')throw Error('Only Merchandiser can approve recommendations');
      const group=state.groups.find(g=>g.id===id);
      if(!group||group.storeId!==actor.storeId)throw Error('Recommendation belongs to another store');
      state={...state,groups:state.groups.map(g=>g.id===id?{...g,approved:true}:g)};save();
    },
    reset:()=>{state=seed();save()},
  };
}
let storage:Storage|undefined;try{if(typeof window!=='undefined')storage=window.localStorage}catch{/* memory mode */}
export const demoApprovals=createApprovalRepository(storage);
export const getApprovalSnapshot=demoApprovals.getSnapshot;
