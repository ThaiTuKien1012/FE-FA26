export type ProductGroupType = 'Cross-sell' | 'Bought together' | 'Banner' | 'Impulse';
export type ProductGroupStatus = 'Pending' | 'Approved' | 'Rejected';

export interface GroupItemDetail {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  utilityContribution: number;
  marginPct: number;
  image?: string;
}

export interface RecommendedProductGroup {
  id: string;
  groupName: string;
  itemsCount: number;
  type: ProductGroupType;
  utilityScore: number;
  status: ProductGroupStatus;
  sourceMiningRun: string; // e.g. '#0024'
  miningRunDetails: string; // e.g. 'EFIM · Sales Q3'
  items: GroupItemDetail[];
  expectedBasketLiftPct: number;
  projectedMarginPct: number;
  coOccurrenceCount: number;
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
