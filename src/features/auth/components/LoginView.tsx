import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Play,
  Volume2,
  VolumeX,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight
} from 'lucide-react';
import { authService, AuthUser } from '../../../services/authService';
import { ActiveNavScreen } from '../../../types/mining';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser, destinationScreen: ActiveNavScreen) => void;
  onNavigateRegister?: () => void;
  onNavigateActivate?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onNavigateRegister,
  onNavigateActivate
}) => {
  const [identifier, setIdentifier] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Cinema mode: hide the UI to showcase the full-screen video
  const [cinemaMode, setCinemaMode] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const handleGoogleLogin = () => {
    setErrorMessage('Google sign-in is temporarily unavailable. Please sign in with email or create a new account.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    if (!identifier.trim() || !passcode) {
    setErrorMessage('Please enter your email and password.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.login({
        email: identifier.trim(),
        password: passcode,
        rememberMe
      });

      if (response.success && response.user) {
        setSuccessNotice(`Signed in successfully! Redirecting to the system...`);
        setTimeout(() => {
          onLoginSuccess(response.user!, response.user!.defaultScreen);
        }, 350);
      } else {
      setErrorMessage(response.error || 'Incorrect email or password.');
      }
    } catch {
      setErrorMessage('Unable to connect to the authentication server.');
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
            Online system
          </span>
        </header>
        {/* END: MainHeader */}

        <div className="flex-1 w-full max-w-[1280px] mx-auto px-6 sm:px-10 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 xl:gap-20 items-center">
          {/* BEGIN: HeroText */}
          <section className="hidden lg:block text-white" data-purpose="hero-text">
            <h2 className="text-5xl xl:text-6xl font-bold tracking-tight leading-[1.05] drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
              Retail operations{' '}
              <span className="bg-gradient-to-r from-emerald-200 via-[#CAEADA] to-white bg-clip-text text-transparent">
                precise &amp; optimized.
              </span>
            </h2>
            <p className="mt-6 text-base text-white/75 max-w-xl leading-relaxed">
              Access catalog administration, optimize retail floor layouts, and monitor inventory performance in real time.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-xl">
              {[
                { v: '100%', l: 'Role-based access' },
                { v: 'Instant', l: 'Data synchronization' },
                { v: 'Secure', l: 'Multi-layer protection' }
              ].map((it) => (
                <div key={it.l} className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:bg-white/15 hover:-translate-y-0.5 transition-all duration-300">
                  <div className="text-2xl font-bold leading-none">{it.v}</div>
                  <div className="mt-2 text-[10px] uppercase tracking-wider text-white/65">{it.l}</div>
                </div>
              ))}
            </div>
          </section>
          {/* END: HeroText */}

          {/* BEGIN: MainContentSection / LoginCard */}
          <main className="w-full max-w-[440px] mx-auto lg:mr-0 flex flex-col items-center" data-purpose="auth-container">
            <div className="w-full bg-white/90 backdrop-blur-xl rounded-[28px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] border border-white/60 p-7 sm:p-9 z-10 mx-auto animate-fadeIn" data-purpose="login-card">
              {/* Card Title */}
              <div className="text-center mb-6">
                <h1 className="text-2xl sm:text-[26px] font-bold text-[#191C1B] tracking-tight leading-snug">
                  Sign in to the system
                </h1>
                <p className="mt-1 text-xs text-[#6D7974] leading-relaxed">
                  Sign in to continue and manage your account.
                </p>
              </div>

              {/* Alert Notices */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-[#FDF2F0] border border-[#F6D5CF] text-[#98211A] text-xs flex items-center gap-2 animate-fadeIn" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#B3261E]" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successNotice && (
                <div className="mb-4 p-3 rounded-xl bg-[#EEF5F1] border border-[#D8E8DF] text-[#1E3A2F] text-xs flex items-center gap-2 animate-fadeIn" role="status">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1E3A2F]" />
                  <span>{successNotice}</span>
                </div>
              )}

              {/* Form Element */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Username / Email Field */}
                <div>
                  <label className="block text-xs font-semibold text-[#191C1B] mb-1.5" htmlFor="identifier">
                    Sign-in email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="w-full h-11 pl-10 pr-3.5 text-sm bg-[#EEF5FD] text-[#191C1B] placeholder-[#89938F] rounded-xl border border-[#D5E2F1] focus:border-[#1E3A2F] focus:ring-2 focus:ring-[#1E3A2F]/15 outline-hidden transition-all duration-200 font-medium"
                      id="identifier"
                      name="identifier"
                      placeholder="Enter your email"
                      required
                      type="email"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-semibold text-[#191C1B] mb-1.5" htmlFor="passcode">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="w-full h-11 pl-10 pr-12 text-sm bg-[#EEF5FD] text-[#191C1B] placeholder-[#89938F] rounded-xl border border-[#D5E2F1] focus:border-[#1E3A2F] focus:ring-2 focus:ring-[#1E3A2F]/15 outline-hidden transition-all duration-200 font-medium"
                      id="passcode"
                      name="passcode"
                      placeholder="••••••••••••"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                    />
                    <button
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6D7974] hover:text-[#191C1B] focus:outline-hidden select-none transition-colors cursor-pointer"
                      id="toggle-password-btn"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="pt-0.5 flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded text-[#1E3A2F] focus:ring-[#1E3A2F] cursor-pointer"
                    />
                    <span className="text-[11px] text-[#6D7974]">Remember me</span>
                  </label>
                  <a href="#" className="text-[11px] font-medium text-[#6D7974] hover:text-[#1E3A2F] transition-colors">
                    Forgot password?
                  </a>
                </div>

                {/* Primary Action Submit Button */}
                <div className="pt-2">
                  <button
                    disabled={isLoading}
                    className="w-full h-11 rounded-xl bg-[#1E3A2F] hover:bg-[#294D3F] active:scale-[0.99] text-white font-semibold text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                    type="submit"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Sign in</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* Divider Line */}
                <div className="relative flex items-center justify-center py-2.5">
                  <div className="grow border-t border-[#E1D8D6]/70"></div>
                  <span className="shrink-0 mx-3 text-[11px] text-[#89938F] font-medium uppercase tracking-wider">
                    Or continue with
                  </span>
                  <div className="grow border-t border-[#E1D8D6]/70"></div>
                </div>

                {/* Google Sign-in Option */}
                <div>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full h-11 flex items-center justify-center gap-2.5 px-4 border border-[#E1D8D6] hover:border-[#1E3A2F]/40 hover:bg-[#FAF8F5] rounded-xl text-xs font-semibold text-[#191C1B] transition-colors cursor-pointer bg-white shadow-2xs"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" fill="#4285F4"></path>
                      <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" fill="#34A853"></path>
                      <path d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z" fill="#FBBC05"></path>
                      <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" fill="#EA4335"></path>
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                </div>

                {/* Registration Link Note */}
                <div className="text-center pt-2 space-y-1.5 border-t border-[#E1D8D6]/70 mt-3">
                  <p className="text-xs text-[#6D7974]">
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => onNavigateRegister ? onNavigateRegister() : undefined}
                      className="font-semibold text-[#1E3A2F] hover:underline transition-colors cursor-pointer"
                    >
                      Create an account
                    </button>
                  </p>
                  <p className="text-[11px] text-[#6D7974]">
                    Have you received an invitation?{' '}
                    <button
                      type="button"
                      onClick={() => onNavigateActivate ? onNavigateActivate() : undefined}
                      className="font-semibold text-emerald-700 hover:underline transition-colors cursor-pointer"
                    >
                      Activate account
                    </button>
                  </p>
                </div>
              </form>
            </div>
            {/* END: LoginCard */}
          </main>
          {/* END: MainContentSection */}
        </div>

        {/* BEGIN: MainFooter */}
        <footer className="w-full py-6 text-center text-xs text-white/60 z-20 border-t border-white/10 mt-auto">
          <p>
            RetailSpace Operations Platform © 2026 | Nền tảng vận hành bán lẻ thông minh
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
