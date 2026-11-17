import React from 'react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';

export interface F02Notice { id: number; kind: 'success' | 'error'; text: string; }
export function F02Toast({ notice, onClose }: { notice: F02Notice | null; onClose: () => void }) {
  if (!notice) return null;
  const Icon = notice.kind === 'success' ? CircleCheck : CircleAlert;
  return <div data-f02-toast role={notice.kind === 'success' ? 'status' : 'alert'} aria-atomic="true" className={`absolute inset-x-0 top-0 flex max-h-14 items-start gap-2 overflow-y-auto rounded-lg border bg-white p-2.5 text-sm shadow-md ${notice.kind === 'success' ? 'border-[#cae0d1] text-[#315445]' : 'border-red-200 text-red-700'}`}>
    <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{notice.text}</span><button type="button" aria-label="Dismiss batch notification" onClick={onClose} className="-my-0.5 rounded p-1 hover:bg-[#f3f5f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315445]"><X className="h-4 w-4" /></button>
  </div>;
}
