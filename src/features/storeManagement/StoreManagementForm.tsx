import {useId,useRef,useState,type FormEvent} from 'react';
import {customerPath} from '../customer/customerRoutes';
import type {StoreView,StoreInput} from './storeManagement.api';
import {storeFieldErrors,storeInput,suggestStoreSlug,type StoreFields} from './storeManagement.presentation';
import {ErrorNotice} from './StoreManagementShared';

const field='mt-2 h-11 w-full rounded-xl border border-[#DDE4DC] bg-white px-3.5 text-sm text-[#243C2D] outline-none transition focus:border-[#689477] focus:ring-2 focus:ring-[#356B54]/10 disabled:bg-[#F4F5F1] disabled:text-[#879180]';
const secondary='inline-flex h-11 items-center justify-center rounded-xl border border-[#D7E0D3] bg-white px-4 text-sm font-semibold text-[#47613D] transition hover:bg-[#F2F6EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54] disabled:cursor-not-allowed disabled:opacity-50';
const primary='inline-flex h-11 min-w-0 flex-1 items-center justify-center rounded-xl bg-[#1E3A2F] px-4 text-sm font-semibold text-white transition hover:bg-[#2D604A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none';

export function StoreManagementForm({store,identity,busy,serverError,onSubmit,onCancel,dialog=false,blocked=false}:{store?:StoreView;identity:boolean;busy:boolean;serverError:string;onSubmit:(values:Required<StoreInput>)=>Promise<boolean>;onCancel:()=>void;dialog?:boolean;blocked?:boolean}){
 const initial=useRef<StoreFields>({name:store?.name??'',slug:store?.slug??'',address:store?.address??'',phone:store?.phone??''});
 const [values,setValues]=useState(initial.current),[automatic,setAutomatic]=useState(!store),[errors,setErrors]=useState<Partial<Record<keyof StoreFields,string>>>({});
 const id=useId(),creating=!store,normalized=storeInput(values),baseline=storeInput(initial.current),liveErrors=storeFieldErrors(values,identity);
 const dirty=identity?JSON.stringify(normalized)!==JSON.stringify(baseline):normalized.address!==baseline.address||normalized.phone!==baseline.phone;
 const requiredInvalid=identity&&Boolean(liveErrors.name||liveErrors.slug);
 const duplicate=serverError==='Store name already exists'?'name':serverError==='Store slug already exists'?'slug':null;
 const submit=(event:FormEvent)=>{
  event.preventDefault();if(busy||blocked||(!creating&&!dirty))return;
  setErrors(liveErrors);
  if(Object.keys(liveErrors).length){document.getElementById(id+'-'+Object.keys(liveErrors)[0])?.focus();return;}
  void onSubmit(normalized);
 };
 const input=(key:keyof StoreFields,label:string,placeholder:string)=>{
  const message=errors[key]||(duplicate===key?(key==='name'?'This store name is already in use.':'This store URL is already in use.'):'');
  const generated=key==='slug'&&creating&&automatic;
  return <div>
   <label htmlFor={id+'-'+key} className="text-sm font-medium text-[#405447]">{label}</label>
   <input id={id+'-'+key} className={generated?field.replace('bg-white','bg-[#F5F6F2]'):field} type={key==='phone'?'tel':'text'} placeholder={placeholder}
    maxLength={{name:150,slug:50,address:255,phone:30}[key]} required={key==='name'||key==='slug'} value={values[key]} readOnly={generated} aria-readonly={generated||undefined}
    aria-describedby={message?id+'-'+key+'-error':key==='slug'?id+'-slug-help':undefined} aria-invalid={!!message||undefined}
    onChange={event=>{const value=event.target.value;setValues(current=>({...current,[key]:value,...(key==='name'&&creating&&automatic?{slug:suggestStoreSlug(value)}:{})}));setErrors(current=>({...current,[key]:undefined,...(key==='name'&&creating&&automatic?{slug:undefined}:{})}));}}
    onBlur={()=>setErrors(current=>({...current,[key]:liveErrors[key],...(key==='name'&&creating&&automatic?{slug:liveErrors.slug}:{})}))}/>
   {message&&<p id={id+'-'+key+'-error'} role="alert" className="mt-1 text-xs text-[#962626]">{message}</p>}
  </div>;
 };
 return <form noValidate onSubmit={submit} className={dialog?'flex min-h-0 flex-col':'space-y-4'}>
  <div className={dialog?'min-h-0 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6':'space-y-4'}>
   {identity&&<fieldset disabled={busy} className="min-w-0 space-y-3">
    {dialog&&<legend className="mb-2 text-sm font-semibold text-[#2E4733]">Store Information</legend>}
    {input('name','Store Name *','Enter store name')}
    <div>{input('slug','Store URL *','your-store-name')}
     {creating?<div className="mt-1 flex flex-wrap items-center justify-between gap-2"><p id={id+'-slug-help'} className="text-xs leading-5 text-[#6D7974]">{automatic?'Automatically generated from your store name.':'Use lowercase letters, numbers and hyphens.'}</p><button type="button" className="rounded py-0.5 text-xs font-semibold text-[#356B54] underline-offset-2 hover:underline focus-visible:outline-2" onClick={()=>{if(!automatic)setValues(current=>({...current,slug:suggestStoreSlug(current.name)}));setAutomatic(!automatic);setErrors(current=>({...current,slug:undefined}));}}>{automatic?'Customize':'Auto-generate'}</button></div>:<p id={id+'-slug-help'} className="mt-1 text-xs leading-5 text-[#6D7974]">This identifies the store in its public storefront address.</p>}
     {!creating&&values.slug!==initial.current.slug&&<p role="note" className="mt-2 text-xs text-amber-900">Changing the store URL will change its public storefront address.</p>}
     <div className="mt-2 rounded-lg border border-[#E7EADF] bg-[#F4F8EF] px-3 py-2 text-xs leading-4"><p className="text-[#6D7974]">Storefront URL preview</p><p className="mt-1 break-all text-[#356B54]">{normalized.slug&&!liveErrors.slug?customerPath(normalized.slug):'Enter a valid store URL to see the preview.'}</p></div>
    </div>
   </fieldset>}
   <fieldset disabled={busy} className={'min-w-0 space-y-3 '+(identity?'border-t border-[#E7EADF] pt-3':'')}>
    {identity&&<legend className="mb-2 pr-2 text-sm font-semibold text-[#2E4733]">Contact Information</legend>}
    {input('address','Address','Enter store address')}
    {input('phone','Phone Number','Enter phone number')}
   </fieldset>
   {creating&&<p className="text-xs leading-5 text-[#6D7974]">New stores are active by default.</p>}
   {serverError&&!duplicate&&<ErrorNotice message={serverError}/>}
  </div>
  <footer className={'flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-[#E7EADF] bg-[#FAFCF7] '+(dialog?'px-5 py-4 sm:px-6':'rounded-b-xl px-4 py-3')}>
   <div className="flex w-full items-center justify-end gap-3 sm:w-auto"><button type="button" className={secondary} disabled={busy} onClick={onCancel}>Cancel</button><button type="submit" className={primary} disabled={busy||blocked||(creating&&requiredInvalid)||(!creating&&!dirty)}>{busy?'Saving...':creating?'Create Store':'Save changes'}</button></div>
  </footer>
 </form>;
}
