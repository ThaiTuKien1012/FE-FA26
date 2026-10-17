export type ProductCategory = 
  | 'Snacks' 
  | 'Beverages' 
  | 'Instant Food' 
  | 'Dairy' 
  | 'Personal Care' 
  | 'Household'
  | (string & {});

export type ProductStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export interface ProductItem {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  priceVnd: number;
  stockQuantity: number;
  status: ProductStatus;
  thumbnail: string;
  image?: string;
  isActive?: boolean;
  unit?: string;
  barcode?: string;
  updatedAt?: string;
  costPriceVnd?: number;
  shelfLocation?: string;
  minStockAlert?: number;
  supplier?: string;
  description?: string;
  vatRate?: number;
  targetUtilityScore?: number;
}

export interface InventoryStats {
  totalProducts: number;
  totalProductsDelta: string;
  activeProducts: number;
  activeProductsPercentage: number;
  lowStock: number;
  lowStockDelta: string;
  outOfStock: number;
  outOfStockDelta: string;
}

export interface TransactionBatch {
  id: string; // e.g. #B-024
  filename: string; // sales_q3_2026.csv
  records: number; // 1,200
  fileSize: string; // 2.6 MB
  status: 'Completed' | 'Needs review' | 'Processing';
  uploadedAt: string;
}

export interface TransactionPreviewItem {
  txnId: string; // TX-1001
  orderStatus: 'Accepted' | 'Canceled' | 'Rejected';
  amount: number | null; // e.g. 120000, 45000, null
}

export interface CampaignGroup {
  id: string; // 01
  name: string; // Beverages
  productsCount: number; // 5
}

export interface CampaignActivationDetail {
  id: string; // CMP-024
  name: string; // Summer Drink Bundle
  store: string; // Store A
  status: 'Active' | 'Pending' | 'Draft';
  productGroups: CampaignGroup[];
  merchandiserApproved: boolean;
  campaignPublished: boolean;
  storeVerified: boolean;
}

export type StoreNavScreen = 
  | 'store-inventory'
  | 'store-edit-product'
  | 'store-categories'
  | 'store-batches';
