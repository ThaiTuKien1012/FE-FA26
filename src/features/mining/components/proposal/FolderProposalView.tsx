import React, { useState } from 'react';
import { 
  FolderTree, 
  Layers, 
  Cpu, 
  ShieldCheck, 
  Copy, 
  Check, 
  ArrowRight
} from 'lucide-react';
import { ActiveNavScreen } from '../../../../types/mining';

interface FolderProposalViewProps {
  onNavigate: (screen: ActiveNavScreen) => void;
}

export const FolderProposalView: React.FC<FolderProposalViewProps> = ({ onNavigate }) => {
  const [copied, setCopied] = useState(false);

  const folderStructureText = `src/
├── app/                          # App root setup, routes, Global Providers
│   ├── routes.tsx                # Route definitions (Overview, Setup, Results, Failure, Benchmark)
│   └── providers/                # QueryClientProvider, ToastProvider, AuthContext
│
├── assets/                       # Static brand assets (icons, logo SVGs, illustrations)
│
├── components/                   # Shared UI building blocks (Cross-cutting components)
│   ├── layout/                   # App shell layout components
│   │   ├── AppLayout.tsx         # Sidebar 260px, Header, Breadcrumbs, System Admin footer
│   │   ├── Header.tsx            # Breadcrumb nav, Notification bell, User avatar
│   │   └── Sidebar.tsx           # Navigation items (Overview, Mining Setup, Benchmark, etc.)
│   └── ui/                       # Reusable UI primitives (Nordic Atelier design tokens)
│       ├── Button.tsx            # Primary pine (#1E3A2F), Secondary outline, Danger buttons
│       ├── Badge.tsx             # Semantic pills (Completed #eaf0eb, Failed #ffdad6, Running)
│       ├── Card.tsx              # Surface containers (#ffffff, border #e9e1df)
│       ├── Input.tsx             # Number/Text inputs with hairline borders (#c1c8c3)
│       ├── Select.tsx            # Custom styled dropdown selectors
│       ├── Modal.tsx             # Dialog frame with charcoal backdrop blur
│       └── MetricCard.tsx        # KPI cards (accent stripe, large tabular numbers)
│
├── features/                     # ⭐ CORE DOMAIN: Divided by Feature / Vertical Slice
│   │
│   ├── mining/                   # [F01] High-Utility Mining Service Operations
│   │   ├── api/                  # miningApi.ts, benchmarkApi.ts
│   │   ├── components/           # overview/, setup/, results/, failure/, benchmark/
│   │   ├── hooks/                # useMiningJobs, useMiningRunner, useBenchmarkRunner
│   │   ├── types/                # MiningJob, HighUtilityItemset, BenchmarkComparison
│   │   └── utils/                # matrixValidator, formatters, logParser
│   │
│   ├── store/                    # [F02] Store Operations (Product & Inventory, POS, Campaigns)
│   │   ├── components/           # ProductInventoryView.tsx, EditProductView.tsx, StoreReportsView.tsx
│   │   ├── hooks/                # useInventory.ts, useTransactions.ts, useCampaigns.ts
│   │   ├── types/                # ProductItem, ProductCategory, InventoryStats
│   │   └── utils/                # stockAlerts, priceFormatters
│   ├── users/                    # [F04 - RBAC] User Accounts & Role Permissions
│   │   ├── components/           # UsersRolesView.tsx, UserTable, AddUserModal, EditRoleModal
│   │   ├── hooks/                # useUsers.ts, useRolePermissions.ts
│   │   └── types/                # UserAccount, SystemRole, UserStatus
│   │
│   └── integrations/             # [F05 - Ingestion] API Connections & Data Import
│       ├── components/           # ApiConnectionsView.tsx, ConnectionList, MappingModal
│       ├── hooks/                # useApiConnections.ts, useFieldMapping.ts
│       └── types/                # ApiConnection, HttpMethod, CsvMappingField
│
├── mocks/                        # Mock datasets for dev & preview (Sales Q3, Store inventory)
│   ├── miningData.ts
│   └── storeInventoryData.ts
│
└── utils/                        # Shared global utilities (date-fns, number format)`;

  const handleCopy = () => {
    navigator.clipboard.writeText(folderStructureText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#954a17] uppercase tracking-wider mb-1">
          <span>SYSTEM ARCHITECTURE</span>
          <span>•</span>
          <span>FEATURE-BASED / VERTICAL SLICE ARCHITECTURE</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#161d19]">
          Proposed Architecture &amp; Folder Structure (Flow F01)
        </h1>
        <p className="text-sm text-[#424844] mt-1.5 max-w-4xl">
          F01 - SYSTEM ADMIN: Prepare and operate the High-Utility Itemset Mining service (HUI-Miner &amp; EFIM). 
          Below is the specialized module structure designed following Enterprise React + TypeScript standards, optimized for isolation, scalability, and maintainability.
        </p>
      </div>

      {/* Screen Mapping Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div 
          onClick={() => onNavigate('overview')}
          className="p-3.5 bg-white border border-[#e6e1d8] hover:border-[#1E3A2F] rounded-lg cursor-pointer transition-all shadow-xs group"
        >
          <div className="text-[10px] font-bold text-[#8c857b] uppercase">SCREEN 1 (S01)</div>
          <div className="text-xs font-semibold text-[#1e1b1a] group-hover:text-[#c26d38] mt-1">
            Mining Overview
          </div>
          <div className="text-[11px] text-[#8c857b] mt-1">Overall monitoring &amp; execution history</div>
          <span className="text-[10px] font-medium text-[#1E3A2F] group-hover:underline mt-2 inline-flex items-center gap-1">
            View screen <ArrowRight className="w-3 h-3" />
          </span>
        </div>

        <div 
          onClick={() => onNavigate('setup')}
          className="p-3.5 bg-white border border-[#e6e1d8] hover:border-[#1E3A2F] rounded-lg cursor-pointer transition-all shadow-xs group"
        >
          <div className="text-[10px] font-bold text-[#8c857b] uppercase">SCREEN 2 (S02)</div>
          <div className="text-xs font-semibold text-[#1e1b1a] group-hover:text-[#c26d38] mt-1">
            Mining Setup
          </div>
          <div className="text-[11px] text-[#8c857b] mt-1">Algorithm configuration &amp; minUtil</div>
          <span className="text-[10px] font-medium text-[#1E3A2F] group-hover:underline mt-2 inline-flex items-center gap-1">
            View screen <ArrowRight className="w-3 h-3" />
          </span>
        </div>

        <div 
          onClick={() => onNavigate('results')}
          className="p-3.5 bg-white border border-[#e6e1d8] hover:border-[#1E3A2F] rounded-lg cursor-pointer transition-all shadow-xs group"
        >
          <div className="text-[10px] font-bold text-[#8c857b] uppercase">SCREEN 3 (S05)</div>
          <div className="text-xs font-semibold text-[#1e1b1a] group-hover:text-[#c26d38] mt-1">
            Run Results (#0024)
          </div>
          <div className="text-[11px] text-[#8c857b] mt-1">128 itemsets &amp; runtime metrics</div>
          <span className="text-[10px] font-medium text-[#1E3A2F] group-hover:underline mt-2 inline-flex items-center gap-1">
            View screen <ArrowRight className="w-3 h-3" />
          </span>
        </div>

        <div 
          onClick={() => onNavigate('failure')}
          className="p-3.5 bg-white border border-[#f5d5cc] hover:border-[#ba1a1a] rounded-lg cursor-pointer transition-all shadow-xs group bg-[#fcedea]/40"
        >
          <div className="text-[10px] font-bold text-[#9a3412] uppercase">SCREEN 4 (S07)</div>
          <div className="text-xs font-semibold text-[#9a3412] mt-1">
            Failure &amp; Retry (#0025)
          </div>
          <div className="text-[11px] text-[#8c857b] mt-1">Failure recovery &amp; terminal logs</div>
          <span className="text-[10px] font-medium text-[#9a3412] group-hover:underline mt-2 inline-flex items-center gap-1">
            View screen <ArrowRight className="w-3 h-3" />
          </span>
        </div>

        <div 
          onClick={() => onNavigate('benchmark')}
          className="p-3.5 bg-white border border-[#e6e1d8] hover:border-[#1E3A2F] rounded-lg cursor-pointer transition-all shadow-xs group"
        >
          <div className="text-[10px] font-bold text-[#8c857b] uppercase">SCREEN 5 (S06)</div>
          <div className="text-xs font-semibold text-[#1e1b1a] group-hover:text-[#c26d38] mt-1">
            Benchmark
          </div>
          <div className="text-[11px] text-[#8c857b] mt-1">HUI-Miner vs EFIM benchmark</div>
          <span className="text-[10px] font-medium text-[#1E3A2F] group-hover:underline mt-2 inline-flex items-center gap-1">
            View screen <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* Code Tree Block */}
      <div className="bg-[#1E3A2F] rounded-lg border border-[#1e3a2f] shadow-lg overflow-hidden">
        <div className="px-5 py-3.5 bg-[#032017] border-b border-[#1e3a2f] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-[#86a496]">
            <FolderTree className="w-4 h-4 text-[#ff9e65]" />
            <span className="text-white font-semibold">Proposed Project Tree Structure</span>
          </div>

          <button
            onClick={handleCopy}
            className="px-3 py-1 bg-[#1e3a2f] hover:bg-[#486458] text-white text-xs font-medium rounded flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Project Tree'}</span>
          </button>
        </div>

        <pre className="p-5 font-mono text-xs text-[#eff5ef] overflow-x-auto leading-relaxed max-h-[500px] selection:bg-[#ff9e65] selection:text-black">
          {folderStructureText}
        </pre>
      </div>

      {/* Deep Architectural Explanations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-[#e9e1df] rounded-lg p-5 shadow-xs space-y-3">
          <div className="w-8 h-8 rounded bg-[#eaf0eb] border border-[#86a496] flex items-center justify-center text-[#1e3a2f]">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-[#161d19]">
            1. Feature Slice Modularity
          </h3>
          <p className="text-xs text-[#424844] leading-relaxed">
            All business logic for flow F01 is cleanly isolated within <code className="bg-[#f5ecea] px-1 py-0.5 rounded font-mono text-[#1E3A2F]">features/mining/</code>. 
            Each sub-screen (Overview S01, Setup S02, Results S05, Failure S07, Benchmark S06) owns a dedicated component folder, preventing monolithic files and state pollution.
          </p>
        </div>

        <div className="bg-white border border-[#e9e1df] rounded-lg p-5 shadow-xs space-y-3">
          <div className="w-8 h-8 rounded bg-[#ffdbc9] border border-[#ffb68d] flex items-center justify-center text-[#954a17]">
            <Cpu className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-[#161d19]">
            2. Separation of State &amp; API Hooks
          </h3>
          <p className="text-xs text-[#424844] leading-relaxed">
            Background mining jobs undergo complex state transitions (Pending, Running, Completed, Failed). 
            The <code className="bg-[#f5ecea] px-1 py-0.5 rounded font-mono text-[#1E3A2F]">useMiningRunner</code> hook manages polling and job tracking, while <code className="bg-[#f5ecea] px-1 py-0.5 rounded font-mono text-[#1E3A2F]">useMiningForm</code> enforces threshold validation (<code className="font-mono">minUtil &gt; 0</code>) and utility matrix verification.
          </p>
        </div>

        <div className="bg-white border border-[#e9e1df] rounded-lg p-5 shadow-xs space-y-3">
          <div className="w-8 h-8 rounded bg-[#f5ecea] border border-[#c1c8c3] flex items-center justify-center text-[#424844]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-[#161d19]">
            3. Failure Recovery &amp; Diagnostics (S07)
          </h3>
          <p className="text-xs text-[#424844] leading-relaxed">
            The error handling module <code className="bg-[#f5ecea] px-1 py-0.5 rounded font-mono text-[#1E3A2F]">components/failure/</code> is cleanly decoupled with terminal diagnostic logs, allowing System Administrators to inspect matrix issues immediately without exposing credentials or internal secrets.
          </p>
        </div>
      </div>
    </div>
  );
};
