import { useEffect, useMemo, useRef, useState } from 'react';
import { authService, type AuthUser } from '../../../services/authService';
import { f05SystemApi } from '../f05.system.api';
import { systemMiningReader } from '../f05.reader';
import { useMiningLocation, type MiningView } from '../f05.navigation';
import { miningErrorMessage } from '../f05.display';
import { F05ApiError } from '../f05.api';
import type { MiningConfiguration, MiningConfigurationUpdate, StoreView } from '../f05.types';
import { MiningConfigurationView } from './MiningConfigurationView';
import { MiningStorePicker } from './MiningStorePicker';
import { SystemMiningHistory } from './SystemMiningHistory';
import { SystemMiningDashboard } from './SystemMiningDashboard';

export function SystemMiningWorkspace({initialView}:{currentUser:AuthUser;initialView:MiningView}) {
  const {location,navigate}=useMiningLocation(true,initialView);
  const storeId=location.storeId;
  const reader=useMemo(()=>storeId===null?null:systemMiningReader(storeId),[storeId]);
  const [configResult,setConfigResult]=useState<{token:string|null;data?:MiningConfiguration;error?:string}|null>(null);
  const [configRevision,setConfigRevision]=useState(0),[saving,setSaving]=useState(false),[notice,setNotice]=useState('');
  const token=authService.getSessionId()||authService.getToken(),busy=useRef(false),mounted=useRef(true);
  const currentConfig=configResult?.token===token?configResult:null,config=currentConfig?.data??null;
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{const c=new AbortController();setConfigResult(null);setNotice('');
    f05SystemApi.getConfiguration(c.signal).then(data=>{if(!c.signal.aborted&&(authService.getSessionId()||authService.getToken())===token)setConfigResult({token,data});}).catch(e=>{if(!c.signal.aborted)setConfigResult({token,error:miningErrorMessage(e)});});return()=>c.abort();
  },[token,configRevision]);
  const save=async(payload:MiningConfigurationUpdate)=>{if(busy.current)return;busy.current=true;setSaving(true);setNotice('');
    try{const data=await f05SystemApi.updateConfiguration(payload);if(mounted.current&&(authService.getSessionId()||authService.getToken())===token){setConfigResult({token,data});setNotice('Settings saved. New analyses will use configuration version '+data.version+'.');}}
    catch(e){if(mounted.current)setConfigResult({token,error:e instanceof F05ApiError&&e.status===409?'Configuration Changed. Refresh and review the latest settings before saving again. (HTTP 409)':miningErrorMessage(e)});}finally{busy.current=false;if(mounted.current)setSaving(false);}
  };
  const tab=location.view==='configuration'?'configuration':location.view==='history'?'history':'dashboard';
  const titles={dashboard:'Mining Overview',configuration:'Mining Settings',history:'Mining History'};
  const descriptions={dashboard:'Monitor mining configuration and activity across stores.',configuration:'Set the minimum utility required for future product combination analyses across all stores.',history:'Track sales analyses and review processing results across stores.'};
  const chooseStore=(store:StoreView)=>navigate(tab,store.storeId);
  const storeSelector=<MiningStorePicker context={tab==='dashboard'?'overview':'history'} storeId={storeId} locked={false} onSelect={chooseStore}/>;
  return <div className={tab==='history'?'w-full min-w-0 space-y-6 text-[#191C1B]':'mx-auto max-w-6xl space-y-5 text-[#191C1B]'}>
    <header><h1 className={tab==='history'?'text-2xl sm:text-3xl font-semibold tracking-tight text-[#191C1B]':'text-2xl font-semibold tracking-tight sm:text-3xl'}>{titles[tab]}</h1><p className={tab==='history'?'mt-1 text-sm sm:text-base leading-6 text-[#6D7974]':'mt-2 text-sm leading-relaxed text-[#6D7974]'}>{descriptions[tab]}</p></header>
    {location.error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{location.error}</p>}
    {tab==='configuration'&&<MiningConfigurationView config={config} loading={!currentConfig} saving={saving} locked={false} error={currentConfig?.error??''} notice={notice} onRefresh={()=>setConfigRevision(x=>x+1)} onSave={save}/>}
    {tab==='dashboard'&&<SystemMiningDashboard config={config} loading={!currentConfig} error={currentConfig?.error??''} reader={reader} storeSelector={storeSelector} onRefresh={()=>setConfigRevision(x=>x+1)} onConfigure={()=>navigate('configuration',storeId)} onRequest={id=>navigate('history',storeId,id)}/>}
    {tab==='history'&&<SystemMiningHistory key={token} storeId={storeId} reader={reader} requestId={location.requestId} runId={location.runId} onSelectStore={chooseStore} onSelect={(id,runId=null)=>navigate('history',storeId,id,runId)}/>}
  </div>;
}
