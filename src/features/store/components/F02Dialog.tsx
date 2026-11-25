import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function F02Dialog({ title, busy, onClose, children }: { title: string; busy: boolean; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; ref.current?.showModal(); return () => { ref.current?.close(); previous?.focus(); }; }, []);
  return <dialog ref={ref} aria-label={title} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-[#e7e2d8] bg-[#fffdfb] p-6 text-[#191c1b] shadow-2xl backdrop:bg-[#1e3a2f]/30">
    <div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-xl font-semibold">{title}</h2><button type="button" aria-label="Close dialog" disabled={busy} onClick={onClose} className="rounded p-1 disabled:opacity-40"><X className="h-5 w-5" /></button></div>
    {children}
  </dialog>;
}
