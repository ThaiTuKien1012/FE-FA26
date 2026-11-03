import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { authService } from '../../../services/authService';
import type { AuthUser } from '../../../services/authService';
import { F05ApiError } from '../f05.api';
import { f05SystemApi } from '../f05.system.api';
import { systemMiningReader } from '../f05.reader';
import { systemScreenUrl, useMiningLocation } from '../f05.navigation';
import type { MiningView } from '../f05.navigation';
import { clearPendingSubmission, readPendingSubmission, sendSubmission } from '../f05.submission';
import { miningButton, miningErrorMessage } from '../f05.display';
import type { Algorithm, ManualMiningRequest, MiningConfiguration, MiningConfigurationUpdate, RequestView, SnapshotView, StoreView } from '../f05.types';
import { MiningConfigurationView } from './MiningConfigurationView';
import { MiningStorePicker } from './MiningStorePicker';
import { SnapshotPicker } from './SnapshotPicker';
import { MiningHistoryView } from './MiningHistoryView';
import { SystemMiningDashboard } from './SystemMiningDashboard';
import { AlgorithmBenchmarkView } from './AlgorithmBenchmarkView';

interface Props { currentUser:AuthUser; initialView:MiningView; }
function restore(userId:string) {
  try {return {pending:readPendingSubmission(userId),error:''};}
  catch {return {pending:null,error:'The saved administrative attempt is unreadable. Clear it explicitly before starting another request; the server may already have accepted it.'};}
}
export function SystemMiningWorkspace({currentUser,initialView}:Props) {
  const {location,navigate}=useMiningLocation(true,initialView);
  const [restored]=useState(()=>restore(currentUser.id));
  const [pending,setPending]=useState<ManualMiningRequest|null>(restored.pending);
  const [storageError,setStorageError]=useState(restored.error);
  const [submitting,setSubmitting]=useState(false);
  const [submitError,setSubmitError]=useState('');
  const [receipt,setReceipt]=useState<RequestView|null>(null);
  const [compare,setCompare]=useState(restored.pending?.compareAlgorithms??false);
  const [selection,setSelection]=useState<SnapshotView|null>(null);
  const [confirmedStore,setConfirmedStore]=useState<StoreView|null>(null);
  const storeId=location.storeId??pending?.storeId??null;
  const reader=useMemo(()=>storeId===null?null:systemMiningReader(storeId),[storeId]);
  const selected=selection?.storeId===storeId?selection:null;
  const [configResult,setConfigResult]=useState<{token:string|null;data?:MiningConfiguration;error?:string}|null>(null);
  const [configRevision,setConfigRevision]=useState(0);
  const [saving,setSaving]=useState(false);
  const [choice,setChoice]=useState<{algorithm:Algorithm;revision:number}|null>(null);
  const token=authService.getToken();
  const currentConfig=configResult?.token===token?configResult:null;
  const config=currentConfig?.data??null;
  const busy=useRef(false); const configBusy=useRef(false); const mounted=useRef(true);
  const pinned=useRef<ManualMiningRequest|null>(pending);
  const accepted=useRef<RequestView|null>(null);
  const locked=submitting||Boolean(pending)||Boolean(receipt)||Boolean(storageError);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{
    const c=new AbortController();
    setConfigResult(null);
    void f05SystemApi.getConfiguration(c.signal).then(data=>{
      if(!c.signal.aborted && authService.getToken()===token)setConfigResult({token,data});
    }).catch(e=>{if(!c.signal.aborted)setConfigResult({token,error:miningErrorMessage(e)});});
    return ()=>c.abort();
  },[token,configRevision]);

  const saveConfiguration=async(payload:MiningConfigurationUpdate)=>{
    if(configBusy.current||busy.current||pinned.current)return;
    configBusy.current=true;setSaving(true);
    try {
      const data=await f05SystemApi.updateConfiguration(payload);
      if(mounted.current)setConfigResult({token,data});
    } catch(e) {
      // An uncertain PUT or 409 requires a fresh GET before any further write.
      if(mounted.current)setConfigResult({token,error:miningErrorMessage(e)});
    } finally {configBusy.current=false;if(mounted.current)setSaving(false);}
  };
  const transmit=async(payload:ManualMiningRequest)=>{
    if(busy.current||configBusy.current||accepted.current||!config||config.version===0)return;
    busy.current=true;setSubmitting(true);setSubmitError('');
    try {
      const response=await sendSubmission(currentUser.id,payload);
      if(!mounted.current)return;
      accepted.current=response;setReceipt(response);
      try {clearPendingSubmission(currentUser.id);setPending(null);pinned.current=null;}
      catch {setStorageError('The request was acknowledged, but its saved attempt could not be cleared. Clear it before starting another request.');}
      if(window.location.pathname==='/admin/mining/run')navigate('history',response.storeId,response.requestId);
    } catch(e) {if(mounted.current)setSubmitError(miningErrorMessage(e));}
    finally {busy.current=false;if(mounted.current)setSubmitting(false);}
  };
  const submit=(event:FormEvent)=>{
    event.preventDefault();
    if(locked||busy.current||configBusy.current||pinned.current||accepted.current||saving)return;
    if(!config||config.version===0){setSubmitError('Save a mining configuration before submitting.');return;}
    if(!selected||selected.status!=='READY'||confirmedStore?.storeId!==storeId){setSubmitError('Choose a Store and select one of its READY snapshots.');return;}
    if(!globalThis.crypto?.randomUUID){setSubmitError('Secure UUID generation requires HTTPS or localhost.');return;}
    const payload:ManualMiningRequest={storeId:selected.storeId,snapshotId:selected.snapshotId,requestKey:crypto.randomUUID(),compareAlgorithms:compare};
    pinned.current=payload;setPending(payload);void transmit(payload);
  };
  const clearAttempt=()=>{
    if(busy.current)return;
    try {clearPendingSubmission(currentUser.id);}
    catch(e){setStorageError(miningErrorMessage(e));return;}
    pinned.current=null;accepted.current=null;setPending(null);setReceipt(null);setStorageError('');setSubmitError('');
  };
  const chooseStore=(store:StoreView)=>{
    if(busy.current||pending)return;
    setSelection(null);setReceipt(null);accepted.current=null;setSubmitError('');setConfirmedStore(store);
    navigate(location.view==='configuration'?'setup':location.view,store.storeId);
  };
  const onChooseAlgorithm=useCallback((algorithm:Algorithm)=>{
    setChoice(previous=>({algorithm,revision:(previous?.revision??0)+1}));
    const query=new URLSearchParams(window.location.search);query.set('algorithm',algorithm);query.delete('requestId');query.delete('runId');
    window.history.pushState({screen:'setup'},'',systemScreenUrl('setup',query.toString()));
    window.dispatchEvent(new Event('popstate'));
  },[]);
  const tab=location.view==='snapshots'?'setup':location.view;
  const onCompare=()=>{if(!pending)setCompare(true);navigate('setup',storeId);};
  const onOpenBenchmark=(requestId:number,runId:number)=>navigate('benchmark',storeId,requestId,runId);
  const titles={dashboard:'Dashboard',configuration:'Algorithm Configuration',setup:'Run Mining',history:'Mining History',benchmark:'Algorithm Benchmark',snapshots:'Snapshots'};
  const descriptions={dashboard:'Review the active policy and recent mining activity for a selected Store.',configuration:'Manage the global algorithm and minimum utility policy.',setup:'Run mining on a frozen snapshot using the active global policy.',history:'Inspect requests, algorithm runs and their progress.',benchmark:'Evaluate measured runtime and memory before choosing an active algorithm.',snapshots:'Review frozen inputs.'};

  return <div className="mx-auto max-w-6xl space-y-6 text-[#191C1B]">
    <header><h1 className="text-3xl font-semibold">{titles[tab]}</h1><p className="mt-2 text-[#6D7974]">{descriptions[tab]}</p></header>
    {pending&&tab!=='setup'&&<div role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">A saved mining attempt needs attention. <button type="button" className="font-semibold underline" onClick={()=>navigate('setup',pending.storeId)}>Review saved submission</button></div>}
    {location.error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{location.error}</p>}
    {tab==='configuration'&&<div>
      <MiningConfigurationView config={config} loading={!currentConfig} saving={saving} locked={submitting||Boolean(pending)} error={currentConfig?.error??''} choice={choice}
        onRefresh={()=>setConfigRevision(r=>r+1)} onSave={saveConfiguration}/>
    </div>}
    {tab!=='configuration' && <MiningStorePicker storeId={storeId} locked={submitting||Boolean(pending)} onSelect={chooseStore}/>}
    {tab==='dashboard'&&<SystemMiningDashboard config={config} loading={!currentConfig} error={currentConfig?.error??''} reader={reader} onRefresh={()=>setConfigRevision(r=>r+1)} onConfigure={()=>navigate('configuration',storeId)} onRun={()=>navigate('setup',storeId)} onRequest={id=>navigate('history',storeId,id)}/>}
    {tab==='benchmark'&&(reader?<AlgorithmBenchmarkView key={reader.scopeKey} reader={reader} requestId={location.requestId} runId={location.runId} onRequest={id=>navigate('benchmark',storeId,id)} onRun={onOpenBenchmark} onCompare={onCompare} onChooseAlgorithm={onChooseAlgorithm}/>:<section className="rounded-xl border border-dashed border-[#E7E2D8] p-6 text-sm text-[#6D7974]">Choose a Store to inspect its benchmark results, or run a comparison first.<button type="button" className={miningButton+' mt-4 block'} onClick={onCompare}>Run a comparison</button></section>)}
    {tab==='history' && (reader ? <MiningHistoryView key={reader.scopeKey} reader={reader} requestId={location.requestId} selectionError="" onSelect={id=>navigate('history',storeId,id)} onOpenBenchmark={onOpenBenchmark}/> :
      <p className="rounded-xl border border-dashed border-[#E7E2D8] p-6 text-sm text-[#6D7974]">Choose a Store to review its mining requests and algorithm runs.</p>)}

    {/* Submission state stays in the workspace across route changes; no automatic retry. */}
    {tab==='setup'&&<div className="space-y-5">
      {reader && <SnapshotPicker key={reader.scopeKey} reader={reader} canSubmit locked={locked} selected={selected} onSelect={setSelection} errorMessage={miningErrorMessage}/>}
      <section aria-labelledby="mining-manual-title" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-sm sm:p-6">
        <h2 id="mining-manual-title" className="text-xl font-semibold">Mining request</h2>
        <p className="mt-2 text-sm text-[#6D7974]">New requests use the active global policy. Compare Algorithms runs both algorithms against the same frozen snapshot.</p>
        {!config ? <p className="mt-3 text-sm text-amber-900">Load a valid configuration before submitting. Open Algorithm Configuration to refresh it.</p> :
          config.version===0 ? <p className="mt-3 text-sm text-amber-900">Mining is not configured. Open Mining Configuration and save a policy.</p> :
          <p className="mt-3 text-sm">Current policy version {config.version}: {config.algorithm}, {config.minUtilValue}{config.minUtilMode==='PERCENTAGE'?'%':' frozen utility units'}.</p>}
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" aria-label="Compare both algorithms" checked={compare} disabled={locked} onChange={e=>setCompare(e.target.checked)}/>Compare both algorithms (HUI-Miner and EFIM)</label>
          <p className="text-xs text-[#6D7974]">{compare?'Run both algorithms against the same frozen input.':'Run only the active algorithm.'}</p>
          {storeId!==null && confirmedStore?.storeId!==storeId && !pending && <p className="text-sm text-amber-900">Select Store #{storeId} from the Store list to confirm the target for a new submission.</p>}
          <button type="submit" disabled={locked||saving||!config||config.version===0||!selected||confirmedStore?.storeId!==storeId} className={miningButton}>{submitting?'Submitting...':'Run Mining'}</button>
        </form>
        {storageError && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{storageError}</p>}
        {submitError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{submitError}</p>}
        {pending && !receipt && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <h3 className="font-semibold">Saved submission · Store #{pending.storeId} · Snapshot #{pending.snapshotId}</h3>
          <p className="mt-2 break-all font-mono">{pending.requestKey}</p>
          <p className="mt-2">The outcome may be unknown. Retry sends the same key and payload; there are no automatic retries. The server preserves the policy of an already accepted request.</p>
          {storeId!==pending.storeId && <button type="button" className={`${miningButton} mt-3 mr-2`} onClick={()=>navigate('setup',pending.storeId)}>Return to saved Store #{pending.storeId}</button>}
          <button type="button" disabled={submitting||!config||config.version===0||storeId!==pending.storeId} className={`${miningButton} mt-3`} onClick={()=>{const saved=pinned.current;if(saved)void transmit(saved);}}>Retry same submission</button>
        </div>}
        {receipt && <div role="status" className="mt-5 rounded-xl bg-[#EDF5F0] p-4 text-sm">
          <h3 className="font-semibold">Submission acknowledged</h3><p className="mt-2">Store #{receipt.storeId} · Request #{receipt.requestId} · {receipt.status}</p>
          <p className="mt-2">HTTP 202 acknowledges asynchronous work; it does not mean mining completed.</p>
          <button type="button" className={`${miningButton} mt-3`} onClick={()=>navigate('history',receipt.storeId,receipt.requestId)}>View request details</button>
        </div>}
        {(pending||receipt||storageError) && <button type="button" disabled={submitting} className={`${miningButton} mt-4`} onClick={clearAttempt}>{receipt?'Configure another request':'Discard saved attempt and start a different submission'}</button>}
        {pending && !receipt && <p className="mt-2 text-xs text-amber-900">Discarding a saved key does not cancel server work. Starting a different submission may create another request.</p>}
      </section>
    </div>}
  </div>;
}
