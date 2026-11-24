import type { F02Product } from './store.api';
import type { ProductGroup } from './storeLayoutMerchandising';

// Optional presentation metadata stays separate from the F02 API contract.
export type LayoutProduct = F02Product & {
  imageUrl?: string;
  isHotSale?: boolean; isNew?: boolean; isCombo?: boolean;
  isBestSeller?: boolean; isTrending?: boolean;
};

// Store layout preview data only. Prices and inventory still come from /api/products.
const DEMO_GROUPS: Record<string, ProductGroup> = {
  'F02-COFFEE-01': 'hot', 'F02-MILK-01': 'hot',
  'STORE30-11': 'hot', 'STORE30-14': 'hot', 'STORE30-23': 'hot', 'STOREMORE-16': 'hot',
  'STORE30-25': 'new', 'STORE30-26': 'new', 'STORE30-27': 'new', 'STOREMORE-05': 'new', 'STOREMORE-20': 'new',
  'STORE30-01': 'best', 'STORE30-16': 'best', 'STORE30-17': 'best', 'STORE30-22': 'best', 'STOREMORE-12': 'best',
};

const LOCAL_IMAGES: Record<string, string> = {
  'F02-COFFEE-01': '/images/customer-home/fresh/nescafe-coffee.webp',
  'F02-MILK-01': '/products/milk.png',
  'STORE30-01': '/images/customer-home/fresh/milk.webp',
  'STORE30-06': '/images/customer-home/fresh/ice-cream.webp',
  'STORE30-08': '/images/customer-home/fresh/eggs.webp',
  'STORE30-11': '/images/products/lays.png',
  'STORE30-14': '/images/products/haohao.jpg',
  'STORE30-16': '/images/customer-home/fresh/cooking-oil.webp',
  'STORE30-17': '/images/customer-home/fresh/rice.webp',
  'STORE30-19': '/images/customer-home/fresh/nescafe-coffee.webp',
  'STORE30-21': '/images/customer-home/fresh/juice.webp',
  'STORE30-22': '/images/products/aquafina.jpg',
  'STORE30-23': '/images/products/cocacola.jpg',
  'STORE30-25': '/products/apple.png',
  'STORE30-26': '/products/orange.png',
  'STORE30-27': '/products/tomato.png',
  'STORE30-29': '/images/customer-home/fresh/honey-jar.webp',
  'STOREMORE-04': '/images/customer-home/fresh/ice-cream.webp',
  'STOREMORE-05': '/images/customer-home/fresh/juice.webp',
  'STOREMORE-12': '/images/customer-home/fresh/rice.webp',
  'STOREMORE-16': '/images/products/aquafina.jpg',
  'STOREMORE-21': '/images/products/pulppy.png',
};

type PackKind = 'box' | 'carton' | 'bag' | 'bottle' | 'jug' | 'can' | 'cup' | 'tube' | 'blister' | 'banana';
type PackStyle = { kind: PackKind; color: string; accent: string };

