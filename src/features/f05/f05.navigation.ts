import { useSyncExternalStore } from 'react';
import type { ActiveNavScreen } from '../../types/mining';
import { getPathForScreen } from '../../utils/navigationRouter';
import { parseMiningId } from './f05.numbers';

export type MiningView = 'dashboard' | 'configuration' | 'setup' | 'history' | 'benchmark' | 'snapshots';
export const SYSTEM_MINING_NAV = [
  {screen:'overview',view:'dashboard',label:'Dashboard'},
  {screen:'setup',view:'configuration',label:'Algorithm Configuration'},
  {screen:'admin-run-mining',view:'setup',label:'Run Mining'},
  {screen:'admin-mining-history',view:'history',label:'Mining History'},
  {screen:'benchmark',view:'benchmark',label:'Algorithm Benchmark'}
] as const;
export function isSystemMiningScreen(screen:ActiveNavScreen) {
  return SYSTEM_MINING_NAV.some(item=>item.screen===screen) || ['f05-mining','results','failure'].includes(screen);
}
export function systemMiningView(screen:ActiveNavScreen):MiningView {
  return SYSTEM_MINING_NAV.find(item=>item.screen===screen)?.view??'history';
}
export function resolveSystemScreen(screen:ActiveNavScreen,search=''):ActiveNavScreen {
  if(screen==='api-connections')return 'overview';
  if(screen==='f03-configuration')return 'lambda-policy';
  const oldView=new URLSearchParams(search).get('view');
  if(isSystemMiningScreen(screen) && oldView){
    const mapped=SYSTEM_MINING_NAV.find(item=>item.view===oldView);
    if(mapped)return mapped.screen;
  }
  if(screen==='f05-mining')return 'overview';
  if(screen==='results'||screen==='failure')return 'admin-mining-history';
  return screen;
}
export function systemScreenUrl(screen:ActiveNavScreen,search='') {
  const query=new URLSearchParams(search);
  const result=new URLSearchParams();
  const store=query.get('storeId');
  if(store)result.set('storeId',store);
  if(screen==='admin-mining-history'||screen==='benchmark'){
    for(const key of ['requestId','runId']){const value=query.get(key);if(value)result.set(key,value);}
  }
  if(screen==='setup'){
    const algorithm=query.get('algorithm');
    if(algorithm==='HUI_MINER'||algorithm==='EFIM')result.set('algorithm',algorithm);
  }
  return getPathForScreen(screen)+(result.size?'?'+result.toString():'');
}
export function readMiningLocation(system:boolean,initialView:MiningView) {
  const query=new URLSearchParams(typeof window==='undefined'?'':window.location.search);
  let view=initialView;
  if(!system){if(query.get('view')==='snapshots'||query.get('view')==='setup')view='snapshots';else view='history';}
  try {
    const storeId=system&&query.has('storeId')?parseMiningId(query.get('storeId')!):null;
    if(storeId!==null&&storeId>2147483647)throw new Error('Store ID must be a positive int32.');
    return {view,storeId,requestId:query.has('requestId')?parseMiningId(query.get('requestId')!):null,
      runId:system&&query.has('runId')?parseMiningId(query.get('runId')!):null,error:''};
  } catch(e){return {view,storeId:null,requestId:null,runId:null,error:e instanceof Error?e.message:'Invalid mining URL.'};}
}
const subscribe=(callback:()=>void)=>{window.addEventListener('popstate',callback);return()=>window.removeEventListener('popstate',callback);};
const snapshot=()=>window.location.pathname+window.location.search;
export function useMiningLocation(system:boolean,initialView:MiningView) {
  useSyncExternalStore(subscribe,snapshot,()=>'');
  const location=readMiningLocation(system,initialView);
  const navigate=(view:MiningView,storeId:number|null=null,requestId:number|null=null,runId:number|null=null)=>{
    const query=new URLSearchParams();
    if(system){
      if(storeId!==null)query.set('storeId',String(storeId));
      if(requestId!==null)query.set('requestId',String(requestId));
      if(runId!==null)query.set('runId',String(runId));
      const screen=SYSTEM_MINING_NAV.find(item=>item.view===view)?.screen??'overview';
      window.history.pushState({screen},'',systemScreenUrl(screen,query.toString()));
    }else{
      query.set('view',view);
      if(requestId!==null)query.set('requestId',String(requestId));
      window.history.pushState({screen:'f05-mining'},'',getPathForScreen('f05-mining')+'?'+query);
    }
    window.dispatchEvent(new Event('popstate'));
  };
  return {location,navigate};
}
