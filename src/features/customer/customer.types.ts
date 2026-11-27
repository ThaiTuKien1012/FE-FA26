export type Availability = 'AVAILABLE' | 'OUT_OF_STOCK';
export type StoreSummary = { storeSlug: string; name: string; iconUrl: string | null; bannerUrl: string | null };
export type StoreProduct = {
  productId: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  unit: string;
  sellingPrice: number;
  category: { categoryId: number; name: string } | null;
  availability: Availability;
};
export type Placement = {
  type: 'BUNDLE' | 'CROSS_SELL' | 'FBT' | 'BANNER';
  blockNo: number;
  startPosition: number;
  products: StoreProduct[];
  bundleKey?: string;
};
export type StoreHome = {
  store: StoreSummary;
  campaignName: string | null;
  fallbackType: 'DEFAULT_CATALOG' | null;
  zones: { name: string; placements: Placement[] }[];
  catalog: { categoryId: number | null; name: string; products: StoreProduct[] }[];
};
export type ProductQuery = {
  search?: string;
  categoryId?: number;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'sellingPrice';
  sortDirection?: 'asc' | 'desc';
};
export type StoreProductPage = { items: StoreProduct[]; page: number; pageSize: number; totalElements: number };

// The wire format is numeric int64. Store identifier and version lexemes as decimal strings.
export type CartLine = {
  itemId: string;
  productId: number;
  name: string | null;
  imageUrl: string | null;
  unit: string | null;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
  state: Availability | 'NO_LONGER_AVAILABLE';
  addedFromBundle?: boolean;
};
export type CartView = {
  cartId: string | null;
  store: StoreSummary;
  version: string;
  currency: 'VND';
  updatedAt: string | null;
  items: CartLine[];
  subtotal: number | null;
};
export type BundleComponent = { productId: number; requested: number; added: number };
export type BundleAddResult = { cart: CartView; components: BundleComponent[] };