const PACK_STYLES: Record<string, PackStyle> = {
  'STORE30-02': { kind: 'cup', color: '#F29AAB', accent: '#A72F62' },
  'STORE30-03': { kind: 'box', color: '#F5C655', accent: '#9D5D19' },
  'STORE30-04': { kind: 'box', color: '#F2D56B', accent: '#946A2C' },
  'STORE30-05': { kind: 'carton', color: '#D8B18A', accent: '#70482F' },
  'STORE30-07': { kind: 'bottle', color: '#EFA0AD', accent: '#B94173' },
  'STORE30-12': { kind: 'bag', color: '#F8BF54', accent: '#D16930' },
  'STORE30-13': { kind: 'cup', color: '#BE6F4E', accent: '#873A2B' },
  'STORE30-15': { kind: 'bottle', color: '#9B6A3C', accent: '#4B3429' },
  'STORE30-18': { kind: 'bag', color: '#D6C3A0', accent: '#82694E' },
  'STORE30-20': { kind: 'box', color: '#76A98E', accent: '#2D6554' },
  'STORE30-24': { kind: 'can', color: '#F3B94B', accent: '#A13E37' },
  'STORE30-28': { kind: 'banana', color: '#F4C94F', accent: '#846139' },
  'STORE30-30': { kind: 'box', color: '#CBA56E', accent: '#725136' },
  'STOREMORE-01': { kind: 'bottle', color: '#ECA4AE', accent: '#B14A73' },
  'STOREMORE-02': { kind: 'cup', color: '#A6D6B3', accent: '#45815C' },
  'STOREMORE-03': { kind: 'box', color: '#E8A742', accent: '#9B4F25' },
  'STOREMORE-06': { kind: 'bag', color: '#DBB68C', accent: '#9A5D3C' },
  'STOREMORE-07': { kind: 'bottle', color: '#B88154', accent: '#5A3B2F' },
  'STOREMORE-08': { kind: 'bottle', color: '#865747', accent: '#3D342F' },
  'STOREMORE-09': { kind: 'bottle', color: '#E76152', accent: '#A82B2F' },
  'STOREMORE-10': { kind: 'bag', color: '#C8E2EC', accent: '#4B839A' },
  'STOREMORE-13': { kind: 'can', color: '#74AAB8', accent: '#315E77' },
  'STOREMORE-14': { kind: 'can', color: '#D9705F', accent: '#8E3A3D' },
  'STOREMORE-15': { kind: 'can', color: '#F1C65B', accent: '#A7782B' },
  'STOREMORE-17': { kind: 'bottle', color: '#A3C69E', accent: '#39735F' },
  'STOREMORE-20': { kind: 'bag', color: '#EF91B2', accent: '#A43F79' },
  'STOREMORE-22': { kind: 'bottle', color: '#82C9C1', accent: '#277C80' },
  'STOREMORE-23': { kind: 'jug', color: '#9DC8D5', accent: '#3E7992' },
  'STOREMORE-24': { kind: 'jug', color: '#8EAECF', accent: '#3F6794' },
  'STOREMORE-25': { kind: 'bottle', color: '#B6A5D4', accent: '#69558F' },
  'STOREMORE-27': { kind: 'tube', color: '#8FD0C5', accent: '#317D79' },
  'STOREMORE-28': { kind: 'bottle', color: '#BFA6C9', accent: '#72517F' },
  'STOREMORE-29': { kind: 'bottle', color: '#E8B4AB', accent: '#9C625F' },
  'STOREMORE-30': { kind: 'blister', color: '#B4CCD9', accent: '#406F8D' },
};

const DEFAULT_STYLE: PackStyle = { kind: 'box', color: '#B7CAD0', accent: '#4B7180' };
const imageCache = new Map<string, string>();

function escapeText(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!);
}

function labelLines(name: string): string[] {
  const words = name.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  for (const word of words) {
    const current = lines[lines.length - 1];
    if (current && `${current} ${word}`.length <= 17) lines[lines.length - 1] += ` ${word}`;
    else if (lines.length < 2) lines.push(word);
  }
  return lines.map(line => escapeText(line.length > 17 ? `${line.slice(0, 15)}…` : line));
}

