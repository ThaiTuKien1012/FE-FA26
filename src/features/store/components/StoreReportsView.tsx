import React, { useState } from 'react';
import { 
  Download, 
  Calendar, 
  ChevronDown, 
  ArrowRight, 
  FileText, 
  Filter,
  CheckCircle2,
  TrendingUp,
  BarChart2,
  Sparkles
} from 'lucide-react';
import { ActiveNavScreen } from '../../../types/mining';

interface StoreReportsViewProps {
  onNavigate?: (screen: ActiveNavScreen) => void;
}

export const StoreReportsView: React.FC<StoreReportsViewProps> = ({ onNavigate }) => {
  const [dateRange, setDateRange] = useState('01 Sep 2026 – 30 Sep 2026');
  const [selectedCampaign, setSelectedCampaign] = useState('All campaigns');
  const [isExporting, setIsExporting] = useState(false);

  const handleApplyFilter = () => {
    // Filter applied animation
  };

  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setExportNotice('Retail Performance Report has been exported successfully in CSV / PDF format.');
      setTimeout(() => setExportNotice(null), 4000);
    }, 600);
  };

  const bundleData = [
    { bundle: 'Summer Drink Set', campaign: 'Summer Drinks', revenue: 65000000, contribution: '35.0%', source: 'Historical' },
    { bundle: 'Snack Combo', campaign: 'Snack Booster', revenue: 48000000, contribution: '25.9%', source: 'Historical' },
    { bundle: 'Breakfast Combo', campaign: 'Daily Essentials', revenue: 39000000, contribution: '21.0%', source: 'Historical' },
    { bundle: 'Daily Essentials Set', campaign: 'Other', revenue: 33600000, contribution: '18.1%', source: 'Historical' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#191c1b]">
              Retail Performance Reports
            </h1>
          </div>
          <p className="text-sm text-[#6d7974]">
            Review Total Utility and bundle performance from available project data.
          </p>

          <div className="mt-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[#eaf0eb] text-[#1e3a2f] uppercase">
              HISTORICAL / DEMO
            </span>
          </div>
        </div>

        <div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1e3a2f] hover:bg-[#294d3f] disabled:opacity-60 text-white text-sm font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : 'Export Report ↓'}</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] px-4 py-3 rounded-xl flex items-center justify-between text-sm shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#059669]" />
            <span className="font-semibold">{exportNotice}</span>
          </div>
          <button 
            onClick={() => setExportNotice(null)}
            className="text-xs font-bold text-[#047857] hover:underline ml-4"
          >
            Close
          </button>
        </div>
      )}

      {/* Filter Bar (Date Range, Campaign, Apply, View A/B Report) */}
      <div className="bg-white border border-[#E7E2D8] rounded-xl p-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          {/* Date Range */}
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-[#89938f] uppercase tracking-wider mb-1.5">
              DATE RANGE
            </label>
            <div className="relative">
              <input
                type="text"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#E7E2D8] rounded-lg text-sm text-[#191c1b] font-medium focus:border-[#1e3a2f] focus:outline-none"
              />
            </div>
          </div>

          {/* Campaign Selector */}
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-[#89938f] uppercase tracking-wider mb-1.5">
              CAMPAIGN
            </label>
            <div className="relative">
              <select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-8 py-2 bg-[#FAF8F5] border border-[#E7E2D8] rounded-lg text-sm text-[#191c1b] font-medium focus:border-[#1e3a2f] focus:outline-none cursor-pointer"
              >
                <option value="All campaigns">All campaigns</option>
                <option value="Summer Drinks">Summer Drinks</option>
                <option value="Snack Booster">Snack Booster</option>
                <option value="Daily Essentials">Daily Essentials</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#89938f] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Buttons: Apply & View A/B Report */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleApplyFilter}
              className="px-5 py-2 rounded-lg bg-[#1e3a2f] hover:bg-[#294d3f] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Apply
            </button>
            <button
              onClick={() => {
                if (onNavigate) onNavigate('store-ab-report');
              }}
              className="px-4 py-2 rounded-lg border border-[#E7E2D8] bg-[#FAF8F5] hover:bg-[#f6ece9] text-xs font-semibold text-[#1e3a2f] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>View A/B Report (O07)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards with Refined Small Accent Bars (Small accent bar) & Dots */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Historical Total Utility (Deep Pine) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs relative overflow-hidden">
          {/* Small Accent Bar (Small accent bar) */}
          <div className="w-8 h-1 rounded-full bg-[#1e3a2f] mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1e3a2f]">
              <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
              <span>Historical Total Utility</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
              Score
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191c1b] mt-2 tabular-nums">
            248,500
          </div>
          <div className="text-xs text-[#1e3a2f] font-medium mt-1">
            Total utility units
          </div>
        </div>

        {/* Card 2: Bundle Revenue (Warm Cognac Amber) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs relative overflow-hidden">
          {/* Small Accent Bar (Small accent bar) */}
          <div className="w-8 h-1 rounded-full bg-[#c26d38] mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#c26d38]">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
              <span>Bundle Revenue</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#fffbeb] text-[#92400e] border border-[#fde68a]">
              VND
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191c1b] mt-2 tabular-nums">
            185,600,000
          </div>
          <div className="text-xs text-[#b45309] font-medium mt-1">
            Historical transaction sample
          </div>
        </div>

        {/* Card 3: Bundles Tracked (Ocean Azure) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs relative overflow-hidden">
          {/* Small Accent Bar (Small accent bar) */}
          <div className="w-8 h-1 rounded-full bg-[#0284c7] mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0284c7]">
              <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
              <span>Bundles Tracked</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f0f9ff] text-[#0369a1] border border-[#bae6fd]">
              Active
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191c1b] mt-2 tabular-nums">
            4
          </div>
          <div className="text-xs text-[#0284c7] font-medium mt-1">
            High-utility arrangements
          </div>
        </div>

        {/* Card 4: Source (Royal Amethyst) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs relative overflow-hidden">
          {/* Small Accent Bar (Small accent bar) */}
          <div className="w-8 h-1 rounded-full bg-[#7c3aed] mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#7c3aed]">
              <span className="w-2 h-2 rounded-full bg-[#9333ea]" />
              <span>Data Source</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#faf5ff] text-[#6b21a8] border border-[#e9d5ff]">
              POSIX
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191c1b] mt-2">
            Historical
          </div>
          <div className="text-xs text-[#7c3aed] font-medium mt-1">
            Sample transaction dataset
          </div>
        </div>
      </div>

      {/* Middle Section: 2 Charts with Distinct Colors per Bundle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Chart: Bundle Revenue Contributions */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-6 shadow-2xs space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[#191c1b]">
              Bundle Revenue Contributions
            </h2>
            <p className="text-xs text-[#6d7974] mt-0.5">
              Historical revenue (VND) by bundle with distinct color differentiation
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {/* Summer Drink (65M) - Forest Pine Green */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a2f]" />
                  <span className="text-[#191c1b] font-semibold">Summer Drink Set</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-[#ecfdf5] text-[#065f46]">35.0%</span>
                </div>
                <span className="text-[#1e3a2f] font-mono font-bold">65,000,000 ₫</span>
              </div>
              {/* Sleek Small Bar (Small accent bar h-2) */}
              <div className="w-full bg-[#f6ece9] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#1e3a2f] h-full rounded-full transition-all duration-500" 
                  style={{ width: '65%' }}
                />
              </div>
            </div>

            {/* Snack Combo (48M) - Warm Cognac Amber */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#c26d38]" />
                  <span className="text-[#191c1b] font-semibold">Snack Combo</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-[#fffbeb] text-[#92400e]">25.9%</span>
                </div>
                <span className="text-[#c26d38] font-mono font-bold">48,000,000 ₫</span>
              </div>
              {/* Sleek Small Bar (Small accent bar h-2) */}
              <div className="w-full bg-[#f6ece9] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#c26d38] h-full rounded-full transition-all duration-500" 
                  style={{ width: '48%' }}
                />
              </div>
            </div>

            {/* Breakfast (39M) - Ocean Azure Blue */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
                  <span className="text-[#191c1b] font-semibold">Breakfast Combo</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-[#f0f9ff] text-[#0369a1]">21.0%</span>
                </div>
                <span className="text-[#0284c7] font-mono font-bold">39,000,000 ₫</span>
              </div>
              {/* Sleek Small Bar (Small accent bar h-2) */}
              <div className="w-full bg-[#f6ece9] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#0284c7] h-full rounded-full transition-all duration-500" 
                  style={{ width: '39%' }}
                />
              </div>
            </div>

            {/* Daily Essentials (33.6M) - Royal Amethyst Purple */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7c3aed]" />
                  <span className="text-[#191c1b] font-semibold">Daily Essentials Set</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-[#faf5ff] text-[#6b21a8]">18.1%</span>
                </div>
                <span className="text-[#7c3aed] font-mono font-bold">33,600,000 ₫</span>
              </div>
              {/* Sleek Small Bar (Small accent bar h-2) */}
              <div className="w-full bg-[#f6ece9] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#7c3aed] h-full rounded-full transition-all duration-500" 
                  style={{ width: '33.6%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Chart: Revenue by Campaign with Matching Accent Tones */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-6 shadow-2xs space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[#191c1b]">
              Revenue by Campaign
            </h2>
            <p className="text-xs text-[#6d7974] mt-0.5">
              Historical period · clear campaign palette differentiation
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {/* Summer Drinks (65M) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a2f]" />
                  <span className="text-[#191c1b] font-semibold">Summer Drinks</span>
                </div>
                <span className="text-[#1e3a2f] font-mono font-bold">65M</span>
              </div>
              {/* Sleek Small Bar (Small accent bar h-2) */}
              <div className="w-full bg-[#f6ece9] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#1e3a2f] h-full rounded-full transition-all duration-500" 
                  style={{ width: '65%' }}
                />
              </div>
            </div>

            {/* Snack Booster (48M) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#c26d38]" />
                  <span className="text-[#191c1b] font-semibold">Snack Booster</span>
                </div>
                <span className="text-[#c26d38] font-mono font-bold">48M</span>
              </div>
              {/* Sleek Small Bar (Small accent bar h-2) */}
              <div className="w-full bg-[#f6ece9] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#c26d38] h-full rounded-full transition-all duration-500" 
                  style={{ width: '48%' }}
                />
              </div>
            </div>

            {/* Daily Essentials (39M) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
                  <span className="text-[#191c1b] font-semibold">Daily Essentials</span>
                </div>
                <span className="text-[#0284c7] font-mono font-bold">39M</span>
              </div>
              {/* Sleek Small Bar (Small accent bar h-2) */}
              <div className="w-full bg-[#f6ece9] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#0284c7] h-full rounded-full transition-all duration-500" 
                  style={{ width: '39%' }}
                />
              </div>
            </div>

            {/* Other (33.6M) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7c3aed]" />
                  <span className="text-[#191c1b] font-semibold">Other Store Campaigns</span>
                </div>
                <span className="text-[#7c3aed] font-mono font-bold">33.6M</span>
              </div>
              {/* Sleek Small Bar (Small accent bar h-2) */}
              <div className="w-full bg-[#f6ece9] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#7c3aed] h-full rounded-full transition-all duration-500" 
                  style={{ width: '33.6%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Table: Bundle Performance Details with Color Badges and Small Contribution Bars */}
      <div className="bg-white border border-[#E7E2D8] rounded-xl shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E7E2D8] bg-[#FAF8F5]">
          <h2 className="text-sm font-semibold text-[#191c1b]">
            Bundle Performance Details
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] text-[#89938f] text-[10px] font-bold uppercase tracking-wider border-b border-[#E7E2D8]">
              <tr>
                <th className="py-3 px-4">BUNDLE</th>
                <th className="py-3 px-4">CAMPAIGN</th>
                <th className="py-3 px-4">REVENUE (VND)</th>
                <th className="py-3 px-4">CONTRIBUTION</th>
                <th className="py-3 px-4">SOURCE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E2D8]/60">
              {bundleData.map((row, idx) => {
                const colorConfig = [
                  { dot: 'bg-[#1e3a2f]', bar: 'bg-[#1e3a2f]', text: 'text-[#1e3a2f]', bg: 'bg-[#ecfdf5]', border: 'border-[#a7f3d0]', pct: '35%' },
                  { dot: 'bg-[#c26d38]', bar: 'bg-[#c26d38]', text: 'text-[#c26d38]', bg: 'bg-[#fffbeb]', border: 'border-[#fde68a]', pct: '26%' },
                  { dot: 'bg-[#0284c7]', bar: 'bg-[#0284c7]', text: 'text-[#0284c7]', bg: 'bg-[#f0f9ff]', border: 'border-[#bae6fd]', pct: '21%' },
                  { dot: 'bg-[#7c3aed]', bar: 'bg-[#7c3aed]', text: 'text-[#7c3aed]', bg: 'bg-[#faf5ff]', border: 'border-[#e9d5ff]', pct: '18%' },
                ][idx] || { dot: 'bg-[#6d7974]', bar: 'bg-[#6d7974]', text: 'text-[#6d7974]', bg: 'bg-[#f8fafc]', border: 'border-[#e2e8f0]', pct: '10%' };

                return (
                  <tr key={idx} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#191c1b]">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${colorConfig.dot}`} />
                        <span>{row.bundle}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${colorConfig.bg} ${colorConfig.text} border ${colorConfig.border}`}>
                        <span className={`w-1 h-1 rounded-full ${colorConfig.dot}`} />
                        <span>{row.campaign}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#191c1b] tabular-nums font-mono">
                      {row.revenue.toLocaleString()} ₫
                    </td>
                    {/* Contribution with Sleek Small Bar (Small accent bar) */}
                    <td className="py-3.5 px-4 font-bold tabular-nums">
                      <div className="flex items-center gap-2">
                        <span className={`w-10 ${colorConfig.text}`}>
                          {row.contribution}
                        </span>
                        <div className="w-16 h-1.5 bg-[#f6ece9] rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${colorConfig.bar}`}
                            style={{ width: colorConfig.pct }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#6d7974]">
                      {row.source}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Notice matching image */}
      <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] text-xs text-[#6d7974] text-center">
        DEMO UI · Historical and simulated values must not be labeled as live production uplift.
      </div>
    </div>
  );
};
