import React, { useState } from 'react';
import { 
  CheckCircle2, 
  X, 
  ArrowRight, 
  Sparkles, 
  Layers, 
  Tag, 
  Store,
  Check,
  Calendar,
  ChevronRight,
  Eye,
  FileBarChart
} from 'lucide-react';
import { ActiveNavScreen } from '../../../types/mining';

interface StoreCampaignsViewProps {
  onNavigate: (screen: ActiveNavScreen) => void;
}

export const StoreCampaignsView: React.FC<StoreCampaignsViewProps> = ({ onNavigate }) => {
  const [isModalOpen, setIsModalOpen] = useState(true);

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#191c1b]">
              Campaign Activation Review
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider bg-[#eaf0eb] text-[#1e3a2f] uppercase">
              SAMPLE DATA
            </span>
          </div>
          <p className="text-sm text-[#6d7974]">
            Review published layout campaigns and activate eligible campaigns in your store.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isModalOpen && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-1.5 border border-[#E7E2D8] bg-white rounded-lg text-xs font-semibold text-[#1e3a2f] hover:bg-[#FAF8F5] cursor-pointer"
            >
              Reopen Notice
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner matching Image 3 */}
      <div className="p-4 rounded-xl bg-[#eaf0eb] border border-[#1e3a2f]/20 flex items-start sm:items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-[#1e3a2f] mt-1 sm:mt-0 shrink-0" />
        <div>
          <div className="text-sm font-semibold text-[#1e3a2f]">
            Campaign activated successfully
          </div>
          <div className="text-xs text-[#2d5a47] mt-0.5">
            Campaign is active for Store A. View reports when data becomes available.
          </div>
        </div>
      </div>

      {/* Main 2-Column Content: Campaign Details & Layout Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: CAMPAIGN DETAILS */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 sm:p-7 shadow-2xs space-y-6">
          <div>
            <div className="text-[11px] font-bold text-[#89938f] uppercase tracking-wider mb-2">
              CAMPAIGN DETAILS
            </div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-[#191c1b]">
                Summer Drink Bundle
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#eaf0eb] text-[#1e3a2f] border border-[#1e3a2f]/20">
                Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#E7E2D8]">
              <div>
                <div className="text-[10px] font-bold text-[#89938f] uppercase tracking-wider">
                  CAMPAIGN ID
                </div>
                <div className="text-base font-bold text-[#191c1b] font-mono mt-0.5">
                  CMP-024
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#89938f] uppercase tracking-wider">
                  STORE
                </div>
                <div className="text-base font-bold text-[#191c1b] mt-0.5">
                  Store A
                </div>
              </div>
            </div>
          </div>

          {/* APPROVED PRODUCT GROUPS */}
          <div>
            <div className="text-[11px] font-bold text-[#89938f] uppercase tracking-wider mb-3">
              APPROVED PRODUCT GROUPS
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] hover:border-[#1e3a2f]/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-[#1e3a2f] text-white flex items-center justify-center font-mono text-xs font-bold">
                    01
                  </span>
                  <span className="font-semibold text-sm text-[#191c1b]">
                    Beverages
                  </span>
                </div>
                <span className="text-xs text-[#6d7974] font-medium">
                  5 products
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] hover:border-[#1e3a2f]/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-[#3f624d] text-white flex items-center justify-center font-mono text-xs font-bold">
                    02
                  </span>
                  <span className="font-semibold text-sm text-[#191c1b]">
                    Snacks
                  </span>
                </div>
                <span className="text-xs text-[#6d7974] font-medium">
                  4 products
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] hover:border-[#1e3a2f]/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-[#8fa295] text-white flex items-center justify-center font-mono text-xs font-bold">
                    03
                  </span>
                  <span className="font-semibold text-sm text-[#191c1b]">
                    Dairy
                  </span>
                </div>
                <span className="text-xs text-[#6d7974] font-medium">
                  3 products
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: LAYOUT PREVIEW & STORE READINESS */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 sm:p-7 shadow-2xs space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-[#89938f] uppercase tracking-wider">
                LAYOUT PREVIEW
              </span>
              <span className="text-xs font-semibold text-[#1e3a2f]">
                Approved proposal
              </span>
            </div>

            {/* Planogram Shelf Representation with Sleek Small Arrangement Bars (Small accent bar) */}
            <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-4">
              {/* Shelf Row 1: Eye Level - Beverages (Forest Pine Green) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-semibold text-[#1e3a2f]">
                    <span className="w-2 h-2 rounded-full bg-[#1e3a2f]" />
                    <span>Tier 1 · Eye Level (Beverages)</span>
                  </div>
                  <span className="text-[10px] text-[#6d7974] font-mono">6 Facings</span>
                </div>
                {/* Shelf Rack & Small Facings Bars */}
                <div className="bg-white p-2 rounded-lg border border-[#E7E2D8]/60">
                  <div className="grid grid-cols-6 gap-2">
                    {[...Array(6)].map((_, i) => (
                      <div 
                        key={i} 
                        className="h-5 rounded bg-[#1e3a2f] hover:bg-[#294d3f] transition-colors flex items-center justify-center text-[10px] text-white font-medium shadow-2xs cursor-pointer"
                        title={`Beverage Facing #${i + 1}`}
                      >
                        Bev-{i + 1}
                      </div>
                    ))}
                  </div>
                  {/* Shelf bottom rail */}
                  <div className="h-1 bg-[#E7E2D8] rounded-full mt-1.5" />
                </div>
              </div>

              {/* Shelf Row 2: Reach Level - Snacks (Warm Cognac Amber) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-semibold text-[#c26d38]">
                    <span className="w-2 h-2 rounded-full bg-[#c26d38]" />
                    <span>Tier 2 · Reach Level (Snacks)</span>
                  </div>
                  <span className="text-[10px] text-[#6d7974] font-mono">6 Facings</span>
                </div>
                {/* Shelf Rack & Small Facings Bars */}
                <div className="bg-white p-2 rounded-lg border border-[#E7E2D8]/60">
                  <div className="grid grid-cols-6 gap-2">
                    {[...Array(6)].map((_, i) => (
                      <div 
                        key={i} 
                        className="h-5 rounded bg-[#c26d38] hover:bg-[#d97706] transition-colors flex items-center justify-center text-[10px] text-white font-medium shadow-2xs cursor-pointer"
                        title={`Snack Facing #${i + 1}`}
                      >
                        Snk-{i + 1}
                      </div>
                    ))}
                  </div>
                  {/* Shelf bottom rail */}
                  <div className="h-1 bg-[#E7E2D8] rounded-full mt-1.5" />
                </div>
              </div>

              {/* Shelf Row 3: Base Level - Dairy (Ocean Azure) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-semibold text-[#0284c7]">
                    <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
                    <span>Tier 3 · Base Level (Dairy & Essentials)</span>
                  </div>
                  <span className="text-[10px] text-[#6d7974] font-mono">6 Facings</span>
                </div>
                {/* Shelf Rack & Small Facings Bars */}
                <div className="bg-white p-2 rounded-lg border border-[#E7E2D8]/60">
                  <div className="grid grid-cols-6 gap-2">
                    {[...Array(6)].map((_, i) => (
                      <div 
                        key={i} 
                        className="h-5 rounded bg-[#0284c7] hover:bg-[#0369a1] transition-colors flex items-center justify-center text-[10px] text-white font-medium shadow-2xs cursor-pointer"
                        title={`Dairy Facing #${i + 1}`}
                      >
                        Dry-{i + 1}
                      </div>
                    ))}
                  </div>
                  {/* Shelf bottom rail */}
                  <div className="h-1 bg-[#E7E2D8] rounded-full mt-1.5" />
                </div>
              </div>

              <div className="text-center pt-1">
                <span className="text-[11px] text-[#89938f] italic">
                  Interactive shelf slot allocation preview · Synchronized with PlanogramIQ
                </span>
              </div>
            </div>
          </div>

          {/* STORE READINESS Checklist */}
          <div>
            <div className="text-[11px] font-bold text-[#89938f] uppercase tracking-wider mb-3">
              STORE READINESS
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-3 text-xs text-[#191c1b] font-medium">
                <span className="px-2 py-0.5 rounded bg-[#eaf0eb] text-[#1e3a2f] font-bold text-[10px]">
                  OK
                </span>
                <span>Merchandiser approved</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#191c1b] font-medium">
                <span className="px-2 py-0.5 rounded bg-[#eaf0eb] text-[#1e3a2f] font-bold text-[10px]">
                  OK
                </span>
                <span>Campaign published</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#191c1b] font-medium">
                <span className="px-2 py-0.5 rounded bg-[#eaf0eb] text-[#1e3a2f] font-bold text-[10px]">
                  OK
                </span>
                <span>Store and products verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="flex justify-end">
        <button
          onClick={() => onNavigate('store-reports')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1e3a2f] hover:bg-[#294d3f] text-white text-sm font-semibold transition-all shadow-xs cursor-pointer"
        >
          <span>View Retail Reports</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Footer Notice */}
      <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] text-xs text-[#6d7974] text-center">
        Preview only. Sample campaign and readiness data; no live activation is connected.
      </div>

      {/* Activation Successful Modal matching Image 3 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white border border-[#E7E2D8] rounded-2xl w-full max-w-md p-8 text-center shadow-2xl relative">
            {/* Close Button top-right */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-[#89938f] hover:text-[#191c1b] p-1 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Check Icon with Circle */}
            <div className="w-16 h-16 rounded-full bg-[#eaf0eb] text-[#1e3a2f] flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <h3 className="text-xl font-bold text-[#191c1b]">
              Activation successful
            </h3>
            <p className="text-sm text-[#6d7974] mt-2">
              Campaign <strong className="text-[#191c1b]">CMP-024</strong> is now Active for Store A.
            </p>

            <div className="mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#eaf0eb] hover:bg-[#d8e5da] text-[#1e3a2f] font-semibold text-sm rounded-xl transition-colors cursor-pointer"
              >
                Dismiss Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
