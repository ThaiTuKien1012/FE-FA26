export type MiningAlgorithm = 'HUI-Miner' | 'EFIM';

export type JobStatus = 'Completed' | 'Failed' | 'Running' | 'Pending';

export type ExecutionMode = 'manual' | 'scheduled';

export interface MiningJob {
  id: string;
  runId: string; // e.g. '#0024'
  algorithm: MiningAlgorithm;
  dataset: string; // e.g. 'Sales Q3 2026'
  utilityMatrixVersion: string; // e.g. 'v1'
  minUtil: number; // e.g. 250
  executionMode: ExecutionMode;
  scheduleFrequency?: 'Weekly' | 'Monthly';
  startedAt: string; // e.g. '10 Oct 2026, 09:42'
  duration: string; // e.g. '8.4s'
  peakMemoryMB: number; // e.g. 128
  status: JobStatus;
  itemsetCount: number;
  errorMessage?: string;
  errorCategory?: string;
  logs?: string[];
}

export interface HighUtilityItemset {
  id: string;
  itemsetId: string; // e.g. 'HUI-001'
  products: string[];
  utility: number; // e.g. 1250
  itemsCount: number;
  supportPercentage: number;
  productUtilities?: { product: string; utility: number; quantity: number }[];
}

export interface BenchmarkComparison {
  dataset: string;
  minUtil: number;
  huiMiner: {
    executionTime: number; // in seconds
    peakMemoryMB: number;
    itemsetsCount: number;
  };
  efim: {
    executionTime: number; // in seconds
    peakMemoryMB: number;
    itemsetsCount: number;
  };
  timeImprovementPct: number; // e.g. 42.3
  memoryImprovementPct: number; // e.g. 33.3
}

export type ActiveNavScreen = 
  | 'overview'        // S01: Overview
  | 'setup'           // S02: Mining Setup
  | 'results'         // S05: Mining Run Results
  | 'failure'         // S07: Mining Failure & Retry
  | 'benchmark'       // S06: HUI-Miner vs EFIM Benchmark
  | 'users'           // Accounts & Roles (User Management & RBAC)
  | 'api-connections' // API Connections & Import Settings
  | 'merchandiser-recommendations' // Merchandiser: Recommendations Dashboard (From Screenshot 1)
  | 'merchandiser-approve'         // Merchandiser: Review & Approve Product Group (From Screenshot 2)
  | 'merchandiser-campaign-draft'  // Merchandiser: Campaign Draft & Publish
  | 'merchandiser-campaign-status' // Merchandiser: Published / Waiting Campaign Status
  | 'merchandiser-utility-profile' // Merchandiser: Utility Profile & Priority Weights
  | 'merchandiser-refine-criteria' // Merchandiser: Rework / Refine Criteria
  | 'merchandiser-ab-simulation'   // Merchandiser: A/B Simulation Setup
  | 'merchandiser-compare-simulation' // Merchandiser: Compare A/B Simulation
  | 'merchandiser-keep-layout-a'      // Merchandiser: Keep Layout A Review
  | 'f03-utility'
  | 'f03-expiry-window'
  | 'f03-configuration'
  | 'f03-product-scores'
  | 'f03-preview'
  | 'f03-snapshot'
  | 'store-inventory' // F02 Store Admin: Product & Inventory
  | 'store-edit-product' // F02 Store Admin: Edit Product Page
  | 'store-categories' // F02 Store Admin: Category Management
  | 'store-batches' // F02 Store Admin: Inventory Batch Management
  | 'login'           // Auth: Login Page
  | 'register'        // Auth: Registration Page
  | 'activate'        // Auth: Staff Account Activation with OTP
  | 'profile'         // Auth: Current User Profile & Security Settings
  | 'customer-storefront'; // Customer: Storefront Kiosk & Basket Recommendations
