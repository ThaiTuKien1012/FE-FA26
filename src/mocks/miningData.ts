import { MiningJob, HighUtilityItemset, BenchmarkComparison } from '../types/mining';

export const initialMiningJobs: MiningJob[] = [
  {
    id: 'run-0025',
    runId: '#0025',
    algorithm: 'EFIM',
    dataset: 'Sales Q3 2026',
    utilityMatrixVersion: 'v1',
    minUtil: 250,
    executionMode: 'manual',
    startedAt: '10 Oct 2026, 09:42',
    duration: '—',
    peakMemoryMB: 0,
    status: 'Failed',
    itemsetCount: 0,
    errorCategory: 'Missing or unavailable utility matrix',
    errorMessage: 'Input utility matrix could not be loaded. Verify the prepared dataset and try again.',
    logs: [
      '[09:42:01] INFO  Job queued for execution on cluster worker-node-04',
      '[09:42:03] INFO  Initializing EFIM kernel runner (C++ native engine)',
      '[09:42:05] INFO  Loading dataset metadata: Sales Q3 2026 (1,480,210 transactions)',
      '[09:42:07] INFO  Resolving external utility matrix: v1',
      '[09:42:08] ERROR MATRIX_NOT_FOUND',
      '             Prepared utility matrix: Sales Q3 2026 / v1 (sample)',
      '[09:42:08] ERROR Fatal error: Target schema validation failed: [E_DS_UNRESOLVED_DESCRIPTOR]',
      '[09:42:09] WARN  Execution halted prematurely. Releasing worker memory buffers.'
    ]
  },
  {
    id: 'run-0024',
    runId: '#0024',
    algorithm: 'EFIM',
    dataset: 'Sales Q3 2026',
    utilityMatrixVersion: 'v1',
    minUtil: 250,
    executionMode: 'manual',
    startedAt: '10 Oct 2026, 09:42',
    duration: '8.4s',
    peakMemoryMB: 128,
    status: 'Completed',
    itemsetCount: 128,
    logs: [
      '[09:42:00] INFO  Starting mining job #0024 with EFIM algorithm',
      '[09:42:01] INFO  Loading dataset: Sales Q3 2026 with minUtil = 250',
      '[09:42:02] INFO  Constructing Sub-tree Utility lists and transaction projections',
      '[09:42:05] INFO  Pruning unpromising items via Sub-tree Utility Upper Bound (SU-UB)',
      '[09:42:07] INFO  Recursive depth-first traversal completed in 4,120 iterations',
      '[09:42:08] INFO  128 High-Utility Itemsets extracted successfully',
      '[09:42:08] SUCCESS Job finished in 8.4s. Memory footprint: 128 MB'
    ]
  },
  {
    id: 'run-0023',
    runId: '#0023',
    algorithm: 'HUI-Miner',
    dataset: 'Sales Q3',
    utilityMatrixVersion: 'v1',
    minUtil: 250,
    executionMode: 'manual',
    startedAt: '09 Oct 2026, 14:23',
    duration: '13.2s',
    peakMemoryMB: 284,
    status: 'Completed',
    itemsetCount: 128,
    logs: [
      '[14:23:01] INFO  Starting HUI-Miner utility list construction',
      '[14:23:14] SUCCESS 128 high utility itemsets generated in 13.2s'
    ]
  },
  {
    id: 'run-0022',
    runId: '#0022',
    algorithm: 'EFIM',
    dataset: 'September',
    utilityMatrixVersion: 'v1',
    minUtil: 200,
    executionMode: 'scheduled',
    scheduleFrequency: 'Monthly',
    startedAt: '08 Oct 2026, 11:07',
    duration: '—',
    peakMemoryMB: 0,
    status: 'Failed',
    itemsetCount: 0,
    errorCategory: 'Worker memory overflow during matrix join',
    errorMessage: 'Worker out-of-memory exception during dense matrix projection.',
    logs: [
      '[11:07:01] ERROR OOM: Worker buffer exceeded allocation limits (2048 MB)'
    ]
  },
  {
    id: 'run-0021',
    runId: '#0021',
    algorithm: 'EFIM',
    dataset: 'August',
    utilityMatrixVersion: 'v1',
    minUtil: 300,
    executionMode: 'scheduled',
    scheduleFrequency: 'Monthly',
    startedAt: '07 Oct 2026, 16:35',
    duration: 'In progress',
    peakMemoryMB: 196,
    status: 'Running',
    itemsetCount: 94,
    logs: [
      '[16:35:00] INFO Job running in background worker daemon'
    ]
  }
];

