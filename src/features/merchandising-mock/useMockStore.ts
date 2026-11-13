import { useSyncExternalStore } from 'react';
import { createMockStore, MOCK_STORAGE_KEY } from './mock.store';
import { projectActiveLayout } from './mock.engine';
import { mockProducts } from './mock.fixtures';
import type { CustomerStorefrontSource } from '../customer/hooks/useActiveStorefront';

export const mockStore=createMockStore(()=>typeof window==='undefined'?undefined:window.localStorage);
const announce=()=>window.dispatchEvent(new Event('paspm:storefront-refresh'));
if(typeof window!=='undefined') {
  mockStore.subscribe(announce);
  window.addEventListener('storage',event=>{
    if(event.storageArea===window.localStorage && (event.key===MOCK_STORAGE_KEY || event.key===null)) mockStore.reload();
  });
}
export function useMockState(){return useSyncExternalStore(mockStore.subscribe,mockStore.getSnapshot,mockStore.getSnapshot)}
export const mockCustomerSource:CustomerStorefrontSource=async(storeId,signal)=>{
  if(signal.aborted)throw new DOMException('Aborted','AbortError');
  return {storeId,products:mockProducts(storeId),activeLayout:projectActiveLayout(mockStore.getSnapshot(),storeId)};
};
