import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, Eye, Gift, LayoutGrid, LockKeyhole, Package, Plus, RotateCcw, Save, Search, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { f07f08Api, type LayoutPolicy, type LayoutView, type Page, type RecommendationOption, type RecommendationType, type SnapshotProductOption } from '../f07f08.api';
import { addPlacements, draftErrors, editableZone, formatUtility, groupedPlacements, movePlacement, shiftPlacement, ZONE_LABELS, ZONES, type DraftPlacement } from '../f07.designer';
import { formatPriorityCoverage } from '../f08.simulation';
import './F07Workspace.css';

export const ZONE_COLORS: Record<string, string> = { BASELINE: 'slate', BANNER: 'amber', BUNDLE: 'purple', CROSS_SELL: 'blue', FBT: 'green' };
export function LayoutStatus({ value }: { value: string }) { return <span className={`f07-status f07-status-${value.toLowerCase()}`}>{value.replaceAll('_', ' ')}</span>; }

function ProductTile({ id, name, sku }: { id: number; name?: string; sku?: string }) {
  return <div className="f07-product"><div className={`f07-pack f07-pack-${id % 4}`}><Package size={26} strokeWidth={1.4} aria-hidden="true" /></div><div><strong>{name || `Product #${id}`}</strong><small>{sku || `#${id}`}</small></div></div>;
}

interface Props {
  a: LayoutView; b: LayoutView; policy: LayoutPolicy; recommendations: RecommendationOption[];
  placements: DraftPlacement[]; dirty: boolean; canEdit: boolean; busy: boolean;
  onChange: (placements: DraftPlacement[]) => void; onSave: () => void; onPreview: () => void; onReady: () => void; onReset: () => void;
}

