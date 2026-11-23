import { useEffect, useState } from 'react';
import { authService } from '../../services/authService';
import { getStoreDetail, type StoreView } from './storeManagement.api';

type SelectedStore = Pick<StoreView, 'storeId' | 'name' | 'status'>;

export function selectedStoreOption(id: number, store: SelectedStore | null) {
  if (store?.storeId !== id) return { label: 'Current Store #' + id, disabled: false };
  const inactive = store.status === 'INACTIVE';
  return { label: store.name + ' · #' + id + (inactive ? ' · Inactive' : ''), disabled: inactive };
}

/** The active-only lists do not identify a previously selected Store outside the current page. */
export function useSelectedStore(id: number | null, revision: number) {
  const session = authService.getSessionId();
  const [result, setResult] = useState<{ store: SelectedStore; session: string } | null>(null);

  useEffect(() => {
    if (id === null) return;
    const controller = new AbortController();
    void getStoreDetail(id, controller.signal).then(store => {
      if (!controller.signal.aborted && authService.getSessionId() === session) setResult({ store, session });
    }).catch(() => {
      // The current ID remains visible if the optional label cannot be loaded.
      if (!controller.signal.aborted) setResult(null);
    });
    return () => controller.abort();
  }, [id, revision, session]);

  return id === null ? null : selectedStoreOption(id, result?.session === session ? result.store : null);
}
