import { formatDateTime } from '../../utils/dateTime';
import type { F02Batch, F02BatchCreateRequest, F02BatchPatchRequest, F02Category, F02ProductRequest, F02Status } from './store.api';

export const storeTimeZone: string = import.meta.env?.VITE_PASPM_STORE_TIME_ZONE || 'Asia/Ho_Chi_Minh';
export const money = (value: number) => `${value.toLocaleString('en-GB', { maximumFractionDigits: 20 })} ₫`;

export function storeDate(now = new Date(), timeZone = storeTimeZone): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function localDateTime(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export const receivedDateTime = (value: string) => formatDateTime(value, storeTimeZone);

const text = (value: string, label: string, max: number) => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) throw new Error(`${label} is required and must be at most ${max} characters.`);
  return trimmed;
};
const price = (value: string, label: string) => {
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(value.trim()) || !Number.isFinite(Number(value)) || Number(value) < 0) throw new Error(`${label} must be a valid non-negative number.`);
  const normalize = (decimal: string) => { const [whole, fraction = ''] = decimal.trim().split('.'); const digits = fraction.replace(/0+$/, ''); return `${whole.replace(/^0+/, '') || '0'}${digits ? `.${digits}` : ''}`; };
  if (normalize(value) !== normalize(Number(value).toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 }))) throw new Error(`${label} is too large or has too many decimal places to save accurately.`);
  return Number(value);
};
const quantity = (value: string, min: number, max = 2147483647) => {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) throw new Error(`Quantity must be a whole number between ${min} and ${max}.`);
  return Number(value);
};
function dateValue(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error('Please enter a valid date.');
}
export function validatePushDay(pushDay: string, expiryDate: string): string {
  try { if (pushDay) dateValue(pushDay); if (expiryDate) dateValue(expiryDate); } catch { return 'Please enter a valid date.'; }
  return pushDay && expiryDate && pushDay > expiryDate ? 'Push Day must be on or before the expiry date.' : '';
}

export interface ProductForm { name: string; unit: string; categoryId: string; requiresExpiry: boolean; sellingPrice: string; costPrice: string; status: F02Status; imageUrl: string; description: string; }
export const emptyProductForm: ProductForm = { name: '', unit: 'Piece', categoryId: '', requiresExpiry: false, sellingPrice: '0', costPrice: '0', status: 'ACTIVE', imageUrl: '', description: '' };
export const IMAGE_URL_MAX = 2048, DESCRIPTION_MAX = 2000;
/** Mirrors the Backend rule (ProductService.validateImageUrl): blank → null, otherwise an absolute http(s) URL with a host. */
export function imageUrlValue(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;
  if (trimmed.length > IMAGE_URL_MAX) throw new Error(`Image URL must be at most ${IMAGE_URL_MAX} characters.`);
  let url: URL;
  try { url = new URL(trimmed); } catch { throw new Error('Image URL must be an absolute HTTP or HTTPS address.'); }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error('Image URL must be an absolute HTTP or HTTPS address.');
  return trimmed;
}
export function descriptionValue(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;
  if (trimmed.length > DESCRIPTION_MAX) throw new Error(`Description must be at most ${DESCRIPTION_MAX} characters.`);
  return trimmed;
}
export function productRequest(form: ProductForm, categories: F02Category[]): F02ProductRequest {
  if (!['ACTIVE', 'INACTIVE'].includes(form.status)) throw new Error('Choose Active or Inactive.');
  const categoryId = form.categoryId ? Number(form.categoryId) : null;
  if (categoryId !== null && !categories.some(c => c.id === categoryId)) throw new Error('Choose a category available in this store.');
  return { name: text(form.name, 'Product name', 180), unit: text(form.unit, 'Unit', 40), categoryId,
    requiresExpiry: form.requiresExpiry, sellingPrice: price(form.sellingPrice, 'Selling price'), costPrice: price(form.costPrice, 'Cost price'), status: form.status,
    imageUrl: imageUrlValue(form.imageUrl), description: descriptionValue(form.description) };
}
export function categoryRequest(form: { name: string; status: F02Status }) {
  if (!['ACTIVE', 'INACTIVE'].includes(form.status)) throw new Error('Choose Active or Inactive.');
  return { name: text(form.name, 'Category name', 150), status: form.status };
}
export interface BatchForm { receivedAt: string; expiryDate: string; initialQuantity: string; remainingQuantity: string; pushDay: string; }
export const emptyBatchForm = (): BatchForm => ({ receivedAt: localDateTime(), expiryDate: '', initialQuantity: '', remainingQuantity: '', pushDay: '' });
export function batchCreateRequest(form: BatchForm, requiresExpiry: boolean): F02BatchCreateRequest {
  if (requiresExpiry && !form.expiryDate) throw new Error('Please enter an expiry date for this product.');
  const pushError = validatePushDay(form.pushDay, form.expiryDate);
  if (pushError) throw new Error(pushError);
  const received = new Date(form.receivedAt);
  if (!form.receivedAt || !Number.isFinite(received.getTime()) || localDateTime(received) !== form.receivedAt.slice(0, 16)) throw new Error('Please enter a valid received date and time.');
  return { receivedAt: received.toISOString(), expiryDate: form.expiryDate || null,
    initialQuantity: quantity(form.initialQuantity, 1), pushDay: form.pushDay || null };
}
export function batchPatchRequest(batch: F02Batch, form: BatchForm, requiresExpiry = false): F02BatchPatchRequest {
  if (requiresExpiry && !form.expiryDate) throw new Error('Please enter an expiry date for this product.');
  if (batch.expiryDate && !form.expiryDate) throw new Error('Use Clear Expiry Date to remove the saved date.');
  const remainingQuantity = quantity(form.remainingQuantity, 0, batch.initialQuantity);
  const pushError = validatePushDay(form.pushDay, form.expiryDate);
  if (pushError) throw new Error(pushError);
  if (batch.pushDay && !form.pushDay) throw new Error('Use Clear Push Day to remove the saved date.');
  const patch: F02BatchPatchRequest = {};
  if (form.expiryDate && form.expiryDate !== batch.expiryDate) patch.expiryDate = form.expiryDate;
  if (remainingQuantity !== batch.remainingQuantity) patch.remainingQuantity = remainingQuantity;
  if (form.pushDay && form.pushDay !== batch.pushDay) patch.pushDay = form.pushDay;
  if (!Object.keys(patch).length) throw new Error('No changes to save.');
  return patch;
}