export function F07LayoutDesigner({ a, b, policy, recommendations, placements, dirty, canEdit, busy, onChange, onSave, onPreview, onReady, onReset }: Props) {
  const [role, setRole] = useState<'A' | 'B'>('B');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RecommendationType | 'ALL'>('ALL');
  const [productQuery, setProductQuery] = useState('');
  const [page, setPage] = useState(0);
  const [results, setResults] = useState<Page<SnapshotProductOption> | null>(null);
  const [productError, setProductError] = useState('');
  const [manualZone, setManualZone] = useState<RecommendationType>('BUNDLE');
  const [feedback, setFeedback] = useState('');
  const [draggedProduct, setDraggedProduct] = useState<number | null>(null);
  const [draggedSource, setDraggedSource] = useState<RecommendationOption | null>(null);
  const editableZones = policy.zones.filter(zone => editableZone(zone.zone));
  const targetZone = editableZones.find(zone => zone.zone === manualZone)?.zone ?? editableZones[0]?.zone;
  const errors = draftErrors(placements, policy);
  const edit = canEdit && role === 'B' && !busy;
  const products = new Map(results?.items.map(item => [item.productId, item]));
  const placed = new Set(placements.map(row => row.productId));
  const shown = recommendations.filter(item => (filter === 'ALL' || item.type === filter)
    && [String(item.recommendationId), ...item.productIds.map(id => `${products.get(id)?.productName ?? ''} ${products.get(id)?.sku ?? ''} ${id}`)]
      .join(' ').toLowerCase().includes(query.toLowerCase()));
  const difference = b.weightedUtilityScore !== null && b.equalSizeBaselineScore !== null ? b.weightedUtilityScore - b.equalSizeBaselineScore : null;

  useEffect(() => {
    if (!canEdit) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void f07f08Api.snapshotProducts(b.snapshotId, productQuery.trim(), page, 20, controller.signal)
        .then(value => { if (!controller.signal.aborted) setResults(value); })
        .catch(error => { if (!controller.signal.aborted) setProductError(error instanceof Error ? error.message : 'Unable to load snapshot products.'); });
    }, 180);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [canEdit, b.snapshotId, b.version, productQuery, page]);

  function apply(next: DraftPlacement[]) {
    const blocked = draftErrors(next, policy, false);
    if (blocked.length) { setFeedback(blocked.join(' ')); return; }
    setFeedback('');
    onChange(next);
  }
  function add(zone: RecommendationType, ids: number[], source: RecommendationOption | null) {
    const next = addPlacements(placements, zone, ids, products, source);
    if (next.length === placements.length) { setFeedback('These products are already placed or unavailable.'); return; }
    apply(next);
  }
  function drop(zone: string) {
    if (!edit || !editableZone(zone)) return;
    if (draggedProduct !== null) apply(movePlacement(placements, draggedProduct, zone));
    else if (draggedSource) add(zone, draggedSource.productIds, draggedSource);
    setDraggedProduct(null); setDraggedSource(null);
  }
  function search(value: string) {
    setProductQuery(value); setPage(0); setProductError(''); setResults(null);
  }

  return <section className="f07-designer" aria-label="F07 Layout Simulator">
    <div className="f07-score-grid">
      <div className="f07-score"><span>Layout A · baseline</span><strong>{formatUtility(a.weightedUtilityScore)}</strong><small>{a.placements.length} products · read-only</small><small>Priority coverage {formatPriorityCoverage(a.priorityCoverage)} · {a.priorityCoverageDenominator} products</small></div>
      <div className="f07-score"><span>Layout B · weighted utility</span><strong>{dirty ? 'Unsaved changes' : formatUtility(b.weightedUtilityScore)}</strong><small>{placements.length} distinct products</small>{!dirty && <small>Priority coverage {formatPriorityCoverage(b.priorityCoverage)} · {b.priorityCoverageDenominator} products</small>}</div>
      <div className="f07-score f07-score-accent"><span>Difference vs equal-size A</span><strong>{dirty ? 'Save to compare' : `${difference !== null && difference > 0 ? '+' : ''}${formatUtility(difference)}`}</strong><small>{dirty ? 'Scores update after saving your layout.' : `Compared with A’s first ${b.equalSizeProductCount ?? '—'} products`}</small></div>
    </div>
    <p className="f07-score-note">Weighted utility comes from the shared snapshot. It is an analysis score, not sales revenue.</p>
    <div className="f07-editor-grid">
      <aside className="f07-library f07-panel">
        <div className="f07-panel-heading"><div><span className="f07-eyebrow">YOUR BUILDING BLOCKS</span><h2>Recommendation library</h2></div><ShieldCheck size={21} /></div>
        <p className="f07-muted">Add products from approved F06 sources. Each placement retains its source.</p>
        <label className="f07-search"><Search size={16} /><input aria-label="Search recommendations" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a product or recommendation…" /></label>
        <label className="f07-field">Recommendation type<select aria-label="Filter recommendation type" value={filter} onChange={e => setFilter(e.target.value as typeof filter)}><option value="ALL">All types ({recommendations.length})</option>{ZONES.map(type => <option key={type} value={type}>{ZONE_LABELS[type]}</option>)}</select></label>
        <div className="f07-library-list">
          {shown.map(source => {
            const candidates = source.productIds.filter(id => !placed.has(id) && products.get(id)?.eligible !== false);
            const next = addPlacements(placements, source.type, candidates, products, source);
            const reason = draftErrors(next, policy, false)[0];
            const unavailable = !candidates.length;
            return <article key={source.recommendationId} className={`f07-library-card ${unavailable ? 'is-placed' : ''}`}
              draggable={edit && !unavailable && !reason} onDragStart={e => { e.dataTransfer.setData('text/plain', String(source.recommendationId)); setDraggedSource(source); }} onDragEnd={() => setDraggedSource(null)}>
              <div className="f07-card-heading"><span className={`f07-type f07-tone-${ZONE_COLORS[source.type]}`}>{source.type.replaceAll('_', ' ')}</span><small>#{source.recommendationId}</small></div>
              <div className="f07-library-products">{source.productIds.map(id => {
                const product = products.get(id);
                return <div key={id}><ProductTile id={id} name={product?.productName} sku={product?.sku} />
                  <button className="f07-icon-button" aria-label={`Add product ${id} from recommendation ${source.recommendationId}`} disabled={!edit || !candidates.includes(id)} onClick={() => add(source.type, [id], source)}><Plus size={14} /></button>
                </div>;
              })}</div>
              <div className="f07-card-footer"><span>{source.productIds.length} products</span><button className="f07-icon-button" aria-label={`Add recommendation ${source.recommendationId}`} disabled={!edit || unavailable || !!reason} title={reason || 'Add available products'} onClick={() => add(source.type, candidates, source)}><Plus size={16} />Add</button></div>
              {reason && <p className="f07-block-reason">{reason}</p>}
            </article>;
          })}
          {!shown.length && <p className="f07-muted">{recommendations.length ? 'No matching recommendations' : 'No ready recommendations yet'}</p>}
        </div>
        {canEdit && <section aria-label="Snapshot product picker">
          <h3>Snapshot products</h3>
          <label className="f07-search"><Search size={16} /><input aria-label="Search snapshot products" value={productQuery} onChange={e => search(e.target.value)} placeholder="Name or SKU" /></label>
          <label className="f07-field">Destination zone<select aria-label="Manual product zone" value={targetZone ?? ''} onChange={e => { if (editableZone(e.target.value)) setManualZone(e.target.value); }}>
            {editableZones.map(zone => <option key={zone.zone} value={zone.zone}>{ZONE_LABELS[zone.zone]}</option>)}
          </select></label>
          {productError && <p role="alert" className="f07-error-text">{productError}</p>}
          {!results && !productError && <p role="status">Loading snapshot products…</p>}
          {results?.items.length === 0 && <p>No matching snapshot products.</p>}
          <div className="f07-library-list">{results?.items.map(product => <article className="f07-library-card" key={product.productId}>
            <ProductTile id={product.productId} name={product.productName} sku={product.sku} />
            <small>Sellable: {product.sellableQuantity} · Utility: {formatUtility(product.snapshotWeightedUtility)}</small>
            {!product.eligible && <p className="f07-block-reason">{product.validationErrors.join(' ') || 'Not eligible for Layout B.'}</p>}
            <button className="f07-icon-button" aria-label={`Add manual product ${product.productId}`} disabled={!edit || !product.eligible || placed.has(product.productId) || !targetZone}
              onClick={() => { if (targetZone && editableZone(targetZone)) add(targetZone, [product.productId], null); }}><Plus size={16} />Add</button>
          </article>)}</div>
          {results && <div className="f07-actions">
            <button className="f07-button" disabled={page === 0} onClick={() => { setResults(null); setProductError(''); setPage(page - 1); }}>Previous products</button>
            <button className="f07-button" disabled={(page + 1) * results.pageSize >= results.totalElements} onClick={() => { setResults(null); setProductError(''); setPage(page + 1); }}>Next products</button>
          </div>}
        </section>}
      </aside>

      <div className="f07-board f07-panel">
        <div className="f07-board-heading"><div><span className="f07-eyebrow">DISPLAY ARRANGEMENT</span><h2>Layout canvas</h2><p className="f07-muted">Move, reorder or remove individual products. Products with the same zone and block number form one block.</p></div><LayoutGrid size={22} /></div>
        <div className="f07-toolbar"><div className="f07-segment" role="group" aria-label="Choose layout"><button aria-pressed={role === 'A'} onClick={() => setRole('A')}><LockKeyhole size={14} />A · Baseline</button><button aria-pressed={role === 'B'} onClick={() => setRole('B')}><Sparkles size={14} />B · Recommendations</button></div><LayoutStatus value={role === 'A' ? a.status : b.status} /></div>
        {role === 'A' && <div className="f07-readonly"><LockKeyhole size={15} />Baseline A is generated by product frequency and cannot be edited.</div>}
        {role === 'B' && !canEdit && <div className="f07-readonly"><Eye size={15} />View-only. A Merchandiser can edit a draft campaign’s Layout B.</div>}
        {feedback && <p role="status" className="f07-warning">{feedback}</p>}
        <div className="f07-canvas">
          {(role === 'A' ? policy.zones.filter(zone => zone.zone === 'BASELINE') : editableZones).map(zone => {
            const groups = groupedPlacements(placements, zone.zone);
            const count = role === 'A' ? a.placements.length : groups.reduce((sum, group) => sum + group.products.length, 0);
            return <section key={zone.zone} className={`f07-zone f07-tone-${ZONE_COLORS[zone.zone] || 'slate'}`} aria-label={`${zone.zone} zone`}
              onDragOver={event => { if (edit) event.preventDefault(); }} onDrop={event => { event.preventDefault(); drop(zone.zone); }}>
              <div className="f07-zone-heading"><div>{zone.zone === 'BUNDLE' ? <Gift size={18} /> : <LayoutGrid size={18} />}<h3>{ZONE_LABELS[zone.zone] || zone.zone}</h3></div><span>{role === 'A' ? count : groups.length}{zone.maxBlocks === null ? '' : ` / ${zone.maxBlocks}`} blocks · {count}{zone.maxProducts === null ? '' : ` / ${zone.maxProducts}`} products</span></div>
              {role === 'A' ? <div className="f07-baseline-products">{a.placements.map(row => <div key={row.productId}><ProductTile id={row.productId} name={row.productName} sku={row.sku} /><small>#{row.position} · {formatUtility(row.snapshotWeightedUtility)}</small></div>)}</div>
                : <div className="f07-zone-blocks">{groups.map(group => <article key={group.blockNo} className={`f07-canvas-block ${group.products.some(row => !row.valid) ? 'is-invalid' : ''}`}>
                  <div className="f07-block-heading"><strong>Block {group.blockNo}</strong></div>
                  <div className="f07-block-products">{group.products.map((row, index) => <div key={row.productId} draggable={edit}
                    onDragStart={event => { event.dataTransfer.setData('text/plain', String(row.productId)); setDraggedProduct(row.productId); }} onDragEnd={() => setDraggedProduct(null)}>
                    <ProductTile id={row.productId} name={row.productName} sku={row.sku} />
                    <small>Position {row.position} · {row.sourceRecommendationId === null ? 'Manual' : `F06 #${row.sourceRecommendationId}`}</small>
                    {!row.valid && <p className="f07-error-text">{row.validationErrors.join(' ')}</p>}
                    {edit && <div className="f07-actions">
                      <select aria-label={`Zone for product ${row.productId}`} value={row.zone} onChange={event => { if (editableZone(event.target.value)) apply(movePlacement(placements, row.productId, event.target.value)); }}>
                        {editableZones.map(item => <option key={item.zone} value={item.zone}>{ZONE_LABELS[item.zone]}</option>)}
                      </select>
                      <select aria-label={`Block for product ${row.productId}`} value={row.blockNo} onChange={event => { if (editableZone(row.zone)) apply(movePlacement(placements, row.productId, row.zone, Number(event.target.value))); }}>
                        {groups.map(item => <option key={item.blockNo} value={item.blockNo}>Block {item.blockNo}</option>)}
                        <option value={groups.at(-1)!.blockNo + 1}>New block</option>
                      </select>
                      <button className="f07-icon-button" aria-label={`Move product ${row.productId} up`} disabled={index === 0} onClick={() => onChange(shiftPlacement(placements, row.productId, -1))}><ArrowUp size={14} /></button>
                      <button className="f07-icon-button" aria-label={`Move product ${row.productId} down`} disabled={index === group.products.length - 1} onClick={() => onChange(shiftPlacement(placements, row.productId, 1))}><ArrowDown size={14} /></button>
                      <button className="f07-icon-button" aria-label={`Remove product ${row.productId}`} onClick={() => { setFeedback(''); onChange(placements.filter(item => item.productId !== row.productId)); }}><Trash2 size={14} /></button>
                    </div>}
                  </div>)}</div>
                </article>)}{!groups.length && <div className="f07-zone-placeholder"><Plus size={20} /><span>{edit ? 'Add a product to this zone' : 'No blocks in this zone'}</span></div>}</div>}
            </section>;
          })}
        </div>
        {role === 'B' && <div className="f07-savebar">
          <div><strong>{dirty ? 'Changes not saved' : `Saved layout · version ${b.version}`}</strong><small>{dirty ? 'Save to update utility and validate your arrangement.' : b.valid ? 'The saved layout passed validation.' : 'Add valid products before marking this layout ready.'}</small></div>
          <div className="f07-actions">
            <button className="f07-button" disabled={busy || !dirty} onClick={onReset}><RotateCcw size={15} />Discard</button>
            <button className="f07-button" disabled={busy || dirty} onClick={onPreview}><Eye size={15} />Validate</button>
            {canEdit && <><button className="f07-button f07-primary" disabled={busy || !dirty || errors.length > 0} onClick={onSave}><Save size={15} />Save Layout B</button>
              <button className="f07-button" disabled={busy || dirty || !b.valid || !placements.length || b.status === 'READY'} onClick={onReady}><CheckCircle2 size={15} />Mark ready</button></>}
          </div>
        </div>}
        {role === 'B' && (errors.length > 0 || !dirty && b.validationErrors.length > 0) && <div className="f07-validation" role="status"><strong>Review this arrangement</strong><ul>{[...new Set([...errors, ...(!dirty ? b.validationErrors : [])])].map(error => <li key={error}>{error}</li>)}</ul></div>}
      </div>
    </div>
  </section>;
}
