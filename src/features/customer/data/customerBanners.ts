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
    id: 'welcome', label: 'Cửa hàng quanh bạn', eyebrow: 'MUA SẮM MỖI NGÀY',
    headline: ['Cửa hàng quen thuộc.', 'Mua sắm dễ dàng.'],
    description: 'Khám phá sản phẩm từ nhiều cửa hàng trong cùng một nơi.',
    ctaLabel: 'Xem sản phẩm', background: '#d9f1e5', ink: '#073b30', accent: '#088178',
  },
  {
    id: 'garden', label: 'Rau củ tươi', eyebrow: 'RAU CỦ CHO BỮA ĂN HẰNG NGÀY',
    headline: ['Tươi hơn mỗi ngày.', 'Đủ món cho căn bếp.'],
    description: 'Rau củ và nguyên liệu quen thuộc từ cửa hàng Thảo Điền.',
    ctaLabel: 'Đến cửa hàng Thảo Điền', storeId: 'store-d1',
    image: '/images/customer-home/banners/garden.jpg',
    imageAlt: 'A paper grocery bag filled with fresh vegetables on a mint green tabletop',
    background: '#e4efdf', ink: '#173e2d', accent: '#236e50',
  },
  {
    id: 'morning', label: 'Bữa sáng', eyebrow: 'BẮT ĐẦU NGÀY MỚI',
    headline: ['Bữa sáng ngon', 'bắt đầu tại đây.'],
    description: 'Bánh mì, sữa và những món quen thuộc cho buổi sáng.',
    ctaLabel: 'Đến cửa hàng Ba Đình', storeId: 'store-q1',
    image: '/images/customer-home/banners/morning.jpg',
    imageAlt: 'Artisan bread, milk, eggs, and honey in warm morning light',
    background: '#f8e4c9', ink: '#683c25', accent: '#995735',
  },
  {
    id: 'fruit', label: 'Trái cây', eyebrow: 'TRÁI CÂY VÀ ĐỒ UỐNG',
    headline: ['Trái cây tươi', 'cho ngày thêm vui.'],
    description: 'Cam, dâu và những món uống mát lành.',
    ctaLabel: 'Đến cửa hàng Hải Châu', storeId: 'store-c1',
    image: '/images/customer-home/banners/fruit.jpg',
    imageAlt: 'Fresh citrus, berries, kiwi, and orange juice on a lavender display',
    background: '#d6c7eb', ink: '#41345f', accent: '#6e528b',
  },
  {
    id: 'pantry', label: 'Hàng thiết yếu', eyebrow: 'ĐỦ ĐẦY GIAN BẾP',
    headline: ['Gian bếp đủ đầy.', 'Bữa cơm thêm vui.'],
    description: 'Gạo, dầu ăn và nguyên liệu thường dùng cho cả nhà.',
    ctaLabel: 'Đến cửa hàng Ninh Kiều', storeId: 'store-n1',
    image: '/images/customer-home/banners/pantry.jpg',
    imageAlt: 'Jasmine rice, golden cooking oil, and rice stalks on a soft sage background',
    background: '#e8e6d1', ink: '#424d2c', accent: '#647342',
  },
];
