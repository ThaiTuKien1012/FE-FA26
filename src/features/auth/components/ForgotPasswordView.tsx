import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { authService } from "../../../services/authService";

interface Props {
  onNavigateLogin: () => void;
}

export const ForgotPasswordView: React.FC<Props> = ({ onNavigateLogin }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const result = await authService.requestPasswordReset(email.trim());
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setMessage(result.message || "A verification code was sent to your email.");
    setStep(2);
  };
  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const result = await authService.confirmPasswordReset(
      email.trim(),
      otp.trim(),
      password,
    );
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setMessage("Password reset successfully. You can sign in now.");
    setStep(3);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#102019] px-4 py-8 text-[#191C1B] sm:px-8">
      <video className="fixed inset-0 z-0 h-full w-full object-cover" src="/videos/login-hero.mp4" autoPlay muted loop playsInline />
      <div className="fixed inset-0 z-0 bg-[#102019]/55" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1280px] flex-col">
        <header className="mb-8 flex items-center justify-between text-white">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-white/15 text-lg font-bold">▦</div><div><span className="block text-sm font-bold uppercase tracking-[0.2em]">RetailSpace</span><span className="block text-[10px] uppercase tracking-wide text-white/65">Operations Platform</span></div></div>
          <span className="hidden items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider sm:inline-flex"><ShieldCheck className="h-3 w-3" /> 256-bit security</span>
        </header>
        <div className="grid flex-1 grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_1fr] xl:gap-20">
        <section className="hidden text-white lg:block"><h2 className="text-5xl font-bold leading-[1.05] tracking-tight xl:text-6xl">Recover your account <span className="bg-gradient-to-r from-emerald-200 via-[#CAEADA] to-white bg-clip-text text-transparent">with secure verification.</span></h2><p className="mt-6 max-w-xl text-base leading-relaxed text-white/75">A secure three-step password recovery process: verify your email, confirm your identity, and create a new password.</p><div className="mt-10 grid max-w-xl grid-cols-3 gap-4">{[{ v: 'Verified', l: 'Email security' }, { v: 'Simple', l: 'Three steps' }, { v: 'Secure', l: 'Account recovery' }].map((item) => <div key={item.l} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-4 shadow-lg backdrop-blur-xl"><div className="text-xl font-bold">{item.v}</div><div className="mt-2 text-[10px] uppercase tracking-wider text-white/65">{item.l}</div></div>)}</div></section>
        <div className="w-full max-w-3xl lg:ml-auto">
        <button
          onClick={onNavigateLogin}
          className="mb-8 hidden items-center gap-2 text-sm font-semibold text-[#1E3A2F]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </button>
        <section className="rounded-[42px] border border-white/60 bg-white/95 p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-12">
          <div className="mb-8 text-center">
            <div className="hidden">
              <KeyRound />
            </div>
            <h1 className="text-3xl font-bold">{step === 1 ? 'Enter your reset email' : step === 2 ? 'Enter verification code' : 'Password updated'}</h1>
            <p className="mt-2 text-[#707973]">
              {step === 1 ? 'We will send a 6-digit verification code to your email.' : step === 2 ? 'Verify your identity and create a new password.' : 'Your password has been reset successfully.'}
            </p>
          </div>
          <div className="mb-10 grid grid-cols-3 gap-2">
            {["Email", "Verification code", "New password"].map(
              (label, index) => (
                <div key={label} className="text-center">
                  <div
                    className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${step > index ? "bg-[#1E3A2F] text-white" : "bg-[#E6EDF6] text-[#68809F]"}`}
                  >
                    {step > index ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <p
                    className={`mt-2 text-xs font-semibold ${step > index ? "text-[#1E3A2F]" : "text-[#89938F]"}`}
                  >
                    {label}
                  </p>
                </div>
              ),
            )}
          </div>
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {message}
            </div>
          )}
          {step === 1 && (
            <form onSubmit={requestCode} className="space-y-5">
              <p className="text-sm leading-6 text-[#707973]">
                Enter the email address linked to your account. If eligible, we
                will send a 6-digit verification code.
              </p>
              <label className="block text-sm font-semibold">
                Email address
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-[#89938F]" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@example.com"
                    className="w-full rounded-xl border border-[#E1D8D6] p-3 pl-11 outline-none focus:border-[#1E3A2F]"
                  />
                </div>
              </label>
              <button
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E3A2F] px-4 py-3.5 font-semibold text-white disabled:opacity-60"
              >
                {loading ? "Sending…" : "Continue"}{" "}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
          {step === 2 && (
            <form onSubmit={resetPassword} className="space-y-5">
              <p className="text-sm leading-6 text-[#707973]">
                Enter the code sent to <strong>{email}</strong>, then create a
                new secure password.
              </p>
              <label className="block text-sm font-semibold">
                Verification code
                <input
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                  className="mt-2 w-full rounded-xl border border-[#E1D8D6] p-3 tracking-[0.3em] outline-none focus:border-[#1E3A2F]"
                />
              </label>
              <label className="block text-sm font-semibold">
                New password
                <input
                  required
                  minLength={12}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 12 characters"
                  className="mt-2 w-full rounded-xl border border-[#E1D8D6] p-3 outline-none focus:border-[#1E3A2F]"
                />
              </label>
              <label className="block text-sm font-semibold">
                Confirm new password
                <input
                  required
                  minLength={12}
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your password"
                  className="mt-2 w-full rounded-xl border border-[#E1D8D6] p-3 outline-none focus:border-[#1E3A2F]"
                />
              </label>
              <button
                disabled={loading}
                className="w-full rounded-xl bg-[#1E3A2F] px-4 py-3.5 font-semibold text-white disabled:opacity-60"
              >
                {loading ? "Resetting…" : "Reset password"}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-sm font-semibold text-[#1E3A2F] hover:underline"
              >
                Use a different email
              </button>
            </form>
          )}
          {step === 3 && (
            <div className="space-y-5 text-center">
              <ShieldCheck className="mx-auto h-12 w-12 text-emerald-600" />
              <h2 className="text-xl font-bold">Password updated</h2>
              <p className="text-sm text-[#707973]">
                Your password has been reset successfully. Sign in with your new
                password.
              </p>
              <button
                onClick={onNavigateLogin}
                className="w-full rounded-xl bg-[#1E3A2F] px-4 py-3.5 font-semibold text-white"
              >
                Back to sign in
              </button>
            </div>
          )}
        </section>
        </div>
      </div>
      </div>
    </main>
  );
};
