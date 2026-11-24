export type ProductFrame = { x: number; y: number };
export type ProductFrameMap = Record<string, ProductFrame>;

export const FRAME_WIDTH = 168;
export const FRAME_HEIGHT = 184;
export const CANVAS_WIDTH = 1400;
export const FRAME_STORAGE_KEY = 'store-product-frames-v1';

const columns = 7;
const columnStep = 192;
const rowStep = 210;

export function arrangeProductFrames(ids: number[]): ProductFrameMap {
  return Object.fromEntries(ids.map((id, index) => [String(id), {
    x: 36 + (index % columns) * columnStep,
    y: 36 + Math.floor(index / columns) * rowStep,
  }]));
}

export function vacantProductFrame(desired: ProductFrame, frames: ProductFrameMap, canvasHeight: number): ProductFrame {
  const occupied = Object.values(frames);
  const free = (candidate: ProductFrame) => occupied.every(position =>
    Math.abs(candidate.x - position.x) >= FRAME_WIDTH + 8 || Math.abs(candidate.y - position.y) >= FRAME_HEIGHT + 8,
  );
  if (free(desired)) return desired;
  const candidates = Array.from({ length: Math.ceil(canvasHeight / rowStep) * columns }, (_, index) => ({
    x: 36 + (index % columns) * columnStep,
    y: 36 + Math.floor(index / columns) * rowStep,
  })).filter(candidate => candidate.y + FRAME_HEIGHT <= canvasHeight);
  candidates.sort((a, b) =>
    Math.hypot(a.x - desired.x, a.y - desired.y) - Math.hypot(b.x - desired.x, b.y - desired.y),
  );
  return candidates.find(free) ?? desired;
}

export function migrateShelfLayout(
  aisles: { id: number; x: number; y: number; capacity: number }[],
  layout: Record<string, number | null>,
): ProductFrameMap {
  const orderedIds = [...aisles]
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .flatMap(aisle => Array.from({ length: aisle.capacity }, (_, index) => layout[`aisle-${aisle.id}-slot-${index + 1}`]))
    .filter((id): id is number => typeof id === 'number');
  return arrangeProductFrames([...new Set(orderedIds)]);
}

export function parseProductFrames(value: string | null): ProductFrameMap | null {
  if (value === null) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const result: ProductFrameMap = {};
    Object.entries(parsed).forEach(([id, position]) => {
      if (!/^\d+$/.test(id) || !position || typeof position !== 'object') return;
      const { x, y } = position as ProductFrame;
      if (Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0) result[id] = { x, y };
    });
    return result;
  } catch {
    return null;
  }
}
