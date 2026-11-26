const wholeDong = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

/** VND prices are nonnegative. Intl rounds half up at zero fraction digits. */
export function formatCustomerMoney(value: number | null | undefined): string {
  return value == null ? 'Chưa có giá' : `${wholeDong.format(value)} ₫`;
}
