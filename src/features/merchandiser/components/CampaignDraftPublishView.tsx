import React, { useState } from 'react';
import {
  Save,
  ArrowRight,
  Store,
  LayoutGrid,
  Calendar,
  Layers,
  Check,
  CheckCircle2,
  FlaskConical,
  Sparkles,
  Info,
  X,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { ActiveNavScreen } from '../../../types/mining';

interface CampaignDraftPublishViewProps {
  onNavigate?: (screen: ActiveNavScreen) => void;
}

export const CampaignDraftPublishView: React.FC<CampaignDraftPublishViewProps> = ({
  onNavigate
}) => {
  const [campaignName, setCampaignName] = useState('Summer Drink Bundle');
  const [storeName] = useState('Store 01 – Central');
  const [selectedLayout] = useState('Layout B – Draft #L-042');
  const [scheduleDates] = useState('01 Nov 2026 – 30 Nov 2026');
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveDraft = () => {
    showToast(`Bản nháp chiến dịch "${campaignName}" đã được lưu thành công!`);
  };

  const handlePublish = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      showToast(`Đã xuất bản "${campaignName}"! Đang chuyển đến danh sách Published...`);
      setTimeout(() => {
        if (onNavigate) {
          onNavigate('merchandiser-campaign-status');
        }
      }, 1000);
    }, 600);
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

      {/* Page Title Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl lg:text-[28px] font-extrabold tracking-tight text-[#191C1B]">
              Campaign Draft &amp; Publish
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#D4E7DA] text-[#1E3A2F] border border-[#AECEBE]">
              DEMO DATA
            </span>
          </div>
          <p className="text-sm text-[#707973] mt-1 max-w-2xl">
            Prepare an approved layout for publishing or optional simulated A/B testing.
          </p>
        </div>

        {/* Action Button: Save Draft */}
        <div>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#E1D8D6] rounded-xl text-sm font-semibold text-[#191C1B] bg-white hover:bg-[#F5ECE8] transition-all shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <Save className="w-4 h-4 text-[#707973]" />
            <span>Save Draft</span>
          </button>
        </div>
      </div>

      {/* Two-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (8 cols): Campaign Configuration Card */}
        <section className="lg:col-span-8 bg-white rounded-2xl p-6 sm:p-8 border border-[#E1D8D6] shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] space-y-6">
          {/* Section Title */}
          <div>
            <h2 className="text-lg font-bold text-[#191C1B] leading-none">
              Campaign Configuration
            </h2>
            <p className="text-xs text-[#707973] mt-1.5 font-medium">
              Campaign information and selected Layout B
            </p>
          </div>

          {/* Form Fields Container */}
          <div className="space-y-4">
            {/* Field 1: Campaign Name */}
            <div>
              <label
                className="block text-xs font-semibold text-[#191C1B] mb-1.5"
                htmlFor="campaign-name"
              >
                Campaign Name
              </label>
              <div className="relative rounded-xl bg-[#FBF2F0] px-3.5 py-2.5 border border-[#E1D8D6] flex items-center">
                <input
                  id="campaign-name"
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="bg-transparent border-0 p-0 text-sm font-medium text-[#191C1B] w-full focus:outline-hidden focus:ring-0"
                />
              </div>
            </div>

            {/* Field 2: Store */}
            <div>
              <label
                className="block text-xs font-semibold text-[#191C1B] mb-1.5"
                htmlFor="store-name"
              >
                Store
              </label>
              <div className="relative rounded-xl bg-[#FBF2F0] px-3.5 py-2.5 border border-[#E1D8D6] flex items-center justify-between">
                <input
                  id="store-name"
                  type="text"
                  readOnly
                  value={storeName}
                  className="bg-transparent border-0 p-0 text-sm font-medium text-[#191C1B] w-full focus:outline-hidden cursor-default"
                />
                <Store className="w-4 h-4 text-[#707973] shrink-0 ml-2" />
              </div>
            </div>

            {/* Field 3: Selected Layout */}
            <div>
              <label
                className="block text-xs font-semibold text-[#191C1B] mb-1.5"
                htmlFor="selected-layout"
              >
                Selected Layout
              </label>
              <div className="relative rounded-xl bg-[#FBF2F0] px-3.5 py-2.5 border border-[#E1D8D6] flex items-center justify-between">
                <input
                  id="selected-layout"
                  type="text"
                  readOnly
                  value={selectedLayout}
                  className="bg-transparent border-0 p-0 text-sm font-medium text-[#191C1B] w-full focus:outline-hidden cursor-default"
                />
                <LayoutGrid className="w-4 h-4 text-[#707973] shrink-0 ml-2" />
              </div>
            </div>

            {/* Field 4: Schedule */}
            <div>
              <label
                className="block text-xs font-semibold text-[#191C1B] mb-1.5"
                htmlFor="schedule-dates"
              >
                Schedule
              </label>
              <div className="relative rounded-xl bg-[#FBF2F0] px-3.5 py-2.5 border border-[#E1D8D6] flex items-center justify-between">
                <input
                  id="schedule-dates"
                  type="text"
                  readOnly
                  value={scheduleDates}
                  className="bg-transparent border-0 p-0 text-sm font-medium text-[#191C1B] w-full focus:outline-hidden cursor-default"
                />
                <Calendar className="w-4 h-4 text-[#707973] shrink-0 ml-2" />
              </div>
            </div>
          </div>

          {/* Section: Approved Groups */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-[#191C1B] mb-3 uppercase tracking-wider">
              Approved Groups
            </h3>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Pill 1 */}
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-[#F5ECEA] text-[#191C1B] border border-[#E1D8D6]">
                <span className="w-2 h-2 rounded-full bg-[#1E3A2F]" />
                Summer Drink Set
              </span>
              <span className="text-[#E1D8D6]">•</span>
              {/* Pill 2 */}
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-[#F5ECEA] text-[#191C1B] border border-[#E1D8D6]">
                <span className="w-2 h-2 rounded-full bg-[#304C41]" />
                Snack Combo
              </span>
              <span className="text-[#E1D8D6]">•</span>
              {/* Pill 3 */}
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-[#F5ECEA] text-[#191C1B] border border-[#E1D8D6]">
                <span className="w-2 h-2 rounded-full bg-[#954A17]" />
                Breakfast Set
              </span>
            </div>
          </div>

          {/* Info Banner Box */}
          <div className="rounded-xl bg-[#F5ECEA]/80 p-4 border border-[#E1D8D6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E1D8D6] flex items-center justify-center shrink-0 shadow-2xs text-[#1E3A2F]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#191C1B] leading-snug">
                  3 Active Item Clusters Linked
                </h4>
                <p className="text-xs text-[#707973] font-medium">
                  Validated against Floor Zone C (Central Showcase)
                </p>
              </div>
            </div>
            <div>
              <span className="inline-flex px-3 py-1 rounded-lg text-[11px] font-bold text-[#1E3A2F] bg-white border border-[#E1D8D6] shadow-2xs whitespace-nowrap">
                READY TO QUEUE
              </span>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN (4 cols): Publishing Readiness & Action Cards */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Card 1: Publishing Readiness */}
          <div className="bg-white rounded-2xl p-6 border border-[#E1D8D6] shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#191C1B] leading-tight">
                Publishing<br />Readiness
              </h3>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-[#1E3A2F] bg-[#D4E7DA]">
                4 / 4 Complete
              </span>
            </div>

            {/* Readiness Checklist */}
            <ul className="space-y-3 pt-1">
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#E7EDE9] text-[#1E3A2F] flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
                <span className="text-xs font-semibold text-[#191C1B]">Layout B saved</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#E7EDE9] text-[#1E3A2F] flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
                <span className="text-xs font-semibold text-[#191C1B]">3 groups approved</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#E7EDE9] text-[#1E3A2F] flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
                <span className="text-xs font-semibold text-[#191C1B]">Campaign details complete</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#E7EDE9] text-[#1E3A2F] flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
                <span className="text-xs font-semibold text-[#191C1B]">Schedule configured</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Choose Next Action */}
          <div className="bg-white rounded-2xl p-6 border border-[#E1D8D6] shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] space-y-4">
            <h3 className="text-base font-bold text-[#191C1B]">
              Choose Next Action
            </h3>

            {/* Action 1: Publish for Activation Review */}
            <button
              type="button"
              disabled={isPublishing}
              onClick={handlePublish}
              className="w-full text-left p-4 rounded-xl bg-[#1E3A2F] hover:bg-[#12231A] transition-all group cursor-pointer block shadow-sm text-white disabled:opacity-75"
            >
              <div className="flex items-center justify-between font-bold text-sm text-white">
                <span>{isPublishing ? 'Publishing...' : 'Publish for Activation Review'}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-white" />
              </div>
              <p className="text-xs text-[#AECEBE] mt-1.5 leading-relaxed font-normal">
                Store Admin activates only after publishing.
              </p>
            </button>

            {/* Action 2: Run A/B Simulation (Optional) */}
            <button
              type="button"
              onClick={() => onNavigate?.('merchandiser-ab-simulation')}
              className="w-full text-left p-4 rounded-xl bg-[#F5ECEA] hover:bg-[#EFE6E4] border border-[#E1D8D6] transition-all group cursor-pointer block"
            >
              <div className="flex items-center justify-between text-[#1E3A2F] font-bold text-sm">
                <span>
                  Run A/B Simulation
                  <span className="block sm:inline sm:ml-1 font-medium text-xs text-[#57534E]">
                    (Optional)
                  </span>
                </span>
                <FlaskConical className="w-5 h-5 text-[#1E3A2F] shrink-0" />
              </div>
              <p className="text-xs text-[#707973] mt-2 leading-relaxed font-normal">
                Historical/mock simulation, not live testing.
              </p>
            </button>

            {/* Footer Details inside Card */}
            <div className="pt-3 border-t border-[#E1D8D6] flex items-center justify-between text-[11px] font-semibold text-[#707973]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A2F]" />
                <span>Node ID: SYNC-290</span>
              </div>
              <div>
                <span>Draft V2.4</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Optional A/B Simulation Modal */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E1D8D6] max-w-lg w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1D8D6]">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-[#1E3A2F]" />
                <h3 className="text-base font-bold text-[#191C1B]">
                  Simulated A/B Layout Impact
                </h3>
              </div>
              <button
                onClick={() => setShowSimModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-[#FAF8F5] text-[#707973] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#707973]">
              Comparison between current baseline (Layout A) and proposed candidate (Layout B) using Q3 transaction replay.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E1D8D6] space-y-1">
                <span className="text-[10px] font-bold text-[#707973] uppercase">Simulated Basket Lift</span>
                <div className="text-xl font-bold text-[#1E3A2F] flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-[#10B981]" />
                  <span>+18.4%</span>
                </div>
                <span className="text-[10px] text-[#707973]">vs Layout A baseline</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E1D8D6] space-y-1">
                <span className="text-[10px] font-bold text-[#707973] uppercase">Margin Contribution</span>
                <div className="text-xl font-bold text-[#1E3A2F] flex items-center gap-1">
                  <BarChart3 className="w-4 h-4 text-[#10B981]" />
                  <span>+9.2%</span>
                </div>
                <span className="text-[10px] text-[#707973]">Estimated profit lift</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#E7EDE9]/60 border border-[#AECEBE] text-xs text-[#1E3A2F] flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Simulation confidence score is <strong>94.2%</strong>. You can proceed to publish this draft directly for Store Admin activation.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSimModal(false)}
                className="px-3.5 py-2 rounded-xl border border-[#E1D8D6] text-xs font-semibold text-[#57534E] hover:bg-[#FAF8F5] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSimModal(false);
                  handlePublish();
                }}
                className="px-4 py-2 rounded-xl bg-[#1E3A2F] text-white text-xs font-bold hover:bg-[#12231A] cursor-pointer flex items-center gap-1.5"
              >
                <span>Publish Draft</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Footer Disclaimer */}
      <div className="text-center text-xs text-[#707973] pt-4 pb-4">
        Preview only • All metrics and records are sample data; no live backend is connected.
      </div>
    </div>
  );
};
