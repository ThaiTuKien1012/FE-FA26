import { DEMO_MODE } from '../../demo/demo.config';
import { subscribeDemoRepository } from '../demo/demo.repository';
import { demoApprovals } from '../demo/demo.approvals';
import { createDemoMerchandisingScenario } from './mock.scenario';
import { useSyncExternalStore } from 'react';
import { createMockStore, MOCK_STORAGE_KEY } from './mock.store';
import { projectActiveLayout } from './mock.engine';
import { mockProducts } from './mock.fixtures';
import type { CustomerStorefrontSource } from '../customer/hooks/useActiveStorefront';

export const merchandisingStorageKey=DEMO_MODE?'paspm_demo_merchandising_v1':MOCK_STORAGE_KEY;
export const mockStore=createMockStore(()=>typeof window==='undefined'?undefined:window.localStorage,{key:merchandisingStorageKey,...(DEMO_MODE?{seed:createDemoMerchandisingScenario}:{})});
export function resetDemoMerchandising(){if(DEMO_MODE){demoApprovals.reset();mockStore.update(()=>createDemoMerchandisingScenario())}}
const announce=()=>window.dispatchEvent(new Event('paspm:storefront-refresh'));
if(typeof window!=='undefined') {
  mockStore.subscribe(announce);
  if(DEMO_MODE){mockStore.getSnapshot();subscribeDemoRepository(announce);window.addEventListener('paspm-demo-reset',resetDemoMerchandising);}
  window.addEventListener('storage',event=>{
    if(event.storageArea===window.localStorage && (event.key===merchandisingStorageKey || event.key===null)) mockStore.reload();
  });
}
export function useMockState(){return useSyncExternalStore(mockStore.subscribe,mockStore.getSnapshot,mockStore.getSnapshot)}
export const mockCustomerSource:CustomerStorefrontSource=async(storeId,signal)=>{
  if(signal.aborted)throw new DOMException('Aborted','AbortError');
  return {storeId,products:mockProducts(storeId),activeLayout:projectActiveLayout(mockStore.getSnapshot(),storeId)};
};
