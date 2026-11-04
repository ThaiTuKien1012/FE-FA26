import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { algorithmName, formatMiningNumber, formatThreshold, miningButton, miningDate, miningInput, miningPrimaryButton, thresholdLabel } from '../f05.display';
import { parseMinUtilInput } from '../f05.numbers';
import type { Algorithm, MiningConfiguration, MiningConfigurationUpdate, MinUtilMode } from '../f05.types';

interface Props {
  config: MiningConfiguration | null; loading: boolean; saving: boolean; locked: boolean;
  error: string; notice?: string; onRefresh: ()=>void; onSave:(payload:MiningConfigurationUpdate)=>Promise<void>;
}
export function MiningConfigurationView({config,loading,saving,locked,error,notice='',onRefresh,onSave}:Props) {
  const [algorithm,setAlgorithm]=useState<Algorithm>('HUI_MINER');
  const [mode,setMode]=useState<MinUtilMode>('PERCENTAGE');
  const [value,setValue]=useState('');
  const [validation,setValidation]=useState('');
  const reset=()=>{
    if(!config)return;
    setAlgorithm(config.algorithm??'HUI_MINER');setMode(config.minUtilMode??'PERCENTAGE');
    setValue(config.minUtilValue===null?'':String(config.minUtilValue));setValidation('');
  };
  useEffect(()=>{reset();},[config]);
  let parsed:number|null=null;
  try {parsed=parseMinUtilInput(value,mode);} catch { /* Validate the original string on submit. */ }
  const changed=Boolean(config && (config.version===0 || algorithm!==config.algorithm || mode!==config.minUtilMode || parsed!==config.minUtilValue));
  const disabled=!config||loading||saving||locked;
  const save=(event:FormEvent)=>{
    event.preventDefault();
    if(disabled||!changed)return;
    try {
      const minUtilValue=parseMinUtilInput(value,mode);setValidation('');
      void onSave({algorithm,minUtilMode:mode,minUtilValue,expectedVersion:config.version});
    } catch(e){setValidation(e instanceof Error?e.message:'Invalid minimum utility.');}
  };
  return <div className="space-y-5">
    <section aria-labelledby="mining-current-config" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 id="mining-current-config" className="text-lg font-semibold">Current System Configuration</h2><p className="mt-1 text-sm text-[#6D7974]">These settings apply to new mining requests across all stores.</p></div>
        <button type="button" className={miningButton} disabled={loading||saving} onClick={onRefresh}>Refresh configuration</button>
      </div>
      {loading?<p role="status" className="mt-5 text-sm text-[#6D7974]">Loading configuration...</p>:config&&<>
        {config.version===0?<p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Mining is not configured. Save a configuration before running mining.</p>:
          <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-3">
            <div><dt className="text-xs text-[#6D7974]">Default Algorithm</dt><dd className="mt-1 font-semibold">{algorithmName(config.algorithm!)}</dd></div>
            <div><dt className="text-xs text-[#6D7974]">Threshold Type</dt><dd className="mt-1 font-semibold">{thresholdLabel(config.minUtilMode!)}</dd></div>
            <div><dt className="text-xs text-[#6D7974]">Minimum Utility</dt><dd className="mt-1 break-words font-semibold">{formatThreshold(config.minUtilValue!,config.minUtilMode!)}</dd></div>
          </dl>}
        <dl className="mt-5 grid gap-4 border-t border-[#E7E2D8] pt-4 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-[#6D7974]">Configuration Version</dt><dd className="mt-1 font-medium">{formatMiningNumber(config.version)}</dd></div>
          <div><dt className="text-xs text-[#6D7974]">Last updated</dt><dd className="mt-1">{miningDate(config.changedAt)}</dd></div>
          <div><dt className="text-xs text-[#6D7974]">Updated by</dt><dd className="mt-1">{config.changedBy===null?'Not recorded':`Administrator #${config.changedBy}`}</dd></div>
        </dl><p className="mt-3 text-xs text-[#6D7974]">The version number increases each time a new configuration is saved.</p>
      </>}
      {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error} Refresh configuration and review the current version before another action.</p>}
      {notice&&<p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
    </section>
    <section aria-labelledby="mining-update-config" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 sm:p-6">
      <h2 id="mining-update-config" className="text-lg font-semibold">Update Configuration</h2>
      <p className="mt-1 text-sm text-[#6D7974]">Changes affect future mining requests only. Existing requests and results remain unchanged.</p>
      <form onSubmit={save} noValidate className="mt-5 space-y-4">
        <fieldset disabled={disabled} className="grid items-start gap-5 lg:grid-cols-3">
          <label className="text-sm font-medium">Default Algorithm<select aria-label="Default Algorithm" value={algorithm} onChange={e=>setAlgorithm(e.target.value as Algorithm)} className={miningInput}><option value="HUI_MINER">HUI-Miner</option><option value="EFIM">EFIM</option></select><span className="mt-2 block text-xs font-normal leading-relaxed text-[#6D7974]">Choose the algorithm used for new mining requests when comparison is off.</span></label>
          <label className="text-sm font-medium">Threshold Type<select aria-label="Threshold Type" value={mode} onChange={e=>setMode(e.target.value as MinUtilMode)} className={miningInput}><option value="PERCENTAGE">Percentage</option><option value="ABSOLUTE">Absolute Value</option></select><span className="mt-2 block text-xs font-normal leading-relaxed text-[#6D7974]">Choose how the minimum utility threshold is calculated.</span></label>
          <label className="text-sm font-medium">Minimum Utility Threshold<input aria-label="Minimum Utility Threshold" inputMode="decimal" value={value} onChange={e=>{setValue(e.target.value);setValidation('');}} className={miningInput} autoComplete="off"/><span className="mt-2 block text-xs font-normal leading-relaxed text-[#6D7974]">{mode==='PERCENTAGE'?'Enter a value greater than 0 and up to 100. For example, 5 means 5%.':'Enter a positive value in frozen weighted utility units, using the snapshot’s scoring settings.'} Use at most 6 decimal places.</span></label>
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
