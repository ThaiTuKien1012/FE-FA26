import {useId,useRef,useState,type FormEvent} from 'react';
import {customerPath} from '../customer/customerRoutes';
import type {StoreView,StoreInput} from './storeManagement.api';
import {storeFieldErrors,storeInput,suggestStoreSlug,type StoreFields} from './storeManagement.presentation';
import {ErrorNotice,field,primary,secondary} from './StoreManagementShared';

export function StoreManagementForm({store,identity,busy,serverError,onSubmit,onCancel,dialog=false,blocked=false}:{store?:StoreView;identity:boolean;busy:boolean;serverError:string;onSubmit:(values:Required<StoreInput>)=>Promise<boolean>;onCancel:()=>void;dialog?:boolean;blocked?:boolean}){
 const initial=useRef<StoreFields>({name:store?.name??'',slug:store?.slug??'',address:store?.address??'',phone:store?.phone??''});
 const [values,setValues]=useState(initial.current),[automatic,setAutomatic]=useState(!store),[errors,setErrors]=useState<Partial<Record<keyof StoreFields,string>>>({});
 const id=useId(),creating=!store,normalized=storeInput(values),baseline=storeInput(initial.current),dirty=identity?JSON.stringify(normalized)!==JSON.stringify(baseline):normalized.address!==baseline.address||normalized.phone!==baseline.phone;
 const duplicate=serverError==='Store name already exists'?'name':serverError==='Store slug already exists'?'slug':null;
 const submit=(event:FormEvent)=>{event.preventDefault();if(busy||blocked||(!creating&&!dirty))return;const next=storeFieldErrors(values,identity);setErrors(next);if(Object.keys(next).length){document.getElementById(id+'-'+Object.keys(next)[0])?.focus();return;}void onSubmit(normalized);};
 const input=(key:keyof StoreFields,label:string,placeholder:string)=>{
  const message=errors[key]||(duplicate===key?(key==='name'?'This store name is already in use.':'This store URL is already in use.'):'');
  return <div><label htmlFor={id+'-'+key} className="block text-sm font-semibold">{label}</label><input id={id+'-'+key} className={field+' mt-1.5'} type={key==='phone'?'tel':'text'} placeholder={placeholder} required={key==='name'||key==='slug'} value={values[key]} readOnly={key==='slug'&&creating&&automatic} aria-describedby={message?id+'-'+key+'-error':key==='slug'?id+'-slug-help':undefined} aria-invalid={!!message||undefined} onChange={event=>{const value=event.target.value;setValues(current=>({...current,[key]:value,...(key==='name'&&creating&&automatic?{slug:suggestStoreSlug(value)}:{})}));setErrors(current=>({...current,[key]:undefined}));}}/>{message&&<p id={id+'-'+key+'-error'} role="alert" className="mt-1 text-xs text-[#962626]">{message}</p>}</div>;
 };
 return <form noValidate onSubmit={submit} className={dialog?'flex min-h-0 flex-col':'space-y-4'}>
  <div className={dialog?'min-h-0 space-y-5 overflow-y-auto p-5':'space-y-4'}>
   <fieldset disabled={busy} className="min-w-0 space-y-4">
    {identity&&<section className="space-y-4"><h3 className="text-sm font-semibold text-[#356B54]">Store information</h3>{input('name','Store name *','Enter store name')}
     <div>{input('slug','Store URL *','your-store-name')}{creating&&<div className="mt-1 flex flex-wrap items-center justify-between gap-2"><p id={id+'-slug-help'} className="text-xs text-[#6D7974]">{automatic?'Automatically generated from your store name.':'Use lowercase letters, numbers and hyphens.'}</p><button type="button" className="rounded px-1 py-1 text-xs font-semibold text-[#356B54] underline-offset-2 hover:underline focus-visible:outline-2" onClick={()=>{if(!automatic)setValues(current=>({...current,slug:suggestStoreSlug(current.name)}));setAutomatic(!automatic);}}>{automatic?'Customize':'Auto-generate'}</button></div>}
      {!creating&&<p id={id+'-slug-help'} className="mt-1 text-xs text-[#6D7974]">This identifies the store in its public storefront address.</p>}{!creating&&values.slug!==initial.current.slug&&<p role="note" className="mt-2 text-xs text-amber-900">Changing the store URL will change its public storefront address.</p>}
      <div className="mt-2 rounded-lg border border-[#E7E2D8] bg-[#F6F7F4] px-3 py-2 text-xs"><p className="text-[#6D7974]">Storefront URL preview</p><p className="mt-1 break-all text-[#356B54]">{normalized.slug&& !storeFieldErrors(values,true).slug?customerPath(normalized.slug):'Enter a valid store URL to see the preview.'}</p></div>
     </div></section>}
    <section className="space-y-4">{identity&&<h3 className="border-t border-[#E7E2D8] pt-4 text-sm font-semibold text-[#356B54]">Contact information</h3>}{input('address',creating?'Address (optional)':'Address','Enter store address')}{input('phone',creating?'Phone number (optional)':'Phone number','Enter phone number')}</section>
   </fieldset>
   {creating&&<p className="text-xs text-[#6D7974]">New stores are active by default.</p>}
   {serverError&&!duplicate&&<ErrorNotice message={serverError}/>}
  </div>
  <footer className={'flex shrink-0 flex-wrap justify-end gap-2 '+(dialog?'border-t border-[#E7E2D8] bg-[#FAFAF7] px-5 py-4':'border-t border-[#E7E2D8] pt-4')}><button type="button" className={secondary} disabled={busy} onClick={onCancel}>Cancel</button><button type="submit" className={primary} disabled={busy||blocked||(!creating&&!dirty)}>{busy?'Saving…':creating?'Create Store':'Save changes'}</button></footer>
 </form>;
}
