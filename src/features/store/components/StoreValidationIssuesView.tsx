import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  RotateCw, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Filter, 
  Download,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ActiveNavScreen } from '../../../types/mining';

interface StoreValidationIssuesViewProps {
  onNavigate: (screen: ActiveNavScreen) => void;
}

export const StoreValidationIssuesView: React.FC<StoreValidationIssuesViewProps> = ({ onNavigate }) => {
  const [isValidating, setIsValidating] = useState(true);
  const [progressStep, setProgressStep] = useState(2); // 1: Reading, 2: Checking data, 3: Completed
  const [filterSeverity, setFilterSeverity] = useState<'All' | 'Rejected' | 'Canceled'>('All');

  // Simulated auto-completion or manual toggle
  const handleToggleState = () => {
    setIsValidating(!isValidating);
    if (!isValidating) {
      setProgressStep(2);
    }
  };

  const sampleIssues = [
    { row: 42, txnId: 'TX-1003', field: 'unit_price', issue: 'Missing unit price in line item', severity: 'Rejected', suggestedAction: 'Excluded from matrix' },
    { row: 118, txnId: 'TX-1002', field: 'order_status', issue: 'Customer canceled before checkout', severity: 'Canceled', suggestedAction: 'Excluded from matrix' },
    { row: 204, txnId: 'TX-1045', field: 'quantity', issue: 'Non-positive quantity (-1)', severity: 'Rejected', suggestedAction: 'Row pruned' },
    { row: 312, txnId: 'TX-1089', field: 'sku_code', issue: 'Unregistered SKU "P999_TEST"', severity: 'Rejected', suggestedAction: 'Requires SKU map' },
    { row: 450, txnId: 'TX-1120', field: 'timestamp', issue: 'Malformed datetime format', severity: 'Rejected', suggestedAction: 'Auto-formatted' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#191c1b]">
              Transaction Validation Issues
            </h1>
          </div>
          <p className="text-sm text-[#6d7974]">
            Review excluded and invalid transactions before utility-matrix preparation.
          </p>

          {/* Meta Tag Badges Bar matching Image 2 */}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
            <span className="px-2 py-0.5 rounded font-semibold bg-[#eaf0eb] text-[#1e3a2f] uppercase text-[10px]">
              DEMO DATA
            </span>
            <span className="text-[#E7E2D8]">/</span>
            <span className="font-mono text-[#6d7974]">Batch B-1024</span>
            <span className="text-[#E7E2D8]">/</span>
            <span className="text-[#6d7974]">CSV import</span>
            <span className="text-[#E7E2D8]">/</span>
            <span className="text-[#6d7974] font-medium">Sales Q3 2026</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('store-transactions')}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#E7E2D8] rounded-lg bg-white hover:bg-[#FAF8F5] text-[#191c1b] text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to O03 Data Center</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards with Sleek Small Accent Bars (Small accent bar) & Dots */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Records */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs relative overflow-hidden">
          {/* Small Accent Bar (Small accent bar) */}
          <div className="w-8 h-1 rounded-full bg-[#475569] mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#475569]">
              <span className="w-2 h-2 rounded-full bg-[#64748b]" />
              <span>Total Records</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1]">
              CSV Batch
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191c1b] mt-2 tabular-nums">
            {isValidating ? '—' : '1,200'}
          </div>
        </div>

        {/* Valid / Accepted */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs relative overflow-hidden">
          {/* Small Accent Bar (Small accent bar) */}
          <div className="w-8 h-1 rounded-full bg-[#1e3a2f] mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1e3a2f]">
              <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
              <span>Valid / Accepted</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
              Pass
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1e3a2f] mt-2 tabular-nums">
            {isValidating ? '—' : '1,120'}
          </div>
        </div>

        {/* Invalid / Rejected */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs relative overflow-hidden">
          {/* Small Accent Bar (Small accent bar) */}
          <div className="w-8 h-1 rounded-full bg-[#dc2626] mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#dc2626]">
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
              <span>Invalid / Rejected</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]">
              Critical
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#dc2626] mt-2 tabular-nums">
            {isValidating ? '—' : '48'}
          </div>
        </div>

        {/* Canceled / Excluded */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs relative overflow-hidden">
          {/* Small Accent Bar (Small accent bar) */}
          <div className="w-8 h-1 rounded-full bg-[#c26d38] mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#c26d38]">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
              <span>Canceled / Excluded</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#fffbeb] text-[#92400e] border border-[#fde68a]">
              Void
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#b45309] mt-2 tabular-nums">
            {isValidating ? '—' : '32'}
          </div>
        </div>
      </div>

      {/* Main Center State: Validating in Progress (Image 2) OR Results */}
      {isValidating ? (
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-10 sm:p-14 shadow-2xs flex flex-col items-center justify-center text-center">
          {/* Animated Spinner Icon */}
          <div className="w-16 h-16 rounded-2xl bg-[#eaf0eb] flex items-center justify-center text-[#1e3a2f] mb-6">
            <svg className="animate-spin w-8 h-8 text-[#1e3a2f]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-[#191c1b]">
            Validating transaction batch...
          </h2>
          <p className="text-sm text-[#6d7974] max-w-md mt-2">
            The system is checking required fields, duplicates and canceled orders.
          </p>

          {/* Progress Bar Container */}
          <div className="w-full max-w-md mt-6">
            <div className="w-full bg-[#f6ece9] h-2.5 rounded-full overflow-hidden border border-[#E7E2D8]">
              <div 
                className="bg-[#1e3a2f] h-full rounded-full transition-all duration-700 animate-pulse" 
                style={{ width: '48%' }} 
              />
            </div>
            <p className="text-[11px] text-[#89938f] mt-2">
              Progress indicator is illustrative, not a backend percentage.
            </p>
          </div>

          {/* Stepper Timeline */}
          <div className="flex items-center gap-6 mt-8 text-xs font-medium">
            <div className="flex items-center gap-1.5 text-[#1e3a2f]">
              <CheckCircle2 className="w-4 h-4 text-[#1e3a2f]" />
              <span>Reading file</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#1e3a2f] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#1e3a2f] animate-ping" />
              <span>Checking data</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#89938f]">
              <span className="w-2 h-2 rounded-full border border-[#89938f]" />
              <span>Preparing validation report</span>
            </div>
          </div>

          {/* Interactive Simulation Switcher */}
          <div className="mt-8 pt-6 border-t border-[#E7E2D8] flex items-center gap-3">
            <button
              onClick={handleToggleState}
              className="px-4 py-2 bg-[#1e3a2f] hover:bg-[#294d3f] text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Simulate Validation Completed</span>
            </button>
          </div>
        </div>
      ) : (
        /* Completed State with Issue Breakdown */
        <div className="bg-white border border-[#E7E2D8] rounded-2xl shadow-2xs overflow-hidden">
          <div className="p-6 border-b border-[#E7E2D8] bg-[#FAF8F5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]" />
                <h2 className="text-base font-semibold text-[#191c1b]">
                  Validation Summary: 48 Issues Detected
                </h2>
              </div>
              <p className="text-xs text-[#6d7974] mt-1">
                48 transactions excluded or modified to preserve high-utility matrix integrity.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleState}
                className="px-3 py-1.5 border border-[#E7E2D8] bg-white rounded-lg text-xs font-medium text-[#6d7974] hover:bg-[#FAF8F5] cursor-pointer flex items-center gap-1"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rerun Validator</span>
              </button>
              <button
                onClick={() => onNavigate('setup')}
                className="px-3.5 py-1.5 bg-[#1e3a2f] hover:bg-[#294d3f] text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1"
              >
                <span>Proceed to Mining Setup</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#89938f] text-[10px] font-bold uppercase tracking-wider border-b border-[#E7E2D8]">
                <tr>
                  <th className="py-3 px-4">ROW</th>
                  <th className="py-3 px-4">TXN ID</th>
                  <th className="py-3 px-4">FIELD</th>
                  <th className="py-3 px-4">ISSUE DESCRIPTION</th>
                  <th className="py-3 px-4">SEVERITY</th>
                  <th className="py-3 px-4">SUGGESTED ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2D8]/60">
                {sampleIssues.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="py-3 px-4 font-mono text-[#6d7974]">#{item.row}</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#191c1b]">{item.txnId}</td>
                    <td className="py-3 px-4 font-mono text-[#b45309]">{item.field}</td>
                    <td className="py-3 px-4 font-medium text-[#191c1b]">{item.issue}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        item.severity === 'Rejected' 
                          ? 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                          : 'bg-[#fffbeb] text-[#92400e] border border-[#fde68a]'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.severity === 'Rejected' ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'
                        }`} />
                        <span>{item.severity}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#6d7974]">{item.suggestedAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom Info Alert */}
      <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] text-xs text-[#6d7974] flex items-center justify-between">
        <span>
          Accepted, rejected, canceled and pending totals are not finalized while validation is running.
        </span>
        <button
          onClick={() => onNavigate('store-transactions')}
          className="text-xs font-semibold text-[#1e3a2f] hover:underline cursor-pointer"
        >
          Cancel &amp; Return
        </button>
      </div>
    </div>
  );
};
