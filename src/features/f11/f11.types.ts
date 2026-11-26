export interface SnapshotUtility {
  snapshotId: number;
  rangeStart: string;
  rangeEnd: string;
  analysisDate: string;
  createdAt: string;
  totalWeightedUtility: number;
}
export interface Period { from: string; to: string }
export interface AdditionFilter { from?: string; to?: string; campaignId?: number }
export interface BundleAdditions extends Period {
  timeZone: string;
  campaignId: number | null;
  totalAddActions: number;
  addActionsByOrigin: Record<'MINED' | 'MANUAL', number>;
  totalAddedProductUnits: number;
  days: Array<{ date: string; addActionsByOrigin: Record<'MINED' | 'MANUAL', number>; addedProductUnits: number }>;
}
