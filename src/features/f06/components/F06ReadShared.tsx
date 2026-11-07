import type { ReactNode } from 'react';

export const recommendationValue = (value: string | number | null | undefined) => value == null ? '—' : String(value);
export const recommendationYesNo = (value: boolean) => value ? 'Yes' : 'No';
export function RecommendationBadge({ status }: { status: string }) {
  const color = status === 'APPROVED' || status === 'ELIGIBLE' ? 'bg-emerald-50 text-emerald-800' :
    status === 'REJECTED' || status === 'INELIGIBLE' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900';
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{status}</span>;
}
export function RecommendationFields({ fields }: { fields: [string, ReactNode][] }) {
  return <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">{fields.map(([label, value]) =>
    <div key={label} className="min-w-0"><dt className="text-xs text-[#6D7974]">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium">{value}</dd></div>)}</dl>;
}
export function RecommendationProduct({ id, names = {} }: { id: number | null; names?: Record<number, string> }) {
  return id === null ? <>—</> : <><span className="font-medium">#{id}</span>{names[id] && <span> · {names[id]}</span>}</>;
}
