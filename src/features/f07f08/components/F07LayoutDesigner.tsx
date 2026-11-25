import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, CheckCircle2, Eye, Gift, GripVertical, LayoutGrid, LockKeyhole, Package, Plus, RotateCcw, Save, Search, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import type { LayoutPolicy, LayoutProduct, LayoutView, RecommendationOption, RecommendationType } from '../f07f08.api';
import { designerBlocks, draftErrors, formatUtility, moveBlock, ZONE_LABELS, ZONES } from '../f07.designer';
import './F07Workspace.css';

export const ZONE_COLORS: Record<string, string> = { BASELINE: 'slate', BANNER: 'amber', BUNDLE: 'purple', CROSS_SELL: 'blue', FBT: 'green' };
export function LayoutStatus({ value }: { value: string }) { return <span className={`f07-status f07-status-${value.toLowerCase()}`}>{({ DRAFT: 'Draft', READY: 'Ready', PUBLISHED: 'Awaiting activation', ACTIVE: 'In use', ENDED: 'Ended', ARCHIVED: 'Archived' } as Record<string, string>)[value] || value.replaceAll('_', ' ')}</span>; }

function ProductTile({ id, products }: { id: number; products: Record<number, LayoutProduct> }) {
  const product = products[id];
  return <div className="f07-product"><div className={`f07-pack f07-pack-${id % 4}`}><Package size={26} strokeWidth={1.4} aria-hidden="true" /></div><div><strong>{product?.name || `Product #${id}`}</strong><small>{product?.sku || `#${id}`}</small></div></div>;
}

interface Props {
  a: LayoutView; b: LayoutView; policy: LayoutPolicy; recommendations: RecommendationOption[];
  products: Record<number, LayoutProduct>; ids: number[]; dirty: boolean; canEdit: boolean; busy: boolean;
  onChange: (ids: number[]) => void; onSave: () => void; onPreview: () => void; onReady: () => void; onReset: () => void;
}

