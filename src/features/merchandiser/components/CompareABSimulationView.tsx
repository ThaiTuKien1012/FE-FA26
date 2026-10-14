import React, { useState } from 'react';
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Info, 
  TrendingUp, 
  CheckCircle2, 
  Layers, 
  BarChart3, 
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import { ActiveNavScreen } from '../../../types/mining';

interface CompareABSimulationViewProps {
  onNavigate: (screen: ActiveNavScreen) => void;
}

export const CompareABSimulationView: React.FC<CompareABSimulationViewProps> = ({ onNavigate }) => {
  const [selectedLayout, setSelectedLayout] = useState<'A' | 'B'>('B');
  const [notification, setNotification] = useState<string | null>(null);

  const handleSelectLayout = (layout: 'A' | 'B') => {
    setSelectedLayout(layout);
    if (layout === 'A') {
      onNavigate('merchandiser-keep-layout-a');
    } else {
      setNotification(`Layout B selected for campaign draft. Returning to draft review...`);
      setTimeout(() => {
        onNavigate('merchandiser-campaign-draft');
      }, 1000);
    }
  };

  return (
    <div className="min-h-full flex flex-col justify-between space-y-6">
      <div className="space-y-6">
        {/* BEGIN: HeaderSection */}
        <section className="space-y-3" data-purpose="page-heading">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-[#1E3A2F]">
                Compare A/B Simulation
              </h1>
              <p className="text-sm text-[#707973] mt-1">
                Review estimated outcomes before selecting baseline A or suggested B.
              </p>
            </div>
            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-[#1E3A2F]/10 text-[#1E3A2F] border border-[#1E3A2F]/20">
                SIMULATION / SAMPLE DATA
              </span>
            </div>
          </div>
        </section>
        {/* END: HeaderSection */}

        {/* Feedback notification toast */}
        {notification && (
          <div className="p-3.5 rounded-xl bg-[#EEF5F1] border border-[#D8E8DF] text-[#1E3A2F] text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-[#1E3A2F] shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* BEGIN: MetricSummaryCards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5" data-purpose="metric-summary-cards">
          {/* Card 1: Bundle Revenue */}
          <div className="bg-white rounded-2xl p-5 border border-[#E1D8D6] shadow-[0_1px_3px_rgba(30,58,47,0.02)] flex flex-col justify-between h-36">
            <span className="text-xs font-semibold text-[#707973] tracking-normal">Simulated Bundle Revenue</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-base text-[#1E3A2F]/70 font-medium">A: <span className="font-bold text-[#1E3A2F]/85">125.4M VND</span></span>
              <span className="text-base font-bold text-[#1E3A2F]">B: 148.6M VND</span>
            </div>
            <div className="pt-3 border-t border-[#E1D8D6]/60 flex items-center justify-between text-[10px] tracking-wider font-semibold text-[#707973]/80 uppercase">
              <span>HISTORICAL / SIMULATED</span>
              <span className="text-[#1E3A2F] font-bold text-xs">+18.5%</span>
            </div>
          </div>

          {/* Card 2: Bundle Selections */}
          <div className="bg-white rounded-2xl p-5 border border-[#E1D8D6] shadow-[0_1px_3px_rgba(30,58,47,0.02)] flex flex-col justify-between h-36">
            <span className="text-xs font-semibold text-[#707973] tracking-normal">Bundle Selections</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-base text-[#1E3A2F]/70 font-medium">A: <span className="font-bold text-[#1E3A2F]/85">824</span></span>
              <span className="text-base font-bold text-[#1E3A2F]">B: 929</span>
            </div>
            <div className="pt-3 border-t border-[#E1D8D6]/60 flex items-center justify-between text-[10px] tracking-wider font-semibold text-[#707973]/80 uppercase">
              <span>HISTORICAL / SIMULATED</span>
              <span className="text-[#1E3A2F] font-bold text-xs">+12.7%</span>
            </div>
          </div>

          {/* Card 3: Total Utility */}
          <div className="bg-white rounded-2xl p-5 border border-[#E1D8D6] shadow-[0_1px_3px_rgba(30,58,47,0.02)] flex flex-col justify-between h-36">
            <span className="text-xs font-semibold text-[#707973] tracking-normal">Total Utility</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-base text-[#1E3A2F]/70 font-medium">A: <span className="font-bold text-[#1E3A2F]/85">24,300</span></span>
              <span className="text-base font-bold text-[#1E3A2F]">B: 26,100</span>
            </div>
            <div className="pt-3 border-t border-[#E1D8D6]/60 flex items-center justify-between text-[10px] tracking-wider font-semibold text-[#707973]/80 uppercase">
              <span>HISTORICAL / SIMULATED</span>
              <span className="text-[#1E3A2F] font-bold text-xs">+7.4%</span>
            </div>
          </div>
        </section>
        {/* END: MetricSummaryCards */}

        {/* BEGIN: DetailedComparisonGrid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5" data-purpose="comparison-and-review-panels">
          {/* Left Panel: Illustrative Performance Comparison (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-[#E1D8D6] shadow-[0_1px_3px_rgba(30,58,47,0.02)] space-y-7">
            <div className="border-b border-[#E1D8D6]/60 pb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1E3A2F]">Illustrative performance comparison</h2>
              <span className="text-xs text-[#707973]">Baseline A vs Suggested B</span>
            </div>
            
            <div className="space-y-6">
              {/* Metric 1: Bundle Revenue (VND) */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#1E3A2F] block">Bundle revenue (VND)</span>
                {/* Bar A */}
                <div className="flex items-center space-x-3">
                  <span className="w-4 text-xs font-semibold text-[#707973]">A</span>
                  <div className="flex-1 bg-[#FFF8F6] rounded-full h-3 overflow-hidden border border-[#E1D8D6]/60">
                    <div className="bg-[#D3C9C6] h-full rounded-full transition-all duration-500" style={{ width: '74%' }}></div>
                  </div>
                  <span className="w-16 text-right text-xs font-medium text-[#707973]">125.4M</span>
                </div>
                {/* Bar B */}
                <div className="flex items-center space-x-3">
                  <span className="w-4 text-xs font-semibold text-[#1E3A2F]">B</span>
                  <div className="flex-1 bg-[#FFF8F6] rounded-full h-3 overflow-hidden border border-[#E1D8D6]/60">
                    <div className="bg-[#1E3A2F] h-full rounded-full transition-all duration-500" style={{ width: '88%' }}></div>
                  </div>
                  <span className="w-16 text-right text-xs font-bold text-[#1E3A2F]">148.6M</span>
                </div>
              </div>

              {/* Metric 2: Bundle Selections */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#1E3A2F] block">Bundle selections</span>
                {/* Bar A */}
                <div className="flex items-center space-x-3">
                  <span className="w-4 text-xs font-semibold text-[#707973]">A</span>
                  <div className="flex-1 bg-[#FFF8F6] rounded-full h-3 overflow-hidden border border-[#E1D8D6]/60">
                    <div className="bg-[#D3C9C6] h-full rounded-full transition-all duration-500" style={{ width: '76%' }}></div>
                  </div>
                  <span className="w-16 text-right text-xs font-medium text-[#707973]">824</span>
                </div>
                {/* Bar B */}
                <div className="flex items-center space-x-3">
                  <span className="w-4 text-xs font-semibold text-[#1E3A2F]">B</span>
                  <div className="flex-1 bg-[#FFF8F6] rounded-full h-3 overflow-hidden border border-[#E1D8D6]/60">
                    <div className="bg-[#1E3A2F] h-full rounded-full transition-all duration-500" style={{ width: '89%' }}></div>
                  </div>
                  <span className="w-16 text-right text-xs font-bold text-[#1E3A2F]">929</span>
                </div>
              </div>

              {/* Metric 3: Total Utility */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#1E3A2F] block">Total utility</span>
                {/* Bar A */}
                <div className="flex items-center space-x-3">
                  <span className="w-4 text-xs font-semibold text-[#707973]">A</span>
                  <div className="flex-1 bg-[#FFF8F6] rounded-full h-3 overflow-hidden border border-[#E1D8D6]/60">
                    <div className="bg-[#D3C9C6] h-full rounded-full transition-all duration-500" style={{ width: '80%' }}></div>
                  </div>
                  <span className="w-16 text-right text-xs font-medium text-[#707973]">24,300</span>
                </div>
                {/* Bar B */}
                <div className="flex items-center space-x-3">
                  <span className="w-4 text-xs font-semibold text-[#1E3A2F]">B</span>
                  <div className="flex-1 bg-[#FFF8F6] rounded-full h-3 overflow-hidden border border-[#E1D8D6]/60">
                    <div className="bg-[#1E3A2F] h-full rounded-full transition-all duration-500" style={{ width: '92%' }}></div>
                  </div>
                  <span className="w-16 text-right text-xs font-bold text-[#1E3A2F]">26,100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Decision Review (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-[#E1D8D6] shadow-[0_1px_3px_rgba(30,58,47,0.02)] flex flex-col justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#1E3A2F] mb-4">Decision Review</h2>
              {/* Category Zone Layout Preview Box */}
              <div className="bg-[#FFF8F6] rounded-xl p-4 border border-[#E1D8D6] space-y-3">
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#707973] block">
                  LAYOUT B • CATEGORY ZONES
                </span>
                
                {/* Zone 1: Drinks + Snacks */}
                <div className="bg-emerald-50/70 border border-emerald-900/10 rounded-lg p-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1E3A2F]">Drinks + Snacks</span>
                  <div className="flex items-center space-x-1">
                    <span className="w-1.5 h-4 bg-[#1E3A2F] rounded-xs"></span>
                    <span className="w-1.5 h-4 bg-[#1E3A2F] rounded-xs"></span>
                    <span className="w-1.5 h-4 bg-[#1E3A2F] rounded-xs"></span>
                    <span className="w-1.5 h-4 bg-[#1E3A2F] rounded-xs"></span>
                  </div>
                </div>

                {/* Zone 2: Bundles */}
                <div className="bg-stone-100 border border-stone-200 rounded-lg p-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1E3A2F]">Bundles</span>
                  <div className="flex items-center space-x-1">
                    <span className="w-1.5 h-4 bg-[#707973] rounded-xs"></span>
                    <span className="w-1.5 h-4 bg-[#707973] rounded-xs"></span>
                    <span className="w-1.5 h-4 bg-[#707973] rounded-xs"></span>
                    <span className="w-1.5 h-4 bg-[#707973] rounded-xs"></span>
                  </div>
                </div>

                {/* Zone 3: Essentials */}
                <div className="bg-stone-100 border border-stone-200 rounded-lg p-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1E3A2F]">Essentials</span>
                  <div className="flex items-center space-x-1">
                    <span className="w-1.5 h-4 bg-[#707973] rounded-xs"></span>
                    <span className="w-1.5 h-4 bg-[#707973] rounded-xs"></span>
                    <span className="w-1.5 h-4 bg-[#707973] rounded-xs"></span>
                    <span className="w-1.5 h-4 bg-[#707973] rounded-xs"></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3 pt-4 border-t border-[#E1D8D6]/60">
              <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#1E3A2F]/5 text-[#1E3A2F]/80 border border-[#1E3A2F]/10">
                SIMULATION ONLY
              </span>
              <p className="text-xs text-[#707973] leading-relaxed">
                No live uplift is implied. Choose a layout for campaign review.
              </p>
            </div>
          </div>
        </section>
        {/* END: DetailedComparisonGrid */}

        {/* BEGIN: BottomActions */}
        <section className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2" data-purpose="actions-and-confirmations">
          <button 
            onClick={() => handleSelectLayout('A')}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-[#1E3A2F] bg-white border border-[#E1D8D6] rounded-xl hover:bg-[#FFF8F6] transition-colors shadow-sm focus:outline-hidden focus:ring-2 focus:ring-[#1E3A2F]/20 cursor-pointer" 
            type="button"
          >
            Keep Layout A
          </button>
          <button 
            onClick={() => handleSelectLayout('B')}
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-white bg-[#1E3A2F] hover:bg-[#294D3F] rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2 focus:outline-hidden focus:ring-2 focus:ring-[#1E3A2F]/30 cursor-pointer" 
            type="button"
          >
            <span>Choose Layout B</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
        {/* END: BottomActions */}

        {/* BEGIN: InformationalBanner */}
        <footer className="rounded-xl bg-[#1E3A2F]/5 border border-[#E1D8D6]/70 px-4 py-3 text-xs text-[#707973] text-center md:text-left flex items-center space-x-2" data-purpose="status-disclaimer-footer">
          <Info className="w-4 h-4 text-[#1E3A2F]/60 shrink-0" />
          <p className="leading-none text-[11px] font-medium text-[#1E3A2F]/80">
            M07 • Sample metrics, not observed post-launch performance. No automatic activation.
          </p>
        </footer>
        {/* END: InformationalBanner */}
      </div>
    </div>
  );
};
