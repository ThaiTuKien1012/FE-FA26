import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  Volume2, 
  VolumeX,
  Mail,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  RotateCw
} from 'lucide-react';
import { authService, AuthUser } from '../../../services/authService';
import { ActiveNavScreen } from '../../../types/mining';

interface RegisterViewProps {
  onRegisterSuccess: (user: AuthUser, destinationScreen: ActiveNavScreen) => void;
  onNavigateLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  onRegisterSuccess,
  onNavigateLogin
}) => {
  // Step 1: Email Request, Step 2: OTP Verification, Step 3: Name & Password Setup
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form fields
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Resend OTP countdown
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Video backgrounds
  const [cinemaMode, setCinemaMode] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Password rules validation (Backend: >= 12 chars, upper, lower, digit)
  const hasMinLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber;
  const isPasswordMatch = password && confirmPassword && password === confirmPassword;

  // STEP 1: Request Registration OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.requestRegistration(email);
      if (res.success) {
        setSuccessNotice(res.message);
        setStep(2);
        setResendCooldown(60); // 60s cooldown according to backend otp-cooldown-seconds
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Unable to send the verification request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (otp.trim().length !== 6) {
      setErrorMessage('The verification code must contain exactly 6 digits.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.verifyOtp(email, otp);
      if (res.success) {
        setSuccessNotice('Email verified successfully! Create your name and password to finish.');
        setStep(3);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Unable to verify the code.');
    } finally {
      setIsLoading(false);
    }
  };

  // RESEND OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await authService.resendOtp(email, 'SELF_REGISTER');
      if (res.success) {
        setSuccessNotice('A new verification code has been sent to your email.');
        setResendCooldown(60);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Unable to resend the verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3: Complete Registration
  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('Your password must be at least 12 characters and include uppercase, lowercase, and numbers.');
      return;
    }

    if (!isPasswordMatch) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Please agree to the Terms of Service.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.completeRegistration({
        email,
        name: fullName,
        password
      });

      if (res.success) {
        setSuccessNotice('Account created successfully! Signing you in...');
        // Automatically login with the new credentials
        const loginRes = await authService.login({ email, password });
        if (loginRes.success && loginRes.user) {
          setTimeout(() => {
            onRegisterSuccess(loginRes.user!, loginRes.user!.defaultScreen);
          }, 800);
        } else {
          setTimeout(() => {
            onNavigateLogin();
          }, 1200);
        }
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Unable to complete registration.');
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
      <div className={`fixed inset-0 z-0 pointer-events-none transition-opacity duration-700 bg-gradient-to-r from-[#0B1812]/80 via-[#0B1812]/25 to-transparent ${cinemaMode ? 'opacity-0' : 'opacity-100'}`} />
      <div className={`fixed inset-x-0 bottom-0 h-1/3 z-0 pointer-events-none transition-opacity duration-700 bg-gradient-to-t from-[#0B1812]/75 to-transparent ${cinemaMode ? 'opacity-30' : 'opacity-100'}`} />

      <div className={`relative z-10 min-h-screen flex flex-col transition-all duration-700 ${cinemaMode ? 'opacity-0 pointer-events-none scale-[0.98] blur-sm' : 'opacity-100'}`}>
        {/* Header */}
        <header className="w-full max-w-[1280px] mx-auto px-6 sm:px-10 pt-8 flex items-center justify-between">
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
            256-bit security
          </span>
        </header>

        {/* Content Section */}
        <div className="flex-1 w-full max-w-[1280px] mx-auto px-6 sm:px-10 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 xl:gap-20 items-center">
          <section className="hidden lg:block text-white">
            <h2 className="text-5xl xl:text-6xl font-bold tracking-tight leading-[1.05]">
              Create your account{' '}
              <span className="bg-gradient-to-r from-emerald-200 via-[#CAEADA] to-white bg-clip-text text-transparent">
                with secure verification.
              </span>
            </h2>
            <p className="mt-6 text-base text-white/75 max-w-xl leading-relaxed">
              A secure three-step registration process: verify your identity by email, activate your account, and set a multi-layer password.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-xl">
              {[
                { v: 'Verified', l: 'Email security' },
                { v: 'Instant', l: 'Immediate activation' },
                { v: 'Secure', l: 'High-standard protection' }
              ].map((it) => (
                <div key={it.l} className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-4 shadow-lg">
                  <div className="text-xl font-bold leading-none">{it.v}</div>
                  <div className="mt-2 text-[10px] uppercase tracking-wider text-white/65">{it.l}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Form Card */}
          <main className="w-full max-w-[480px] mx-auto lg:mr-0 flex flex-col items-center">
            <div className="w-full bg-white/90 backdrop-blur-xl rounded-[28px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] border border-white/60 p-7 sm:p-9 z-10 mx-auto">
              {/* Stepper Indicator */}
              <div className="mb-6 flex items-center justify-between px-2">
                {[
                  { num: 1, title: 'Email' },
                  { num: 2, title: 'Verification code' },
                  { num: 3, title: 'Password' }
                ].map((s, idx) => (
                  <React.Fragment key={s.num}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          step === s.num
                            ? 'bg-[#1E3A2F] text-white shadow-md shadow-[#1E3A2F]/30 scale-105'
                            : step > s.num
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {step > s.num ? '✓' : s.num}
                      </div>
                      <span className={`text-[10px] mt-1 font-semibold ${step >= s.num ? 'text-[#1E3A2F]' : 'text-slate-400'}`}>
                        {s.title}
                      </span>
                    </div>
                    {idx < 2 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 rounded transition-all ${
                          step > idx + 1 ? 'bg-emerald-600' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Title Header */}
              <div className="text-center mb-5">
                <h1 className="text-2xl font-bold text-[#191C1B]">
                  {step === 1 && 'Enter your registration email'}
                  {step === 2 && 'Enter verification code'}
                  {step === 3 && 'Create your profile & password'}
                </h1>
                <p className="mt-1 text-xs text-[#6D7974]">
                  {step === 1 && 'We will send a 6-digit verification code to your email.'}
                  {step === 2 && `A 6-digit verification code was sent to ${email}`}
                  {step === 3 && 'Complete your profile and create a secure password.'}
                </p>
              </div>

              {/* Alerts */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-[#FDF2F0] border border-[#F6D5CF] text-[#98211A] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#B3261E]" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successNotice && (
                <div className="mb-4 p-3 rounded-xl bg-[#EEF5F1] border border-[#D8E8DF] text-[#1E3A2F] text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1E3A2F]" />
                  <span>{successNotice}</span>
                </div>
              )}

              {/* STEP 1: Email Form */}
              {step === 1 && (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#191C1B] mb-1.5" htmlFor="reg-email">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="reg-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full h-11 pl-11 pr-3.5 text-sm bg-white text-[#191C1B] placeholder-[#89938F] rounded-xl border border-[#E1D8D6] focus:border-[#1E3A2F] focus:ring-2 focus:ring-[#1E3A2F]/15 outline-hidden transition-all font-medium"
                      />
                    </div>
                    <p className="text-[11px] text-[#6D7974] mt-1.5">
                      We will send a 6-digit verification code to your inbox.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="w-full h-11 rounded-xl bg-[#1E3A2F] hover:bg-[#294D3F] text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Continue to verification</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: OTP Verification Form */}
              {step === 2 && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-[#191C1B]" htmlFor="reg-otp">
                        Verification code (6 digits)
                      </label>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-xs text-emerald-700 hover:underline font-semibold cursor-pointer"
                      >
                        Change email
                      </button>
                    </div>
                    <div className="relative">
                      <ShieldCheck className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="reg-otp"
                        type="text"
                        maxLength={6}
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full h-11 pl-11 pr-3.5 text-base font-mono tracking-widest bg-white text-[#191C1B] placeholder-[#89938F] rounded-xl border border-[#E1D8D6] focus:border-[#1E3A2F] focus:ring-2 focus:ring-[#1E3A2F]/15 outline-hidden transition-all font-bold"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-slate-500">Didn’t receive the code?</span>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendCooldown > 0 || isLoading}
                        className="font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otp.trim().length !== 6}
                    className="w-full h-11 rounded-xl bg-[#1E3A2F] hover:bg-[#294D3F] text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Verify OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 3: Complete Profile & Password */}
              {step === 3 && (
                <form onSubmit={handleComplete} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#191C1B] mb-1">
                      Full name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full h-10 px-3.5 text-sm bg-white text-[#191C1B] placeholder-[#89938F] rounded-xl border border-[#E1D8D6] focus:border-[#1E3A2F] focus:ring-1 focus:ring-[#1E3A2F] outline-hidden font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#191C1B] mb-1">
                      Password (minimum 12 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full h-10 pl-9 pr-10 text-sm bg-white text-[#191C1B] placeholder-[#89938F] rounded-xl border border-[#E1D8D6] focus:border-[#1E3A2F] focus:ring-1 focus:ring-[#1E3A2F] outline-hidden font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="mt-1.5 grid grid-cols-2 gap-1 text-[10px]">
                      <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                        <span>{hasMinLength ? '✓' : '•'}</span> At least 12 characters
                      </span>
                      <span className={`flex items-center gap-1 ${hasUpper ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                        <span>{hasUpper ? '✓' : '•'}</span> Uppercase letter (A-Z)
                      </span>
                      <span className={`flex items-center gap-1 ${hasLower ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                        <span>{hasLower ? '✓' : '•'}</span> Lowercase letter (a-z)
                      </span>
                      <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                        <span>{hasNumber ? '✓' : '•'}</span> Number (0-9)
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#191C1B] mb-1">
                      Confirm password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className="w-full h-10 pl-9 pr-3.5 text-sm bg-white text-[#191C1B] placeholder-[#89938F] rounded-xl border border-[#E1D8D6] focus:border-[#1E3A2F] focus:ring-1 focus:ring-[#1E3A2F] outline-hidden font-medium"
                      />
                    </div>
                    {confirmPassword && (
                      <p className={`text-[10px] mt-1 ${isPasswordMatch ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}`}>
                        {isPasswordMatch ? '✓ Passwords match' : '✕ Passwords do not match'}
                      </p>
                    )}
                  </div>

                  <div className="pt-1">
                    <label className="flex items-start gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="mt-0.5 rounded text-[#1E3A2F]"
                      />
                      <span className="text-[11px] text-slate-600">
                        I agree to the system’s Terms of Service and Privacy Policy.
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !isPasswordValid || !isPasswordMatch || !agreeTerms}
                    className="w-full h-11 rounded-xl bg-[#1E3A2F] hover:bg-[#294D3F] text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Complete account creation</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Bottom Login Link */}
              <div className="text-center pt-3 border-t border-[#E1D8D6]/70 mt-4">
                <p className="text-xs text-[#6D7974]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={onNavigateLogin}
                    className="font-bold text-[#1E3A2F] hover:underline transition-colors cursor-pointer"
                  >
                    Sign in now
                  </button>
                </p>
              </div>
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer className="w-full py-5 text-center text-xs text-white/60 z-20 border-t border-white/10 mt-auto">
          <p>RetailSpace Operations Platform © 2026 | Smart retail operations platform</p>
        </footer>
      </div>

      {/* Video button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
        {cinemaMode && (
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/25 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={() => setCinemaMode(!cinemaMode)}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white text-xs font-semibold tracking-wide shadow-lg transition-all cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {cinemaMode ? 'Back to form' : 'View full-screen video'}
        </button>
      </div>
    </div>
  );
};
