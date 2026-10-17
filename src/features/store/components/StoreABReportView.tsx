import React, { useState } from 'react';
import { 
  Calendar, 
  ChevronDown, 
  Store, 
  Tag, 
  User, 
  CreditCard, 
  ShoppingCart, 
  ShoppingBag, 
  BarChart2, 
  TrendingUp,
  ArrowUp,
  Download,
  CheckCircle2,
  Rocket,
  ShieldCheck,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ActiveNavScreen } from '../../../types/mining';

// Real shelf layout images from project assets
import aisleControlImage from '../../../assets/images/supermarket_main_aisle_1791876952549.jpg';
import endcapVariantImage from '../../../assets/images/shelf_endcap_b_1791878062084.jpg';

interface StoreABReportViewProps {
  onNavigate?: (screen: ActiveNavScreen) => void;
}

export const StoreABReportView: React.FC<StoreABReportViewProps> = ({ onNavigate }) => {
  const [selectedCampaign, setSelectedCampaign] = useState<string>(
    'End of Year Beverage Promotion'
  );
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [isDeployed, setIsDeployed] = useState<boolean>(false);

  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    salesA: string;
    salesB: string;
    x: number;
    y: number;
  } | null>(null);

  // Top Performing Products (Layout B vs A) from simulation dataset
  const topProducts = [
    {
      rank: 1,
      letter: 'C',
      letterBg: 'bg-[#b3261e]',
      name: 'Coca-Cola 330ml',
      category: 'Beverages',
      salesA: '1,200',
      salesB: '1,850',
      change: '+54.2%'
    },
    {
      rank: 2,
      letter: 'P',
      letterBg: 'bg-[#0284c7]',
      name: 'Pepsi 330ml',
      category: 'Beverages',
      salesA: '980',
      salesB: '1,620',
      change: '+65.3%'
    },
    {
      rank: 3,
      letter: 'L',
      letterBg: 'bg-[#d97706]',
      name: "Lay's Classic 52g",
      category: 'Snacks',
      salesA: '850',
      salesB: '1,410',
      change: '+65.9%'
    },
    {
      rank: 4,
      letter: 'S',
      letterBg: 'bg-[#1e3a2f]',
      name: 'Sprite 330ml',
      category: 'Beverages',
      salesA: '760',
      salesB: '1,220',
      change: '+60.5%'
    },
    {
      rank: 5,
      letter: 'O',
      letterBg: 'bg-[#475569]',
      name: 'Oreo Original 133g',
      category: 'Snacks',
      salesA: '680',
      salesB: '1,180',
      change: '+73.5%'
    }
  ];

  // SVG Chart Dimensions
  const chartWidth = 520;
  const chartHeight = 220;
  const paddingLeft = 40;
  const paddingRight = 20;

  // Key coordinate points for Sales Trend (Simulated)
  const trendPoints = [
    { label: '1 Dec', aVal: '1.5M', bVal: '2.1M', x: 45, yA: 175, yB: 158 },
    { label: '8 Dec', aVal: '1.7M', bVal: '2.5M', x: 155, yA: 170, yB: 147 },
    { label: '15 Dec', aVal: '2.2M', bVal: '3.3M', x: 265, yA: 156, yB: 125 },
    { label: '22 Dec', aVal: '3.5M', bVal: '4.6M', x: 375, yA: 120, yB: 90 },
    { label: '26 Dec', aVal: '3.8M', bVal: '6.8M', x: 440, yA: 112, yB: 30 },
    { label: '31 Dec', aVal: '1.8M', bVal: '2.6M', x: 495, yA: 167, yB: 145 }
  ];

  const pathA = `M 45 175 C 100 174, 120 171, 155 170 C 200 169, 230 160, 265 156 C 310 152, 340 128, 375 120 C 410 112, 450 135, 495 167`;
  const pathB = `M 45 158 C 100 155, 120 150, 155 147 C 200 144, 230 132, 265 125 C 310 118, 345 98, 375 90 C 405 82, 430 25, 450 28 C 470 32, 480 120, 495 145`;

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setToastNotice('A/B Test Report (O07) exported successfully as CSV / PDF.');
      setTimeout(() => setToastNotice(null), 4000);
    }, 600);
  };

  const handleConfirmDeploy = () => {
    setIsDeployModalOpen(false);
    setIsDeployed(true);
    setToastNotice('Layout B (Gondola Endcap Planogram) queued for store deployment across all central branches.');
    setTimeout(() => setToastNotice(null), 5000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-[#191c1b] antialiased">
      {/* Toast Notice */}
      {toastNotice && (
        <div className="bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] px-4 py-3 rounded-xl flex items-center justify-between text-sm shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
            <span className="font-semibold">{toastNotice}</span>
          </div>
          <button 
            onClick={() => setToastNotice(null)}
            className="text-xs font-bold text-[#047857] hover:underline ml-4 cursor-pointer"
          >
            Close
          </button>
        </div>
      )}

      {/* Top Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#191c1b]">
              A/B Test Report
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#eaf0eb] text-[#1e3a2f] border border-[#1e3a2f]/20">
              O07 (Simulated)
            </span>
          </div>
          <p className="text-sm text-[#6d7974]">
            Compare the simulation results of two store layouts for the selected campaign.
          </p>
        </div>

        {/* Top Right Actions & Filter Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Campaign Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[#89938f] uppercase tracking-wider mb-1">
              Campaign
            </label>
            <div className="relative">
              <select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="appearance-none bg-white border border-[#E7E2D8] rounded-lg px-3.5 py-2 pr-9 text-xs font-semibold text-[#191c1b] focus:border-[#1e3a2f] focus:outline-hidden shadow-2xs cursor-pointer"
              >
                <option value="End of Year Beverage Promotion">
                  End of Year Beverage Promotion
                </option>
                <option value="Summer Drinks Fiesta">
                  Summer Drinks Fiesta
                </option>
                <option value="Snack Booster Gondola">
                  Snack Booster Gondola
                </option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#6d7974] absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Simulation Period */}
          <div>
            <label className="block text-[11px] font-bold text-[#89938f] uppercase tracking-wider mb-1">
              Simulation Period
            </label>
            <div className="flex items-center gap-2 bg-white border border-[#E7E2D8] rounded-lg px-3.5 py-2 text-xs font-semibold text-[#191c1b] shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-[#1e3a2f] shrink-0" />
              <span>01 Dec 2026 - 31 Dec 2026</span>
            </div>
          </div>

          {/* Export Action */}
          <div className="self-end">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E7E2D8] bg-white hover:bg-[#FAF8F5] text-[#191c1b] text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#6d7974]" />
              <span>{isExporting ? 'Exporting...' : 'Export Report'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Campaign Summary Banner Card (Nordic Atelier Style) */}
      <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs flex flex-col md:flex-row items-center gap-6">
        {/* Left Graphic Banner with warm amber and 5 colorful cans */}
        <div className="w-full md:w-56 h-28 rounded-lg bg-gradient-to-r from-[#fef3c7] via-[#fde68a] to-[#fcd34d] border border-[#fde68a] p-3 flex flex-col items-center justify-center relative overflow-hidden shadow-2xs shrink-0">
          <div className="text-[11px] font-black tracking-tight text-[#92400e] text-center leading-tight mb-2 uppercase">
            YEAR END<br />SPECIAL DRINKS
          </div>
          {/* 5 Colorful Bars */}
          <div className="flex items-end gap-1.5 h-10">
            <div className="w-3 h-6 bg-[#b3261e] rounded-xs shadow-2xs" />
            <div className="w-3 h-8 bg-[#c26d38] rounded-xs shadow-2xs" />
            <div className="w-3.5 h-10 bg-[#1e3a2f] rounded-xs shadow-2xs" />
            <div className="w-3 h-7 bg-[#0284c7] rounded-xs shadow-2xs" />
            <div className="w-3 h-5 bg-[#eab308] rounded-xs shadow-2xs" />
          </div>
        </div>

        {/* Right Details */}
        <div className="flex-1 w-full space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
              Completed
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#eaf0eb] text-[#1e3a2f] border border-[#1e3a2f]/20">
              Simulated Data
            </span>
            <h2 className="text-base font-bold text-[#191c1b]">
              End of Year Beverage Promotion
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {/* Period */}
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#fbf2f0] text-[#1e3a2f] shrink-0 border border-[#E7E2D8]">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[11px] text-[#89938f] block uppercase tracking-wider font-semibold">Period</span>
                <span className="text-xs font-bold text-[#191c1b] leading-tight font-mono">
                  01 Dec 2026 - 31 Dec 2026
                </span>
              </div>
            </div>

            {/* Store */}
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#fbf2f0] text-[#1e3a2f] shrink-0 border border-[#E7E2D8]">
                <Store className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[11px] text-[#89938f] block uppercase tracking-wider font-semibold">Store</span>
                <span className="text-xs font-bold text-[#191c1b] leading-tight">
                  Store 01 - Central
                </span>
              </div>
            </div>

            {/* Target Category */}
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#fbf2f0] text-[#1e3a2f] shrink-0 border border-[#E7E2D8]">
                <Tag className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[11px] text-[#89938f] block uppercase tracking-wider font-semibold">Target Category</span>
                <span className="text-xs font-bold text-[#191c1b] leading-tight">
                  Beverages
                </span>
              </div>
            </div>

            {/* Created By */}
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#fbf2f0] text-[#1e3a2f] shrink-0 border border-[#E7E2D8]">
                <User className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[11px] text-[#89938f] block uppercase tracking-wider font-semibold">Created By</span>
                <span className="text-xs font-bold text-[#191c1b] leading-tight">
                  Merchandiser Team
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Comparison Header & Legend */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[#191c1b]">
            Key Metrics Comparison
          </h2>

          <div className="flex items-center gap-5 text-xs text-[#6d7974] font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
              <span>Layout A (Current)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a2f]" />
              <span className="font-semibold text-[#191c1b]">Layout B (Recommended)</span>
            </div>
          </div>
        </div>

        {/* 5 KPI Metric Cards with Refined Small Accent Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Total Sales (Deep Forest) */}
          <div className="bg-white border border-[#E7E2D8] rounded-xl p-4 shadow-2xs space-y-2.5 relative overflow-hidden">
            <div className="w-8 h-1 rounded-full bg-[#1e3a2f]" />
            <div className="flex items-center justify-between text-xs font-bold text-[#1e3a2f]">
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Total Sales (VND)</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-[#0284c7] tabular-nums">
                124,500,000 ₫
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold text-[#1e3a2f] tracking-tight tabular-nums">
                  158,200,000 ₫
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#ecfdf5] text-[#059669] text-[11px] font-bold">
                  ▲ +27.1%
                </span>
              </div>
            </div>
          </div>

          {/* 2. Items Sold (Warm Cognac) */}
          <div className="bg-white border border-[#E7E2D8] rounded-xl p-4 shadow-2xs space-y-2.5 relative overflow-hidden">
            <div className="w-8 h-1 rounded-full bg-[#c26d38]" />
            <div className="flex items-center justify-between text-xs font-bold text-[#c26d38]">
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Items Sold</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-[#0284c7] tabular-nums">
                4,320
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold text-[#191c1b] tracking-tight tabular-nums">
                  5,680
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#ecfdf5] text-[#059669] text-[11px] font-bold">
                  ▲ +31.5%
                </span>
              </div>
            </div>
          </div>

          {/* 3. Avg. Basket Size (Ocean Azure) */}
          <div className="bg-white border border-[#E7E2D8] rounded-xl p-4 shadow-2xs space-y-2.5 relative overflow-hidden">
            <div className="w-8 h-1 rounded-full bg-[#0284c7]" />
            <div className="flex items-center justify-between text-xs font-bold text-[#0284c7]">
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Avg. Basket Size</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-[#0284c7] tabular-nums">
                28,800 ₫
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold text-[#191c1b] tracking-tight tabular-nums">
                  32,400 ₫
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#ecfdf5] text-[#059669] text-[11px] font-bold">
                  ▲ +12.5%
                </span>
              </div>
            </div>
          </div>

          {/* 4. Conversion Rate (Royal Amethyst) */}
          <div className="bg-white border border-[#E7E2D8] rounded-xl p-4 shadow-2xs space-y-2.5 relative overflow-hidden">
            <div className="w-8 h-1 rounded-full bg-[#7c3aed]" />
            <div className="flex items-center justify-between text-xs font-bold text-[#7c3aed]">
              <div className="flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Conversion Rate</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-[#0284c7] tabular-nums">
                6.2%
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold text-[#191c1b] tracking-tight tabular-nums">
                  8.1%
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#ecfdf5] text-[#059669] text-[11px] font-bold">
                  ▲ +30.6%
                </span>
              </div>
            </div>
          </div>

          {/* 5. Estimated Profit (Emerald Growth) */}
          <div className="bg-white border border-[#E7E2D8] rounded-xl p-4 shadow-2xs space-y-2.5 relative overflow-hidden">
            <div className="w-8 h-1 rounded-full bg-[#16a34a]" />
            <div className="flex items-center justify-between text-xs font-bold text-[#16a34a]">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Estimated Profit</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-[#0284c7] tabular-nums">
                18,600,000 ₫
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold text-[#1e3a2f] tracking-tight tabular-nums">
                  24,800,000 ₫
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#ecfdf5] text-[#059669] text-[11px] font-bold">
                  ▲ +33.3%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-side Layout Comparisons: Layout A vs Layout B */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Layout A – Current Layout (Control) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E7E2D8]/60">
            <div className="flex items-center gap-2 font-semibold text-sm text-[#191c1b]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
              <span>Layout A – Current Layout</span>
            </div>
            <span className="text-[10px] font-semibold text-[#6d7974] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E7E2D8]">
              Control Standard
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            {/* Shelf Image with overlay badge */}
            <div className="sm:col-span-7 relative rounded-lg overflow-hidden border border-[#E7E2D8] aspect-4/3 bg-[#fbf2f0]">
              <img
                src={aisleControlImage}
                alt="Layout A - Supermarket Main Aisle"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded text-[10px] font-bold bg-[#1e3a2f]/90 text-white shadow-2xs backdrop-blur-xs">
                Beverages
              </span>
            </div>

            {/* Key Characteristics */}
            <div className="sm:col-span-5 space-y-2">
              <h3 className="text-xs font-bold text-[#89938f] uppercase tracking-wider">
                Key Characteristics
              </h3>
              <ul className="space-y-2 text-xs text-[#424844]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#89938f] shrink-0" />
                  <span>Current product placement</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#89938f] shrink-0" />
                  <span>Beverages in main aisle</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#89938f] shrink-0" />
                  <span>Standard shelf arrangement</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#89938f] shrink-0" />
                  <span>No additional displays</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right: Layout B – Recommended Layout (Variant) */}
        <div className="bg-white border-2 border-[#1e3a2f]/40 rounded-xl p-5 shadow-2xs space-y-4 bg-[#fbfdfc]">
          <div className="flex items-center justify-between pb-2 border-b border-[#E7E2D8]/60">
            <div className="flex items-center gap-2 font-semibold text-sm text-[#1e3a2f]">
              <span className="w-5 h-5 rounded-full bg-[#1e3a2f] text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                B
              </span>
              <span>Layout B – Recommended Layout</span>
            </div>
            <span className="text-[10px] font-bold text-[#065f46] bg-[#ecfdf5] border border-[#a7f3d0] px-2 py-0.5 rounded-full">
              HUI-Miner Optimized
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            {/* Shelf Image with overlay badges */}
            <div className="sm:col-span-7 relative rounded-lg overflow-hidden border border-[#E7E2D8] aspect-4/3 bg-[#fbf2f0]">
              <img
                src={endcapVariantImage}
                alt="Layout B - End-cap Gondola"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-[#1e3a2f]/90 text-white shadow-2xs backdrop-blur-xs">
                  Beverages
                </span>
                <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-[#b45309]/95 text-white shadow-2xs backdrop-blur-xs">
                  Special Promo
                </span>
              </div>
            </div>

            {/* Key Characteristics & Deploy Button */}
            <div className="sm:col-span-5 space-y-2">
              <h3 className="text-xs font-bold text-[#1e3a2f] uppercase tracking-wider">
                Key Characteristics
              </h3>
              <ul className="space-y-1.5 text-xs text-[#191c1b]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a2f] shrink-0" />
                  <span>Beverages placed at end-cap</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a2f] shrink-0" />
                  <span>Related snacks nearby</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a2f] shrink-0" />
                  <span>Promotional signage added</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a2f] shrink-0" />
                  <span>Optimized shelf arrangement</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a2f] shrink-0" />
                  <span>Bundle products together</span>
                </li>
              </ul>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeployModalOpen(true)}
                  disabled={isDeployed}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                    isDeployed 
                      ? 'bg-[#1e3a2f]/70 cursor-not-allowed'
                      : 'bg-[#1e3a2f] hover:bg-[#294d3f]'
                  }`}
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>{isDeployed ? 'Layout B Deployed' : 'Deploy Layout B'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Sales Trend (Simulated) & Top Performing Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Sales Trend (Simulated) Chart */}
        <div className="lg:col-span-6 bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E7E2D8]/60">
            <h2 className="text-sm font-semibold text-[#191c1b]">
              Sales Trend (Simulated)
            </h2>

            <div className="flex items-center gap-4 text-xs text-[#6d7974] font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#0284c7]" />
                <span>Layout A</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#1e3a2f]" />
                <span className="font-semibold text-[#191c1b]">Layout B</span>
              </div>
            </div>
          </div>

          {/* SVG Smooth Curve Line Chart */}
          <div className="relative pt-2">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto overflow-visible select-none"
            >
              {/* Horizontal Hairline Grid lines */}
              <line x1={paddingLeft} y1={25} x2={chartWidth - paddingRight} y2={25} stroke="#E7E2D8" strokeWidth="0.75" strokeDasharray="3 3" />
              <line x1={paddingLeft} y1={75} x2={chartWidth - paddingRight} y2={75} stroke="#E7E2D8" strokeWidth="0.75" strokeDasharray="3 3" />
              <line x1={paddingLeft} y1={125} x2={chartWidth - paddingRight} y2={125} stroke="#E7E2D8" strokeWidth="0.75" strokeDasharray="3 3" />
              <line x1={paddingLeft} y1={175} x2={chartWidth - paddingRight} y2={175} stroke="#E7E2D8" strokeWidth="0.75" strokeDasharray="3 3" />

              {/* Y Axis Labels */}
              <text x={paddingLeft - 8} y={30} fill="#89938f" fontSize="10" textAnchor="end" className="font-mono">8M</text>
              <text x={paddingLeft - 8} y={80} fill="#89938f" fontSize="10" textAnchor="end" className="font-mono">6M</text>
              <text x={paddingLeft - 8} y={130} fill="#89938f" fontSize="10" textAnchor="end" className="font-mono">4M</text>
              <text x={paddingLeft - 8} y={178} fill="#89938f" fontSize="10" textAnchor="end" className="font-mono">2M</text>
              <text x={paddingLeft - 8} y={192} fill="#89938f" fontSize="10" textAnchor="end" className="font-mono">0</text>

              {/* Layout A Line (Ocean Blue) */}
              <path
                d={pathA}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Layout B Line (Brand Forest Pine) */}
              <path
                d={pathB}
                fill="none"
                stroke="#1e3a2f"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Data points for Layout A (Blue dots) */}
              {trendPoints.map((pt, i) => (
                <circle
                  key={`a-${i}`}
                  cx={pt.x}
                  cy={pt.yA}
                  r="3.5"
                  fill="#ffffff"
                  stroke="#0284c7"
                  strokeWidth="2"
                  className="cursor-pointer transition-transform hover:scale-150"
                  onMouseEnter={() =>
                    setHoveredPoint({
                      date: pt.label,
                      salesA: `${pt.aVal} ₫`,
                      salesB: `${pt.bVal} ₫`,
                      x: pt.x,
                      y: pt.yA
                    })
                  }
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}

              {/* Data points for Layout B (Pine Green dots) */}
              {trendPoints.map((pt, i) => (
                <circle
                  key={`b-${i}`}
                  cx={pt.x}
                  cy={pt.yB}
                  r="4"
                  fill="#1e3a2f"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="cursor-pointer transition-transform hover:scale-150"
                  onMouseEnter={() =>
                    setHoveredPoint({
                      date: pt.label,
                      salesA: `${pt.aVal} ₫`,
                      salesB: `${pt.bVal} ₫`,
                      x: pt.x,
                      y: pt.yB
                    })
                  }
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}

              {/* X Axis Labels */}
              <text x={45} y={chartHeight - 8} fill="#6d7974" fontSize="10" textAnchor="middle" className="font-mono">
                <tspan x={45} dy="0">1</tspan>
                <tspan x={45} dy="11">Dec</tspan>
              </text>
              <text x={155} y={chartHeight - 3} fill="#6d7974" fontSize="10" textAnchor="middle" className="font-mono">8 Dec</text>
              <text x={265} y={chartHeight - 8} fill="#6d7974" fontSize="10" textAnchor="middle" className="font-mono">
                <tspan x={265} dy="0">15</tspan>
                <tspan x={265} dy="11">Dec</tspan>
              </text>
              <text x={375} y={chartHeight - 3} fill="#6d7974" fontSize="10" textAnchor="middle" className="font-mono">22 Dec</text>
              <text x={495} y={chartHeight - 8} fill="#6d7974" fontSize="10" textAnchor="middle" className="font-mono">
                <tspan x={495} dy="0">31</tspan>
                <tspan x={495} dy="11">Dec</tspan>
              </text>
            </svg>

            {/* Interactive Tooltip */}
            {hoveredPoint && (
              <div 
                className="absolute z-10 bg-[#1e3a2f] text-white text-[11px] rounded-lg p-2.5 shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-12 border border-[#caeada]/30"
                style={{ left: `${hoveredPoint.x}px`, top: `${hoveredPoint.y}px` }}
              >
                <div className="font-bold border-b border-white/20 pb-0.5 mb-1">{hoveredPoint.date}</div>
                <div className="text-[#bae6fd]">Layout A: {hoveredPoint.salesA}</div>
                <div className="text-[#caeada] font-semibold">Layout B: {hoveredPoint.salesB}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Top Performing Products (Layout B vs A) Table */}
        <div className="lg:col-span-6 bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E7E2D8]/60">
            <h2 className="text-sm font-semibold text-[#191c1b]">
              Top Performing Products (Layout B vs A)
            </h2>
            <span className="text-[11px] text-[#6d7974]">
              Ranked by Co-Purchase Lift
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] font-bold text-[#89938f] uppercase tracking-wider border-b border-[#E7E2D8]">
                  <th className="pb-3 font-semibold text-right">CHANGE</th>
                  <th className="pb-3 font-semibold">SẢN PHẨM</th>
                  <th className="pb-3 font-semibold">DANH MỤC</th>
                  <th className="pb-3 font-semibold text-right">SALES<br />(A)</th>
                  <th className="pb-3 font-semibold text-right">SALES<br />(B)</th>
                  <th className="pb-3 font-semibold text-right">THAY ĐỔI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2D8]/60">
                {topProducts.map((p) => (
                  <tr key={p.rank} className="hover:bg-[#FAF8F5] transition-colors">
                    {/* Rank */}
                    <td className="py-3 text-[#6d7974] font-mono font-bold">
                      {p.rank}
                    </td>

                    {/* Product Name with colored letter badge */}
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded ${p.letterBg} text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-2xs`}>
                          {p.letter}
                        </span>
                        <span className="font-semibold text-[#191c1b] truncate max-w-[130px]">
                          {p.name}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 text-[#6d7974]">
                      {p.category}
                    </td>

                    {/* Sales A */}
                    <td className="py-3 text-right text-[#6d7974] font-medium font-mono tabular-nums">
                      {p.salesA}
                    </td>

                    {/* Sales B */}
                    <td className="py-3 text-right font-bold text-[#1e3a2f] font-mono tabular-nums">
                      {p.salesB}
                    </td>

                    {/* Change */}
                    <td className="py-3 text-right">
                      <span className="font-bold text-[#16a34a] inline-flex items-center gap-0.5 justify-end font-mono tabular-nums">
                        <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                        <span>{p.change}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Deployment Confirmation Modal */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E7E2D8] space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-full bg-[#eaf0eb] text-[#1e3a2f] flex items-center justify-center mx-auto">
              <Rocket className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-[#191c1b]">
                Deploy Layout B (Gondola Endcap)?
              </h3>
              <p className="text-xs text-[#6d7974] mt-1.5 leading-relaxed">
                Applying Layout B will update shelf allocation across <strong>Store 01 - Central</strong>. Co-located beverage and snack arrangements will take effect immediately on staff handheld planograms.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeployModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#E7E2D8] text-xs font-semibold text-[#6d7974] hover:bg-[#FAF8F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeploy}
                className="px-4 py-2 rounded-lg bg-[#1e3a2f] hover:bg-[#294d3f] text-white text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Deployment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
