import React, { useState } from 'react';
import { 
  RotateCw, 
  Download, 
  Search, 
  ChevronRight, 
  FileText, 
  BarChart2, 
  ChevronLeft,
  X,
  CheckCircle2
} from 'lucide-react';
import { MiningJob, HighUtilityItemset, ActiveNavScreen } from '../../../../types/mining';

interface MiningResultsViewProps {
  job: MiningJob;
  onNavigate: (screen: ActiveNavScreen, runId?: string) => void;
  onRerun: (job: MiningJob) => void;
}

export const MiningResultsView: React.FC<MiningResultsViewProps> = ({
  job,
  onNavigate,
  onRerun
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLength, setFilterLength] = useState('all');
  const [selectedItemset, setSelectedItemset] = useState<HighUtilityItemset | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const filteredItemsets: HighUtilityItemset[] = [];

  const handleExport = (format: 'CSV' | 'JSON') => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setExportNotice(`Exported 128 high-utility patterns as ${format}`);
      setTimeout(() => setExportNotice(null), 3000);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-2" data-purpose="page-title-banner">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#191c1b]">
            Arrangement Run {job.runId}
          </h1>
          <p className="text-sm text-[#6d7974] mt-1">
            Optimized product arrangements and extracted high-utility itemsets.
          </p>

          {/* Badges bar */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#e7ede9] text-[#1e3a2f] border border-[#1e3a2f]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a2f]"></span>
              Completed
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-white text-[#6d7974] border border-[#E7E2D8]">
              {job.algorithm}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-white text-[#6d7974] border border-[#E7E2D8]">
              {job.dataset}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onRerun(job)}
            className="px-4 py-2 bg-white hover:bg-[#fbf2f0] border border-[#E7E2D8] text-xs font-semibold text-[#191c1b] rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5 text-[#89938f]" />
            <span>Re-run</span>
          </button>

          <button
            onClick={() => handleExport('CSV')}
            className="px-4 py-2 bg-[#1e3a2f] hover:bg-[#294d3f] text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export Planogram Data'}</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 bg-[#e7ede9] border border-[#1e3a2f]/20 rounded-lg text-xs text-[#1e3a2f] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#1e3a2f]" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* 4 Metric KPI Cards with Sleek Small Accent Bars (Small accent bar) & Distinct Colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Minimum Utility (Forest Pine) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1e3a2f]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7974]">Minimum Utility</span>
              </div>
              {/* Sleek Small Accent Bar (Small accent bar) */}
              <span className="w-8 h-1 rounded-full bg-[#1e3a2f] shrink-0" />
            </div>
            <div className="text-3xl font-bold text-[#191c1b] font-mono tabular-nums mt-3">
              {job.minUtil}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#f6ece9]">
            <span className="text-xs text-[#89938f]">Configured threshold</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#e7ede9] text-[#1e3a2f]">
              Active
            </span>
          </div>
        </div>

        {/* Card 2: Runtime (Cognac Amber) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#c26d38]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7974]">Runtime</span>
              </div>
              {/* Sleek Small Accent Bar (Small accent bar) */}
              <span className="w-8 h-1 rounded-full bg-[#c26d38] shrink-0" />
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-bold text-[#191c1b] font-mono tabular-nums">
                {job.duration}
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#f6ece9]">
            <span className="text-[10px] text-[#c26d38] bg-[#fdf4ed] px-2 py-0.5 rounded-md border border-[#c26d38]/20 font-medium">
              Run completed
            </span>
            <span className="text-xs text-[#89938f] font-mono">{job.algorithm}</span>
          </div>
        </div>

        {/* Card 3: Peak Memory (Ocean Azure) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7974]">Peak Memory</span>
              </div>
              {/* Sleek Small Accent Bar (Small accent bar) */}
              <span className="w-8 h-1 rounded-full bg-[#0284c7] shrink-0" />
            </div>
            <div className="text-3xl font-bold text-[#191c1b] font-mono tabular-nums mt-3">
              {job.peakMemoryMB || 128} MB
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#f6ece9]">
            <span className="text-xs text-[#89938f]">Worker node telemetry</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#e0f2fe] text-[#0284c7]">
              Efficient
            </span>
          </div>
        </div>

        {/* Card 4: Itemset Count (Plum Rose) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#8b263e]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7974]">Extracted Patterns</span>
              </div>
              {/* Sleek Small Accent Bar (Small accent bar) */}
              <span className="w-8 h-1 rounded-full bg-[#8b263e] shrink-0" />
            </div>
            <div className="text-3xl font-bold text-[#191c1b] font-mono tabular-nums mt-3">
              {job.itemsetCount || 128}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#f6ece9]">
            <span className="text-xs text-[#89938f]">High-utility arrangements</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#fdf2f4] text-[#8b263e]">
              128 Itemsets
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: High-Utility Itemsets Table (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-[#E7E2D8] rounded-xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#f6ece9]">
            <div>
              <h2 className="text-base font-semibold text-[#191c1b]">
                High-Utility Product Arrangements
              </h2>
              <p className="text-xs text-[#6d7974] mt-0.5">
                Preview of co-purchased itemsets generating highest gross profit.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#89938f] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search itemset or product"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs bg-white border border-[#E7E2D8] rounded-lg pl-8 pr-2.5 py-1.5 text-[#191c1b] focus:border-[#1e3a2f] outline-none w-48 sm:w-56"
                />
              </div>

              <select
                value={filterLength}
                onChange={(e) => setFilterLength(e.target.value)}
                aria-label="Filter itemset length"
                className="text-xs bg-white border border-[#E7E2D8] rounded-lg px-2.5 py-1.5 text-[#191c1b] focus:border-[#1e3a2f] outline-none cursor-pointer"
              >
                <option value="3">3 items</option>
                <option value="2">2 items</option>
                <option value="3">3 items</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E7E2D8] text-[11px] font-semibold text-[#89938f] uppercase tracking-wider bg-[#fbf2f0]">
                  <th className="py-3 px-3">BASKET PRODUCTS</th>
                  <th className="py-3 px-3">BASKET PRODUCTS</th>
                  <th className="py-3 px-3 text-right">UTILITY</th>
                  <th className="py-3 px-3 text-right">DETAIL</th>
                  <th className="py-3 px-3 text-right">DETAIL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2D8]/60">
                {filteredItemsets.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItemset(item)}
                    className="hover:bg-[#fbf2f0] transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3 font-semibold text-[#191c1b]">
                      {item.itemsetId}
                    </td>
                    <td className="py-3 px-3 text-[#191c1b]">
                      {item.products.join(', ')}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 bg-[#f6ece9] h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="bg-[#1e3a2f] h-full rounded-full"
                            style={{ width: `${Math.min(100, Math.max(15, (item.utility / 4500000) * 100))}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-[#191c1b] tabular-nums">
                          {item.utility.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center text-[#89938f]">
                      {item.itemsCount}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-xs text-[#1e3a2f] font-semibold group-hover:underline">
                        <span>Inspect</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#f6ece9] text-xs text-[#89938f]">
            <span>Showing {filteredItemsets.length} of 128 arrangements</span>
            <div className="flex items-center gap-1">
              <button 
                type="button" 
                aria-label="Previous page"
                className="w-7 h-7 rounded-md border border-[#E7E2D8] flex items-center justify-center text-[#89938f] hover:bg-[#fbf2f0]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="w-7 h-7 rounded-md bg-[#1e3a2f] text-white font-semibold flex items-center justify-center">
                1
              </button>
              <button type="button" className="w-7 h-7 rounded-md hover:bg-[#fbf2f0] text-[#6d7974] flex items-center justify-center">
                2
              </button>
              <button type="button" className="w-7 h-7 rounded-md hover:bg-[#fbf2f0] text-[#6d7974] flex items-center justify-center">
                3
              </button>
              <span className="px-1 text-[#E7E2D8]">...</span>
              <button type="button" className="w-7 h-7 rounded-md hover:bg-[#fbf2f0] text-[#6d7974] flex items-center justify-center">
                26
              </button>
              <button 
                type="button" 
                aria-label="Next page"
                className="w-7 h-7 rounded-md border border-[#E7E2D8] flex items-center justify-center text-[#89938f] hover:bg-[#fbf2f0]"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Run Information (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E7E2D8] rounded-xl p-6 shadow-xs space-y-6">
          <h3 className="text-sm font-semibold text-[#191c1b]">
            Run Information
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-[#f6ece9]">
              <span className="text-[#89938f]">Run ID</span>
              <span className="font-semibold text-[#191c1b]">{job.runId}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#f6ece9]">
              <span className="text-[#89938f]">Algorithm</span>
              <span className="font-semibold text-[#191c1b]">{job.algorithm}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#f6ece9]">
              <span className="text-[#89938f]">Dataset</span>
              <span className="font-semibold text-[#191c1b]">{job.dataset}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#f6ece9]">
              <span className="text-[#89938f]">Min Utility</span>
              <span className="font-mono font-semibold text-[#191c1b] tabular-nums">{job.minUtil}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#f6ece9]">
              <span className="text-[#89938f]">Started At</span>
              <span className="font-medium text-[#191c1b]">{job.startedAt}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#f6ece9]">
              <span className="text-[#89938f]">Duration</span>
              <span className="font-mono font-medium text-[#191c1b] tabular-nums">{job.duration}</span>
            </div>
            <div className="flex justify-between py-1 items-center">
              <span className="text-[#89938f]">Run Status</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#e7ede9] text-[#1e3a2f] border border-[#1e3a2f]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a2f]"></span>
                Completed
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#f6ece9] space-y-2">
            <button
              onClick={() => setShowLogModal(true)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#fbf2f0] text-xs font-medium text-[#191c1b] transition-colors text-left cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[#89938f]" />
                <span>View Run Log</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#89938f]" />
            </button>

            <button
              onClick={() => onNavigate('benchmark')}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#fbf2f0] text-xs font-medium text-[#191c1b] transition-colors text-left cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <BarChart2 className="w-3.5 h-3.5 text-[#89938f]" />
                <span>Compare Benchmark</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#89938f]" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom disclaimer */}
      <footer className="pt-2 pb-6 text-xs text-[#89938f]">
        Preview only: job records, runtime, memory and itemsets are demo data; no live backend is connected.
      </footer>

      {/* Itemset Breakdown Modal */}
      {selectedItemset && (
        <div className="fixed inset-0 z-50 bg-[#191c1b]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E7E2D8] shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#f6ece9]">
              <div>
                <h3 className="text-base font-semibold text-[#191c1b]">
                  Planogram Pattern Details: {selectedItemset.itemsetId}
                </h3>
                <p className="text-xs text-[#6d7974]">
                  High-utility itemset breakdown &amp; individual product shelf contributions
                </p>
              </div>
              <button
                onClick={() => setSelectedItemset(null)}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg hover:bg-[#fbf2f0] text-[#89938f] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#fbf2f0] rounded-lg border border-[#E7E2D8] text-xs">
                <div>
                  <span className="text-[#6d7974] block">Total Utility Value:</span>
                  <span className="text-lg font-bold font-mono text-[#1e3a2f] tabular-nums">
                    {selectedItemset.utility.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[#6d7974] block">Transaction Support:</span>
                  <span className="text-lg font-bold font-mono text-[#b45309] tabular-nums">
                    {selectedItemset.supportPercentage}%
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-[#6d7974] uppercase tracking-wider mb-2">
                  PRODUCT CONTRIBUTIONS
                </div>
                <div className="space-y-2 text-xs">
                  {selectedItemset.productUtilities?.map((p, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white border border-[#E7E2D8] flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[#191c1b]">{p.product}</div>
                        <div className="text-[11px] text-[#89938f]">Qty in basket: {p.quantity}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-semibold text-[#191c1b] tabular-nums">
                          +{p.utility} util
                        </div>
                        <div className="text-[10px] text-[#1e3a2f]">
                          {Math.round((p.utility / selectedItemset.utility) * 100)}% of total
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#f6ece9] flex justify-end">
              <button
                onClick={() => setSelectedItemset(null)}
                className="px-4 py-2 bg-[#1e3a2f] hover:bg-[#294d3f] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-[#191c1b]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1e3a2f] text-[#eff5ef] rounded-xl border border-[#294d3f] shadow-2xl max-w-2xl w-full p-6 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#294d3f]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#e7ede9]" />
                <h3 className="text-sm font-semibold text-white">
                  Execution Log — Job {job.runId}
                </h3>
              </div>
              <button
                onClick={() => setShowLogModal(false)}
                aria-label="Close dialog"
                className="p-1 rounded-lg hover:bg-[#294d3f] text-[#e7ede9] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 font-mono text-xs space-y-1.5 max-h-80 overflow-y-auto bg-black/40 p-4 rounded-lg border border-[#294d3f]">
              {job.logs?.map((log, idx) => (
                <div key={idx} className={log.includes('SUCCESS') ? 'text-[#e7ede9]' : log.includes('ERROR') ? 'text-[#ff9e65]' : 'text-gray-300'}>
                  {log}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowLogModal(false)}
                className="px-3.5 py-1.5 bg-[#294d3f] text-white text-xs font-semibold rounded-lg hover:bg-[#1e3a2f] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
