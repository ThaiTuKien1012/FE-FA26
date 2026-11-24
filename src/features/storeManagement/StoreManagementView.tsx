import { useEffect, useState, useSyncExternalStore } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ImagePlus } from 'lucide-react';
import { getPathForScreen } from '../../utils/navigationRouter';
import { F02Dialog } from '../store/components/F02Dialog';
import {
  StoreConflict, storesApi, validateStoreImage,
  type ImageKind, type StoreDetail, type StorePage, type StoreStatus, type StoreView,
} from './storeManagement.api';

const panel = 'rounded-xl border border-[#E7E2D8] bg-white p-5';
const primary = 'rounded-lg bg-[#1E3A2F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162B23] disabled:opacity-50';
const secondary = 'rounded-lg border border-[#E7E2D8] bg-white px-4 py-2 text-sm font-semibold text-[#1E3A2F] hover:bg-[#EDF5F0] disabled:opacity-50';
const field = 'w-full rounded-lg border border-[#E7E2D8] bg-[#FAF8F5] px-3 py-2 text-sm';
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';
const adminPath = getPathForScreen('admin-stores');
const subscribe = (listen: () => void) => {
  window.addEventListener('popstate', listen);
  return () => window.removeEventListener('popstate', listen);
};
const locationSearch = () => window.location.search;
const openStore = (id?: number) => {
  window.history.pushState({ screen: 'admin-stores' }, '', id ? adminPath + '?storeId=' + id : adminPath);
  window.dispatchEvent(new Event('popstate'));
  window.scrollTo(0, 0);
};

function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="rounded-lg border border-[#FFDAD6] bg-[#FDF3F2] p-3 text-sm text-[#962626]">
    {message}
    {retry && <button type="button" className="ml-3 font-semibold underline" onClick={retry}>Retry</button>}
  </div>;
}

function Status({ status }: { status: StoreStatus }) {
  return <span className={'inline-block rounded-full px-2.5 py-1 text-xs font-semibold ' +
    (status === 'ACTIVE' ? 'bg-[#E5F3EB] text-[#1E3A2F]' : 'bg-[#FBECE0] text-[#954A17]')}>
    {status === 'ACTIVE' ? 'Active' : 'Inactive'}
  </span>;
}

function StoreList() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StoreStatus | 'ALL'>('ACTIVE');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<StorePage | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError('');
    storesApi.list(page, query, status, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult(data);
    }).catch(err => {
      if (!controller.signal.aborted) setError(errorMessage(err));
    });
    return () => controller.abort();
  }, [page, query, status, reload]);

  return <>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">Stores</h1>
      <button className={primary} onClick={() => { setCreateError(''); setCreating(true); }}>Create Store</button>
    </div>
    <section className={panel + ' space-y-4'}>
      <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); setPage(0); setQuery(search.trim()); }}>
        <label className="min-w-48 flex-1 text-sm font-semibold">Search Stores
          <input type="search" className={field + ' mt-1'} placeholder="Name or slug" value={search} onChange={e => {
            setSearch(e.target.value);
            if (!e.target.value) { setPage(0); setQuery(''); }
          }} />
        </label>
        <button className={secondary}>Search</button>
        <label className="text-sm font-semibold">Status
          <select className={field + ' mt-1'} value={status} onChange={e => {
            setStatus(e.target.value as StoreStatus | 'ALL');
            setPage(0);
          }}>
            <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ALL">All statuses</option>
          </select>
        </label>
      </form>
      {error && <ErrorNotice message={error} retry={() => setReload(n => n + 1)} />}
      {!result && !error && <p role="status" className="text-sm">Loading Stores…</p>}
      {result && <>
        {result.items.length === 0 ? <p className="py-8 text-center text-sm text-[#57534E]">No Stores match this search.</p> :
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E7E2D8] bg-[#FAF8F5]"><tr>
                <th className="p-3">Store name</th><th className="p-3">Slug</th><th className="p-3">Status</th><th className="p-3">Address</th>
              </tr></thead>
              <tbody>{result.items.map(store => <tr key={store.storeId} className="border-b border-[#EFECE6]">
                <td className="p-3"><a className="block font-semibold text-[#1E3A2F] underline-offset-4 hover:underline" href={adminPath + '?storeId=' + store.storeId}>
                  {store.name}</a></td>
                <td className="p-3">{store.slug}</td><td className="p-3"><Status status={store.status} /></td>
                <td className="p-3">{store.address || '—'}</td>
              </tr>)}</tbody>
            </table>
          </div>}
        {result.totalElements > result.pageSize && <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
          <span>{result.totalElements} Stores</span>
          <button className={secondary} disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page + 1} of {Math.ceil(result.totalElements / result.pageSize)}</span>
          <button className={secondary} disabled={(page + 1) * result.pageSize >= result.totalElements} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>}
      </>}
    </section>
    {creating && <F02Dialog title="Create Store" busy={busy} onClose={() => setCreating(false)}>
      <StoreForm identity busy={busy} serverError={createError} label="Create Store" onSubmit={async values => {
        setBusy(true); setCreateError('');
        try { openStore((await storesApi.create(values)).storeId); }
        catch (err) { setCreateError(errorMessage(err)); }
        finally { setBusy(false); }
      }} />
    </F02Dialog>}
  </>;
}

