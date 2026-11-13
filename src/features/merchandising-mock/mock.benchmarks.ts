/** Invented historical fixtures for demonstration; these are not measured algorithm results. */
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

const conditions = {
  datasetHash: 'synthetic-sha256:demo-baskets-v1-8c3e',
  threshold: '120 fixture utility units (absolute)',
  utilityModel: 'quantity × synthetic item weight; positive weights v1',
  hardware: 'Synthetic reference: 4 CPU cores / 8 GB RAM',
  repeatProtocol: 'Fixture protocol: 1 warmup + 5 runs; median runtime; maximum memory',
  outputChecksum: 'synthetic-sha256:itemsets-v1-a62f',
};

export const benchmarkPairs: { id: string; name: string; huiMiner: BenchmarkRun; efim: BenchmarkRun }[] = [
  {
    id: 'matched', name: 'Demo baskets · matched fixture',
    huiMiner: { ...conditions, algorithm: 'HUI-Miner', medianMs: 142, peakMemoryMb: 48 },
    efim: { ...conditions, algorithm: 'EFIM', medianMs: 118, peakMemoryMb: 42 },
  },
  {
    id: 'mismatch', name: 'Demo baskets · output mismatch example',
    huiMiner: { ...conditions, algorithm: 'HUI-Miner', medianMs: 142, peakMemoryMb: 48 },
    efim: { ...conditions, algorithm: 'EFIM', outputChecksum: 'synthetic-sha256:incomplete-output-b902', medianMs: 93, peakMemoryMb: 35 },
  },
];
