/** Contract for measured algorithm runs. No invented performance records. */
export interface BenchmarkRun {
  algorithm: 'HUI-Miner' | 'EFIM';
  datasetHash: string;
  threshold: string;
  utilityModel: string;
  hardware: string;
  repeatProtocol: string;
  outputChecksum: string;
  medianMs: number;
  peakMemoryMb: number;
}

export const benchmarkMatchFields = ['datasetHash', 'threshold', 'utilityModel', 'hardware', 'repeatProtocol', 'outputChecksum'] as const;

export function benchmarkEligibility(a: BenchmarkRun, b: BenchmarkRun): string[] {
  const mismatches: string[] = benchmarkMatchFields.filter(key => !a[key] || !b[key] || a[key] !== b[key]);
  if (a.algorithm === b.algorithm) mismatches.push('algorithm');
  return mismatches;
}

// Populate only with measured, attributable compatible runs; none are supplied.
export const benchmarkPairs: { id: string; name: string; huiMiner: BenchmarkRun; efim: BenchmarkRun }[] = [];
