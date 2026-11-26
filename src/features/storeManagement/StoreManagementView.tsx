import {useEffect,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {ArrowLeft,Search,RefreshCw,ChevronDown,ChevronLeft,ChevronRight} from 'lucide-react';
import {authService} from '../../services/authService';
import {getPathForScreen} from '../../utils/navigationRouter';
import {customerPath} from '../customer/customerRoutes';
import {StoreConflict,storesApi,uncertainStoreWrite,type StoreDetail,type StorePage,type StoreStatus,type StoreView} from './storeManagement.api';
import {AccountStatusBadge} from '../users/components/AccountStatusBadge';
import {StoreOverview,StoreDirectoryContact,directoryAction,directoryRefresh,directoryInput,directoryPageButton} from './StoreDirectoryPresentation';
import {StoreManagementForm} from './StoreManagementForm';
import {StoreBrandImage,StoreImagePreview,useSavedStoreImage} from './StoreBranding';
import {storeAccountStatus,storeRoleLabel} from './storeManagement.presentation';
import {ErrorNotice,StoreDialog,StoreStatusBadge,errorMessage,panel,primary,secondary} from './StoreManagementShared';

const adminPath=getPathForScreen('admin-stores');
const pageAction='inline-flex h-11 min-w-[144px] shrink-0 items-center justify-center rounded-xl bg-[#1E3A2F] px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#2D604A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54]';
const pageTitle='text-2xl sm:text-3xl font-semibold tracking-tight text-[#191C1B]';
const pageSubtitle='mt-1 text-sm sm:text-base leading-6 text-[#6D7974]';
const subscribe=(listen:()=>void)=>{window.addEventListener('popstate',listen);return()=>window.removeEventListener('popstate',listen);};
const locationSearch=()=>window.location.search;
const openStore=(id?:number,notice='')=>{window.history.pushState({screen:'admin-stores',storeNotice:notice},'',id?adminPath+'?storeId='+id:adminPath);window.dispatchEvent(new Event('popstate'));window.scrollTo(0,0);};
const roleScope=()=>{const user=authService.getCurrentUser();return JSON.stringify([authService.getSessionId(),user?.id,user?.role,user?.storeId]);};
function StoreValue({label,children}:{label:string;children:ReactNode}){return <div className="min-w-0"><dt className="text-xs text-[#6D7974]">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{children||'Not set'}</dd></div>;}

function StoreList(){
 const [search,setSearch]=useState(''),[status,setStatus]=useState<StoreStatus|'ALL'>('ACTIVE'),[page,setPage]=useState(0),[result,setResult]=useState<StorePage|null>(null),[error,setError]=useState(''),[reload,setReload]=useState(0);
 const searchTerm=search.trim(),previousSearch=useRef('');
 const [counts,setCounts]=useState<Partial<Record<StoreStatus|'ALL',number>>>({}),[countLoading,setCountLoading]=useState(true),[countRevision,setCountRevision]=useState(0);
 const [creating,setCreating]=useState(false),[busy,setBusy]=useState(false),[createError,setCreateError]=useState(''),[uncertain,setUncertain]=useState(false),pending=useRef(false),active=useRef(true),scope=useRef(roleScope());
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 const current=()=>active.current&&roleScope()===scope.current;
 useEffect(()=>{
  const controller=new AbortController();
  const debounce=searchTerm!==previousSearch.current&&searchTerm!=='';
  previousSearch.current=searchTerm;
  setResult(null);setError('');
  const read=()=>{
   void storesApi.list(page,searchTerm,status,controller.signal).then(data=>{
    if(controller.signal.aborted)return;
    const last=Math.max(0,Math.ceil(data.totalElements/data.pageSize)-1);
    if(page>last)setPage(last);else setResult(data);
   }).catch(err=>{if(!controller.signal.aborted)setError(errorMessage(err));});
  };
  // Cancel as soon as the input changes. Only typing waits; clearing the
  // input and explicit status, page or refresh actions read immediately.
  const timer=debounce?window.setTimeout(read,350):undefined;
  if(!debounce)read();
  return()=>{window.clearTimeout(timer);controller.abort();};
 },[page,searchTerm,status,reload]);
 useEffect(()=>{const controller=new AbortController();setCounts({});setCountLoading(true);void Promise.all((['ALL','ACTIVE','INACTIVE'] as const).map(async value=>{try{const data=await storesApi.list(0,'',value,controller.signal,1);if(!controller.signal.aborted&&Number.isSafeInteger(data.totalElements)&&data.totalElements>=0)setCounts(previous=>({...previous,[value]:data.totalElements}));}catch{/* A failed optional count is unavailable, never zero. */}})).then(()=>{if(!controller.signal.aborted)setCountLoading(false);});return()=>controller.abort();},[reload,countRevision]);
 const clear=()=>{setSearch('');setStatus('ACTIVE');setPage(0);};
 const link=(store:StoreView)=><a className={directoryAction} href={adminPath+'?storeId='+store.storeId} onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();openStore(store.storeId);}}}>View details</a>;
 return <>
  <header className="flex flex-wrap items-start justify-between gap-3">
    <div><h1 className={pageTitle}>Store Management</h1><p className={pageSubtitle}>Manage stores and their operational status across the platform.</p></div>
    <button type="button" className={pageAction} onClick={()=>{setCreateError('');setUncertain(false);setCreating(true);}}>Create Store</button>
  </header>
  <StoreOverview counts={counts} loading={countLoading} status={status} onStatus={value=>{setStatus(value);setPage(0);}}/>
  {!countLoading&&Object.keys(counts).length<3&&<button type="button" className={secondary+' self-start'} onClick={()=>setCountRevision(n=>n+1)}>Retry store counts</button>}
  <section aria-label="Store directory" data-store-directory className={panel+' min-w-0 overflow-hidden shadow-[0_1px_3px_rgba(30,58,47,0.04)]'}>
    <div className="space-y-5 border-b border-[#E7E2D8] p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-[#191C1B]">Store Directory</h2><p className="mt-1 text-sm text-[#6D7974]">Find stores and manage their information and access.</p></div>
        <button type="button" className={directoryRefresh} onClick={()=>setReload(n=>n+1)}><RefreshCw aria-hidden="true" className={'h-3.5 w-3.5 '+(!result&&!error?'animate-spin motion-reduce:animate-none':'')}/>Refresh stores</button>
      </header>
      <div role="search" aria-label="Store filters" data-store-directory-toolbar className="grid items-end gap-4 sm:grid-cols-[minmax(0,7fr)_minmax(160px,3fr)]">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2"><label htmlFor="stores-search" className="text-xs font-semibold text-[#59685F]">Search stores</label>{(search||status!=='ACTIVE')&&<button type="button" className="rounded text-xs font-medium text-[#365543] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54]" onClick={clear}>Clear filters</button>}</div>
          <div className="relative mt-2"><Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#87958B]"/>
            <input id="stores-search" type="search" className={directoryInput+' pl-10 pr-3.5'} placeholder="Search by name or store URL" value={search} onChange={event=>{const value=event.target.value;setSearch(value);if(value.trim()!==searchTerm)setPage(0);}}/>
          </div>
        </div>
        <div><label htmlFor="stores-status" className="text-xs font-semibold text-[#59685F]">Status</label><div className="relative mt-2">
          <select id="stores-status" className={directoryInput+' appearance-none pl-3.5 pr-10 !text-[#405247]'} value={status} onChange={event=>{setStatus(event.target.value as StoreStatus|'ALL');setPage(0);}}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#87958B]"/>
        </div></div>
      </div>
    </div>
    {error&&<div className="p-5 sm:px-6"><ErrorNotice message={error} retry={()=>setReload(n=>n+1)}/></div>}
    {!result&&!error&&<p role="status" className="px-5 py-10 text-center text-sm text-[#6D7974] sm:px-6">Loading stores...</p>}
    {result&&<>
      {!result.items.length?<div className="px-5 py-10 text-center sm:px-6"><h3 className="text-sm font-semibold">No stores found</h3><p className="mt-1 text-sm text-[#6D7974]">Try a different keyword or clear your filters.</p></div>:<>
        <table aria-label="Store directory" className="hidden w-full table-fixed text-left text-sm lg:table">
          <colgroup><col style={{width:'32%'}}/><col style={{width:132}}/><col/><col style={{width:160}}/></colgroup>
          <thead className="border-b border-[#E2E7DE] bg-[#F5F7F2] text-xs text-[#64745F]"><tr>{['Store','Status','Contact information','Actions'].map(label=><th scope="col" key={label} className={'whitespace-nowrap px-5 py-3.5 font-semibold sm:px-6 '+(label==='Actions'?'text-right':'')}>{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#EBEEE7] text-[#191C1B]">{result.items.map(store=><tr key={store.storeId} className="transition-colors hover:bg-[#F5F9F4] focus-within:bg-[#F5F9F4]">
            <td className="px-5 py-4 sm:px-6"><p className="break-words font-semibold text-[#263C2E]">{store.name}</p><p className="mt-1 break-words text-xs text-[#6D7974]">{customerPath(store.slug)}</p></td>
            <td className="px-5 py-4 sm:px-6"><AccountStatusBadge status={store.status==='ACTIVE'?'Active':'Inactive'}/></td>
            <td className="px-5 py-4 sm:px-6"><StoreDirectoryContact store={store}/></td>
            <td className="px-5 py-4 text-right sm:px-6">{link(store)}</td>
          </tr>)}</tbody>
        </table>
        <ul className="divide-y divide-[#EBEEE7] lg:hidden">{result.items.map(store=><li key={store.storeId} className="space-y-3 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-semibold text-[#263C2E]">{store.name}</p><p className="mt-1 break-words text-xs text-[#6D7974]">{customerPath(store.slug)}</p></div><AccountStatusBadge status={store.status==='ACTIVE'?'Active':'Inactive'}/></div>
          <StoreDirectoryContact store={store}/><div className="flex justify-end">{link(store)}</div>
        </li>)}</ul>
      </>}
      <footer className="flex flex-col gap-4 border-t border-[#E7E2D8] bg-[#FDFEFB] px-5 py-4 text-xs text-[#6D7974] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-1"><p>Showing <span className="font-medium tabular-nums text-[#3D5640]">{result.items.length?result.page*result.pageSize+1:0}–{Math.min((result.page+1)*result.pageSize,result.totalElements)}</span> of <span className="font-medium tabular-nums text-[#3D5640]">{result.totalElements.toLocaleString('en-US')}</span> stores</p><p className="text-[#8A9689]">Page {result.page+1} of {Math.max(1,Math.ceil(result.totalElements/result.pageSize))} · {result.pageSize} stores per page</p></div>
        {result.totalElements>result.pageSize&&<nav aria-label="Store pages" className="flex flex-wrap items-center gap-1.5"><button type="button" className={directoryPageButton} disabled={page===0} onClick={()=>setPage(n=>n-1)}><ChevronLeft aria-hidden="true" className="h-3.5 w-3.5"/>Previous</button><button type="button" className={directoryPageButton} disabled={(page+1)*result.pageSize>=result.totalElements} onClick={()=>setPage(n=>n+1)}>Next<ChevronRight aria-hidden="true" className="h-3.5 w-3.5"/></button></nav>}
      </footer>
    </>}
  </section>
  {creating&&<StoreDialog formLayout title="Create Store" subtitle="Set up a new store and its public profile." busy={busy} onClose={()=>{setCreating(false);if(uncertain)setReload(n=>n+1);}}>{uncertain&&<div className="space-y-4 overflow-y-auto p-5"><ErrorNotice message="The creation could not be confirmed. Check the store directory before trying again; the request was not retried."/><button type="button" className={secondary} onClick={()=>{setCreating(false);setReload(n=>n+1);}}>Check store directory</button></div>}<StoreManagementForm identity busy={busy} blocked={uncertain} serverError={uncertain?'':createError} dialog onCancel={()=>{setCreating(false);if(uncertain)setReload(n=>n+1);}} onSubmit={async values=>{if(pending.current)return false;pending.current=true;setBusy(true);setCreateError('');try{const created=await storesApi.create(values);if(!current())return false;openStore(created.storeId,'Store created successfully.');return true;}catch(err){if(current()){setCreateError(errorMessage(err));if(uncertainStoreWrite(err))setUncertain(true);}return false;}finally{pending.current=false;if(current())setBusy(false);}}}/></StoreDialog>}
 </>;
}

function Detail({id,mode}:{id?:number;mode:'system'|'manage'|'read'}){
 const [record,setRecord]=useState<StoreView|StoreDetail|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(()=>typeof window!=='undefined'?window.history.state?.storeNotice||'':''),[formError,setFormError]=useState(''),[busy,setBusy]=useState(false),[reload,setReload]=useState(0),[confirm,setConfirm]=useState(false),[editing,setEditing]=useState(false),[formRevision,setFormRevision]=useState(0),[blocked,setBlocked]=useState(false),[conflict,setConflict]=useState(false);
 const active=useRef(true),pending=useRef(false),scope=useRef(roleScope());
 const system=mode==='system',editable=mode!=='read',detail=system&&record&&'assignedUsers'in record?record:null;
 const icon=useSavedStoreImage(record,'icon'),banner=useSavedStoreImage(record,'banner');
 const load=(signal?:AbortSignal)=>id===undefined?storesApi.profile(signal):storesApi.detail(id,signal);
 const current=()=>active.current&&roleScope()===scope.current;
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 useEffect(()=>{const controller=new AbortController();setError('');void load(controller.signal).then(data=>{if(!controller.signal.aborted)setRecord(data);}).catch(err=>{if(!controller.signal.aborted)setError(errorMessage(err));});return()=>controller.abort();},[id,reload]);
 const checkSaved=async()=>{if(pending.current)return;pending.current=true;setBusy(true);setError('');try{const latest=await load();if(!current())return;setRecord(latest);setBlocked(false);setConflict(editing);setFormError('');setNotice('Latest store information loaded. Review the saved values before making another change.');}catch(err){if(current())setError(errorMessage(err));}finally{pending.current=false;if(current())setBusy(false);}};
 const mutate=async(action:()=>Promise<StoreView|StoreDetail>,message:string,refresh=false):Promise<boolean>=>{
  if(pending.current||blocked||conflict)return false;pending.current=true;setBusy(true);setFormError('');setNotice('');
  try{const updated=await action();if(!current())return false;if(refresh){try{const latest=await load();if(!current())return false;setRecord(latest);}catch{if(current()){setBlocked(true);setFormError('The image change was saved, but the latest store information could not be loaded. Check the saved store before making another change.');return true;}return false;}}else setRecord(updated);setNotice(message);setConfirm(false);return true;
  }catch(err){if(!current())return false;setFormError(errorMessage(err));if(err instanceof StoreConflict){setConfirm(false);setBlocked(true);try{const latest=await load();if(!current())return false;setRecord(latest);setBlocked(false);setConflict(true);setFormError('This store changed while you were editing. Review the latest saved values before trying again.');}catch{setFormError('This store changed. The latest values could not be loaded. Check the saved store before retrying.');}}else if(uncertainStoreWrite(err)){setBlocked(true);setFormError('The change could not be confirmed. Check the saved store before trying again. No automatic retry was made.');}return false;
  }finally{pending.current=false;if(current())setBusy(false);}
 };
 return <>
  {system&&<button type="button" className={secondary+' self-start'} disabled={busy} onClick={()=>openStore()}><ArrowLeft aria-hidden="true" className="h-4 w-4"/>Back to Stores</button>}
  <header><h1 className={pageTitle}>{system?'Store Details':'My Store'}</h1><p className={pageSubtitle}>{system?'Manage store information, branding and access.':editable?'Manage your store profile, contact details and branding.':'View your store profile, contact details and branding.'}</p></header>
  {notice&&<p role="status" className="rounded-xl border border-[#CBDCCE] bg-[#EDF5F0] p-3 text-sm text-[#1E3A2F]">{notice}</p>}{error&&<ErrorNotice message={error} retry={()=>setReload(n=>n+1)}/>}{!record&&!error&&<p role="status" className="text-sm text-[#6D7974]">Loading store details…</p>}
  {record&&<>
   {(blocked||conflict)&&<div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p>{formError}</p>{blocked?<button type="button" className={secondary} disabled={busy} onClick={()=>void checkSaved()}>Check saved store</button>:<><p className="font-semibold">Latest saved information</p><dl className="grid gap-3 sm:grid-cols-2">{system&&<><StoreValue label="Store name">{record.name}</StoreValue><StoreValue label="Store URL">{customerPath(record.slug)}</StoreValue></>}<StoreValue label="Address">{record.address}</StoreValue><StoreValue label="Phone number">{record.phone}</StoreValue></dl><div className="flex flex-wrap gap-2"><button type="button" className={secondary} onClick={()=>{setConflict(false);setFormError('');}}> {editing?'Keep my draft':'Reviewed latest information'}</button>{editing&&<button type="button" className={secondary} onClick={()=>{setFormRevision(n=>n+1);setConflict(false);setFormError('');}}>Use latest saved values</button>}</div></>}</div>}
   {!editing&&!blocked&&!conflict&&formError&&<ErrorNotice message={formError}/>}
   <section aria-label="Store profile" className={panel+' overflow-hidden'}>
    <div className={'flex flex-wrap items-center gap-4 p-5 '+(system?'bg-[#1D3C30] text-white':'')}><StoreImagePreview image={icon} kind="icon" identity/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h2 className="break-words text-xl font-semibold">{record.name}</h2><StoreStatusBadge status={record.status}/></div><a href={customerPath(record.slug)} className={'mt-2 block break-words text-sm underline-offset-4 hover:underline focus-visible:outline-2 '+(system?'text-[#D6E4DB]':'text-[#6D7974]')}>{customerPath(record.slug)}</a></div></div>
    <div className="space-y-4 border-t border-[#E7E2D8] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-base font-semibold">{system?'Store information':'Contact information'}</h3>{editable&&!editing&&<button type="button" className={secondary} disabled={busy||blocked||conflict} onClick={()=>{setEditing(true);setFormError('');setFormRevision(n=>n+1);}}>Edit information</button>}</div>
     {editing?<StoreManagementForm key={formRevision} store={record} identity={system} busy={busy} blocked={blocked||conflict} serverError={blocked||conflict?'':formError} onCancel={()=>{setEditing(false);setFormError('');}} onSubmit={async fields=>{const saved=await mutate(()=>system?storesApi.update(record.storeId,{...fields,expectedVersion:record.version}):storesApi.updateProfile({address:fields.address,phone:fields.phone,expectedVersion:record.version}),'Store information saved.');if(saved)setEditing(false);return saved;}}/>:<dl className="grid gap-4 sm:grid-cols-2">{system&&<><StoreValue label="Store name">{record.name}</StoreValue><StoreValue label="Store URL">{customerPath(record.slug)}</StoreValue></>}<StoreValue label="Address">{record.address}</StoreValue><StoreValue label="Phone number">{record.phone}</StoreValue></dl>}
    </div>
   </section>
   <section aria-label="Store branding" className={panel+' space-y-5 p-5'}><header><h2 className="text-lg font-semibold">Store branding</h2><p className="mt-1 text-sm text-[#6D7974]">{editable?'Manage how your store appears to customers.':'Images displayed on your store profile.'}</p></header>{(['icon','banner'] as const).map(kind=><div key={kind} className={kind==='banner'?'border-t border-[#E7E2D8] pt-5':''}><StoreBrandImage record={record} kind={kind} image={kind==='icon'?icon:banner} editable={editable} busy={busy} locked={blocked||conflict||editing} mutationError={formError} onUpload={file=>mutate(()=>storesApi.upload(record.storeId,kind,file),'Store '+kind+' saved.',true)} onRemove={()=>mutate(()=>storesApi.remove(record.storeId,kind),'Store '+kind+' removed.',true)}/></div>)}</section>
   {!editable&&<p className="text-xs text-[#6D7974]">Store information and branding are managed by your Store Admin.</p>}
   {detail&&<><section aria-label="Assigned users" className={panel+' space-y-4 p-5'}><header className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Assigned users <span className="text-[#6D7974]">({detail.assignedUserCount.toLocaleString('en-US')})</span></h2><a className={secondary} href={getPathForScreen('users')}>Users &amp; Roles</a></header>{!detail.assignedUsers.length?<p className="text-sm text-[#6D7974]">No users are assigned to this store.</p>:<ul className="divide-y divide-[#E7E2D8]">{detail.assignedUsers.map(user=><li key={user.userId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div className="min-w-0"><p className="break-words font-semibold">{user.name||user.email}</p>{user.name&&<p className="mt-1 break-all text-xs text-[#6D7974]">{user.email}</p>}</div><div className="flex flex-wrap gap-3 text-xs text-[#53665B]"><span>{storeRoleLabel(user.role)}</span><span>{storeAccountStatus(user.status)}</span></div></li>)}</ul>}</section>
    <section aria-label="Store access" className={panel+' flex flex-wrap items-center justify-between gap-4 p-5'}><div><h2 className="text-base font-semibold">Store access</h2><p className="mt-1 text-sm text-[#6D7974]">{record.status==='ACTIVE'?'This store is active. Assigned users can access it.':'This store is inactive. Assigned users cannot access it.'}</p></div><button type="button" className={secondary+(record.status==='ACTIVE'?' !border-[#E5CDBF] !text-[#954A17]':'')} disabled={busy||blocked||conflict||editing} onClick={()=>{setFormError('');setConfirm(true);}}>{record.status==='ACTIVE'?'Deactivate Store':'Activate Store'}</button></section></>}
  </>}
  {confirm&&detail&&<StoreDialog title={detail.status==='ACTIVE'?'Deactivate Store?':'Activate Store?'} busy={busy} onClose={()=>{setConfirm(false);setFormError('');}}><div className="space-y-4 overflow-y-auto p-5"><p className="break-words text-base font-semibold">{detail.name}</p><p className="text-sm">{detail.assignedUserCount} assigned {detail.assignedUserCount===1?'user':'users'}</p><p className="text-sm text-[#53665B]">{detail.status==='ACTIVE'?'Users assigned to this store will lose access while the store is inactive.':'Assigned users will be able to access the store again.'}</p>{formError&&<ErrorNotice message={formError}/>}<div className="flex flex-wrap justify-end gap-2"><button type="button" className={secondary} disabled={busy} onClick={()=>setConfirm(false)}>Cancel</button><button type="button" className={primary} disabled={busy||blocked||conflict} onClick={()=>void mutate(()=>storesApi.status(detail.storeId,detail.version,detail.status==='ACTIVE'?'INACTIVE':'ACTIVE'),detail.status==='ACTIVE'?'Store deactivated.':'Store activated.')}>{detail.status==='ACTIVE'?'Deactivate':'Activate'}</button></div></div></StoreDialog>}
 </>;
}
export function StoreManagementView({mode}:{mode:'system'|'manage'|'read'}){
 const search=useSyncExternalStore(subscribe,locationSearch,()=>''),user=useSyncExternalStore(authService.subscribe,authService.getCurrentUser,authService.getCurrentUser),rawId=new URLSearchParams(search).get('storeId'),id=rawId===null?undefined:Number(rawId);
 const allowed=mode==='system'?user?.role==='System Admin':mode==='manage'?user?.role==='Store Admin':user?.role==='Merchandiser';
 if(!allowed)return <p role="alert">Store information is unavailable for this role.</p>;
 return <div key={roleScope()} className="flex w-full min-w-0 flex-col gap-6 text-[#191C1B]">{mode!=='system'?<Detail key={roleScope()} mode={mode}/>:rawId===null?<StoreList key={roleScope()}/>:id!==undefined&&/^[1-9][0-9]*$/.test(rawId)&&id<=2147483647?<Detail key={roleScope()+id} mode="system" id={id}/>:<><ErrorNotice message="Invalid Store ID."/><button type="button" className={secondary+' self-start'} onClick={()=>openStore()}>Back to Stores</button></>}</div>;
}
