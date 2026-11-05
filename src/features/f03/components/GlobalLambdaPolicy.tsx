import React, { useEffect, useRef, useState } from 'react';
import { f03Api, type F03Policy } from '../f03.api';
import { Button, field as input } from './F03Shared';
function Layout({title, subtitle, children}: {title:string; subtitle:string; children:React.ReactNode}) {return <div className="mx-auto max-w-6xl space-y-6 text-[#191c1b]"><header><h1 className="text-3xl font-semibold">{title}</h1><p className="mt-1 text-[#6d7974]">{subtitle}</p></header>{children}</div>;}
export function GlobalLambdaPolicy() {
  const [savingPolicy,setSavingPolicy]=useState(false); const policyBusy=useRef(false);
  const [policy,setPolicy]=useState<F03Policy|null>(null);
  const [policyForm,setPolicyForm]=useState({lambdaMin:'0',lambdaMax:'0.5'});
  const [error,setError]=useState(''); const [notice,setNotice]=useState(''); const [loading,setLoading]=useState(true);
  const load=async()=>{setLoading(true);setError('');try{const value=await f03Api.getPolicy();setPolicy(value);setPolicyForm({lambdaMin:String(value.lambdaMin),lambdaMax:String(value.lambdaMax)});}catch(e){setError(e instanceof Error?e.message:'Unable to load policy.');}finally{setLoading(false);}};
  useEffect(()=>{void load();},[]);
  const save=async(fn:()=>Promise<unknown>,message:string)=>{setError('');setNotice('');try{await fn();setNotice(message);await load();}catch(e){setError(e instanceof Error?e.message:'Could not save changes.');}};
  if(loading)return <p role="status">Loading Lambda Policy...</p>;

    const savePolicy=async()=>{
      if(policyBusy.current||!policy)return;
      const lambdaMin=Number(policyForm.lambdaMin),lambdaMax=Number(policyForm.lambdaMax);
      if(!policyForm.lambdaMin.trim()||!policyForm.lambdaMax.trim()||!Number.isFinite(lambdaMin)||!Number.isFinite(lambdaMax)||lambdaMin<0||lambdaMax<lambdaMin){setError('Enter a nonnegative minimum and a maximum that is at least the minimum.');return;}
      policyBusy.current=true;setSavingPolicy(true);
      try{await save(()=>f03Api.updatePolicy({lambdaMin,lambdaMax}),'Lambda policy updated. Existing snapshots remain unchanged.');}
      finally{policyBusy.current=false;setSavingPolicy(false);}
    };
    return <Layout title="Global Lambda Policy" subtitle="Control the allowed range of product priority adjustments across all stores.">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-3xl text-sm leading-relaxed text-[#6D7974]">Lambda controls how strongly inventory, expiry, and seasonal priorities affect product utility.</p><Button aria-label="Refresh Lambda Policy" disabled={savingPolicy} onClick={()=>void load()} className="border border-[#E7E2D8] bg-white text-sm text-[#1E3A2F]">Refresh</Button></div>
      {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice&&<p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p>}
      {!policy?<p className="rounded-xl border border-[#E7E2D8] bg-white p-5 text-sm text-[#6D7974]">The current policy is unavailable. Refresh before making changes.</p>:<>
        <section aria-labelledby="lambda-current-title" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 sm:p-6">
          <h2 id="lambda-current-title" className="text-lg font-semibold">Current Lambda Range</h2>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4"><p className="text-3xl font-semibold tabular-nums">{policy.lambdaMin.toLocaleString('en-GB',{maximumFractionDigits:6})} <span className="text-[#89938F]">–</span> {policy.lambdaMax.toLocaleString('en-GB',{maximumFractionDigits:6})}</p><div className="text-sm"><p className="font-medium">Policy Version {policy.version}</p><p className="mt-1 text-xs text-[#6D7974]">Tracks updates to the global lambda policy.</p></div></div>
          <p className="mt-4 text-xs text-[#6D7974]">Applies to all stores. Each Store’s Merchandiser chooses a Lambda within this range in F03. This policy is separate from the mining minimum utility threshold.</p>
        </section>
        <section aria-labelledby="lambda-update-title" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 sm:p-6">
          <h2 id="lambda-update-title" className="text-lg font-semibold">Update Allowed Range</h2>
          <form onSubmit={event=>{event.preventDefault();void savePolicy();}} className="mt-5 space-y-5">
            <fieldset disabled={savingPolicy} className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium">Minimum Lambda<input aria-label="Minimum Lambda" className={input} required min="0" type="number" step="0.000001" value={policyForm.lambdaMin} onChange={e=>setPolicyForm({...policyForm,lambdaMin:e.target.value})}/><span className="mt-2 block text-xs font-normal text-[#6D7974]">The lowest lambda value a store can choose.</span></label>
              <label className="text-sm font-medium">Maximum Lambda<input aria-label="Maximum Lambda" className={input} required min="0" type="number" step="0.000001" value={policyForm.lambdaMax} onChange={e=>setPolicyForm({...policyForm,lambdaMax:e.target.value})}/><span className="mt-2 block text-xs font-normal text-[#6D7974]">The highest lambda value a store can choose.</span></label>
            </fieldset>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900"><h3 className="font-semibold">Before saving</h3><p className="mt-2">Changing this range may make a Store’s selected Lambda invalid. The backend does not adjust Store settings automatically or recalculate existing snapshots. A Merchandiser may need to update the Store’s F03 configuration and create a new snapshot.</p></div>
            <Button type="submit" disabled={savingPolicy} className="bg-[#1E3A2F] text-sm text-white hover:bg-[#2D604A]">{savingPolicy?'Saving...':'Save Policy'}</Button>
          </form>
        </section>
      </>}
    </Layout>;
}
