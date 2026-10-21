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
  ShoppingBag,
  Sparkles,
  Layers,
  Cpu,
  UserCheck,
  AlertCircle,
  Radio,
  LayoutGrid,
  Settings,
  Filter,
  Search
} from 'lucide-react';
import { ActiveNavScreen } from '../../types/mining';
import { AuthUser } from '../../services/authService';
import { AppLogo } from '../common/AppLogo';
import { AvatarDropdown } from '../common/AvatarDropdown';

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
  const [searchQuery, setSearchQuery] = useState('');

  const role = currentUser?.role || 'Store Admin';
  const isSystemAdmin = role === 'System Admin';
  const isStoreAdmin = role === 'Store Admin';
  const isMerchandiser = role === 'Merchandiser';
  const isCustomer = role === 'End-Customer';

  // Dynamic time-based greeting (Chào đúng giờ)
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Full name & First name (Đúng tên người dùng)
  const fullName = currentUser?.name || (isStoreAdmin ? 'Lan Nguyen' : isSystemAdmin ? 'Kenji Takahashi' : isMerchandiser ? 'Minh Tran' : 'Quynh Le');
  const firstName = fullName.split(' ')[0];

  // Specific role title (Đúng role)
  const displayRole = currentUser?.department || (
    isStoreAdmin 
      ? 'Store Operations Manager' 
      : isSystemAdmin 
        ? 'System Administrator' 
        : isMerchandiser 
          ? 'Senior Merchandiser' 
          : 'Customer Representative'
  );

  return (
    <div className="min-h-screen w-full bg-[#FAF8F5] text-[#191C1B] flex flex-col md:flex-row font-sans selection:bg-[#1E3A2F] selection:text-white antialiased">
      {/* Structural Sidebar - Sticky top-0 and full viewport height */}
      <aside className="w-full md:w-[260px] h-screen bg-[#FAF8F5] border-r border-[#E7E2D8] flex flex-col justify-between shrink-0 sticky top-0 z-30 shadow-[1px_0_4px_rgba(41,37,36,0.02)]" data-purpose="sidebar">
        <div className="flex-1 overflow-y-auto">
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
            {isMerchandiser && false && (
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
                  <li>
                    <button onClick={() => onNavigate('f03-utility')} className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${currentScreen === 'f03-utility' ? 'bg-[#1E3A2F] text-white font-medium' : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'}`}>
                      <SlidersHorizontal className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'f03-utility' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Utility Configuration</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {isMerchandiser && (
              <div>
                <div className="px-3.5 mb-2"><span className="text-[11px] font-bold tracking-wider text-[#707973] uppercase">MERCHANDISER</span></div>
                <ul className="space-y-1" role="list">
                  <li>
                    <button onClick={() => onNavigate('f03-utility' as ActiveNavScreen)} className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${currentScreen.startsWith('f03-') ? 'bg-[#1E3A2F] text-white font-medium' : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'}`}>
                      <SlidersHorizontal className={`w-4 h-4 mr-3 shrink-0 ${currentScreen.startsWith('f03-') ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Utility Planner</span>
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
                      onClick={() => onNavigate('store-categories')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'store-categories'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <Layers className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'store-categories' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Categories</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onNavigate('store-batches')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'store-batches'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <ShoppingBag className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'store-batches' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Inventory Batches</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onNavigate('f03-product-scores')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${currentScreen === 'f03-product-scores' ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]' : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'}`}
                    >
                      <SlidersHorizontal className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'f03-product-scores' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Product Scores</span>
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
                  <li>
                    <button
                      onClick={() => onNavigate('f03-configuration')}
                      className={`w-full flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-all text-left cursor-pointer ${
                        currentScreen === 'f03-configuration'
                          ? 'bg-[#1E3A2F] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)]'
                          : 'text-[#57534E] hover:bg-[#F5ECE8] hover:text-[#191C1B]'
                      }`}
                    >
                      <SlidersHorizontal className={`w-4 h-4 mr-3 shrink-0 ${currentScreen === 'f03-configuration' ? 'text-white' : 'text-[#707973]'}`} />
                      <span>Lambda Policy</span>
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
              {currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} alt="Profile avatar" className="h-full w-full rounded-lg object-cover" /> : (currentUser?.avatarText || (isStoreAdmin ? 'SA' : isSystemAdmin ? 'KT' : isMerchandiser ? 'ME' : 'CU'))}
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
        {/* Top Header - Sticky at top */}
        <header className="h-16 px-6 md:px-8 border-b border-[#E7E2D8] bg-[#FAF8F5]/98 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-[0_1px_4px_rgba(41,37,36,0.04)] transition-all" data-purpose="top-navigation-bar">
          {/* Left: Dynamic Time Greeting + User Name + Role Title */}
          <div className="flex flex-col justify-center min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-[#191C1B] tracking-tight leading-tight flex items-center gap-1.5 truncate">
              <span>{getGreeting()}, {firstName}!</span>
            </h2>
            <span className="text-[11px] font-medium text-[#707973] truncate leading-tight mt-0.5">
              {displayRole}
            </span>
          </div>

          {/* Center: Quick Search Bar */}
          <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md mx-3 sm:mx-6 hidden sm:block">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-3.5 pr-9 text-xs bg-white text-[#191C1B] border border-[#E7E2D8] rounded-xl focus:outline-none focus:border-[#1E3A2F] focus:ring-1 focus:ring-[#1E3A2F]/20 transition-all placeholder:text-[#8C857B] shadow-2xs font-normal"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-3 flex items-center text-[#8C857B] hover:text-[#191C1B] cursor-pointer text-xs"
                >
                  ✕
                </button>
              ) : (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#8C857B]">
                  <Search className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center space-x-3 shrink-0">
            {/* Notification bell */}
            <button 
              className="p-2 rounded-lg hover:bg-[#F5ECE8] text-[#707973] relative cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#BA1A1A] rounded-full"></span>
            </button>

            <AvatarDropdown user={currentUser} onProfile={() => onNavigate('profile')} onLogout={onLogout} />
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
