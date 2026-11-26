import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ArrowLeftRight, Boxes, PackagePlus, RefreshCw, ShoppingBasket, X } from 'lucide-react';
import { miningButton, miningInput, miningPrimaryButton, miningDate } from '../../f05/f05.display';
import { RecommendationExpiry, RecommendationRules, ruleInputs, type RuleInputs } from '../f06.settings';
import type { RecPolicy } from '../f06.types';
import { recommendationNumber } from '../f06.format';
import type { ExpiryProductOption } from '../f06.expiry';
import { F06Pages } from './F06Pages';
import { F06ExpiryProductPicker } from './F06ExpiryProductPicker';
import { F06ExpiryBatchCard, MissingPushDayWarnings } from './F06ExpiryPriority';
import { useF06Expiry } from './F06ExpiryContext';

function Panel({title,busy=false,onClose,actions,footer,children}:{title:string;busy?:boolean;onClose:()=>void;actions?:ReactNode;footer?:ReactNode;children:ReactNode}){
  const dialog=useRef<HTMLDialogElement>(null);
  const closeState=useRef({busy,onClose});closeState.current={busy,onClose};
  useEffect(()=>{
    const node=dialog.current,previous=document.activeElement instanceof HTMLElement?document.activeElement:null,overflow=document.body.style.overflow;
    const cancel=(event:Event)=>{event.preventDefault();if(!closeState.current.busy)closeState.current.onClose();};
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'&&node?.open){
        if(node.querySelector('[role="combobox"][aria-expanded="true"]'))return;
        event.preventDefault();event.stopPropagation();if(!closeState.current.busy)closeState.current.onClose();return;
      }
      if(event.key!=='Tab'||!node?.open||event.ctrlKey||event.metaKey||event.altKey)return;
      const controls=[...node.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')].filter(control=>control.getClientRects().length>0);
      const first=controls[0],last=controls.at(-1),focused=document.activeElement;
      if(!first){event.preventDefault();node.focus();return;}
      if(!node.contains(focused)||(event.shiftKey?focused===first:focused===last)){event.preventDefault();(event.shiftKey?last:first)?.focus();}
    };
    node?.addEventListener('cancel',cancel);node?.showModal();document.body.style.overflow='hidden';document.addEventListener('keydown',keydown,true);
    return()=>{document.removeEventListener('keydown',keydown,true);node?.removeEventListener('cancel',cancel);node?.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
  },[]);
  return <dialog ref={dialog} tabIndex={-1} aria-label={title} aria-modal="true" className="fixed inset-0 m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#E7E2D8] bg-white p-0 text-[#191C1B] shadow-xl backdrop:bg-black/30 open:flex"><header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#E7E2D8] bg-white p-4 sm:px-5"><h2 className="text-xl font-semibold">{title}</h2><div className="flex items-center gap-2">{actions}<button type="button" autoFocus disabled={busy} aria-label={'Close '+title} onClick={onClose} className="rounded-lg p-2 hover:bg-[#EDF5F0] focus-visible:outline-2 focus-visible:outline-[#356B54] disabled:opacity-50"><X aria-hidden="true" className="h-5 w-5"/></button></div></header><div className="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-5">{children}</div>{footer&&<footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#E7E2D8] bg-white p-4 sm:px-5">{footer}</footer>}</dialog>;
}
interface RuleField {key:keyof RuleInputs;label:string;help:string;unit:string;decimal?:boolean;}
const groups=[
  {title:'Bundle',Icon:PackagePlus,fields:[{key:'maxBundleSize',label:'Maximum bundle size',help:'Maximum number of products allowed in a bundle.',unit:'products'}]},
  {title:'Frequently Bought Together',Icon:ShoppingBasket,fields:[{key:'minSupportCount',label:'Minimum shared transactions',help:'Minimum number of transactions containing all products in the group.',unit:'transactions'},{key:'supportPercent',label:'Minimum purchase frequency',help:'Minimum share of analyzed transactions containing all products in the group.',unit:'%',decimal:true}]},
  {title:'Cross-sell',Icon:ArrowLeftRight,fields:[{key:'confidencePercent',label:'Minimum add-on purchase rate',help:'Minimum share of transactions containing the main product that also include all suggested products.',unit:'%',decimal:true}]},
  {title:'Product Availability',Icon:Boxes,fields:[{key:'minimumSellableQuantity',label:'Minimum available stock',help:'Minimum sellable quantity required for each product in a recommendation.',unit:'units'}]}
] satisfies {title:string;Icon:typeof Boxes;fields:RuleField[]}[];
export function F06RuleGroups({policy,draft,onEdit}:{policy:RecPolicy;draft?:RuleInputs;onEdit?:(key:keyof RuleInputs,value:string)=>void}){
  const values=draft??ruleInputs(policy),editable=!!onEdit;
  return <div className="grid items-start gap-3 sm:grid-cols-2">{groups.map(({title,Icon,fields})=><section key={title} className="min-w-0 space-y-3 rounded-xl border border-[#E7E2D8] bg-[#FAFBF8] p-4"><h3 className="flex items-center gap-2 text-sm font-semibold text-[#1E3A2F]"><Icon aria-hidden="true" className="h-4 w-4 shrink-0"/>{title}</h3>{(fields as RuleField[]).map(field=>{const value=values[field.key],unit=field.unit==='%'?'%':value==='1'?field.unit.slice(0,-1):field.unit;return <div key={field.key}>{editable?<><label htmlFor={'f06-rule-'+field.key} className="text-sm font-medium">{field.label}</label><div className="mt-1 flex items-center gap-2"><input id={'f06-rule-'+field.key} required inputMode={field.decimal?'decimal':'numeric'} value={value} onChange={event=>onEdit!(field.key,event.target.value)} aria-describedby={'f06-rule-help-'+field.key} className={miningInput+' !mt-0 min-w-0'}/><span className="shrink-0 text-xs text-[#6D7974]">{unit}</span></div></>:<><p className="text-xs font-medium text-[#6D7974]">{field.label}</p><p className="mt-1 text-lg font-semibold text-[#1E3A2F]">{field.unit==='%'?value+'%':recommendationNumber(Number(value))+' '+unit}</p></>}<p id={editable?'f06-rule-help-'+field.key:undefined} className="mt-1 text-xs leading-5 text-[#6D7974]">{field.help}</p></div>;})}</section>)}</div>;
}
export function F06RulesPanel({onClose}:{onClose:()=>void}){
  const [workflow]=useState(()=>new RecommendationRules()),[discard,setDiscard]=useState(false),guard=useRef<HTMLButtonElement>(null);
  const state=useSyncExternalStore(workflow.subscribe,workflow.getSnapshot,workflow.getSnapshot);
  useEffect(()=>{workflow.start();return workflow.stop;},[workflow]);
  useEffect(()=>{if(discard)guard.current?.focus();},[discard]);
  const canEdit=state.role==='Store Admin',dirty=canEdit&&!!state.policy&&!!state.draft&&JSON.stringify(state.draft)!==JSON.stringify(ruleInputs(state.policy));
  const resume=()=>{setDiscard(false);requestAnimationFrame(()=>document.getElementById('f06-rule-maxBundleSize')?.focus());};
  const close=()=>{if(state.saving)return;if(discard){resume();return;}if(dirty){setDiscard(true);return;}onClose();};
  return <Panel title="Store Rules" busy={state.saving} onClose={close} actions={<button type="button" className={miningButton} disabled={state.loading||state.saving} onClick={()=>void workflow.refresh()}>Refresh Rules</button>} footer={<><button type="button" className={miningButton} disabled={state.saving} onClick={close}>{canEdit?'Cancel':'Close'}</button>{canEdit&&state.draft&&<button type="submit" form="f06-rules-form" disabled={state.saving||state.loading||state.needsReload||!!state.latest} className={miningPrimaryButton}>{state.saving?'Saving rules...':'Save Changes'}</button>}</>}>
    <p className="text-sm text-[#6D7974]">Define how recommendations qualify for your store.</p>
    {!canEdit&&<p className="inline-block rounded-full bg-[#EDF5F0] px-3 py-1 text-xs font-semibold text-[#315445]">Managed by Store Admin</p>}
    {discard&&<div role="alert" aria-label="Unsaved rules" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"><p className="font-semibold">Discard unsaved changes?</p><p className="mt-1 text-xs">Your edits have not been saved.</p><div className="mt-3 flex flex-wrap gap-2"><button ref={guard} type="button" className={miningButton} onClick={resume}>Keep Editing</button><button type="button" className={miningButton} onClick={onClose}>Discard Changes</button></div></div>}
    {state.loading&&<p role="status" className="text-sm text-[#6D7974]">Loading store rules...</p>}
    {state.error&&<p role="alert" className="whitespace-pre-wrap break-words rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{state.error}</p>}
    {state.notice&&<p role="status" className="rounded-xl bg-[#EDF5F0] p-3 text-sm text-[#1E3A2F]">{state.notice}</p>}
    {canEdit&&state.latest&&<section aria-label="Current rules conflict" className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3"><h3 className="text-sm font-semibold">Current saved rules</h3><p className="text-xs leading-5">Your edits below are retained. Compare them with the current saved values before saving again.</p><F06RuleGroups policy={state.latest}/><div className="flex flex-wrap gap-2"><button type="button" className={miningButton} onClick={()=>workflow.acceptLatest(false)}>Use Current Rules</button><button type="button" className={miningButton} onClick={()=>workflow.acceptLatest(true)}>Keep My Edits</button></div><p className="text-xs">Keep My Edits does not save. Review the form before choosing Save Changes.</p></section>}
    {state.policy&&(canEdit&&state.draft?<form id="f06-rules-form" aria-label="Edit store rules" onSubmit={event=>{event.preventDefault();void workflow.save();}}><fieldset disabled={state.saving||state.loading}><legend className="sr-only">Store rule values</legend><F06RuleGroups policy={state.policy} draft={state.draft} onEdit={workflow.edit}/></fieldset></form>:<F06RuleGroups policy={state.latest??state.policy}/>)}
    <p className="text-xs leading-5 text-[#6D7974]">Changes apply to newly generated recommendations. Existing recommendations keep their original rules.</p>
  </Panel>;
}
export function F06ExpiryPanel({onClose,analysisSelected=false}:{onClose:()=>void;analysisSelected?:boolean}){
  const [workflow]=useState(()=>new RecommendationExpiry()),[product,setProduct]=useState<ExpiryProductOption|null>(null);
  const state=useSyncExternalStore(workflow.subscribe,workflow.getSnapshot,workflow.getSnapshot),live=useF06Expiry();
  useEffect(()=>{workflow.start();return workflow.stop;},[workflow]);
  const data=state.data,warnings=data?[...data.warnings,...data.items.flatMap(batch=>batch.warnings)]:[];
  const refresh=()=>{void workflow.refresh(true);void live?.workflow.refresh();};
  return <Panel title="Expiry Alerts" onClose={onClose} actions={<button type="button" className={miningButton} disabled={state.loading} onClick={refresh}><RefreshCw aria-hidden="true" className="mr-1.5 h-4 w-4"/>Refresh Alerts</button>} footer={<button type="button" className={miningButton} onClick={onClose}>Close</button>}>
    <p className="text-sm text-[#6D7974]">Review batches that need selling priority before their expiry date.</p>
    <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]"><F06ExpiryProductPicker value={product} onChange={next=>{setProduct(next);void workflow.applyFilter(next?.id,state.pageSize);}}/><label htmlFor="f06-expiry-size" className="text-xs font-semibold">Items per page<select id="f06-expiry-size" className={miningInput} value={state.pageSize} onChange={event=>void workflow.applyFilter(product?.id,Number(event.target.value))}>{[10,20,50,100].map(size=><option key={size}>{size}</option>)}</select></label></div>
    {state.loading&&<p role="status" className="text-sm text-[#6D7974]">Loading expiry alerts...</p>}
    {state.error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
    {data&&<><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><p className="font-semibold text-[#1E3A2F]">{data.totalElements.toLocaleString('en-US')} {data.totalElements===1?'due batch':'due batches'}{product?' for '+product.name:''}</p><p className="text-xs text-[#6D7974]">Checked {miningDate(data.checkedAt)}</p></div><MissingPushDayWarnings warnings={warnings} names={state.names}/>{!data.items.length?<p className="rounded-xl bg-[#FAF8F5] p-4 text-sm text-[#6D7974]">No due batches match this selection.{warnings.length?' Review the inventory notes above.':''}</p>:<ul aria-label="Expiry alert batches" className="grid gap-3 sm:grid-cols-2">{data.items.map(batch=><F06ExpiryBatchCard key={batch.productId+':'+batch.batchId} batch={batch} data={data} name={state.names[batch.productId]??'Product #'+batch.productId} imageUrl={state.images[batch.productId]}/>)}</ul>}<F06Pages data={data} label="alerts" busy={state.loading} onPage={page=>void workflow.setPage(page)}/></>}
    <p className="text-xs leading-5 text-[#6D7974]">An alert supports your review; it does not change availability or stock. {analysisSelected?'Review existing recommendations in your selected analysis to consider these products.':'Choose a completed analysis to review existing recommendations that include these products.'}</p>
  </Panel>;
}
