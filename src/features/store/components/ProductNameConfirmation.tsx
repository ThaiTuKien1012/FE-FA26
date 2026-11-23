import React, { useRef, useState } from 'react';
import { f02ErrorMessage, needsProductNameConfirmation, storeApi, type F02Product, type F02ProductRequest } from '../store.api';
import { F02Dialog } from './F02Dialog';

type PendingProduct = { id?: number; body: F02ProductRequest };

export function useProductSave(onSaved: (product: F02Product, editing: boolean) => Promise<void> | void) {
  const [saving, setSaving] = useState(false), [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<PendingProduct | null>(null);
  const locked = useRef(false), waiting = useRef<PendingProduct | null>(null);
  const perform = async (snapshot: PendingProduct, confirmed = false) => {
    if (locked.current) return;
    locked.current = true; setSaving(true); setError('');
    try {
      const body = { ...snapshot.body, ...(confirmed ? { confirmSimilarName: true } : {}) };
      let product: F02Product;
      try {
        product = snapshot.id === undefined ? await storeApi.createProduct(body) : await storeApi.updateProduct(snapshot.id, body);
      } catch (e) {
        if (!confirmed && needsProductNameConfirmation(e)) {
          waiting.current = snapshot; setConfirmation(snapshot); return;
        }
        throw e;
      }
      waiting.current = null; setConfirmation(null);
      await onSaved(product, snapshot.id !== undefined);
    } catch (e) { waiting.current = null; setConfirmation(null); setError(f02ErrorMessage(e)); }
    finally { locked.current = false; setSaving(false); }
  };
  return {
    saving, error, confirmation, clearError: () => setError(''),
    submit: (id: number | undefined, body: F02ProductRequest) => {
      if (waiting.current) return;
      return perform({ id, body: { ...body } });
    },
    confirm: () => { if (waiting.current) void perform(waiting.current, true); },
    cancel: () => { if (!locked.current) { waiting.current = null; setConfirmation(null); } }
  };
}

export function ProductNameConfirmation({ save }: { save: ReturnType<typeof useProductSave> }) {
  if (!save.confirmation) return null;
  return <F02Dialog title="Similar product name" busy={save.saving} onClose={save.cancel}>
    <p>A product with the same or a similar name already exists in your store. No changes have been saved yet.</p>
    <p className="mt-3 font-semibold">{save.confirmation.body.name}</p>
    <p className="mt-2 text-sm text-[#6d7974]">Continue Anyway to save these product values, or Cancel to return to your form.</p>
    <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={save.saving} onClick={save.cancel} className="rounded-lg border px-4 py-2">Cancel</button><button type="button" disabled={save.saving} onClick={save.confirm} className="rounded-lg bg-[#1e3a2f] px-4 py-2 font-semibold text-white disabled:opacity-40">{save.saving ? 'Saving…' : 'Continue Anyway'}</button></div>
  </F02Dialog>;
}