function packShape(kind: PackKind, color: string, accent: string): string {
  const label = `<rect x="91" y="149" width="178" height="105" rx="17" fill="white" fill-opacity=".92"/><path d="M108 169h144" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>`;
  switch (kind) {
    case 'bottle': return `<rect x="153" y="42" width="54" height="37" rx="6" fill="${accent}"/><rect x="140" y="73" width="80" height="49" rx="17" fill="${color}"/><rect x="92" y="106" width="176" height="198" rx="49" fill="url(#body)" stroke="${accent}" stroke-width="5"/>${label}`;
    case 'jug': return `<path d="M160 53h55v40h-55z" fill="${accent}"/><path d="M113 86h117c23 0 41 19 41 42v166c0 14-11 25-25 25H96c-14 0-25-11-25-25V139c0-28 13-46 42-53Zm-12 29c-10 0-15 8-15 20v40h51v-63z" fill="url(#body)" fill-rule="evenodd" stroke="${accent}" stroke-width="5"/>${label}`;
    case 'can': return `<rect x="99" y="91" width="162" height="210" fill="url(#body)" stroke="${accent}" stroke-width="4"/><ellipse cx="180" cy="91" rx="81" ry="17" fill="#E6E9E8" stroke="${accent}" stroke-width="4"/><ellipse cx="180" cy="301" rx="81" ry="15" fill="${accent}"/>${label}`;
    case 'cup': return `<ellipse cx="180" cy="98" rx="106" ry="18" fill="${accent}"/><path d="M83 104h194l-31 198c-2 11-12 18-24 18h-84c-12 0-22-7-24-18z" fill="url(#body)" stroke="${accent}" stroke-width="5"/>${label}`;
    case 'tube': return `<path d="M111 63h138l-17 239H128z" fill="url(#body)" stroke="${accent}" stroke-width="5"/><rect x="133" y="301" width="94" height="29" rx="5" fill="${accent}"/>${label}`;
    case 'bag': return `<path d="M107 59h146l23 248-26 18H110l-26-18z" fill="url(#body)" stroke="${accent}" stroke-width="5"/><path d="M109 77h142" stroke="${accent}" stroke-width="10" stroke-linecap="round"/>${label}`;
    case 'carton': return `<path d="M116 74h128l21 49v193H95V123z" fill="url(#body)" stroke="${accent}" stroke-width="5"/><path d="m95 123 21-49 64 47 64-47 21 49z" fill="${color}" stroke="${accent}" stroke-width="5"/>${label}`;
    case 'blister': return `<rect x="94" y="45" width="172" height="280" rx="18" fill="#F8FAFA" stroke="${accent}" stroke-width="6"/><circle cx="180" cy="69" r="8" fill="none" stroke="${accent}" stroke-width="4"/><path d="M178 123v128m-44-109 44-18 44 18-44 15z" fill="${color}" stroke="${accent}" stroke-width="7" stroke-linecap="round"/><rect x="112" y="270" width="136" height="34" rx="9" fill="${color}"/>`;
    case 'banana': return `<path d="M90 91c-32 101 11 175 112 181 44 3 78-18 92-58-72 43-133 17-156-54-7-21-10-45-8-70z" fill="#F6D451" stroke="${accent}" stroke-width="7"/><path d="M112 75c-18 99 27 164 107 163 38 0 62-19 71-43-63 31-111 2-130-53-8-24-10-44-8-67z" fill="#F6DF72" stroke="${accent}" stroke-width="6"/><path d="m105 79 35-22 17 18" fill="none" stroke="#6B5940" stroke-width="13" stroke-linecap="round"/>`;
    default: return `<path d="M101 75h158l17 232c1 12-9 22-21 22H105c-12 0-22-10-21-22z" fill="url(#body)" stroke="${accent}" stroke-width="5"/><path d="M101 75h158l-21-23H122z" fill="${color}" stroke="${accent}" stroke-width="5"/>${label}`;
  }
}

export function illustratedPackshot(product: Pick<F02Product, 'sku' | 'name'>): string {
  const key = `${product.sku}:${product.name}`;
  const cached = imageCache.get(key);
  if (cached) return cached;
  const style = PACK_STYLES[product.sku] ?? DEFAULT_STYLE;
  const lines = labelLines(product.name);
  const text = style.kind === 'banana' ? '' : lines.map((line, index) => `<text x="180" y="${195 + index * 27}" text-anchor="middle" font-size="19" font-family="Arial, sans-serif" font-weight="700" fill="${style.accent}">${line}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" role="img" aria-label="${escapeText(product.name)}"><defs><linearGradient id="body" x2="1" y2=".2"><stop stop-color="${style.color}"/><stop offset=".5" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="${style.color}"/></linearGradient><filter id="shadow"><feGaussianBlur stdDeviation="9"/></filter></defs><ellipse cx="180" cy="326" rx="112" ry="13" fill="#263B4A" opacity=".15" filter="url(#shadow)"/>${packShape(style.kind, style.color, style.accent)}${text}</svg>`;
  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  imageCache.set(key, url);
  return url;
}

export function layoutImageFor(product: Pick<LayoutProduct, 'sku' | 'name' | 'imageUrl'>): string {
  return product.imageUrl || LOCAL_IMAGES[product.sku] || illustratedPackshot(product);
}

export function mockLayoutProduct(product: LayoutProduct): LayoutProduct {
  const demoGroup = DEMO_GROUPS[product.sku];
  const hasApiGroup = [product.isHotSale, product.isNew, product.isCombo, product.isBestSeller, product.isTrending]
    .some(value => typeof value === 'boolean');
  return {
    ...product,
    imageUrl: layoutImageFor(product),
    ...(!hasApiGroup && demoGroup ? {
      isHotSale: demoGroup === 'hot', isNew: demoGroup === 'new', isCombo: demoGroup === 'combo',
      isBestSeller: demoGroup === 'best',
    } : {}),
  };
}