type Fields = Pick<StoreView, 'name' | 'slug' | 'address' | 'phone'>;
function StoreForm({ store, identity, busy, serverError, label = 'Save changes', onSubmit }: {
  store?: StoreView; identity: boolean; busy: boolean; serverError: string; label?: string;
  onSubmit: (fields: Fields) => Promise<void>;
}) {
  const [values, setValues] = useState(() => ({
    name: store?.name ?? '', slug: store?.slug ?? '', address: store?.address ?? '', phone: store?.phone ?? '',
  }));
  const [error, setError] = useState('');
  const duplicateField = serverError === 'Store name already exists' ? 'name' : serverError === 'Store slug already exists' ? 'slug' : null;
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = values.name.trim();
    const slug = values.slug.trim();
    const address = values.address.trim();
    const phone = values.phone.trim();
    if (identity && (!name || name.length > 150)) return setError('Enter a Store name of up to 150 characters.');
    if (identity && (slug.length > 50 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))) return setError('Enter a slug of up to 50 lowercase letters, digits or single hyphens between words.');
    if (address.length > 255) return setError('The address can have up to 255 characters.');
    if (phone.length > 30 || !/^[0-9 +().-]*$/.test(phone)) return setError('Enter up to 30 characters using digits, spaces, or + ( ) . -');
    setError('');
    void onSubmit({ name, slug, address: address || null, phone: phone || null });
  }
  const fields = (identity ? ['name', 'slug', 'address', 'phone'] : ['address', 'phone']) as (keyof Fields)[];
  return <form className="space-y-4" onSubmit={submit}>
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
      {fields.map(key => <label key={key} className="text-sm font-semibold">
        {{ name: 'Store name', slug: 'Slug', address: 'Address', phone: 'Phone' }[key]}
        <input className={field + ' mt-1 font-normal'} type={key === 'phone' ? 'tel' : 'text'}
          required={key === 'name' || key === 'slug'} value={values[key]}
          aria-invalid={duplicateField === key || undefined}
          onChange={e => setValues(current => ({ ...current, [key]: e.target.value }))} />
        {duplicateField === key && <span role="alert" className="mt-1 block text-[#962626]">{serverError}</span>}
      </label>)}
    </fieldset>
    {(error || (serverError && !duplicateField)) && <ErrorNotice message={error || serverError} />}
    <button className={primary} disabled={busy}>{label}</button>
  </form>;
}

