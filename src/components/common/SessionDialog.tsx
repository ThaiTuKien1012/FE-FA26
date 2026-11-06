import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';

/** Native modal supplies focus trapping, inert background and return focus on close. */
export function SessionDialog({ title, children, onCancel }: {
  title: string; children: React.ReactNode; onCancel?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    const cancel = (event: Event) => { event.preventDefault(); cancelRef.current?.(); };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelRef.current?.(); }
    };
    dialog.addEventListener('cancel', cancel);
    dialog.addEventListener('keydown', keydown);
    dialog.showModal();
    return () => { dialog.removeEventListener('cancel', cancel); dialog.removeEventListener('keydown', keydown); dialog.close(); previous?.focus(); };
  }, []);
  return createPortal(
    <dialog ref={ref} aria-labelledby={titleId} aria-describedby={descriptionId}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-[#E7E2D8] bg-white p-6 text-[#191C1B] shadow-xl backdrop:bg-[#F1F0EB]/80">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#EDF5F0] text-[#1E3A2F]"><Clock aria-hidden="true" className="h-6 w-6" /></div>
      <h2 id={titleId} className="text-xl font-semibold tracking-tight">{title}</h2>
      <div id={descriptionId} className="mt-3 text-sm leading-6 text-[#57534E]">{children}</div>
    </dialog>, document.body
  );
}

export const sessionPrimary = 'rounded-xl bg-[#1E3A2F] px-4 py-3 text-sm font-semibold text-white hover:bg-[#294D3F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A2F] disabled:opacity-60';
export const sessionSecondary = 'rounded-xl border border-[#E7E2D8] bg-white px-4 py-3 text-sm font-semibold text-[#57534E] hover:bg-[#FAF8F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A2F] disabled:opacity-60';
