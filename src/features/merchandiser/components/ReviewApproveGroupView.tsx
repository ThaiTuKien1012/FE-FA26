import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Sparkles,
  Droplets,
  Zap,
  Package,
  Coffee,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Lightbulb,
  ShieldCheck,
  Shield,
  Layers,
  Share2,
  ExternalLink
} from 'lucide-react';
import { RecommendedProductGroup, ProductGroupStatus } from '../../../types/merchandiser';
import { INITIAL_RECOMMENDED_GROUPS } from '../data/initialProductGroups';
import { ActiveNavScreen } from '../../../types/mining';

interface ReviewApproveGroupViewProps {
  selectedGroupId?: string;
  onNavigate?: (screen: ActiveNavScreen) => void;
  onStatusChange?: (groupId: string, status: ProductGroupStatus) => void;
}

const CARD = 'bg-white rounded-2xl border border-[#E7E2D8] shadow-xs';
const LABEL = 'text-[11px] font-bold tracking-wider text-[#707973] uppercase';

export const ReviewApproveGroupView: React.FC<ReviewApproveGroupViewProps> = ({
  selectedGroupId = 'grp-01',
  onNavigate,
  onStatusChange
}) => {
  // Find group by selectedGroupId or fallback to Summer Drink Set
  const initialGroup = INITIAL_RECOMMENDED_GROUPS.find(g => g.id === selectedGroupId) || INITIAL_RECOMMENDED_GROUPS[0];
  const [group, setGroup] = useState<RecommendedProductGroup>(initialGroup);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleApprove = () => {
    const updated: RecommendedProductGroup = {
      ...group,
      status: 'Approved',
      layoutTarget: 'Layout B'
    };
    setGroup(updated);
    if (onStatusChange) {
      onStatusChange(group.id, 'Approved');
    }
    showToast(`Đã duyệt nhóm sản phẩm "${group.groupName}" thành công!`);
  };

  const handleLeaveUnapproved = () => {
    const updated: RecommendedProductGroup = {
      ...group,
      status: 'Pending'
    };
    setGroup(updated);
    if (onStatusChange) {
      onStatusChange(group.id, 'Pending');
    }
    showToast(`Đã giữ nhóm "${group.groupName}" ở trạng thái chờ duyệt (Unapproved).`);
  };

  // Helper icon renderer
  const renderItemIcon = (iconType?: string, name?: string) => {
    if (iconType === 'water' || name?.toLowerCase().includes('water')) {
      return (
        <div className="w-12 h-12 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
          <Droplets className="w-6 h-6" />
        </div>
      );
    }
    if (iconType === 'energy' || name?.toLowerCase().includes('energy')) {
      return (
        <div className="w-12 h-12 rounded-xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center shrink-0">
          <Zap className="w-6 h-6" />
        </div>
      );
    }
    if (iconType === 'snack' || name?.toLowerCase().includes('chips')) {
      return (
        <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
          <Package className="w-6 h-6" />
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-xl bg-[#EDE9FE] text-[#6366F1] flex items-center justify-center shrink-0">
        <Coffee className="w-6 h-6" />
      </div>
    );
  };

  const isApproved = group.status === 'Approved';
  const totalUtility = group.items.reduce((s, i) => s + (i.utilityContribution || 0), 0) || group.utilityScore;
  const confidenceScore = group.confidencePct ?? 68.4;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E3A2F] text-white px-4 py-3 rounded-xl shadow-lg border border-[#34D399]/30 flex items-center gap-3 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-[#34D399]" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191C1B]">
              Review &amp; Approve Product Group
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-[#E5F3EB] text-[#1E3A2F] border border-[#CAEADA]">
              DEMO DATA
            </span>
          </div>
          <p className="text-sm text-[#707973] mt-1.5 max-w-2xl">
            Inspect algorithmic mining evidence before explicitly committing this placement rule to active store planograms.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-[#E7E2D8] shadow-xs">
            <ShieldCheck className="w-4 h-4 text-[#D97706]" />
            <span className="text-xs text-[#57534E]">
              Store Node:{' '}
              <strong className="text-[#191C1B] font-bold">
                {group.storeNode || 'Regional A-14 (Oslo Central)'}
              </strong>
            </span>
          </div>

          <button
            onClick={() => onNavigate && onNavigate('merchandiser-recommendations')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E7E2D8] text-[#1E3A2F] hover:bg-[#FAF8F5] hover:border-[#1E3A2F]/30 transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#1E3A2F]" />
            <span>Back to Recommendations</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Group Details, Products in Group & Mining Evidence */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Card: Product Group & Linked SKU Manifest */}
          <div className={`${CARD} p-6 sm:p-7 space-y-6`}>
            {/* Header Block: Group Name & Status Badge */}
            <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#E7E2D8]">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-extrabold text-[#191C1B] tracking-tight">
                    {group.groupName}
                  </h2>
                  {isApproved ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E5F3EB] text-[#1E3A2F] border border-[#CAEADA]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                      Approved for Layout
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                      Pending Review
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#707973] mt-1.5 font-medium">
                  Group <span className="font-mono text-[#191C1B] font-bold">{group.groupCode || 'REC-014'}</span>{' '}
                  <span className="mx-1">•</span>{' '}
                  {group.notes || 'Proposed cross-sell merchandise association'}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2 bg-[#FAF8F5] border border-[#E7E2D8] px-3 py-1.5 rounded-lg">
                <Layers className="w-4 h-4 text-[#1E3A2F]" />
                <span className="text-[11px] font-bold tracking-wider text-[#1E3A2F] uppercase">
                  {group.items.length} ITEMS LINKED
                </span>
              </div>
            </div>

            {/* Products in this group Section */}
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <span className={LABEL}>GROUP SKU COMPOSITION</span>
                <span className={LABEL}>UTILITY WEIGHT CONTRIBUTION</span>
              </div>

              {/* Item Cards Stack */}
              <div className="space-y-3">
                {group.items.map(item => {
                  const isPivot = item.role === 'Pivot SKU';
                  return (
                    <div
                      key={item.id}
                      className="group p-4 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5]/50 hover:bg-[#FAF8F5] transition-all flex items-center justify-between gap-4"
                    >
                      {/* Left: Icon + Name + SKU & Location */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {renderItemIcon(item.iconType, item.name)}
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#191C1B] truncate">
                            {item.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-[#707973] mt-0.5">
                            <span className="font-mono">{item.sku || 'SKU: DRK-101'}</span>
                            {item.location && (
                              <>
                                <span>•</span>
                                <span>{item.location}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Category badge + Utility points + Role */}
                      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                        <span
                          className={`hidden sm:inline-block px-2.5 py-1 rounded text-[11px] font-bold tracking-wider uppercase border ${
                            isPivot
                              ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
                              : 'bg-white text-[#57534E] border-[#E7E2D8]'
                          }`}
                        >
                          {item.category}
                        </span>

                        <div className="flex flex-col items-end">
                          <span className="font-mono text-sm font-bold text-[#191C1B] tabular-nums">
                            {item.utilityContribution} pts
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isPivot ? 'bg-[#D97706]' : 'bg-[#1E3A2F]'
                              }`}
                            />
                            <span className="text-[11px] text-[#707973]">
                              {item.role || 'Active'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Affinity / Co-occurrence Insight Bar */}
              <div className="mt-4 p-4 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2.5 text-[#57534E]">
                  <Share2 className="w-4 h-4 text-[#1E3A2F] shrink-0" />
                  <span>
                    Observed co-occurrence confidence across basket transactions:{' '}
                    <strong className="text-[#191C1B] font-bold">{confidenceScore}%</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGraphModalOpen(true)}
                  className="font-bold text-[#1E3A2F] hover:underline cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <span>Inspect Graph</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Mining Evidence Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-sm font-bold text-[#191C1B]">Mining Evidence</h3>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E3A2F]">
                  <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Algorithm Verified</span>
                </div>
              </div>

              {/* 3 Analytical Key Stat Blocks */}
              <div className="p-5 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5]/70 grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Aggregate Utility */}
                <div>
                  <div className={LABEL}>AGGREGATE UTILITY</div>
                  <div className="text-2xl font-extrabold text-[#191C1B] font-mono mt-1 tabular-nums">
                    {totalUtility.toLocaleString()} <span className="text-xs font-normal text-[#707973]">pts</span>
                  </div>
                  <div className="text-xs text-[#707973] mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
                    {group.utilityThresholdNote || 'Threshold > 980 min'}
                  </div>
                </div>

                {/* Source Mining Run */}
                <div>
                  <div className={LABEL}>SOURCE MINING RUN</div>
                  <div className="text-base font-extrabold text-[#191C1B] font-mono mt-1">
                    {group.sourceMiningRun} · {group.miningRunDetails}
                  </div>
                  <div className="text-xs text-[#707973] mt-1 flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-[#1E3A2F]" />
                    High-Utility Itemsets
                  </div>
                </div>

                {/* Suggested Placement */}
                <div>
                  <div className={LABEL}>SUGGESTED PLACEMENT</div>
                  <div className="text-base font-bold text-[#191C1B] mt-1">
                    {group.suggestedPlacement || 'Beverages + Snacks'}
                  </div>
                  <div className="text-xs text-[#707973] mt-1">Adjacent gondola endcap</div>
                </div>
              </div>

              {/* Merchandising Execution Protocol Notice */}
              <div className="mt-4 p-4 rounded-xl bg-[#FEF3C7]/40 border border-[#FDE68A] flex items-start gap-3 text-xs">
                <Lightbulb className="w-4 h-4 text-[#D97706] mt-0.5 shrink-0" />
                <div>
                  <div className="font-bold text-[#191C1B]">Merchandising Execution Protocol</div>
                  <div className="text-[#57534E] mt-0.5 leading-relaxed">
                    Recommended shelf height: Eye-level secondary placement (Level 3-4). Cross-promotional POS tags increase cross-basket frequency by an estimated 14.2% on weekends.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Decision & Governance Card */}
        <div className="space-y-6">
          <div className={`${CARD} p-6 sm:p-7 relative overflow-hidden lg:sticky lg:top-6 space-y-6`}>
            {/* Pine green accent bar */}
            <div className="absolute top-6 left-0 w-1.5 h-7 bg-[#1E3A2F] rounded-r-md" />

            <div className="pl-2 space-y-6">
              {/* Card Header */}
              <div>
                <h3 className="text-lg font-extrabold text-[#191C1B]">Approval Decision</h3>
                <p className="text-xs text-[#707973] mt-1">
                  Human review is required before automated slotting updates.
                </p>
              </div>

              {/* Structured Metadata Ledger */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8]">
                  <span className={LABEL}>Source Data</span>
                  <span className="text-xs font-bold text-[#191C1B]">
                    {group.sourceDataPeriod || 'Sales Q3 2026'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8]">
                  <span className={LABEL}>Review Status</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isApproved ? 'bg-[#10B981]' : 'bg-[#D97706]'
                      }`}
                    />
                    <span
                      className={`text-xs font-bold ${
                        isApproved ? 'text-[#1E3A2F]' : 'text-[#B45309]'
                      }`}
                    >
                      {isApproved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8]">
                  <span className={LABEL}>Layout Eligibility</span>
                  <span
                    className={`text-xs font-bold ${
                      isApproved ? 'text-[#1E3A2F]' : 'text-[#BA1A1A]'
                    }`}
                  >
                    {isApproved ? 'Approved for Layout B' : 'Requires approval'}
                  </span>
                </div>
              </div>

              {/* Decision Timeline Audit Trail */}
              <div className="pt-2">
                <div className="text-xs font-bold text-[#191C1B] mb-3 uppercase tracking-wider">
                  Decision Timeline
                </div>

                <div className="relative pl-6 space-y-4">
                  {/* Vertical spine */}
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-[#E7E2D8]" />

                  {/* Step 1: Proposed from mining run */}
                  <div className="relative">
                    <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-[#1E3A2F] flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#191C1B]">
                        Proposed from mining run{' '}
                        <span className="font-mono">{group.sourceMiningRun}</span>
                      </span>
                      <span className="text-[11px] text-[#707973] mt-0.5">
                        Oct 14, 2026 • 04:18 CET
                      </span>
                    </div>
                  </div>

                  {/* Step 2: Approval status */}
                  <div className="relative">
                    <div
                      className={`absolute -left-6 top-1 w-4 h-4 rounded-full flex items-center justify-center ${
                        isApproved ? 'bg-[#10B981]' : 'bg-[#FEF3C7] border border-[#FDE68A]'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isApproved ? 'bg-white' : 'bg-[#D97706]'
                        }`}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#191C1B]">
                        {isApproved
                          ? 'Approved by Merchandiser (Minh Tran)'
                          : 'Pending Merchandiser approval'}
                      </span>
                      <span
                        className={`text-[11px] font-semibold mt-0.5 ${
                          isApproved ? 'text-[#1E3A2F]' : 'text-[#B45309]'
                        }`}
                      >
                        {isApproved ? 'Action completed' : 'Awaiting action'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#E7E2D8] space-y-2.5">
                <button
                  type="button"
                  onClick={handleApprove}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs ${
                    isApproved
                      ? 'bg-[#10B981] text-white hover:bg-[#059669]'
                      : 'bg-[#1E3A2F] text-white hover:bg-[#162B23]'
                  }`}
                >
                  <span>{isApproved ? 'Approved & Scheduled' : 'Approve Group'}</span>
                  {isApproved ? <CheckCheck className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={handleLeaveUnapproved}
                  className="w-full py-2.5 px-4 rounded-xl border border-[#E7E2D8] bg-white text-[#57534E] hover:bg-[#FAF8F5] text-xs font-semibold transition-all cursor-pointer text-center"
                >
                  Leave Unapproved
                </button>
              </div>

              {/* Safety notice */}
              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] flex items-start gap-2.5 text-[11px] text-[#707973] leading-relaxed">
                <Shield className="w-4 h-4 text-[#707973] shrink-0 mt-0.5" />
                <span>
                  Approvals update store gondola map staging immediately. No physical stock will move without store manager sign-off.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Graph Inspection Modal */}
      {isGraphModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E7E2D8] max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E2D8]">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-[#1E3A2F]" />
                <h3 className="text-base font-extrabold text-[#191C1B]">
                  Co-occurrence Affinity Graph
                </h3>
              </div>
              <button
                onClick={() => setIsGraphModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-[#FAF8F5] text-[#707973] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#707973]">
              Association graph for <strong>{group.groupName}</strong> derived from EFIM algorithm run {group.sourceMiningRun}.
            </p>

            {/* Visual mock node diagram */}
            <div className="p-6 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-[#1E3A2F] text-white flex flex-col items-center justify-center text-xs font-bold shadow-md">
                <span>{group.items[0]?.name.split(' ')[0] || 'Pivot'}</span>
                <span className="text-[9px] opacity-80">Center</span>
              </div>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                {group.items.slice(1).map(it => (
                  <div key={it.id} className="flex flex-col items-center">
                    <div className="h-4 w-0.5 bg-[#E7E2D8]" />
                    <span className="px-2.5 py-1 rounded-full bg-white border border-[#E7E2D8] text-[11px] font-bold text-[#191C1B]">
                      {it.name}
                    </span>
                    <span className="text-[10px] text-[#707973] mt-0.5">
                      conf: {confidenceScore}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsGraphModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#1E3A2F] text-white text-xs font-bold hover:bg-[#162B23] cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footnote Ledger Notice */}
      <div className="text-center text-xs text-[#707973] pt-6 pb-4">
        Preview only • All metrics and records are sample data; no live backend is connected.
      </div>
    </div>
  );
};
