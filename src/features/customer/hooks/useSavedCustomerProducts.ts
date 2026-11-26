import { useState } from 'react';

const storageKey = 'paspm-customer-saved-products';

export function useSavedCustomerProducts() {
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      const value: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? '[]');
      return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
    } catch { return []; }
  });
  function toggle(key: string) {
    const next = saved.includes(key) ? saved.filter(item => item !== key) : [...saved, key];
    setSaved(next);
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Storage is optional. */ }
  }
  return { saved, toggle };
}
