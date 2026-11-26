import { formatWholeVnd } from '../../utils/money';

export function formatCustomerMoney(value: number | null | undefined): string {
  return value == null ? 'Chưa có giá' : `${formatWholeVnd(value, 'vi-VN')} ₫`;
}
