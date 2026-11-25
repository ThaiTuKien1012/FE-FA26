import { useEffect, useRef, useState } from 'react';
import { storeApi } from '../store/store.api';
import { f03Scope } from './f03.api';

/** Optional F02 labels never block utility data or replace frozen evidence. */
export function useUtilityProductNames(ids: number[], supplied: Record<number, string> = {}) {
  const cache = useRef(new Map<number, string | null>());
  const [resolved, setResolved] = useState<Record<number, string>>({});
  const key = [...new Set(ids)].sort((a, b) => a - b).join(',');
  const scope = f03Scope();
  const previousScope = useRef(scope);
  useEffect(() => {
    if (previousScope.current !== scope) { cache.current.clear(); setResolved({}); previousScope.current = scope; }
    let live = true, next = 0;
    const unique = key ? key.split(',').map(Number) : [];
    void Promise.all(Array.from({ length: Math.min(4, unique.length) }, async () => {
      while (live && scope === f03Scope() && next < unique.length) {
        const id = unique[next++];
        if (cache.current.has(id)) continue;
        try {
          const product = await storeApi.getProduct(id);
          if (!live || scope !== f03Scope()) return;
          if (product.id === id && typeof product.name === 'string' && product.name.trim()) cache.current.set(id, product.name);
        } catch { if (live && scope === f03Scope()) cache.current.set(id, null); }
      }
    })).then(() => { if (live && scope === f03Scope()) setResolved(Object.fromEntries([...cache.current].filter((entry): entry is [number, string] => entry[1] !== null))); });
    return () => { live = false; };
  }, [key, scope]);
  return previousScope.current === scope ? { ...supplied, ...resolved } : supplied;
}
