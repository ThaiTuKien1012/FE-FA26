import React, { useState } from 'react';
import {
  Calculator,
  Lock,
  ShieldCheck,
  ArrowRight,
  SlidersHorizontal,
  CheckCircle2,
  ExternalLink,
  Info,
  Radio,
  Sparkles,
  Layers,
  Check
} from 'lucide-react';
import { ActiveNavScreen } from '../../../types/mining';

interface UtilityProfileViewProps {
  onNavigate?: (screen: ActiveNavScreen) => void;
}

interface SampleProductUtility {
  sku: string;
  name: string;
  sellingPrice: number | null;
  unitCost: number;
}

const SAMPLE_PRODUCTS: SampleProductUtility[] = [
  { sku: 'P001', name: 'Coca-Cola 330ml', sellingPrice: 10000, unitCost: 7000 },
  { sku: 'P002', name: 'Lay’s Classic 52g', sellingPrice: 18000, unitCost: 12000 },
  { sku: 'P003', name: 'Oreo Original', sellingPrice: 22000, unitCost: 15000 },
  { sku: 'P004', name: 'Sample Tea', sellingPrice: null, unitCost: 9000 }
];

export const UtilityProfileView: React.FC<UtilityProfileViewProps> = ({
  onNavigate
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveDraft = () => {
    setIsSaved(true);
    showToast('Hồ sơ trọng số Utility Profile đã được lưu thành công!');
  };

  const handlePreviewScore = () => {
    showToast('Đang tính toán lại điểm Utility dự báo theo cấu hình v1...');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E3A2F] text-white px-4 py-3 rounded-xl shadow-lg border border-[#34D399]/30 flex items-center gap-3 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-[#34D399]" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Page Title & Header Information */}
      <header className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#191C1B]">
            Utility Profile &amp; Priority Weights
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#F5ECEA] text-[#707973] border border-[#E1D8D6]">
            Demo Data
          </span>
        </div>
        <p className="text-sm text-[#707973] font-normal max-w-2xl">
          Define product utility inputs for mining and recommendations.
        </p>
      </header>

      {/* Two-Column Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Formula + Sample Data Table */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Utility Formula Definition */}
          <section className="bg-white rounded-2xl border border-[#E1D8D6] p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-base font-bold text-[#191C1B]">Utility Formula</h2>
                <p className="text-xs text-[#707973] mt-0.5">Source: selling price and product cost</p>
              </div>
              {/* Sigma Icon indicator */}
              <div
                className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#E1D8D6] flex items-center justify-center text-[#1E3A2F] font-serif font-bold text-base"
                title="Mathematical Formula"
              >
                Σ
              </div>
            </div>

            {/* Prominent Formula Container Box */}
            <div className="bg-[#FFF8F6] border border-[#E1D8D6] rounded-xl px-5 py-4 flex items-center justify-between gap-4">
              <span className="text-base font-bold text-[#1E3A2F] tracking-tight">
                Unit utility = Selling price – Unit cost
              </span>
              <div className="text-[#1E3A2F] p-2 rounded-lg bg-white border border-[#E1D8D6] shadow-2xs shrink-0">
                <Calculator className="w-4 h-4" />
              </div>
            </div>

            {/* Contextual helper note */}
            <p className="text-[11px] text-[#707973] leading-relaxed">
              Missing price/cost prevents a valid utility preview; do not substitute inferred values.
            </p>
          </section>

          {/* Card 2: Sample Product Utility Preview Table */}
          <section className="bg-white rounded-2xl border border-[#E1D8D6] p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-[#191C1B]">
                Sample Product Utility Preview
              </h2>
              {/* Live Projection Tag */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F5ECEA] text-[#1E3A2F] border border-[#E1D8D6]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                Live Projection
              </span>
            </div>
            <p className="text-xs text-[#707973] mb-5">Illustrative values (VND per unit)</p>

            {/* Data Table */}
            <div className="overflow-x-auto -mx-6 sm:-mx-7 px-6 sm:px-7">
              <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-[#E1D8D6] text-[11px] font-bold text-[#707973] uppercase tracking-wider">
                    <th className="py-3 px-2 font-semibold">Product / SKU</th>
                    <th className="py-3 px-3 font-semibold text-right">Selling Price</th>
                    <th className="py-3 px-3 font-semibold text-right">Unit Cost</th>
                    <th className="py-3 px-3 font-semibold text-right">Unit Utility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1D8D6]/60 text-xs">
                  {SAMPLE_PRODUCTS.map((prod) => {
                    const hasPrice = prod.sellingPrice !== null;
                    const unitUtility = hasPrice ? prod.sellingPrice! - prod.unitCost : null;
                    return (
                      <tr key={prod.sku} className="hover:bg-[#FFF8F6] transition-colors">
                        <td className="py-3.5 px-2 font-medium text-[#191C1B]">
                          {prod.name}{' '}
                          <span className="text-[#707973] font-normal font-mono">/ {prod.sku}</span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium text-[#191C1B] tabular-nums font-mono">
                          {hasPrice ? prod.sellingPrice!.toLocaleString() : '—'}
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium text-[#707973] tabular-nums font-mono">
                          {prod.unitCost.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          {hasPrice ? (
                            <span className="font-bold text-[#191C1B] tabular-nums font-mono">
                              {unitUtility!.toLocaleString()}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                              Unavailable
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer Details & Catalog Link */}
            <div className="mt-5 pt-3 border-t border-[#E1D8D6] flex items-center justify-between text-xs text-[#707973] flex-wrap gap-2">
              <span>Displaying 4 active preview SKUs</span>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('merchandiser-recommendations')}
                className="inline-flex items-center font-bold text-[#1E3A2F] hover:underline cursor-pointer gap-1"
              >
                <span>View full catalog preview</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>
        </div>

        {/* Right Column (4 cols): Status & Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card: Profile Status */}
          <section className="bg-white rounded-2xl border border-[#E1D8D6] p-6 shadow-xs relative space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#191C1B]">Profile Status</h2>
              {/* Minimal active indicator dot */}
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] ring-4 ring-emerald-50" title="Active Environment" />
            </div>
            <p className="text-xs text-[#707973]">Example configuration • version v1</p>

            {/* Status Badge */}
            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#1E3A2F] border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A2F] mr-1.5" />
                DRAFT
              </span>
            </div>
            <p className="text-xs text-[#707973]">Applied values require authorization.</p>
          </section>

          {/* Card: Profile Controls */}
          <section className="bg-white rounded-2xl border border-[#E1D8D6] p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#191C1B]">Profile Controls</h2>
                <p className="text-xs text-[#707973] mt-0.5">Edit settings where permitted</p>
              </div>
              <SlidersHorizontal className="w-4 h-4 text-[#707973]" />
            </div>

            {/* Control Field 1: Utility Basis */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#191C1B]">Utility basis</label>
              <div className="rounded-xl border border-[#E1D8D6] bg-[#FAF8F5] px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-xs font-medium text-[#191C1B]">Price - Cost (unit margin)</span>
                <Lock className="w-4 h-4 text-[#707973]" />
              </div>
            </div>

            {/* Control Field 2: Priority Weights */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#191C1B]">Priority weights</label>
              <p className="text-xs text-[#707973] leading-relaxed">
                No additional weights configured.<br />
                Use supported factors only.
              </p>
            </div>

            {/* Policy Safeguard Callout */}
            <div className="rounded-xl bg-[#FFF8F6] border border-[#E1D8D6] p-3.5 flex items-start space-x-3">
              <ShieldCheck className="w-4 h-4 text-[#1E3A2F] shrink-0 mt-0.5" />
              <div className="text-xs leading-tight">
                <span className="font-bold block mb-0.5 text-[#1E3A2F]">Policy Safeguard</span>
                <span className="text-[#57534E]">Manual override is restricted to Senior Retail Planner roles.</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Action & Transition Footer Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-2">
        {/* Next Step Direction */}
        <div className="flex items-center text-sm">
          <span className="text-[#707973] mr-1.5">Next:</span>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('merchandiser-recommendations')}
            className="font-bold text-[#1E3A2F] hover:underline flex items-center cursor-pointer gap-1"
          >
            <span>M02 Recommendations Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Actions Group */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handlePreviewScore}
            className="px-5 py-2.5 bg-white border border-[#E1D8D6] hover:bg-[#FAF8F5] text-[#191C1B] text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Preview Score
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-5 py-2.5 bg-[#1E3A2F] hover:bg-[#12231A] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isSaved && <Check className="w-3.5 h-3.5" />}
            <span>Save Draft</span>
          </button>
        </div>
      </div>

      {/* Bottom Notice Strip */}
      <footer className="bg-[#F5ECEA] border border-[#E1D8D6] rounded-xl px-4 py-3 flex items-center space-x-2 text-xs text-[#57534E]">
        <Info className="w-4 h-4 text-[#707973] shrink-0" />
        <span>Preview only: sample utility values. No backend connection.</span>
      </footer>
    </div>
  );
};