export function F07LayoutDesigner({ a, b, policy, recommendations, products, ids, dirty, canEdit, busy, onChange, onSave, onPreview, onReady, onReset }: Props) {
  const [role, setRole] = useState<'A' | 'B'>('B');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RecommendationType | 'ALL'>('ALL');
  const [drag, setDrag] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const blocks = useMemo(() => designerBlocks(recommendations, b), [recommendations, b]);
  const errors = draftErrors(ids, blocks, policy);
  const edit = canEdit && role === 'B' && !busy;
  const shown = recommendations.filter(item => (filter === 'ALL' || item.type === filter) && [String(item.recommendationId), ...item.productIds.map(id => `${products[id]?.name || ''} ${products[id]?.sku || ''} ${id}`)].join(' ').toLowerCase().includes(query.toLowerCase()));
  const productCount = new Set(ids.flatMap(id => blocks.get(id)?.productIds || [])).size;
  const difference = b.weightedUtilityScore !== null && b.equalSizeBaselineScore !== null ? b.weightedUtilityScore - b.equalSizeBaselineScore : null;
  const addError = (id: number) => ids.includes(id) ? 'Already added to the proposed layout.' : draftErrors([...ids, id], blocks, policy)[0];
  function add(id: number) { const error = addError(id); if (error) setFeedback(error); else { setFeedback(''); onChange([...ids, id]); } }
  function drop(zone: string, target?: number) {
    if (!edit || drag === null) return;
    const block = blocks.get(drag);
    if (!block || block.type !== zone) { setFeedback('Place this product group in the section with the same category.'); setDrag(null); return; }
    if (ids.includes(drag)) { onChange(target ? moveBlock(ids, drag, target, blocks) : [...ids.filter(id => id !== drag), drag]); }
    else add(drag);
    setDrag(null);
  }
  function shift(id: number, direction: number) {
    const peers = ids.filter(item => blocks.get(item)?.type === blocks.get(id)?.type);
    const index = peers.indexOf(id), other = peers[index + direction];
    if (other === undefined) return;
    const next = [...ids], left = next.indexOf(id), right = next.indexOf(other);
    [next[left], next[right]] = [next[right], next[left]]; onChange(next);
  }
  return <section className="f07-designer" aria-label="Arrange products">
    <div className="f07-score-grid">
      <div className="f07-score"><span>Reference layout (A)</span><strong>{formatUtility(a.weightedUtilityScore)}</strong><small>{a.placements.length} products · read-only</small></div>
      <div className="f07-score"><span>Proposed layout (B)</span><strong>{dirty ? 'Unsaved changes' : formatUtility(b.weightedUtilityScore)}</strong><small>{productCount} products · {ids.length} groups</small></div>
      <div className="f07-score f07-score-accent"><span>Score difference</span><strong>{dirty ? 'Save to compare' : `${difference !== null && difference > 0 ? '+' : ''}${formatUtility(difference)}`}</strong><small>{dirty ? 'Scores update after saving your layout.' : `Compared with the top ${b.equalSizeProductCount ?? '—'} products in A`}</small></div>
    </div>
    <p className="f07-score-note">These scores reflect product value in the selected sales data. The difference compares the same number of products in each layout. Scores do not represent sales revenue.</p>
    <div className="f07-editor-grid">
      <aside className="f07-library f07-panel">
        <div className="f07-panel-heading"><div><span className="f07-eyebrow">READY TO ADD</span><h2>Approved product groups</h2></div><ShieldCheck size={21} /></div>
        <p className="f07-muted">Add groups approved for this campaign’s sales data. Products in each group stay together.</p>
        <label className="f07-search"><Search size={16} /><input aria-label="Search recommendations" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a product or SKU…" /></label>
        <label className="f07-field">Group category<select aria-label="Filter recommendation type" value={filter} onChange={e => setFilter(e.target.value as typeof filter)}><option value="ALL">All types ({recommendations.length})</option>{ZONES.map(type => <option key={type} value={type}>{ZONE_LABELS[type]}</option>)}</select></label>
        <div className="f07-library-list">
          {shown.map(block => { const placed = ids.includes(block.recommendationId), reason = addError(block.recommendationId); return <article key={block.recommendationId} className={`f07-library-card ${placed ? 'is-placed' : ''}`} draggable={edit && !placed && !reason} onDragStart={e => { e.dataTransfer.setData('text/plain', String(block.recommendationId)); e.dataTransfer.effectAllowed = 'copy'; setDrag(block.recommendationId); }} onDragEnd={() => setDrag(null)}>
            <div className="f07-card-heading"><span className={`f07-type f07-tone-${ZONE_COLORS[block.type]}`}>{ZONE_LABELS[block.type]}</span></div>
            <div className="f07-library-products">{block.productIds.map(id => <ProductTile key={id} id={id} products={products} />)}</div>
            <div className="f07-card-footer"><span>{block.productIds.length} products</span><button className="f07-icon-button" aria-label={`${placed ? 'Placed' : 'Add'} recommendation ${block.recommendationId}`} disabled={!edit || placed || !!reason} title={reason || 'Add this group to the proposed layout'} onClick={() => add(block.recommendationId)}>{placed ? <Check size={16} /> : <Plus size={16} />}{placed ? 'Placed' : 'Add'}</button></div>
            {!placed && reason && <p className="f07-block-reason">{reason}</p>}
          </article>; })}
          {!shown.length && <div className="f07-empty"><Package size={28} /><strong>{recommendations.length ? 'No matching product groups' : 'No approved groups yet'}</strong><p>{recommendations.length ? 'Try another search or type.' : 'Prepare and approve product suggestions for the same sales data in Recommendations, then refresh this page.'}</p></div>}
        </div>
      </aside>
      <div className="f07-board f07-panel">
        <div className="f07-board-heading"><div><span className="f07-eyebrow">DISPLAY ARRANGEMENT</span><h2>Product arrangement</h2><p className="f07-muted">Add product groups to the matching sections. Drag groups or use the arrows to change their order.</p></div><LayoutGrid size={22} /></div>
        <div className="f07-toolbar"><div className="f07-segment" role="group" aria-label="Choose layout"><button aria-pressed={role === 'A'} onClick={() => setRole('A')}><LockKeyhole size={14} />A · Reference</button><button aria-pressed={role === 'B'} onClick={() => setRole('B')}><Sparkles size={14} />B · Proposed</button></div><LayoutStatus value={role === 'A' ? a.status : b.status} /></div>
        {role === 'A' && <div className="f07-readonly"><LockKeyhole size={15} />The reference layout is created from the most frequently purchased products. It is read-only so you can compare your proposal against it.</div>}
        {role === 'B' && !canEdit && <div className="f07-readonly"><Eye size={15} />View-only. The merchandising team can edit the proposed layout while the campaign is a draft.</div>}
        {feedback && <p role="status" className="f07-warning">{feedback}</p>}
        <div className="f07-canvas">
          {(role === 'A' ? policy.zones.filter(zone => zone.zone === 'BASELINE') : policy.zones.filter(zone => zone.recommendationType)).map(zone => {
            const selected = ids.map(id => blocks.get(id)).filter(block => block?.type === zone.recommendationType);
            const count = role === 'A' ? a.placements.length : selected.reduce((sum, block) => sum + block!.productIds.length, 0);
            return <section key={zone.zone} className={`f07-zone f07-tone-${ZONE_COLORS[zone.zone] || 'slate'} ${drag !== null && blocks.get(drag)?.type === zone.zone && edit ? 'is-drop-target' : ''}`} aria-label={`${zone.zone} zone`} onDragOver={e => { if (edit) e.preventDefault(); }} onDrop={e => { e.preventDefault(); drop(zone.zone); }}>
              <div className="f07-zone-heading"><div>{zone.zone === 'BUNDLE' ? <Gift size={18} /> : <LayoutGrid size={18} />}<h3>{ZONE_LABELS[zone.zone] || zone.zone}</h3></div><span>{role === 'A' ? a.placements.length : selected.length}{zone.maxBlocks === null ? '' : ` / ${zone.maxBlocks}`} groups · {count}{zone.maxProducts === null ? '' : ` / ${zone.maxProducts}`} products</span></div>
              {role === 'A' ? <div className="f07-baseline-products">{a.placements.map(row => <div key={row.productId}><ProductTile id={row.productId} products={products} /><small>Position {row.position}</small></div>)}</div> : <div className="f07-zone-blocks">{selected.map((block, index) => block && <article key={block.recommendationId} className={`f07-canvas-block ${!block.eligible ? 'is-invalid' : ''}`} draggable={edit} onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData('text/plain', String(block.recommendationId)); e.dataTransfer.effectAllowed = 'move'; setDrag(block.recommendationId); }} onDragEnd={() => setDrag(null)} onDrop={e => { e.stopPropagation(); e.preventDefault(); drop(zone.zone, block.recommendationId); }}>
                <div className="f07-block-heading"><span><GripVertical size={15} />Group {index + 1}</span><div><button className="f07-icon-button" aria-label={`Move block ${block.recommendationId} up`} disabled={!edit || index === 0} onClick={() => shift(block.recommendationId, -1)}><ArrowUp size={14} /></button><button className="f07-icon-button" aria-label={`Move block ${block.recommendationId} down`} disabled={!edit || index === selected.length - 1} onClick={() => shift(block.recommendationId, 1)}><ArrowDown size={14} /></button><button className="f07-icon-button" aria-label={`Remove recommendation ${block.recommendationId}`} disabled={!edit} onClick={() => onChange(ids.filter(id => id !== block.recommendationId))}><Trash2 size={14} /></button></div></div>
                <div className="f07-block-products">{block.productIds.map(id => <ProductTile key={id} id={id} products={products} />)}</div>
                {!block.eligible && <p className="f07-error-text">{block.errors.join(' ')}</p>}
              </article>)}{!selected.length && <div className="f07-zone-placeholder"><Plus size={20} /><span>{edit ? 'Add a matching group from the list on the left' : 'No product groups added yet'}</span></div>}</div>}
            </section>;
          })}
        </div>
        {role === 'B' && <div className="f07-savebar"><div><strong>{dirty ? 'Changes not saved' : 'All changes saved'}</strong><small>{dirty ? 'Save to update scores and check your product groups.' : b.valid ? 'Product checks passed.' : 'Add available product groups, save and check the layout before finishing.'}</small></div><div className="f07-actions"><button className="f07-button" disabled={busy || !dirty} onClick={onReset}><RotateCcw size={15} />Discard changes</button><button className="f07-button" disabled={busy || dirty} onClick={onPreview}><Eye size={15} />Check products</button>{canEdit && <><button className="f07-button f07-primary" disabled={busy || !dirty || errors.length > 0} onClick={onSave}><Save size={15} />Save layout</button><button className="f07-button" disabled={busy || dirty || !b.valid || !ids.length || b.status === 'READY'} onClick={onReady}><CheckCircle2 size={15} />Finish layout</button></>}</div></div>}
        {role === 'B' && (errors.length > 0 || !dirty && b.validationErrors.length > 0) && <div className="f07-validation" role="status"><strong>Review this arrangement</strong><ul>{[...new Set([...errors, ...(!dirty ? b.validationErrors : [])])].map(error => <li key={error}>{error}</li>)}</ul></div>}
      </div>
    </div>
  </section>;
}
