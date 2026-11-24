import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Flame, Gift, Grip, LayoutGrid, Map as MapIcon, Package, Plus, RefreshCw, RotateCcw, Save, Search, Sparkles, Trash2, TrendingUp, WandSparkles, X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { F02Product, storeApi } from '../store.api';
import {
  CANVAS_WIDTH, FRAME_HEIGHT, FRAME_WIDTH,
  parseProductFrames, vacantProductFrame, type ProductFrame, type ProductFrameMap,
} from '../storeLayoutFrames';
import {
  alignMerchandisingProducts, arrangeMerchandisingProducts, autoArrangeMerchandisingProducts, GROUPS, GROUP_LABELS, merchandisingLayoutSignature, merchandisingZones,
  parseMerchandising, productGroup, rebaseMerchandisingFrames, reorderMerchandisingProducts, restoreMerchandisingFrames, type ProductGroup,
} from '../storeLayoutMerchandising';
import { illustratedPackshot, layoutImageFor, mockLayoutProduct } from '../storeLayoutMockCatalog';
import { authService } from '../../../services/authService';
import { comboDraftError, comboFacts, comboStorageKey, emptyComboState, parseComboState, suggestCombos, type ComboPlan, type ComboState } from '../storeLayoutCombos';
import { StoreLayoutComboDialog } from './StoreLayoutComboDialog';
import { StoreLayoutStockDialog } from './StoreLayoutStockDialog';

const readSavedSignature = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const SINGLE_PRODUCT_GROUPS = GROUPS.filter(group => group !== 'combo');
const singleProductGroup = (product: F02Product, overrides: Record<string, ProductGroup>): ProductGroup => {
  const group = productGroup(product, overrides);
  return group === 'combo' ? 'regular' : group;
};
const readCombos = (key: string): ComboState => {
  try { return parseComboState(localStorage.getItem(key)); } catch { return emptyComboState(); }
};
const GROUP_ICONS = { hot: Flame, new: Sparkles, combo: Gift, best: TrendingUp, regular: LayoutGrid };
const GROUP_STYLES = {
  hot: { shell: 'border-[#E9B8A8] bg-[#FFF8F3]', header: 'border-[#F0D7CC] bg-[#FFF0E8]', pill: 'border-[#E9B8A8] bg-[#FFF0E8] text-[#A3482D]', icon: 'text-[#B95436]', card: 'border-[#E9B8A8]', ring: 'ring-[#E9B8A8]', list: 'bg-[#FFF8F3]' },
  new: { shell: 'border-[#C9D8EE] bg-[#F8FAFF]', header: 'border-[#DFE9F7] bg-[#EEF4FF]', pill: 'border-[#C9D8EE] bg-[#EEF4FF] text-[#3D6395]', icon: 'text-[#527CB4]', card: 'border-[#C9D8EE]', ring: 'ring-[#C9D8EE]', list: 'bg-[#F8FAFF]' },
  combo: { shell: 'border-[#E0D2EA] bg-[#FCF9FF]', header: 'border-[#E9DFF0] bg-[#F7EEFC]', pill: 'border-[#E0D2EA] bg-[#F7EEFC] text-[#785291]', icon: 'text-[#8B61A0]', card: 'border-[#E0D2EA]', ring: 'ring-[#E0D2EA]', list: 'bg-[#FCF9FF]' },
  best: { shell: 'border-[#BED5DE] bg-[#F5FAFB]', header: 'border-[#D8E8EC] bg-[#EAF5F7]', pill: 'border-[#BED5DE] bg-[#EAF5F7] text-[#315A6A]', icon: 'text-[#4F7889]', card: 'border-[#BED5DE]', ring: 'ring-[#BED5DE]', list: 'bg-[#F5FAFB]' },
  regular: { shell: 'border-[#D9E2E5] bg-[#F8FAFA]', header: 'border-[#E5EAEC] bg-[#F1F5F5]', pill: 'border-[#D9E2E5] bg-[#F8FAFA] text-[#52636D]', icon: 'text-[#577181]', card: 'border-[#D9E2E5]', ring: 'ring-[#D9E2E5]', list: 'bg-[#F8FAFA]' },
} satisfies Record<ProductGroup, { shell: string; header: string; pill: string; icon: string; card: string; ring: string; list: string }>;

function ProductImage({ product, className }: { product: F02Product; className: string }) {
  const [failed, setFailed] = useState(false);
  return <img src={failed ? illustratedPackshot(product) : layoutImageFor(product)} alt="" draggable={false} className={className} loading="lazy" onError={() => setFailed(true)} />;
}

function readInitialFrames(storageKey: string): ProductFrameMap | null {
  try {
    const saved = parseProductFrames(localStorage.getItem(storageKey));
    if (saved) return saved;
    return null;
  } catch {
    return null;
  }
}

const price = (value: number) => Number.isFinite(value) && value > 0 ? `${new Intl.NumberFormat('vi-VN').format(value)} ₫` : 'Chưa có giá';
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const visibleProducts = (products: F02Product[], frames: ProductFrameMap) =>
  products.filter(product => frames[String(product.id)]);

type DragState = { id: number; element: HTMLDivElement; pointerX: number; pointerY: number; originX: number; originY: number; moved: boolean };

