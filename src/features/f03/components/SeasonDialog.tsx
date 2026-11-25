import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

// Native modal behavior matches F02 without changing its shared dialog.
export function SeasonDialog({ title, subtitle, busy, wide = false, initialFocus, returnFocus, onClose, children, footer }: {
  title: string; subtitle?: string; busy: boolean; wide?: boolean; onClose: () => void;
  initialFocus?: string; returnFocus?: HTMLElement | null;
  children: ReactNode; footer: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const opener = returnFocus ?? document.activeElement as HTMLElement | null;
    const dialog = ref.current, overflow = document.body.style.overflow;
    const cancel = (event: Event) => { event.preventDefault(); close.current(); };
    const escapeOutside = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && dialog?.open) {
        const controls = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary, [tabindex]:not([tabindex="-1"])')].filter(element => element.getClientRects().length > 0);
        const first = controls[0], last = controls.at(-1), focused = document.activeElement;
        if (!first) { event.preventDefault(); dialog.focus(); }
        else if (!dialog.contains(focused) || (event.shiftKey ? focused === first : focused === last)) {
          event.preventDefault(); (event.shiftKey ? last : first)?.focus();
        }
      }
      // Disabling the focused Save button can move focus to the document body.
      if (event.key === 'Escape' && dialog?.open && !dialog.contains(event.target as Node)) {
        event.preventDefault(); event.stopPropagation(); close.current();
      }
    };
    dialog?.addEventListener('cancel', cancel);
    document.addEventListener('keydown', escapeOutside, true);
    dialog?.showModal(); document.body.style.overflow = 'hidden';
    if (initialFocus) dialog?.querySelector<HTMLElement>(initialFocus)?.focus({ preventScroll: true });
    return () => {
      dialog?.close(); document.body.style.overflow = overflow;
      dialog?.removeEventListener('cancel', cancel);
      document.removeEventListener('keydown', escapeOutside, true);
      const label = opener?.getAttribute('aria-label');
      const target = opener?.isConnected && opener.getClientRects().length ? opener : label ? [...document.querySelectorAll<HTMLElement>('button[aria-label]')].find(element => element.getAttribute('aria-label') === label && element.getClientRects().length) : null;
      target?.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    const dialog = ref.current;
    const body = dialog?.querySelector('.f03-season-dialog-body');
    if (body) body.scrollTop = 0;
    dialog?.querySelector<HTMLElement>(initialFocus || 'button[aria-label="Close dialog"]')?.focus({ preventScroll: true });
  }, [title, initialFocus]);
  return <dialog ref={ref} tabIndex={-1} aria-label={title} aria-modal="true" onKeyDown={event => {
    // A selector can consume Escape first; otherwise guard it before native dismissal.
    if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); event.stopPropagation(); close.current(); }
  }} className={`f03-season-dialog ${wide ? 'f03-season-dialog-wide' : ''}`}>
    <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e7e2d8] px-5 py-4 sm:px-6">
      <div className="min-w-0"><h2 className="text-xl font-semibold">{title}</h2>{subtitle && <p className="mt-1 text-sm text-[#6d7974]">{subtitle}</p>}</div>
      <button type="button" aria-label="Close dialog" disabled={busy} onClick={onClose} className="shrink-0 rounded-lg p-2 text-[#6d7974] hover:bg-[#f4f1ec] focus-visible:outline-2 focus-visible:outline-[#356b54] disabled:cursor-not-allowed disabled:opacity-40"><X size={20} aria-hidden="true" /></button>
    </header>
    <div className="f03-season-dialog-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
    <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[#e7e2d8] bg-[#faf8f5] px-5 py-4 sm:px-6">{footer}</footer>
  </dialog>;
}
