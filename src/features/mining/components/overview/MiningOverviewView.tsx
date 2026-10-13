import React, { useState } from 'react';
import { 
  ArrowRight, 
  Search, 
  AlertCircle, 
  BarChart2, 
  Users, 
  Zap,
  Play
} from 'lucide-react';
import { MiningJob, ActiveNavScreen } from '../../../../types/mining';

interface MiningOverviewViewProps {
  jobs: MiningJob[];
  onNavigate: (screen: ActiveNavScreen, runId?: string) => void;
  onQuickRun: () => void;
}

export const MiningOverviewView: React.FC<MiningOverviewViewProps> = ({
  jobs,
  onNavigate,
  onQuickRun
}) => {
  const [algorithmFilter, setAlgorithmFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredJobs = jobs.filter((job) => {
    if (algorithmFilter !== 'all' && job.algorithm !== algorithmFilter) return false;
    if (statusFilter !== 'all' && job.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (searchQuery.trim() && !job.runId.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2" data-purpose="page-title-banner">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#191c1b]">
            Mining Service Overview
          </h1>
          <p className="text-sm text-[#6d7974] mt-1">
            Monitor mining readiness, itemset arrangement execution and integration health.
          </p>
          <div className="mt-2.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#f6ece9] text-[#6d7974]">
              DEMO DATA
            </span>
          </div>
        </div>
        <button
          onClick={() => onNavigate('setup')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1e3a2f] hover:bg-[#294d3f] text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
        >
          <span>Configure Mining</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Top 4 KPI Summary Cards with Sleek Small Accent Bars (Small accent bar) & Distinct Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Latest Mining Job (Forest Pine) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1e3a2f]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7974]">Latest Mining Job</span>
              </div>
              {/* Sleek Small Accent Bar (Small accent bar) */}
              <span className="w-8 h-1 rounded-full bg-[#1e3a2f] shrink-0" />
            </div>
            <div className="text-2xl font-bold text-[#191c1b] mt-3">Completed</div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#f6ece9]">
            <span className="text-xs text-[#89938f] font-mono">Run #0024 · EFIM</span>
            <button
              onClick={() => onNavigate('setup')}
              className="text-xs text-[#1e3a2f] hover:underline font-semibold cursor-pointer"
            >
              Configure
            </button>
          </div>
        </div>

        {/* Card 2: Selected Algorithm (Cognac Amber) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#c26d38]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7974]">Algorithm Engine</span>
              </div>
              {/* Sleek Small Accent Bar (Small accent bar) */}
              <span className="w-8 h-1 rounded-full bg-[#c26d38] shrink-0" />
            </div>
            <div className="text-2xl font-bold text-[#191c1b] mt-3">EFIM</div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#f6ece9]">
            <span className="text-xs text-[#89938f]">HUI-Miner available</span>
            <button
              onClick={onQuickRun}
              className="text-xs text-[#c26d38] hover:underline font-semibold cursor-pointer flex items-center gap-1"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Run now</span>
            </button>
          </div>
        </div>

        {/* Card 3: Last Run (Ocean Azure) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7974]">Last Execution</span>
              </div>
              {/* Sleek Small Accent Bar (Small accent bar) */}
              <span className="w-8 h-1 rounded-full bg-[#0284c7] shrink-0" />
            </div>
            <div className="text-2xl font-bold text-[#191c1b] mt-3">10 Oct 2026</div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#f6ece9]">
            <span className="text-xs text-[#89938f] font-mono">09:42 · demo worker</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#e0f2fe] text-[#0284c7]">
              Success
            </span>
          </div>
        </div>

        {/* Card 4: Input Data Readiness (Plum Rose) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#8b263e]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7974]">Data Readiness</span>
              </div>
              {/* Sleek Small Accent Bar (Small accent bar) */}
              <span className="w-8 h-1 rounded-full bg-[#8b263e] shrink-0" />
            </div>
            <div className="text-2xl font-bold text-[#191c1b] mt-3">Prepared</div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#f6ece9]">
            <span className="text-xs text-[#89938f] truncate font-mono" title="Sales Q3 · matrix v1">
              Sales Q3 · matrix v1
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#fdf2f4] text-[#8b263e]">
              Ready
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recent Mining Jobs Table (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-[#E7E2D8] rounded-xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#f6ece9]">
            <div>
              <h2 className="text-base font-semibold text-[#191c1b]">Recent Mining Jobs</h2>
              <p className="text-xs text-[#6d7974] mt-0.5">
                Review latest execution, arrangement status and itemset extractions
              </p>
            </div>
            
            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={algorithmFilter}
                onChange={(e) => setAlgorithmFilter(e.target.value)}
                aria-label="Filter by algorithm"
                className="text-xs bg-white border border-[#E7E2D8] rounded-lg px-2.5 py-1.5 text-[#191c1b] focus:border-[#1e3a2f] outline-none cursor-pointer"
              >
                <option value="all">All algorithms</option>
                <option value="EFIM">EFIM</option>
                <option value="HUI-Miner">HUI-Miner</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by job status"
                className="text-xs bg-white border border-[#E7E2D8] rounded-lg px-2.5 py-1.5 text-[#191c1b] focus:border-[#1e3a2f] outline-none cursor-pointer"
              >
                <option value="all">All statuses</option>
                <option value="Completed">Completed</option>
                <option value="Failed">Failed</option>
                <option value="Running">Running</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#89938f] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search run ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs bg-white border border-[#E7E2D8] rounded-lg pl-8 pr-2.5 py-1.5 text-[#191c1b] focus:border-[#1e3a2f] outline-none w-28 sm:w-32"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E7E2D8] text-[11px] font-semibold text-[#89938f] uppercase tracking-wider bg-[#fbf2f0]">
                  <th className="py-3 px-3">RUN ID</th>
                  <th className="py-3 px-3">ALGORITHM</th>
                  <th className="py-3 px-3">DATASET</th>
                  <th className="py-3 px-3 text-right">MINUTIL</th>
                  <th className="py-3 px-3">STARTED AT</th>
                  <th className="py-3 px-3">DURATION</th>
                  <th className="py-3 px-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2D8]/60">
                {filteredJobs.map((job) => {
                  return (
                    <tr
                      key={job.id}
                      onClick={() => {
                        if (job.status === 'Completed') {
                          onNavigate('results', job.runId);
                        } else if (job.status === 'Failed') {
                          onNavigate('failure', job.runId);
                        }
                      }}
                      className="hover:bg-[#fbf2f0] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-3 font-semibold text-[#191c1b] group-hover:text-[#1e3a2f]">
                        {job.runId}
                      </td>
                      <td className="py-3.5 px-3 text-[#6d7974]">{job.algorithm}</td>
                      <td className="py-3.5 px-3 text-[#6d7974]">{job.dataset}</td>
                      <td className="py-3.5 px-3 font-mono text-right text-[#191c1b] tabular-nums">{job.minUtil}</td>
                      <td className="py-3.5 px-3 text-[#89938f]">{job.startedAt}</td>
                      <td className="py-3.5 px-3 text-[#89938f]">{job.duration}</td>
                      <td className="py-3.5 px-3 text-right">
                        {job.status === 'Completed' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#e7ede9] text-[#1e3a2f] border border-[#1e3a2f]/20">
                            Completed
                          </span>
                        )}
                        {job.status === 'Failed' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#fcedea] text-[#b3261e] border border-[#b3261e]/20">
                            Failed
                          </span>
                        )}
                        {job.status === 'Running' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#f6ece9] text-[#6d7974] border border-[#E7E2D8] animate-pulse">
                            Running
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#f6ece9] text-xs text-[#89938f]">
            <span>Showing {filteredJobs.length} of {jobs.length} demo jobs</span>
            <div className="flex items-center gap-3 text-[11px]">
              <span 
                onClick={() => onNavigate('results')}
                className="text-[#6d7974] hover:text-[#1e3a2f] cursor-pointer hover:underline"
              >
                Run result → S05
              </span>
              <span>|</span>
              <span 
                onClick={() => onNavigate('failure')}
                className="text-[#b3261e] hover:underline cursor-pointer"
              >
                Failure → S07
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Service & Data Health (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-[#E7E2D8] rounded-xl p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-[#191c1b] mb-4">
              Service &amp; Data Health
            </h3>

            {/* Service Status box */}
            <div className="bg-[#e7ede9] border border-[#1e3a2f]/20 rounded-lg p-4 flex items-start gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a2f] mt-1 shrink-0"></span>
              <div>
                <div className="text-xs font-semibold text-[#1e3a2f]">
                  Arrangement service available
                </div>
                <div className="text-[11px] text-[#4a6358] mt-0.5">
                  Ready for new planogram optimizations
                </div>
              </div>
            </div>

            {/* Notice / Warning box */}
            <div className="mt-4">
              <div className="text-[10px] font-bold text-[#89938f] tracking-wider uppercase mb-1.5">
                NOTICE
              </div>
              <div 
                onClick={() => onNavigate('failure')}
                className="bg-[#fcedea] border border-[#b3261e]/20 rounded-lg p-3 flex items-start gap-3 cursor-pointer hover:bg-[#fcedea]/80 transition-colors"
              >
                <AlertCircle className="w-4 h-4 text-[#b3261e] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-[#b3261e]">
                    1 recent run failed
                  </div>
                  <div className="text-[11px] text-[#b3261e] mt-0.5 font-medium">
                    Inspect failure → S07
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="mt-6 pt-5 border-t border-[#f6ece9]">
              <div className="text-[10px] font-bold text-[#89938f] tracking-wider uppercase mb-2">
                QUICK ACCESS
              </div>
              <div className="space-y-1.5">
                <button
                  onClick={() => onNavigate('benchmark')}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-[#fbf2f0] border border-transparent hover:border-[#E7E2D8] text-xs text-[#191c1b] font-medium transition-colors text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <BarChart2 className="w-3.5 h-3.5 text-[#6d7974]" />
                    <span>View Algorithm Benchmark</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#89938f]" />
                </button>

                <button
                  onClick={() => onNavigate('users')}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-[#fbf2f0] border border-transparent hover:border-[#E7E2D8] text-xs text-[#191c1b] font-medium transition-colors text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-[#6d7974]" />
                    <span>Store Roles &amp; Permissions</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#89938f]" />
                </button>

                <button
                  onClick={() => onNavigate('api-connections')}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-[#fbf2f0] border border-transparent hover:border-[#E7E2D8] text-xs text-[#191c1b] font-medium transition-colors text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[#6d7974]" />
                    <span>POS / ERP Connections</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#89938f]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Disclaimer */}
      <footer className="pt-2 pb-6 text-xs text-[#89938f]">
        Preview only: all metrics and arrangement records are demo data; no live backend connected.
      </footer>
    </div>
  );
};
