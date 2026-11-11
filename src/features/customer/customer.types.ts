export * from '../../types/storeInventory';
import type { ProductItem } from '../../types/storeInventory';

export type CustomerDisplayProduct = ProductItem & { brand?: string };