export const mockItemsets: HighUtilityItemset[] = [
  {
    id: 'hui-1',
    itemsetId: 'HUI-001',
    products: ['Milk', 'Bread'],
    utility: 1250,
    itemsCount: 2,
    supportPercentage: 18.4,
    productUtilities: [
      { product: 'Whole Milk (1L)', utility: 720, quantity: 240 },
      { product: 'Sourdough Artisan Bread', utility: 530, quantity: 176 }
    ]
  },
  {
    id: 'hui-2',
    itemsetId: 'HUI-002',
    products: ['Coffee', 'Sugar'],
    utility: 980,
    itemsCount: 2,
    supportPercentage: 14.1,
    productUtilities: [
      { product: 'Arabica Roasted Beans (500g)', utility: 740, quantity: 98 },
      { product: 'Raw Cane Sugar (1kg)', utility: 240, quantity: 120 }
    ]
  },
  {
    id: 'hui-3',
    itemsetId: 'HUI-003',
    products: ['Tea', 'Biscuits'],
    utility: 875,
    itemsCount: 2,
    supportPercentage: 12.8,
    productUtilities: [
      { product: 'Earl Grey Organic Loose Leaf', utility: 560, quantity: 80 },
      { product: 'Butter Shortbread Biscuits', utility: 315, quantity: 105 }
    ]
  },
  {
    id: 'hui-4',
    itemsetId: 'HUI-004',
    products: ['Rice', 'Cooking Oil'],
    utility: 760,
    itemsCount: 2,
    supportPercentage: 11.2,
    productUtilities: [
      { product: 'Jasmine Fragrant Rice (5kg)', utility: 480, quantity: 60 },
      { product: 'Extra Virgin Olive Oil (1L)', utility: 280, quantity: 40 }
    ]
  },
  {
    id: 'hui-5',
    itemsetId: 'HUI-005',
    products: ['Eggs', 'Milk', 'Bread'],
    utility: 630,
    itemsCount: 3,
    supportPercentage: 9.6,
    productUtilities: [
      { product: 'Organic Free-Range Eggs (12pk)', utility: 280, quantity: 70 },
      { product: 'Whole Milk (1L)', utility: 210, quantity: 70 },
      { product: 'Sourdough Artisan Bread', utility: 140, quantity: 46 }
    ]
  },
  {
    id: 'hui-6',
    itemsetId: 'HUI-006',
    products: ['Pasta', 'Tomato Sauce', 'Parmesan'],
    utility: 590,
    itemsCount: 3,
    supportPercentage: 8.5,
    productUtilities: [
      { product: 'Bronze-Cut Penne Rigate', utility: 180, quantity: 60 },
      { product: 'San Marzano Basil Marinara', utility: 230, quantity: 55 },
      { product: 'Aged Parmigiano Reggiano (200g)', utility: 180, quantity: 30 }
    ]
  },
  {
    id: 'hui-7',
    itemsetId: 'HUI-007',
    products: ['Cereal', 'Almond Milk'],
    utility: 480,
    itemsCount: 2,
    supportPercentage: 7.2,
    productUtilities: [
      { product: 'Granola Berry Crisp', utility: 310, quantity: 50 },
      { product: 'Unsweetened Almond Milk (1L)', utility: 170, quantity: 50 }
    ]
  }
];

export const mockBenchmarkData: BenchmarkComparison = {
  dataset: 'Sales Q3 2026',
  minUtil: 250,
  huiMiner: {
    executionTime: 29.1,
    peakMemoryMB: 384,
    itemsetsCount: 128
  },
  efim: {
    executionTime: 16.8,
    peakMemoryMB: 256,
    itemsetsCount: 128
  },
  timeImprovementPct: 42.3,
  memoryImprovementPct: 33.3
};

export const availableDatasets = [
  { id: 'sales-q3-2026', name: 'Sales Q3 2026 / Utility Matrix v1', description: 'Validated transaction log (1.48M rows) & external unit margins' },
  { id: 'sales-q2-2026', name: 'Sales Q2 2026 / Utility Matrix v2', description: 'Historical verified transaction log (1.20M rows)' },
  { id: 'store-flagship-nordic', name: 'Nordic Flagship Store / Realtime Stream', description: 'Store POS retail receipts with basket profit' }
];
