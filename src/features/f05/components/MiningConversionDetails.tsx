import { conversionDescription } from '../f05.conversion';
import type { MiningConversionMetadata } from '../f05.types';

export function MiningConversionDetails({ value }: { value: MiningConversionMetadata & { conversionVersion: string } }) {
  const description = conversionDescription(value);
  return <section aria-label="Analysis input conversion" className="mt-4 min-w-0 text-sm">
    <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs text-[#6D7974]">Input conversion</dt><dd className="mt-1 break-words">{description.label}</dd></div><div><dt className="text-xs text-[#6D7974]">Rounding unit</dt><dd className="mt-1">{description.rounding}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-[#6D7974]">Conversion version</dt><dd className="mt-1 [overflow-wrap:anywhere]">{value.conversionVersion}</dd></div></dl>
    <p className="mt-3 text-xs leading-5 text-[#6D7974]">{description.explanation}</p>
  </section>;
}
