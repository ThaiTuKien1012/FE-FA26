import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Zap,
  Store,
  Cpu,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Lock,
  Mail,
  Play,
  Volume2,
  VolumeX
} from 'lucide-react';
import { authService, MOCK_ACCOUNTS, AuthUser } from '../../../services/authService';
import { ActiveNavScreen } from '../../../types/mining';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser, destinationScreen: ActiveNavScreen) => void;
  initialRoleKey?: 'store-admin' | 'system-admin' | 'merchandiser' | 'customer';
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  initialRoleKey = 'merchandiser'
}) => {
  const [selectedRoleKey, setSelectedRoleKey] = useState<'store-admin' | 'system-admin' | 'merchandiser' | 'customer'>(initialRoleKey);
  const [identifier, setIdentifier] = useState(MOCK_ACCOUNTS[initialRoleKey].email);
  const [passcode, setPasscode] = useState(MOCK_ACCOUNTS[initialRoleKey].defaultPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  // Cinema mode: hide the UI to showcase the full-screen video
  const [cinemaMode, setCinemaMode] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // When user selects a role, prefill the credentials
  const handleSelectRole = (roleKey: 'store-admin' | 'system-admin' | 'merchandiser' | 'customer') => {
    setSelectedRoleKey(roleKey);
    const mock = MOCK_ACCOUNTS[roleKey];
    setIdentifier(mock.email);
    setPasscode(mock.defaultPassword);
    setErrorMessage(null);
  };

  // Quick 1-click login
  const handleQuickLogin = async (roleKey: 'store-admin' | 'system-admin' | 'merchandiser' | 'customer') => {
    setIsLoading(true);
    setErrorMessage(null);
    setSelectedRoleKey(roleKey);
    const mock = MOCK_ACCOUNTS[roleKey];
    setIdentifier(mock.email);
    setPasscode(mock.defaultPassword);

    try {
      const response = await authService.login({
        email: mock.email,
        password: mock.defaultPassword,
        rememberMe: true
      });

      if (response.success && response.user) {
        setSuccessNotice(`Chào mừng ${response.user.name} (${response.user.role})! Đang chuyển hướng...`);
        setTimeout(() => {
          onLoginSuccess(response.user!, response.user!.defaultScreen);
        }, 350);
      } else {
        setErrorMessage(response.error || 'Đăng nhập không thành công.');
      }
    } catch {
      setErrorMessage('Đã xảy ra lỗi trong quá trình xác thực.');
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
        email: identifier.trim(),
        password: passcode.trim(),
        rememberMe: true
      });

      if (response.success && response.user) {
        setSuccessNotice(`Đăng nhập thành công! Đang vào màn hình ${response.user.role}...`);
        setTimeout(() => {
          onLoginSuccess(response.user!, response.user!.defaultScreen);
        }, 350);
      } else {
        setErrorMessage(response.error || 'Thông tin đăng nhập không hợp lệ. Vui lòng thử lại hoặc chọn vai trò mẫu.');
      }
    } catch {
      setErrorMessage('Không thể kết nối đến máy chủ xác thực.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#102019] text-[#191C1B] selection:bg-[#1E3A2F] selection:text-white antialiased font-sans">
      {/* BEGIN: FullScreenVideoBackground */}
      <video
        className="fixed inset-0 w-full h-full object-cover z-0"
        src="/videos/login-hero.mp4"
        autoPlay
        muted={isMuted}
        loop
        playsInline
        preload="auto"
      />
      {/* Light cinematic overlays: keep the footage vivid, darken only where text sits */}
      <div className={`fixed inset-0 z-0 pointer-events-none transition-opacity duration-700 bg-gradient-to-r from-[#0B1812]/75 via-[#0B1812]/20 to-transparent ${cinemaMode ? 'opacity-0' : 'opacity-100'}`} />
      <div className={`fixed inset-x-0 bottom-0 h-1/3 z-0 pointer-events-none transition-opacity duration-700 bg-gradient-to-t from-[#0B1812]/70 to-transparent ${cinemaMode ? 'opacity-30' : 'opacity-100'}`} />
      <div className={`fixed inset-0 z-0 pointer-events-none transition-opacity duration-700 bg-[#1E3A2F]/10 ${cinemaMode ? 'opacity-0' : 'opacity-100'}`} />
      {/* END: FullScreenVideoBackground */}

      <div className={`relative z-10 min-h-screen flex flex-col transition-all duration-700 ${cinemaMode ? 'opacity-0 pointer-events-none scale-[0.98] blur-sm' : 'opacity-100'}`}>
        {/* BEGIN: MainHeader */}
        <header className="w-full max-w-[1280px] mx-auto px-6 sm:px-10 pt-8 flex items-center justify-between" data-purpose="brand-header">
          <div className="flex items-center gap-3 text-white">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-emerald-100" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zm-9 9h7v7H4v-7zm9 0h7v7h-7v-7z"></path>
              </svg>
            </div>
            <div>
              <span className="block text-sm font-bold tracking-[0.2em] uppercase leading-tight">RetailSpace</span>
              <span className="block text-[10px] font-medium tracking-wide uppercase text-white/65">Operations Platform</span>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-semibold tracking-wider uppercase text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            System Online
          </span>
        </header>
        {/* END: MainHeader */}

        <div className="flex-1 w-full max-w-[1280px] mx-auto px-6 sm:px-10 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 xl:gap-20 items-center">
          {/* BEGIN: HeroText */}
          <section className="hidden lg:block text-white" data-purpose="hero-text">
            <h2 className="text-5xl xl:text-6xl font-bold tracking-tight leading-[1.05] drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
              Biến mỗi kệ hàng thành{' '}
              <span className="bg-gradient-to-r from-emerald-200 via-[#CAEADA] to-white bg-clip-text text-transparent">
                quyết định dữ liệu.
              </span>
            </h2>
            <p className="mt-6 text-base text-white/75 max-w-xl leading-relaxed">
              Khai phá luật kết hợp, mô phỏng bố trí A/B và tối ưu doanh thu cho từng cửa hàng — trên một nền tảng vận hành duy nhất.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-xl">
              {[
                { v: '1.248', l: 'Sản phẩm quản lý' },
                { v: 'A/B', l: 'Mô phỏng layout' },
                { v: '24/7', l: 'Giám sát vận hành' }
              ].map((it) => (
                <div key={it.l} className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:bg-white/15 hover:-translate-y-0.5 transition-all duration-300">
                  <div className="text-2xl font-bold leading-none">{it.v}</div>
                  <div className="mt-2 text-[10px] uppercase tracking-wider text-white/65">{it.l}</div>
                </div>
              ))}
            </div>
          </section>
          {/* END: HeroText */}

          {/* BEGIN: MainContentSection */}
          <main className="w-full max-w-[480px] mx-auto lg:mr-0 flex flex-col items-center">
            {/* BEGIN: LoginCard */}
            <div className="w-full bg-white/80 backdrop-blur-xl rounded-[28px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] border border-white/50 p-8 sm:p-10 z-10 mx-auto animate-fadeIn" data-purpose="login-form-card">
              {/* Card Title & Welcome Heading */}
              <div className="text-center mb-7">
                <h1 className="text-2xl sm:text-[26px] font-bold text-[#191C1B] tracking-tight leading-snug">
                  Đăng nhập Hệ thống
                </h1>
              </div>

              {/* Alert / Success notices */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-[#FDF2F0] border border-[#F6D5CF] text-[#98211A] text-xs flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#B3261E]" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successNotice && (
                <div className="mb-4 p-3 rounded-xl bg-[#EEF5F1] border border-[#D8E8DF] text-[#1E3A2F] text-xs flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1E3A2F]" />
                  <span>{successNotice}</span>
                </div>
              )}

              {/* Authentication Form */}
              <form className="space-y-4" id="portal-login-form" onSubmit={handleSubmit}>
                {/* Field: Username / Email / Agent ID */}
                <div>
                  <label className="block text-xs font-semibold text-[#191C1B] mb-1.5" htmlFor="identifier">
                    Email / Tên tài khoản
                  </label>
                  <div className="relative">
                    <input
                      className="w-full h-11 px-3.5 pr-10 text-sm bg-white text-[#191C1B] placeholder-[#89938F] rounded-xl border border-[#E1D8D6] focus:border-[#1E3A2F] focus:ring-2 focus:ring-[#1E3A2F]/15 outline-hidden transition-all duration-200 font-medium"
                      id="identifier"
                      name="identifier"
                      placeholder="name@retailspace.demo"
                      required
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#89938F]">
                      <Mail className="w-4 h-4 text-[#89938F]" />
                    </div>
                  </div>
                </div>

                {/* Field: Password */}
                <div>
                  <label className="block text-xs font-semibold text-[#191C1B] mb-1.5" htmlFor="passcode">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      className="w-full h-11 px-3.5 pr-16 text-sm bg-white text-[#191C1B] placeholder-[#89938F] rounded-xl border border-[#E1D8D6] focus:border-[#1E3A2F] focus:ring-2 focus:ring-[#1E3A2F]/15 outline-hidden transition-all duration-200 font-medium"
                      id="passcode"
                      name="passcode"
                      placeholder="••••••••"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                    />
                    <button
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-semibold text-[#6D7974] hover:text-[#191C1B] focus:outline-hidden select-none transition-colors cursor-pointer"
                      id="toggle-password-btn"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>

                {/* Trouble signing in link */}
                <div className="pt-0.5 flex items-center justify-between text-xs">
                  <a className="text-xs font-medium text-[#6D7974] hover:text-[#1E3A2F] transition-colors inline-block cursor-pointer" href="#">
                    Quên mật khẩu?
                  </a>
                  <span className="text-[11px] font-semibold text-[#6D7974]">
                    Vai trò đang chọn: <strong className="text-[#1E3A2F] capitalize">{selectedRoleKey.replace('-', ' ')}</strong>
                  </span>
                </div>

                {/* Primary Action Submit Button */}
                <div className="pt-2">
                  <button
                    disabled={isLoading}
                    className="w-full h-11 rounded-xl bg-[#1E3A2F] hover:bg-[#294D3F] active:scale-[0.99] text-white font-semibold text-sm transition-all duration-200 shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                    type="submit"
                  >
                    {isLoading ? (
                      <span>Đang xác thực...</span>
                    ) : (
                      <>
                        <span>Đăng nhập</span>
                        <ArrowRight className="w-4 h-4 text-emerald-100" />
                      </>
                    )}
                  </button>
                </div>

                {/* Divider Line */}
                <div className="relative flex items-center justify-center py-2.5">
                  <div className="grow border-t border-[#E1D8D6]/70"></div>
                  <span className="shrink-0 mx-3 text-[11px] text-[#89938F] font-medium uppercase tracking-wider">
                    Hoặc kết nối qua
                  </span>
                  <div className="grow border-t border-[#E1D8D6]/70"></div>
                </div>

                {/* Alternative Quick Login Options (3 column pills) */}
                <div className="grid grid-cols-3 gap-2 pt-0.5">
                  {/* Google Option */}
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('merchandiser')}
                    className="h-10 flex items-center justify-center gap-1.5 px-2.5 border border-[#E1D8D6] hover:border-[#1E3A2F]/40 hover:bg-[#FFF8F6] rounded-xl text-xs font-semibold text-[#191C1B] transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                      <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" fill="#4285F4"></path>
                      <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" fill="#34A853"></path>
                      <path d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z" fill="#FBBC05"></path>
                      <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" fill="#EA4335"></path>
                    </svg>
                    <span className="truncate">Google</span>
                  </button>

                  {/* Apple ID Option */}
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('store-admin')}
                    className="h-10 flex items-center justify-center gap-1.5 px-2.5 border border-[#E1D8D6] hover:border-[#1E3A2F]/40 hover:bg-[#FFF8F6] rounded-xl text-xs font-semibold text-[#191C1B] transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0 fill-current" viewBox="0 0 170 170">
                      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.69-7.85-12.02-14.43-6.09-9.14-10.86-19.55-14.32-31.25-3.47-11.7-5.2-23.01-5.2-33.94 0-14.6 3.64-26.69 10.92-36.27 7.28-9.58 16.48-14.46 27.6-14.64 4.88 0 10.32 1.3 16.33 3.9 6.01 2.61 9.94 4.02 11.79 4.24 2.29-.33 6.45-1.8 12.48-4.42 6.03-2.62 11.29-3.8 15.77-3.55 12.3.65 22.18 5.48 29.63 14.51-10.68 6.42-15.91 15.35-15.7 26.78.22 9.03 3.68 16.63 10.38 22.8 6.7 6.17 14.59 9.77 23.68 10.8-2.18 6.53-4.8 13.06-7.86 19.59zM119.22 33.56c0-6.97 2.5-13.48 7.5-19.52 5-6.04 11.14-9.84 18.42-11.4 0 .98.05 1.85.05 2.61 0 6.86-2.6 13.43-7.8 19.72-5.2 6.29-11.58 9.99-19.14 11.1-.33-.87-.73-1.71-1.03-2.51z"></path>
                    </svg>
                    <span className="truncate">Apple ID</span>
                  </button>

                  {/* Enterprise SSO Option */}
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('system-admin')}
                    className="h-10 flex items-center justify-center gap-1 px-2.5 border border-[#E1D8D6] hover:border-[#1E3A2F]/40 hover:bg-[#FFF8F6] rounded-xl text-xs font-semibold text-[#191C1B] transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#1E3A2F]" />
                    <span className="truncate">SSO</span>
                  </button>
                </div>

                {/* Registration Link Note */}
                <div className="text-center pt-2">
                  <p className="text-xs text-[#6D7974]">
                    Chưa có tài khoản quản trị?{' '}
                    <a className="font-semibold text-[#1E3A2F] hover:underline transition-colors cursor-pointer" href="#">
                      Liên hệ cấp quyền
                    </a>
                  </p>
                </div>
              </form>
            </div>
            {/* END: LoginCard */}

            {/* Quick Role Switcher Bar for Pair Programming & Instant Testing */}
            <div className="w-full mt-5 bg-white/85 backdrop-blur-xs rounded-2xl border border-[#E1D8D6] p-3.5 shadow-xs z-10">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6D7974] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#1E3A2F]" />
                  Chọn vai trò thử nghiệm nhanh (1-Click Test Login)
                </span>
                <span className="text-[10px] text-[#6D7974] font-medium">Bấm để đăng nhập tức thì</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* Merchandiser */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('merchandiser')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${selectedRoleKey === 'merchandiser'
                      ? 'border-[#1E3A2F] bg-[#EEF5F1] ring-1 ring-[#1E3A2F]/20'
                      : 'border-[#E1D8D6] bg-white hover:bg-[#FFF8F6]'
                    }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-[#1E3A2F] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                    ME
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-xs font-bold text-[#191C1B] truncate leading-tight">Merchandiser</p>
                    <p className="text-[10px] text-[#6D7974] truncate">Minh Tran</p>
                  </div>
                </button>

                {/* Store Admin */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('store-admin')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${selectedRoleKey === 'store-admin'
                      ? 'border-[#1E3A2F] bg-[#EEF5F1] ring-1 ring-[#1E3A2F]/20'
                      : 'border-[#E1D8D6] bg-white hover:bg-[#FFF8F6]'
                    }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-[#E5F3EB] text-[#1E3A2F] flex items-center justify-center font-bold text-[10px] shrink-0 border border-[#CAEADA]">
                    <Store className="w-3.5 h-3.5" />
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-xs font-bold text-[#191C1B] truncate leading-tight">Store Admin</p>
                    <p className="text-[10px] text-[#6D7974] truncate">Lan Nguyen</p>
                  </div>
                </button>

                {/* System Admin */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('system-admin')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${selectedRoleKey === 'system-admin'
                      ? 'border-[#1E3A2F] bg-[#EEF5F1] ring-1 ring-[#1E3A2F]/20'
                      : 'border-[#E1D8D6] bg-white hover:bg-[#FFF8F6]'
                    }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-[#E5F3EB] text-[#1E3A2F] flex items-center justify-center font-bold text-[10px] shrink-0 border border-[#CAEADA]">
                    <Cpu className="w-3.5 h-3.5" />
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-xs font-bold text-[#191C1B] truncate leading-tight">Sys Admin</p>
                    <p className="text-[10px] text-[#6D7974] truncate">Kenji T.</p>
                  </div>
                </button>

                {/* Customer Kiosk */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('customer')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${selectedRoleKey === 'customer'
                      ? 'border-[#1E3A2F] bg-[#EEF5F1] ring-1 ring-[#1E3A2F]/20'
                      : 'border-[#E1D8D6] bg-white hover:bg-[#FFF8F6]'
                    }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-[#FDF2F0] text-[#B3261E] flex items-center justify-center font-bold text-[10px] shrink-0 border border-[#F6D5CF]">
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-xs font-bold text-[#191C1B] truncate leading-tight">Customer</p>
                    <p className="text-[10px] text-[#6D7974] truncate">Quynh Le</p>
                  </div>
                </button>
              </div>
            </div>
          </main>
          {/* END: MainContentSection */}
        </div>

        {/* BEGIN: MainFooter */}
        <footer className="w-full py-6 text-center text-xs text-white/60 z-20 border-t border-white/10">
          <p>
            RetailSpace Operations Platform © 2026 | <a className="hover:text-white hover:underline transition-colors cursor-pointer" href="#">Chính sách Bảo mật</a> • <a className="hover:text-white hover:underline transition-colors cursor-pointer" href="#">Bảo mật Doanh nghiệp</a>
          </p>
        </footer>
        {/* END: MainFooter */}
      </div>

      {/* BEGIN: Video Showcase Controls */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
        {cinemaMode && (
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/25 text-white flex items-center justify-center transition-all cursor-pointer"
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={() => setCinemaMode(!cinemaMode)}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white text-xs font-semibold tracking-wide shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {cinemaMode ? 'Quay lại đăng nhập' : 'Xem toàn màn hình video'}
        </button>
      </div>
      {/* END: Video Showcase Controls */}
    </div>
  );
};
