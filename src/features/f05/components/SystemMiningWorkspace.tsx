import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { authService } from '../../../services/authService';
import type { AuthUser } from '../../../services/authService';
import { F05ApiError } from '../f05.api';
import { f05SystemApi } from '../f05.system.api';
import { systemMiningReader } from '../f05.reader';
import { useMiningLocation } from '../f05.navigation';
import type { MiningView } from '../f05.navigation';
import { clearPendingSubmission, readPendingSubmission, sendSubmission } from '../f05.submission';
import { algorithmName, formatThreshold, miningButton, miningErrorMessage, miningPrimaryButton } from '../f05.display';
import type { ManualMiningRequest, MiningConfiguration, MiningConfigurationUpdate, RequestView, SnapshotView, StoreView } from '../f05.types';
import { MiningConfigurationView } from './MiningConfigurationView';
import { MiningStorePicker } from './MiningStorePicker';
import { SnapshotPicker } from './SnapshotPicker';
import { MiningHistoryView } from './MiningHistoryView';
import { SystemMiningDashboard } from './SystemMiningDashboard';
import { AlgorithmBenchmarkView } from './AlgorithmBenchmarkView';
import { MiningStatusBadge } from './MiningStatusBadge';

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
  const [configNotice,setConfigNotice]=useState('');
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
    setConfigResult(null);setConfigNotice('');
    void f05SystemApi.getConfiguration(c.signal).then(data=>{
      if(!c.signal.aborted && authService.getToken()===token)setConfigResult({token,data});
    }).catch(e=>{if(!c.signal.aborted)setConfigResult({token,error:miningErrorMessage(e)});});
    return ()=>c.abort();
  },[token,configRevision]);

  const saveConfiguration=async(payload:MiningConfigurationUpdate)=>{
    if(configBusy.current||busy.current||pinned.current)return;
    configBusy.current=true;setSaving(true);setConfigNotice('');
    try {
      const data=await f05SystemApi.updateConfiguration(payload);
      if(mounted.current){setConfigResult({token,data});setConfigNotice(`Configuration version ${data.version} saved. New mining requests will use these settings.`);}
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
  const tab=location.view==='snapshots'?'setup':location.view;
  const onCompare=()=>{if(!pending)setCompare(true);navigate('setup',storeId);};
  const onOpenBenchmark=(requestId:number,runId:number)=>navigate('benchmark',storeId,requestId,runId);
  const titles={dashboard:'Dashboard',configuration:'Algorithm Configuration',setup:'Run Mining',history:'Mining History',benchmark:'Algorithm Benchmark',snapshots:'Snapshots'};
  const descriptions={dashboard:'Monitor system-wide mining settings and mining activity across stores.',configuration:'Manage the default algorithm and minimum utility threshold for all stores.',setup:'Select a store and snapshot, review the settings, then start mining.',history:'Review mining requests, follow their progress and inspect results.',benchmark:'Compare algorithm performance using measured results from the same mining request.',snapshots:'Review frozen inputs.'};

  const storeSelector=<MiningStorePicker storeId={storeId} locked={submitting||Boolean(pending)} onSelect={chooseStore}/>;
  return <div className="mx-auto max-w-6xl space-y-5 text-[#191C1B]">
    <header><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{titles[tab]}</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#6D7974]">{descriptions[tab]}</p></header>
    {pending&&tab!=='setup'&&<div role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">A saved mining attempt needs attention. <button type="button" className="font-semibold underline" onClick={()=>navigate('setup',pending.storeId)}>Review saved submission</button></div>}
    {location.error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{location.error}</p>}
    {tab==='configuration'&&<MiningConfigurationView config={config} loading={!currentConfig} saving={saving} locked={submitting||Boolean(pending)} error={currentConfig?.error??''} notice={configNotice} onRefresh={()=>setConfigRevision(r=>r+1)} onSave={saveConfiguration}/>}
    {tab!=='configuration'&&tab!=='dashboard'&&storeSelector}
    {tab==='dashboard'&&<SystemMiningDashboard config={config} loading={!currentConfig} error={currentConfig?.error??''} reader={reader} storeSelector={storeSelector} onRefresh={()=>setConfigRevision(r=>r+1)} onConfigure={()=>navigate('configuration',storeId)} onRun={()=>navigate('setup',storeId)} onBenchmark={()=>navigate('benchmark',storeId)} onRequest={id=>navigate('history',storeId,id)}/>}
    {tab==='benchmark'&&(reader?<AlgorithmBenchmarkView key={reader.scopeKey} reader={reader} requestId={location.requestId} runId={location.runId} onRequest={id=>navigate('benchmark',storeId,id)} onRun={onOpenBenchmark} onCompare={onCompare}/>:<section className="rounded-xl border border-dashed border-[#E7E2D8] p-5 text-sm text-[#6D7974]">Choose a Store to inspect its benchmark results, or run a comparison first.<button type="button" className={miningButton+' mt-4 block'} onClick={onCompare}>Run a comparison</button></section>)}
    {tab==='history'&&(reader?<MiningHistoryView key={reader.scopeKey} reader={reader} requestId={location.requestId} selectionError="" onSelect={id=>navigate('history',storeId,id)} onOpenBenchmark={onOpenBenchmark}/>:<p className="rounded-xl border border-dashed border-[#E7E2D8] p-5 text-sm text-[#6D7974]">Choose a Store to review its mining requests and algorithm runs.</p>)}
    {/* Submission state stays in the workspace across route changes; no automatic retry. */}
    {tab==='setup'&&<div className="space-y-5">
      {reader&&<SnapshotPicker key={reader.scopeKey} reader={reader} canSubmit locked={locked} selected={selected} onSelect={setSelection} errorMessage={miningErrorMessage}/>}
      <section aria-labelledby="mining-manual-title" className="rounded-2xl border border-[#E7E2D8] bg-white p-5 sm:p-6">
        <h2 id="mining-manual-title" className="text-lg font-semibold">Run Mining</h2>
        <p className="mt-1 text-sm text-[#6D7974]">Review your selected snapshot and mining settings before starting.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div><h3 className="text-xs font-semibold uppercase tracking-wide text-[#6D7974]">Selected Snapshot</h3>
            {selected?<dl className="mt-3 space-y-2 text-sm"><div><dt className="inline text-[#6D7974]">Snapshot </dt><dd className="inline font-semibold">#{selected.snapshotId}</dd></div><div><dt className="text-xs text-[#6D7974]">Sales Period</dt><dd>{selected.rangeStart} to {selected.rangeEnd}</dd></div><div><dt className="text-xs text-[#6D7974]">Analysis Date</dt><dd>{selected.configuration?.analysisDate??selected.asOfDate}</dd></div></dl>:<p className="mt-3 text-sm text-[#6D7974]">Select a snapshot to continue.</p>}
          </div>
          <div className="border-t border-[#E7E2D8] pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0"><h3 className="text-xs font-semibold uppercase tracking-wide text-[#6D7974]">Current System Configuration</h3>
            {!config?<p className="mt-3 text-sm text-amber-900">Load a valid configuration before submitting. Open Algorithm Configuration to refresh it.</p>:config.version===0?<p className="mt-3 text-sm text-amber-900">Mining is not configured. Save a configuration before running mining.</p>:<dl className="mt-3 space-y-2 text-sm"><div><dt className="text-xs text-[#6D7974]">Default Algorithm</dt><dd className="font-semibold">{algorithmName(config.algorithm!)}</dd></div><div><dt className="text-xs text-[#6D7974]">Minimum Utility</dt><dd className="break-words font-semibold">{formatThreshold(config.minUtilValue!,config.minUtilMode!)}</dd></div><div className="text-xs text-[#6D7974]">Configuration Version {config.version} · Applies to all stores</div></dl>}
          </div>
        </div>
        <form onSubmit={submit} className="mt-5 border-t border-[#E7E2D8] pt-4">
          <h3 className="text-sm font-semibold">Execution Mode</h3>
          <label className="mt-3 flex items-start gap-3 text-sm"><input type="checkbox" aria-label="Compare HUI-Miner and EFIM" checked={compare} disabled={locked} onChange={e=>setCompare(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#356B54]"/><span><span className="font-medium">Compare HUI-Miner and EFIM</span><span className="mt-1 block text-xs leading-relaxed text-[#6D7974]">Run both algorithms on the same snapshot to compare their results and performance. The default algorithm stays unchanged.</span></span></label>
          {!compare&&<p className="mt-3 text-xs text-[#6D7974]">Comparison is off. This request will run the default algorithm.</p>}
          {storeId!==null&&confirmedStore?.storeId!==storeId&&!pending&&<p className="mt-3 text-sm text-amber-900">Select Store #{storeId} from the Store list to confirm the target for a new submission.</p>}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FAF8F5] p-4">
            <p className="text-xs text-[#6D7974]">You can review progress and results in Mining History.</p>
            <button type="submit" disabled={locked||saving||!config||config.version===0||!selected||confirmedStore?.storeId!==storeId} className={miningPrimaryButton}>{submitting?'Submitting...':'Run Mining'}</button>
          </div>
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
          <h3 className="font-semibold">Submission acknowledged</h3><p className="mt-2">Store #{receipt.storeId} · Request #{receipt.requestId} · <MiningStatusBadge friendly kind="request" status={receipt.status}/></p>
          <p className="mt-2">HTTP 202 acknowledges asynchronous work; it does not mean mining completed.</p>
          <button type="button" className={`${miningButton} mt-3`} onClick={()=>navigate('history',receipt.storeId,receipt.requestId)}>View request details</button>
        </div>}
        {(pending||receipt||storageError) && <button type="button" disabled={submitting} className={`${miningButton} mt-4`} onClick={clearAttempt}>{receipt?'Configure another request':'Discard saved attempt and start a different submission'}</button>}
        {pending && !receipt && <p className="mt-2 text-xs text-amber-900">Discarding a saved key does not cancel server work. Starting a different submission may create another request.</p>}
      </section>
    </div>}
  </div>;
}
