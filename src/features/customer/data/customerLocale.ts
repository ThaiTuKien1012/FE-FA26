const categoryLabels: Record<string, string> = {
  'All Products': 'Tất cả sản phẩm', Vegetables: 'Rau củ', Snacks: 'Đồ ăn vặt', Fruits: 'Trái cây',
  Bakery: 'Bánh mì', 'Dairy & Eggs': 'Sữa & trứng', Pantry: 'Đồ khô', Beverages: 'Đồ uống',
  Frozen: 'Đông lạnh', 'Meat & Seafood': 'Thịt & hải sản', 'Instant Food': 'Đồ ăn nhanh',
  'Personal Care': 'Chăm sóc cá nhân',
};

const unitLabels: Record<string, string> = {
  head: 'cái', kg: 'kg', pack: 'gói', loaf: 'ổ', bottle: 'chai', box: 'hộp',
  jar: 'hũ', tub: 'hộp', cup: 'hộp', bar: 'thanh', punnet: 'hộp', bag: 'bao',
};

export const categoryLabel = (category: string) => categoryLabels[category] || category;
export const unitLabel = (unit: string) => unitLabels[unit] || unit;
export const normalizeCustomerSearch = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
