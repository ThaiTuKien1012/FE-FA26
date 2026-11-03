import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { algorithmName, miningButton, miningDate } from '../f05.display';
import { parseMinUtilInput } from '../f05.numbers';
import type { Algorithm, MiningConfiguration, MiningConfigurationUpdate, MinUtilMode } from '../f05.types';

interface Props {
  config: MiningConfiguration | null; loading: boolean; saving: boolean; locked: boolean;
  error: string; onRefresh: ()=>void; onSave:(payload:MiningConfigurationUpdate)=>Promise<void>;
  choice: {algorithm:Algorithm;revision:number}|null;
}
const input='mt-2 w-full rounded-xl border border-[#E7E2D8] bg-white px-3 py-2.5 disabled:bg-[#F4F1EC]';
export function MiningConfigurationView({config,loading,saving,locked,error,onRefresh,onSave,choice}:Props) {
  const [algorithm,setAlgorithm]=useState<Algorithm>('HUI_MINER');
  const [mode,setMode]=useState<MinUtilMode>('PERCENTAGE');
  const [value,setValue]=useState('');
  const [validation,setValidation]=useState('');
  const appliedChoice=useRef<Props['choice']>(null);
  useEffect(()=>{
    if (!config) return;
    // Apply a benchmark choice once, after the policy has loaded. Later saves
    // or explicit refreshes must use the newly returned policy instead.
    setAlgorithm(choice && choice!==appliedChoice.current ? choice.algorithm : config.algorithm??'HUI_MINER');
    appliedChoice.current=choice;
    setMode(config.minUtilMode??'PERCENTAGE');
    setValue(config.minUtilValue===null?'':String(config.minUtilValue)); setValidation('');
  },[config,choice]);
  const save=(event:FormEvent)=>{
    event.preventDefault();
    if (!config || saving || locked) return;
    try {
      const minUtilValue=parseMinUtilInput(value,mode);
      setValidation('');
      void onSave({algorithm,minUtilMode:mode,minUtilValue,expectedVersion:config.version});
    } catch(e) {setValidation(e instanceof Error?e.message:'Invalid minimum utility.');}
  };
  return <section aria-labelledby="mining-config-title" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="mining-config-title" className="text-xl font-semibold">Algorithm Configuration</h2>
        <p className="mt-2 max-w-3xl text-sm text-[#6D7974]">The active algorithm is used for new requests without Compare Algorithms. Comparison requests run both algorithms. Minimum utility applies across the system; existing requests keep their frozen settings.</p></div>
      <button type="button" className={miningButton} disabled={loading||saving} onClick={onRefresh}>Refresh configuration</button>
    </div>
    {loading ? <p role="status" className="mt-4 text-sm">Loading mining configuration...</p> :
      config && <div className="mt-4 rounded-xl bg-[#F3F8F4] p-4 text-sm">
        <p className="font-semibold">Configuration version {config.version}</p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2"><div><dt className="text-xs text-[#6D7974]">Changed by</dt><dd>{config.changedBy===null?'Not recorded':`User #${config.changedBy}`}</dd></div><div><dt className="text-xs text-[#6D7974]">Changed at</dt><dd>{miningDate(config.changedAt)}</dd></div></dl>
        {config.version===0 ? <p className="mt-2">Mining is not configured. Save a policy before submitting a request.</p> :
          <p className="mt-2">Active: {algorithmName(config.algorithm!)} · {config.minUtilMode} · {config.minUtilValue}{config.minUtilMode==='PERCENTAGE'?'%':' frozen utility units'}</p>}
      </div>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error} Refresh configuration and review the current version before another action.</p>}
    <form onSubmit={save} noValidate className="mt-5 space-y-4">
      <fieldset disabled={!config||loading||saving||locked} className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-semibold">Active algorithm<select aria-label="Active algorithm" value={algorithm} onChange={e=>setAlgorithm(e.target.value as Algorithm)} className={input}><option value="HUI_MINER">HUI-Miner</option><option value="EFIM">EFIM</option></select></label>
        <label className="text-sm font-semibold">Minimum utility mode<select aria-label="Minimum utility mode" value={mode} onChange={e=>setMode(e.target.value as MinUtilMode)} className={input}><option value="PERCENTAGE">PERCENTAGE</option><option value="ABSOLUTE">ABSOLUTE</option></select></label>
        <label className="text-sm font-semibold">Minimum utility<input aria-label="Minimum utility" inputMode="decimal" value={value} onChange={e=>{setValue(e.target.value);setValidation('');}} className={input} autoComplete="off"/></label>
      </fieldset>
      <p className="text-xs text-[#6D7974]">{mode==='PERCENTAGE'?'Percentage is in (0, 100]. A value of 0.5 means 0.5%.':'Absolute minimum utility uses frozen weighted utility units.'} Use a positive value with at most 6 decimal places. Threshold conversion is performed by the backend.</p>
      {choice && <p className="text-sm text-[#356B54]">Benchmark choice: {algorithmName(choice.algorithm)}. Review the form and save to change the global policy.</p>}
      {validation && <p role="alert" className="text-sm text-red-800">{validation}</p>}
      {locked && <p className="text-sm text-amber-900">Resolve the saved mining submission before changing configuration here.</p>}
      <button type="submit" disabled={!config||loading||saving||locked} className={miningButton}>{saving?'Saving configuration...':'Save mining configuration'}</button>
    </form>
  </section>;
}
