import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Info, 
  CheckCircle2, 
  Layers, 
  Store, 
  Tag, 
  Clock 
} from 'lucide-react';
import { ActiveNavScreen } from '../../../types/mining';

interface KeepLayoutAReviewViewProps {
  onNavigate: (screen: ActiveNavScreen) => void;
}

export const KeepLayoutAReviewView: React.FC<KeepLayoutAReviewViewProps> = ({ onNavigate }) => {
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirmKeepA = () => {
    setConfirmed(true);
    setTimeout(() => {
      onNavigate('merchandiser-campaign-draft');
    }, 1200);
  };

  return (
    <div className="min-h-full flex flex-col justify-between space-y-6">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="space-y-3">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#191C1B]">
            Keep Layout A – Review
          </h1>
          <p className="text-sm lg:text-base text-[#6D7974]">
            Confirm your selected plan before returning to Campaign Draft.
          </p>
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold tracking-wider text-[#1E3A2F] bg-[#E6EDE9] border border-[#1E3A2F]/10">
              SIMULATION / SAMPLE DATA
            </span>
          </div>
        </div>

        {/* Success toast if confirmed */}
        {confirmed && (
          <div className="p-3.5 rounded-xl bg-[#EEF5F1] border border-[#D8E8DF] text-[#1E3A2F] text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-[#1E3A2F] shrink-0" />
            <span>Baseline Layout A confirmed. Returning to Campaign Draft...</span>
          </div>
        )}

        {/* Info Notice Banner */}
        <div className="p-4 bg-[#F2F7F4] border border-[#DCE8E2] rounded-xl flex items-start gap-3.5 shadow-xs">
          <div className="w-5 h-5 rounded-full bg-[#1E3A2F]/10 text-[#1E3A2F] flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1E3A2F] leading-tight">
              Baseline Layout A selected for review.
            </p>
            <p className="text-xs text-[#6D7974] mt-0.5">
              This does not publish or activate the campaign.
            </p>
          </div>
        </div>

        {/* Three-Column Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Campaign Information */}
          <div className="bg-white rounded-2xl border border-[#E1D8D6] p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#191C1B] mb-6 tracking-tight">Campaign Information</h2>
              <div className="space-y-5">
                <div>
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-[#89938F] block mb-1">Campaign</span>
                  <p className="text-sm font-semibold text-[#191C1B]">Summer Drink Bundle</p>
                </div>
                <div className="pt-4 border-t border-[#E1D8D6]/60">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-[#89938F] block mb-1">Store</span>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#191C1B]">Store 01 – Central</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-[#E1D8D6]/60">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-[#89938F] block mb-1">Prepared by</span>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1E3A2F]/10 text-[#1E3A2F] font-semibold text-[10px] flex items-center justify-center">ME</span>
                    <p className="text-sm font-medium text-[#191C1B]">Merchandiser</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-[#E1D8D6]/60">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-[#89938F] block mb-1">Current status</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <p className="text-sm font-semibold text-[#191C1B]">Draft / Pending decision</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Selected Layout */}
          <div className="bg-white rounded-2xl border border-[#E1D8D6] p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#191C1B] tracking-tight">Selected Layout</h2>
              </div>
              {/* Inner Visual Mock Preview Box */}
              <div className="bg-[#FFF8F6]/60 rounded-xl p-4 border border-[#E1D8D6]/70 space-y-3.5">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#89938F]">
                  <span>Layout A • Category Zones</span>
                </div>
                
                {/* Zone 1: Beverages */}
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#191C1B]">Beverages</span>
                  {/* Shelf bars indicator */}
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-6 rounded-full bg-emerald-600"></span>
                    <span className="w-1.5 h-6 rounded-full bg-emerald-600"></span>
                    <span className="w-1.5 h-6 rounded-full bg-emerald-600"></span>
                    <span className="w-1.5 h-6 rounded-full bg-emerald-600"></span>
                  </div>
                </div>

                {/* Zone 2: Snacks */}
                <div className="bg-purple-50/60 border border-purple-100 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#191C1B]">Snacks</span>
                  {/* Shelf bars indicator */}
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-6 rounded-full bg-[#8789C0]"></span>
                    <span className="w-1.5 h-6 rounded-full bg-[#8789C0]"></span>
                    <span className="w-1.5 h-6 rounded-full bg-[#8789C0]"></span>
                    <span className="w-1.5 h-6 rounded-full bg-[#8789C0]"></span>
                  </div>
                </div>

                {/* Zone 3: Breakfast */}
                <div className="bg-slate-100/70 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#191C1B]">Breakfast</span>
                  {/* Shelf bars indicator */}
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-6 rounded-full bg-slate-500"></span>
                    <span className="w-1.5 h-6 rounded-full bg-slate-500"></span>
                    <span className="w-1.5 h-6 rounded-full bg-slate-500"></span>
                    <span className="w-1.5 h-6 rounded-full bg-slate-500"></span>
                  </div>
                </div>
              </div>

              {/* Layout Indicator & Note */}
              <div className="mt-4 flex items-center justify-between">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-[#F7F2F0] border border-[#E1D8D6] text-[#191C1B]">
                  Baseline A
                </span>
                <span className="text-[11px] text-[#6D7974]">
                  Layout arrangement preview only
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Simulation Evidence */}
          <div className="bg-white rounded-2xl border border-[#E1D8D6] p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#191C1B] mb-6 tracking-tight">Simulation Evidence</h2>
              <div className="space-y-5">
                <div>
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-[#89938F] block mb-1">Data source</span>
                  <p className="text-sm font-semibold text-[#191C1B]">Historical / Mock</p>
                </div>
                <div className="pt-4 border-t border-[#E1D8D6]/60">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-[#89938F] block mb-1">Estimated bundle revenue</span>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-bold text-[#191C1B]">125.4M</p>
                    <span className="text-xs font-semibold text-[#6D7974]">VND</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-[#E1D8D6]/60">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-[#89938F] block mb-1">Total utility</span>
                  <p className="text-2xl font-bold text-[#191C1B]">24,300</p>
                </div>
              </div>
            </div>

            {/* Caution Note Inside Card */}
            <div className="mt-6 p-3 rounded-xl bg-[#F7F2F0] border border-[#E1D8D6]/80">
              <p className="text-xs font-semibold text-[#191C1B]">
                No live A/B testing performed.
              </p>
              <p className="text-[11px] text-[#6D7974] mt-0.5">
                Results are illustrative.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BEGIN: Bottom Action Bar & Note */}
      <footer className="pt-6 border-t border-[#E1D8D6]/60">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Back Button */}
          <button 
            onClick={() => onNavigate('merchandiser-compare-simulation')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-[#E1D8D6] bg-white text-sm font-semibold text-[#191C1B] hover:bg-[#F7F2F0] transition-colors shadow-xs cursor-pointer" 
            type="button"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Compare
          </button>
          {/* Primary Confirm Button */}
          <button 
            onClick={handleConfirmKeepA}
            disabled={confirmed}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#1E3A2F] text-white text-sm font-semibold hover:bg-[#162B23] transition-colors shadow-sm cursor-pointer disabled:opacity-70" 
            type="button"
          >
            Confirm Keep A
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* System Governance Trace Sub-note */}
        <p className="text-[11px] text-[#6D7974] mt-4 text-center sm:text-left">
          M08A • Confirmation updates the proposed campaign plan only; Store Admin activates later in O05.
        </p>
      </footer>
      {/* END: Bottom Action Bar & Note */}
    </div>
  );
};
