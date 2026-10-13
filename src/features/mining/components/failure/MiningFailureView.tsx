import React, { useState } from 'react';
import { 
  AlertCircle, 
  ArrowRight, 
  Terminal, 
  ChevronDown, 
  ChevronUp,
  X,
  SlidersHorizontal
} from 'lucide-react';
import { MiningJob, ActiveNavScreen } from '../../../../types/mining';

interface MiningFailureViewProps {
  job: MiningJob;
  onNavigate: (screen: ActiveNavScreen, runId?: string) => void;
  onRetry: (job: MiningJob) => void;
}

export const MiningFailureView: React.FC<MiningFailureViewProps> = ({
  job,
  onNavigate,
  onRetry
}) => {
  const [showFullLogs, setShowFullLogs] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryClick = () => {
    setIsRetrying(true);
    setTimeout(() => {
      setIsRetrying(false);
      onRetry(job);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="pb-2">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#191c1b]">
          Mining Failure &amp; Retry
        </h1>
        <p className="text-sm text-[#6d7974] mt-1">
          Review the failed job, identify the cause and recover without losing your arrangement configuration.
        </p>
        <div className="mt-2.5">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#f6ece9] text-[#6d7974]">
            DEMO DATA
          </span>
        </div>
      </div>

      {/* Red Alert Banner */}
      <div className="bg-[#fcedea] border border-[#b3261e]/25 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-8 h-8 rounded-lg bg-[#fcedea] border border-[#b3261e]/30 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-[#b3261e]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#191c1b]">
              Arrangement job {job.runId} failed
            </h2>
            <p className="text-xs text-[#6d7974] mt-0.5">
              {job.errorMessage || 'Input utility matrix could not be loaded. Verify the prepared dataset and try again.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowFullLogs(true)}
          className="px-4 py-2 bg-white hover:bg-[#fbf2f0] border border-[#E7E2D8] text-xs font-semibold text-[#191c1b] rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          View Run Log
        </button>
      </div>

      {/* 4 Failure Diagnostic KPI Cards with Sleek Small Accent Bars (Small accent bar) & Distinct Colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Run ID & Algorithm (Forest Pine) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs hover:border-[#1e3a2f]/40 transition-colors relative overflow-hidden">
          <div className="w-8 h-1 rounded-full bg-[#1e3a2f] mb-3" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1e3a2f] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1e3a2f]" />
              Run Identifier
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#eaf0eb] text-[#1e3a2f] border border-[#1e3a2f]/20 font-mono">
              {job.runId}
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-[#191c1b] mt-2">
            {job.algorithm}
          </div>
          <div className="text-xs text-[#6d7974] mt-1">
            Mining Engine Kernel
          </div>
        </div>

        {/* Card 2: Failure Reason (Crimson Red) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs hover:border-[#dc2626]/40 transition-colors relative overflow-hidden">
          <div className="w-8 h-1 rounded-full bg-[#dc2626] mb-3" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#dc2626] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
              Status
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]">
              Interrupted
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-[#dc2626] mt-2 truncate" title={job.errorCategory || 'Matrix Unresolved'}>
            {job.errorCategory || 'Matrix Error'}
          </div>
          <div className="text-xs text-[#dc2626] mt-1 font-medium">
            Requires utility dataset cache
          </div>
        </div>

        {/* Card 3: Memory at Crash (Warm Cognac Amber) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs hover:border-[#c26d38]/40 transition-colors relative overflow-hidden">
          <div className="w-8 h-1 rounded-full bg-[#c26d38] mb-3" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#c26d38] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
              Allocated Memory
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#fffbeb] text-[#92400e] border border-[#fde68a]">
              Peak
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-[#191c1b] mt-2 tabular-nums">
            {job.peakMemoryMB || 128} MB
          </div>
          <div className="text-xs text-[#b45309] mt-1 font-medium">
            Buffers released safely
          </div>
        </div>

        {/* Card 4: MinUtil Target (Ocean Azure) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs hover:border-[#0284c7]/40 transition-colors relative overflow-hidden">
          <div className="w-8 h-1 rounded-full bg-[#0284c7] mb-3" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#0284c7] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
              Threshold Setting
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f0f9ff] text-[#0369a1] border border-[#bae6fd]">
              minUtil
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-[#191c1b] mt-2 tabular-nums font-mono">
            {job.minUtil}
          </div>
          <div className="text-xs text-[#0284c7] mt-1 font-medium">
            Basket threshold intact
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Failure Details (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-[#E7E2D8] rounded-xl p-7 shadow-xs space-y-6">
          <div className="border-b border-[#f6ece9] pb-4">
            <h2 className="text-base font-semibold text-[#191c1b]">Failure Details</h2>
            <p className="text-xs text-[#6d7974] mt-0.5">
              Root cause diagnostic during this arrangement optimization
            </p>
          </div>

          {/* Error Category Box */}
          <div className="p-4 bg-[#fbf2f0] rounded-lg border border-[#E7E2D8]">
            <div className="text-[10px] font-bold text-[#89938f] uppercase tracking-wider">
              ERROR CATEGORY
            </div>
            <div className="text-sm font-bold text-[#191c1b] mt-1">
              {job.errorCategory || 'Missing or unavailable utility matrix'}
            </div>
            <div className="text-xs text-[#6d7974] mt-0.5">
              The selected dataset version is not ready for execution.
            </div>
          </div>

          {/* Recommended Recovery */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-[#89938f] uppercase tracking-wider">
              RECOMMENDED RECOVERY
            </div>
            <ul className="space-y-1.5 text-xs text-[#6d7974] list-disc list-inside">
              <li>Check the dataset and utility matrix in Mining Setup.</li>
              <li>Validate configuration and ensure minUtil is positive.</li>
              <li>Retry the job after the input issue is resolved.</li>
            </ul>
          </div>

          {/* Diagnostic Logs */}
          <div className="pt-2 border-t border-[#f6ece9] space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold text-[#89938f] uppercase tracking-wider">
                DIAGNOSTIC LOGS
              </div>
              <button
                onClick={() => setShowFullLogs(!showFullLogs)}
                className="text-xs text-[#6d7974] hover:text-[#191c1b] flex items-center gap-1 font-medium cursor-pointer"
              >
                <span>{showFullLogs ? 'Hide details' : 'View details'}</span>
                {showFullLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Terminal Box */}
            <div className="bg-[#1e3a2f] text-[#eff5ef] rounded-lg p-4 font-mono text-xs border border-[#294d3f] shadow-inner overflow-x-auto space-y-1">
              <div className="text-[#ff9e65]">
                [09:42:08] ERROR MATRIX_NOT_FOUND
              </div>
              <div className="text-[#e7ede9] pl-6">
                Prepared utility matrix: Sales Q3 2026 / v1 (sample)
              </div>
              {showFullLogs && (
                <>
                  <div className="text-gray-400 pt-2 border-t border-[#294d3f]">
                    [09:42:01] INFO  Job queued for execution on worker-node-04
                  </div>
                  <div className="text-gray-400">
                    [09:42:03] INFO  Initializing EFIM engine kernel
                  </div>
                  <div className="text-[#fcedea] text-[#b3261e]">
                    [09:42:08] ERROR Fatal error: Target schema validation failed: [E_DS_UNRESOLVED_DESCRIPTOR]
                  </div>
                  <div className="text-yellow-400">
                    [09:42:09] WARN  Execution halted prematurely. Releasing buffers.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Failed Job Information (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E7E2D8] rounded-xl p-6 shadow-xs space-y-6">
          <h3 className="text-sm font-semibold text-[#191c1b]">
            Failed Job Information
          </h3>

          <div className="space-y-3.5 text-xs">
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
              <span className="text-[#89938f]">Utility Matrix</span>
              <span className="font-medium text-[#191c1b]">{job.utilityMatrixVersion || 'v1'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#f6ece9]">
              <span className="text-[#89938f]">minUtil</span>
              <span className="font-mono font-semibold text-[#191c1b] tabular-nums">{job.minUtil}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#f6ece9]">
              <span className="text-[#89938f]">Started At</span>
              <span className="font-medium text-[#191c1b]">{job.startedAt}</span>
            </div>

            <div className="flex justify-between py-1 items-center">
              <span className="text-[#89938f]">Run Status</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#fcedea] text-[#b3261e] border border-[#b3261e]/20">
                Failed
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#f6ece9] text-[11px] text-[#89938f] italic">
            Last configuration is read-only.
          </div>
        </div>
      </div>

      {/* Next Step Recovery Footer Bar */}
      <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="text-[10px] font-bold text-[#89938f] uppercase tracking-wider">
            NEXT STEP
          </div>
          <div className="text-xs font-semibold text-[#191c1b] mt-0.5">
            Fix the dataset issue, then retry with the same configuration.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('setup')}
            className="px-4 py-2 bg-white hover:bg-[#fbf2f0] border border-[#E7E2D8] text-xs font-semibold text-[#191c1b] rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#89938f]" />
            <span>Edit Settings</span>
          </button>

          <button
            onClick={handleRetryClick}
            disabled={isRetrying}
            className="px-5 py-2 bg-[#1e3a2f] hover:bg-[#294d3f] text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <span>{isRetrying ? 'Retrying Job...' : 'Retry Mining'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <footer className="pt-2 pb-6 text-xs text-[#89938f]">
        DEMO DATA • This interface uses illustrative error records. Logs must never reveal secrets or tokens.
      </footer>

      {/* Log Modal */}
      {showFullLogs && (
        <div className="fixed inset-0 z-50 bg-[#191c1b]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1e3a2f] text-[#eff5ef] rounded-xl border border-[#294d3f] shadow-2xl max-w-2xl w-full p-6 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#294d3f]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#ff9e65]" />
                <h3 className="text-sm font-semibold text-white">
                  Diagnostic Failure Log — Job {job.runId}
                </h3>
              </div>
              <button
                onClick={() => setShowFullLogs(false)}
                aria-label="Close dialog"
                className="p-1 rounded-lg hover:bg-[#294d3f] text-[#e7ede9] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 font-mono text-xs space-y-1.5 max-h-80 overflow-y-auto bg-black/40 p-4 rounded-lg border border-[#294d3f]">
              {job.logs?.map((log, idx) => (
                <div key={idx} className={log.includes('ERROR') ? 'text-[#ff9e65] font-semibold' : log.includes('WARN') ? 'text-yellow-400' : 'text-gray-300'}>
                  {log}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowFullLogs(false)}
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
