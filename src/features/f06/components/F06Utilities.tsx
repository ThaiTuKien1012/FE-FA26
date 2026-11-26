import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ArrowLeftRight, Boxes, PackagePlus, Settings2, ShieldCheck, ShoppingBasket, X } from 'lucide-react';
import { miningButton, miningInput, miningPrimaryButton, miningDate } from '../../f05/f05.display';
import { RecommendationExpiry, RecommendationRules, parseRuleInputs, ruleInputs, type RuleInputs } from '../f06.settings';
import type { RecPolicy } from '../f06.types';
import { recommendationNumber } from '../f06.format';
import type { ExpiryProductOption } from '../f06.expiry';
import { F06Pages } from './F06Pages';
import { F06ExpiryProductPicker } from './F06ExpiryProductPicker';
import { F06ExpiryBatchCard, MissingPushDayWarnings } from './F06ExpiryPriority';
import { useF06Expiry } from './F06ExpiryContext';

const utilityAction='inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-[#E7E2D8] bg-white px-2.5 text-xs font-semibold text-[#1E3A2F] transition-colors hover:bg-[#EDF5F0] sm:px-3 sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54] disabled:cursor-not-allowed disabled:opacity-50';
const pageUtilityAction='inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#DDE5DF] bg-white px-3 text-sm font-medium leading-5 text-[#315445] transition-colors hover:border-[#9CB7A7] hover:bg-[#EDF5F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54]';
export function F06StoreRulesButton({merchant,onClick}:{merchant:boolean;onClick:()=>void}){
  return <button type="button" title={merchant?'View Store Rules':'Manage Store Rules'} className={pageUtilityAction} onClick={onClick}><Settings2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0"/>Store Rules</button>;
}
function Panel({title,subtitle,busy=false,onClose,actions,footer,children}:{title:string;subtitle?:string;busy?:boolean;onClose:()=>void;actions?:ReactNode;footer?:ReactNode;children:ReactNode}){
  const dialog=useRef<HTMLDialogElement>(null),descriptionId=useId();
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
  return <dialog ref={dialog} tabIndex={-1} aria-label={title} aria-describedby={subtitle?descriptionId:undefined} aria-modal="true" className="fixed inset-0 m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#E7E2D8] bg-white p-0 text-[#191C1B] shadow-xl backdrop:bg-black/30 open:flex"><header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 border-b border-[#E7E2D8] bg-white px-4 py-3 sm:px-5"><h2 className="text-lg font-semibold">{title}</h2><div className="flex items-center gap-1">{actions}<button type="button" autoFocus disabled={busy} aria-label={'Close '+title} title="Close" onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-[#EDF5F0] focus-visible:outline-2 focus-visible:outline-[#356B54] disabled:opacity-50"><X aria-hidden="true" className="h-4 w-4"/></button></div>{subtitle&&<p id={descriptionId} className="col-span-2 max-w-2xl text-sm leading-5 text-[#53665B]">{subtitle}</p>}</header><div className="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-5">{children}</div>{footer&&<footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-[#E7E2D8] bg-[#FAFBF8] px-4 py-3 sm:px-5">{footer}</footer>}</dialog>;
}
interface RuleField {key:keyof RuleInputs;label:string;unit:string;decimal?:boolean;}
const groups=[
  {title:'Bundle',Icon:PackagePlus,fields:[{key:'maxBundleSize',label:'Maximum bundle size',unit:'products'}]},
  {title:'Cross-sell',Icon:ArrowLeftRight,fields:[{key:'confidencePercent',label:'Minimum add-on purchase rate',unit:'%',decimal:true}]},
  {title:'Frequently Bought Together',Icon:ShoppingBasket,fields:[{key:'minSupportCount',label:'Min. transactions',unit:'transactions'},{key:'supportPercent',label:'Min. purchase frequency',unit:'%',decimal:true}]},
  {title:'Product Availability',Icon:Boxes,fields:[{key:'minimumSellableQuantity',label:'Minimum available stock',unit:'units'}]}
] satisfies {title:string;Icon:typeof Boxes;fields:RuleField[]}[];
/** Presentation only; values and percentages use the existing policy formatter. */
function ruleExplanations(policy:RecPolicy){
  const saved=ruleInputs(policy),quantity=recommendationNumber(policy.minimumSellableQuantity);
  return [
    'Each bundle can contain up to '+recommendationNumber(policy.maxBundleSize)+' products.',
    'At least '+saved.confidencePercent+'% of transactions containing the main product must also include all suggested products.',
    'All products must be bought together in at least '+recommendationNumber(policy.minSupportCount)+(policy.minSupportCount===1?' transaction and ':' transactions and ')+saved.supportPercent+'% of analyzed transactions.',
    'Each recommended product must have at least '+quantity+' sellable '+(policy.minimumSellableQuantity===1?'unit':'units')+' to be eligible.'
  ];
}
export function F06RuleGroups({policy,draft,onEdit}:{policy:RecPolicy;draft?:RuleInputs;onEdit?:(key:keyof RuleInputs,value:string)=>void}){
  const values=draft??ruleInputs(policy),editable=!!onEdit;
  let displayedPolicy=policy,invalidDraft=false;
  if(editable&&draft){try{displayedPolicy={...policy,...parseRuleInputs(draft,policy.version)};}catch{invalidDraft=true;}}
  const explanations=ruleExplanations(displayedPolicy);
  return <div data-store-rule-groups className="grid items-stretch gap-3 sm:auto-rows-fr sm:grid-cols-2">{groups.map(({title,Icon,fields},index)=><section key={title} aria-label={title+' rules'} data-rule-card className="flex min-w-0 flex-col gap-3 rounded-xl border border-[#E1E6DF] bg-[#FAFBF8] p-4">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1E3A2F]"><span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#E1E6DF] bg-white"><Icon aria-hidden="true" className="h-4 w-4 text-[#527461]"/></span>{title}</h3>
    <div data-rule-metrics className={fields.length===2?'grid min-w-0 items-start gap-3 '+(editable?'grid-cols-1 min-[440px]:grid-cols-2':'grid-cols-2'):'min-w-0'}>{(fields as RuleField[]).map(field=>{
      const value=values[field.key],unit=field.unit==='%'?'%':value==='1'?field.unit.slice(0,-1):field.unit;
      const inputId='f06-rule-'+field.key;
      return <div key={field.key} className="min-w-0 space-y-1.5">{editable?<>
        <div className="flex min-h-10 min-w-0 overflow-hidden rounded-lg border border-[#DDE5DF] bg-white focus-within:border-[#356B54] focus-within:ring-2 focus-within:ring-[#EDF5F0]">
          <input id={inputId} aria-label={field.label} required inputMode={field.decimal?'decimal':'numeric'} value={value} onChange={event=>onEdit!(field.key,event.target.value)} aria-describedby={'f06-rule-help-'+index} className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm tabular-nums text-[#243B30] outline-none disabled:opacity-60"/>
          {fields.length===1||field.unit==='%'?<span className="flex shrink-0 items-center justify-center border-l border-[#E7E2D8] bg-[#FAFBF8] px-2 text-xs text-[#6D7974]">{unit}</span>:null}
        </div><label htmlFor={inputId} className="block text-xs font-medium leading-5 text-[#53665B]">{field.label}</label>
      </>:<><p className="max-w-full break-words text-[22px] font-semibold leading-7 tabular-nums text-[#1E3A2F]">{field.unit==='%'?value+'%':field.key==='minSupportCount'?recommendationNumber(Number(value)):recommendationNumber(Number(value))+' '+unit}</p><p className="text-xs font-medium leading-5 text-[#53665B]">{field.label}</p></>}</div>;
    })}</div>
    <p id={editable?'f06-rule-help-'+index:undefined} className="text-xs leading-5 text-[#6D7974]">{invalidDraft?'Saved rule: ':''}{explanations[index]}</p>
  </section>)}</div>;
}
export function F06RulesPanel({onClose}:{onClose:()=>void}){
  const [workflow]=useState(()=>new RecommendationRules()),[discard,setDiscard]=useState(false),guard=useRef<HTMLButtonElement>(null);
  const state=useSyncExternalStore(workflow.subscribe,workflow.getSnapshot,workflow.getSnapshot);
  useEffect(()=>{workflow.start();return workflow.stop;},[workflow]);
  useEffect(()=>{if(discard)guard.current?.focus();},[discard]);
  const canEdit=state.role==='Store Admin',dirty=canEdit&&!!state.policy&&!!state.draft&&JSON.stringify(state.draft)!==JSON.stringify(ruleInputs(state.policy));
  const resume=()=>{setDiscard(false);requestAnimationFrame(()=>document.getElementById('f06-rule-maxBundleSize')?.focus());};
  const close=()=>{if(state.saving)return;if(discard){resume();return;}if(dirty){setDiscard(true);return;}onClose();};
  return <Panel title="Store Rules" subtitle="Define how recommendations qualify for your store." busy={state.saving} onClose={close} actions={<button type="button" className={utilityAction} disabled={state.loading||state.saving} onClick={()=>void workflow.refresh()}>Refresh Rules</button>} footer={<><button type="button" className={miningButton} disabled={state.saving} onClick={close}>{canEdit?'Cancel':'Close'}</button>{canEdit&&state.draft&&<button type="submit" form="f06-rules-form" disabled={state.saving||state.loading||state.needsReload||!!state.latest} className={miningPrimaryButton}>{state.saving?'Saving rules...':'Save Changes'}</button>}</>}>
    {!canEdit&&<p className="inline-flex items-center gap-1.5 rounded-md border border-[#DDE5DF] bg-[#F2F6F1] px-2 py-1 text-xs font-medium text-[#53665B]"><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5"/>Managed by Store Admin</p>}
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
  return <Panel title="Expiry Alerts" subtitle="Review products that need selling priority before they expire." onClose={onClose} actions={<button type="button" className={utilityAction} disabled={state.loading} onClick={refresh}>Refresh Alerts</button>} footer={<button type="button" className={miningButton} onClick={onClose}>Close</button>}>
    <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]"><F06ExpiryProductPicker value={product} onChange={next=>{setProduct(next);void workflow.applyFilter(next?.id,state.pageSize);}}/><label htmlFor="f06-expiry-size" className="text-xs font-semibold">Items per page<select id="f06-expiry-size" className={miningInput} value={state.pageSize} onChange={event=>void workflow.applyFilter(product?.id,Number(event.target.value))}>{[10,20,50,100].map(size=><option key={size}>{size}</option>)}</select></label></div>
    {state.loading&&<p role="status" className="text-sm text-[#6D7974]">Loading expiry alerts...</p>}
    {state.error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
    {data&&<><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><p className="min-w-0 break-words font-semibold text-[#1E3A2F]">{data.totalElements.toLocaleString('en-US')} {data.totalElements===1?'due batch':'due batches'}{product?' for '+product.name:''}</p><p className="text-[11px] text-[#6D7974]">Checked {miningDate(data.checkedAt)}</p></div><MissingPushDayWarnings warnings={warnings} names={state.names}/>{!data.items.length?<p className="rounded-xl bg-[#FAF8F5] p-4 text-sm text-[#6D7974]">No due batches match this selection.{warnings.length?' Review the inventory notes above.':''}</p>:<ul aria-label="Expiry alert batches" className="grid gap-3 sm:grid-cols-2">{data.items.map(batch=><F06ExpiryBatchCard key={batch.productId+':'+batch.batchId} batch={batch} data={data} name={state.names[batch.productId]??'Product #'+batch.productId} imageUrl={state.images[batch.productId]}/>)}</ul>}<F06Pages data={data} label="alerts" busy={state.loading} onPage={page=>void workflow.setPage(page)}/></>}
    <p className="text-xs leading-5 text-[#6D7974]">{analysisSelected?'Review existing recommendations in your selected analysis.':'Choose a completed analysis to review existing recommendations.'} Alerts do not change stock or availability.</p>
  </Panel>;
}
