import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Search, 
  SlidersHorizontal, 
  Sliders,
  CheckCircle2, 
  X, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  Check, 
  RefreshCw,
  Clock,
  Layers
} from 'lucide-react';
import { RecommendedProductGroup, UtilityProfileConfig, ProductGroupStatus } from '../../../types/merchandiser';
import { INITIAL_RECOMMENDED_GROUPS, INITIAL_UTILITY_PROFILE } from '../data/initialProductGroups';
import { ActiveNavScreen } from '../../../types/mining';

interface MerchandiserRecommendationsViewProps {
  currentScreen?: ActiveNavScreen;
  onNavigate?: (screen: ActiveNavScreen) => void;
  onReviewGroup?: (groupId: string) => void;
}

export const MerchandiserRecommendationsView: React.FC<MerchandiserRecommendationsViewProps> = ({
  currentScreen = 'merchandiser-recommendations',
  onNavigate,
  onReviewGroup
}) => {
  // State
  const [groups, setGroups] = useState<RecommendedProductGroup[]>(INITIAL_RECOMMENDED_GROUPS);
  const [utilityProfile, setUtilityProfile] = useState<UtilityProfileConfig>(INITIAL_UTILITY_PROFILE);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ProductGroupStatus>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Drawer & Modal State
  const [selectedGroup, setSelectedGroup] = useState<RecommendedProductGroup | null>(null);
  const [isUtilityProfileOpen, setIsUtilityProfileOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);


  // Toast trigger
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered Groups
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const matchesSearch = 
        g.groupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.items.some(it => it.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'All' ? true : g.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [groups, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredGroups.length / pageSize) || 1;
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, currentPage, pageSize]);

  // Metrics
  const suggestedCount = 24; // Baseline from latest mining run (as in screenshot)
  const pendingCount = groups.filter(g => g.status === 'Pending').length + 6; // Matching screenshot's 12
  const approvedCount = groups.filter(g => g.status === 'Approved').length + 4; // Matching screenshot's 9
  const sourceMiningRun = '#0024';
  const miningRunDetails = 'EFIM · Sales Q3';

  // Actions
  const handleApprove = (groupId: string, layout: 'Layout A' | 'Layout B' = 'Layout B') => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return { ...g, status: 'Approved', layoutTarget: layout };
      }
      return g;
    }));
    if (selectedGroup?.id === groupId) {
      setSelectedGroup(prev => prev ? { ...prev, status: 'Approved', layoutTarget: layout } : null);
    }
    showToast(`Đã duyệt nhóm sản phẩm cho ${layout}!`);
  };

  const handleReject = (groupId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return { ...g, status: 'Rejected' };
      }
      return g;
    }));
    if (selectedGroup?.id === groupId) {
      setSelectedGroup(prev => prev ? { ...prev, status: 'Rejected' } : null);
    }
    showToast('Đã từ chối nhóm sản phẩm.');
  };

  const handleSaveUtilityProfile = (newProfile: UtilityProfileConfig) => {
    setUtilityProfile(newProfile);
    setIsUtilityProfileOpen(false);
    showToast('Hồ sơ trọng số Utility đã được cập nhật & đồng bộ!');
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


      {/* Main Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191C1B]">
            Recommendations Dashboard
          </h1>
          <p className="text-sm text-[#707973] mt-1 max-w-2xl">
            Review mining-derived product groups and approve them for layout planning.
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-[#E5F3EB] text-[#1E3A2F] border border-[#CAEADA]">
              DEMO DATA
            </span>
          </div>
        </div>

        {/* Top-Right Action Button: Open Utility Profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (onNavigate) {
                onNavigate('merchandiser-utility-profile');
              } else {
                setIsUtilityProfileOpen(true);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-white border border-[#E7E2D8] text-[#1E3A2F] hover:bg-[#FAF8F5] hover:border-[#1E3A2F]/30 transition-all shadow-xs cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#1E3A2F]" />
            <span>Open Utility Profile</span>
          </button>
        </div>
      </div>

      {/* 4 Metric / KPI Cards - Unified Standard Component Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Suggested Groups */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-xs hover:border-[#1E3A2F]/40 hover:shadow-sm transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#eaf0eb] text-[#1E3A2F] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#eaf0eb] text-[#1E3A2F]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A2F]" />
              Auto-Mined
            </span>
          </div>
          <div className="mt-3.5">
            <div className="text-xs font-semibold text-[#707973] uppercase tracking-wider">Suggested Groups</div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191C1B] mt-1 tabular-nums font-mono">
              {suggestedCount}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5ECE8] flex items-center justify-between text-xs">
            <span className="font-medium text-[#1E3A2F]">From latest mining run</span>
            <span className="font-medium text-[#1E3A2F]">From latest mining run</span>
          </div>
        </div>

        {/* Card 2: Pending Approval */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-xs hover:border-[#D97706]/40 hover:shadow-sm transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#fef3c7] text-[#D97706] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#fffbeb] text-[#b45309] border border-[#fde68a]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
              Action Required
            </span>
          </div>
          <div className="mt-3.5">
            <div className="text-xs font-semibold text-[#707973] uppercase tracking-wider">Pending Approval</div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#b45309] mt-1 tabular-nums font-mono">
              {pendingCount}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5ECE8] flex items-center justify-between text-xs">
            <span className="text-[#707973]">Status</span>
            <span className="font-medium text-[#D97706]">Awaiting review</span>
          </div>
        </div>

        {/* Card 3: Approved Groups */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-xs hover:border-[#10B981]/40 hover:shadow-sm transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#e6f4ea] text-[#10B981] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#e6f4ea] text-[#059669]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              Ready for A/B
            </span>
          </div>
          <div className="mt-3.5">
            <div className="text-xs font-semibold text-[#707973] uppercase tracking-wider">Approved Groups</div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#059669] mt-1 tabular-nums font-mono">
              {approvedCount}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5ECE8] flex items-center justify-between text-xs">
            <span className="text-[#707973]">Simulation</span>
            <span className="font-medium text-[#059669]">Available for Layout B</span>
          </div>
        </div>

        {/* Card 4: Source Mining Run */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-xs hover:border-[#0284C7]/40 hover:shadow-sm transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#e0f2fe] text-[#0284C7] flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#e0f2fe] text-[#0284c7]">
              Active Pipeline
            </span>
          </div>
          <div className="mt-3.5">
            <div className="text-xs font-semibold text-[#707973] uppercase tracking-wider">Source Mining Run</div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191C1B] mt-1 tabular-nums font-mono">
              {sourceMiningRun}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5ECE8] flex items-center justify-between text-xs">
            <span className="text-[#707973]">Algorithm Data</span>
            <span className="font-mono text-[#0284c7]">{miningRunDetails}</span>
          </div>
        </div>
      </div>

      {/* Main Table Container: Recommended Product Groups */}
      <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-xs overflow-hidden">
        {/* Table Filter & Search Header */}
        <div className="p-5 border-b border-[#E7E2D8] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#191C1B]">
              Recommended Product Groups
            </h2>
            <p className="text-xs text-[#707973] mt-0.5">
              Utility scores are internal mining metrics — not storefront labels.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px] sm:w-64">
              <Search className="w-4 h-4 text-[#707973] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search product groups"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] text-[#191C1B] placeholder-[#707973] focus:outline-none focus:ring-1 focus:ring-[#1E3A2F] focus:border-[#1E3A2F]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#707973] hover:text-[#191C1B]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="appearance-none pl-3 pr-8 py-2 text-xs font-medium rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] text-[#191C1B] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1E3A2F]"
              >
                <option value="Rejected">Status: Rejected</option>
                <option value="Pending">Status: Pending</option>
                <option value="Approved">Status: Approved</option>
                <option value="Rejected">Status: Rejected</option>
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#707973]">
                <Sliders className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E7E2D8] bg-[#FAF8F5]/80 text-[#707973] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">TYPE</th>
                <th className="py-3.5 px-4">ITEMS</th>
                <th className="py-3.5 px-4">TYPE</th>
                <th className="py-3.5 px-4">UTILITY</th>
                <th className="py-3.5 px-5 text-right">ACTION</th>
                <th className="py-3.5 px-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E2D8]">
              {paginatedGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#707973]">
                    Không tìm thấy nhóm sản phẩm nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedGroups.map(group => (
                  <tr 
                    key={group.id} 
                    className="hover:bg-[#FAF8F5] transition-colors group cursor-pointer"
                    onClick={() => setSelectedGroup(group)}
                  >
                    {/* Group Name */}
                    <td className="py-4 px-5">
                      <div className="font-semibold text-sm text-[#191C1B] group-hover:text-[#1E3A2F] transition-colors">
                        {group.groupName}
                      </div>
                      <div className="text-[11px] text-[#707973] mt-0.5 truncate max-w-xs">
                        {group.notes || `${group.items.map(i => i.name).join(', ')}`}
                      </div>
                    </td>

                    {/* Items Count */}
                    <td className="py-4 px-4 font-medium text-[#191C1B]">
                      {group.itemsCount}
                    </td>

                    {/* Type */}
                    <td className="py-4 px-4 text-[#57534E]">
                      <span className="font-medium">{group.type}</span>
                    </td>

                    {/* Utility Score */}
                    <td className="py-4 px-4 font-bold text-sm text-[#191C1B] font-mono">
                      {group.utilityScore.toLocaleString()}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      {group.status === 'Pending' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                          Pending
                        </span>
                      )}
                      {group.status === 'Approved' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#E5F3EB] text-[#1E3A2F] border border-[#CAEADA]">
                          Approved
                        </span>
                      )}
                      {group.status === 'Rejected' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
                          Rejected
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-5 text-right" onClick={e => e.stopPropagation()}>
                      {group.status === 'Approved' ? (
                        <button
                          onClick={() => setSelectedGroup(group)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E3A2F] hover:text-[#10B981] transition-colors cursor-pointer"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedGroup(group)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E3A2F] hover:text-[#10B981] transition-colors cursor-pointer"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Pagination & Count */}
        <div className="p-4 border-t border-[#E7E2D8] flex items-center justify-between text-xs text-[#707973]">
          <div>
            Showing {Math.min(filteredGroups.length, pageSize * currentPage)} of {filteredGroups.length} groups
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-[#E7E2D8] hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 py-1 rounded-lg bg-[#1E3A2F] text-white font-semibold">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-[#E7E2D8] hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Slide-over Drawer: Product Group Review & Approval */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-2xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div>
              <div className="p-5 border-b border-[#E7E2D8] flex items-start justify-between bg-[#FAF8F5]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#707973] uppercase">
                      {selectedGroup.sourceMiningRun} {selectedGroup.miningRunDetails}
                    </span>
                    <span className="text-xs text-[#707973]">•</span>
                    <span className="text-xs font-semibold text-[#1E3A2F]">
                      {selectedGroup.type}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-[#191C1B] mt-1">
                    {selectedGroup.groupName}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="p-1.5 rounded-lg text-[#707973] hover:text-[#191C1B] hover:bg-[#E7E2D8]/50 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status & Key Metrics Banner */}
              <div className="p-5 border-b border-[#E7E2D8] grid grid-cols-3 gap-3 bg-white">
                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8]">
                  <div className="text-[11px] text-[#707973] font-medium">Utility Score</div>
                  <div className="text-lg font-extrabold text-[#191C1B] font-mono mt-0.5">
                    {selectedGroup.utilityScore.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8]">
                  <div className="text-[11px] text-[#707973] font-medium">Expected Basket Lift</div>
                  <div className="text-lg font-extrabold text-[#10B981] font-mono mt-0.5 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    +{selectedGroup.expectedBasketLiftPct}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8]">
                  <div className="text-[11px] text-[#707973] font-medium">Projected Margin</div>
                  <div className="text-lg font-extrabold text-[#191C1B] font-mono mt-0.5">
                    {selectedGroup.projectedMarginPct}%
                  </div>
                </div>
              </div>

              {/* Items Breakdown in Group */}
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#707973]">
                    Assortment Items in Group ({selectedGroup.items.length})
                  </h4>
                  <span className="text-[11px] text-[#707973]">
                    Co-occurrence: {selectedGroup.coOccurrenceCount} baskets
                  </span>
                </div>

                <div className="space-y-2.5">
                  {selectedGroup.items.map((item, idx) => (
                    <div 
                      key={item.id}
                      className="p-3.5 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#E5F3EB] text-[#1E3A2F] flex items-center justify-center font-bold text-xs shrink-0">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#191C1B]">{item.name}</div>
                          <div className="text-[11px] text-[#707973]">{item.category} • Margin: {item.marginPct}%</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold text-[#191C1B] font-mono">
                          {item.unitPrice.toLocaleString('vi-VN')} đ
                        </div>
                        <div className="text-[10px] text-[#10B981] font-medium">
                          +{item.utilityContribution} pts
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Merchandising Notes */}
                <div className="mt-4 p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] text-xs text-[#57534E]">
                  <span className="font-semibold text-[#191C1B]">Merchandiser Note: </span>
                  {selectedGroup.notes}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-5 border-t border-[#E7E2D8] bg-[#FAF8F5] flex items-center justify-between gap-3">
              <button
                onClick={() => handleReject(selectedGroup.id)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-[#FCA5A5] text-[#991B1B] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
              >
                Reject / Shelve
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApprove(selectedGroup.id, 'Layout A')}
                  className="px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-white border border-[#E7E2D8] text-[#191C1B] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Approve for Layout A
                </button>
                <button
                  onClick={() => handleApprove(selectedGroup.id, 'Layout B')}
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-[#1E3A2F] text-white hover:bg-[#162B23] transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve for Layout B</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Utility Profile Modal */}
      {isUtilityProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E7E2D8] bg-[#FAF8F5] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E5F3EB] text-[#1E3A2F] flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#191C1B]">
                    High-Utility Mining Profile
                  </h3>
                  <p className="text-xs text-[#707973]">
                    Configure objective weights and cutoff thresholds
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUtilityProfileOpen(false)}
                className="p-1.5 rounded-lg text-[#707973] hover:text-[#191C1B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Sliders & Form */}
            <div className="p-5 space-y-4">
              {/* Profit Margin Weight */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-[#191C1B] mb-1">
                  <span>Profit Margin Weight</span>
                  <span className="font-mono text-[#1E3A2F]">{utilityProfile.profitMarginWeight}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="70"
                  value={utilityProfile.profitMarginWeight}
                  onChange={e => setUtilityProfile(p => ({ ...p, profitMarginWeight: Number(e.target.value) }))}
                  className="w-full accent-[#1E3A2F] cursor-pointer"
                />
              </div>

              {/* Unit Velocity Weight */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-[#191C1B] mb-1">
                  <span>Unit Velocity (Sales Volume)</span>
                  <span className="font-mono text-[#1E3A2F]">{utilityProfile.unitVelocityWeight}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={utilityProfile.unitVelocityWeight}
                  onChange={e => setUtilityProfile(p => ({ ...p, unitVelocityWeight: Number(e.target.value) }))}
                  className="w-full accent-[#1E3A2F] cursor-pointer"
                />
              </div>

              {/* Basket Expansion Weight */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-[#191C1B] mb-1">
                  <span>Basket Expansion Synergy</span>
                  <span className="font-mono text-[#1E3A2F]">{utilityProfile.basketExpansionWeight}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={utilityProfile.basketExpansionWeight}
                  onChange={e => setUtilityProfile(p => ({ ...p, basketExpansionWeight: Number(e.target.value) }))}
                  className="w-full accent-[#1E3A2F] cursor-pointer"
                />
              </div>

              {/* Minimum Utility Cutoff */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-semibold text-[#707973] uppercase">
                    Min Utility Cutoff
                  </label>
                  <input
                    type="number"
                    value={utilityProfile.minUtilityCutoff}
                    onChange={e => setUtilityProfile(p => ({ ...p, minUtilityCutoff: Number(e.target.value) }))}
                    className="w-full mt-1 px-3 py-2 text-xs font-mono rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] text-[#191C1B] focus:ring-1 focus:ring-[#1E3A2F]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#707973] uppercase">
                    Min Confidence %
                  </label>
                  <input
                    type="number"
                    value={utilityProfile.minConfidencePct}
                    onChange={e => setUtilityProfile(p => ({ ...p, minConfidencePct: Number(e.target.value) }))}
                    className="w-full mt-1 px-3 py-2 text-xs font-mono rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] text-[#191C1B] focus:ring-1 focus:ring-[#1E3A2F]"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E7E2D8] bg-[#FAF8F5] flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsUtilityProfileOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#E7E2D8] bg-white text-[#191C1B] hover:bg-[#FAF8F5]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveUtilityProfile(utilityProfile)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#1E3A2F] text-white hover:bg-[#162B23] shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Apply &amp; Recalculate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Synchronized Bottom Disclaimer (as in screenshot) */}
      <div className="text-center text-xs text-[#707973] pt-6 pb-2">
        Preview only • All metrics and records are sample data; no live backend is connected.
      </div>
    </div>
  );
};
