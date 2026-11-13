import { CUSTOMER_STORES, rememberCustomerStore } from '../features/customer/data/customerStores';
import { useSyncExternalStore } from 'react';
import { authService } from '../services/authService';
import { DemoAuthService, DEMO_ROLES } from './demo.auth';
import { resetDemoRepository } from '../features/demo/demo.repository';
import { syncBrowserUrl } from '../utils/navigationRouter';
import type { SystemRole } from '../types/users';

export function DemoToolbar() {
  const state = useSyncExternalStore(authService.subscribe, authService.getSnapshot);
  if (!(authService instanceof DemoAuthService) || !state.user) return null;
  const service = authService;
  const change = (role: SystemRole, storeId: number) => {
    rememberCustomerStore(CUSTOMER_STORES[storeId - 1].id);
    const user = service.selectPersona(role, storeId);
    syncBrowserUrl(user.defaultScreen);
    window.dispatchEvent(new Event('popstate'));
  };
  return <aside aria-label="Demo controls" className="sticky top-0 z-[110] flex flex-wrap items-center justify-center gap-3 border-b border-emerald-200 bg-emerald-950 px-3 py-2 text-sm text-white">
    <strong>Demo Mode</strong><span className="text-xs text-emerald-100">Local data · demo permissions</span>
    <label className="flex items-center gap-2">Persona<select aria-label="Demo persona" className="min-h-11 rounded bg-white px-2 py-1 text-emerald-950" value={state.user.role} onChange={e => change(e.target.value as SystemRole, state.user!.storeId ?? 1)}>{DEMO_ROLES.map(role => <option key={role} value={role}>{role === 'End-Customer' ? 'Customer' : role}</option>)}</select></label>
    <label className="flex items-center gap-2">Store<select aria-label="Demo store" className="min-h-11 rounded bg-white px-2 py-1 text-emerald-950" value={state.user.storeId ?? 1} onChange={e => change(state.user!.role, Number(e.target.value))}>{CUSTOMER_STORES.map((store, index) => <option key={store.id} value={index + 1}>{index + 1} · {store.name}</option>)}</select></label>
    <button type="button" className="min-h-11 rounded border border-emerald-400 px-2 py-1 hover:bg-emerald-800" onClick={() => { resetDemoRepository(); try{localStorage.setItem('paspm_demo_reset_epoch',String(Date.now()))}catch{/* Storage unavailable. */} window.dispatchEvent(new Event('paspm-demo-reset')); change(state.user!.role, state.user!.storeId ?? 1); }}>Reset demo data</button>
  </aside>;
}
