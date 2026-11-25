import React, { useId } from 'react';

export function GeneratedCodeField({ label, code }: { label: 'SKU' | 'Batch code'; code?: string }) {
  const helpId = useId();
  return <div>
    <label className="block text-sm">{label}<input aria-label={label} aria-describedby={code === undefined ? helpId : undefined} readOnly value={code ?? 'Generated after saving'} className="mt-1 w-full min-w-0 select-text rounded-lg border border-[#e7e2d8] bg-[#f3f5f3] p-2 text-[#4b5751] outline-none focus:border-[#1e3a2f]" /></label>
    {code === undefined && <p id={helpId} className="mt-1 text-xs text-[#6d7974]">{label} is generated automatically when the {label === 'SKU' ? 'product' : 'batch'} is saved.</p>}
  </div>;
}
