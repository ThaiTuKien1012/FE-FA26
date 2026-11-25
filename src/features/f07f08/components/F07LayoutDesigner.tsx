import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, Eye, LayoutGrid, LockKeyhole, Package, Plus, RotateCcw, Save, Search, Trash2 } from 'lucide-react';
import { f07f08Api, type LayoutPolicy, type LayoutProduct, type LayoutView, type Page, type PlacementRequest, type RecommendationOption, type SnapshotProductOption } from '../f07f08.api';
import { formatUtility, normalizePositions, placementErrors, ZONE_LABELS } from '../f07.designer';
import './F07Workspace.css';

export const ZONE_COLORS: Record<string, string> = { BASELINE: 'slate', BANNER: 'amber', BUNDLE: 'purple', CROSS_SELL: 'blue', FBT: 'green' };
export function LayoutStatus({ value }: { value: string }) { return <span className={`f07-status f07-status-${value.toLowerCase()}`}>{({ DRAFT: 'Draft', READY: 'Ready', PUBLISHED: 'Awaiting activation', ACTIVE: 'In use', ENDED: 'Ended', ARCHIVED: 'Archived' } as Record<string, string>)[value] || value.replaceAll('_', ' ')}</span>; }

interface Props {
  a: LayoutView; b: LayoutView; policy: LayoutPolicy; recommendations: RecommendationOption[];
  products: Record<number, LayoutProduct>; placements: PlacementRequest[]; dirty: boolean; canEdit: boolean; busy: boolean;
  onChange: (placements: PlacementRequest[]) => void; onSave: () => void; onPreview: () => void; onReady: () => void; onReset: () => void;
}
export function F07LayoutDesigner({ a, b, policy, recommendations, products, placements, dirty, canEdit, busy, onChange, onSave, onPreview, onReady, onReset }: Props) {
  const [role, setRole] = useState<'A' | 'B'>('B');
  const [source, setSource] = useState<'recommendations' | 'products'>('recommendations');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [options, setOptions] = useState<Page<SnapshotProductOption> | null>(null);
  const [knownProducts, setKnownProducts] = useState<Record<number, SnapshotProductOption>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [zone, setZone] = useState(policy.zones.find(item => item.recommendationType)?.zone || '');
  const [feedback, setFeedback] = useState('');
  const edit = canEdit && role === 'B' && !busy;
  const errors = placementErrors(placements, policy);
  const zones = policy.zones.filter(item => item.recommendationType);
  useEffect(() => {
    if (source !== 'products') return;
    const controller = new AbortController();
    setLoading(true); setOptions(null); setLoadError('');
    const timer = setTimeout(() => {
      void f07f08Api.products(b.snapshotId, query, page, 20, controller.signal).then(result => {
        if (controller.signal.aborted) return;
        setOptions(result); setKnownProducts(current => ({ ...current, ...Object.fromEntries(result.items.map(item => [item.productId, item])) })); setLoading(false);
      }).catch(error => { if (!controller.signal.aborted) { setLoadError(error instanceof Error ? error.message : 'Unable to load snapshot products.'); setLoading(false); } });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [b.snapshotId, source, query, page, retry]);

  const productName = (id: number) => knownProducts[id]?.productName || products[id]?.name || `Product #${id}`;
  const change = (next: PlacementRequest[]) => onChange(normalizePositions(next));
  function add(productId: number, targetZone: string, sourceRecommendationId: number | null) {
    if (!edit) return;
    if (placements.some(item => item.productId === productId)) { setFeedback('This product is already in Layout B.'); return; }
    const existing = sourceRecommendationId === null ? undefined : placements.find(item => item.zone === targetZone && item.sourceRecommendationId === sourceRecommendationId);
    const blockNo = existing?.blockNo ?? Math.max(0, ...placements.filter(item => item.zone === targetZone).map(item => item.blockNo)) + 1;
    const next = normalizePositions([...placements, { productId, zone: targetZone, blockNo, position: 1, sourceRecommendationId }]);
    const error = placementErrors(next, policy)[0];
    if (error) { setFeedback(error); return; }
    setFeedback(''); onChange(next);
  }
  function shift(productId: number, direction: number) {
    const current = placements.find(item => item.productId === productId)!;
    const peers = placements.filter(item => item.zone === current.zone);
    const target = peers[peers.findIndex(item => item.productId === productId) + direction];
    if (!target) return;
    const next = [...placements], i = next.indexOf(current), j = next.indexOf(target);
    [next[i], next[j]] = [next[j], next[i]]; change(next);
  }
  const difference = b.weightedUtilityScore !== null && b.equalSizeBaselineScore !== null ? b.weightedUtilityScore - b.equalSizeBaselineScore : null;
  return <section className="f07-designer" aria-label="Arrange products">
    <div className="f07-score-grid"><div className="f07-score"><span>Reference layout (A)</span><strong>{formatUtility(a.weightedUtilityScore)}</strong><small>{a.placements.length} products · read-only</small></div><div className="f07-score"><span>Proposed layout (B)</span><strong>{dirty ? 'Unsaved changes' : formatUtility(b.weightedUtilityScore)}</strong><small>{placements.length} products</small></div><div className="f07-score f07-score-accent"><span>Score difference</span><strong>{dirty ? 'Save to compare' : `${difference !== null && difference > 0 ? '+' : ''}${formatUtility(difference)}`}</strong><small>{dirty ? 'Save to update the comparison.' : `Compared with the top ${b.equalSizeProductCount ?? '—'} products in A`}</small></div></div>
    <p className="f07-score-note">Weighted utility (snapshot). Scores compare the same number of products and do not represent revenue or profit.</p>
    <div className="f07-editor-grid"><aside className="f07-library f07-panel"><div className="f07-panel-heading"><h2>Product sources</h2><Package size={20} /></div>
      <div className="f07-segment" role="group" aria-label="Product source"><button aria-pressed={source === 'recommendations'} onClick={() => { setSource('recommendations'); setPage(0); }}>Approved F06</button><button aria-pressed={source === 'products'} onClick={() => { setSource('products'); setPage(0); }}>Snapshot products</button></div>
      <p className="f07-muted">Add products individually. Products from the same source may be moved or removed independently.</p>
      <label className="f07-search"><Search size={16} /><input aria-label="Search product sources" maxLength={180} value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder="Find a product or SKU…" /></label>
      {source === 'products' && <label className="f07-field">Add manually to<select aria-label="Manual product zone" value={zone} onChange={event => setZone(event.target.value)}>{zones.map(item => <option key={item.zone} value={item.zone}>{ZONE_LABELS[item.zone] || item.zone}</option>)}</select></label>}
      <div className="f07-library-list">{source === 'recommendations' ? recommendations.filter(item => `${item.recommendationId} ${item.productIds.map(id => `${productName(id)} ${products[id]?.sku || ''}`).join(' ')}`.toLowerCase().includes(query.toLowerCase())).map(item => <details key={item.recommendationId} className="f07-library-card" open><summary className="text-sm font-medium">F06 #{item.recommendationId} · {ZONE_LABELS[item.type]}</summary>{item.productIds.map(id => <div key={id} className="f07-product-source"><span>{productName(id)}<small>{products[id]?.sku || `#${id}`}</small></span><button className="f07-icon-button" aria-label={`Add product ${id} from recommendation ${item.recommendationId}`} disabled={!edit || placements.some(row => row.productId === id)} onClick={() => add(id, item.type, item.recommendationId)}><Plus size={15} />Add</button></div>)}</details>) : <>
        {loading && <p role="status" className="f07-muted">Loading snapshot products…</p>}{loadError && <div role="alert" className="f07-error-text">{loadError}<button className="f07-button" onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
        {options?.items.map(item => <article key={item.productId} className="f07-library-card"><div className="f07-product-source"><span><strong>{item.productName}</strong><small>{item.sku} · {item.productStatus}</small><small>{item.sellableQuantity} sellable · Weighted utility {formatUtility(item.snapshotWeightedUtility)}</small></span><button className="f07-icon-button" aria-label={`Add manual product ${item.productId}`} disabled={!edit || !item.eligible || !zone || placements.some(row => row.productId === item.productId)} onClick={() => add(item.productId, zone, null)}><Plus size={15} />Add</button></div>{item.validationErrors.map(error => <p className="f07-error-text" key={error}>{error}</p>)}</article>)}
        {options?.items.length === 0 && <p className="f07-muted">No matching snapshot products.</p>}{options && options.totalElements > 20 && <div className="f07-actions"><button className="f07-button" disabled={loading || page === 0} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1} / {Math.ceil(options.totalElements / 20)}</span><button className="f07-button" disabled={loading || (page + 1) * 20 >= options.totalElements} onClick={() => setPage(page + 1)}>Next</button></div>}
      </>}{source === 'recommendations' && !recommendations.length && <p className="f07-muted">No approved recommendations. You can add snapshot products manually.</p>}</div>
    </aside><div className="f07-board f07-panel"><div className="f07-board-heading"><div><h2>Product arrangement</h2><p className="f07-muted">Choose each product’s zone and block. A saved bundle contains products with the same BUNDLE block number.</p></div><LayoutGrid size={22} /></div><div className="f07-toolbar"><div className="f07-segment" role="group" aria-label="Choose layout"><button aria-pressed={role === 'A'} onClick={() => setRole('A')}><LockKeyhole size={14} />A · Reference</button><button aria-pressed={role === 'B'} onClick={() => setRole('B')}>B · Proposed</button></div><LayoutStatus value={role === 'A' ? a.status : b.status} /></div>
      {role === 'A' && <p className="f07-readonly">Layout A is read-only.</p>}{role === 'B' && !canEdit && <p className="f07-readonly">Only the merchandising team can edit a draft campaign.</p>}{feedback && <p role="status" className="f07-warning">{feedback}</p>}
      <div className="f07-canvas">{(role === 'A' ? policy.zones.filter(item => item.zone === 'BASELINE') : zones).map(item => {
        const rows = role === 'A' ? a.placements : placements.filter(row => row.zone === item.zone);
        const blocks = new Set(rows.map(row => row.blockNo)).size;
        return <section key={item.zone} className={`f07-zone f07-tone-${ZONE_COLORS[item.zone] || 'slate'}`} aria-label={`${item.zone} zone`}><div className="f07-zone-heading"><h3>{ZONE_LABELS[item.zone] || item.zone}</h3><span>{blocks}{item.maxBlocks === null ? '' : ` / ${item.maxBlocks}`} blocks · {rows.length}{item.maxProducts === null ? '' : ` / ${item.maxProducts}`} products</span></div>
          {rows.map((row, index) => { const saved = (role === 'A' ? a : b).placements.find(product => product.productId === row.productId); return <article key={row.productId} className={`f07-canvas-block ${saved && !saved.valid ? 'is-invalid' : ''}`}><div className="f07-product-source"><div><strong>{productName(row.productId)}</strong><small>{products[row.productId]?.sku || knownProducts[row.productId]?.sku}</small><small>{role === 'A' ? `Position ${row.position}` : row.sourceRecommendationId == null ? 'Manual product' : `F06 source #${row.sourceRecommendationId}`}</small></div>{role === 'B' && <div className="f07-actions"><button className="f07-icon-button" aria-label={`Move product ${row.productId} up`} disabled={!edit || index === 0} onClick={() => shift(row.productId, -1)}><ArrowUp size={14} /></button><button className="f07-icon-button" aria-label={`Move product ${row.productId} down`} disabled={!edit || index === rows.length - 1} onClick={() => shift(row.productId, 1)}><ArrowDown size={14} /></button><button className="f07-icon-button" aria-label={`Remove product ${row.productId}`} disabled={!edit} onClick={() => change(placements.filter(product => product.productId !== row.productId))}><Trash2 size={14} /></button></div>}</div>
            {role === 'B' && <div className="f07-product-controls"><label>Zone<select aria-label={`Zone for product ${row.productId}`} value={row.zone} disabled={!edit} onChange={event => change(placements.map(product => product.productId === row.productId ? { ...product, zone: event.target.value, blockNo: 1 } : product))}>{zones.map(zone => <option key={zone.zone} value={zone.zone}>{ZONE_LABELS[zone.zone] || zone.zone}</option>)}</select></label><label>Block<input aria-label={`Block for product ${row.productId}`} type="number" min={1} step={1} value={row.blockNo} disabled={!edit} onChange={event => change(placements.map(product => product.productId === row.productId ? { ...product, blockNo: Number(event.target.value) } : product))} /></label><span>Position {row.position}</span></div>}
            {saved && !saved.valid && <p className="f07-error-text">{saved.validationErrors.join(' ')}</p>}
          </article>; })}{!rows.length && <div className="f07-zone-placeholder">No products in this section.</div>}
        </section>;
      })}</div>
      {role === 'B' && <><div className="f07-savebar"><div><strong>{dirty ? 'Changes not saved' : 'All changes saved'}</strong><small>Save to update scores and per-product checks.</small></div><div className="f07-actions"><button className="f07-button" disabled={busy || !dirty} onClick={onReset}><RotateCcw size={15} />Discard changes</button><button className="f07-button" disabled={busy || dirty} onClick={onPreview}><Eye size={15} />Check products</button>{canEdit && <><button className="f07-button f07-primary" disabled={busy || !dirty || !!errors.length} onClick={onSave}><Save size={15} />Save layout</button><button className="f07-button" disabled={busy || dirty || !b.valid || !placements.length || b.status === 'READY'} onClick={onReady}><CheckCircle2 size={15} />Finish layout</button></>}</div></div>{(errors.length > 0 || !dirty && b.validationErrors.length > 0) && <div className="f07-validation" role="status"><strong>Review this arrangement</strong><ul>{[...new Set([...errors, ...(!dirty ? b.validationErrors : [])])].map(error => <li key={error}>{error}</li>)}</ul></div>}</>}
    </div></div>
  </section>;
}
