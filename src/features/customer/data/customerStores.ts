import { getCustomerProducts } from './customerCatalog';

/** Shared demo stores for the public landing page and existing storefront. */
export const CUSTOMER_STORES = [
  {
    id: 'store-d1', name: 'Tạp hóa Thảo Điền', englishName: 'Thao Dien Market',
    area: 'Thành phố Thủ Đức', englishArea: 'Thu Duc City', address: '18 Xuân Thủy',
    englishAddress: '18 Xuan Thuy Street', closesAt: '22:00',
    description: 'Góc nhỏ đầy đủ món ngon cho căn bếp hằng ngày.', hours: 'Mở cửa đến 22:00',
    englishDescription: 'A fresh vegetable market for your everyday cooking.',
    logo: '/images/store-logos/thao-dien-market.svg', color: '#eaf5ef',
    productIds: getCustomerProducts('store-d1').map(product => product.id),
  },
  {
    id: 'store-q1', name: 'Tạp hóa Ba Đình', englishName: 'Ba Dinh Daily',
    area: 'Quận Ba Đình', englishArea: 'Ba Dinh District', address: '42 Liễu Giai',
    englishAddress: '42 Lieu Giai Street', closesAt: '22:00',
    description: 'Nhanh gọn, tiện đường, luôn có món bạn cần.', hours: 'Mở cửa đến 22:00',
    englishDescription: 'Bread, dairy, eggs and little breakfast favorites.',
    logo: '/images/store-logos/ba-dinh-daily.svg', color: '#fcf1e6',
    productIds: getCustomerProducts('store-q1').map(product => product.id),
  },
  {
    id: 'store-c1', name: 'Tạp hóa Hải Châu', englishName: 'Hai Chau Grocer',
    area: 'Quận Hải Châu', englishArea: 'Hai Chau District', address: '07 Bạch Đằng',
    englishAddress: '07 Bach Dang Street', closesAt: '21:30',
    description: 'Những lựa chọn tươi mới cho ngày ở thành phố biển.', hours: 'Mở cửa đến 21:30',
    englishDescription: 'Colorful fruit and refreshing drinks for bright days.',
    logo: '/images/store-logos/hai-chau-grocer.svg', color: '#fff6e4',
    productIds: getCustomerProducts('store-c1').map(product => product.id),
  },
  {
    id: 'store-n1', name: 'Tạp hóa Ninh Kiều', englishName: 'Ninh Kieu Market',
    area: 'Quận Ninh Kiều', englishArea: 'Ninh Kieu District', address: '11 Hai Bà Trưng',
    englishAddress: '11 Hai Ba Trung Street', closesAt: '22:00',
    description: 'Tiệm thân quen bên sông, ghé là có đủ.', hours: 'Mở cửa đến 22:00',
    englishDescription: 'Pantry staples and ingredients for your next meal.',
    logo: '/images/store-logos/ninh-kieu-market.svg', color: '#edf4e6',
    productIds: getCustomerProducts('store-n1').map(product => product.id),
  },
];

export type CustomerStore = (typeof CUSTOMER_STORES)[number];

const STORE_STORAGE_KEY = 'retailspace_customer_store';

export function getCustomerStoreId(): string {
  try {
    const stored = sessionStorage.getItem(STORE_STORAGE_KEY);
    if (CUSTOMER_STORES.some(store => store.id === stored)) return stored!;
  } catch {
    // Browsing remains available when browser storage is disabled.
  }
  return CUSTOMER_STORES[0].id;
}

export function rememberCustomerStore(storeId: string): void {
  if (!CUSTOMER_STORES.some(store => store.id === storeId)) return;
  try {
    sessionStorage.setItem(STORE_STORAGE_KEY, storeId);
  } catch {
    // Store selection still works for the current page.
  }
}
