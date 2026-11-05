import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { getPathForScreen } from '../../../utils/navigationRouter';
import type { ActiveNavScreen } from '../../../types/mining';
import { F03ApiError } from '../f03.api';

export const field = 'mt-1 w-full rounded-xl border border-[#e7e2d8] bg-white px-3 py-2.5 outline-none focus:border-[#1e3a2f] focus:ring-2 focus:ring-[#1e3a2f]/20 disabled:bg-[#f4f1ec] disabled:text-[#6d7974]';
export const primary = 'bg-[#1e3a2f] text-white hover:bg-[#2d604a]';
export const secondary = 'border border-[#e7e2d8] bg-white text-[#1e3a2f] hover:bg-[#faf8f5]';
export function navigate(screen: ActiveNavScreen, id?: number) {
  window.history.pushState({ screen }, '', `${getPathForScreen(screen)}${id ? `?id=${id}` : ''}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof F03ApiError && error.status === 403) return 'Access denied (403). Your account does not have permission to read or change this data.';
  return error instanceof Error ? error.message : fallback;
}
export function readable(value: string) { return value.toLowerCase().replaceAll('_', ' ').replace(/^\w/, c => c.toUpperCase()); }
export const Button = ({ className = '', type = 'button', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type={type} {...props} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356b54] disabled:cursor-not-allowed disabled:opacity-50 ${className}`} />;
export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-[#e7e2d8] bg-white p-4 shadow-sm sm:p-6"><h2 className="text-lg font-semibold">{title}</h2>{subtitle && <p className="mt-1 text-sm text-[#6d7974]">{subtitle}</p>}<div className="mt-5">{children}</div></section>;
}
export function Notice({ error = '', notice = '' }: { error?: string; notice?: string }) {
  return <>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}{notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p>}</>;
}
export function Warnings({ warnings }: { warnings?: string[] }) {
  return warnings?.length ? <div className="my-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Warnings</p><ul className="mt-2 list-disc space-y-1 pl-5">{warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></div> : null;
}
export function Metrics({ values }: { values: [string, React.ReactNode][] }) {
  return <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{values.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs font-medium text-[#6d7974]">{label}</dt><dd className="mt-1 break-words font-semibold tabular-nums">{value ?? 'Unavailable'}</dd></div>)}</dl>;
}
export function Technical({ children }: { children: React.ReactNode }) {
  return <details className="mt-5 rounded-xl border border-[#e7e2d8] p-4 text-sm"><summary className="cursor-pointer font-semibold text-[#356b54]">Technical Details</summary><div className="mt-4 space-y-3 break-words">{children}</div></details>;
}
export function Pager({ page, onChange, label, busy = false }: { page: { page: number; pageSize: number; totalElements: number }; onChange: (page: number) => void; label: string; busy?: boolean }) {
  const pages = Math.max(1, Math.ceil(page.totalElements / page.pageSize));
  return <nav aria-label={`${label} pagination`} className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6d7974]"><span>Page {page.page + 1} of {pages} · {page.totalElements} {label}</span><div className="flex gap-2"><Button className={secondary} disabled={busy || page.page <= 0} onClick={() => onChange(page.page - 1)}>Previous</Button><Button className={secondary} disabled={busy || page.page + 1 >= pages} onClick={() => onChange(page.page + 1)}>Next</Button></div></nav>;
}
export const BackToSnapshots = () => <Button className={secondary} onClick={() => navigate('f03-snapshots')}><ArrowLeft size={16} />Back to Snapshots</Button>;
