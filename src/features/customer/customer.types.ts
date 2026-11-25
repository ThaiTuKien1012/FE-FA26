export interface PublicStore { storeSlug: string; name: string; }
export interface PublicCategory { categoryId: number; name: string; }
export interface CustomerDisplayProduct {
  productId: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  unit: string;
  sellingPrice: number;
  category: PublicCategory | null;
  availability: 'AVAILABLE' | 'UNAVAILABLE';
}
export interface StorefrontProductPage {
  items: CustomerDisplayProduct[];
  page: number;
  pageSize: number;
  totalElements: number;
}
export interface HomePlacement {
  type: string;
  blockNo: number;
  startPosition: number;
  products: CustomerDisplayProduct[];
}
export interface StorefrontHome {
  store: PublicStore;
  campaignName: string | null;
  fallbackType: 'DEFAULT_CATALOG' | null;
  zones: { name: string; placements: HomePlacement[] }[];
  catalog: { categoryId: number | null; name: string; products: CustomerDisplayProduct[] }[];
}
