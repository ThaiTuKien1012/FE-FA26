import React, { useState } from 'react';
import { 
  Check, 
  ArrowRight, 
  AlertTriangle, 
  ChevronDown,
  Calendar,
  Save
} from 'lucide-react';
import { MiningAlgorithm, ExecutionMode, ActiveNavScreen } from '../../../../types/mining';
import { availableDatasets } from '../../../../mocks/miningData';

interface MiningSetupViewProps {
  onNavigate: (screen: ActiveNavScreen, runId?: string) => void;
  onRunMining: (config: {
    algorithm: MiningAlgorithm;
    dataset: string;
    minUtil: number;
    mode: ExecutionMode;
  }) => void;
}

export const MiningSetupView: React.FC<MiningSetupViewProps> = ({
  onNavigate,
  onRunMining
}) => {
  const [algorithm, setAlgorithm] = useState<MiningAlgorithm>('EFIM');
  const [datasetId, setDatasetId] = useState<string>('sales-q3-2026');
  const [minUtil, setMinUtil] = useState<number>(250);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('manual');
  const [scheduleFreq, setScheduleFreq] = useState<'Weekly' | 'Monthly'>('Weekly');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const selectedDataset = availableDatasets.find((d) => d.id === datasetId) || availableDatasets[0];
  const isMinUtilValid = !isNaN(minUtil) && minUtil > 0;

  const handleRun = () => {
    if (!isMinUtilValid) return;
    onRunMining({
      algorithm,
      dataset: selectedDataset.name.split('/')[0].trim(),
      minUtil,
      mode: executionMode
    });
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="pb-2">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#191c1b]">
          Mining Setup
        </h1>
        <p className="text-sm text-[#6d7974] mt-1">
          Configure HUI-Miner or EFIM to discover high-utility product arrangements.
        </p>
        <div className="mt-2.5">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#f6ece9] text-[#6d7974]">
            DEMO DATA
          </span>
        </div>
      </div>

      {/* 4 Setup Preset KPI Cards with Sleek Small Accent Bars (Small accent bar) & Distinct Colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Selected Algorithm (Forest Pine) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs hover:border-[#1e3a2f]/40 transition-colors relative overflow-hidden">
          <div className="w-8 h-1 rounded-full bg-[#1e3a2f] mb-3" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1e3a2f] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1e3a2f]" />
              Selected Engine
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#eaf0eb] text-[#1e3a2f] border border-[#1e3a2f]/20">
              Active
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-[#191c1b] mt-2">
            {algorithm}
          </div>
          <div className="text-xs text-[#1e3a2f] font-medium mt-1">
            {algorithm === 'EFIM' ? 'Fast sub-tree projection' : 'Standard utility-list'}
          </div>
        </div>

        {/* Card 2: Prepared Dataset (Warm Cognac Amber) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs hover:border-[#c26d38]/40 transition-colors relative overflow-hidden">
          <div className="w-8 h-1 rounded-full bg-[#c26d38] mb-3" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#c26d38] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
              Data Source
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#fffbeb] text-[#92400e] border border-[#fde68a]">
              POSIX
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-[#191c1b] mt-2 truncate">
            Sales Q3 2026
          </div>
          <div className="text-xs text-[#b45309] font-medium mt-1">
            v1 matrix cached
          </div>
        </div>

        {/* Card 3: MinUtil Threshold (Ocean Azure) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs hover:border-[#0284c7]/40 transition-colors relative overflow-hidden">
          <div className="w-8 h-1 rounded-full bg-[#0284c7] mb-3" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#0284c7] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
              Min Basket Profit
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f0f9ff] text-[#0369a1] border border-[#bae6fd]">
              minUtil
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-[#191c1b] mt-2 tabular-nums font-mono">
            {minUtil}
          </div>
          <div className="text-xs text-[#0284c7] font-medium mt-1">
            Threshold parameter
          </div>
        </div>

        {/* Card 4: Execution Mode (Royal Amethyst) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs hover:border-[#7c3aed]/40 transition-colors relative overflow-hidden">
          <div className="w-8 h-1 rounded-full bg-[#7c3aed] mb-3" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7c3aed] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#9333ea]" />
              Run Strategy
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#faf5ff] text-[#6b21a8] border border-[#e9d5ff]">
              Mode
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-[#191c1b] mt-2 capitalize">
            {executionMode}
          </div>
          <div className="text-xs text-[#7c3aed] font-medium mt-1">
            {executionMode === 'manual' ? 'Immediate invocation' : 'Scheduled cron job'}
          </div>
        </div>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Mining Configuration (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-[#E7E2D8] rounded-xl p-7 shadow-xs space-y-7">
          <div className="border-b border-[#f6ece9] pb-4">
            <h2 className="text-base font-semibold text-[#191c1b]">Arrangement Parameters</h2>
            <p className="text-xs text-[#6d7974] mt-0.5">
              Set required optimization thresholds before executing the arrangement miner.
            </p>
          </div>

          {/* 01 ALGORITHM */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold text-[#89938f] uppercase tracking-wider">
              01 ALGORITHM ENGINE
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* HUI-Miner */}
              <div
                onClick={() => setAlgorithm('HUI-Miner')}
                className={`p-4 rounded-lg border cursor-pointer transition-all flex items-start gap-3.5 ${
                  algorithm === 'HUI-Miner'
                    ? 'border-[#1e3a2f] ring-1 ring-[#1e3a2f] bg-[#e7ede9]/30'
                    : 'border-[#E7E2D8] hover:border-[#89938f] bg-white'
                }`}
              >
                <div className="mt-0.5">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    algorithm === 'HUI-Miner' ? 'border-[#1e3a2f]' : 'border-[#E7E2D8]'
                  }`}>
                    {algorithm === 'HUI-Miner' && (
                      <div className="w-2 h-2 rounded-full bg-[#1e3a2f]" />
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#191c1b]">HUI-Miner</div>
                  <div className="text-xs text-[#6d7974] mt-0.5">High-utility itemset mining</div>
                </div>
              </div>

              {/* EFIM */}
              <div
                onClick={() => setAlgorithm('EFIM')}
                className={`p-4 rounded-lg border cursor-pointer transition-all flex items-start gap-3.5 ${
                  algorithm === 'EFIM'
                    ? 'border-[#1e3a2f] ring-1 ring-[#1e3a2f] bg-[#e7ede9]/30'
                    : 'border-[#E7E2D8] hover:border-[#89938f] bg-white'
                }`}
              >
                <div className="mt-0.5">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    algorithm === 'EFIM' ? 'border-[#1e3a2f]' : 'border-[#E7E2D8]'
                  }`}>
                    {algorithm === 'EFIM' && (
                      <div className="w-2 h-2 rounded-full bg-[#1e3a2f]" />
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#191c1b]">EFIM (Recommended)</div>
                  <div className="text-xs text-[#6d7974] mt-0.5">Fast sub-tree projection mining</div>
                </div>
              </div>
            </div>
          </div>

          {/* 02 DATASET / PREPARED UTILITY MATRIX */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-[#89938f] uppercase tracking-wider">
              02 TRANSACTION DATASET / UTILITY MATRIX
            </div>
            <div className="relative">
              <select
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value)}
                aria-label="Select Dataset / Prepared Utility Matrix"
                className="w-full h-11 bg-white border border-[#E7E2D8] rounded-lg px-3.5 pr-10 text-xs font-medium text-[#191c1b] focus:border-[#1e3a2f] outline-none appearance-none cursor-pointer"
              >
                {availableDatasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#89938f] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-[#6d7974]">
              Validated store receipts &amp; external unit profit margins required.
            </p>
          </div>

          {/* 03 MINIMUM UTILITY (MINUTIL) */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-[#89938f] uppercase tracking-wider">
              03 MINIMUM BASKET PROFIT THRESHOLD (MINUTIL)
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="number"
                min="1"
                step="10"
                value={minUtil}
                onChange={(e) => setMinUtil(parseInt(e.target.value) || 0)}
                aria-label="Minimum utility threshold"
                className="w-full sm:w-56 h-10 px-3.5 text-xs font-mono font-medium text-[#191c1b] tabular-nums bg-white border border-[#E7E2D8] rounded-lg focus:border-[#1e3a2f] outline-none"
              />
              <div className="px-3.5 py-2.5 bg-[#fbf2f0] text-[11px] text-[#6d7974] rounded-lg border border-[#E7E2D8] flex-1">
                Positive cumulative utility value
              </div>
            </div>
          </div>

          {/* 04 EXECUTION MODE */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold text-[#89938f] uppercase tracking-wider">
              04 EXECUTION MODE
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Manual Run */}
              <div
                onClick={() => setExecutionMode('manual')}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${
                  executionMode === 'manual'
                    ? 'border-[#1e3a2f] ring-1 ring-[#1e3a2f] bg-[#e7ede9]/30'
                    : 'border-[#E7E2D8] bg-white'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  executionMode === 'manual' ? 'border-[#1e3a2f]' : 'border-[#E7E2D8]'
                }`}>
                  {executionMode === 'manual' && <div className="w-2 h-2 rounded-full bg-[#1e3a2f]" />}
                </div>
                <span className="text-xs font-semibold text-[#191c1b]">Manual Run</span>
              </div>

              {/* Scheduled Run */}
              <div
                onClick={() => setExecutionMode('scheduled')}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${
                  executionMode === 'scheduled'
                    ? 'border-[#1e3a2f] ring-1 ring-[#1e3a2f] bg-[#e7ede9]/30'
                    : 'border-[#E7E2D8] bg-white'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  executionMode === 'scheduled' ? 'border-[#1e3a2f]' : 'border-[#E7E2D8]'
                }`}>
                  {executionMode === 'scheduled' && <div className="w-2 h-2 rounded-full bg-[#1e3a2f]" />}
                </div>
                <span className="text-xs font-semibold text-[#191c1b]">Scheduled Planogram Run</span>
              </div>
            </div>

            {executionMode === 'scheduled' && (
              <div className="mt-3 p-3 bg-[#fbf2f0] rounded-lg border border-[#E7E2D8] flex items-center gap-3 text-xs">
                <Calendar className="w-4 h-4 text-[#b45309]" />
                <span className="text-[#6d7974]">Schedule Frequency:</span>
                <button
                  type="button"
                  onClick={() => setScheduleFreq('Weekly')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${scheduleFreq === 'Weekly' ? 'bg-[#1e3a2f] text-white' : 'bg-white border border-[#E7E2D8]'}`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleFreq('Monthly')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${scheduleFreq === 'Monthly' ? 'bg-[#1e3a2f] text-white' : 'bg-white border border-[#E7E2D8]'}`}
                >
                  Monthly
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Input Readiness & Summary (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E7E2D8] rounded-xl p-6 shadow-xs space-y-6">
          <h3 className="text-sm font-semibold text-[#191c1b]">
            Input Readiness
          </h3>

          {/* Validated & Prepared badge */}
          <div className="bg-[#e7ede9] border border-[#1e3a2f]/20 rounded-lg p-3.5 flex items-start gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a2f] mt-1 shrink-0"></span>
            <div>
              <div className="text-xs font-semibold text-[#1e3a2f]">
                Validated and prepared
              </div>
              <div className="text-[11px] text-[#4a6358] mt-0.5">
                Matrix ready for itemset optimization
              </div>
            </div>
          </div>

          {/* Pre-run Checklist */}
          <div>
            <div className="text-[10px] font-bold text-[#89938f] tracking-wider uppercase mb-2.5">
              PRE-RUN CHECKLIST
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#f6ece9]">
                <div className="flex items-center gap-2 text-[#6d7974]">
                  <Check className="w-3.5 h-3.5 text-[#1e3a2f]" />
                  <span>Dataset selected</span>
                </div>
                <span className="font-medium text-[#1e3a2f]">Ready</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#f6ece9]">
                <div className="flex items-center gap-2 text-[#6d7974]">
                  <Check className="w-3.5 h-3.5 text-[#1e3a2f]" />
                  <span>Utility values prepared</span>
                </div>
                <span className="font-medium text-[#1e3a2f]">Ready</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#f6ece9]">
                <div className="flex items-center gap-2 text-[#6d7974]">
                  <Check className="w-3.5 h-3.5 text-[#1e3a2f]" />
                  <span>Algorithm selected</span>
                </div>
                <span className="font-medium text-[#191c1b]">{algorithm}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 text-[#6d7974]">
                  {isMinUtilValid ? (
                    <Check className="w-3.5 h-3.5 text-[#1e3a2f]" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-[#b3261e]" />
                  )}
                  <span>minUtil is valid</span>
                </div>
                <span className={`font-mono font-medium tabular-nums ${isMinUtilValid ? 'text-[#191c1b]' : 'text-[#b3261e]'}`}>
                  {isMinUtilValid ? minUtil : 'Invalid'}
                </span>
              </div>
            </div>
          </div>

          {/* Configuration Summary */}
          <div className="pt-4 border-t border-[#f6ece9]">
            <div className="text-[10px] font-bold text-[#89938f] tracking-wider uppercase mb-2.5">
              CONFIGURATION SUMMARY
            </div>
            <div className="space-y-1.5 text-xs text-[#6d7974]">
              <div className="flex justify-between">
                <span>Algorithm</span>
                <span className="font-semibold text-[#191c1b]">{algorithm}</span>
              </div>
              <div className="flex justify-between">
                <span>Dataset</span>
                <span className="font-semibold text-[#191c1b] truncate max-w-[150px] text-right">
                  {selectedDataset.name.split('/')[0].trim()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Min Utility</span>
                <span className="font-semibold text-[#191c1b] font-mono tabular-nums">{minUtil}</span>
              </div>
              <div className="flex justify-between">
                <span>Execution</span>
                <span className="font-semibold text-[#191c1b] capitalize">{executionMode}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer bar with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-[#E7E2D8]">
        <div className="text-xs text-[#89938f]">
          Execution creates an arrangement job; view completion in S05 or failures in S07.
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            type="button"
            className="px-4 py-2 bg-white hover:bg-[#fbf2f0] border border-[#E7E2D8] text-xs font-semibold text-[#191c1b] rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-[#89938f]" />
            <span>{isSaved ? 'Saved Configuration ✓' : 'Save Configuration'}</span>
          </button>

          <button
            onClick={handleRun}
            type="button"
            disabled={!isMinUtilValid}
            className="px-5 py-2 bg-[#1e3a2f] hover:bg-[#294d3f] disabled:bg-[#89938f] text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <span>Run Mining</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
