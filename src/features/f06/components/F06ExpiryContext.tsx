import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { LiveRecommendationExpiry, confirmedProductBatches, type LiveExpiryState } from '../f06.expiry';

interface ExpiryContextValue {
  workflow:LiveRecommendationExpiry;state:LiveExpiryState;alertsOpen:boolean;
  openAlerts:()=>void;closeAlerts:()=>void;
}
const Context=createContext<ExpiryContextValue|null>(null);
export const useF06Expiry=()=>useContext(Context);
export function F06ExpiryProvider({children}:{children:ReactNode}){
  const [workflow]=useState(()=>new LiveRecommendationExpiry());
  const state=useSyncExternalStore(workflow.subscribe,workflow.getSnapshot,workflow.getSnapshot);
  const [alertsOpen,setOpen]=useState(false);
  const openAlerts=useCallback(()=>setOpen(true),[]),closeAlerts=useCallback(()=>setOpen(false),[]);
  useEffect(()=>{workflow.start();const focus=()=>workflow.refreshIfStale();window.addEventListener('focus',focus);return()=>{window.removeEventListener('focus',focus);workflow.stop();};},[workflow]);
  const value=useMemo(()=>({workflow,state,alertsOpen,openAlerts,closeAlerts}),[workflow,state,alertsOpen,openAlerts,closeAlerts]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useProductExpiry(ids:readonly number[]){
  const context=useF06Expiry(),key=JSON.stringify([...new Set(ids)]);
  const workflow=context?.workflow,scopeRevision=context?.state.scopeRevision;
  useEffect(()=>workflow?.watchProducts(JSON.parse(key)),[workflow,key,scopeRevision]);
  const products=context?.state.products??{};
  const confirmed=Object.fromEntries(ids.map(id=>[id,confirmedProductBatches(products[id])]).filter(([,batches])=>(batches as unknown[]).length));
  return{context,products,confirmed:confirmed as Record<number,ReturnType<typeof confirmedProductBatches>>};
}
