import type { ProductItem } from '../../../types/storeInventory';

export type CustomerStoreId = 'store-d1' | 'store-q1' | 'store-c1' | 'store-n1';

export interface CustomerProduct extends ProductItem {
  storeId: CustomerStoreId;
  brand: string;
  image: string;
  unit: string;
}

type DemoProductRow = [
  id: string, name: string, brand: string, category: string,
  image: string, unit: string, priceVnd: number, stockQuantity: number,
];

const storePrefixes: Record<CustomerStoreId, string> = {
  'store-d1': 'TD', 'store-q1': 'BD', 'store-c1': 'HC', 'store-n1': 'NK',
};

function catalog(storeId: CustomerStoreId, rows: DemoProductRow[]): CustomerProduct[] {
  return rows.map(([id, name, brand, category, image, unit, priceVnd, stockQuantity], index) => ({
    id: `${storePrefixes[storeId].toLowerCase()}-${id}`,
    sku: `RS-${storePrefixes[storeId]}-${String(index + 1).padStart(3, '0')}`,
    storeId, name, brand, category, unit, priceVnd, stockQuantity,
    image: image.startsWith('/') ? image : `/images/customer-home/fresh/${image}`,
    status: stockQuantity <= 10 ? 'Low Stock' : 'In Stock',
    thumbnail: '🛒',
    isActive: true,
  }));
}

/** Illustrative, store-owned inventory. No catalog is reused as another store's fallback. */
export const CUSTOMER_PRODUCTS: CustomerProduct[] = [
  ...catalog('store-d1', [
    ['broccoli', 'Fresh Green Broccoli', 'Retail Greens', 'Vegetables', 'broccoli.png', 'head', 28000, 32],
    ['cucumber', 'Crisp Green Cucumbers', 'Green Garden', 'Vegetables', 'cucumber.webp', 'kg', 18000, 46],
    ['bell-pepper', 'Green Bell Peppers', 'Green Garden', 'Vegetables', 'green-bell-pepper.webp', 'pack', 32000, 24],
    ['red-onion', 'Red Onions', 'Harvest Roots', 'Vegetables', 'red-onions.webp', 'kg', 26000, 38],
    ['potato', 'Golden Potatoes', 'Harvest Roots', 'Vegetables', 'potatoes.webp', 'kg', 24000, 52],
    ['chili', 'Fresh Green Chili Peppers', 'Green Garden', 'Vegetables', 'green-chili-pepper.webp', 'pack', 15000, 18],
  ]),
  ...catalog('store-q1', [
    ['bread', 'Fresh Sliced Bread', 'The Good Loaf', 'Bakery', 'bread-loaf.png', 'loaf', 45000, 20],
    ['milk', 'Fresh Whole Milk', 'Meadow Dairy', 'Dairy & Eggs', 'milk.webp', 'bottle', 34000, 35],
    ['eggs', 'Farm Fresh Eggs', 'Morning Farm', 'Dairy & Eggs', 'eggs.webp', 'box', 36000, 28],
    ['honey', 'Golden Honey', 'Sunny Hive', 'Pantry', 'honey-jar.webp', 'jar', 89000, 15],
    ['coffee', 'Nescafe Instant Coffee', 'Nescafe', 'Beverages', 'nescafe-coffee.webp', 'jar', 78000, 22],
    ['ice-cream', 'Creamy Vanilla Ice Cream', 'Meadow Dairy', 'Frozen', 'ice-cream.webp', 'tub', 42000, 12],
  ]),
  ...catalog('store-c1', [
    ['apple', 'Crisp Red Apple', 'Orchard & Co.', 'Fruits', 'apple.png', 'kg', 65000, 40],
    ['orange', 'Sweet Premium Orange', 'Orchard & Co.', 'Fruits', 'orange.png', 'kg', 48000, 42],
    ['lime', 'Fresh Zesty Limes', 'Citrus Grove', 'Fruits', 'lime.png', 'kg', 22000, 30],
    ['strawberry', 'Fresh Strawberries', 'Berry Fields', 'Fruits', 'strawberry.webp', 'punnet', 79000, 16],
    ['kiwi', 'Green Kiwi Fruit', 'Orchard & Co.', 'Fruits', 'kiwi.webp', 'pack', 68000, 24],
    ['juice', 'Fresh Citrus Juice', 'Pressed & Pure', 'Beverages', 'juice.webp', 'bottle', 39000, 32],
  ]),
  ...catalog('store-n1', [
    ['rice', 'Jasmine White Rice 5 kg', 'Daily Pantry', 'Pantry', 'rice.webp', 'bag', 125000, 26],
    ['cooking-oil', 'Everyday Cooking Oil 1 L', 'Kitchen Basics', 'Pantry', 'cooking-oil.webp', 'bottle', 62000, 34],
    ['fish', 'Fish Steak 500 g', 'Blue Catch', 'Meat & Seafood', 'fish-steak.webp', 'pack', 98000, 18],
    ['noodles', 'Hao Hao Instant Noodles', 'Acecook', 'Instant Food', '/images/products/haohao.jpg', 'pack', 4500, 90],
    ['beef', 'Beef Steak 500 g', 'Prime Cuts', 'Meat & Seafood', 'beef-steak.webp', 'pack', 185000, 14],
    ['chicken', 'Chicken Meat 500 g', 'Morning Farm', 'Meat & Seafood', 'chicken-meat.webp', 'pack', 85000, 21],
  ]),
];

export function getCustomerProducts(storeId: string): CustomerProduct[] {
  return CUSTOMER_PRODUCTS.filter(product => product.storeId === storeId);
}

export function getCustomerCategories(storeId: string): string[] {
  return [...new Set(getCustomerProducts(storeId).map(product => product.category))];
}

export function formatCustomerPrice(priceVnd: number): string {
  return `${new Intl.NumberFormat('en-US').format(priceVnd)} VND`;
}
