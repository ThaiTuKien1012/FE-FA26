import { authService, type AuthUser } from '../../services/authService';
import { ScopedF06 } from './f06.settings';
import { f06Api, F06ApiError } from './f06.api';
import { recommendationReadError } from './f06.browse';
import type { RecExpiryPage } from './f06.types';
import { confirmedDueBatch } from './f06.expiry.presentation';

export interface ExpiryProductOption { id:number;name:string;sku?:string;imageUrl?:string; }
export interface ProductExpiry { status:'loading'|'ready'|'error';data:RecExpiryPage|null;readAt:number; }
export interface LiveExpiryState {
  role:AuthUser['role']|null;summary:RecExpiryPage|null;loading:boolean;error:string;
  products:Record<number,ProductExpiry>;scopeRevision:number;
}
const initial=():LiveExpiryState=>({role:authService.getCurrentUser()?.role??null,summary:null,loading:false,error:'',products:{},scopeRevision:0});
export const EXPIRY_CACHE_MS=60000;

/** One own-Store/session cache, independent of Mining. Unique visible products use at most
 * three concurrent reads, three batch rows each. Absence from the global first page is never negative evidence.
 * Reads stop when their products leave the mounted views. No writes, polling or ranking changes. */
export class LiveRecommendationExpiry extends ScopedF06<LiveExpiryState> {
  private watchers=new Map<symbol,number[]>();
  private queue:number[]=[];
  private running=new Set<number>();
  private epoch=0;
  private scopeEpoch=0;
  private summaryReadAt=0;
  constructor(){super(initial);}
  protected resetExtra(){this.epoch++;this.scopeEpoch++;this.watchers?.clear();this.queue=[];this.running?.clear();this.summaryReadAt=0;}
  protected load=()=>this.refresh();
  refresh=async()=>{
    if(!this.allowed())return;
    this.epoch++;for(const id of this.running)this.abort('product:'+id);this.running.clear();this.queue=[];
    this.update({summary:null,loading:true,error:'',products:{},scopeRevision:this.scopeEpoch});
    this.syncProducts();const job=this.job('summary');
    try{
      const summary=await f06Api.listExpiryPush({page:0,pageSize:1},job.signal);
      if(job.current()){this.summaryReadAt=Date.now();this.update({summary,loading:false});}
    }catch(error){if(job.current())this.update({summary:null,loading:false,error:recommendationReadError(error)});}
    finally{this.finishJob('summary',job.signal);}
  };
  refreshIfStale=()=>{if(!this.state.loading&&Date.now()-this.summaryReadAt>=EXPIRY_CACHE_MS)void this.refresh();};
  watchProducts=(ids:readonly number[])=>{
    const key=Symbol(),products=[...new Set(ids)].filter(id=>Number.isSafeInteger(id)&&id>0&&id<=2147483647).slice(0,256);
    this.watchers.set(key,products);this.syncProducts();
    return()=>{this.watchers.delete(key);this.syncProducts();};
  };
  private desired(){return new Set([...this.watchers.values()].flat());}
  private syncProducts(){
    if(!this.allowed())return;
    const wanted=this.desired(),products={...this.state.products};let changed=false;
    for(const id of this.running)if(!wanted.has(id)){this.abort('product:'+id);if(products[id]?.status==='loading'){delete products[id];changed=true;}}
    this.queue=this.queue.filter(id=>wanted.has(id));
    for(const id of Object.keys(products).map(Number))if(!wanted.has(id)&&products[id].status==='loading'){delete products[id];changed=true;}
    for(const id of wanted){
      const entry=products[id];
      if(this.running.has(id)||this.queue.includes(id)||entry&&Date.now()-entry.readAt<EXPIRY_CACHE_MS)continue;
      if(this.queue.length>=512)break;
      products[id]={status:'loading',data:null,readAt:Date.now()};this.queue.push(id);changed=true;
    }
    // Bound cached products without evicting current readers.
    for(const id of Object.keys(products).map(Number))if(Object.keys(products).length>512&&!wanted.has(id)&&!this.running.has(id)){delete products[id];changed=true;}
    if(changed)this.update({products});this.drain();
  }
  private drain(){
    while(this.allowed()&&this.running.size<3&&this.queue.length){
      const id=this.queue.shift()!;if(!this.desired().has(id))continue;
      this.running.add(id);void this.readProduct(id,this.epoch);
    }
  }
  private async readProduct(id:number,epoch:number){
    const job=this.job('product:'+id);
    try{
      const data=await f06Api.listExpiryPush({productId:id,page:0,pageSize:3},job.signal);
      if(!job.current())return;
      if(data.items.some(batch=>batch.productId!==id))throw new F06ApiError(200,'Mismatched expiry product was rejected.');
      this.update({products:{...this.state.products,[id]:{status:'ready',data,readAt:Date.now()}}});
    }catch{if(job.current())this.update({products:{...this.state.products,[id]:{status:'error',data:null,readAt:Date.now()}}});}
    finally{this.finishJob('product:'+id,job.signal);if(epoch===this.epoch){this.running.delete(id);this.syncProducts();}}
  }
}
export function confirmedProductBatches(entry:ProductExpiry|undefined){
  return entry?.status==='ready'&&entry.data?entry.data.items.filter(batch=>confirmedDueBatch(batch,entry.data!.asOfDate)):[];
}
