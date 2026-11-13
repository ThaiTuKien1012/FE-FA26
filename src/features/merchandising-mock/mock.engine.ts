import { normalizeActiveLayout, type CustomerActiveLayout, type CustomerPlacement } from '../customer/merchandising';
import { approvedGroups, mockProducts, mockStores } from './mock.fixtures';
import type { MockActor, MockCampaign, MockLayout, MockState, SimulationMetrics, SimulationResult } from './mock.types';
const requireValue = (condition:unknown,message:string):void => { if (!condition) throw new Error(message); };
const text = (value:unknown):value is string => typeof value==='string' && value.trim().length>0 && value.length<=200;
const integer = (n:unknown,min=0,max=Number.MAX_SAFE_INTEGER):n is number => typeof n==='number' && Number.isSafeInteger(n) && n>=min && n<=max;
function storeExists(storeId:string) { requireValue(mockStores.some(s=>s.id===storeId),'Unknown fixture store'); }
function merchant(actor:MockActor) { requireValue(actor?.role==='Merchandiser','Only Merchandiser can perform this action'); }
function layout(state:MockState,id:string,storeId:string):MockLayout { const found=state.layouts.find(l=>l.id===id && l.storeId===storeId); requireValue(found,'Layout does not belong to this store'); return found!; }
function campaign(state:MockState,id:string):MockCampaign { const found=state.campaigns.find(c=>c.id===id); requireValue(found,'Campaign not found'); return found!; }
function placementsForStore(storeId:string,placements:CustomerPlacement[]):CustomerPlacement[] {
  storeExists(storeId);
  requireValue(Array.isArray(placements) && placements.length<=30,'Invalid placements');
  const normalized=normalizeActiveLayout({id:'validate',version:'1',status:'ACTIVE',storeId,placements},storeId)!;
  requireValue(normalized.placements.length===placements.length,'Invalid placement fields');
  for (const p of normalized.placements) {
    requireValue(text(p.title) && text(p.id),'Placement name or ID is invalid');
    requireValue(new Set(p.items.map(i=>i.productId)).size===p.items.length,'Products must be unique');
    const group=approvedGroups(storeId).find(g=>g.id===p.groupId && g.approved);
    requireValue(group,'Select an approved fixture group');
    requireValue(p.items.every(i=>group!.items.some(g=>g.productId===i.productId)),'Products must belong to approved group');
    if (p.type==='CROSS_SELL') requireValue(group!.items.some(i=>i.productId===p.anchorProductId),'Cross-sell anchor must belong to approved group');
    else requireValue(p.items.length===group!.items.length,'Use the complete approved product set');
    for (const item of p.items) {
      const product=mockProducts(storeId).find(p=>p.id===item.productId);
      requireValue(product?.isActive && integer(product.priceVnd) && integer(item.quantity,1) && item.quantity<=product.stockQuantity,'Product unavailable, invalid price, or insufficient stock');
    }
  }
  return normalized.placements;
}
export function initialMockState():MockState { return {schemaVersion:1,revision:0,layouts:[],campaigns:[],activeByStore:{}}; }
function next(state:MockState):MockState { requireValue(integer(state.revision,0,Number.MAX_SAFE_INTEGER-1),'Revision exhausted'); return {...state,revision:state.revision+1}; }
/** Versions increment per store, independently of the draft name. Every save creates a new immutable snapshot. */
export function saveDraft(state:MockState,actor:MockActor,storeId:string,name:string,placements:CustomerPlacement[]):MockState {
  merchant(actor); requireValue(text(name),'Enter a layout name');
  const safe=placementsForStore(storeId,placements); const updated=next(state);
  const version=1+Math.max(0,...state.layouts.filter(l=>l.storeId===storeId).map(l=>l.version));
  return {...updated,layouts:[...state.layouts,{id:`layout-${updated.revision}`,storeId,name:name.trim(),version,status:'DRAFT',placements:safe}]};
}
export function createCampaign(state:MockState,actor:MockActor,storeId:string,name:string,proposedId:string,baselineId:string|null):MockState {
  merchant(actor); storeExists(storeId); requireValue(text(name),'Enter a campaign name');
  const proposed=layout(state,proposedId,storeId); requireValue(proposed.status==='DRAFT','Choose a saved draft for B');
  requireValue(proposedId!==baselineId,'A and B must be different versions');
  if(baselineId!==null) layout(state,baselineId,storeId);
  const updated=next(state);
  return {...updated,campaigns:[...state.campaigns,{id:`campaign-${updated.revision}`,storeId,name:name.trim(),baselineId,proposedId,result:null}]};
}
function metrics(state:MockState,c:MockCampaign,id:string|null,seed:number,visitors:number):SimulationMetrics {
  if(id===null) return {orders:0,revenue:0,utility:0};
  const placements=placementsForStore(c.storeId,layout(state,id,c.storeId).placements);
  const result={orders:0,revenue:0,utility:0}; let random=seed>>>0;
  // Each arm receives exactly visitors opportunities. A visitor buys at most one bundle.
  // Repeated presentation of a group does not invent additional demand.
  const seen=new Set<string>();
  const bundles=placements.filter(p=>p.type==='BUNDLE' && !seen.has(p.groupId) && !!seen.add(p.groupId));
  const offers=bundles.map(p=>({
    total:p.items.reduce((sum,i)=>sum+mockProducts(c.storeId).find(x=>x.id===i.productId)!.priceVnd*i.quantity,0),
    utility:approvedGroups(c.storeId).find(g=>g.id===p.groupId)!.utility,
  }));
  if(!offers.length) return result;
  // Same visitor stream for both arms; 8% is illustrative, never real sales evidence.
  for(let v=0;v<visitors;v++) {
    random=(Math.imul(random,1664525)+1013904223)>>>0;
    if(random/4294967296<0.08) {
      const offer=offers[v%offers.length]; result.orders++; result.revenue+=offer.total; result.utility+=offer.utility;
    }
  }
  requireValue(Object.values(result).every(n=>integer(n)),'Simulation totals exceed safe bounds'); return result;
}
function simulate(state:MockState,c:MockCampaign,seed:number,visitors:number):SimulationResult {
  requireValue(integer(seed,0,4294967295),'Seed must be an integer from 0 to 4294967295');
  requireValue(integer(visitors,1,1000000),'Visitors must be an integer from 1 to 1000000');
  return {seed,visitors,a:metrics(state,c,c.baselineId,seed,visitors),b:metrics(state,c,c.proposedId,seed,visitors)};
}
export function simulateCampaign(state:MockState,actor:MockActor,campaignId:string,seed:number,visitors:number):MockState {
  merchant(actor); const c=campaign(state,campaignId); const result=simulate(state,c,seed,visitors);
  return {...next(state),campaigns:state.campaigns.map(x=>x.id===c.id?{...x,result}:x)};
}
export function publishCampaign(state:MockState,actor:MockActor,campaignId:string):MockState {
  merchant(actor); const c=campaign(state,campaignId); const b=layout(state,c.proposedId,c.storeId);
  requireValue(b.placements.length>0,'Publish requires a nonempty saved layout');
  requireValue(c.result && JSON.stringify(c.result)===JSON.stringify(simulate(state,c,c.result.seed,c.result.visitors)),'Run a matching simulation before publication');
  return {...next(state),layouts:state.layouts.map(l=>l.id===b.id?{...l,status:'PUBLISHED'}:l)};
}
export function activateLayout(state:MockState,actor:MockActor,storeId:string,layoutId:string):MockState {
  requireValue(actor?.role==='Store Admin','Only Store Admin can activate layouts'); storeExists(storeId);
  const saved=layout(state,layoutId,storeId); requireValue(saved.status==='PUBLISHED','Only published layouts can be activated');
  placementsForStore(storeId,saved.placements);
  return {...next(state),activeByStore:{...state.activeByStore,[storeId]:layoutId}};
}
export function projectActiveLayout(state:MockState,storeId:string):CustomerActiveLayout|null {
  const saved=state.layouts.find(l=>l.id===state.activeByStore[storeId] && l.storeId===storeId && l.status==='PUBLISHED');
  if(!saved) return null;
  try { return {id:saved.id,version:String(saved.version),status:'ACTIVE',storeId,placements:placementsForStore(storeId,saved.placements)}; } catch { return null; }
}
/** Entire invalid snapshots recover to empty state; no guessed publication or activation. */
export function restoreMockState(input:unknown):MockState {
  try {
    const s=structuredClone(input) as MockState;
    requireValue(s && s.schemaVersion===1 && integer(s.revision) && Array.isArray(s.layouts) && Array.isArray(s.campaigns) && s.activeByStore && typeof s.activeByStore==='object' && !Array.isArray(s.activeByStore),'Invalid snapshot');
    requireValue(s.layouts.length<=1000 && s.campaigns.length<=1000,'Snapshot too large');
    const ids=new Set<string>();
    const versions=new Set<string>();
    for(const l of s.layouts) {
      requireValue(l && text(l.id) && !ids.has(l.id) && text(l.name) && integer(l.version,1) && ['DRAFT','PUBLISHED'].includes(l.status),'Invalid saved layout');
      requireValue(!versions.has(`${l.storeId}:${l.version}`),'Duplicate store version');
      versions.add(`${l.storeId}:${l.version}`);
      ids.add(l.id); l.placements=placementsForStore(l.storeId,l.placements);
    }
    for(const c of s.campaigns) {
      requireValue(c && text(c.id) && !ids.has(c.id) && text(c.name),'Invalid campaign'); ids.add(c.id);
      storeExists(c.storeId); layout(s,c.proposedId,c.storeId);
      requireValue(c.baselineId===null || (typeof c.baselineId==='string' && c.baselineId!==c.proposedId),'Invalid baseline');
      if(c.baselineId!==null) layout(s,c.baselineId,c.storeId);
      if(c.result!==null) requireValue(c.result && JSON.stringify(c.result)===JSON.stringify(simulate(s,c,c.result.seed,c.result.visitors)),'Invalid simulation');
    }
    for(const l of s.layouts.filter(l=>l.status==='PUBLISHED')) requireValue(l.placements.length>0 && s.campaigns.some(c=>c.proposedId===l.id && c.result!==null),'Publication requires simulation evidence');
    for(const [storeId,id] of Object.entries(s.activeByStore)) { storeExists(storeId); requireValue(text(id) && projectActiveLayout(s,storeId),'Invalid active pointer'); }
    // IDs encode revisions, preventing collisions after restoring a snapshot.
    for(const id of ids) requireValue(/^(layout|campaign)-[1-9]\d*$/.test(id) && Number(id.split('-')[1])<=s.revision,'Invalid revision');
    return {schemaVersion:1,revision:s.revision,layouts:s.layouts,campaigns:s.campaigns,activeByStore:s.activeByStore};
  } catch { return initialMockState(); }
}
