import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Info,
  ArrowLeftRight,
  LayoutGrid,
  Activity,
  Check,
  CheckCircle2,
  Clock,
  Layers,
  Store,
  Eye,
  X
} from 'lucide-react';
import { ActiveNavScreen } from '../../../types/mining';

interface PublishedCampaignStatusViewProps {
  onNavigate?: (screen: ActiveNavScreen) => void;
}

export interface PublishedCampaign {
  id: string;
  name: string;
  layout: string;
  groupsCount: number;
  publishedAt: string;
  status: 'Waiting Activation' | 'Active';
  targetZones: string;
  expectedLift: string;
}

const INITIAL_CAMPAIGNS: PublishedCampaign[] = [
  {
    id: 'camp-01',
    name: 'Summer Drink Bundle',
    layout: 'Layout B',
    groupsCount: 3,
    publishedAt: '10 Oct 2026',
    status: 'Waiting Activation',
    targetZones: 'Beverage Gondolas (Aisle 3 & 4)',
    expectedLift: '+24.5% basket lift'
  },
  {
    id: 'camp-02',
    name: 'Snack Combo Promo',
    layout: 'Layout B',
    groupsCount: 2,
    publishedAt: '09 Oct 2026',
    status: 'Waiting Activation',
    targetZones: 'Snack Endcaps (Aisle 5)',
    expectedLift: '+18.2% basket lift'
  },
  {
    id: 'camp-03',
    name: 'Healthy Living',
    layout: 'Layout B',
    groupsCount: 2,
    publishedAt: '05 Oct 2026',
    status: 'Active',
    targetZones: 'Organic & Wellness Bay (Aisle 1)',
    expectedLift: '+15.4% basket lift'
  },
  {
    id: 'camp-04',
    name: 'Daily Essentials',
    layout: 'Layout B',
    groupsCount: 2,
    publishedAt: '03 Oct 2026',
    status: 'Active',
    targetZones: 'Front Entrance Promo Zone',
    expectedLift: '+19.8% basket lift'
  }
];

type FilterTab = 'all' | 'waiting' | 'active';

