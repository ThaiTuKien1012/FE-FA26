import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthUser } from '../../../services/authService';
import { authService } from '../../../services/authService';
import type { ActiveNavScreen } from '../../../types/mining';
import { f03Api, type F03MatrixPage } from '../f03.api';
import type { F02Product } from '../../store/store.api';
import { periodError, previewEligible, type SalesPeriod } from '../f03.validation';
import { previewNotice } from '../f03.presentation';
import { errorMessage, navigate } from './F03Shared';
import { GlobalLambdaPolicy } from './GlobalLambdaPolicy';
import { UtilityConfiguration } from './UtilityConfiguration';
import { ProductScores } from './ProductScores';
import { UtilityPreview, type PreviewFlow } from './UtilityPreview';
import { SnapshotDetails, UtilitySnapshots } from './UtilitySnapshots';
import { Seasons } from './Seasons';
import './UtilityPlanner.css';

type Props = { currentUser: AuthUser | null; section?: string };
const tabs: [ActiveNavScreen, string][] = [
  ['f03-configuration', 'Configuration'], ['f03-seasons', 'Seasons'], ['f03-product-scores', 'Product Weights'],
  ['f03-preview', 'Preview'], ['f03-snapshots', 'Snapshots']
];
const headings: Record<string, [string, string]> = {
  'f03-configuration': ['Utility Configuration', 'Choose which product priorities matter most to your store.'],
  'f03-product-scores': ['Product Weight Details', 'See how expiry risk and seasonal priorities affect product utility.'],
  'f03-seasons': ['Season Management', 'Manage seasonal priorities and the products assigned to them.'],
  'f03-preview': ['Utility Preview', 'Review calculated utility before creating a snapshot for mining.'],
  'f03-snapshots': ['Utility Snapshots', 'Create and review saved utility datasets for mining.']
};
function Planner({ user, section }: { user: AuthUser; section: string }) {
  const [search, setSearch] = useState(window.location.search);
  useEffect(() => {
    const changed = () => setSearch(window.location.search);
    window.addEventListener('popstate', changed);
    return () => window.removeEventListener('popstate', changed);
  }, []);
  const readOnly = user.role === 'Store Admin';
  const details = section === 'f03-snapshot-detail' || section === 'f03-snapshot-matrix';
  const active = details || section === 'f03-snapshot' ? 'f03-snapshots' : section === 'f03-utility' ? 'f03-configuration' : section;
  const allowed = readOnly ? tabs.filter(([id]) => id !== 'f03-preview') : tabs;
  const [visited, setVisited] = useState<string[]>(details ? [] : [active]);
  useEffect(() => { if (!details) setVisited(previous => previous.includes(active) ? previous : [...previous, active]); }, [active, details]);
  const [dates, updateDates] = useState<SalesPeriod>(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    return { rangeStart: today, rangeEnd: today, asOfDate: today };
  });
  const [preview, setPreview] = useState<F03MatrixPage | null>(null);
  const [stale, setStale] = useState('');
  const [settingsDirty, setSettingsDirty] = useState(false);
  const settingsDraftChanged = useCallback((dirty: boolean) => setSettingsDirty(dirty), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [names, setNames] = useState<Record<number, string>>({});
  const remember = useCallback((products: F02Product[]) => setNames(previous => ({ ...previous, ...Object.fromEntries(products.map(product => [product.id, product.name])) })), []);
  const revision = useRef(0);
  const request = useRef(0);
  const calculating = useRef(false);
  const reviewing = useRef(false);
  const alive = useRef(true);
  const invalidate = useCallback((reason: string) => {
    revision.current++; request.current++; reviewing.current = false; calculating.current = false;
    setPreview(null); setStale(reason); setLoading(false); setError('');
  }, []);
  const invalidateSettings = useCallback(() => invalidate('Weight Settings changed. Calculate Preview again to use the saved settings.'), [invalidate]);
  useEffect(() => {
    alive.current = true;
    const storageChanged = (event: StorageEvent) => {
      // Session identity is handled by the parent key. Refresh cooldown metadata is
      // unrelated to Preview inputs and must not discard work in another tab.
      if (event.key === 'paspm_session_coordination') return;
      invalidate('Session or saved inputs may have changed in another tab. Calculate Preview again.');
    };
    window.addEventListener('storage', storageChanged);
    return () => { alive.current = false; request.current++; window.removeEventListener('storage', storageChanged); };
  }, [invalidate]);
  const calculate = async (page = 0) => {
    if (calculating.current || readOnly) return;
    const invalid = periodError(dates);
    if (invalid) { invalidate(invalid); return; }
    calculating.current = true;
    const ticket = ++request.current;
    const version = revision.current;
    reviewing.current = false; setLoading(true); setError(''); setStale('');
    try {
      const result = await f03Api.preview({ ...dates, page, pageSize: 20 });
      if (!alive.current || ticket !== request.current || version !== revision.current) return;
      setPreview(result); setStale(''); reviewing.current = previewEligible(result);
    } catch (e) {
      if (alive.current && ticket === request.current) { setPreview(null); setError(errorMessage(e, 'Unable to calculate Preview.')); }
    } finally { if (alive.current && ticket === request.current) { setLoading(false); calculating.current = false; } }
  };
  const flow: PreviewFlow = { dates, setDates: next => { invalidate('Sales period or Analysis Date changed. Calculate Preview again before creating a snapshot.'); updateDates(next); }, preview, stale: previewNotice(stale, settingsDirty), loading, error, calculate };
  const snapshotId = Number(new URLSearchParams(search).get('id'));
  const [baseTitle, baseSubtitle] = details ? [`Snapshot #${Number.isSafeInteger(snapshotId) && snapshotId > 0 ? snapshotId : '—'}`, 'Review the saved utility dataset and its frozen settings.'] : headings[active] ?? headings['f03-configuration'];
  const title = !readOnly && active === 'f03-product-scores' ? 'Product Priority Details' : !readOnly && active === 'f03-configuration' ? 'Weight Settings' : baseTitle;
  const subtitle = !readOnly && active === 'f03-product-scores' ? 'Review the expiry risk, seasonal priority and multiplier reported for a product.' : baseSubtitle;
  const navigation = <nav aria-label="Utility Planner tabs" className={`grid grid-cols-2 gap-1 rounded-xl border border-[#e7e2d8] bg-white p-1.5 shadow-sm ${readOnly ? 'sm:grid-cols-4' : 'sm:grid-cols-5'}`}>{allowed.map(([id, label], index) => <button type="button" key={id} aria-current={active === id ? 'page' : undefined} className={`rounded-lg px-3 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356b54] ${active === id ? 'bg-[#1e3a2f] text-white' : 'text-[#6d7974] hover:bg-[#faf8f5]'}`} onClick={() => navigate(id)} onKeyDown={event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % allowed.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + allowed.length) % allowed.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = allowed.length - 1;
      else return;
      event.preventDefault(); (event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
    }}>{!readOnly && id === 'f03-configuration' ? 'Weight Settings' : label}</button>)}</nav>;
  return <div className={`f03-planner ${!readOnly ? "f03-merchant" : ""} mx-auto max-w-6xl space-y-5 text-[#191c1b]`}>
    {active !== 'f03-seasons' && <header><h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1><p className="mt-2 text-sm text-[#6d7974] sm:text-base">{subtitle}</p></header>}
    {active !== 'f03-seasons' && navigation}
    {visited.includes('f03-configuration') && <div hidden={details || active !== 'f03-configuration'}><UtilityConfiguration readOnly={readOnly} invalidate={readOnly ? invalidate : invalidateSettings} onDraftState={readOnly ? undefined : settingsDraftChanged} /></div>}
    {visited.includes('f03-product-scores') && <div hidden={details || active !== 'f03-product-scores'}><ProductScores readOnly={readOnly} remember={remember} /></div>}
    {visited.includes('f03-seasons') && <div hidden={details || active !== 'f03-seasons'}><Seasons readOnly={readOnly} invalidate={invalidate} active={!details && active === 'f03-seasons'} navigation={active === 'f03-seasons' ? navigation : null} /></div>}
    {active === 'f03-preview' && !readOnly && <UtilityPreview flow={flow} names={names} />}
    {visited.includes('f03-snapshots') && <div hidden={details || active !== 'f03-snapshots'}><UtilitySnapshots flow={flow} readOnly={readOnly} invalidate={invalidate} isCurrent={() => reviewing.current} /></div>}
    {details && !readOnly && <SnapshotDetails key={snapshotId} id={snapshotId} names={names} />}
  </div>;
}
export function F03WorkspaceView({ currentUser, section = 'f03-configuration' }: Props) {
  if (!currentUser) return null;
  if (currentUser.role === 'System Admin') return section === 'f03-configuration' ? <GlobalLambdaPolicy /> : null;
  if (currentUser.role !== 'Merchandiser' && currentUser.role !== 'Store Admin') return null;
  if (currentUser.role === 'Store Admin' && !['f03-utility', 'f03-configuration', 'f03-seasons', 'f03-product-scores', 'f03-snapshots'].includes(section)) return null;
  // Rotation preserves drafts; another login, role or Store starts a fresh flow.
  return <Planner key={`${currentUser.id}:${currentUser.role}:${currentUser.storeId ?? ''}:${authService.getSessionId()}`} user={currentUser} section={section} />;
}