export const StoreLayoutView: React.FC = () => {
  const comboKey = comboStorageKey(authService.getCurrentUser()?.storeId ?? authService.getCurrentUser()?.id ?? 'preview');
  const frameKey = `${comboKey}:frames`;
  const groupedKey = `${comboKey}:grouped`;
  const merchandisingKey = `${comboKey}:groups`;
  const layoutSignatureKey = `${comboKey}:layout-signature`;
  const [products, setProducts] = useState<F02Product[]>([]);
  const [frames, setFrames] = useState<ProductFrameMap | null>(() => readInitialFrames(frameKey));
  const [groupOverrides, setGroupOverrides] = useState<Record<string, ProductGroup>>(() => {
    try { return parseMerchandising(localStorage.getItem(merchandisingKey)); } catch { return {}; }
  });
  const [showZones, setShowZones] = useState(() => {
    try { return localStorage.getItem(groupedKey) === '1' || localStorage.getItem(frameKey) === null; } catch { return true; }
  });
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [pendingProductId, setPendingProductId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [listFilter, setListFilter] = useState<'all' | 'placed' | 'unplaced'>('all');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(0.82);
  const [comboState, setComboState] = useState<ComboState>(() => readCombos(comboKey));
  const [editingCombo, setEditingCombo] = useState<ComboPlan | null>(null);
  const [comboError, setComboError] = useState('');
  const [stockProductId, setStockProductId] = useState<number | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const pendingPositionRef = useRef<{ element: HTMLDivElement; position: ProductFrame } | null>(null);

  useEffect(() => {
    let active = true;
    storeApi.listProducts({ page: 0, pageSize: 100, status: 'ACTIVE' })
      .then(data => {
        if (!active) return;
        const items = (data.content || []).map(mockLayoutProduct);
        setProducts(items);
        setFrames(current => {
          const itemGroups = Object.fromEntries(items.map(item => [String(item.id), singleProductGroup(item, groupOverrides)])) as Record<string, ProductGroup>;
          if (!current) return {};
          if (!showZones) return current;
          const placed = visibleProducts(items, current);
          return restoreMerchandisingFrames(current, placed, itemGroups, comboState.combos.length, readSavedSignature(layoutSignatureKey));
        });
      })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Không thể tải sản phẩm'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    if (dragFrameRef.current !== null) cancelAnimationFrame(dragFrameRef.current);
  }, []);

  useEffect(() => {
    setComboState(readCombos(comboKey));
    setEditingCombo(null);
  }, [comboKey]);

  const placedFrames = frames ?? {};
  const groups = useMemo(() => Object.fromEntries(products.map(product => [String(product.id), singleProductGroup(product, groupOverrides)])) as Record<string, ProductGroup>, [products, groupOverrides]);
  const productById = useMemo(() => new Map(products.map(product => [product.id, product])), [products]);
  const placedProducts = visibleProducts(products, placedFrames);
  const zones = merchandisingZones(placedProducts, groups, { combo: comboState.combos.length });
  const zoneHeight = showZones ? Math.max(0, ...zones.map(zone => zone.y + zone.height)) : 0;
  const availableProducts = products.filter(product => !placedFrames[String(product.id)]);
  const matchingProducts = products.filter(product => {
    const isPlaced = Boolean(placedFrames[String(product.id)]);
    return (listFilter === 'all' || (listFilter === 'placed' && isPlaced) || (listFilter === 'unplaced' && !isPlaced)) &&
      `${product.name} ${product.sku} ${product.category?.name || ''}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'));
  });
  const selectedProduct = selectedProductId === null ? null : productById.get(selectedProductId);
  const activeProduct = (pendingProductId === null ? null : productById.get(pendingProductId)) ?? selectedProduct;
  const canvasHeight = Math.max(
    700, zoneHeight,
    ...Object.values(placedFrames).map(position => position.y + FRAME_HEIGHT + 70),
  );

  const pointOnCanvas = (clientX: number, clientY: number): ProductFrame => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 36, y: 36 };
    return {
      x: clamp(Math.round((clientX - rect.left) / zoom - FRAME_WIDTH / 2), 12, CANVAS_WIDTH - FRAME_WIDTH - 12),
      y: clamp(Math.round((clientY - rect.top) / zoom - FRAME_HEIGHT / 2), 12, canvasHeight - FRAME_HEIGHT - 12),
    };
  };

  const groupAtCanvasPoint = (clientY: number): ProductGroup | undefined => {
    if (!showZones) return undefined;
    const rect = canvasRef.current?.getBoundingClientRect();
    const y = rect ? (clientY - rect.top) / zoom : -1;
    return zones.find(zone => y >= zone.y && y < zone.y + zone.height)?.group;
  };

  const persistGroup = (id: number, group: ProductGroup) => {
    setGroupOverrides(current => {
      const next = { ...current, [String(id)]: group };
      try { localStorage.setItem(merchandisingKey, JSON.stringify(next)); } catch { /* Giữ thay đổi trong phiên này. */ }
      return next;
    });
  };

  const persistCombos = (next: ComboState) => {
    setComboState(next);
    try { localStorage.setItem(comboKey, JSON.stringify(next)); }
    catch { setError('Không thể lưu combo trong trình duyệt này.'); }
  };

  const openNewCombo = (seedProductId?: number) => {
    setEditingCombo({
      id: `manual:${crypto.randomUUID()}`, name: '', source: 'manual', status: 'suggested', price: null,
      items: [{ productId: seedProductId ?? 0, quantity: 1 }, { productId: 0, quantity: 1 }],
    });
    setComboError('');
  };

  const openCombo = (combo: ComboPlan) => {
    setEditingCombo({ ...combo, items: combo.items.map(item => ({ ...item })) });
    setComboError('');
  };

  const saveCombo = (approve: boolean) => {
    if (!editingCombo) return;
    const validationError = comboDraftError(editingCombo, products, approve);
    if (validationError) { setComboError(validationError); return; }
    const name = editingCombo.name.trim();
    const updated: ComboPlan = { ...editingCombo, name, status: approve ? 'approved' : 'suggested' };
    const currentIndex = comboState.combos.findIndex(combo => combo.id === updated.id);
    const combos = [...comboState.combos];
    if (currentIndex >= 0) combos[currentIndex] = updated;
    else combos.push(updated);
    persistCombos({ ...comboState, combos });
    if (currentIndex < 0) setFrames(current => rebaseMerchandisingFrames(current ?? {}, placedProducts, groups, { combo: comboState.combos.length }, { combo: combos.length }));
    setShowZones(true);
    setEditingCombo(null);
    setNotice(approve ? 'Đã duyệt combo mẫu.' : 'Đã lưu combo đề xuất trên trình duyệt.');
  };

  const dismissCombo = () => {
    if (!editingCombo) return;
    const combos = comboState.combos.filter(combo => combo.id !== editingCombo.id);
    const dismissedIds = editingCombo.source === 'auto'
      ? [...new Set([...comboState.dismissedIds, editingCombo.id])] : comboState.dismissedIds;
    persistCombos({ combos, dismissedIds });
    setFrames(current => rebaseMerchandisingFrames(current ?? {}, placedProducts, groups, { combo: comboState.combos.length }, { combo: combos.length }));
    setShowZones(true);
    setEditingCombo(null);
    setNotice('Đã bỏ qua combo này.');
  };

  const placeProduct = (id: number, position: ProductFrame, targetGroup?: ProductGroup) => {
    const product = productById.get(id);
    if (!product) return;
    if (targetGroup === 'combo') { openNewCombo(id); setPendingProductId(null); return; }
    const alreadyPlaced = Boolean(placedFrames[String(id)]);
    const nextGroup = targetGroup ?? groups[String(id)];
    if (targetGroup && targetGroup !== groups[String(id)]) persistGroup(id, targetGroup);
    if (showZones) {
      const nextProducts = alreadyPlaced ? placedProducts : [...placedProducts, product];
      setFrames(reorderMerchandisingProducts(nextProducts, groups, placedFrames, id, nextGroup,
        { x: position.x + FRAME_WIDTH / 2, y: position.y + FRAME_HEIGHT / 2 }, { combo: comboState.combos.length }));
    } else if (targetGroup) {
      const nextProducts = alreadyPlaced ? placedProducts : [...placedProducts, product];
      setFrames(arrangeMerchandisingProducts(nextProducts, { ...groups, [String(id)]: nextGroup }, { combo: comboState.combos.length }));
      setShowZones(true);
    } else {
      setFrames(current => {
        const next = { ...(current ?? {}) };
        delete next[String(id)];
        next[String(id)] = vacantProductFrame(position, next, canvasHeight);
        return next;
      });
    }
    setSelectedProductId(id);
    setPendingProductId(null);
    setNotice(`${alreadyPlaced ? 'Đã chuyển' : 'Đã thêm'} sản phẩm${targetGroup ? ` vào ${GROUP_LABELS[nextGroup]}` : ''}. Bấm Lưu bố cục để lưu.`);
  };

  const removeProduct = (id: number) => {
    if (showZones) {
      setFrames(alignMerchandisingProducts(placedProducts.filter(product => product.id !== id), groups, placedFrames, { combo: comboState.combos.length }));
    } else {
      setFrames(current => {
        const next = { ...(current ?? {}) };
        delete next[String(id)];
        return next;
      });
    }
    if (selectedProductId === id) setSelectedProductId(null);
    setNotice('Đã gỡ sản phẩm khỏi mặt bằng.');
  };

  const autoArrange = () => {
    const nextCombos = suggestCombos(products, comboState);
    if (nextCombos.combos.length !== comboState.combos.length) persistCombos(nextCombos);
    const arrangement = autoArrangeMerchandisingProducts(products, groupOverrides, product => singleProductGroup(product, groupOverrides), { combo: nextCombos.combos.length });
    setFrames(arrangement.frames);
    setShowZones(true);
    setPendingProductId(null);
    setSelectedProductId(null);
    const classified = arrangement.zones.filter(zone => zone.group !== 'regular' && zone.count > 0);
    setNotice(classified.length
      ? `Đã xếp ${products.length} sản phẩm và ${nextCombos.combos.length} combo. Combo mới là đề xuất, cần xem và duyệt trước khi sử dụng.`
      : `Đã xếp ${products.length} sản phẩm vào Sản phẩm thường. Hãy gán mục cho sản phẩm rồi bấm Tự động xếp.`);
  };

  const resetLayout = () => {
    const emptyCombos = emptyComboState();
    try {
      localStorage.setItem(frameKey, '{}');
      localStorage.setItem(groupedKey, '1');
      localStorage.setItem(layoutSignatureKey, merchandisingLayoutSignature([], {}, 0));
      localStorage.setItem(merchandisingKey, '{}');
      localStorage.setItem(comboKey, JSON.stringify(emptyCombos));
    } catch {
      setError('Không thể đặt lại bố cục trong trình duyệt này.');
      return;
    }
    setFrames({});
    setGroupOverrides({});
    setComboState(emptyCombos);
    setShowZones(true);
    setSelectedProductId(null);
    setPendingProductId(null);
    setEditingCombo(null);
    setComboError('');
    setQuery('');
    setListFilter('all');
    viewportRef.current?.scrollTo({ left: 0, top: 0 });
    setNotice('Mặt bằng đã trống. Bấm Tự động xếp để tạo đề xuất mới.');
    setError('');
  };

  const focusProduct = (id: number) => {
    const position = placedFrames[String(id)];
    if (!position) { setPendingProductId(id); return; }
    setPendingProductId(null);
    setSelectedProductId(id);
    const viewport = viewportRef.current;
    if (viewport) viewport.scrollTo({
      left: Math.max(0, position.x * zoom - viewport.clientWidth / 2 + FRAME_WIDTH * zoom / 2),
      top: Math.max(0, position.y * zoom - viewport.clientHeight / 2 + FRAME_HEIGHT * zoom / 2),
      behavior: 'smooth',
    });
  };

  const setProductGroup = (id: number, group: ProductGroup) => {
    if (group === 'combo') { openNewCombo(id); return; }
    if (groups[String(id)] === group) return;
    persistGroup(id, group);
    if (placedFrames[String(id)]) {
      const zone = zones.find(item => item.group === group);
      setFrames(reorderMerchandisingProducts(placedProducts, groups, placedFrames, id, group,
        { x: CANVAS_WIDTH, y: (zone?.y ?? 0) + (zone?.height ?? 0) }, { combo: comboState.combos.length }));
      setShowZones(true);
    }
    setNotice(`Đã chuyển sản phẩm vào ${GROUP_LABELS[group]}. Bấm Lưu bố cục để lưu.`);
  };

  const save = () => {
    try {
      localStorage.setItem(frameKey, JSON.stringify(placedFrames));
      localStorage.setItem(groupedKey, showZones ? '1' : '0');
      localStorage.setItem(layoutSignatureKey, merchandisingLayoutSignature(placedProducts, groups, comboState.combos.length));
      setNotice('Đã lưu vị trí và sản phẩm trên mặt bằng.');
      setError('');
    } catch {
      setError('Không thể lưu bố cục trong trình duyệt này.');
    }
  };

  const fitToView = () => {
    const width = viewportRef.current?.clientWidth || 900;
    setZoom(clamp(Math.min((width - 24) / CANVAS_WIDTH, 700 / canvasHeight), 0.18, 1.5));
    viewportRef.current?.scrollTo({ left: 0, top: 0 });
  };

  const queueFramePosition = (element: HTMLDivElement, position: ProductFrame) => {
    pendingPositionRef.current = { element, position };
    if (dragFrameRef.current !== null) return;
    dragFrameRef.current = requestAnimationFrame(() => {
      dragFrameRef.current = null;
      const pending = pendingPositionRef.current;
      if (!pending) return;
      pending.element.style.left = `${pending.position.x}px`;
      pending.element.style.top = `${pending.position.y}px`;
    });
  };

  const moveFrame = (event: React.PointerEvent<HTMLDivElement>, id: number) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== id) return;
    const dx = (event.clientX - drag.pointerX) / zoom;
    const dy = (event.clientY - drag.pointerY) / zoom;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    if (!drag.moved) return;
    queueFramePosition(drag.element, {
      x: clamp(Math.round(drag.originX + dx), 0, CANVAS_WIDTH - FRAME_WIDTH),
      y: clamp(Math.round(drag.originY + dy), 0, canvasHeight - FRAME_HEIGHT),
    });
  };

  const finishFrameMove = (event: React.PointerEvent<HTMLDivElement>, id: number) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== id) return;
    if (dragFrameRef.current !== null) cancelAnimationFrame(dragFrameRef.current);
    dragFrameRef.current = null;
    pendingPositionRef.current = null;
    if (drag.moved) {
      drag.element.style.left = `${drag.originX}px`;
      drag.element.style.top = `${drag.originY}px`;
      const dx = (event.clientX - drag.pointerX) / zoom;
      const dy = (event.clientY - drag.pointerY) / zoom;
      const targetGroup = groupAtCanvasPoint(event.clientY);
      if (targetGroup === 'combo') {
        openNewCombo(id);
      } else {
        const destination = targetGroup ?? groups[String(id)];
        if (destination !== groups[String(id)]) persistGroup(id, destination);
        const rect = canvasRef.current?.getBoundingClientRect();
        const drop = rect
          ? { x: (event.clientX - rect.left) / zoom, y: (event.clientY - rect.top) / zoom }
          : { x: drag.originX + dx + FRAME_WIDTH / 2, y: drag.originY + dy + FRAME_HEIGHT / 2 };
        setFrames(reorderMerchandisingProducts(placedProducts, groups, placedFrames, id, destination, drop, { combo: comboState.combos.length }));
        setNotice(`${destination !== groups[String(id)] ? `Đã chuyển vào ${GROUP_LABELS[destination]}` : 'Đã đổi thứ tự sản phẩm'} và xếp thẳng hàng. Bấm Lưu bố cục để lưu.`);
      }
    }
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#314A5E]">Store Operations · Layout</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Bố cục sản phẩm cửa hàng</h1>
          <p className="mt-1 text-sm text-[#707973]">Tự động xếp sản phẩm theo mục và tạo combo đề xuất. Nhãn, combo và ảnh bổ sung là dữ liệu minh hoạ trên FE.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => window.location.reload()} className="rounded-xl border border-[#E7E2D8] bg-white px-3 py-2 text-sm"><RefreshCw className="mr-2 inline h-4 w-4" />Tải lại</button>
          <button type="button" onClick={resetLayout} disabled={loading} className="rounded-xl border border-[#E7E2D8] bg-white px-3 py-2 text-sm font-semibold text-[#314A5E] disabled:opacity-50"><RotateCcw className="mr-2 inline h-4 w-4" />Đặt lại</button>
          <button onClick={autoArrange} disabled={loading || !products.length} className="rounded-xl bg-[#E8EEF2] px-3 py-2 text-sm font-bold text-[#263B4A] disabled:opacity-50"><WandSparkles className="mr-2 inline h-4 w-4" />Tự động xếp</button>
          <button onClick={save} disabled={loading} className="rounded-xl bg-[#263B4A] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save className="mr-2 inline h-4 w-4" />Lưu bố cục</button>
        </div>
      </header>
      {notice && <div className="rounded-xl border border-[#D9E0E5] bg-[#F5F7F8] px-4 py-3 text-sm text-[#314A5E]" role="status">{notice}</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</div>}
      {!showZones && !loading && <p className="rounded-xl border border-[#D9E0E5] bg-[#F5F7F8] px-4 py-3 text-xs text-[#52636D]">Vị trí đã lưu vẫn được giữ. Bấm <strong>Tự động xếp</strong> để áp dụng các mục trưng bày mới.</p>}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="self-start rounded-2xl border border-[#E7E2D8] bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 className="font-bold">Danh sách sản phẩm</h2><p className="text-xs text-gray-500">{products.length} sản phẩm · {placedProducts.length} đã đặt</p></div>
            <Package className="h-5 w-5 text-[#314A5E]" />
          </div>
          <label className="mb-3 flex items-center gap-2 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] px-3 py-2"><Search className="h-4 w-4 text-[#71808A]" /><input className="min-w-0 flex-1 bg-transparent text-xs outline-none" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tên, SKU, danh mục..." aria-label="Tìm trong tất cả sản phẩm" /></label>
          <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-[#F5F7F8] p-1" aria-label="Lọc theo trạng thái đặt sản phẩm">{([['all', 'Tất cả'], ['placed', 'Đã đặt'], ['unplaced', 'Chưa đặt']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setListFilter(value)} aria-pressed={listFilter === value} className={`rounded-lg px-1 py-2 text-[10px] font-semibold ${listFilter === value ? 'bg-white text-[#263B4A] shadow-sm' : 'text-[#71808A] hover:text-[#263B4A]'}`}>{label}</button>)}</div>
          {activeProduct && <div className="mb-3 rounded-xl border border-[#CFD9DE] bg-[#F2F6F7] p-3 text-xs text-[#263B4A]"><strong className="line-clamp-2 block text-[13px]">{activeProduct.name}</strong><label className="mt-2 block font-semibold">Mục trưng bày<select value={groups[String(activeProduct.id)]} onChange={event => setProductGroup(activeProduct.id, event.target.value as ProductGroup)} className="mt-1 block w-full rounded-lg border border-[#CDD7DE] bg-white px-2 py-2 text-xs">{SINGLE_PRODUCT_GROUPS.map(group => <option key={group} value={group}>{GROUP_LABELS[group]}</option>)}</select></label><button type="button" onClick={() => setStockProductId(activeProduct.id)} className="mt-2 w-full rounded-lg border border-[#CDD7DE] bg-white px-2 py-2 text-xs font-semibold text-[#314A5E]">Chỉnh tồn kho · hiện có {activeProduct.stockQuantity}</button><p className="mt-2 text-[11px] text-[#647680]">{pendingProductId === activeProduct.id ? 'Thả vào mục trưng bày hoặc bấm vào mặt bằng để đặt.' : 'Kéo sang mục khác hoặc chọn mục ở đây để chuyển ngay.'}</p></div>}
          {loading ? <p className="py-8 text-center text-sm text-gray-500">Đang tải sản phẩm...</p> : matchingProducts.length ? (
            <div className="max-h-[680px] space-y-2 overflow-y-auto pr-1">
              {matchingProducts.map(product => <button
                key={product.id}
                type="button"
                draggable
                onClick={() => focusProduct(product.id)}
                onDragStart={event => { event.dataTransfer.effectAllowed = 'copyMove'; event.dataTransfer.setData('application/x-store-product-id', String(product.id)); event.dataTransfer.setData('text/plain', String(product.id)); setPendingProductId(product.id); }}
                onDragEnd={() => setPendingProductId(null)}
                className={`flex w-full cursor-grab items-center gap-3 rounded-xl p-2 text-left active:cursor-grabbing ${placedFrames[String(product.id)] ? `border-2 ${GROUP_STYLES[groups[String(product.id)]].card} ${GROUP_STYLES[groups[String(product.id)]].list} ${selectedProductId === product.id ? 'ring-2 ring-[#263B4A] shadow-md' : pendingProductId === product.id ? `ring-2 ${GROUP_STYLES[groups[String(product.id)]].ring}` : ''}` : pendingProductId === product.id || selectedProductId === product.id ? 'border border-[#E8896B] bg-[#F4E4D8]' : 'border border-[#E7E2D8] bg-[#FAF8F5] hover:border-[#B6C3CD]'}`}
              >
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-white"><ProductImage product={product} className="h-12 w-12 object-contain" /></span>
                <span className="min-w-0"><strong className="line-clamp-2 text-xs">{product.name}</strong><span className="mt-1 block text-[10px] text-gray-500">{product.sku} · tồn {product.stockQuantity}</span><span className="mt-1 flex flex-wrap gap-1"><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${placedFrames[String(product.id)] ? 'bg-[#DDEBEF] text-[#315A6A]' : 'bg-white text-[#71808A]'}`}>{placedFrames[String(product.id)] ? 'Đã đặt' : 'Chưa đặt'}</span>{groups[String(product.id)] !== 'regular' && <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${GROUP_STYLES[groups[String(product.id)]].pill}`}>{GROUP_LABELS[groups[String(product.id)]]}</span>}</span></span>
              </button>)}
            </div>
          ) : <p className="py-8 text-center text-sm text-gray-500">{listFilter === 'unplaced' && !availableProducts.length && !query ? 'Tất cả sản phẩm đã có trên mặt bằng.' : 'Không tìm thấy sản phẩm.'}</p>}
        </aside>

        <section className="min-w-0 rounded-2xl border border-[#E7E2D8] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-bold">Các mục trưng bày</h2><p className="text-xs text-gray-500">Kéo thả để đổi thứ tự, các thẻ sẽ tự xếp thẳng hàng; hàng Combo hiển thị các gói nhiều món.</p></div>
            <div className="flex items-center gap-2"><button type="button" onClick={() => openNewCombo()} className="inline-flex items-center gap-1 rounded-lg border border-[#E0D2EA] bg-[#F7EEFC] px-3 py-2 text-xs font-bold text-[#785291]"><Plus className="h-4 w-4" />Tạo combo</button><MapIcon className="h-5 w-5 text-[#314A5E]" /></div>
          </div>
          <nav className="mb-3 flex gap-2 overflow-x-auto pb-1" aria-label="Các mục trưng bày">
            {GROUPS.map(group => {
              const Icon = GROUP_ICONS[group];
              const zone = zones.find(item => item.group === group);
              const count = zone?.count ?? 0;
              return <button
                key={group}
                type="button"
                onClick={() => {
                  const id = pendingProductId ?? selectedProductId;
                  if (group === 'combo' && id !== null) {
                    openNewCombo(id);
                  } else if (id !== null) {
                    placeProduct(id, { x: 36, y: zone?.y ?? 0 }, group);
                  } else {
                    viewportRef.current?.scrollTo({ left: 0, top: Math.max(0, (zone?.y ?? 0) * zoom - 8), behavior: 'smooth' });
                  }
                }}
                onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
                onDrop={event => {
                  event.preventDefault();
                  const id = Number(event.dataTransfer.getData('application/x-store-product-id') || event.dataTransfer.getData('text/plain'));
                  if (Number.isInteger(id)) placeProduct(id, { x: 36, y: zone?.y ?? 0 }, group);
                }}
                className={`min-w-[140px] flex-1 rounded-xl border px-3 py-2 text-left hover:brightness-[0.97] ${GROUP_STYLES[group].pill}`}
              >
                <div className="flex items-center gap-1.5"><Icon className="h-4 w-4 shrink-0" /><strong className="whitespace-nowrap text-[11px]">{GROUP_LABELS[group]}</strong></div>
                <span className="mt-1 block text-[10px] opacity-80">{count ? `${count} ${group === 'combo' ? 'combo' : 'sản phẩm'}` : group === 'combo' ? 'Chưa có combo' : 'Chưa gán sản phẩm'}</span>
              </button>;
            })}
          </nav>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FAF8F5] px-3 py-2">
            <p className="text-xs text-[#707973]">{placedProducts.length} sản phẩm · {comboState.combos.length} combo · Cuộn ngang để xem thêm cột</p>
            <div className="flex items-center gap-1">
              <button onClick={() => viewportRef.current?.scrollBy({ left: -Math.max(320, viewportRef.current.clientWidth * 0.7), behavior: 'smooth' })} className="rounded-lg border bg-white p-2" title="Xem bên trái" aria-label="Xem bên trái"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => viewportRef.current?.scrollBy({ left: Math.max(320, viewportRef.current.clientWidth * 0.7), behavior: 'smooth' })} className="rounded-lg border bg-white p-2" title="Xem bên phải" aria-label="Xem bên phải"><ChevronRight className="h-4 w-4" /></button>
              <span className="mx-1 h-5 w-px bg-[#D9E0E5]" />
              <button onClick={() => setZoom(value => clamp(Number((value - 0.1).toFixed(2)), 0.18, 1.5))} className="rounded-lg border bg-white p-2" title="Thu nhỏ" aria-label="Thu nhỏ"><ZoomOut className="h-4 w-4" /></button>
              <span className="w-12 text-center text-xs font-bold text-[#314A5E]">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(value => clamp(Number((value + 0.1).toFixed(2)), 0.18, 1.5))} className="rounded-lg border bg-white p-2" title="Phóng to" aria-label="Phóng to"><ZoomIn className="h-4 w-4" /></button>
              <button onClick={fitToView} className="rounded-lg border bg-white p-2" title="Xem toàn cảnh" aria-label="Xem toàn cảnh"><Maximize2 className="h-4 w-4" /></button>
            </div>
          </div>
          <div ref={viewportRef} className="max-h-[720px] overflow-auto rounded-2xl bg-[#F8F5EF]">
            <div style={{ width: CANVAS_WIDTH * zoom, height: canvasHeight * zoom, minWidth: '100%' }}>
              <div
                ref={canvasRef}
                className={`relative rounded-2xl border-2 border-[#DDD7CA] bg-[#FCFBF8] ${pendingProductId !== null ? 'cursor-crosshair' : ''}`}
                style={{ width: CANVAS_WIDTH, height: canvasHeight, transform: `scale(${zoom})`, transformOrigin: 'top left', backgroundImage: 'radial-gradient(#D8DED9 1px, transparent 1px)', backgroundSize: '24px 24px' }}
                onClick={event => { if (pendingProductId !== null && !(event.target as HTMLElement).closest('[data-product-frame], [data-combo-card]')) placeProduct(pendingProductId, pointOnCanvas(event.clientX, event.clientY), groupAtCanvasPoint(event.clientY)); }}
                onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
                onDrop={event => { event.preventDefault(); const id = Number(event.dataTransfer.getData('application/x-store-product-id') || event.dataTransfer.getData('text/plain')); if (Number.isInteger(id)) placeProduct(id, pointOnCanvas(event.clientX, event.clientY), groupAtCanvasPoint(event.clientY)); }}
                aria-label="Mặt bằng sắp xếp sản phẩm"
              >
                {showZones && zones.map(zone => {
                  const Icon = GROUP_ICONS[zone.group];
                  const theme = GROUP_STYLES[zone.group];
                  return <div key={zone.group} className={`pointer-events-none absolute overflow-hidden rounded-[20px] border-2 ${theme.shell}`} style={{ left: 12, top: zone.y + 8, width: CANVAS_WIDTH - 24, height: zone.height - 16 }}>
                    <div className={`flex h-[54px] items-center gap-3 border-b px-5 ${theme.header}`}><Icon className={`h-5 w-5 ${theme.icon}`} /><strong className="text-base text-[#263B4A]">{zone.label}</strong><span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#52636D]">{zone.count ? `${zone.count} ${zone.group === 'combo' ? 'combo' : 'sản phẩm'}` : zone.group === 'combo' ? 'Chưa có combo' : 'Chưa gán sản phẩm'}</span>{!zone.count && <span className="text-[11px] text-[#71808A]">{zone.group === 'combo' ? 'Bấm Tự động xếp hoặc Tạo combo' : 'Chọn sản phẩm ở cột trái để thêm vào mục này'}</span>}</div>
                  </div>;
                })}
                {showZones && comboState.combos.map((combo, index) => {
                  const comboZone = zones.find(zone => zone.group === 'combo');
                  if (!comboZone) return null;
                  const facts = comboFacts(combo, products);
                  return <button
                    key={combo.id}
                    type="button"
                    data-combo-card
                    onClick={event => { event.stopPropagation(); openCombo(combo); }}
                    className="absolute flex flex-col rounded-2xl border border-[#DCC9E6] bg-white p-2 text-left shadow-[0_8px_24px_#263B4A14] hover:border-[#8B61A0]"
                    style={{ left: 36 + index % 7 * 192, top: comboZone.y + 70 + Math.floor(index / 7) * 210, width: FRAME_WIDTH, height: FRAME_HEIGHT }}
                    aria-label={`Xem ${combo.name}, ${combo.status === 'suggested' ? 'đề xuất' : 'đã duyệt'}`}
                  >
                    <span className={`self-start rounded-full px-2 py-0.5 text-[10px] font-bold ${combo.status === 'approved' ? 'bg-[#E4F2EB] text-[#336B50]' : 'bg-[#F7EEFC] text-[#785291]'}`}>{combo.status === 'approved' ? 'Đã duyệt' : 'Đề xuất'}</span>
                    <span className="mt-2 flex h-[78px] items-center justify-center gap-1 rounded-xl bg-[#FCF9FF]">
                      {facts.items.slice(0, 3).map(item => item.product && <ProductImage key={item.productId} product={item.product} className="h-[62px] w-[48px] object-contain" />)}
                    </span>
                    <strong className="mt-1 line-clamp-2 text-[12px] leading-4 text-[#263B4A]">{combo.name}</strong>
                    <span className="mt-auto flex items-center justify-between gap-1 text-[10px] font-semibold"><span className="truncate text-[#785291]">{combo.price ? price(combo.price) : 'Chưa đặt giá'}</span><span className={facts.stock > 0 ? 'text-[#678277]' : 'text-[#B65A37]'}>{facts.stock > 0 ? `Còn ${facts.stock}` : 'Hết hàng'}</span></span>
                  </button>;
                })}
                {placedProducts.map(product => {
                  const position = placedFrames[String(product.id)];
                  return <div
                    key={product.id}
                    data-product-frame
                    role="button"
                    tabIndex={0}
                    aria-label={`${product.name}, kéo để di chuyển`}
                    aria-pressed={selectedProductId === product.id}
                    onPointerDown={event => {
                      if ((event.target as HTMLElement).closest('button')) return;
                      event.preventDefault();
                      event.currentTarget.setPointerCapture(event.pointerId);
                      dragRef.current = { id: product.id, element: event.currentTarget, pointerX: event.clientX, pointerY: event.clientY, originX: position.x, originY: position.y, moved: false };
                      setSelectedProductId(product.id);
                    }}
                    onPointerMove={event => moveFrame(event, product.id)}
                    onPointerUp={event => finishFrameMove(event, product.id)}
                    onPointerCancel={event => finishFrameMove(event, product.id)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') setSelectedProductId(product.id);
                      if (event.key === 'Delete' || event.key === 'Backspace') removeProduct(product.id);
                      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
                        event.preventDefault();
                        const dx = event.key === 'ArrowLeft' ? -20 : event.key === 'ArrowRight' ? 20 : 0;
                        const dy = event.key === 'ArrowUp' ? -20 : event.key === 'ArrowDown' ? 20 : 0;
                        setFrames(current => ({ ...(current ?? {}), [String(product.id)]: { x: clamp(position.x + dx, 0, CANVAS_WIDTH - FRAME_WIDTH), y: clamp(position.y + dy, 0, canvasHeight - FRAME_HEIGHT) } }));
                      }
                    }}
                    className={`absolute flex cursor-grab touch-none select-none flex-col rounded-2xl border-2 bg-white p-2 shadow-[0_8px_24px_#263B4A14] hover:shadow-lg active:cursor-grabbing ${GROUP_STYLES[groups[String(product.id)]].card} ${selectedProductId === product.id ? 'z-20 ring-1 ring-[#263B4A] shadow-[0_10px_26px_#263B4A33]' : ''}`}
                    style={{ left: position.x, top: position.y, width: FRAME_WIDTH, height: FRAME_HEIGHT }}
                  >
                    <div className="flex h-5 items-center justify-between gap-1 px-1"><span className={`max-w-[115px] truncate rounded-full px-1.5 py-0.5 text-[10px] font-bold ${groups[String(product.id)] === 'regular' ? 'text-[#71808A]' : GROUP_STYLES[groups[String(product.id)]].pill}`}>{groups[String(product.id)] === 'regular' ? product.sku : GROUP_LABELS[groups[String(product.id)]]}</span><button type="button" onClick={event => { event.stopPropagation(); removeProduct(product.id); }} aria-label={`Gỡ ${product.name}`} title="Gỡ khỏi mặt bằng" className="rounded-md p-0.5 text-[#8C9AA2] hover:bg-rose-50 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button></div>
                    <div className={`mt-1 grid h-[82px] shrink-0 place-items-center rounded-xl ${product.stockQuantity <= 0 ? 'bg-[#FAF6F4]' : 'bg-[#F5F7F8]'}`}><ProductImage product={product} className="h-[72px] w-[130px] object-contain" /></div>
                    <div className="flex min-h-0 flex-1 flex-col px-1 pt-1.5"><strong className="line-clamp-2 text-[12px] font-bold leading-[15px] text-[#263B4A]">{product.name}</strong><div className="mt-auto flex items-center justify-between gap-1 pt-1"><span className={`truncate text-[11px] font-bold ${!Number.isFinite(product.sellingPrice) || product.sellingPrice <= 1000 ? 'text-[#B65A37]' : 'text-[#314A5E]'}`} title={!Number.isFinite(product.sellingPrice) || product.sellingPrice <= 1000 ? 'Giá cần kiểm tra' : undefined}>{price(product.sellingPrice)}</span><span className={`shrink-0 text-[10px] font-semibold ${product.stockQuantity <= 0 ? 'text-[#B65A37]' : 'text-[#678277]'}`}>{product.stockQuantity <= 0 ? '0 tồn' : `Còn ${product.stockQuantity}`}</span></div></div>
                  </div>;
                })}
                {!loading && !placedProducts.length && !comboState.combos.length && <div className="absolute inset-0 grid place-items-center text-center text-[#71808A]"><div><LayoutGrid className="mx-auto mb-3 h-9 w-9" /><p className="font-semibold">Mặt bằng đang trống</p><p className="mt-1 text-xs">Chọn sản phẩm bên trái hoặc bấm Tự động xếp.</p></div></div>}
              </div>
            </div>
          </div>
          {selectedProduct && placedFrames[String(selectedProduct.id)] && <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#D9E0E5] bg-[#FAF8F5] p-3"><ProductImage product={selectedProduct} className="h-12 w-12 rounded-lg bg-white object-contain" /><div className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#263B4A]">{selectedProduct.name}</strong><span className="text-xs text-[#71808A]">{selectedProduct.sku} · Tồn {selectedProduct.stockQuantity} · {GROUP_LABELS[groups[String(selectedProduct.id)]]}</span></div><button onClick={() => removeProduct(selectedProduct.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600"><Trash2 className="h-4 w-4" />Gỡ khỏi mặt bằng</button></div>}
          {!loading && availableProducts.length > 0 && <p className="mt-3 flex items-center gap-1 text-xs text-[#71808A]"><Plus className="h-3.5 w-3.5" />Có thể thêm sản phẩm bằng cách kéo từ danh sách bên trái hoặc chọn rồi bấm vào mặt bằng.</p>}
          <p className="mt-2 flex items-center gap-1 text-[11px] text-[#8C9AA2]"><Grip className="h-3.5 w-3.5" />Vị trí và sản phẩm được lưu trong trình duyệt khi bấm Lưu bố cục.</p>
        </section>
      </div>
      {editingCombo && <StoreLayoutComboDialog
        draft={editingCombo}
        products={products}
        exists={comboState.combos.some(combo => combo.id === editingCombo.id)}
        error={comboError}
        onChange={draft => { setEditingCombo(draft); setComboError(''); }}
        onSave={saveCombo}
        onDismiss={dismissCombo}
        onClose={() => setEditingCombo(null)}
      />}
      {stockProductId !== null && productById.get(stockProductId) && <StoreLayoutStockDialog
        product={productById.get(stockProductId)!}
        onClose={() => setStockProductId(null)}
        onUpdated={async () => {
          const updated = await storeApi.getProduct(stockProductId);
          setProducts(current => current.map(product => product.id === stockProductId ? { ...product, stockQuantity: updated.stockQuantity } : product));
          setNotice(`Đã cập nhật tồn kho ${updated.name}.`);
        }}
      />}
    </div>
  );
};