export const PublishedCampaignStatusView: React.FC<PublishedCampaignStatusViewProps> = ({
  onNavigate
}) => {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<PublishedCampaign | null>(null);

  const filteredCampaigns = INITIAL_CAMPAIGNS.filter(c => {
    if (filter === 'waiting') return c.status === 'Waiting Activation';
    if (filter === 'active') return c.status === 'Active';
    return true;
  });

  const waitingCount = INITIAL_CAMPAIGNS.filter(c => c.status === 'Waiting Activation').length;
  const activeCount = INITIAL_CAMPAIGNS.filter(c => c.status === 'Active').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191C1B]">
              Published / Waiting Campaign Status
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-[#E7EDE9] text-[#1E3A2F] border border-[#AECEBE]">
              DEMO DATA
            </span>
          </div>
          <p className="text-sm text-[#707973] mt-1.5 max-w-2xl">
            Track published campaign handoff; Store Admin controls activation.
          </p>
        </div>

        {/* Back to Campaigns Button */}
        <button
          onClick={() => onNavigate && onNavigate('merchandiser-recommendations')}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E7E2D8] text-[#1E3A2F] hover:bg-[#FAF8F5] hover:border-[#1E3A2F]/30 transition-all shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4 text-[#1E3A2F]" />
          <span>Back to Campaigns</span>
        </button>
      </div>

      {/* Main Data Table Card */}
      <section className="bg-white rounded-2xl border border-[#E7E2D8] p-6 sm:p-7 shadow-xs">
        {/* Card Header & Subtitle */}
        <div className="mb-5">
          <h2 className="text-lg font-bold text-[#191C1B]">
            Published Campaigns &amp; Activation Status
          </h2>
          <p className="text-xs text-[#707973] mt-0.5 font-medium">
            Publishing is not the same as activating a campaign.
          </p>
        </div>

        {/* Filter Tabs Row */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-[#1E3A2F] text-white shadow-xs'
                : 'bg-[#F5ECE8] text-[#707973] hover:bg-[#E9E1DF]'
            }`}
          >
            <span>All Records</span>
            <span className="mx-1">•</span>
            <span>{INITIAL_CAMPAIGNS.length}</span>
          </button>

          <button
            onClick={() => setFilter('waiting')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filter === 'waiting'
                ? 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] shadow-xs'
                : 'bg-[#FEF3C7]/60 text-[#B45309] hover:bg-[#FEF3C7]'
            }`}
          >
            <span>Waiting Activation</span>
            <span className="mx-1">•</span>
            <span>{waitingCount}</span>
          </button>

          <button
            onClick={() => setFilter('active')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filter === 'active'
                ? 'bg-[#DCFCE7] text-[#2E7D32] border border-[#BBF7D0] shadow-xs'
                : 'bg-[#DCFCE7]/60 text-[#2E7D32] hover:bg-[#DCFCE7]'
            }`}
          >
            <span>Active in Store</span>
            <span className="mx-1">•</span>
            <span>{activeCount}</span>
          </button>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto -mx-6 sm:-mx-7 px-6 sm:px-7">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-[#E7E2D8] text-[11px] font-bold uppercase tracking-wider text-[#707973]">
                <th className="pb-3 px-2 text-right" scope="col">Action</th>
                <th className="pb-3 px-4" scope="col">Layout</th>
                <th className="pb-3 px-4" scope="col">Groups</th>
                <th className="pb-3 px-4" scope="col">Published At</th>
                <th className="pb-3 px-4" scope="col">Status</th>
                <th className="pb-3 px-2 text-right" scope="col">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E2D8]/70 text-sm">
              {filteredCampaigns.map(camp => {
                const isWaiting = camp.status === 'Waiting Activation';
                return (
                  <tr
                    key={camp.id}
                    className="hover:bg-[#FAF8F5] transition-colors group"
                  >
                    {/* Campaign Name */}
                    <td className="py-4 px-2 font-semibold text-[#191C1B]">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isWaiting ? 'bg-[#B45309]' : 'bg-[#2E7D32]'
                          }`}
                        />
                        <span className="group-hover:text-[#1E3A2F] transition-colors">
                          {camp.name}
                        </span>
                      </div>
                    </td>

                    {/* Layout */}
                    <td className="py-4 px-4 text-[#707973] text-xs font-medium">
                      {camp.layout}
                    </td>

                    {/* Groups linked */}
                    <td className="py-4 px-4 text-[#707973] text-xs font-mono">
                      {camp.groupsCount}
                    </td>

                    {/* Published Date */}
                    <td className="py-4 px-4 text-[#707973] text-xs font-medium">
                      {camp.publishedAt}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4">
                      {isWaiting ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#B45309]" />
                          Waiting Activation
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#DCFCE7] text-[#2E7D32] border border-[#BBF7D0]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
                          Active
                        </span>
                      )}
                    </td>

                    {/* View Action Link */}
                    <td className="py-4 px-2 text-right">
                      <button
                        onClick={() => setSelectedCampaign(camp)}
                        className="text-xs font-semibold text-[#1E3A2F] hover:text-[#2E7D32] inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>Xem</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Info Callout Banner */}
      <section className="bg-[#E7EDE9]/70 border border-[#AECEBE] rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
        <div className="mt-0.5 text-[#1E3A2F] shrink-0">
          <Info className="w-5 h-5 text-[#1E3A2F]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#191C1B]">
            Next step: Store Admin reviews and activates eligible published campaigns in O05.
          </h3>
          <p className="text-xs text-[#707973] mt-0.5 font-medium">
            Merchandiser can inspect status but cannot activate production campaigns.
          </p>
        </div>
      </section>

      {/* KPI Metrics Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric Card 1: Handoff Queue Latency */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-xs flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#707973] block mb-1">
              Handoff Queue Latency
            </span>
            <div className="text-2xl font-bold text-[#191C1B] tracking-tight">4.2 min</div>
            <div className="text-xs text-[#2E7D32] font-semibold flex items-center gap-1 mt-1.5">
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
              <span>Store Admin auto-synced</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E7EDE9] text-[#1E3A2F] flex items-center justify-center shrink-0">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
        </div>

        {/* Metric Card 2: Store Target Profiles */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-xs flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#707973] block mb-1">
              Store Target Profiles
            </span>
            <div className="text-2xl font-bold text-[#191C1B] tracking-tight">Layout B</div>
            <div className="text-xs text-[#707973] font-medium mt-1.5">
              Applies to 14 active zones
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E7EDE9] text-[#1E3A2F] flex items-center justify-center shrink-0">
            <LayoutGrid className="w-5 h-5" />
          </div>
        </div>

        {/* Metric Card 3: Campaign Activation Rate */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-xs flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#707973] block mb-1">
              Campaign Activation Rate
            </span>
            <div className="text-2xl font-bold text-[#191C1B] tracking-tight">50.0%</div>
            <div className="text-xs text-[#707973] font-medium mt-1.5">
              2 of 4 live in retail stores
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E7EDE9] text-[#1E3A2F] flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* Campaign Details Inspection Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E7E2D8] max-w-lg w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E2D8]">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-[#1E3A2F]" />
                <h3 className="text-base font-bold text-[#191C1B]">
                  Campaign Details: {selectedCampaign.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="w-7 h-7 rounded-lg hover:bg-[#FAF8F5] text-[#707973] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8]">
                <span className="font-bold text-[#707973] uppercase tracking-wider">Status</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold ${
                    selectedCampaign.status === 'Waiting Activation'
                      ? 'bg-[#FEF3C7] text-[#B45309]'
                      : 'bg-[#DCFCE7] text-[#2E7D32]'
                  }`}
                >
                  {selectedCampaign.status}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8]">
                <span className="font-bold text-[#707973] uppercase tracking-wider">Planogram Layout</span>
                <span className="font-bold text-[#191C1B]">{selectedCampaign.layout}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8]">
                <span className="font-bold text-[#707973] uppercase tracking-wider">Product Groups Linked</span>
                <span className="font-bold text-[#191C1B] font-mono">{selectedCampaign.groupsCount} itemsets</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8]">
                <span className="font-bold text-[#707973] uppercase tracking-wider">Target Store Zones</span>
                <span className="font-bold text-[#191C1B]">{selectedCampaign.targetZones}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8]">
                <span className="font-bold text-[#707973] uppercase tracking-wider">Expected Impact</span>
                <span className="font-bold text-[#1E3A2F]">{selectedCampaign.expectedLift}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#E7EDE9]/60 border border-[#AECEBE] text-xs text-[#1E3A2F] flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                To activate this campaign in physical retail stores, the Store Admin must review and sign off in <strong>O05 Campaign Activation</strong>.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedCampaign(null)}
                className="px-4 py-2 rounded-xl bg-[#1E3A2F] text-white text-xs font-bold hover:bg-[#162B23] cursor-pointer"
              >
                Close
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
