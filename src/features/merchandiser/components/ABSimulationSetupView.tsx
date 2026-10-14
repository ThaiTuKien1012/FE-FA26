import React, { useState } from 'react';
import { 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  BarChart3, 
  TrendingUp, 
  Layers, 
  X, 
  Info,
  Calendar,
  Store,
  Tag,
  CheckCircle2
} from 'lucide-react';
import { ActiveNavScreen } from '../../../types/mining';

interface ABSimulationSetupViewProps {
  onNavigate: (screen: ActiveNavScreen) => void;
}

export const ABSimulationSetupView: React.FC<ABSimulationSetupViewProps> = ({ onNavigate }) => {
  const [campaignName, setCampaignName] = useState('Summer Drink Bundle');
  const [storeLocation, setStoreLocation] = useState('Store 01 – Central');
  const [isRunningSimulation, setIsRunningSimulation] = useState(false);
  const [simulationResults, setSimulationResults] = useState<{
    revenueLift: string;
    utilityLift: string;
    bundleSelections: string;
    confidence: string;
  } | null>(null);

  const handleRunSimulation = () => {
    setIsRunningSimulation(true);
    setTimeout(() => {
      setIsRunningSimulation(false);
      onNavigate('merchandiser-compare-simulation');
    }, 800);
  };

  return (
    <div className="min-h-full flex flex-col justify-between space-y-6">
      <div className="space-y-6">
        {/* Page Header Block */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-[#1C2E26]">A/B Simulation Setup</h1>
          <p className="text-sm text-[#5C5451]">
            Compare baseline Layout A against proposed Layout B using historical/mock data.
          </p>
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase bg-[#E8EFE9] text-[#1E3A2F] border border-[#CFDED3]">
              SIMULATION / SAMPLE DATA
            </span>
          </div>
        </div>

        {/* Simulation Grid Layout (Left: Config & Layout Zones, Right: Settings) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Simulation Configuration (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-[#E1D8D6] rounded-2xl p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-6" data-purpose="simulation-configuration-container">
            <h2 className="text-base font-bold text-[#1E3A2F]">Simulation Configuration</h2>

            {/* Campaign and Store Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#5C5451]" htmlFor="campaign-name">Campaign</label>
                <div className="relative">
                  <input 
                    className="w-full px-3.5 py-2 rounded-lg border border-[#E1D8D6] text-sm text-[#24201E] bg-[#FFFCFB] focus:outline-none focus:ring-1 focus:ring-[#1E3A2F] focus:border-[#1E3A2F] shadow-sm font-medium" 
                    id="campaign-name" 
                    type="text" 
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                  <Tag className="w-4 h-4 text-[#716966] absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#5C5451]" htmlFor="store-location">Store</label>
                <div className="relative">
                  <input 
                    className="w-full px-3.5 py-2 rounded-lg border border-[#E1D8D6] text-sm text-[#24201E] bg-[#FFFCFB] focus:outline-none focus:ring-1 focus:ring-[#1E3A2F] focus:border-[#1E3A2F] shadow-sm font-medium" 
                    id="store-location" 
                    type="text" 
                    value={storeLocation}
                    onChange={(e) => setStoreLocation(e.target.value)}
                  />
                  <Store className="w-4 h-4 text-[#716966] absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Layout Comparison Zones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {/* LAYOUT A */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold tracking-wider uppercase text-[#716966] block">
                  LAYOUT A • CATEGORY ZONES
                </span>
                
                {/* Zone 1: Beverages */}
                <div className="p-3.5 rounded-xl bg-[#E9F2EB] border border-[#D3E5D7] flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#1E3A2F]">Beverages</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-6 rounded-sm bg-[#1E3A2F]"></span>
                    <span className="w-1.5 h-6 rounded-sm bg-[#2D5243]"></span>
                    <span className="w-1.5 h-6 rounded-sm bg-[#4A7A67]"></span>
                    <span className="w-1.5 h-6 rounded-sm bg-[#78A593]"></span>
                  </div>
                </div>

                {/* Zone 2: Snacks */}
                <div className="p-3.5 rounded-xl bg-[#F2ECF3] border border-[#E2D8E4] flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#3B2B3F]">Snacks</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-6 rounded-sm bg-[#5C4463]"></span>
                    <span className="w-1.5 h-6 rounded-sm bg-[#795D82]"></span>
                    <span className="w-1.5 h-6 rounded-sm bg-[#9D80A6]"></span>
                    <span className="w-1.5 h-6 rounded-sm bg-[#C3ACC9]"></span>
                  </div>
                </div>

                {/* Zone 3: Breakfast */}
                <div className="p-3.5 rounded-xl bg-[#EAF0F5] border border-[#D6E1EA] flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#25394A]">Breakfast</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-6 rounded-sm bg-[#32526C]"></span>
                    <span className="w-1.5 h-6 rounded-sm bg-[#486F91]"></span>
                    <span className="w-1.5 h-6 rounded-sm bg-[#6D94B7]"></span>
                    <span className="w-1.5 h-6 rounded-sm bg-[#9BBAD6]"></span>
                  </div>
                </div>

                <p className="text-xs text-[#716966] pt-1">
                  A: Existing category arrangement
                </p>
              </div>

              {/* LAYOUT B */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold tracking-wider uppercase text-[#716966] block">
                  LAYOUT B • CATEGORY ZONES
                </span>

                {/* Zone 1: Drinks + Snacks */}
                <div className="p-3.5 rounded-xl bg-[#E9F2EB] border border-[#D3E5D7] flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#1E3A2F]">Drinks + Snacks</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-6 rounded-sm bg-[#1E3A2F]"></span>
                    <span className="w-1.5 h-6 rounded-sm bg-[#2D5243]"></span>
                    <span className="w-1.5 h-6 rounded-sm bg-[#4A7A67]"></span>
                    <span className="w-1.5 h-6 rounded-sm bg-[#78A593]"></span>
                  </div>
                </div>

                {/* Zone 2: Bundles */}
                <div className="p-3.5 rounded-xl bg-[#F2ECF3] border border-[#E2D8E4] flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#3B2B3F]">Bundles</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-6 rounded-sm bg-[#5C4463]"></span>
                    <span className="w-1.5 h-6 rounded-sm bg-[#795D82]"></span>
                    <span className="w-1.5 h-6 rounded-sm bg-[#9D80A6]"></span>
                    <span className="w-1.5 h-6 rounded-sm bg-[#C3ACC9]"></span>
                  </div>
                </div>

                {/* Zone 3: Essentials */}
                <div className="p-3.5 rounded-xl bg-[#EAF0F5] border border-[#D6E1EA] flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#25394A]">Essentials</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-6 rounded-sm bg-[#32526C]"></span>
                    <span className="w-1.5 h-6 rounded-sm bg-[#486F91]"></span>
                    <span className="w-1.5 h-6 rounded-sm bg-[#6D94B7]"></span>
                    <span className="w-1.5 h-6 rounded-sm bg-[#9BBAD6]"></span>
                  </div>
                </div>

                <p className="text-xs text-[#716966] pt-1">
                  B: Merchandiser-approved group plan
                </p>
              </div>
            </div>

            {/* Simulation Data Source Card */}
            <div className="pt-4 border-t border-[#E1D8D6]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-[#5C5451] block">Simulation data source</span>
                <div className="inline-flex items-center px-3 py-1 rounded-md bg-[#F4EBE9] border border-[#E1D8D6] text-xs font-medium text-[#24201E]">
                  Historical / Mock
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#716966]">
                <span className="w-2 h-2 rounded-full bg-[#938A87]"></span>
                <span>No live customer experiment</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Simulation Settings (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-[#E1D8D6] rounded-2xl p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-6" data-purpose="simulation-settings-container">
            <div className="space-y-6">
              <h2 className="text-base font-bold text-[#1E3A2F]">Simulation Settings</h2>

              {/* Comparison Target */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#938A87] block">Comparison Target</span>
                <p className="text-sm font-semibold text-[#24201E]">Layout A vs Layout B</p>
              </div>

              {/* Input Window */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#938A87] block">Input Window</span>
                <p className="text-sm font-semibold text-[#24201E]">01 Jul – 30 Sep 2026</p>
              </div>

              {/* Metrics Checkmarks */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#938A87] block">Metrics</span>
                <div className="flex items-center gap-2.5 text-sm text-[#24201E]">
                  <Check className="w-4 h-4 text-[#1E3A2F] shrink-0 stroke-[2.5]" />
                  <span>Simulated bundle revenue</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-[#24201E]">
                  <Check className="w-4 h-4 text-[#1E3A2F] shrink-0 stroke-[2.5]" />
                  <span>Bundle selection count</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-[#24201E]">
                  <Check className="w-4 h-4 text-[#1E3A2F] shrink-0 stroke-[2.5]" />
                  <span>Historical total utility</span>
                </div>
              </div>

              {/* Callout Box */}
              <div className="p-3.5 rounded-xl bg-[#F9F5F3] border border-[#E7DDD9] space-y-1">
                <p className="text-xs font-semibold text-[#1E3A2F]">Illustrative comparison only</p>
                <p className="text-xs text-[#716966] leading-relaxed">
                  Results do not activate a campaign.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-[#E1D8D6]/60 flex items-center gap-3">
              <button 
                onClick={() => onNavigate('merchandiser-campaign-draft')}
                className="w-1/2 py-2.5 px-3 rounded-xl border border-[#E1D8D6] bg-white text-xs font-semibold text-[#3A3432] hover:bg-[#FFF8F6] hover:border-[#CFC5C3] transition-colors text-center shadow-sm cursor-pointer" 
                type="button"
              >
                Back to Draft
              </button>
              <button 
                onClick={handleRunSimulation}
                disabled={isRunningSimulation}
                className="w-1/2 py-2.5 px-3 rounded-xl bg-[#1E3A2F] text-white text-xs font-semibold hover:bg-[#294D3F] transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] cursor-pointer disabled:opacity-70" 
                type="button"
              >
                {isRunningSimulation ? (
                  <span>Simulating...</span>
                ) : (
                  <>
                    <span>Run Simulation</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Footer Notice */}
      <footer className="h-10 px-4 -mx-6 -mb-6 mt-8 bg-white border-t border-[#E1D8D6] flex items-center text-xs text-[#716966] shrink-0" data-purpose="status-footer">
        <span>M06 • Demo configuration. Save/layout changes remain under Merchandiser review.</span>
      </footer>

      {/* Simulation Result Modal */}
      {simulationResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#E1D8D6] max-w-lg w-full p-6 shadow-xl space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1D8D6]">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#1E3A2F]" />
                <h3 className="text-sm font-bold text-[#191C1B]">A/B Simulation Projection Summary</h3>
              </div>
              <button 
                onClick={() => setSimulationResults(null)}
                className="p-1 rounded-lg hover:bg-[#F5EEE9] text-[#716966] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#E8EFE9] border border-[#CFDED3]">
                <span className="text-[11px] font-semibold text-[#1E3A2F] uppercase block">Projected Revenue Lift</span>
                <span className="text-xl font-bold text-[#1E3A2F] mt-1 block">{simulationResults.revenueLift}</span>
                <span className="text-[10px] text-[#5C5451] block mt-0.5">vs Layout A Baseline</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F2ECF3] border border-[#E2D8E4]">
                <span className="text-[11px] font-semibold text-[#3B2B3F] uppercase block">Utility Gain</span>
                <span className="text-xl font-bold text-[#3B2B3F] mt-1 block">{simulationResults.utilityLift}</span>
                <span className="text-[10px] text-[#5C5451] block mt-0.5">High-utility itemsets</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FFF8F6] border border-[#E1D8D6]">
                <span className="text-[11px] font-semibold text-[#716966] uppercase block">Bundle Orders</span>
                <span className="text-base font-bold text-[#191C1B] mt-1 block">{simulationResults.bundleSelections}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FFF8F6] border border-[#E1D8D6]">
                <span className="text-[11px] font-semibold text-[#716966] uppercase block">Confidence Interval</span>
                <span className="text-base font-bold text-[#191C1B] mt-1 block">{simulationResults.confidence}</span>
              </div>
            </div>

            <p className="text-xs text-[#716966] leading-relaxed">
              Based on historical retail basket dataset, <strong>Layout B (Drinks + Snacks Adjacent)</strong> promotes cross-selling by placing high-utility companion itemsets within high-traffic endcaps.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSimulationResults(null)}
                className="px-4 py-2 rounded-lg border border-[#E1D8D6] text-xs font-semibold text-[#191C1B] hover:bg-[#F5EEE9] cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSimulationResults(null);
                  onNavigate('merchandiser-campaign-draft');
                }}
                className="px-4 py-2 rounded-lg bg-[#1E3A2F] text-white text-xs font-semibold hover:bg-[#294D3F] cursor-pointer flex items-center gap-1.5"
              >
                Apply to Campaign Draft
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
