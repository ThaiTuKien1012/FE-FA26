import { AppDatePicker } from '../../../components/common/AppDatePicker';
import { formatDate, formatFriendlyDate, formatUtcDateTime, isoDateToDisplay } from '../../../utils/dateTime';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CalendarDays, PackageOpen, Plus, RefreshCw } from 'lucide-react';
import { f03Api, F03ApiError, type SeasonPage, type SeasonProductPage, type SeasonView } from '../f03.api';
import { seasonErrors, seasonRequest, type SeasonDraft } from '../f03.validation';
import type { F02Product } from '../../store/store.api';
import { ProductSelector } from '../../store/components/ProductSelector';
import { Button, errorMessage, field, Metrics, Notice, Pager, primary, readable, secondary, Technical } from './F03Shared';
import { SeasonDialog } from './SeasonDialog';

const blank: SeasonDraft = { name: '', startDate: '', endDate: '', weight: '' };
type Editor = { current: SeasonView | null; draft: SeasonDraft; initial: SeasonDraft };
const draftFor = (view: SeasonView | null): SeasonDraft => view ? { name: view.name, startDate: view.startDate, endDate: view.endDate, weight: String(view.weight) } : { ...blank };
const dateText = formatFriendlyDate;
const DateRange = ({ season, numeric = false }: { season: SeasonView; numeric?: boolean }) => <><time dateTime={season.startDate}>{numeric ? formatDate(season.startDate) : dateText(season.startDate)}</time><span className="text-[#89938f]"> – </span><time dateTime={season.endDate}>{numeric ? formatDate(season.endDate) : dateText(season.endDate)}</time></>;
const CompactDateRange = ({ season, numeric = false }: { season: SeasonView; numeric?: boolean }) => {
  if (numeric) return <DateRange season={season} numeric />;
  const sameYear = season.startDate.slice(0, 4) === season.endDate.slice(0, 4);
  const start = sameYear ? formatFriendlyDate(season.startDate, false) : dateText(season.startDate);
  return <><time dateTime={season.startDate}>{start}</time> – <time dateTime={season.endDate}>{dateText(season.endDate)}</time></>;
};

function SeasonStatus({ season }: { season: SeasonView }) {
  return <span className={`f03-season-badge ${season.activeToday ? 'bg-[#e7f3eb] text-[#356b54]' : 'bg-[#f1f0ed] text-[#787570]'}`}>{season.activeToday ? 'Active Today' : 'Not active today'}</span>;
}

