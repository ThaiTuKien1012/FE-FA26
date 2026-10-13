import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Check, 
  Sparkles, 
  Droplets, 
  Zap, 
  Package, 
  Coffee, 
  CheckCircle2, 
  TrendingUp, 
  Sliders, 
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';
import { RecommendedProductGroup, ProductGroupStatus } from '../../../types/merchandiser';
import { INITIAL_RECOMMENDED_GROUPS } from '../data/initialProductGroups';
import { ActiveNavScreen } from '../../../types/mining';

interface ReviewApproveGroupViewProps {
  selectedGroupId?: string;
  onNavigate?: (screen: ActiveNavScreen) => void;
  onStatusChange?: (groupId: string, status: ProductGroupStatus) => void;
}

export const ReviewApproveGroupView: React.FC<ReviewApproveGroupViewProps> = ({
  selectedGroupId = 'grp-01',
  onNavigate,
  onStatusChange
}) => {
  // Find group by selectedGroupId or fallback to Summer Drink Set
  const initialGroup = INITIAL_RECOMMENDED_GROUPS.find(g => g.id === selectedGroupId) || INITIAL_RECOMMENDED_GROUPS[0];
  const [group, setGroup] = useState<RecommendedProductGroup>(initialGroup);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
        <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
          <Droplets className="w-5 h-5" />
        </div>
      );
    }
    if (iconType === 'energy' || name?.toLowerCase().includes('energy')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5" />
        </div>
      );
    }
    if (iconType === 'snack' || name?.toLowerCase().includes('chips')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center shrink-0">
          <Package className="w-5 h-5" />
        </div>
      );
    }
    // Juice / default
    return (
      <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] text-[#6366F1] flex items-center justify-center shrink-0">
        <Coffee className="w-5 h-5" />
      </div>
    );
  };

  const isApproved = group.status === 'Approved';

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
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191C1B]">
            Review &amp; Approve Product Group
          </h1>
          <p className="text-sm text-[#707973] mt-1">
            Inspect mining evidence before explicitly approving a recommendation.
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-[#E5F3EB] text-[#1E3A2F] border border-[#CAEADA]">
              DEMO DATA
            </span>
          </div>
        </div>

        {/* Top-Right Action Button: Back to Recommendations */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate && onNavigate('merchandiser-recommendations')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-white border border-[#E7E2D8] text-[#1E3A2F] hover:bg-[#FAF8F5] hover:border-[#1E3A2F]/30 transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#1E3A2F]" />
            <span>Back to Recommendations</span>
          </button>
        </div>
      </div>

      {/* Two-Column Grid matching user's image */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Group Details, Products in Group & Mining Evidence */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Card */}
          <div className="bg-white rounded-2xl border border-[#E7E2D8] p-6 sm:p-7 shadow-xs space-y-6">
            {/* Header Block: Group Name & Status Badge */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E7E2D8]">
              <div>
                <h2 className="text-2xl font-extrabold text-[#191C1B] tracking-tight">
                  {group.groupName}
                </h2>
                <p className="text-xs text-[#707973] mt-1 font-medium">
                  {group.groupCode || 'Group REC-014'} <span className="mx-1">•</span> {group.notes || 'Proposed cross-sell recommendation'}
                </p>
              </div>

              <div>
                {isApproved ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#E5F3EB] text-[#1E3A2F] border border-[#CAEADA]">
                    Approved for Layout
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
                    Pending review
                  </span>
                )}
              </div>
            </div>

            {/* Products in this group Section */}
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-sm font-bold text-[#191C1B]">
                  Products in this group
                </h3>
                <span className="text-[11px] font-bold text-[#707973] tracking-wider uppercase">
                  {group.items.length} ITEMS LINKED
                </span>
              </div>

              {/* Item Cards Stack */}
              <div className="space-y-3">
                {group.items.map(item => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5]/50 hover:bg-[#FAF8F5] transition-all flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      {renderItemIcon(item.iconType, item.name)}
                      <div>
                        <div className="text-sm font-bold text-[#191C1B]">
                          {item.name}
                        </div>
                        <div className="text-xs text-[#707973] mt-0.5 font-mono">
                          {item.sku || 'SKU: DRK-101'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold tracking-wider text-[#57534E] uppercase">
                        {item.category}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-[#1E3A2F]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mining Evidence Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-sm font-bold text-[#191C1B]">
                  Mining Evidence
                </h3>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E3A2F]">
                  <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Algorithm Verified</span>
                </div>
              </div>

              {/* 3 Metrics Box */}
              <div className="p-5 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5]/70 grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Aggregate Utility */}
                <div>
                  <div className="text-[11px] font-bold tracking-wider text-[#707973] uppercase">
                    AGGREGATE UTILITY
                  </div>
                  <div className="text-2xl font-extrabold text-[#191C1B] font-mono mt-1">
                    {group.utilityScore.toLocaleString()} <span className="text-xs font-normal text-[#707973]">pts</span>
                  </div>
                  <div className="text-xs text-[#707973] mt-0.5">
                    {group.utilityThresholdNote || 'Utility threshold > 980'}
                  </div>
                </div>

                {/* Source Mining Run */}
                <div>
                  <div className="text-[11px] font-bold tracking-wider text-[#707973] uppercase">
                    SOURCE MINING RUN
                  </div>
                  <div className="text-base font-extrabold text-[#191C1B] font-mono mt-1">
                    {group.sourceMiningRun} · {group.miningRunDetails}
                  </div>
                  <div className="text-xs text-[#707973] mt-0.5">
                    High-Utility Itemsets
                  </div>
                </div>

                {/* Suggested Placement */}
                <div>
                  <div className="text-[11px] font-bold tracking-wider text-[#707973] uppercase">
                    SUGGESTED PLACEMENT
                  </div>
                  <div className="text-base font-bold text-[#191C1B] mt-1">
                    {group.suggestedPlacement || 'Beverages + Snacks'}
                  </div>
                  <div className="text-xs text-[#707973] mt-0.5">
                    Adjacent gondola endcap
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 span): Approval Decision Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E7E2D8] p-6 shadow-xs relative overflow-hidden flex flex-col justify-between">
            {/* Vertical Accent Line on Left (Pine Green) */}
            <div className="absolute top-6 left-0 w-1.5 h-6 bg-[#1E3A2F] rounded-r-md" />

            <div className="pl-2 space-y-6">
              {/* Card Header */}
              <div>
                <h3 className="text-lg font-extrabold text-[#191C1B]">
                  Approval Decision
                </h3>
                <p className="text-xs text-[#707973] mt-0.5">
                  Human review is required
                </p>
              </div>

              {/* Source Data Section */}
              <div className="pt-1">
                <div className="text-[11px] font-bold tracking-wider text-[#707973] uppercase">
                  SOURCE DATA
                </div>
                <div className="text-sm font-bold text-[#191C1B] mt-1">
                  {group.sourceDataPeriod || 'Sales Q3 2026'}
                </div>
              </div>

              {/* Review Status Section */}
              <div>
                <div className="text-[11px] font-bold tracking-wider text-[#707973] uppercase">
                  REVIEW STATUS
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isApproved ? 'bg-[#10B981]' : 'bg-[#0284C7]'}`} />
                  <span className="text-sm font-bold text-[#191C1B]">
                    {isApproved ? 'Approved' : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Layout Eligibility Section */}
              <div>
                <div className="text-[11px] font-bold tracking-wider text-[#707973] uppercase">
                  LAYOUT ELIGIBILITY
                </div>
                <div className="text-sm font-bold text-[#191C1B] mt-1">
                  {isApproved ? 'Approved for Layout B' : 'Requires approval'}
                </div>
              </div>

              {/* Decision Timeline Section */}
              <div className="pt-2">
                <div className="text-xs font-bold text-[#191C1B] mb-2.5">
                  Decision timeline
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-[#57534E]">
                    <span className="w-2 h-2 rounded-full bg-[#1E3A2F] shrink-0" />
                    <span>Proposed from mining run {group.sourceMiningRun}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isApproved ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
                        <span className="font-semibold text-[#1E3A2F]">Approved by Merchandiser (Minh Tran)</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full border border-[#707973] bg-white shrink-0" />
                        <span className="text-[#707973]">Pending Merchandiser approval</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#E7E2D8] flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleLeaveUnapproved}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-[#E7E2D8] bg-white text-[#57534E] hover:bg-[#FAF8F5] text-xs font-semibold transition-all cursor-pointer text-center"
                >
                  Leave Unapproved
                </button>

                <button
                  type="button"
                  onClick={handleApprove}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                    isApproved
                      ? 'bg-[#10B981] text-white hover:bg-[#059669]'
                      : 'bg-[#1E3A2F] text-white hover:bg-[#162B23]'
                  }`}
                >
                  <span>{isApproved ? 'Approved' : 'Approve Group'}</span>
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Synchronized Bottom Disclaimer */}
      <div className="text-center text-xs text-[#707973] pt-6 pb-2">
        Preview only • All metrics and records are sample data; no live backend is connected.
      </div>
    </div>
  );
};
