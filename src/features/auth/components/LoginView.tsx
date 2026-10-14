import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Store, 
  Cpu, 
  Sparkles, 
  ShoppingBag,
  Globe,
  ArrowRight,
  ShieldCheck,
  Lock,
  Mail
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
    <div className="flex flex-col min-h-screen bg-[#FFF8F6] text-[#191C1B] selection:bg-[#1E3A2F] selection:text-white antialiased relative font-sans">
      {/* Background Architectural Subtle Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.035] bg-[radial-gradient(#1E3A2F_1.5px,transparent_1.5px)] [background-size:20px_20px]" />

      {/* BEGIN: MainHeader */}
      <header className="w-full max-w-[1440px] mx-auto px-6 sm:px-12 pt-8 pb-4 flex items-center justify-between z-20">
        {/* Left: Brand Logo & Support Contact */}
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1E3A2F] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <svg className="w-4 h-4 text-emerald-100" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zm-9 9h7v7H4v-7zm9 0h7v7h-7v-7z"></path>
              </svg>
            </div>
            <div>
              <span className="text-sm font-bold tracking-wider uppercase text-[#191C1B] leading-tight block">
                RETAILSPACE
              </span>
              <span className="text-[10px] text-[#6D7974] font-medium tracking-wide block uppercase">
                Operations Platform
              </span>
            </div>
          </div>
          <a 
            className="text-xs text-[#6D7974] hover:text-[#1E3A2F] font-medium inline-flex items-center gap-1 group transition-colors pt-0.5" 
            href="mailto:support@retailspace.vn"
          >
            <span>support@retailspace.vn</span>
            <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 text-[#1E3A2F]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </a>
        </div>

        {/* Right: Language Selector, Sign Up and Demo CTA */}
        <div className="flex items-center space-x-4 sm:space-x-7">
          <button 
            aria-label="Đổi ngôn ngữ" 
            className="text-[#6D7974] hover:text-[#191C1B] p-1.5 rounded-lg hover:bg-white/60 transition-colors cursor-pointer" 
            type="button"
          >
            <Globe className="w-4.5 h-4.5 stroke-[1.75]" />
          </button>
          <a className="text-xs sm:text-sm font-semibold text-[#191C1B] hover:text-[#1E3A2F] transition-colors hidden sm:inline-block cursor-pointer" href="#">
            Tài liệu Hướng dẫn
          </a>
          <a 
            className="inline-flex items-center justify-center px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#1E3A2F] hover:bg-[#294D3F] text-white shadow-xs transition-all duration-200 cursor-pointer" 
            href="#"
          >
            Yêu cầu Demo
          </a>
        </div>
      </header>
      {/* END: MainHeader */}

      {/* BEGIN: MainContentSection */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-8 flex flex-col items-center justify-center relative py-6 md:py-10">
        {/* BEGIN: LeftBackgroundArtwork */}
        <div className="hidden lg:block absolute left-8 xl:left-24 bottom-12 pointer-events-none select-none z-0" data-purpose="left-illustrations">
          <div className="relative w-80 h-72">
            {/* Floating curved noodle line */}
            <svg className="absolute -top-12 left-12 w-28 h-10 text-[#1E3A2F]" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" viewBox="0 0 120 40">
              <path d="M5,25 C25,5 40,38 65,15 C85, -2 105,25 118,20"></path>
            </svg>
            {/* Tiny floating circle doodle */}
            <div className="absolute -top-6 right-8 w-2 h-2 rounded-full border-[1.5px] border-[#1E3A2F]"></div>
            
            {/* Chat bubble box doodle */}
            <div className="absolute top-4 left-6 w-36 h-28 bg-[#FFF8F6] border-[1.8px] border-[#1E3A2F] rounded-xs p-4 shadow-sm">
              <div className="space-y-2.5 mt-2">
                <div className="w-16 h-[2px] bg-[#1E3A2F] rounded-full"></div>
                <div className="w-24 h-[2px] bg-[#1E3A2F] rounded-full"></div>
              </div>
              <div className="absolute -bottom-3 left-4 w-3 h-3 border-l-[1.8px] border-b-[1.8px] border-[#1E3A2F] bg-[#FFF8F6] -rotate-45"></div>
            </div>
            <div className="absolute top-20 right-2 w-3 h-3 rounded-full border-[1.8px] border-[#1E3A2F]"></div>
            
            {/* Pine & Sage Polka-dot pillar block */}
            <div className="absolute bottom-0 left-0 w-24 h-48 bg-[#D8E8DF] border-[1.8px] border-[#1E3A2F] rounded-t-xs overflow-hidden flex flex-wrap p-2.5 content-around">
              <svg className="w-full h-full text-[#1E3A2F] opacity-90" fill="currentColor" viewBox="0 0 80 160">
                <ellipse cx="20" cy="15" rx="3.5" ry="4" transform="rotate(-15 20 15)"></ellipse>
                <ellipse cx="58" cy="28" rx="4" ry="3.5" transform="rotate(25 58 28)"></ellipse>
                <ellipse cx="24" cy="52" rx="4" ry="4"></ellipse>
                <ellipse cx="62" cy="72" rx="3.5" ry="4.5" transform="rotate(-20 62 72)"></ellipse>
                <ellipse cx="22" cy="98" rx="4.5" ry="3.5" transform="rotate(10 22 98)"></ellipse>
                <ellipse cx="56" cy="122" rx="4" ry="4"></ellipse>
                <ellipse cx="26" cy="144" rx="3.5" ry="4" transform="rotate(-30 26 144)"></ellipse>
              </svg>
            </div>
            
            {/* White block with arrow indicator */}
            <div className="absolute bottom-0 left-28 w-24 h-32 bg-white border-[1.8px] border-[#1E3A2F] rounded-t-xs flex items-center justify-center p-3 shadow-xs">
              <svg className="w-9 h-9 text-[#1E3A2F]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M7 17L17 7M17 7H9M17 7V15"></path>
              </svg>
            </div>
            {/* Wavy ground connector line */}
            <svg className="absolute -bottom-1 -right-16 w-32 h-10 text-[#1E3A2F]" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" viewBox="0 0 100 30">
              <path d="M0,22 C30,35 60,-5 98,18"></path>
            </svg>
          </div>
        </div>
        {/* END: LeftBackgroundArtwork */}

        {/* BEGIN: RightBackgroundArtwork */}
        <div className="hidden lg:block absolute right-6 xl:right-20 bottom-12 pointer-events-none select-none z-0" data-purpose="right-illustrations">
          <div className="relative w-96 h-80">
            {/* Floating chat box on top right */}
            <div className="absolute -top-4 left-6 w-24 h-16 bg-[#FFF8F6] border-[1.8px] border-[#1E3A2F] rounded-xs p-3 shadow-xs">
              <div className="space-y-2 mt-1">
                <div className="w-12 h-[2px] bg-[#1E3A2F] rounded-full"></div>
                <div className="w-8 h-[2px] bg-[#1E3A2F] rounded-full"></div>
              </div>
            </div>
            {/* Top curved noodle squiggle */}
            <svg className="absolute -top-14 -left-10 w-24 h-12 text-[#1E3A2F]" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" viewBox="0 0 80 40">
              <path d="M5,10 C25,40 50,-5 75,25"></path>
            </svg>
            {/* Right abstract squiggly line */}
            <svg className="absolute top-12 right-0 w-28 h-10 text-[#1E3A2F]" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" viewBox="0 0 100 30">
              <path d="M2,18 C25,2 45,35 70,5 C85,-5 95,15 105,12"></path>
            </svg>
            <div className="absolute top-28 left-2 w-2 h-2 rounded-full border-[1.5px] border-[#1E3A2F]"></div>

            {/* Character sitting on podium with laptop */}
            <div className="absolute bottom-0 left-12 w-80 h-72">
              <svg className="w-full h-full" fill="none" viewBox="0 0 320 280" xmlns="http://www.w3.org/2000/svg">
                {/* White Pedestal Box */}
                <rect fill="white" height="135" stroke="#1E3A2F" strokeLinejoin="round" strokeWidth="1.8" width="80" x="110" y="145"></rect>
                {/* Person's Leg and Pants */}
                <path d="M125 150 L110 205 L85 200 L95 145 Z" fill="#F5EEE9" stroke="#1E3A2F" strokeLinejoin="round" strokeWidth="1.8"></path>
                <path d="M135 152 L145 220 L115 225 L108 152 Z" fill="#F5EEE9" stroke="#1E3A2F" strokeLinejoin="round" strokeWidth="1.8"></path>
                {/* Shoes */}
                <path d="M85 200 L70 215 L88 222 L98 210 Z" fill="#1E3A2F"></path>
                <path d="M115 225 L120 252 L138 238 L135 222 Z" fill="#1E3A2F"></path>
                {/* Torso / Shirt in Pine Green */}
                <path d="M132 152 C132 152 140 100 148 95 C162 90 178 108 178 128 C178 142 165 152 132 152 Z" fill="#1E3A2F"></path>
                {/* Decorative dashes */}
                <line stroke="#D8E8DF" strokeLinecap="round" strokeWidth="2" x1="148" x2="154" y1="108" y2="105"></line>
                <line stroke="#D8E8DF" strokeLinecap="round" strokeWidth="2" x1="162" x2="167" y1="112" y2="118"></line>
                <line stroke="#D8E8DF" strokeLinecap="round" strokeWidth="2" x1="150" x2="157" y1="126" y2="124"></line>
                <line stroke="#D8E8DF" strokeLinecap="round" strokeWidth="2" x1="166" x2="171" y1="130" y2="135"></line>
                <line stroke="#D8E8DF" strokeLinecap="round" strokeWidth="2" x1="140" x2="146" y1="138" y2="136"></line>
                {/* Head & Hair */}
                <path d="M162 76 C170 70 185 80 180 94 C175 90 168 84 162 82 Z" fill="#1E3A2F"></path>
                <circle cx="152" cy="80" fill="#FAF5EE" r="13" stroke="#1E3A2F" strokeWidth="1.8"></circle>
                <path d="M145 74 C148 68 158 68 163 74 C163 80 156 82 145 74 Z" fill="#1E3A2F"></path>
                <path d="M141 81 C142 84 145 85 146 87" stroke="#1E3A2F" strokeLinecap="round" strokeWidth="1.5"></path>
                {/* Arms & Hands Typing */}
                <path d="M148 112 L112 128 L98 125" stroke="#F5EEE9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8"></path>
                <path d="M148 112 L112 128 L98 125" stroke="#1E3A2F" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
                {/* Laptop in Soft Pine Light Accent */}
                <path d="M85 128 L115 136 L88 88" stroke="#1E3A2F" strokeLinejoin="round" strokeWidth="2.2"></path>
                <polygon fill="#D8E8DF" points="85,128 115,136 88,88" stroke="#1E3A2F" strokeWidth="1.8"></polygon>
              </svg>
            </div>
            {/* Right Pine Pillar block */}
            <div className="absolute bottom-0 right-0 w-24 h-36 bg-[#D8E8DF] border-[1.8px] border-[#1E3A2F] rounded-t-xs overflow-hidden p-2.5">
              <svg className="w-full h-full text-[#1E3A2F] opacity-90" fill="currentColor" viewBox="0 0 80 120">
                <ellipse cx="22" cy="18" rx="3.5" ry="4" transform="rotate(-15 22 18)"></ellipse>
                <ellipse cx="56" cy="30" rx="4" ry="3.5" transform="rotate(25 56 30)"></ellipse>
                <ellipse cx="20" cy="55" rx="4" ry="4"></ellipse>
                <ellipse cx="60" cy="74" rx="3.5" ry="4.5" transform="rotate(-20 60 74)"></ellipse>
                <ellipse cx="28" cy="98" rx="4" ry="4"></ellipse>
              </svg>
            </div>
            <div className="absolute bottom-0 -left-6 right-0 h-[1.8px] bg-[#1E3A2F]"></div>
          </div>
        </div>
        {/* END: RightBackgroundArtwork */}

        {/* BEGIN: LoginCard */}
        <div className="w-full max-w-[460px] bg-white rounded-[28px] shadow-[0_20px_50px_-15px_rgba(30,58,47,0.07),0_0_1px_1px_rgba(30,58,47,0.04)] border border-[#E1D8D6] p-8 sm:p-10 z-10 mx-auto" data-purpose="login-form-card">
          {/* Card Title & Welcome Heading */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF5F1] border border-[#D8E8DF] text-[11px] font-semibold text-[#1E3A2F] mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A2F]" />
              <span>RetailSpace Operations Portal</span>
            </div>
            <h1 className="text-2xl sm:text-[26px] font-bold text-[#191C1B] tracking-tight leading-snug">
              Đăng nhập Hệ thống
            </h1>
            <p className="mt-1.5 text-xs text-[#6D7974] leading-relaxed">
              Nhập thông tin tài khoản hoặc sử dụng phím tắt 1-Click để truy cập vào phiên làm việc.
            </p>
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
        <div className="w-full max-w-[640px] mt-7 bg-white/95 backdrop-blur-xs rounded-2xl border border-[#E1D8D6] p-3.5 shadow-xs z-10">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6D7974] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#1E3A2F]" />
              Chọn vai trò thử nghiệm nhanh (1-Click Test Login)
            </span>
            <span className="text-[10px] text-[#6D7974] font-medium">Bấm để đăng nhập tức thì</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Merchandiser */}
            <button
              type="button"
              onClick={() => handleQuickLogin('merchandiser')}
              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${
                selectedRoleKey === 'merchandiser'
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
              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${
                selectedRoleKey === 'store-admin'
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
              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${
                selectedRoleKey === 'system-admin'
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
              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${
                selectedRoleKey === 'customer'
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

      {/* BEGIN: MainFooter */}
      <footer className="w-full py-6 text-center text-xs text-[#6D7974] z-20 border-t border-[#E1D8D6]/40">
        <p>
          RetailSpace Operations Platform © 2026 | <a className="hover:text-[#191C1B] hover:underline transition-colors cursor-pointer" href="#">Chính sách Bảo mật</a> • <a className="hover:text-[#191C1B] hover:underline transition-colors cursor-pointer" href="#">Bảo mật Doanh nghiệp</a>
        </p>
      </footer>
      {/* END: MainFooter */}
    </div>
  );
};
