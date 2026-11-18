import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { algorithmName, formatMiningNumber, formatThreshold, miningButton, miningDate, miningInput, miningPrimaryButton, thresholdLabel } from '../f05.display';
import { parseMinUtilInput } from '../f05.numbers';
import type { MiningConfiguration, MiningConfigurationUpdate, MinUtilMode } from '../f05.types';

interface Props {
  config: MiningConfiguration | null; loading: boolean; saving: boolean; locked: boolean;
  error: string; notice?: string; onRefresh: ()=>void; onSave:(payload:MiningConfigurationUpdate)=>Promise<void>;
}
export function MiningConfigurationView({config,loading,saving,locked,error,notice='',onRefresh,onSave}:Props) {
  const [mode,setMode]=useState<MinUtilMode>('PERCENTAGE');
  const [value,setValue]=useState('');
  const [validation,setValidation]=useState('');
  const [toast,setToast]=useState<{message:string;error:boolean}|null>(null);
  useEffect(()=>{
    const message=error||notice;
    setToast(message?{message,error:Boolean(error)}:null);
    if(!message||error)return;
    const timer=setTimeout(()=>setToast(null),6000);
    return()=>clearTimeout(timer);
  },[notice,error]);
  const reset=()=>{
    if(!config)return;
    setMode(config.minUtilMode??'PERCENTAGE');
    setValue(config.minUtilValue===null?'':String(config.minUtilValue));setValidation('');
  };
  useEffect(()=>{reset();},[config]);
  let parsed:number|null=null;
  try {parsed=parseMinUtilInput(value,mode);} catch { /* Validate the original string on submit. */ }
  const changed=Boolean(config && (config.version===0 || mode!==config.minUtilMode || parsed!==config.minUtilValue));
  const disabled=!config||loading||saving||locked;
  const save=(event:FormEvent)=>{
    event.preventDefault();
    if(disabled||!changed)return;
    try {
      const minUtilValue=parseMinUtilInput(value,mode);setValidation('');
      void onSave({minUtilMode:mode,minUtilValue,expectedVersion:config.version});
    } catch(e){setValidation(e instanceof Error?e.message:'Invalid minimum utility.');}
  };
  return <div className="space-y-5">
    {toast&&<div role={toast.error?'alert':'status'} aria-live={toast.error?'assertive':'polite'} className={`fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-md items-start gap-3 rounded-xl border p-4 text-sm shadow-sm ${toast.error?'border-red-200 bg-red-50 text-red-800':'border-[#CADACF] bg-[#EDF5F0] text-[#1E3A2F]'}`}><p className="min-w-0 flex-1 break-words">{toast.message}</p><button type="button" aria-label="Dismiss mining notification" className="shrink-0 rounded-md px-2 py-1 underline focus-visible:outline-2" onClick={()=>setToast(null)}>Dismiss</button></div>}
    <section aria-labelledby="mining-current-config" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 id="mining-current-config" className="text-lg font-semibold">Current System Configuration</h2><p className="mt-1 text-sm text-[#6D7974]">These settings apply to new mining requests across all stores.</p></div>
        <button type="button" className={miningButton} disabled={loading||saving} onClick={onRefresh}>Refresh configuration</button>
      </div>
      {loading?<p role="status" className="mt-5 text-sm text-[#6D7974]">Loading configuration...</p>:config&&<>
        {config.version===0?<p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Mining is not configured. Save a configuration before running mining.</p>:
          <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-3">
            <div><dt className="text-xs text-[#6D7974]">Algorithm</dt><dd className="mt-1 font-semibold">{algorithmName(config.algorithm!)}</dd></div>
            <div><dt className="text-xs text-[#6D7974]">Threshold Type</dt><dd className="mt-1 font-semibold">{thresholdLabel(config.minUtilMode!)}</dd></div>
            <div><dt className="text-xs text-[#6D7974]">Minimum Utility</dt><dd className="mt-1 break-words font-semibold">{formatThreshold(config.minUtilValue!,config.minUtilMode!)}</dd></div>
          </dl>}
        <dl className="mt-5 grid gap-4 border-t border-[#E7E2D8] pt-4 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-[#6D7974]">Configuration Version</dt><dd className="mt-1 font-medium">{formatMiningNumber(config.version)}</dd></div>
          <div><dt className="text-xs text-[#6D7974]">Last updated</dt><dd className="mt-1">{miningDate(config.changedAt)}</dd></div>
          <div><dt className="text-xs text-[#6D7974]">Updated by</dt><dd className="mt-1">{config.changedBy===null?'Not recorded':`Administrator #${config.changedBy}`}</dd></div>
        </dl><p className="mt-3 text-xs text-[#6D7974]">The version number increases each time a new configuration is saved.</p>
      </>}
      {error&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error} Refresh configuration and review the current version before another action.</p>}
    </section>
    <section aria-labelledby="mining-update-config" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 sm:p-6">
      <h2 id="mining-update-config" className="text-lg font-semibold">Update Configuration</h2>
      <p className="mt-1 text-sm text-[#6D7974]">Changes affect future mining requests only. Existing requests and results remain unchanged.</p>
      <form onSubmit={save} noValidate className="mt-5 space-y-4">
        <fieldset disabled={disabled} className="grid items-start gap-5 lg:grid-cols-3">
<div className="text-sm"><p className="font-medium">Algorithm</p><p className="mt-3 font-semibold">EFIM – Fixed</p><p className="mt-2 text-xs text-[#6D7974]">New requests use EFIM.</p></div>
          <label className="text-sm font-medium">Threshold Type<select aria-label="Threshold Type" value={mode} onChange={e=>setMode(e.target.value as MinUtilMode)} className={miningInput}><option value="PERCENTAGE">Percentage</option><option value="ABSOLUTE">Absolute Value</option></select><span className="mt-2 block text-xs font-normal leading-relaxed text-[#6D7974]">Minimum Utility determines which product combinations are significant enough to appear in mining results.</span></label>
          <label className="text-sm font-medium">Minimum Utility<input aria-label="Minimum Utility Threshold" inputMode="decimal" value={value} onChange={e=>{setValue(e.target.value);setValidation('');}} className={miningInput} autoComplete="off"/><span className="mt-2 block text-xs font-normal leading-relaxed text-[#6D7974]">{mode==='PERCENTAGE'?'Enter a value greater than 0 and up to 100. For example, 0.5 means 0.5%; 5 means 5%.':'Enter a positive value in frozen weighted utility units, using the snapshot’s scoring settings.'} Use at most 6 decimal places.</span></label>
        </fieldset>
        {validation&&<p role="alert" className="text-sm text-red-800">{validation}</p>}
        {locked&&<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Resolve the saved mining submission before changing configuration here.</p>}
        <div className="flex flex-wrap items-center gap-3 border-t border-[#E7E2D8] pt-4">
          <button type="submit" disabled={disabled||!changed} className={miningPrimaryButton}>{saving?'Saving...':'Save Configuration'}</button>
          <button type="button" disabled={disabled||!changed} className={miningButton} onClick={reset}>Reset Changes</button>
          {config&&!changed&&!saving&&<p className="text-xs text-[#6D7974]">No changes to save.</p>}
        </div>
      </form>
    </section>
  </div>;
}
