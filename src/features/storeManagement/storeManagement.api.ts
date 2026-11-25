import { authService } from '../../services/authService';

export type StoreStatus = 'ACTIVE' | 'INACTIVE';
export type ImageKind = 'icon' | 'banner';
export interface StoreView {
  storeId: number;
  name: string;
  slug: string;
  status: StoreStatus;
  address: string | null;
  phone: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
  deactivatedAt: string | null;
}
export interface StoreDetail extends StoreView {
  deactivatedBy: number | null;
  assignedUserCount: number;
  assignedUsers: { userId: number; name: string | null; email: string; role: string; status: string }[];
}
export interface StorePage { items: StoreView[]; page: number; pageSize: number; totalElements: number }
type Contact = { address: string | null; phone: string | null };
export type StoreInput = { name: string; slug: string } & Partial<Contact>;

export class StoreConflict extends Error {}

async function response(path: string, init?: RequestInit) {
  const res = await authService.request(path, init);
  if (res.ok) return res;
  const payload = await res.json().catch(() => null);
  const message = typeof payload?.error === 'string' ? payload.error : 'Store request failed (' + res.status + ').';
  if (res.status === 409 && message === 'Store version conflict') throw new StoreConflict(message);
  throw new Error(message);
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  return (await response(path, init)).json();
}

function write(method: string, data: object): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}

const systemStores = '/api/system/stores';
const profile = '/api/store/profile';
const imagePath = (id: number, kind: ImageKind) => '/api/stores/' + id + '/images/' + kind;

export const getStoreDetail = (id: number, signal?: AbortSignal) => json<StoreDetail>(systemStores + '/' + id, { signal });

export const storesApi = {
  list(page: number, q: string, status: StoreStatus | 'ALL', signal?: AbortSignal) {
    const params = new URLSearchParams({ page: String(page), pageSize: '20', q, status });
    return json<StorePage>(systemStores + '?' + params, { signal });
  },
  create: (data: StoreInput) => json<StoreDetail>(systemStores, write('POST', data)),
  detail: getStoreDetail,
  update: (id: number, data: Required<StoreInput> & { expectedVersion: number }) =>
    json<StoreDetail>(systemStores + '/' + id, write('PUT', data)),
  status: (id: number, expectedVersion: number, status: StoreStatus) =>
    json<StoreDetail>(systemStores + '/' + id + '/status', write('PATCH', { expectedVersion, status })),
  profile: (signal?: AbortSignal) => json<StoreView>(profile, { signal }),
  updateProfile: (data: Contact & { expectedVersion: number }) => json<StoreView>(profile, write('PUT', data)),
  readImage: async (id: number, kind: ImageKind, signal?: AbortSignal) =>
    (await response(imagePath(id, kind), { signal })).blob(),
  upload(id: number, kind: ImageKind, file: File) {
    const body = new FormData();
    body.set('file', file);
    return json<StoreView>(imagePath(id, kind), { method: 'PUT', body });
  },
  remove: (id: number, kind: ImageKind) => json<StoreView>(imagePath(id, kind), { method: 'DELETE' }),
};

async function decodeImage(file: Blob) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  bitmap.close();
  return { width, height };
}

export async function validateStoreImage(file: File, kind: ImageKind, decode = decodeImage) {
  const maxMiB = kind === 'icon' ? 1 : 5;
  if (file.size > maxMiB * 1024 * 1024) throw new Error('Maximum file size is ' + maxMiB + ' MiB.');
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte);
  const jpeg = [255, 216, 255].every((byte, i) => bytes[i] === byte);
  if (!png && !jpeg) throw new Error('Choose a PNG or JPEG image.');
  const { width, height } = await decode(file).catch(() => { throw new Error('This image could not be decoded.'); });
  if (width > 4000 || height > 4000) throw new Error('Maximum image dimensions are 4000 × 4000 pixels.');
}
