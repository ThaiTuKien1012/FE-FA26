export type ProductGroupType = 'Cross-sell' | 'Bought together' | 'Banner' | 'Impulse';
export type ProductGroupStatus = 'Pending' | 'Approved' | 'Rejected';

export interface GroupItemDetail {
  id: string;
  name: string;
  category: string;
  sku?: string;
  iconType?: 'juice' | 'water' | 'snack' | 'energy' | 'coffee' | 'default';
  unitPrice: number;
  utilityContribution: number;
  marginPct: number;
  image?: string;
}

export interface RecommendedProductGroup {
  id: string;
  groupCode?: string; // e.g. 'REC-014'
  groupName: string;
  itemsCount: number;
  type: ProductGroupType;
  utilityScore: number;
  status: ProductGroupStatus;
  sourceMiningRun: string; // e.g. '#0024'
  miningRunDetails: string; // e.g. 'EFIM · Sales Q3'
  sourceDataPeriod?: string; // e.g. 'Sales Q3 2026'
  items: GroupItemDetail[];
  expectedBasketLiftPct: number;
  projectedMarginPct: number;
  coOccurrenceCount: number;
  suggestedPlacement?: string; // e.g. 'Beverages + Snacks · Adjacent gondola endcap'
  utilityThresholdNote?: string; // e.g. 'Utility threshold > 980'
  layoutTarget?: 'Layout A' | 'Layout B' | 'Promotional Endcap' | null;
  notes?: string;
}

export interface UtilityProfileConfig {
  profitMarginWeight: number; // e.g. 40%
  unitVelocityWeight: number; // e.g. 35%
  basketExpansionWeight: number; // e.g. 25%
  minUtilityCutoff: number; // e.g. 500
  minConfidencePct: number; // e.g. 60%
  coOccurrenceThreshold: number; // e.g. 150
}