export function Seasons({ readOnly, invalidate, active = true, navigation }: { readOnly: boolean; invalidate: (reason: string) => void; active?: boolean; navigation?: ReactNode }) {
  const [list, setList] = useState<SeasonPage | null>(null), [page, setPage] = useState(0), [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<number | null>(null), [season, setSeason] = useState<SeasonView | null>(null), [members, setMembers] = useState<SeasonProductPage | null>(null), [memberPage, setMemberPage] = useState(0);
  const [product, setProduct] = useState<F02Product | null>(null), [editor, setEditor] = useState<Editor | null>(null), [deleting, setDeleting] = useState<SeasonView | null>(null), [discard, setDiscard] = useState(false);
  const [error, setError] = useState(''), [detailError, setDetailError] = useState(''), [formError, setFormError] = useState(''), [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true), [detailLoading, setDetailLoading] = useState(false), [saving, setSaving] = useState(false), [conflict, setConflict] = useState(false), [attempted, setAttempted] = useState(false);
  const busy = useRef(false), epoch = useRef(0), formId = useId(), deleteHelpId = useId(), dialogOpener = useRef<HTMLElement | null>(null);
  const dialogOpen = active && (selected !== null || editor !== null);
  const [dateDrafts, setDateDrafts] = useState<Record<string, string>>({});
  const dirty = Boolean(editor && (Object.entries(dateDrafts).some(([key, display]) => display !== isoDateToDisplay(editor.initial[key as keyof SeasonDraft])) || (Object.keys(editor.draft) as (keyof SeasonDraft)[]).some(key => editor.draft[key] !== editor.initial[key])));
  useEffect(() => { return () => { ++epoch.current; }; }, []);
  useEffect(() => {
    // Keep an edit draft when browser navigation temporarily hides this visited tab.
    if (!active && !editor) { setSelected(null); setDeleting(null); }
  }, [active, editor]);
  useEffect(() => {
    let live = true; setLoading(true); setError('');
    f03Api.listSeasons(page, 20).then(value => { if (!live) return; const last = Math.max(0, Math.ceil(value.totalElements / value.pageSize) - 1); if (page > last) setPage(last); else setList(value); }).catch(e => { if (live) { setList(null); setError(errorMessage(e, 'Unable to load seasons.')); } }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [page, refresh]);
  useEffect(() => {
    let live = true; setDetailError(''); setDetailLoading(selected !== null);
    if (selected === null) { setSeason(null); setMembers(null); return; }
    Promise.all([f03Api.getSeason(selected), f03Api.seasonProducts(selected, memberPage, 20)]).then(([view, products]) => {
      if (!live) return;
      const last = Math.max(0, Math.ceil(products.totalElements / products.pageSize) - 1);
      if (memberPage > last) setMemberPage(last); else { setSeason(view); setMembers(products); }
    }).catch(e => { if (live) setDetailError(errorMessage(e, 'Unable to load season details.')); }).finally(() => { if (live) setDetailLoading(false); });
    return () => { live = false; };
  }, [selected, memberPage, refresh]);
  const edited = () => invalidate('Seasons or product assignments changed. Calculate a new Preview.');
  const mutate = async <T,>(action: () => Promise<T>, done: (result: T) => void, target: 'form' | 'detail') => {
    if (readOnly || busy.current) return;
    busy.current = true; setSaving(true); setNotice(''); target === 'form' ? setFormError('') : setDetailError('');
    const ticket = epoch.current; edited();
    try { const result = await action(); if (ticket === epoch.current) { done(result); setRefresh(x => x + 1); } }
    catch (e) {
      if (ticket !== epoch.current) return;
      const changed = e instanceof F03ApiError && e.status === 409 && /changed|version|reload/i.test(e.message);
      if (target === 'form') { setConflict(changed); setFormError(changed ? 'This season was updated elsewhere. Reload the latest version before saving. Your draft is preserved.' : errorMessage(e, 'Unable to save season.')); }
      else setDetailError(errorMessage(e, 'Unable to update season products.'));
    } finally { edited(); busy.current = false; if (ticket === epoch.current) setSaving(false); }
  };
  const openEditor = (view: SeasonView | null) => {
    if (readOnly || busy.current) return;
    if (selected === null) dialogOpener.current = document.activeElement as HTMLElement;
    const draft = draftFor(view);
    setDateDrafts({}); setAttempted(false); setConflict(false); setFormError(''); setNotice(''); setEditor({ current: view, draft, initial: { ...draft } });
  };
  const openDetails = (view: SeasonView) => { dialogOpener.current = document.activeElement as HTMLElement; setSeason(null); setMembers(null); setNotice(''); setSelected(view.seasonId); setMemberPage(0); setProduct(null); };
  const closeAll = () => { setSelected(null); setEditor(null); setDeleting(null); setDiscard(false); setNotice(''); };
  const requestClose = () => {
    if (busy.current) return;
    if (discard) { setDiscard(false); return; }
    if (deleting) { setDeleting(null); return; }
    if (dirty) { setDiscard(true); return; }
    closeAll();
  };
  const cancelEdit = () => { if (busy.current) return; if (!editor?.current) requestClose(); else { setEditor(null); setFormError(''); setConflict(false); } };
  const reloadVersion = async () => {
    if (!editor?.current || busy.current) return;
    busy.current = true; setSaving(true); const ticket = epoch.current;
    try { const latest = await f03Api.getSeason(editor.current.seasonId); if (ticket === epoch.current) { setEditor(previous => previous && { ...previous, current: latest }); setConflict(false); setFormError(`Latest version ${latest.version} loaded. Your draft is preserved; review it before saving.`); } }
    catch (e) { if (ticket === epoch.current) setFormError(errorMessage(e, 'Unable to reload the latest version.')); }
    finally { busy.current = false; if (ticket === epoch.current) setSaving(false); }
  };
  const save = () => {
    if (!editor) return; setAttempted(true);
    if (Object.keys(seasonErrors(editor.draft)).length || conflict) return;
    const body = seasonRequest(editor.draft);
    void mutate(() => editor.current ? f03Api.updateSeason(editor.current.seasonId, { ...body, expectedVersion: editor.current.version }) : f03Api.createSeason(body), result => {
      if (editor.current) setSeason(result);
      setEditor(null); setNotice(editor.current ? 'Season updated successfully.' : 'Season created successfully.');
    }, 'form');
  };
  const errors = editor ? seasonErrors(editor.draft) : {}, detailBusy = saving || detailLoading;
  const rowAction = (view: SeasonView) => <Button disabled={saving} className={secondary} aria-label={`${readOnly ? 'View' : 'Edit'} ${view.name}`} onClick={() => openDetails(view)}>{readOnly ? 'View' : 'Edit'}</Button>;
  const title = discard ? 'Discard unsaved changes?' : deleting ? 'Delete Season' : editor ? editor.current ? 'Edit Season' : 'Add Season' : 'Season Details';
  const footer = discard ? <><Button className={secondary} onClick={() => setDiscard(false)}>Keep Editing</Button><Button className="bg-red-700 text-white hover:bg-red-800" onClick={closeAll}>Discard Changes</Button></> : deleting ? <><Button className={secondary} disabled={saving} onClick={() => setDeleting(null)}>Cancel</Button><Button className="bg-red-700 text-white hover:bg-red-800" disabled={saving} onClick={() => void mutate(() => f03Api.deleteSeason(deleting.seasonId), () => { closeAll(); setNotice('Season deleted.'); }, 'form')}>{saving ? 'Deleting…' : 'Delete Season'}</Button></> : editor ? <><Button className={secondary} disabled={saving} onClick={cancelEdit}>Cancel</Button><Button type="submit" form={formId} className={primary} disabled={saving || conflict}>{saving ? 'Saving…' : editor.current ? 'Save Changes' : 'Save Season'}</Button></> : <Button className={secondary} disabled={saving} onClick={requestClose}>Close</Button>;

  return <div className="space-y-5">
    <header data-season-header className="f03-seasons-header"><div className="min-w-0"><h1 className="text-2xl font-semibold sm:text-3xl">Seasons</h1><p className="mt-2 text-sm text-[#6d7974] sm:text-base">{readOnly ? 'View seasonal priorities and the products they apply to.' : 'Set season dates and priorities, then assign the products they apply to.'}</p></div><div className="f03-seasons-header-actions"><Button className={secondary} disabled={loading || saving} onClick={() => setRefresh(x => x + 1)}><RefreshCw size={15} aria-hidden="true" />Refresh Seasons</Button>{!readOnly && <Button className={primary} disabled={saving} onClick={() => openEditor(null)}><Plus size={16} aria-hidden="true" />Add Season</Button>}</div></header>
    {navigation}
    <Notice error={error} notice={!dialogOpen ? notice : ''} />
    <section aria-label="Seasons list" className="min-w-0 rounded-2xl border border-[#e7e2d8] bg-white p-4 sm:p-5">
      {loading && <p role="status" className="mb-4 text-sm text-[#6d7974]">{list ? 'Refreshing seasons…' : 'Loading seasons…'}</p>}
      {list && <>
        {list.items.length ? <ul aria-label="Store seasons" className="f03-season-list">{list.items.map(view => <li key={view.seasonId} className="f03-season-list-row">
          <div className="f03-season-list-heading"><h2>{view.name}</h2><SeasonStatus season={view} /></div>
          <div className="f03-season-list-action">{rowAction(view)}</div>
          <ul aria-label={`${view.name} details`} className="f03-season-list-meta"><li><CompactDateRange season={view} numeric={!readOnly} /></li><li>Priority: {view.weight}</li><li>{view.productCount} {view.productCount === 1 ? 'product' : 'products'}</li><li>Version {view.version}</li></ul>
        </li>)}</ul> : <div className="rounded-xl border border-dashed border-[#d9dfd9] bg-[#faf8f5] px-5 py-10 text-center"><CalendarDays className="mx-auto mb-3 text-[#89988e]" size={28} aria-hidden="true" /><h3 className="font-semibold">No seasons yet</h3><p className="mx-auto mt-2 max-w-md text-sm text-[#6d7974]">{readOnly ? 'A Merchandiser can create seasons to highlight products during important sales periods.' : 'Create a season to highlight products during important sales periods.'}</p></div>}
        {list.totalElements <= list.pageSize ? <p className="mt-4 text-sm text-[#6d7974]">{list.totalElements} {list.totalElements === 1 ? 'season' : 'seasons'}</p> : <Pager page={list} onChange={setPage} label="seasons" busy={loading || saving} />}
      </>}
    </section>

    {dialogOpen && <SeasonDialog returnFocus={dialogOpener.current} wide={!editor && !discard && !deleting} initialFocus={editor && !discard ? 'input' : undefined} title={title} subtitle={discard || deleting ? undefined : editor ? editor.current ? 'Update the season name, dates and priority.' : 'Set the season name, dates and priority, then assign products after saving.' : 'Review seasonal priorities and assigned products.'} busy={saving} onClose={requestClose} footer={footer}>
      {discard ? <p className="text-sm leading-relaxed text-[#57534e]">Your changes have not been saved. Keep editing, or discard this draft and close the season.</p> : deleting ? <><p className="mb-4 text-sm leading-relaxed">Delete “{deleting.name}”? This season has no assigned products. Saved snapshots will remain unchanged.</p><Notice error={formError} /></> : editor ? <form id={formId} aria-busy={saving} onSubmit={event => { event.preventDefault(); save(); }} noValidate>
        <p className="mb-4 text-xs leading-relaxed text-[#6d7974]">Seasonal Priority ranges from 0 to 1. The backend determines active seasons from their dates; assigned products receive the saved priority.</p><fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">{([['name', 'Season Name', 'text'], ['startDate', 'Start Date', 'date'], ['endDate', 'End Date', 'date'], ['weight', 'Seasonal Priority', 'number']] as const).map(([key, label, type]) => <label key={key} className={`text-sm font-medium ${key === 'name' ? 'sm:col-span-2' : ''}`}>{label}{type === 'date' ? <AppDatePicker className={field} aria-label={label} required aria-invalid={attempted && Boolean(errors[key])} aria-describedby={attempted && errors[key] ? `${formId}-${key}-error` : undefined} value={editor.draft[key]} initialDisplayValue={dateDrafts[key]} onDraftChange={display => { edited(); setDateDrafts(previous => ({ ...previous, [key]: display })); }} onChange={value => { edited(); setEditor({ ...editor, draft: { ...editor.draft, [key]: value } }); }} /> : <input className={field} aria-label={label} aria-invalid={attempted && Boolean(errors[key])} aria-describedby={attempted && errors[key] ? `${formId}-${key}-error` : undefined} type={type} maxLength={key === 'name' ? 100 : undefined} min={key === 'weight' ? 0 : undefined} max={key === 'weight' ? 1 : undefined} step={key === 'weight' ? '0.000001' : undefined} value={editor.draft[key]} onChange={e => { edited(); setEditor({ ...editor, draft: { ...editor.draft, [key]: e.target.value } }); }} />}{attempted && errors[key] && <span id={`${formId}-${key}-error`} className="mt-1 block text-xs text-red-800">{errors[key]}</span>}</label>)}</fieldset>
        <p className="my-4 text-xs leading-relaxed text-[#6d7974]">Weight: 0–1, up to 6 decimal places. Start and end dates are inclusive.{editor.current && ` Version ${editor.current.version}.`}</p><Notice error={formError} />{conflict && <Button className={`${secondary} mt-3`} disabled={saving} onClick={() => void reloadVersion()}>Reload Latest Version</Button>}
      </form> : <>
        <Notice error={detailError} notice={notice} />{detailLoading && <p role="status" className="mb-4 text-sm text-[#6d7974]">{season ? 'Refreshing season and products…' : 'Loading season products…'}</p>}{detailError && <Button className={`${secondary} mb-4`} disabled={detailBusy} onClick={() => setRefresh(x => x + 1)}>Reload Details</Button>}
        {season && <div aria-busy={detailBusy}>
          <div data-season-identity className="mb-5 flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><h3 className="break-words text-lg font-semibold">{season.name}</h3><div className="mt-2 flex flex-wrap items-center gap-2"><span className="f03-season-badge bg-[#f1f0ed] text-[#6d7974]">Version {season.version}</span><SeasonStatus season={season} /></div></div>{!readOnly && <div className="f03-season-identity-actions"><span tabIndex={season.productCount > 0 ? 0 : undefined} title={season.productCount > 0 ? 'Unassign all products before deleting this season.' : undefined} aria-describedby={season.productCount > 0 ? deleteHelpId : undefined} className="inline-flex rounded-xl"><Button className="border border-[#ecdedd] bg-white text-red-700 hover:bg-red-50" disabled={detailBusy || season.productCount > 0} aria-label="Delete Season" onClick={() => { if (busy.current || season.productCount > 0) return; setFormError(''); setDeleting(season); }}>Delete</Button></span><Button className={primary} disabled={detailBusy} onClick={() => openEditor(season)}>Edit Season</Button></div>}</div>
          {!readOnly && season.productCount > 0 && <p id={deleteHelpId} className="-mt-2 mb-4 text-xs text-[#6d7974]">Unassign all products before deleting this season.</p>}
          <dl data-season-summary className="f03-season-summary-grid"><div className="f03-season-summary"><dt>Date Range</dt><dd><DateRange season={season} numeric={!readOnly} /></dd></div><div className="f03-season-summary"><dt>Seasonal Priority</dt><dd>{season.weight}</dd></div><div className="f03-season-summary"><dt>Products</dt><dd>{season.productCount}</dd></div></dl>
          <details className="my-4 text-xs leading-relaxed text-[#6d7974]"><summary className="w-fit cursor-pointer rounded font-medium text-[#356b54]">How season weights work</summary><p className="mt-2">{readOnly ? 'If a product belongs to several active seasons, the highest seasonal priority is used. Both the start and end dates are included. Active Today refers to your store’s current date.' : 'Products may belong to several seasons. The backend chooses the active season with the highest weight, then the lowest Season ID when weights tie. Start and end dates are inclusive. Preview uses its Analysis Date, which may differ from Store-local today. Active Today is supplied by the backend.'}</p></details>
          <section aria-label="Assigned Products" className="border-t border-[#e7e2d8] pt-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Assigned Products <span className="ml-1 text-sm font-normal text-[#6d7974]">({members?.totalElements ?? season.productCount})</span></h3>{readOnly && <span className="text-xs text-[#6d7974]">Read-only access</span>}</div>
            {!readOnly && <div className="mb-4"><div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]"><ProductSelector value={product} onSelect={setProduct} disabled={detailBusy} /><Button className={primary} disabled={!product || detailBusy || !members || members.items.some(item => item.productId === product.id)} onClick={() => product && void mutate(() => f03Api.assignProduct(season.seasonId, product.id), () => { setNotice('Product assigned successfully.'); setProduct(null); }, 'detail')}>Assign Product</Button></div>{product && <p className="mt-2 break-words text-xs text-[#6d7974]">{members?.items.some(item => item.productId === product.id) ? 'This product is already assigned.' : `Selected: ${product.name} · ${product.sku}`}</p>}</div>}
            {members && <>{members.items.length ? <ul aria-label="Assigned product list" className="f03-season-products max-h-64 divide-y divide-[#e7e2d8] overflow-y-auto overscroll-contain pr-1">{members.items.map(item => <li key={item.productId} className="flex items-center justify-between gap-3 py-3 text-sm"><div className="min-w-0"><p className="break-words font-semibold">{item.name}</p><div className="mt-1 flex flex-wrap items-center gap-2"><span className="break-all text-xs text-[#6d7974]">{item.sku}</span><span className={`f03-season-badge ${item.status === 'ACTIVE' ? 'bg-[#edf5f0] text-[#356b54]' : 'bg-[#f1f0ed] text-[#787570]'}`}>{readable(item.status)}</span></div></div>{!readOnly && <Button disabled={detailBusy} className="shrink-0 text-[#6d7974] hover:bg-[#faf8f5] hover:text-[#315445]" aria-label={`Unassign ${item.name}`} onClick={() => void mutate(() => f03Api.unassignProduct(season.seasonId, item.productId), () => setNotice('Product unassigned successfully.'), 'detail')}>Unassign</Button>}</li>)}</ul> : <div className="rounded-lg border border-dashed border-[#d9dfd9] px-4 py-6 text-center"><PackageOpen size={25} className="mx-auto mb-2 text-[#89988e]" aria-hidden="true" /><p className="text-sm font-medium">No products are assigned to this season.</p><p className="mt-1 text-xs text-[#6d7974]">{readOnly ? 'Assigned products will appear here when a Merchandiser adds them.' : 'Search by product name or SKU above to add your first product.'}</p></div>}<Pager page={members} onChange={setMemberPage} label="assigned products" busy={detailBusy} /></>}
          </section>
          <Technical><Metrics values={[["Season ID", season.seasonId], ['Created At', formatUtcDateTime(season.createdAt)], ['Updated At', formatUtcDateTime(season.updatedAt)], ['Created By', season.createdBy], ['Updated By', season.updatedBy]]} /></Technical>
        </div>}
      </>}
    </SeasonDialog>}
  </div>;
}
