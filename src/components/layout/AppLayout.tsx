import React, { useState } from 'react';
import { 
  ArrowLeftRight, 
  Megaphone, 
  Package, 
  FileBarChart, 
  BarChart3, 
  BarChart2, 
  Bell, 
  LayoutDashboard, 
  Settings2, 
  Zap, 
  Users, 
  Store,
  CheckCircle2,
  Flag,
  SlidersHorizontal,
  LogOut,
  ChevronDown,
  ShoppingBag,
  Sparkles,
  Layers,
  Cpu,
  UserCheck,
  AlertCircle,
  Radio,
  LayoutGrid,
  Settings,
  Filter
} from 'lucide-react';
import { ActiveNavScreen } from '../../types/mining';
import { AuthUser, MOCK_ACCOUNTS } from '../../services/authService';
import { AppLogo } from '../common/AppLogo';

interface AppLayoutProps {
  currentScreen: ActiveNavScreen;
  onNavigate: (screen: ActiveNavScreen, runId?: string) => void;
  activeRunId?: string;
  breadcrumbs: string[];
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onSwitchRole?: (roleKey: 'store-admin' | 'system-admin' | 'merchandiser' | 'customer') => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentScreen,
  onNavigate,
  breadcrumbs,
  currentUser,
  onLogout,
  onSwitchRole,
  children
}) => {
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const role = currentUser?.role || 'Store Admin';
  const isSystemAdmin = role === 'System Admin';
  const isStoreAdmin = role === 'Store Admin';
  const isMerchandiser = role === 'Merchandiser';
  const isCustomer = role === 'End-Customer';

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#191C1B] flex flex-col md:flex-row font-sans selection:bg-[#1E3A2F] selection:text-white antialiased">
      {/* Structural Sidebar - 260px fixed width */}
      <aside className="w-full md:w-[260px] bg-[#FAF8F5] border-r border-[#E7E2D8] flex flex-col justify-between shrink-0 min-h-screen sticky top-0 z-20" data-purpose="sidebar">
        <div className="overflow-y-auto max-h-[calc(100vh-90px)]">
          {/* Brand Header: HUPM Synchronized 4-Tile Logo */}
          <div className="p-5 border-b border-[#E7E2D8] flex items-center space-x-3.5" data-purpose="brand-logo">
            <div className="shrink-0 flex items-center justify-center">
              <AppLogo className="w-11 h-11" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold tracking-tight text-[#191C1B] leading-tight truncate">
                HUPM
              </span>
              <span className="text-[10px] font-medium tracking-[0.08em] text-[#707973] uppercase truncate mt-0.5">
                Analytics Platform
              </span>
            </div>
          </div>

          {/* Navigation Section with Unified Color Scheme Across All Roles */}
          <nav className="px-3 py-4 space-y-5" aria-label="Main Navigation">
            {/* Role 1: Merchandiser Navigation - Only this single Recommendations page */}
            {isMerchandiser && (
              <div>
                <div className="px-3.5 mb-2">
                  <span className="text-[11px] font-bold tracking-wider text-[#707973] uppercase">
                    MERCHANDISER
                  </span>
                </div>
                <ul className="space-y-1" role="list">
                  <li>
                    <button
                      onClick={() => onNavigate('merchandiser-recommendations')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'merchandiser-recommendations'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <Sparkles className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'merchandiser-recommendations' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Recommendations</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onNavigate('merchandiser-approve')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'merchandiser-approve'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <CheckCircle2 className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'merchandiser-approve' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Approve Group</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onNavigate('merchandiser-campaign-draft')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'merchandiser-campaign-draft'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <Megaphone className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'merchandiser-campaign-draft' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Campaign Drafts</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onNavigate('merchandiser-campaign-status')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'merchandiser-campaign-status'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <Flag className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'merchandiser-campaign-status' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Published / Waiting</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onNavigate('merchandiser-utility-profile')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'merchandiser-utility-profile'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <SlidersHorizontal className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'merchandiser-utility-profile' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Utility Profile</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onNavigate('merchandiser-refine-criteria')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'merchandiser-refine-criteria'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <Filter className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'merchandiser-refine-criteria' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Refine Criteria</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onNavigate('merchandiser-ab-simulation')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'merchandiser-ab-simulation' || currentScreen === 'merchandiser-compare-simulation' || currentScreen === 'merchandiser-keep-layout-a'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <BarChart2 className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'merchandiser-ab-simulation' || currentScreen === 'merchandiser-compare-simulation' || currentScreen === 'merchandiser-keep-layout-a' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>A/B Simulation</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {/* Role 2: Store Admin Navigation */}
            {isStoreAdmin && (
              <div>
                <div className="px-3.5 mb-2">
                  <span className="text-[11px] font-bold tracking-wider text-[#707973] uppercase">
                    STORE ADMIN
                  </span>
                </div>
                <ul className="space-y-1" role="list">
                  <li>
                    <button
                      onClick={() => onNavigate('store-inventory')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'store-inventory' || currentScreen === 'store-edit-product'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <Package className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'store-inventory' || currentScreen === 'store-edit-product' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Products &amp; Inventory</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onNavigate('store-campaigns')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'store-campaigns'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <Megaphone className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'store-campaigns' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Campaign Activation Review</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onNavigate('store-transactions')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'store-transactions'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <ArrowLeftRight className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'store-transactions' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Transactions</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onNavigate('store-validation-issues')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'store-validation-issues'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <AlertCircle className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'store-validation-issues' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Validation Issues</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onNavigate('store-reports')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'store-reports'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <BarChart3 className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'store-reports' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Reports</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onNavigate('store-ab-report')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'store-ab-report'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <FileBarChart className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'store-ab-report' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>A/B Test Report</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {/* Role 3: System Admin Navigation */}
            {isSystemAdmin && (
              <div>
                <div className="px-3.5 mb-2">
                  <span className="text-[11px] font-bold tracking-wider text-[#707973] uppercase">
                    SYSTEM ADMIN
                  </span>
                </div>
                <ul className="space-y-1" role="list">
                  <li>
                    <button
                      onClick={() => onNavigate('overview')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'overview'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <LayoutGrid className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'overview' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Overview</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onNavigate('setup')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'setup' || currentScreen === 'results' || currentScreen === 'failure'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <Settings className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'setup' || currentScreen === 'results' || currentScreen === 'failure' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Mining Setup</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onNavigate('benchmark')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'benchmark'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <BarChart3 className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'benchmark' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Benchmark</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onNavigate('users')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'users'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <Users className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'users' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Users &amp; Roles</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onNavigate('api-connections')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'api-connections'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <Zap className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'api-connections' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>API Connections</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {/* Role 4: Customer Navigation */}
            {isCustomer && (
              <div>
                <div className="px-3.5 mb-2">
                  <span className="text-[11px] font-bold tracking-wider text-[#707973] uppercase">
                    CUSTOMER
                  </span>
                </div>
                <ul className="space-y-1">
                  <li>
                    <button
                      onClick={() => onNavigate('customer-storefront')}
                      className="w-full flex items-center px-3.5 py-2.5 text-sm font-medium rounded-xl bg-[#1E3A2F] text-white cursor-pointer shadow-[0_1px_3px_rgba(41,37,36,0.08)]"
                    >
                      <ShoppingBag className="w-4 h-4 mr-3 shrink-0 text-white" />
                      <span>Storefront Kiosk</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </nav>
        </div>

        {/* User Account Footer with Logout / Switch Role */}
        <div className="p-4 border-t border-[#E7E2D8] bg-[#FAF8F5] flex items-center justify-between shrink-0" data-purpose="user-profile-badge">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#1E3A2F] text-white flex items-center justify-center font-bold text-xs tracking-wider shrink-0 shadow-[0_1px_3px_rgba(41,37,36,0.08)]">
              {currentUser?.avatarText || (isStoreAdmin ? 'SA' : isSystemAdmin ? 'KT' : isMerchandiser ? 'ME' : 'CU')}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#191C1B] truncate leading-tight">
                {currentUser?.name || (isStoreAdmin ? 'Lan Nguyen' : isSystemAdmin ? 'Kenji T.' : isMerchandiser ? 'Minh Tran' : 'Quynh Le')}
              </p>
              <p className="text-[11px] text-[#707973] truncate leading-tight mt-0.5">
                {currentUser?.department || (isMerchandiser ? 'Retail Planner' : (currentUser?.role || role))}
              </p>
            </div>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-[#8C857B] hover:text-[#BA1A1A] hover:bg-[#FDF3F2] transition-colors cursor-pointer"
              title="Sign Out / Switch Role"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Header */}
        <header className="h-16 px-6 md:px-8 border-b border-[#E7E2D8] bg-[#FAF8F5]/95 backdrop-blur-xs flex items-center justify-between shrink-0 sticky top-0 z-10" data-purpose="top-navigation-bar">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs font-medium text-[#707973] overflow-x-auto">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-[#E7E2D8]">/</span>}
                  <span className={isLast ? 'text-[#191C1B] font-semibold truncate' : 'hover:text-[#191C1B] cursor-pointer transition-colors truncate'}>
                    {crumb}
                  </span>
                </React.Fragment>
              );
            })}
          </nav>

          {/* Top Right Controls & Role Switcher */}
          <div className="flex items-center space-x-3 shrink-0">
            {/* Quick Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#E7E2D8] hover:border-[#1E3A2F] text-xs font-semibold text-[#191C1B] shadow-[0_1px_3px_rgba(41,37,36,0.04)] transition-colors cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-[#1E3A2F]" />
                <span className="hidden sm:inline">Role:</span>
                <span className="font-bold text-[#1E3A2F]">{currentUser?.role || role}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#707973]" />
              </button>

              {/* Dropdown Menu */}
              {isRoleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-[#E7E2D8] shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 text-xs">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-[#8C857B] uppercase tracking-wider border-b border-[#E7E2D8]/80">
                    Switch Mock Account
                  </div>
                  
                  {onSwitchRole && (
                    <>
                      <button
                        onClick={() => {
                          setIsRoleDropdownOpen(false);
                          onSwitchRole('store-admin');
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[#FAF8F5] cursor-pointer ${
                          isStoreAdmin ? 'bg-[#E5F3EB] font-bold text-[#1E3A2F]' : 'text-[#191C1B]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Store className="w-3.5 h-3.5 text-[#1E3A2F]" />
                          <span>Store Admin</span>
                        </div>
                        <span className="text-[10px] text-[#8C857B]">Lan Nguyen</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsRoleDropdownOpen(false);
                          onSwitchRole('system-admin');
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[#FAF8F5] cursor-pointer ${
                          isSystemAdmin ? 'bg-[#E5F3EB] font-bold text-[#1E3A2F]' : 'text-[#191C1B]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Cpu className="w-3.5 h-3.5 text-[#1E3A2F]" />
                          <span>System Admin</span>
                        </div>
                        <span className="text-[10px] text-[#8C857B]">Kenji T.</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsRoleDropdownOpen(false);
                          onSwitchRole('merchandiser');
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[#FAF8F5] cursor-pointer ${
                          isMerchandiser ? 'bg-[#E5F3EB] font-bold text-[#1E3A2F]' : 'text-[#191C1B]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-[#954A17]" />
                          <span>Merchandiser</span>
                        </div>
                        <span className="text-[10px] text-[#8C857B]">Minh Tran</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsRoleDropdownOpen(false);
                          onSwitchRole('customer');
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[#FAF8F5] cursor-pointer ${
                          isCustomer ? 'bg-[#E5F3EB] font-bold text-[#1E3A2F]' : 'text-[#191C1B]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-3.5 h-3.5 text-[#BA1A1A]" />
                          <span>Customer Kiosk</span>
                        </div>
                        <span className="text-[10px] text-[#8C857B]">Quynh Le</span>
                      </button>
                    </>
                  )}

                  {onLogout && (
                    <div className="pt-1 mt-1 border-t border-[#E7E2D8]/80">
                      <button
                        onClick={() => {
                          setIsRoleDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full px-3 py-2 text-left flex items-center gap-2 text-[#BA1A1A] hover:bg-[#FDF3F2] cursor-pointer font-semibold"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out to Login Page</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notification bell */}
            <button 
              className="p-2 rounded-lg hover:bg-[#F5ECE8] text-[#707973] relative cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#BA1A1A] rounded-full"></span>
            </button>

            {/* User Avatar */}
            <div 
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="w-8 h-8 rounded-full bg-[#1E3A2F] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-[0_1px_3px_rgba(41,37,36,0.08)] cursor-pointer hover:bg-[#25473A] transition-colors"
              title="Click to switch role"
            >
              {currentUser?.avatarText || (isStoreAdmin ? 'SA' : isSystemAdmin ? 'KT' : isMerchandiser ? 'ME' : 'CU')}
            </div>
          </div>
        </header>

        {/* Viewport Content Container */}
        <main className="flex-1 p-5 md:p-8 max-w-7xl w-full mx-auto pb-16">
          {children}
        </main>
      </div>
    </div>
  );
};
