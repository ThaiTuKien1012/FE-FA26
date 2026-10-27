import React from 'react';
import {
  Package, BarChart3, Bell, SlidersHorizontal, LogOut, ShoppingBag, Users, Zap,
  Layers, LayoutGrid, Settings, Upload, History, ReceiptText,
  type LucideIcon
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

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <div className="mb-2 rounded-md border-0 bg-[#EDF5F0] px-3 py-2">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] leading-4 text-[#1E3A2F]">{title}</h3>
      </div>
      <ul className="space-y-1" role="list">{children}</ul>
    </section>
  );
}

interface SidebarItemProps {
  screen: ActiveNavScreen;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate: (screen: ActiveNavScreen) => void;
}

function SidebarItem({ screen, label, icon: Icon, active, onNavigate }: SidebarItemProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onNavigate(screen)}
        aria-current={active ? 'page' : undefined}
        className={`w-full min-w-0 h-11 flex items-center px-3.5 text-sm rounded-xl border-0 transition-all text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A2F] ${active
          ? 'bg-[#356B54] text-white font-medium shadow-[0_1px_3px_rgba(41,37,36,0.08)] hover:bg-[#2D604A]'
          : 'bg-transparent text-[#57534E] hover:bg-[#F3F7F4] hover:text-[#1E3A2F]'}`}
      >
        <Icon aria-hidden="true" className={`w-4 h-4 mr-3 shrink-0 ${active ? 'text-white' : 'text-[#7A827D]'}`} />
        <span className="min-w-0">{label}</span>
      </button>
    </li>
  );
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
        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]">
          {/* Brand Header: HUPM Synchronized 4-Tile Logo */}
          <div className="p-5 md:h-20 md:py-0 border-b border-[#E7E2D8] flex items-center space-x-3.5" data-purpose="brand-logo">
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

          {/* Navigation groups organize the existing screens without changing role permissions. */}
          <nav className="min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-5" aria-label="Main Navigation">
            {isMerchandiser && (
              <>
                <SidebarSection title="PRODUCT ANALYTICS">
                  <SidebarItem screen="f03-utility" label="Utility Planner" icon={SlidersHorizontal} active={currentScreen.startsWith('f03-')} onNavigate={onNavigate} />
                  <SidebarItem screen="f05-mining" label="High Utility Mining" icon={BarChart3} active={currentScreen === 'f05-mining'} onNavigate={onNavigate} />
                </SidebarSection>
                <SidebarSection title="TRANSACTION REVIEW">
                  <SidebarItem screen="f04-import-history" label="Import History" icon={History} active={currentScreen === 'f04-import-history'} onNavigate={onNavigate} />
                  <SidebarItem screen="f04-transactions" label="Sales Transactions" icon={ReceiptText} active={currentScreen === 'f04-transactions'} onNavigate={onNavigate} />
                </SidebarSection>
              </>
            )}

            {isStoreAdmin && (
              <>
                <SidebarSection title="CATALOG & INVENTORY">
                  <SidebarItem screen="store-categories" label="Categories" icon={Layers} active={currentScreen === 'store-categories'} onNavigate={onNavigate} />
                  <SidebarItem screen="store-inventory" label="Products" icon={Package} active={currentScreen === 'store-inventory' || currentScreen === 'store-edit-product'} onNavigate={onNavigate} />
                  <SidebarItem screen="store-batches" label="Inventory Batches" icon={ShoppingBag} active={currentScreen === 'store-batches'} onNavigate={onNavigate} />
                </SidebarSection>
                <SidebarSection title="TRANSACTION MANAGEMENT">
                  <SidebarItem screen="f04-import-transactions" label="Import Transactions" icon={Upload} active={currentScreen === 'f04-import-transactions'} onNavigate={onNavigate} />
                  <SidebarItem screen="f04-import-history" label="Import History" icon={History} active={currentScreen === 'f04-import-history'} onNavigate={onNavigate} />
                  {currentUser && <SidebarItem screen="f04-transactions" label="Sales Transactions" icon={ReceiptText} active={currentScreen === 'f04-transactions'} onNavigate={onNavigate} />}
                </SidebarSection>
                <SidebarSection title="PRODUCT ANALYTICS">
                  <SidebarItem screen="f03-product-scores" label="Product Scores" icon={SlidersHorizontal} active={currentScreen === 'f03-product-scores'} onNavigate={onNavigate} />
                  <SidebarItem screen="f05-mining" label="Mining Results" icon={BarChart3} active={currentScreen === 'f05-mining'} onNavigate={onNavigate} />
                </SidebarSection>
              </>
            )}

            {isSystemAdmin && (
              <>
                <SidebarSection title="PLATFORM OVERVIEW">
                  <SidebarItem screen="overview" label="Overview" icon={LayoutGrid} active={currentScreen === 'overview'} onNavigate={onNavigate} />
                </SidebarSection>
                <SidebarSection title="MINING & CONFIGURATION">
                  <SidebarItem screen="setup" label="Mining Setup" icon={Settings} active={currentScreen === 'setup' || currentScreen === 'results' || currentScreen === 'failure'} onNavigate={onNavigate} />
                  <SidebarItem screen="benchmark" label="Benchmark" icon={BarChart3} active={currentScreen === 'benchmark'} onNavigate={onNavigate} />
                  <SidebarItem screen="f03-configuration" label="Lambda Policy" icon={SlidersHorizontal} active={currentScreen === 'f03-configuration'} onNavigate={onNavigate} />
                </SidebarSection>
                <SidebarSection title="SYSTEM MANAGEMENT">
                  <SidebarItem screen="users" label="Users & Roles" icon={Users} active={currentScreen === 'users'} onNavigate={onNavigate} />
                  <SidebarItem screen="api-connections" label="API Connections" icon={Zap} active={currentScreen === 'api-connections'} onNavigate={onNavigate} />
                </SidebarSection>
              </>
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
        <header className="h-16 md:h-20 px-6 md:px-8 border-b border-[#E7E2D8] bg-[#FAF8F5]/98 backdrop-blur-md flex items-center justify-between gap-4 shrink-0 sticky top-0 z-20 shadow-[0_1px_4px_rgba(41,37,36,0.04)] transition-all" data-purpose="top-navigation-bar">
          {/* Left: Dynamic Time Greeting + User Name + Role Title */}
          <div className="flex flex-1 flex-col justify-center min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-[#191C1B] tracking-tight leading-tight flex items-center gap-1.5 truncate">
              <span>{getGreeting()}, {firstName}!</span>
            </h2>
            <span className="text-[11px] font-medium text-[#707973] truncate leading-tight mt-0.5">
              {displayRole}
            </span>
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
          {currentScreen === 'f05-mining' && (
            <nav aria-label="Breadcrumb" className="mb-5 text-sm text-[#707973]">
              <ol className="flex flex-wrap items-center gap-2">
                {breadcrumbs.map((label, index) => (
                  <li key={label} className="flex items-center gap-2">
                    {index > 0 && <span aria-hidden="true">/</span>}
                    <span aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}>{label}</span>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};
