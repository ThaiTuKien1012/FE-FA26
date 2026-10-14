import React, { useState } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Sliders, 
  Ban, 
  MoreHorizontal, 
  SlidersHorizontal, 
  ArrowRight, 
  ArrowLeft, 
  HelpCircle, 
  Info, 
  ShieldCheck, 
  ExternalLink,
  Code2,
  X,
  FileCheck,
  Check
} from 'lucide-react';
import { ActiveNavScreen } from '../../../types/mining';

interface RefineCriteriaViewProps {
  onNavigate: (screen: ActiveNavScreen) => void;
}

export const RefineCriteriaView: React.FC<RefineCriteriaViewProps> = ({ onNavigate }) => {
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [recheckStatus, setRecheckStatus] = useState<string | null>(null);

  const handleSimulateRecheck = () => {
    setRecheckStatus('Checking criteria prerequisites against EFIM-v2.4 cache...');
    setTimeout(() => {
      setRecheckStatus('Validation complete: 1 blocker remains (No approved group found in M03).');
      setTimeout(() => setRecheckStatus(null), 4000);
    }, 1200);
  };

  return (
    <div className="min-h-full flex flex-col justify-between space-y-6">
      <div className="space-y-6">
        {/* Page Title & Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#191C1B]">Rework / Refine Criteria</h1>
            <p className="text-sm text-[#707973] mt-1">Review why a recommendation or campaign cannot proceed.</p>
            <div className="flex items-center gap-2 mt-3.5 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F5EEE9] text-[#191C1B] border border-[#E1D8D6]">
                DEMO DATA
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F5EEE9] text-[#191C1B] border border-[#E1D8D6]">
                <Sliders className="w-3 h-3 text-[#707973]" />
                Model: EFIM-v2.4
              </span>
            </div>
          </div>
          {/* Stage Badge */}
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F5EEE9] border border-[#E1D8D6] text-[#191C1B]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#707973]"></span>
              Stage: M09 Review
            </span>
          </div>
        </div>

        {/* Status Toast / Alert if rechecking */}
        {recheckStatus && (
          <div className="p-3.5 rounded-xl bg-[#EEF5F1] border border-[#D8E8DF] text-[#1E3A2F] text-xs font-medium flex items-center justify-between animate-fadeIn">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1E3A2F]" />
              {recheckStatus}
            </span>
            <button onClick={() => setRecheckStatus(null)} className="text-[#1E3A2F]/60 hover:text-[#1E3A2F]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Warning Alert Banner */}
        <div className="rounded-2xl bg-[#FDF2F0] border border-[#F6D5CF] p-4.5 px-5 flex items-start gap-3.5 shadow-sm" data-purpose="blocker-alert">
          <div className="w-5 h-5 rounded-full border border-[#B3261E] flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[#B3261E] text-xs font-bold leading-none">!</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#98211A]">No eligible product groups for the current selection</h2>
            <p className="text-xs text-[#98211A]/80 mt-0.5">Review source mining results and approval requirements before continuing.</p>
          </div>
        </div>

        {/* Two Column Grid for Status Checklist & Next Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1: Readiness & Issue Details */}
          <div className="lg:col-span-7 space-y-3">
            <div className="bg-white rounded-2xl border border-[#E1D8D6] p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-[#E1D8D6]/70">
                <div>
                  <h3 className="text-base font-semibold text-[#191C1B]">Readiness &amp; Issue Details</h3>
                  <p className="text-xs text-[#707973] mt-0.5">Review items that block the recommended workflow</p>
                </div>
                <button 
                  onClick={() => setShowSchemaModal(true)}
                  aria-label="Filter Details" 
                  title="View detailed pipeline schema"
                  className="p-1.5 rounded-lg text-[#707973] hover:bg-[#F5EEE9] transition-colors" 
                  type="button"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Pipeline Status Rows */}
              <div className="divide-y divide-[#E1D8D6]/60">
                {/* Row 1: Mining run result */}
                <div className="py-4 flex items-center justify-between hover:bg-[#FFFBF9] px-2 rounded-lg transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mt-1 shrink-0"></span>
                    <div>
                      <div className="text-sm font-medium text-[#191C1B]">Mining run result</div>
                      <div className="text-xs text-[#707973] mt-0.5">Run #0024 • EFIM High Utility Mining</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Available
                  </span>
                </div>

                {/* Row 2: Eligible group selection */}
                <div className="py-4 flex items-center justify-between hover:bg-[#FFFBF9] px-2 rounded-lg transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#B3261E] mt-1 shrink-0"></span>
                    <div>
                      <div className="text-sm font-medium text-[#191C1B]">Eligible group selection</div>
                      <div className="text-xs text-[#707973] mt-0.5">No matching group in current selection</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                    <MoreHorizontal className="w-3.5 h-3.5 text-amber-600" />
                    Needs review
                  </span>
                </div>

                {/* Row 3: Group approval */}
                <div className="py-4 flex items-center justify-between hover:bg-[#FFFBF9] px-2 rounded-lg transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#B3261E] mt-1 shrink-0"></span>
                    <div>
                      <div className="text-sm font-medium text-[#191C1B]">Group approval</div>
                      <div className="text-xs text-[#707973] mt-0.5">At least one approved group is required (M03)</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FDF2F0] text-[#98211A] border border-[#F6D5CF]">
                    <Ban className="w-3.5 h-3.5 text-[#B3261E]" />
                    Blocked
                  </span>
                </div>

                {/* Row 4: Layout B draft */}
                <div className="py-4 flex items-center justify-between hover:bg-[#FFFBF9] px-2 rounded-lg transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#B3261E] mt-1 shrink-0"></span>
                    <div>
                      <div className="text-sm font-medium text-[#191C1B]">Layout B draft</div>
                      <div className="text-xs text-[#707973] mt-0.5">Cannot build a layout without eligible groups</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FDF2F0] text-[#98211A] border border-[#F6D5CF]">
                    <Ban className="w-3.5 h-3.5 text-[#B3261E]" />
                    Not ready
                  </span>
                </div>
              </div>

              {/* Score Indicator Box */}
              <div className="mt-4 p-4 rounded-xl bg-[#FFF8F6] border border-[#E1D8D6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  {/* Circular Gauge Progress */}
                  <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                    <svg className="w-12 h-12 -rotate-90 origin-center" viewBox="0 0 36 36">
                      <path 
                        className="text-[#E1D8D6]" 
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="3.2"
                      />
                      <path 
                        className="text-[#1E3A2F]" 
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeDasharray="25, 100" 
                        strokeLinecap="round" 
                        strokeWidth="3.2"
                      />
                    </svg>
                    <span className="absolute text-[11px] font-bold text-[#191C1B]">25%</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#191C1B]">Criteria Readiness Score</h4>
                    <p className="text-[11px] text-[#707973] mt-0.5">1 of 4 core pipeline prerequisites satisfied</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSchemaModal(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#191C1B] bg-white border border-[#E1D8D6] rounded-lg hover:bg-[#F5EEE9] transition-colors cursor-pointer self-start sm:self-auto" 
                  type="button"
                >
                  Inspect Schema
                </button>
              </div>
            </div>

            {/* Contextual note below card */}
            <p className="text-xs text-[#707973] flex items-center gap-1.5 px-1">
              <Info className="w-4 h-4 text-[#707973] shrink-0" />
              <span>No automatic approval, mining rerun or campaign activation.</span>
            </p>
          </div>

          {/* Column 2: Refine & Recheck Guidance */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-[#E1D8D6] p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#E1D8D6]/70">
                  <div>
                    <h3 className="text-base font-semibold text-[#191C1B]">Refine &amp; Recheck</h3>
                    <p className="text-xs text-[#707973] mt-0.5">Human-controlled corrective actions</p>
                  </div>
                  <button 
                    onClick={() => onNavigate('merchandiser-utility-profile')}
                    aria-label="Workflow Options" 
                    title="Configure utility weights"
                    className="p-1.5 rounded-lg text-[#707973] hover:bg-[#F5EEE9] transition-colors cursor-pointer" 
                    type="button"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>
                </div>

                {/* Numbered Corrective Actions List */}
                <div className="mt-5 space-y-6 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E1D8D6]">
                  {/* Step 1 */}
                  <div 
                    onClick={() => { setActiveStep(1); onNavigate('merchandiser-recommendations'); }}
                    className="flex items-start gap-3.5 relative group cursor-pointer"
                  >
                    <span className="w-7 h-7 rounded-full bg-[#1E3A2F] text-white text-xs font-semibold flex items-center justify-center shrink-0 z-10 shadow-sm group-hover:scale-105 transition-transform">
                      1
                    </span>
                    <div>
                      <div className="text-xs font-bold text-[#191C1B] group-hover:text-[#1E3A2F] transition-colors flex items-center gap-1.5">
                        Review recommendations
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#1E3A2F]" />
                      </div>
                      <div className="text-xs text-[#707973] mt-0.5 leading-relaxed">Inspect source run and matching itemsets.</div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div 
                    onClick={() => { setActiveStep(2); onNavigate('merchandiser-utility-profile'); }}
                    className="flex items-start gap-3.5 relative group cursor-pointer"
                  >
                    <span className="w-7 h-7 rounded-full bg-[#F5EEE9] text-[#191C1B] border border-[#E1D8D6] text-xs font-semibold flex items-center justify-center shrink-0 z-10 group-hover:bg-[#1E3A2F] group-hover:text-white transition-all">
                      2
                    </span>
                    <div>
                      <div className="text-xs font-bold text-[#191C1B] group-hover:text-[#1E3A2F] transition-colors flex items-center gap-1.5">
                        Check product eligibility
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#1E3A2F]" />
                      </div>
                      <div className="text-xs text-[#707973] mt-0.5 leading-relaxed">Verify catalog items and utility inputs.</div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div 
                    onClick={() => { setActiveStep(3); onNavigate('merchandiser-approve'); }}
                    className="flex items-start gap-3.5 relative group cursor-pointer"
                  >
                    <span className="w-7 h-7 rounded-full bg-[#F5EEE9] text-[#191C1B] border border-[#E1D8D6] text-xs font-semibold flex items-center justify-center shrink-0 z-10 group-hover:bg-[#1E3A2F] group-hover:text-white transition-all">
                      3
                    </span>
                    <div>
                      <div className="text-xs font-bold text-[#191C1B] group-hover:text-[#1E3A2F] transition-colors flex items-center gap-1.5">
                        Review approval status
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#1E3A2F]" />
                      </div>
                      <div className="text-xs text-[#707973] mt-0.5 leading-relaxed">Approve eligible groups in M03.</div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div 
                    onClick={() => { setActiveStep(4); onNavigate('merchandiser-campaign-draft'); }}
                    className="flex items-start gap-3.5 relative group cursor-pointer"
                  >
                    <span className="w-7 h-7 rounded-full bg-[#F5EEE9] text-[#191C1B] border border-[#E1D8D6] text-xs font-semibold flex items-center justify-center shrink-0 z-10 group-hover:bg-[#1E3A2F] group-hover:text-white transition-all">
                      4
                    </span>
                    <div>
                      <div className="text-xs font-bold text-[#191C1B] group-hover:text-[#1E3A2F] transition-colors flex items-center gap-1.5">
                        Revisit campaign draft
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#1E3A2F]" />
                      </div>
                      <div className="text-xs text-[#707973] mt-0.5 leading-relaxed">Return to M05 after resolving blockers.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assistance Help Box */}
              <div className="mt-8 p-3.5 rounded-xl bg-[#FFF8F6] border border-[#E1D8D6] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#707973]" />
                  <span className="text-xs text-[#191C1B] font-medium">Need help configuring weights?</span>
                </div>
                <button
                  onClick={() => onNavigate('merchandiser-utility-profile')}
                  className="text-xs font-semibold text-[#1E3A2F] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Guide 
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex items-center justify-end gap-3" data-purpose="page-primary-actions">
          <button 
            onClick={() => onNavigate('merchandiser-recommendations')}
            className="px-5 py-2.5 rounded-lg border border-[#E1D8D6] bg-white text-xs font-semibold text-[#191C1B] hover:bg-[#F5EEE9] transition-colors shadow-sm cursor-pointer flex items-center gap-2" 
            type="button"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Recommendations
          </button>
          <button 
            onClick={handleSimulateRecheck}
            className="px-5 py-2.5 rounded-lg bg-[#1E3A2F] text-white text-xs font-semibold hover:bg-[#294D3F] transition-colors shadow-sm flex items-center gap-2 cursor-pointer" 
            type="button"
          >
            Review Criteria
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Persistent Footer Status Strip */}
      <footer className="h-10 px-4 -mx-6 -mb-6 mt-8 border-t border-[#E1D8D6] bg-white flex items-center justify-between text-[11px] text-[#707973] shrink-0" data-purpose="system-footer">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#1E3A2F]" />
          <span>Preview only: illustrative eligibility and validation status.</span>
        </div>
        <div className="font-mono text-[#707973] text-[10px]">
          Engine build #4092-live
        </div>
      </footer>

      {/* Schema Inspector Modal */}
      {showSchemaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#E1D8D6] max-w-lg w-full p-6 shadow-xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1D8D6]">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-[#1E3A2F]" />
                <h3 className="text-sm font-bold text-[#191C1B]">Pipeline Readiness Schema (EFIM-v2.4)</h3>
              </div>
              <button 
                onClick={() => setShowSchemaModal(false)}
                className="p-1 rounded-lg hover:bg-[#F5EEE9] text-[#707973] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#191C1B]">
              <div className="p-3 bg-[#FFF8F6] border border-[#E1D8D6] rounded-xl font-mono text-[11px] space-y-1 text-[#57534E]">
                <p><span className="text-[#1E3A2F] font-semibold">mining_run_status:</span> &quot;COMPLETED_VALID&quot; [PASS]</p>
                <p><span className="text-[#1E3A2F] font-semibold">min_utility_threshold:</span> 0.05</p>
                <p><span className="text-[#B3261E] font-semibold">active_approved_groups:</span> 0 [REQUIRED &gt;= 1]</p>
                <p><span className="text-[#B3261E] font-semibold">layout_b_status:</span> &quot;NOT_SYNCHRONIZED&quot; [BLOCKED]</p>
                <p><span className="text-[#707973] font-semibold">current_stage:</span> &quot;M09_REWORK_CRITERIA&quot;</p>
              </div>

              <p className="text-[#707973] leading-relaxed text-[11px]">
                To unblock the campaign activation workflow, navigate to <strong>M03 Approve Group</strong> and mark at least one high-utility itemset as approved, or adjust utility weights in <strong>Utility Profile</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSchemaModal(false)}
                className="px-4 py-2 rounded-lg border border-[#E1D8D6] text-xs font-semibold text-[#191C1B] hover:bg-[#F5EEE9] cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowSchemaModal(false);
                  onNavigate('merchandiser-approve');
                }}
                className="px-4 py-2 rounded-lg bg-[#1E3A2F] text-white text-xs font-semibold hover:bg-[#294D3F] cursor-pointer flex items-center gap-1.5"
              >
                Go to M03 Approve Group
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
