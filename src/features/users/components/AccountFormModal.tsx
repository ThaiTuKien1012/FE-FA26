import { useEffect, useId, useRef } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Mail, ShieldCheck, UserPlus, X } from 'lucide-react';
import type { UserAccount, UserStatus, SystemRole } from '../../../types/users';
import { accountChanges, canChangeAccountStatus, needsAccountStore } from '../account-management';
import type { AccountDraft } from '../account-management';
import { AccountStatusBadge } from './AccountStatusBadge';
import { AccountStoreSelect } from './AccountStoreSelect';
import { AccountSelect } from './AccountSelect';

export interface AccountRoleOption {code:string;display_name:string;role:SystemRole;}
interface Props {
  mode:'add'|'edit'; current:UserAccount|null; actorId:string; draft:AccountDraft;
  loading:boolean; submitting:boolean; error:string|null; roles:AccountRoleOption[];
  rolesLoading:boolean; rolesError:string; onRefreshRoles:()=>void; onReload:()=>void;
  onChange:(patch:Partial<AccountDraft>)=>void; onClose:()=>void; onSubmit:(event:FormEvent<HTMLFormElement>)=>void;
}
const field='mt-2 h-11 w-full rounded-xl border border-[#DDE4DC] bg-white px-3.5 text-sm text-[#243C2D] outline-none transition focus:border-[#689477] focus:ring-2 focus:ring-[#356B54]/10 disabled:bg-[#F4F5F1] disabled:text-[#879180]';
const secondary='inline-flex h-11 items-center justify-center rounded-xl border border-[#D7E0D3] bg-white px-4 text-sm font-semibold text-[#47613D] transition hover:bg-[#F2F6EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54] disabled:cursor-not-allowed disabled:opacity-50';

