import React, { useState } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  Volume2, 
  VolumeX 
} from 'lucide-react';
import { authService, AuthUser } from '../../../services/authService';
import { ActiveNavScreen } from '../../../types/mining';

interface RegisterViewProps {
  onRegisterSuccess: (user: AuthUser, destinationScreen: ActiveNavScreen) => void;
  onNavigateLogin: () => void;
  initialRoleKey?: 'store-admin' | 'system-admin' | 'merchandiser' | 'customer';
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  onRegisterSuccess,
  onNavigateLogin,
  initialRoleKey = 'store-admin'
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleKey, setRoleKey] = useState<'store-admin' | 'system-admin' | 'merchandiser' | 'customer'>(initialRoleKey);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Cinema mode: hide the UI to showcase the full-screen video
  const [cinemaMode, setCinemaMode] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Password Strength Calculation
  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Yếu', color: 'text-rose-600' };
    if (score === 2) return { score: 2, label: 'Trung bình', color: 'text-amber-600' };
    if (score === 3) return { score: 3, label: 'Khá mạnh', color: 'text-emerald-600' };
    return { score: 4, label: 'Rất mạnh', color: 'text-emerald-700' };
  };

  const passwordStrength = calculatePasswordStrength(password);
  const isPasswordMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên của bạn.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu tối thiểu phải từ 6 ký tự trở lên.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Vui lòng đồng ý với Điều khoản sử dụng và Chính sách bảo mật.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.register({
        name: fullName,
        email,
        phone,
        password,
        roleKey
      });

      if (response.success && response.user && response.redirectScreen) {
        setSuccessNotice('Đăng ký tài khoản thành công! Đang chuyển hướng...');
        setTimeout(() => {
          onRegisterSuccess(response.user!, response.redirectScreen!);
        }, 600);
      } else {
        setErrorMessage(response.error || 'Đăng ký không thành công. Vui lòng thử lại.');
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
      {/* Light cinematic overlays */}
      <div className={`fixed inset-0 z-0 pointer-events-none transition-opacity duration-700 bg-gradient-to-r from-[#0B1812]/80 via-[#0B1812]/25 to-transparent ${cinemaMode ? 'opacity-0' : 'opacity-100'}`} />
      <div className={`fixed inset-x-0 bottom-0 h-1/3 z-0 pointer-events-none transition-opacity duration-700 bg-gradient-to-t from-[#0B1812]/75 to-transparent ${cinemaMode ? 'opacity-30' : 'opacity-100'}`} />
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
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
            System Online
          </span>
        </header>
        {/* END: MainHeader */}

        <div className="flex-1 w-full max-w-[1280px] mx-auto px-6 sm:px-10 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 xl:gap-20 items-center">
          {/* BEGIN: HeroText */}
          <section className="hidden lg:block text-white" data-purpose="hero-text">
            <h2 className="text-5xl xl:text-6xl font-bold tracking-tight leading-[1.05] drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
              Khởi tạo tài khoản{' '}
              <span className="bg-gradient-to-r from-emerald-200 via-[#CAEADA] to-white bg-clip-text text-transparent">
                vận hành bán lẻ.
              </span>
            </h2>
            <p className="mt-6 text-base text-white/75 max-w-xl leading-relaxed">
              Truy cập ngay vào công cụ mô phỏng bố trí A/B, theo dõi tồn kho và tối ưu quy luật giỏ hàng trên nền tảng RetailSpace.
            </p>

            {/* Clean Enterprise Metric Stats (no AI icons) */}
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-xl">
              {[
                { v: '100%', l: 'Phân quyền chuẩn' },
                { v: 'Real-time', l: 'Đồng bộ dữ liệu' },
                { v: 'SOC 2', l: 'Bảo mật tiêu chuẩn' }
              ].map((it) => (
                <div key={it.l} className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:bg-white/15 hover:-translate-y-0.5 transition-all duration-300">
                  <div className="text-2xl font-bold leading-none">{it.v}</div>
                  <div className="mt-2 text-[10px] uppercase tracking-wider text-white/65">{it.l}</div>
                </div>
              ))}
            </div>
          </section>
          {/* END: HeroText */}

          {/* BEGIN: RegisterCard Section */}
          <main className="w-full max-w-[480px] mx-auto lg:mr-0 flex flex-col items-center">
            <div className="w-full bg-white/85 backdrop-blur-xl rounded-[28px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] border border-white/60 p-7 sm:p-9 z-10 mx-auto animate-fadeIn" data-purpose="register-form-card">
              {/* Card Title */}
              <div className="text-center mb-6">
                <h1 className="text-2xl sm:text-[26px] font-bold text-[#191C1B] tracking-tight leading-snug">
                  Đăng ký Tài khoản
                </h1>
                <p className="mt-1 text-xs text-[#6D7974] leading-relaxed">
                  Thiết lập thông tin để bắt đầu vận hành hệ thống.
                </p>
              </div>

              {/* Alert Notices */}
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

              {/* Registration Form */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Field 1: Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#191C1B] mb-1.5" htmlFor="fullname">
                    Họ và tên
                  </label>
                  <input
                    id="fullname"
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-11 px-3.5 text-sm bg-white text-[#191C1B] placeholder-[#89938F] rounded-xl border border-[#E1D8D6] focus:border-[#1E3A2F] focus:ring-2 focus:ring-[#1E3A2F]/15 outline-hidden transition-all duration-200 font-medium"
                  />
                </div>

                {/* Field 2: Work Email */}
                <div>
                  <label className="block text-xs font-semibold text-[#191C1B] mb-1.5" htmlFor="reg-email">
                    Email công vụ
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    placeholder="name@retailspace.demo"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 px-3.5 text-sm bg-white text-[#191C1B] placeholder-[#89938F] rounded-xl border border-[#E1D8D6] focus:border-[#1E3A2F] focus:ring-2 focus:ring-[#1E3A2F]/15 outline-hidden transition-all duration-200 font-medium"
                  />
                </div>

                {/* Field 3: Role Selector (Segmented Cards) */}
                <div>
                  <label className="block text-xs font-semibold text-[#191C1B] mb-1.5">
                    Vai trò vận hành
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'store-admin', label: 'Store Admin', desc: 'Quản lý cửa hàng' },
                      { key: 'merchandiser', label: 'Merchandiser', desc: 'Quy hoạch kệ hàng' },
                      { key: 'system-admin', label: 'Sys Admin', desc: 'Hệ thống mining' }
                    ].map((it) => {
                      const isSelected = roleKey === it.key;
                      return (
                        <button
                          key={it.key}
                          type="button"
                          onClick={() => setRoleKey(it.key as any)}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#1E3A2F] bg-[#1E3A2F] text-white shadow-xs'
                              : 'border-[#E1D8D6] bg-white text-[#191C1B] hover:bg-[#F8FAF9]'
                          }`}
                        >
                          <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-[#191C1B]'}`}>
                            {it.label}
                          </p>
                          <p className={`text-[10px] mt-0.5 leading-snug ${isSelected ? 'text-white/80' : 'text-[#6D7974]'}`}>
                            {it.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Field 4: Password & Strength */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#191C1B]" htmlFor="reg-password">
                      Mật khẩu
                    </label>
                    {password && (
                      <span className={`text-[10px] font-bold ${passwordStrength.color}`}>
                        Độ mạnh: {passwordStrength.label}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 px-3.5 pr-14 text-sm bg-white text-[#191C1B] placeholder-[#89938F] rounded-xl border border-[#E1D8D6] focus:border-[#1E3A2F] focus:ring-2 focus:ring-[#1E3A2F]/15 outline-hidden transition-all duration-200 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-semibold text-[#6D7974] hover:text-[#191C1B] cursor-pointer transition-colors"
                    >
                      {showPassword ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>

                  {/* Password Strength Indicator Bars */}
                  {password && (
                    <div className="grid grid-cols-4 gap-1 mt-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-1 rounded-full transition-all duration-300 ${
                            passwordStrength.score >= step
                              ? step === 1
                                ? 'bg-rose-500'
                                : step === 2
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                              : 'bg-[#E1D8D6]'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Field 5: Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-[#191C1B] mb-1.5" htmlFor="confirm-passcode">
                    Xác nhận mật khẩu
                  </label>
                  <input
                    id="confirm-passcode"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full h-11 px-3.5 text-sm bg-white text-[#191C1B] placeholder-[#89938F] rounded-xl border outline-hidden transition-all duration-200 font-medium ${
                      confirmPassword
                        ? isPasswordMatch
                          ? 'border-[#1E3A2F] focus:ring-2 focus:ring-[#1E3A2F]/15'
                          : 'border-rose-400 focus:ring-2 focus:ring-rose-500/15'
                        : 'border-[#E1D8D6] focus:border-[#1E3A2F] focus:ring-2 focus:ring-[#1E3A2F]/15'
                    }`}
                  />
                  {confirmPassword && !isPasswordMatch && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">Mật khẩu xác nhận chưa khớp</p>
                  )}
                </div>

                {/* Checkbox: Agreement */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 rounded text-[#1E3A2F] focus:ring-[#1E3A2F] cursor-pointer"
                    />
                    <span className="text-[11px] text-[#6D7974] leading-snug">
                      Tôi đồng ý với{' '}
                      <a href="#" className="font-semibold text-[#1E3A2F] hover:underline">
                        Điều khoản dịch vụ
                      </a>{' '}
                      và{' '}
                      <a href="#" className="font-semibold text-[#1E3A2F] hover:underline">
                        Chính sách bảo mật
                      </a>.
                    </span>
                  </label>
                </div>

                {/* Primary Action Submit Button */}
                <div className="pt-2">
                  <button
                    disabled={isLoading}
                    type="submit"
                    className="w-full h-11 rounded-xl bg-[#1E3A2F] hover:bg-[#294D3F] active:scale-[0.99] text-white font-semibold text-sm transition-all duration-200 shadow-xs flex items-center justify-center cursor-pointer disabled:opacity-70"
                  >
                    {isLoading ? 'Đang khởi tạo tài khoản...' : 'Hoàn tất đăng ký'}
                  </button>
                </div>

                {/* Switch to Login Link */}
                <div className="text-center pt-2 border-t border-[#E1D8D6]/70 mt-3">
                  <p className="text-xs text-[#6D7974]">
                    Đã có tài khoản hệ thống?{' '}
                    <button
                      type="button"
                      onClick={onNavigateLogin}
                      className="font-bold text-[#1E3A2F] hover:underline transition-colors cursor-pointer"
                    >
                      Đăng nhập ngay
                    </button>
                  </p>
                </div>
              </form>
            </div>
          </main>
          {/* END: RegisterCard Section */}
        </div>

        {/* BEGIN: MainFooter */}
        <footer className="w-full py-5 text-center text-xs text-white/60 z-20 border-t border-white/10 mt-auto">
          <p>
            RetailSpace Operations Platform © 2026 |{' '}
            <a className="hover:text-white hover:underline transition-colors cursor-pointer" href="#">
              Chính sách Bảo mật
            </a>{' '}
            •{' '}
            <a className="hover:text-white hover:underline transition-colors cursor-pointer" href="#">
              Bảo mật Doanh nghiệp
            </a>
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
          {cinemaMode ? 'Quay lại biểu mẫu' : 'Xem toàn màn hình video'}
        </button>
      </div>
      {/* END: Video Showcase Controls */}
    </div>
  );
};
