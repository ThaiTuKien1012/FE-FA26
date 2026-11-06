import React, { useEffect, useSyncExternalStore } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { authService } from '../../../services/authService';
import { SessionDialog, sessionPrimary, sessionSecondary } from '../../../components/common/SessionDialog';

export function SessionBoundary({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(authService.subscribe, authService.getSnapshot);
  useEffect(() => { void authService.restore(); return () => authService.dispose(); }, []);
  useEffect(() => {
    if (state.status === 'authenticated') return authService.startActivity();
  }, [state.status]);
  useEffect(() => {
    if (state.status !== 'anonymous' || state.noticeKind !== 'success' || !state.notice) return;
    const timer = window.setTimeout(authService.dismissSuccessNotice, 3000);
    return () => window.clearTimeout(timer);
  }, [state.status, state.notice, state.noticeKind]);
  if (state.status === 'recovering' || state.status === 'offline') return (
    <main className="flex min-h-dvh items-center justify-center bg-[#FAF8F5] p-5">
      <div className="w-full max-w-md rounded-2xl border border-[#E7E2D8] bg-white p-6">
        <h1 className="text-xl font-semibold text-[#1E3A2F]">{state.status === 'recovering' ? 'Checking your session…' : 'Unable to verify your session'}</h1>
        <p role="status" className="mt-3 text-sm text-[#57534E]">{state.status === 'recovering' ? 'Please wait while we securely restore your account.' : state.notice}</p>
        {state.status === 'offline' && <div className="mt-5 flex flex-wrap gap-3">
          <button className={sessionPrimary} onClick={() => void authService.restore()}>Retry session recovery</button>
          <button className={sessionSecondary} onClick={() => authService.endLocal('Session recovery cancelled. Please sign in.')}>Go to sign in</button>
        </div>}
      </div>
    </main>
  );
  return <>
    <React.Fragment key={authService.getSessionId()}>{children}</React.Fragment>
    {state.status === 'anonymous' && state.notice && (state.noticeKind === 'success' ?
      <div role="status" aria-atomic="true" data-session-toast className="fixed right-4 top-4 z-[100] flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-[#34D399]/30 bg-[#1E3A2F] px-4 py-3 text-sm font-medium text-white shadow-lg">
        <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-[#34D399]" />
        <span>{state.notice}</span>
        <button type="button" aria-label="Dismiss sign-out notification" onClick={authService.dismissSuccessNotice} className="shrink-0 rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><X aria-hidden="true" className="h-4 w-4" /></button>
      </div> :
      <div role="status" className="fixed inset-x-4 top-4 z-[100] mx-auto max-w-2xl rounded-xl border border-[#E7E2D8] bg-white p-4 text-sm text-[#57534E] shadow-lg">{state.notice}</div>)}
    {state.status === 'authenticated' && state.attention && <SessionDialog title="Are you still there?">
      <p className="text-pretty">Stay signed in to continue where you left off.</p>
      {state.notice && <p role="alert" className="mt-3 text-[#7A5A00]">{state.notice}</p>}
      <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-[#E7E2D8] bg-[#F5F5F2] px-3 py-2.5">
        <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#707973]" />
        <p className="text-pretty text-xs font-medium leading-5 text-[#57534E]">You may lose any unsaved changes.</p>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse" aria-busy={state.busy}>
        <button autoFocus disabled={state.busy} className={sessionPrimary} onClick={() => void authService.refresh(true).catch(() => {})}>{state.busy ? 'Checking session…' : 'Stay signed in'}</button>
        <button disabled={state.busy} className={sessionSecondary} onClick={() => void authService.logout()}>Sign out</button>
      </div>
    </SessionDialog>}
  </>;
}
