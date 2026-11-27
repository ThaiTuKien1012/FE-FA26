// Decorative artwork only. No Store, product, price or promotion claim lives here: the Store
// slides of the home carousel take their name, icon and banner from the real F09 Store list.
export interface BannerArt {
  image: string;
  imageAlt: string;
  background: string;
  ink: string;
  accent: string;
}

export const BANNER_ART: BannerArt[] = [
  {
    image: '/images/customer-home/banners/garden.jpg',
    imageAlt: 'A paper grocery bag filled with fresh vegetables on a mint green tabletop',
    background: '#e4efdf', ink: '#173e2d', accent: '#236e50',
  },
  {
    image: '/images/customer-home/banners/morning.jpg',
    imageAlt: 'Artisan bread, milk, eggs, and honey in warm morning light',
    background: '#f8e4c9', ink: '#683c25', accent: '#995735',
  },
  {
    image: '/images/customer-home/banners/fruit.jpg',
    imageAlt: 'Fresh citrus, berries, kiwi, and orange juice on a lavender display',
    background: '#d6c7eb', ink: '#41345f', accent: '#6e528b',
  },
  {
    image: '/images/customer-home/banners/pantry.jpg',
    imageAlt: 'Jasmine rice, golden cooking oil, and rice stalks on a soft sage background',
    background: '#e8e6d1', ink: '#424d2c', accent: '#647342',
  },
];

export const WELCOME_BANNER = {
  id: 'welcome', label: 'Cửa hàng quanh bạn', eyebrow: 'MUA SẮM MỖI NGÀY',
  headline: ['Cửa hàng quen thuộc.', 'Mua sắm dễ dàng.'] as [string, string],
  ctaLabel: 'Xem sản phẩm', accent: '#088178',
};
