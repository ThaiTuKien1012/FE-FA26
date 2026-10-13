import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  Store,
  Cpu,
  Layers,
  ShoppingBag,
  Zap,
  Sparkles
} from 'lucide-react';
import { authService, MOCK_ACCOUNTS, AuthUser } from '../../../services/authService';
import { ActiveNavScreen } from '../../../types/mining';
import { AppLogo } from '../../../components/common/AppLogo';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser, destinationScreen: ActiveNavScreen) => void;
  initialRoleKey?: 'store-admin' | 'system-admin' | 'merchandiser' | 'customer';
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, initialRoleKey = 'store-admin' }) => {
  const [selectedRoleKey, setSelectedRoleKey] = useState<'store-admin' | 'system-admin' | 'merchandiser' | 'customer'>(initialRoleKey);
  const [email, setEmail] = useState(MOCK_ACCOUNTS[initialRoleKey].email);
  const [password, setPassword] = useState(MOCK_ACCOUNTS[initialRoleKey].defaultPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // When user selects a role card, prefill the credentials
  const handleSelectRole = (roleKey: 'store-admin' | 'system-admin' | 'merchandiser' | 'customer') => {
    setSelectedRoleKey(roleKey);
    const mock = MOCK_ACCOUNTS[roleKey];
    setEmail(mock.email);
    setPassword(mock.defaultPassword);
    setErrorMessage(null);
  };

  // 1-Click Fast Login for quick switching
  const handleQuickLogin = async (roleKey: 'store-admin' | 'system-admin' | 'merchandiser' | 'customer') => {
    setIsLoading(true);
    setErrorMessage(null);
    setSelectedRoleKey(roleKey);
    const mock = MOCK_ACCOUNTS[roleKey];
    setEmail(mock.email);
    setPassword(mock.defaultPassword);

    try {
      const response = await authService.login({
        email: mock.email,
        password: mock.defaultPassword,
        rememberMe: true
      });

      if (response.success && response.user) {
        setSuccessNotice(`Welcome back, ${response.user.name} (${response.user.role})! Redirecting...`);
        setTimeout(() => {
          onLoginSuccess(response.user!, response.user!.defaultScreen);
        }, 300);
      } else {
        setErrorMessage(response.error || 'Login failed.');
      }
    } catch {
      setErrorMessage('Unexpected error during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const response = await authService.login({
        email,
        password,
        rememberMe
      });

      if (response.success && response.user) {
        setSuccessNotice(`Authentication successful! Redirecting to ${response.user.defaultScreen}...`);
        setTimeout(() => {
          onLoginSuccess(response.user!, response.user!.defaultScreen);
        }, 400);
      } else {
        setErrorMessage(response.error || 'Invalid credentials. Please select one of the mock roles below.');
      }
    } catch {
      setErrorMessage('Network error communicating with authentication API.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentRoleConfig = MOCK_ACCOUNTS[selectedRoleKey];

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-[#191C1B] antialiased">
      {/* Background Architectural Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#1E3A2F_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-4xl relative z-10 px-4">
        {/* Brand Header */}
        <div className="text-center space-y-4 mb-8">
          <div className="flex items-center justify-center mx-auto">
            <AppLogo className="w-16 h-16 sm:w-20 sm:h-20" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#E5F3EB] border border-[#CAEADA] text-xs font-semibold text-[#1E3A2F]">
              <span className="w-2 h-2 rounded-full bg-[#1E3A2F] animate-pulse" />
              <span>HUPM Product Arrangement • Analytics Platform</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#191C1B]">
            Sign in to your Workspace
          </h1>
          <p className="text-sm text-[#707973] max-w-lg mx-auto">
            Choose from the pre-configured roles below to preview role-specific permissions and target workflows.
          </p>
        </div>

        {/* 4 Roles Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
          {/* Card 1: Store Admin */}
          <div 
            onClick={() => handleSelectRole('store-admin')}
            className={`p-4 rounded-xl border transition-all cursor-pointer relative bg-white flex flex-col justify-between ${
              selectedRoleKey === 'store-admin'
                ? 'border-[#1E3A2F] ring-2 ring-[#1E3A2F]/15 shadow-sm'
                : 'border-[#E7E2D8] hover:border-[#1E3A2F]/40 hover:bg-[#FAF8F5]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-lg bg-[#E5F3EB] text-[#1E3A2F] flex items-center justify-center font-bold text-xs">
                  <Store className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E5F3EB] text-[#1E3A2F] font-mono">
                  F02
                </span>
              </div>
              <div className="text-xs font-bold text-[#191C1B]">STORE ADMIN</div>
              <div className="text-[11px] text-[#707973] mt-0.5">Lan Nguyen</div>
              <div className="text-[11px] text-[#1E3A2F] font-medium mt-2 bg-[#F5ECE8]/50 p-1.5 rounded border border-[#E7E2D8]">
                👉 Lands on: <strong className="font-semibold">Products & Inventory</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleQuickLogin('store-admin');
              }}
              disabled={isLoading}
              className="mt-3 w-full py-1.5 px-2 bg-[#1E3A2F] text-white hover:bg-[#162B23] text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
            >
              <Zap className="w-3 h-3 text-[#CAEADA]" />
              <span>1-Click Enter</span>
            </button>
          </div>

          {/* Card 2: System Admin */}
          <div 
            onClick={() => handleSelectRole('system-admin')}
            className={`p-4 rounded-xl border transition-all cursor-pointer relative bg-white flex flex-col justify-between ${
              selectedRoleKey === 'system-admin'
                ? 'border-[#1E3A2F] ring-2 ring-[#1E3A2F]/15 shadow-sm'
                : 'border-[#E7E2D8] hover:border-[#1E3A2F]/40 hover:bg-[#FAF8F5]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-lg bg-[#E5F3EB] text-[#1E3A2F] flex items-center justify-center font-bold text-xs">
                  <Cpu className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E5F3EB] text-[#1E3A2F] font-mono">
                  F01
                </span>
              </div>
              <div className="text-xs font-bold text-[#191C1B]">SYSTEM ADMIN</div>
              <div className="text-[11px] text-[#707973] mt-0.5">Kenji Takahashi</div>
              <div className="text-[11px] text-[#1E3A2F] font-medium mt-2 bg-[#F5ECE8]/50 p-1.5 rounded border border-[#E7E2D8]">
                👉 Lands on: <strong className="font-semibold">Mining Service Overview</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleQuickLogin('system-admin');
              }}
              disabled={isLoading}
              className="mt-3 w-full py-1.5 px-2 bg-[#1E3A2F] text-white hover:bg-[#162B23] text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
            >
              <Zap className="w-3 h-3 text-[#CAEADA]" />
              <span>1-Click Enter</span>
            </button>
          </div>

          {/* Card 3: Merchandiser */}
          <div 
            onClick={() => handleSelectRole('merchandiser')}
            className={`p-4 rounded-xl border transition-all cursor-pointer relative bg-white flex flex-col justify-between ${
              selectedRoleKey === 'merchandiser'
                ? 'border-[#1E3A2F] ring-2 ring-[#1E3A2F]/15 shadow-sm'
                : 'border-[#E7E2D8] hover:border-[#1E3A2F]/40 hover:bg-[#FAF8F5]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-lg bg-[#E5F3EB] text-[#1E3A2F] flex items-center justify-center font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E5F3EB] text-[#1E3A2F] font-mono">
                  ME
                </span>
              </div>
              <div className="text-xs font-bold text-[#191C1B]">MERCHANDISER</div>
              <div className="text-[11px] text-[#707973] mt-0.5">Minh Tran • Retail Planner</div>
              <div className="text-[11px] text-[#1E3A2F] font-medium mt-2 bg-[#E5F3EB]/60 p-1.5 rounded border border-[#CAEADA]">
                👉 Lands on: <strong className="font-semibold text-[#1E3A2F]">Recommendations Dashboard</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleQuickLogin('merchandiser');
              }}
              disabled={isLoading}
              className="mt-3 w-full py-1.5 px-2 bg-[#1E3A2F] text-white hover:bg-[#162B23] text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
            >
              <Zap className="w-3 h-3 text-[#CAEADA]" />
              <span>1-Click Enter</span>
            </button>
          </div>

          {/* Card 4: Customer */}
          <div 
            onClick={() => handleSelectRole('customer')}
            className={`p-4 rounded-xl border transition-all cursor-pointer relative bg-white flex flex-col justify-between ${
              selectedRoleKey === 'customer'
                ? 'border-[#1E3A2F] ring-2 ring-[#1E3A2F]/15 shadow-sm'
                : 'border-[#E7E2D8] hover:border-[#1E3A2F]/40 hover:bg-[#FAF8F5]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-lg bg-[#FDF3F2] text-[#BA1A1A] flex items-center justify-center font-bold text-xs">
                  <ShoppingBag className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FDF3F2] text-[#BA1A1A] font-mono">
                  KIOSK
                </span>
              </div>
              <div className="text-xs font-bold text-[#191C1B]">CUSTOMER</div>
              <div className="text-[11px] text-[#707973] mt-0.5">Quynh Le</div>
              <div className="text-[11px] text-[#BA1A1A] font-medium mt-2 bg-[#FDF3F2] p-1.5 rounded border border-[#E7E2D8]">
                👉 Lands on: <strong className="font-semibold">Storefront Kiosk</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleQuickLogin('customer');
              }}
              disabled={isLoading}
              className="mt-3 w-full py-1.5 px-2 bg-[#1E3A2F] text-white hover:bg-[#162B23] text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
            >
              <Zap className="w-3 h-3 text-[#CAEADA]" />
              <span>1-Click Enter</span>
            </button>
          </div>
        </div>

        {/* Main Authentication Box */}
        <div className="bg-white py-8 px-6 sm:px-10 border border-[#E7E2D8] rounded-2xl shadow-[0_1px_3px_rgba(41,37,36,0.04)]">
          {/* Active Role Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E7E2D8] mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1E3A2F] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                {currentRoleConfig.avatarText}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#191C1B]">
                    {currentRoleConfig.name}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#CAEADA] text-[#1E3A2F]">
                    {currentRoleConfig.role}
                  </span>
                </div>
                <div className="text-[11px] text-[#707973]">
                  {currentRoleConfig.department}
                </div>
              </div>
            </div>

            <div className="text-right text-xs">
              <span className="text-[#707973]">Target Destination:</span>
              <div className="font-bold text-[#1E3A2F] font-mono text-[11px]">
                {currentRoleConfig.defaultScreen}
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-6 p-3.5 bg-[#FDF3F2] border border-[#BA1A1A]/30 rounded-xl flex items-center gap-3 text-xs text-[#BA1A1A] animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-[#BA1A1A] shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Alert */}
          {successNotice && (
            <div className="mb-6 p-3.5 bg-[#E5F3EB] border border-[#CAEADA] rounded-xl flex items-center gap-3 text-xs text-[#1E3A2F] animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#1E3A2F] shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#707973] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8C857B]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hupm.retail"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E7E2D8] bg-white text-xs sm:text-sm text-[#191C1B] placeholder:text-[#8C857B] focus:outline-none focus:border-[#1E3A2F] focus:ring-1 focus:ring-[#1E3A2F] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#707973]">
                  Password
                </label>
                <span className="text-[11px] text-[#707973]">
                  Demo: <code className="bg-[#FAF8F5] px-1 py-0.5 rounded border border-[#E7E2D8] text-[#1E3A2F]">admin123</code>
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8C857B]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E7E2D8] bg-white text-xs sm:text-sm text-[#191C1B] placeholder:text-[#8C857B] focus:outline-none focus:border-[#1E3A2F] focus:ring-1 focus:ring-[#1E3A2F] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8C857B] hover:text-[#191C1B] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-[#707973]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#E7E2D8] text-[#1E3A2F] focus:ring-[#1E3A2F] cursor-pointer"
                />
                <span>Remember session token</span>
              </label>

              <span className="text-[11px] text-[#8C857B]">
                Mock API • Fast Switch Enabled
              </span>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#1E3A2F] hover:bg-[#162B23] text-white text-xs sm:text-sm font-bold transition-all shadow-[0_1px_3px_rgba(41,37,36,0.08)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 group"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating with Mock API...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In as {currentRoleConfig.role}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Mock API Specifications Note */}
          <div className="mt-6 pt-5 border-t border-[#E7E2D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-[#707973]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1E3A2F]" />
              <span>Simulated Endpoint: <strong className="font-mono text-[#191C1B]">POST /api/v1/auth/login</strong></span>
            </div>
            <div>
              Status: <span className="text-[#1E3A2F] font-semibold">200 OK (Latency: 350ms)</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-[#8C857B]">
          HUPM Product Arrangement • High-Utility Pattern Mining Suite · Nordic Architectural Atelier
        </div>
      </div>
    </div>
  );
};
