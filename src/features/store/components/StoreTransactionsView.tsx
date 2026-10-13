import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  ArrowRight, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronRight,
  Database,
  Layers,
  Sparkles
} from 'lucide-react';
import { ActiveNavScreen } from '../../../types/mining';

interface StoreTransactionsViewProps {
  onNavigate: (screen: ActiveNavScreen) => void;
}

export const StoreTransactionsView: React.FC<StoreTransactionsViewProps> = ({ onNavigate }) => {
  const [selectedFile, setSelectedFile] = useState('sales_q3_2026.csv');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Breadcrumb Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#191c1b]">
              Transaction Data Center
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider bg-[#eaf0eb] text-[#1e3a2f] uppercase">
              DEMO DATA
            </span>
          </div>
          <p className="text-sm text-[#6d7974]">
            Import historical transactions and review preprocessing results before utility mining.
          </p>
        </div>

        <div>
          <button
            onClick={() => onNavigate('store-validation-issues')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1e3a2f] hover:bg-[#294d3f] text-white text-sm font-semibold transition-all shadow-xs cursor-pointer"
          >
            <span>Start Import</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 KPI Cards (Accepted, Rejected, Canceled, Pending) with Sleek Small Accent Bars (Small accent bar) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Accepted (Emerald Green) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs relative overflow-hidden">
          {/* Small Accent Bar (Small accent bar) */}
          <div className="w-8 h-1 rounded-full bg-[#1e3a2f] mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1e3a2f] uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
              <span>Accepted</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
              93.3%
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191c1b] mt-2 tabular-nums">
            1,120
          </div>
          <div className="text-xs text-[#1e3a2f] font-medium mt-1">
            Ready for itemset extraction
          </div>
        </div>

        {/* Card 2: Rejected (Crimson Red) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs relative overflow-hidden">
          {/* Small Accent Bar (Small accent bar) */}
          <div className="w-8 h-1 rounded-full bg-[#dc2626] mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#dc2626] uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
              <span>Rejected</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]">
              4.0%
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#dc2626] mt-2 tabular-nums">
            48
          </div>
          <div className="text-xs text-[#dc2626] font-medium mt-1">
            Excluded from matrix
          </div>
        </div>

        {/* Card 3: Canceled (Warm Cognac Amber) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs relative overflow-hidden">
          {/* Small Accent Bar (Small accent bar) */}
          <div className="w-8 h-1 rounded-full bg-[#c26d38] mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#c26d38] uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
              <span>Canceled</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#fffbeb] text-[#92400e] border border-[#fde68a]">
              2.7%
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#b45309] mt-2 tabular-nums">
            32
          </div>
          <div className="text-xs text-[#b45309] font-medium mt-1">
            Zero basket contribution
          </div>
        </div>

        {/* Card 4: Pending (Indigo Cobalt) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-2xs relative overflow-hidden">
          {/* Small Accent Bar (Small accent bar) */}
          <div className="w-8 h-1 rounded-full bg-[#4f46e5] mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#4f46e5] uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#6366f1]" />
              <span>Pending</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#eef2ff] text-[#3730a3] border border-[#c7d2fe]">
              Queue
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191c1b] mt-2 tabular-nums">
            0
          </div>
          <div className="text-xs text-[#4f46e5] font-medium mt-1">
            No pipeline backlog
          </div>
        </div>
      </div>

      {/* Middle Section: Upload Transaction File & API Source */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left (2 Cols): Upload Transaction File */}
        <div className="lg:col-span-2 bg-white border border-[#E7E2D8] rounded-xl p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#191c1b]">
              Upload Transaction File
            </h2>
            <p className="text-xs text-[#6d7974] mt-0.5">
              CSV / Excel (.csv, .xlsx) · File import is the primary data source
            </p>

            <div className="mt-4 p-5 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-lg bg-[#eaf0eb] text-[#1e3a2f] flex items-center justify-center mb-2">
                <FileText className="w-5 h-5" />
              </div>
              <div className="font-semibold text-sm text-[#191c1b] flex items-center gap-2">
                <span className="font-mono">{selectedFile}</span>
                <span className="text-[#1e3a2f]">· Ready to import</span>
              </div>
              <div className="text-xs text-[#6d7974] mt-1">
                1,200 records detected · 2.6 MB
              </div>
              <button 
                onClick={() => {
                  const name = prompt('Select filename for simulation:', 'sales_q3_2026.csv');
                  if (name) setSelectedFile(name);
                }}
                className="mt-3 text-xs font-semibold text-[#1e3a2f] hover:underline cursor-pointer"
              >
                Choose another file
              </button>
            </div>
          </div>
        </div>

        {/* Right (1 Col): API Source */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#191c1b]">
                API Source
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f6ece9] text-[#6d7974] font-medium border border-[#E7E2D8]">
                Not configured
              </span>
            </div>
            <p className="text-xs text-[#6d7974] mt-3 leading-relaxed">
              Transactions from an external API appear here only after a System Admin has set up the connection in S03.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E7E2D8]">
            <button
              onClick={() => onNavigate('api-connections')}
              className="text-xs font-semibold text-[#1e3a2f] hover:text-[#294d3f] flex items-center gap-1.5 cursor-pointer"
            >
              <span>Request integration setup</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Import History & Transaction Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Import History (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-[#E7E2D8] rounded-xl shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E7E2D8] bg-[#FAF8F5]">
            <h2 className="text-sm font-semibold text-[#191c1b]">Import History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#89938f] text-[10px] font-bold uppercase tracking-wider border-b border-[#E7E2D8]">
                <tr>
                  <th className="py-3 px-4">BATCH</th>
                  <th className="py-3 px-4">FILENAME</th>
                  <th className="py-3 px-4">RECORDS</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2D8]/60">
                <tr className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-[#191c1b]">
                    #B-024
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#6d7974]">
                    sales_q3_2026.csv
                  </td>
                  <td className="py-3.5 px-4 tabular-nums text-[#191c1b]">
                    1,200
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                      Completed
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button 
                      onClick={() => onNavigate('store-validation-issues')}
                      className="font-semibold text-[#1e3a2f] hover:underline cursor-pointer"
                    >
                      View →
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-[#191c1b]">
                    #B-023
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#6d7974]">
                    sept_sales.xlsx
                  </td>
                  <td className="py-3.5 px-4 tabular-nums text-[#191c1b]">
                    850
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                      Completed
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button 
                      onClick={() => onNavigate('store-validation-issues')}
                      className="font-semibold text-[#1e3a2f] hover:underline cursor-pointer"
                    >
                      View →
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-[#fcedea]/30 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-[#191c1b]">
                    #B-022
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#6d7974]">
                    aug_sales.csv
                  </td>
                  <td className="py-3.5 px-4 tabular-nums text-[#191c1b]">
                    640
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                      Needs review
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onNavigate('store-validation-issues')}
                      className="font-bold text-[#ba1a1a] hover:underline cursor-pointer"
                    >
                      Issues →
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Transaction Preview (1 Col) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E7E2D8] bg-[#FAF8F5]">
            <h2 className="text-sm font-semibold text-[#191c1b]">Transaction Preview</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#89938f] text-[10px] font-bold uppercase tracking-wider border-b border-[#E7E2D8]">
                <tr>
                  <th className="py-3 px-4">TXN ID</th>
                  <th className="py-3 px-4">ORDER STATUS</th>
                  <th className="py-3 px-4 text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2D8]/60">
                <tr className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="py-3.5 px-4 font-mono text-[#6d7974]">
                    TX-1001
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                      Accepted
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold tabular-nums text-[#191c1b]">
                    120,000
                  </td>
                </tr>
                <tr className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="py-3.5 px-4 font-mono text-[#6d7974]">
                    TX-1002
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fffbeb] text-[#92400e] border border-[#fde68a]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                      Canceled
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold tabular-nums text-[#191c1b]">
                    45,000
                  </td>
                </tr>
                <tr className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="py-3.5 px-4 font-mono text-[#6d7974]">
                    TX-1003
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                      Rejected
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-[#89938f]">
                    —
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Info Status Bar */}
      <div className="p-4 rounded-xl bg-[#eaf0eb]/80 border border-[#1e3a2f]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 rounded-md bg-[#1e3a2f] text-white font-semibold text-[11px]">
            File ready for import
          </span>
          <span className="text-[#191c1b] font-medium">
            Review the selected file, then start preprocessing.
          </span>
        </div>

        <button
          onClick={() => onNavigate('store-validation-issues')}
          className="text-xs font-semibold text-[#1e3a2f] hover:underline cursor-pointer flex items-center gap-1 self-end sm:self-auto"
        >
          <span>Run Preprocessing</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
