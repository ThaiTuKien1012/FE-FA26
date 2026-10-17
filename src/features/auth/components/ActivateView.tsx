import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck,
  RotateCw,
  Play,
  Volume2,
  VolumeX,
  Sparkles,
  Check
} from 'lucide-react';
import { authService } from '../../../services/authService';

interface ActivateViewProps {
  onNavigateLogin: () => void;
}

export const ActivateView: React.FC<ActivateViewProps> = ({ onNavigateLogin }) => {
  // Support auto-fill if user clicks link with query params (?email=...&otp=...)
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Multi-step flow: 1 = Verify Invite & OTP, 2 = Set Password, 3 = Activated Success
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Video backgrounds & Cinema Mode
  const [cinemaMode, setCinemaMode] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Check URL query parameters on initial render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get('email');
      const urlOtp = params.get('otp') || params.get('code');
      if (urlEmail) setEmail(urlEmail);
      if (urlOtp) setOtp(urlOtp.replace(/\D/g, '').slice(0, 6));
    }
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Password rules validation (Backend requirement: >= 12 chars, upper, lower, digit)
  const hasMinLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber;
  const isMatch = password && confirmPassword && password === confirmPassword;

  // Handle Step 1: Check Invite & OTP
  const handleProceedToPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMessage('Mã xác nhận phải gồm đúng 6 chữ số.');
      return;
    }

    setStep(2);
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Vui lòng nhập địa chỉ email trước khi yêu cầu gửi lại mã.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await authService.resendOtp(cleanEmail, 'ADMIN_INVITE');
      if (res.success) {
        setSuccessNotice('Mã kích hoạt mới đã được gửi tới email của bạn.');
        setResendCooldown(60);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Không thể gửi lại mã kích hoạt. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 2: Final Activation Submission
  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (!isPasswordValid) {
      setErrorMessage('Mật khẩu cần tối thiểu 12 ký tự, bao gồm chữ hoa, chữ thường và chữ số.');
      return;
    }

    if (!isMatch) {
      setErrorMessage('Xác nhận mật khẩu không khớp. Vui lòng kiểm tra lại.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.activateAccount({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        password
      });

      if (response.success) {
        setStep(3);
        setTimeout(() => {
          onNavigateLogin();
        }, 2200);
      } else {
        setErrorMessage(response.message || 'Kích hoạt không thành công. Vui lòng kiểm tra lại mã kích hoạt.');
      }
    } catch {
      setErrorMessage('Không thể kết nối đến máy chủ xác thực.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#102019] text-[#191C1B] selection:bg-[#1E3A2F] selection:text-white antialiased font-sans">
      {/* Background Video */}
      <video
        className="fixed inset-0 w-full h-full object-cover z-0"
        src="/videos/login-hero.mp4"
        autoPlay
        muted={isMuted}
        loop
        playsInline
        preload="auto"
      />
      {/* Smooth cinematic gradient overlays */}
      <div className={`fixed inset-0 z-0 pointer-events-none transition-opacity duration-700 bg-gradient-to-r from-[#0B1812]/85 via-[#0B1812]/30 to-transparent ${cinemaMode ? 'opacity-0' : 'opacity-100'}`} />
      <div className={`fixed inset-x-0 bottom-0 h-1/3 z-0 pointer-events-none transition-opacity duration-700 bg-gradient-to-t from-[#0B1812]/80 to-transparent ${cinemaMode ? 'opacity-30' : 'opacity-100'}`} />
      <div className={`fixed inset-0 z-0 pointer-events-none transition-opacity duration-700 bg-[#1E3A2F]/10 ${cinemaMode ? 'opacity-0' : 'opacity-100'}`} />

      {/* Main Page Container */}
      <div className={`relative z-10 min-h-screen flex flex-col justify-between transition-all duration-700 ${cinemaMode ? 'opacity-0 pointer-events-none scale-[0.98] blur-sm' : 'opacity-100'}`}>
        
        {/* Top Header */}
        <header className="w-full max-w-[1280px] mx-auto px-6 sm:px-10 pt-6 sm:pt-8 flex items-center justify-between">
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

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCinemaMode(!cinemaMode)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-[11px] font-medium text-white transition-all cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current text-emerald-300" />
              <span>Xem video</span>
            </button>
            <span className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-semibold tracking-wider uppercase text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Bảo mật 256-bit
            </span>
          </div>
        </header>

        {/* Central Content Section */}
        <div className="w-full max-w-[1280px] mx-auto px-6 sm:px-10 py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 xl:gap-20 items-center my-auto">
          
          {/* Left Hero Brand Content */}
          <section className="hidden lg:block text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Dành cho thành viên được mời</span>
            </div>

            <h2 className="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.15] drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
              Kích hoạt tài khoản
              <span className="bg-gradient-to-r from-emerald-200 via-[#CAEADA] to-white bg-clip-text text-transparent block mt-2">
                nhân viên &amp; đối tác.
              </span>
            </h2>

            <p className="mt-5 text-sm xl:text-base text-white/75 max-w-lg leading-relaxed">
              Chào mừng bạn gia nhập hệ thống bán lẻ RetailSpace. Nhập mã kích hoạt từ thư mời của Quản trị viên và thiết lập mật khẩu bảo mật để truy cập bảng điều khiển.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3.5 max-w-lg">
              {[
                { v: 'Xác thực', l: 'Mã gửi qua email' },
                { v: 'Tức thời', l: 'Kích hoạt phân quyền' },
                { v: 'Bảo mật', l: 'Mã hóa an toàn' }
              ].map((it) => (
                <div key={it.l} className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 px-3.5 py-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:bg-white/15 transition-all">
                  <div className="text-lg font-bold leading-none">{it.v}</div>
                  <div className="mt-1.5 text-[10px] uppercase tracking-wider text-white/65">{it.l}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Right Activation Card */}
          <main className="w-full max-w-[440px] mx-auto lg:mr-0">
            <div className="w-full bg-white/90 backdrop-blur-xl rounded-[28px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] border border-white/60 p-6 sm:p-8 animate-fadeIn">
              
              {/* Stepper Progress Bar (for steps 1 & 2) */}
              {step !== 3 && (
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === 1 ? 'bg-[#1E3A2F] text-white shadow-sm' : 'bg-emerald-600 text-white'
                    }`}>
                      {step > 1 ? <Check className="w-4 h-4" /> : '1'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Thư mời &amp; Xác thực</div>
                      <div className="text-[10px] text-slate-400">Xác thực danh tính</div>
                    </div>
                  </div>

                  <div className="w-8 h-[2px] bg-slate-200 mx-2" />

                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === 2 ? 'bg-[#1E3A2F] text-white shadow-sm' : 'bg-slate-200 text-slate-500'
                    }`}>
                      2
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Mật khẩu mới</div>
                      <div className="text-[10px] text-slate-400">Hoàn tất truy cập</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Alert Error Message */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-[#FDF2F0] border border-[#F6D5CF] text-[#98211A] text-xs flex items-center gap-2 animate-fadeIn" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#B3261E]" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Alert Success Notice */}
              {successNotice && (
                <div className="mb-4 p-3 rounded-xl bg-[#EEF5F1] border border-[#D8E8DF] text-[#1E3A2F] text-xs flex items-center gap-2 animate-fadeIn" role="status">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1E3A2F]" />
                  <span>{successNotice}</span>
                </div>
              )}

              {/* STEP 1: Verify Email & OTP */}
              {step === 1 && (
                <form onSubmit={handleProceedToPassword} className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-[#1E3A2F] flex items-center justify-center mx-auto mb-2.5">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <h1 className="text-xl font-bold text-[#191C1B]">
                      Kích hoạt tài khoản
                    </h1>
                    <p className="mt-1 text-xs text-[#6D7974]">
                      Nhập email nhận thư mời và mã kích hoạt 6 chữ số từ Quản trị viên.
                    </p>
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-xs font-semibold text-[#191C1B] mb-1.5" htmlFor="act-email">
                      Email nhận thư mời
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="act-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full h-11 pl-10 pr-3.5 text-sm bg-[#EEF5FD] text-[#191C1B] placeholder-[#89938F] rounded-xl border border-[#D5E2F1] focus:border-[#1E3A2F] focus:ring-2 focus:ring-[#1E3A2F]/15 outline-hidden transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* OTP Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-[#191C1B]" htmlFor="act-otp">
                        Mã kích hoạt (6 chữ số)
                      </label>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendCooldown > 0 || isLoading}
                        className="text-[11px] font-semibold text-[#1E3A2F] hover:underline disabled:text-slate-400 disabled:no-underline transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                        {resendCooldown > 0 ? `Gửi lại sau (${resendCooldown}s)` : 'Gửi lại mã'}
                      </button>
                    </div>
                    <div className="relative">
                      <ShieldCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="act-otp"
                        type="text"
                        maxLength={6}
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full h-11 pl-10 pr-3.5 text-base font-mono tracking-[0.35em] text-center bg-[#EEF5FD] text-[#191C1B] placeholder-[#89938F] rounded-xl border border-[#D5E2F1] focus:border-[#1E3A2F] focus:ring-2 focus:ring-[#1E3A2F]/15 outline-hidden transition-all font-bold"
                      />
                    </div>
                  </div>

                  {/* Continue Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={!email || otp.length !== 6}
                      className="w-full h-11 rounded-xl bg-[#1E3A2F] hover:bg-[#294D3F] active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>Tiếp tục thiết lập mật khẩu</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Back to Login Link */}
                  <div className="text-center pt-3 border-t border-slate-100">
                    <p className="text-xs text-[#6D7974]">
                      Đã kích hoạt trước đây?{' '}
                      <button
                        type="button"
                        onClick={onNavigateLogin}
                        className="font-semibold text-[#1E3A2F] hover:underline transition-colors cursor-pointer"
                      >
                        Quay lại Đăng nhập
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* STEP 2: Set New Password */}
              {step === 2 && (
                <form onSubmit={handleActivateSubmit} className="space-y-4">
                  <div className="text-center mb-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-[#1E3A2F] flex items-center justify-center mx-auto mb-2">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h1 className="text-xl font-bold text-[#191C1B]">
                      Thiết lập mật khẩu
                    </h1>
                    <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-[11px] text-slate-700 font-medium">
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-[#1E3A2F] hover:underline font-semibold text-[10px] ml-1"
                      >
                        Đổi
                      </button>
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <label className="block text-xs font-semibold text-[#191C1B] mb-1.5" htmlFor="act-password">
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="act-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Tối thiểu 12 ký tự"
                        className="w-full h-11 pl-10 pr-12 text-sm bg-[#EEF5FD] text-[#191C1B] placeholder-[#89938F] rounded-xl border border-[#D5E2F1] focus:border-[#1E3A2F] focus:ring-2 focus:ring-[#1E3A2F]/15 outline-hidden transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6D7974] hover:text-[#191C1B] transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Requirements Matrix */}
                    <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
                      <span className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                        Từ 12 ký tự trở lên
                      </span>
                      <span className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${hasUpper ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                        Chữ in hoa (A-Z)
                      </span>
                      <span className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${hasLower ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                        Chữ in thường (a-z)
                      </span>
                      <span className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${hasNumber ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                        Chữ số (0-9)
                      </span>
                    </div>
                  </div>

                  {/* Confirm Password Input */}
                  <div>
                    <label className="block text-xs font-semibold text-[#191C1B] mb-1.5" htmlFor="act-confirm">
                      Xác nhận lại mật khẩu
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="act-confirm"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại chính xác mật khẩu"
                        className="w-full h-11 pl-10 pr-3.5 text-sm bg-[#EEF5FD] text-[#191C1B] placeholder-[#89938F] rounded-xl border border-[#D5E2F1] focus:border-[#1E3A2F] focus:ring-2 focus:ring-[#1E3A2F]/15 outline-hidden transition-all font-medium"
                      />
                    </div>
                    {confirmPassword && (
                      <p className={`text-[11px] mt-1 font-medium ${isMatch ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {isMatch ? '✓ Mật khẩu khớp nhau' : '✕ Mật khẩu xác nhận chưa khớp'}
                      </p>
                    )}
                  </div>

                  {/* Actions Button Group */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="h-11 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Quay lại</span>
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || !isPasswordValid || !isMatch}
                      className="flex-1 h-11 rounded-xl bg-[#1E3A2F] hover:bg-[#294D3F] active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Hoàn tất kích hoạt</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Activation Completed Successfully */}
              {step === 3 && (
                <div className="text-center py-4 space-y-4 animate-fadeIn">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Kích hoạt thành công!</h2>
                    <p className="mt-2 text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                      Tài khoản của bạn đã được thiết lập thành công. Hệ thống đang tự động chuyển hướng bạn đến màn hình Đăng nhập...
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onNavigateLogin}
                      className="w-full h-11 rounded-xl bg-[#1E3A2F] hover:bg-[#294D3F] text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Đăng nhập ngay</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          </main>

        </div>

        {/* Bottom Footer */}
        <footer className="w-full py-5 text-center text-xs text-white/60 z-20 border-t border-white/10 mt-auto">
          <p>RetailSpace Operations Platform © 2026 | Nền tảng vận hành bán lẻ thông minh</p>
        </footer>
      </div>

      {/* Video Showcase Controls (Only active when in Cinema Mode) */}
      {cinemaMode && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 animate-fadeIn">
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/25 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg"
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setCinemaMode(false)}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/35 text-white text-xs font-semibold tracking-wide shadow-2xl transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Quay lại biểu mẫu kích hoạt</span>
          </button>
        </div>
      )}
    </div>
  );
};