function Detail({ id, mode }: { id?: number; mode: 'system' | 'manage' | 'read' }) {
  const [record, setRecord] = useState<StoreView | StoreDetail | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [formRevision, setFormRevision] = useState(0);
  const system = mode === 'system';
  const editable = mode !== 'read';
  const detail = record && 'assignedUsers' in record ? record : null;
  const load = (signal?: AbortSignal) => id === undefined ? storesApi.profile(signal) : storesApi.detail(id, signal);

  useEffect(() => {
    const abort = new AbortController();
    setError('');
    load(abort.signal).then(data => {
      if (!abort.signal.aborted) setRecord(data);
    }).catch(err => { if (!abort.signal.aborted) setError(errorMessage(err)); });
    return () => abort.abort();
  }, [id, reload]);

  async function mutate(action: () => Promise<StoreView | StoreDetail>, message: string, options: { refresh?: boolean; resetForm?: boolean } = {}) {
    setBusy(true); setFormError(''); setNotice('');
    try {
      const updated = await action();
      if (options.refresh) {
        try { setRecord(await load()); }
        catch (err) {
          // A write must wait for a fresh read after an image mutation.
          setRecord(null);
          setError(errorMessage(err));
        }
      } else {
        setRecord(updated);
      }
      if (options.resetForm) setFormRevision(n => n + 1);
      setNotice(message);
      setConfirm(false);
    } catch (err) {
      if (err instanceof StoreConflict) {
        setRecord(null);
        setConfirm(false);
        setNotice('This Store changed while you were editing. Review the latest values and try again.');
        setReload(n => n + 1);
      } else if (options.refresh) {
        throw err;
      } else {
        setFormError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  return <>
    {system && <button className={secondary + ' self-start'} onClick={() => openStore()} disabled={busy}>Back to Stores</button>}
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="text-2xl font-bold">{system ? record?.name ?? 'Store details' : 'My Store'}</h1>
      {record && <Status status={record.status} />}
      {detail && <button className={secondary + ' ml-auto'} disabled={busy} onClick={() => { setFormError(''); setConfirm(true); }}>
        {detail.status === 'ACTIVE' ? 'Deactivate Store' : 'Activate Store'}
      </button>}
    </div>
    {notice && <p role="status" className="rounded-lg border border-[#E7E2D8] bg-[#EDF5F0] p-3 text-sm">{notice}</p>}
    {error && <ErrorNotice message={error} retry={() => setReload(n => n + 1)} />}
    {!record && !error && <p role="status" className="text-sm">Loading Store details…</p>}
    {record && <>
      <section className={panel + ' space-y-4'} aria-label="Store information">
        <h2 className="text-lg font-semibold">Store information</h2>
        {!system && <dl className="grid gap-4 sm:grid-cols-2 text-sm">
          <StoreValue label="Store name">{record.name}</StoreValue><StoreValue label="Slug">{record.slug}</StoreValue>
          {!editable && <><StoreValue label="Address">{record.address || '—'}</StoreValue><StoreValue label="Phone">{record.phone || '—'}</StoreValue></>}
        </dl>}
        {editable && <StoreForm key={formRevision} store={record} identity={system} busy={busy}
          serverError={confirm ? '' : formError} onSubmit={fields => mutate(() => system
            ? storesApi.update(record.storeId, { ...fields, expectedVersion: record.version })
            : storesApi.updateProfile({ address: fields.address, phone: fields.phone, expectedVersion: record.version }),
          'Store details saved.', { resetForm: true })} />}
      </section>
      <section className={panel + ' space-y-4'} aria-label="Store images">
        <h2 className="text-lg font-semibold">Store images</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {(['icon', 'banner'] as const).map(kind => <StoreImage key={kind} record={record} kind={kind}
            editable={editable} busy={busy}
            onUpload={file => mutate(() => storesApi.upload(record.storeId, kind, file), 'Store ' + kind + ' saved.', { refresh: true })}
            onRemove={() => mutate(() => storesApi.remove(record.storeId, kind), 'Store ' + kind + ' removed.', { refresh: true })} />)}
        </div>
      </section>
      {detail && <section className={panel + ' space-y-4'} aria-label="Assigned users">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Assigned users ({detail.assignedUserCount})</h2>
          <a className={secondary} href="/admin/users">Users &amp; Roles</a>
        </div>
        {detail.assignedUsers.length === 0 ? <p className="text-sm text-[#57534E]">No users are assigned to this Store.</p> :
          <ul className="divide-y divide-[#EFECE6]">{detail.assignedUsers.map(user => <li key={user.userId} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3 text-sm">
            <div><p className="font-semibold">{user.name || user.email}</p>{user.name && <p className="text-[#57534E]">{user.email}</p>}</div>
            <span>{user.role} · {user.status}</span>
          </li>)}</ul>}
      </section>}
    </>}
    {confirm && detail && <F02Dialog title={detail.status === 'ACTIVE' ? 'Deactivate Store?' : 'Activate Store?'} busy={busy} onClose={() => { setConfirm(false); setFormError(''); }}>
      <p className="mb-4 text-sm">{detail.name} has {detail.assignedUserCount} assigned {detail.assignedUserCount === 1 ? 'user' : 'users'}.
        {detail.status === 'ACTIVE' ? ' They will lose access while the Store is inactive.' : ' They will be able to access the Store again.'}</p>
      {formError && <ErrorNotice message={formError} />}
      <div className="mt-4 flex justify-end gap-2">
        <button className={secondary} disabled={busy} onClick={() => { setConfirm(false); setFormError(''); }}>Cancel</button>
        <button className={primary} disabled={busy} onClick={() => {
          const next = detail.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
          void mutate(() => storesApi.status(detail.storeId, detail.version, next), next === 'ACTIVE' ? 'Store activated.' : 'Store deactivated.');
        }}>{detail.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button>
      </div>
    </F02Dialog>}
  </>;
}

function StoreValue({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt className="text-[#57534E]">{label}</dt><dd className="mt-1 font-semibold">{children}</dd></div>;
}

function StoreImage({ record, kind, editable, busy, onUpload, onRemove }: {
  record: StoreView; kind: ImageKind; editable: boolean; busy: boolean;
  onUpload: (file: File) => Promise<void>; onRemove: () => Promise<void>;
}) {
  const url = kind === 'icon' ? record.iconUrl : record.bannerUrl;
  const [savedPreview, setSavedPreview] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [remove, setRemove] = useState(false);
  const [failed, setFailed] = useState('');
  const imageLabel = kind === 'icon' ? 'Icon' : 'Banner';

  useEffect(() => {
    setSavedPreview('');
    setPreviewError('');
    if (!url || record.status === 'ACTIVE') return;
    const abort = new AbortController();
    let blobUrl = '';
    storesApi.readImage(record.storeId, kind, abort.signal).then(blob => {
      if (abort.signal.aborted) return;
      blobUrl = URL.createObjectURL(blob);
      setSavedPreview(blobUrl);
    }).catch(err => { if (!abort.signal.aborted) setPreviewError(errorMessage(err)); });
    return () => { abort.abort(); if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [url, record.status, record.storeId, kind]);

  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const next = URL.createObjectURL(file);
    setPreview(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  const source = preview || (record.status === 'ACTIVE' ? url : savedPreview);
  return <div className="space-y-3 rounded-lg border border-[#E7E2D8] p-4">
    <h3 className="font-semibold">{imageLabel}</h3>
    <div className="flex h-40 items-center justify-center overflow-hidden rounded-lg bg-[#FAF8F5] text-[#57534E]">
      {source && source !== failed ? <img className="h-full w-full object-contain" src={source} alt={'Store ' + kind} onError={() => setFailed(source)} />
        : <div className="flex items-center gap-2 text-sm"><ImagePlus size={18} aria-hidden />{url && !source && !previewError ? 'Loading image preview…' : 'No preview available'}</div>}
    </div>
    {previewError && <ErrorNotice message={previewError} />}
    {editable && <>
      <label className="block text-sm font-semibold">{url ? 'Replace ' : 'Choose '}{kind}
        <input className="mt-2 block w-full text-sm font-normal file:mr-2 file:rounded file:border-0 file:bg-[#EDF5F0] file:px-2 file:py-1"
          type="file" accept="image/png,image/jpeg" disabled={busy || checking}
          onChange={async e => {
            const selection = e.target.files?.[0];
            e.target.value = '';
            if (!selection) return;
            setFile(null); setError(''); setChecking(true);
            try { await validateStoreImage(selection, kind); setFile(selection); }
            catch (err) { setError(errorMessage(err)); }
            finally { setChecking(false); }
          }} />
      </label>
      <p className="text-xs text-[#57534E]">PNG or JPEG · {kind === 'icon' ? 1 : 5} MiB max · up to 4000 × 4000 px</p>
      <div className="flex flex-wrap gap-2">
        {file && <><button className={primary} disabled={busy} onClick={async () => {
          setError('');
          try { await onUpload(file); setFile(null); } catch (err) { setError(errorMessage(err)); }
        }}>Upload {kind}</button>
        <button className={secondary} disabled={busy} onClick={() => setFile(null)}>Discard preview</button></>}
        {url && <button className={secondary} disabled={busy || checking} onClick={() => { setError(''); setRemove(true); }}>Remove {kind}</button>}
      </div>
    </>}
    {!remove && error && <ErrorNotice message={error} />}
    {remove && <F02Dialog title={'Remove Store ' + kind + '?'} busy={busy} onClose={() => setRemove(false)}>
      <p className="text-sm">This will remove the current image from the Store profile.</p>
      {error && <ErrorNotice message={error} />}
      <div className="mt-4 flex justify-end gap-2">
        <button className={secondary} disabled={busy} onClick={() => setRemove(false)}>Cancel</button>
        <button className={primary} disabled={busy} onClick={async () => {
          setError('');
          try { await onRemove(); setRemove(false); setFile(null); } catch (err) { setError(errorMessage(err)); }
        }}>Remove {kind}</button>
      </div>
    </F02Dialog>}
  </div>;
}

export function StoreManagementView({ mode }: { mode: 'system' | 'manage' | 'read' }) {
  const search = useSyncExternalStore(subscribe, locationSearch, () => '');
  const rawId = new URLSearchParams(search).get('storeId');
  const id = rawId === null ? undefined : Number(rawId);
  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6">
    {mode !== 'system' ? <Detail mode={mode} />
      : rawId === null ? <StoreList />
      : id !== undefined && /^[1-9][0-9]*$/.test(rawId) && id <= 2147483647 ? <Detail key={id} mode="system" id={id} />
      : <><ErrorNotice message="Invalid Store ID." /><button className={secondary + ' self-start'} onClick={() => openStore()}>Back to Stores</button></>}
  </div>;
}
