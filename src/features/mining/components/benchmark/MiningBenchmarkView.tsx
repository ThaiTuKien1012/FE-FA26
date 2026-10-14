import React, { useState } from 'react';
import { 
  Play, 
  Clock, 
  Cpu, 
  Layers, 
  Database, 
  ArrowDown, 
  Info,
  ChevronDown
} from 'lucide-react';
import { BenchmarkComparison, ActiveNavScreen } from '../../../../types/mining';
import { mockBenchmarkData, availableDatasets } from '../../../../mocks/miningData';

interface MiningBenchmarkViewProps {
  onNavigate: (screen: ActiveNavScreen) => void;
}

export const MiningBenchmarkView: React.FC<MiningBenchmarkViewProps> = ({
  onNavigate
}) => {
  const [datasetId, setDatasetId] = useState('sales-q3-2026');
  const [minUtil, setMinUtil] = useState<number>(250);
  const [isRunning, setIsRunning] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkComparison>(mockBenchmarkData);

  const handleRunBenchmark = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      const factor = Math.max(0.5, 300 / (minUtil || 250));
      const huiTime = +(29.1 * factor).toFixed(1);
      const efimTime = +(16.8 * factor).toFixed(1);
      const huiMem = Math.round(384 * Math.min(1.4, factor));
      const efimMem = Math.round(256 * Math.min(1.4, factor));
      const timeImp = +(((huiTime - efimTime) / huiTime) * 100).toFixed(1);
      const memImp = +(((huiMem - efimMem) / huiMem) * 100).toFixed(1);
      const itemsets = Math.round(128 / factor);

      setBenchmarkData({
        dataset: 'Sales Q3 2026',
        minUtil,
        huiMiner: {
          executionTime: huiTime,
          peakMemoryMB: huiMem,
          itemsetsCount: itemsets
        },
        efim: {
          executionTime: efimTime,
          peakMemoryMB: efimMem,
          itemsetsCount: itemsets
        },
        timeImprovementPct: timeImp,
        memoryImprovementPct: memImp
      });
    }, 900);
  };

  return (
    <div className="space-y-6">
      {/* Title & Decorative Visual */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2" data-purpose="page-title-banner">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#191c1b]">
            HUI-Miner vs EFIM Benchmark
          </h1>
          <p className="text-sm text-[#6d7974] mt-1">
            Compare optimization runtime and memory usage between algorithms on the same store dataset.
          </p>
          <div className="mt-2.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#f6ece9] text-[#6d7974]">
              DEMO DATA
            </span>
          </div>
        </div>

        {/* Decorative mini graphic matching design system */}
        <div className="w-28 h-12 bg-[#fbf2f0] border border-[#E7E2D8] rounded-xl p-2 hidden sm:flex items-center justify-center relative overflow-hidden">
          <div className="flex items-end gap-1.5 h-7">
            <div className="w-1.5 h-4 bg-[#89938f] rounded-[2px]"></div>
            <div className="w-1.5 h-6 bg-[#1e3a2f] rounded-[2px]"></div>
            <div className="w-1.5 h-5 bg-[#b45309] rounded-[2px]"></div>
            <div className="w-1.5 h-3 bg-[#4a6358] rounded-[2px]"></div>
          </div>
          <div className="absolute right-3 top-2.5 w-6 h-6 rounded-full border border-[#b45309] flex items-center justify-center text-[10px] text-[#b45309]">
            🔍
          </div>
        </div>
      </div>

      {/* Benchmark Control Bar */}
      <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Dataset Selector */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-semibold text-[#191c1b]">Store Dataset</label>
            <div className="relative">
              <select
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value)}
                aria-label="Select dataset for benchmark"
                className="w-full h-10 bg-white border border-[#E7E2D8] rounded-lg px-3 pr-8 text-xs font-medium text-[#191c1b] focus:border-[#1e3a2f] outline-none appearance-none cursor-pointer"
              >
                {availableDatasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name.split('/')[0].trim()}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#89938f] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Minimum Utility Input */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-semibold text-[#191c1b]">
              Minimum Basket Profit (minUtil)
            </label>
            <input
              type="number"
              min="10"
              step="10"
              value={minUtil}
              onChange={(e) => setMinUtil(parseInt(e.target.value) || 0)}
              aria-label="Minimum utility threshold for benchmark"
              className="w-full h-10 bg-white border border-[#E7E2D8] rounded-lg px-3 text-xs font-mono font-medium text-[#191c1b] tabular-nums focus:border-[#1e3a2f] outline-none"
            />
          </div>

          {/* Run Button */}
          <div className="md:col-span-3">
            <button
              onClick={handleRunBenchmark}
              disabled={isRunning}
              className="w-full h-10 bg-[#1e3a2f] hover:bg-[#294d3f] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? 'Benchmarking...' : 'Run Benchmark'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric KPI Cards - Unified Standard Component Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Execution Time */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-xs hover:border-[#1e3a2f]/40 hover:shadow-sm transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#eaf0eb] text-[#1e3a2f] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#e7ede9] text-[#1e3a2f] border border-[#1e3a2f]/20">
              <ArrowDown className="w-3 h-3 text-[#1e3a2f]" />
              <span>{benchmarkData.timeImprovementPct}% (EFIM)</span>
            </span>
          </div>
          <div className="mt-3.5">
            <div className="text-xs font-semibold text-[#707973] uppercase tracking-wider">Total Execution Time</div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191c1b] mt-1 tabular-nums font-mono">
              {benchmarkData.efim.executionTime}s
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5ECE8] flex items-center justify-between text-xs">
            <span className="text-[#707973]">Baseline (HUI)</span>
            <span className="font-mono text-[#89938f]">{benchmarkData.huiMiner.executionTime}s</span>
          </div>
        </div>

        {/* Card 2: Peak Memory Usage */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-xs hover:border-[#c26d38]/40 hover:shadow-sm transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#fdf4ed] text-[#c26d38] flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#fdf4ed] text-[#c26d38] border border-[#c26d38]/20">
              <ArrowDown className="w-3 h-3 text-[#c26d38]" />
              <span>{benchmarkData.memoryImprovementPct}% (EFIM)</span>
            </span>
          </div>
          <div className="mt-3.5">
            <div className="text-xs font-semibold text-[#707973] uppercase tracking-wider">Peak Memory Usage</div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191c1b] mt-1 tabular-nums font-mono">
              {benchmarkData.efim.peakMemoryMB} MB
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5ECE8] flex items-center justify-between text-xs">
            <span className="text-[#707973]">Baseline (HUI)</span>
            <span className="font-mono text-[#89938f]">{benchmarkData.huiMiner.peakMemoryMB} MB</span>
          </div>
        </div>

        {/* Card 3: Arrangements */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-xs hover:border-[#0284c7]/40 hover:shadow-sm transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#e0f2fe] text-[#0284c7] border border-[#0284c7]/20">
              Identical parity
            </span>
          </div>
          <div className="mt-3.5">
            <div className="text-xs font-semibold text-[#707973] uppercase tracking-wider">Arrangements</div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191c1b] mt-1 tabular-nums font-mono">
              {benchmarkData.efim.itemsetsCount}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5ECE8] flex items-center justify-between text-xs">
            <span className="text-[#707973]">Itemsets Output</span>
            <span className="font-mono text-[#89938f]">HUI = EFIM</span>
          </div>
        </div>

        {/* Card 4: Active Dataset */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-xs hover:border-[#8b263e]/40 hover:shadow-sm transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#fdf2f4] text-[#8b263e] flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#fdf2f4] text-[#8b263e] border border-[#8b263e]/20 font-mono">
              minUtil = {benchmarkData.minUtil}
            </span>
          </div>
          <div className="mt-3.5">
            <div className="text-xs font-semibold text-[#707973] uppercase tracking-wider">Active Dataset</div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191c1b] mt-1 tabular-nums truncate" title="Sales Q3 2026">
              Sales Q3 2026
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5ECE8] flex items-center justify-between text-xs">
            <span className="text-[#707973]">Matrix Status</span>
            <span className="font-medium text-[#89938f]">Prepared matrix</span>
          </div>
        </div>
      </div>

      {/* Visual Chart & Results Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Performance Comparison Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-[#E7E2D8] rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#f6ece9]">
            <h2 className="text-base font-semibold text-[#191c1b]">
              Arrangement Algorithm Performance
            </h2>
            {/* Chart Legend */}
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-[2px] bg-[#1e3a2f]"></span>
                <span className="text-[#6d7974]">HUI-Miner</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-[2px] bg-[#b45309]"></span>
                <span className="text-[#6d7974]">EFIM</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Canvas Simulation */}
          <div className="pt-8 pb-4">
            <div className="grid grid-cols-2 gap-8 px-8 sm:px-16">
              {/* Group 1: Execution Time */}
              <div className="space-y-4 text-center">
                <div className="h-48 flex items-end justify-center gap-4 border-b border-[#E7E2D8] pb-2 relative">
                  {/* Grid lines */}
                  <div className="absolute inset-x-0 bottom-1/4 border-b border-dashed border-[#E7E2D8] -z-0"></div>
                  <div className="absolute inset-x-0 bottom-2/4 border-b border-dashed border-[#E7E2D8] -z-0"></div>
                  <div className="absolute inset-x-0 bottom-3/4 border-b border-dashed border-[#E7E2D8] -z-0"></div>

                  {/* HUI-Miner Bar */}
                  <div className="flex flex-col items-center gap-1 z-10 w-14">
                    <span className="text-xs font-bold text-[#191c1b] font-mono tabular-nums">
                      {benchmarkData.huiMiner.executionTime}
                    </span>
                    <div 
                      className="w-full bg-[#1e3a2f] rounded-t-[2px] transition-all duration-500"
                      style={{ height: `${Math.min(160, benchmarkData.huiMiner.executionTime * 5)}px` }}
                    ></div>
                  </div>

                  {/* EFIM Bar */}
                  <div className="flex flex-col items-center gap-1 z-10 w-14">
                    <span className="text-xs font-bold text-[#b45309] font-mono tabular-nums">
                      {benchmarkData.efim.executionTime}
                    </span>
                    <div 
                      className="w-full bg-[#b45309] rounded-t-[2px] transition-all duration-500"
                      style={{ height: `${Math.min(160, benchmarkData.efim.executionTime * 5)}px` }}
                    ></div>
                  </div>
                </div>
                <div className="text-xs font-medium text-[#6d7974]">
                  Execution Time (s)
                </div>
              </div>

              {/* Group 2: Peak Memory */}
              <div className="space-y-4 text-center">
                <div className="h-48 flex items-end justify-center gap-4 border-b border-[#E7E2D8] pb-2 relative">
                  {/* Grid lines */}
                  <div className="absolute inset-x-0 bottom-1/4 border-b border-dashed border-[#E7E2D8] -z-0"></div>
                  <div className="absolute inset-x-0 bottom-2/4 border-b border-dashed border-[#E7E2D8] -z-0"></div>
                  <div className="absolute inset-x-0 bottom-3/4 border-b border-dashed border-[#E7E2D8] -z-0"></div>

                  {/* HUI-Miner Bar */}
                  <div className="flex flex-col items-center gap-1 z-10 w-14">
                    <span className="text-xs font-bold text-[#191c1b] font-mono tabular-nums">
                      {benchmarkData.huiMiner.peakMemoryMB}
                    </span>
                    <div 
                      className="w-full bg-[#1e3a2f] rounded-t-[2px] transition-all duration-500"
                      style={{ height: `${Math.min(160, (benchmarkData.huiMiner.peakMemoryMB / 400) * 160)}px` }}
                    ></div>
                  </div>

                  {/* EFIM Bar */}
                  <div className="flex flex-col items-center gap-1 z-10 w-14">
                    <span className="text-xs font-bold text-[#b45309] font-mono tabular-nums">
                      {benchmarkData.efim.peakMemoryMB}
                    </span>
                    <div 
                      className="w-full bg-[#b45309] rounded-t-[2px] transition-all duration-500"
                      style={{ height: `${Math.min(160, (benchmarkData.efim.peakMemoryMB / 400) * 160)}px` }}
                    ></div>
                  </div>
                </div>
                <div className="text-xs font-medium text-[#6d7974]">
                  Peak Memory (MB)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Benchmark Results Table (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E7E2D8] rounded-xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-semibold text-[#191c1b]">
            Benchmark Results
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#E7E2D8] text-[10px] font-bold text-[#89938f] uppercase tracking-wider bg-[#fbf2f0]">
                  <th className="py-2.5 px-2">METRIC</th>
                  <th className="py-2.5 px-2 text-right">HUI-MINER</th>
                  <th className="py-2.5 px-2 text-right">EFIM</th>
                  <th className="py-2.5 px-2 text-right">IMPROVEMENT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2D8]/60">
                <tr>
                  <td className="py-3 px-2 text-[#6d7974] font-medium">
                    Execution Time (s)
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-[#89938f] tabular-nums">
                    {benchmarkData.huiMiner.executionTime}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-semibold text-[#191c1b] tabular-nums">
                    {benchmarkData.efim.executionTime}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-12 bg-[#f6ece9] h-1.5 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="bg-[#1e3a2f] h-full rounded-full"
                          style={{ width: `${Math.min(100, benchmarkData.timeImprovementPct)}%` }}
                        />
                      </div>
                      <span className="text-[#1e3a2f] font-semibold tabular-nums text-xs">
                        ↓ {benchmarkData.timeImprovementPct}%
                      </span>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-2 text-[#6d7974] font-medium">
                    Peak Memory (MB)
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-[#89938f] tabular-nums">
                    {benchmarkData.huiMiner.peakMemoryMB}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-semibold text-[#191c1b] tabular-nums">
                    {benchmarkData.efim.peakMemoryMB}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-12 bg-[#f6ece9] h-1.5 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="bg-[#c26d38] h-full rounded-full"
                          style={{ width: `${Math.min(100, benchmarkData.memoryImprovementPct)}%` }}
                        />
                      </div>
                      <span className="text-[#c26d38] font-semibold tabular-nums text-xs">
                        ↓ {benchmarkData.memoryImprovementPct}%
                      </span>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-2 text-[#6d7974] font-medium">
                    High-Utility Itemsets
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-[#89938f] tabular-nums">
                    {benchmarkData.huiMiner.itemsetsCount}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-semibold text-[#191c1b] tabular-nums">
                    {benchmarkData.efim.itemsetsCount}
                  </td>
                  <td className="py-3 px-2 text-right text-[#89938f]">—</td>
                </tr>

                <tr>
                  <td className="py-3 px-2 text-[#6d7974] font-medium">
                    Algorithm
                  </td>
                  <td className="py-3 px-2 text-right text-[#89938f]">
                    HUI-Miner
                  </td>
                  <td className="py-3 px-2 text-right font-semibold text-[#191c1b]">
                    EFIM
                  </td>
                  <td className="py-3 px-2 text-right text-[#89938f]">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom informational banner */}
      <div className="p-4 bg-[#fbf2f0] border border-[#E7E2D8] rounded-xl text-xs text-[#6d7974] flex items-center gap-3">
        <Info className="w-4 h-4 text-[#89938f] shrink-0" />
        <span>
          Benchmark results are based on the same dataset and minimum basket utility threshold (minUtil = {benchmarkData.minUtil}) for both arrangement algorithms.
        </span>
      </div>
    </div>
  );
};
