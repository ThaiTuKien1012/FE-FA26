import type { CustomerStoreId } from './customerCatalog';

export interface CustomerBanner {
  id: string;
  label: string;
  eyebrow: string;
  headline: [string, string];
  description: string;
  ctaLabel: string;
  image?: string;
  imageAlt?: string;
  background: string;
  ink: string;
  accent: string;
  storeId?: CustomerStoreId;
}

export const CUSTOMER_BANNERS: CustomerBanner[] = [
  {
    id: 'welcome', label: 'Your neighborhood', eyebrow: 'YOUR EVERYDAY MARKET',
    headline: ['Your local stores.', 'One happy place.'],
    description: 'Discover neighborhood stores and the brands you love. A little goodness, every day.',
    ctaLabel: 'Explore products', background: '#d9f1e5', ink: '#073b30', accent: '#088178',
  },
  {
    id: 'garden', label: 'Garden fresh', eyebrow: 'FRESH FINDS. FEEL-GOOD DAYS.',
    headline: ['A little greener.', 'A lot more goodness.'],
    description: 'Crisp greens and colorful ingredients for your everyday cooking.',
    ctaLabel: 'Shop Thao Dien', storeId: 'store-d1',
    image: '/images/customer-home/banners/garden.jpg',
    imageAlt: 'A paper grocery bag filled with fresh vegetables on a mint green tabletop',
    background: '#e4efdf', ink: '#173e2d', accent: '#236e50',
  },
  {
    id: 'morning', label: 'Slow mornings', eyebrow: 'SMALL RITUALS. HAPPY MORNINGS.',
    headline: ['Good mornings', 'start here.'],
    description: 'Fresh bread, milk, and breakfast favorites. Make room for a slower start.',
    ctaLabel: 'Shop Ba Dinh', storeId: 'store-q1',
    image: '/images/customer-home/banners/morning.jpg',
    imageAlt: 'Artisan bread, milk, eggs, and honey in warm morning light',
    background: '#f8e4c9', ink: '#683c25', accent: '#995735',
  },
  {
    id: 'fruit', label: 'A brighter bite', eyebrow: 'FRESH FRUIT. BRIGHTER MOODS.',
    headline: ['A little sunshine', 'in every basket.'],
    description: 'Juicy citrus, sweet berries, and refreshing sips for brighter days.',
    ctaLabel: 'Shop Hai Chau', storeId: 'store-c1',
    image: '/images/customer-home/banners/fruit.jpg',
    imageAlt: 'Fresh citrus, berries, kiwi, and orange juice on a lavender display',
    background: '#d6c7eb', ink: '#41345f', accent: '#6e528b',
  },
  {
    id: 'pantry', label: 'Everyday essentials', eyebrow: 'FAMILIAR FAVORITES. ALWAYS WELCOME.',
    headline: ['A well-stocked kitchen.', 'A happy home.'],
    description: 'The pantry staples and everyday ingredients that bring your meals together.',
    ctaLabel: 'Shop Ninh Kieu', storeId: 'store-n1',
    image: '/images/customer-home/banners/pantry.jpg',
    imageAlt: 'Jasmine rice, golden cooking oil, and rice stalks on a soft sage background',
    background: '#e8e6d1', ink: '#424d2c', accent: '#647342',
  },
];