export function AccountFormModal({mode,current,actorId,draft,loading,submitting,error,roles,rolesLoading,rolesError,onRefreshRoles,onReload,onChange,onClose,onSubmit}:Props) {
  const titleId=useId(),descriptionId=useId();
  const panel=useRef<HTMLDivElement>(null),close=useRef<HTMLButtonElement>(null),name=useRef<HTMLInputElement>(null),alert=useRef<HTMLParagraphElement>(null);
  const closeAction=useRef(onClose);closeAction.current=onClose;
  const busy=useRef(submitting);busy.current=submitting;
  useEffect(()=>{
    const opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const openerLabel=opener?.getAttribute('aria-label');
    const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const handleKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();if(!busy.current)closeAction.current();return;}
      if(event.key!=='Tab')return;
      const elements=[...(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')??[])].filter(el=>el.getClientRects().length>0);
      if(!elements.length){event.preventDefault();panel.current?.focus();return;}
      const first=elements[0],last=elements[elements.length-1],active=document.activeElement;
      if(event.shiftKey&&(active===first||!elements.includes(active as HTMLElement))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(active===last||!elements.includes(active as HTMLElement))){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',handleKey,true);
    return()=>{
      document.removeEventListener('keydown',handleKey,true);document.body.style.overflow=previousOverflow;
      requestAnimationFrame(()=>{
        const equivalent=openerLabel?[...document.querySelectorAll<HTMLButtonElement>('button[aria-label]')].find(button=>button.getAttribute('aria-label')===openerLabel):null;
        (opener?.isConnected?opener:equivalent??document.querySelector<HTMLElement>('[data-account-add]'))?.focus();
      });
    };
  },[]);
  useEffect(()=>{if(loading)close.current?.focus();else if(!panel.current?.contains(document.activeElement)||document.activeElement===close.current)name.current?.focus();},[loading]);
  useEffect(()=>{if(error)alert.current?.focus();},[error]);
  const editing=mode==='edit',self=current?.id===actorId;
  const ready=!loading&&(!editing||current!==null);
  const changes=current?accountChanges(current,draft):null;
  const changed=Boolean(changes&&(changes.name||changes.access||changes.status));
  const accessWarning=Boolean(changes&&(changes.access||changes.status));
  const statusEditable=current!==null&&canChangeAccountStatus(current);
  const disabled=submitting||!ready;
  const storeRequired=!editing||Boolean(changes?.access);
  const saveDisabled=disabled||(editing?!changed:rolesLoading||roles.length===0)||(storeRequired&&needsAccountStore(draft.role)&&!draft.storeId);
  const RoleIcon=editing?ShieldCheck:UserPlus;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14251B]/45 p-3 backdrop-blur-[2px] sm:p-6">
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={loading||submitting} tabIndex={-1} className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[580px] flex-col overflow-hidden rounded-2xl border border-[#E3E7DE] bg-white text-[#191C1B] shadow-[0_20px_80px_rgba(20,37,27,0.22)] sm:max-h-[calc(100dvh-3rem)]">
      <header className="flex shrink-0 items-start gap-3 border-b border-[#E7EADF] px-5 py-5 sm:px-6">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDF4E9] text-[#456A3E]"><RoleIcon aria-hidden="true" className="h-5 w-5"/></span>
        <div className="min-w-0 flex-1"><h2 id={titleId} className="text-xl font-semibold tracking-tight">{editing?'Edit Account':'Add New Account'}</h2><p id={descriptionId} className="mt-1 text-sm leading-5 text-[#6D7974]">{editing?'Update account information and access settings.':'Create an account and invite the user to activate it.'}</p></div>
        <button ref={close} type="button" aria-label="Close account dialog" disabled={submitting} onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#7B8876] transition hover:bg-[#F1F4ED] hover:text-[#365D3E] focus-visible:outline-2 focus-visible:outline-[#356B54] disabled:opacity-40"><X aria-hidden="true" className="h-5 w-5"/></button>
      </header>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
        <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {error&&<div className="space-y-2"><p ref={alert} role="alert" tabIndex={-1} className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-relaxed text-red-800 focus:outline-none">{error}</p>{editing&&ready&&<p className="text-xs leading-5 text-[#6D7974]"><button type="button" disabled={submitting} onClick={onReload} className="font-semibold text-[#356B54] underline">Reload account details</button> to check the current values. Reloading replaces this draft.</p>}</div>}
          {loading?<p role="status" className="py-8 text-center text-sm text-[#6D7974]">Loading account details...</p>:!ready?<div className="py-4 text-sm text-[#6D7974]"><p>Account details are unavailable. Reload before making changes.</p><button type="button" className={secondary+' mt-3'} onClick={onReload}>Reload account details</button></div>:<>
            <fieldset disabled={submitting} className="space-y-4">
              <legend className="mb-2 text-sm font-semibold text-[#2E4733]">{editing?'Account Information':'Personal Information'}</legend>
              <div><label htmlFor={titleId+'-name'} className="text-sm font-medium text-[#405447]">Full Name</label><input ref={name} id={titleId+'-name'} type="text" aria-label="Full Name" required={!editing||Boolean(changes?.name)} maxLength={150} autoComplete="name" value={draft.name} onChange={event=>onChange({name:event.target.value})} className={field}/></div>
              <div><label htmlFor={titleId+'-email'} className="text-sm font-medium text-[#405447]">Email Address</label><input id={titleId+'-email'} type="email" aria-label="Email Address" required maxLength={254} autoComplete="email" readOnly={editing} aria-readonly={editing||undefined} value={draft.email} onChange={event=>onChange({email:event.target.value})} className={editing?field.replace('bg-white','bg-[#F5F6F2]'):field}/>{editing&&<p className="mt-2 text-xs leading-5 text-[#6D7974]">The email address stays unchanged to preserve account verification.</p>}</div>
            </fieldset>
            <fieldset disabled={submitting} className="space-y-4 border-t border-[#E7EADF] pt-4">
              <legend className="mb-2 pr-2 text-sm font-semibold text-[#2E4733]">{editing?'Access Settings':'Role & Store Assignment'}</legend>
              <div><label htmlFor={titleId+'-role'} className="text-sm font-medium text-[#405447]">Account Role</label>
                <AccountSelect id={titleId+'-role'} aria-label="Account Role" value={draft.role} disabled={submitting||rolesLoading||roles.length===0||(editing&&self)} onChange={event=>{const role=event.target.value as SystemRole;onChange({role,...(!needsAccountStore(role)?{storeId:''}:{})});}} className={field}>
                  {!roles.some(role=>role.role===draft.role)&&<option value={draft.role}>{editing?draft.role:'Loading roles...'}</option>}
                  {roles.map(role=><option key={role.code} value={role.role}>{role.display_name}</option>)}
                </AccountSelect>
                {rolesError&&<p className="mt-2 text-xs text-red-800">{rolesError} <button type="button" disabled={submitting||rolesLoading} onClick={onRefreshRoles} className="font-semibold underline">Retry roles</button></p>}
              </div>
              {needsAccountStore(draft.role)?<AccountStoreSelect value={draft.storeId} disabled={submitting} required={storeRequired} onChange={storeId=>onChange({storeId})} className={field}/>:<p className="flex items-start gap-2 text-sm leading-5 text-[#6D7974]"><StoreHint/>This role does not require a Store assignment.</p>}
            </fieldset>
            {editing&&current?<section aria-labelledby={titleId+'-status'} className="space-y-4 border-t border-[#E7EADF] pt-5">
              <h3 id={titleId+'-status'} className="text-sm font-semibold text-[#2E4733]">Account Status</h3>
              <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="mb-2 text-xs text-[#6D7974]">Current Status</dt><dd><AccountStatusBadge status={current.status}/></dd></div><div><dt className="mb-2 text-xs text-[#6D7974]">OTP Verification</dt><dd className={'inline-flex items-center gap-1.5 text-sm font-medium '+(current.emailVerified?'text-[#386E45]':'text-[#8A6D2D]')}>{current.emailVerified?<CheckCircle2 aria-hidden="true" className="h-4 w-4"/>:<Mail aria-hidden="true" className="h-4 w-4"/>}{current.emailVerified?'Email verified':'Not verified'}</dd></div></dl>
              <div><label htmlFor={titleId+'-access'} className="text-sm font-medium text-[#405447]">Account Access</label><AccountSelect id={titleId+'-access'} aria-label="Account Status" value={draft.status} disabled={submitting||!statusEditable} onChange={event=>onChange({status:event.target.value as UserStatus})} className={field}>
                {current.status==='Pending Activation'&&<option value="Pending Activation">Pending Activation</option>}<option value="Active">Active</option><option value="Inactive" disabled={self}>Inactive</option>
              </AccountSelect>
                <p className="mt-2 text-xs leading-5 text-[#6D7974]">{self?'Your own administrator role and active access are protected. You can still update your name.':statusEditable?'A verified account can be re-enabled once activation and password setup are complete. The server confirms eligibility when you save.':'Direct activation is unavailable. The user must complete OTP verification and account activation first.'}</p>
              </div>
              {current.status==='Pending Activation'&&<div className="rounded-xl bg-[#FFF8E7] p-3 text-sm leading-5 text-[#866624]"><p className="font-semibold">Complete activation first</p><p className="mt-1">For invited users: choose “Activate account” on the sign-in page. They can resend their code there and set their password. Self-registered users should finish the registration flow.</p></div>}
              {current.status==='Inactive'&&!current.emailVerified&&<p className="rounded-xl bg-[#FFF8E7] p-3 text-sm leading-5 text-[#866624]">OTP activation has not been completed. If the original activation flow is no longer available, ask support to review this account.</p>}
            </section>:<div className="flex items-start gap-2.5 border-t border-[#E7EADF] pt-4 text-sm leading-5 text-[#61705F]"><Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0"/><div><p className="font-semibold">Invitation email</p><p className="mt-1">An activation code will be sent to the user's email after account creation.</p></div></div>}
            {accessWarning&&<p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900"><AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0"/>Changing role, Store assignment or access status signs this account out of existing sessions.</p>}
          </>}
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-[#E7EADF] bg-[#FAFCF7] px-5 py-4 sm:px-6">
          {editing&&ready&&!changed&&<p className="w-full text-xs text-[#6D7974] sm:mr-auto sm:w-auto">No changes to save.</p>}
          <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
          <button type="button" disabled={submitting} onClick={onClose} className={secondary}>Cancel</button>
          <button type="submit" disabled={saveDisabled} className="inline-flex h-11 min-w-0 flex-1 items-center justify-center rounded-xl bg-[#1E3A2F] px-4 text-sm font-semibold text-white transition hover:bg-[#2D604A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">{submitting?(editing?'Saving...':'Sending invitation...'):editing?'Save Changes':'Create & Send Invitation'}</button>
          </div>
        </footer>
      </form>
    </div>
  </div>;
}
function StoreHint(){return <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#8B9A83]"/>;}

