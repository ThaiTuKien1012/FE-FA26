import React, { useEffect, useRef, useState } from 'react';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Store, 
  Calendar, 
  Key, 
  Link as LinkIcon, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { authService, AuthUser } from '../../../services/authService';

declare global { interface Window { google?: any; } }

interface ProfileViewProps {
  currentUser: AuthUser | null;
  onNavigateBack: () => void;
  onLogout: () => void;
}

interface MeData {
  userId: number;
  email: string;
  name: string;
  roleCode: string;
  storeId: number | null;
  status: string;
  emailVerified: boolean;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, onNavigateBack, onLogout }) => {
  const [me, setMe] = useState<MeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const googleInitialized = useRef(false);

  const fetchProfile = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await authService.getMe();
      if (data) {
        setMe(data);
      } else {
        setErrorMessage('Unable to load account information from the server.');
      }
    } catch {
        setErrorMessage('Unable to load account information from the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const roleLabels: Record<string, string> = {
    SYSTEM_ADMIN: 'System Administrator',
    STORE_ADMIN: 'Store Administrator',
    MERCHANDISER: 'Merchandiser',
    END_CUSTOMER: 'End Customer'
  };

  const roleLabel = me?.roleCode ? (roleLabels[me.roleCode] || me.roleCode) : 'User';
  const isActive = me?.status === 'ACTIVE';

  useEffect(() => {
    fetchProfile();
    if (!document.getElementById('google-identity-services')) {
      const script = document.createElement('script');
      script.id = 'google-identity-services'; script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  const linkGoogle = () => {
    setErrorMessage(null); setIsLinkingGoogle(true);
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '190316473848-mv2i3hg2d7qv9v332t61o4ugfj9kfpt7.apps.googleusercontent.com';
    const start = () => {
      if (!window.google?.accounts?.id) { setIsLinkingGoogle(false); setErrorMessage('Google sign-in could not be loaded.'); return; }
      const callback = async (response: { credential?: string }) => {
        if (!response.credential) { setIsLinkingGoogle(false); return; }
        try {
          const res = await fetch('/api/auth/google/link', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authService.getToken()}` }, body: JSON.stringify({ idToken: response.credential }) });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Could not link Google account.');
          setGoogleLinked(true);
        } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Could not link Google account.'); } finally { setIsLinkingGoogle(false); }
      };
      if (!googleInitialized.current) { window.google.accounts.id.initialize({ client_id: clientId, callback }); googleInitialized.current = true; }
      window.google.accounts.id.prompt((notification: any) => { if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.() || notification.isDismissedMoment?.()) setIsLinkingGoogle(false); });
    };
    if (window.google?.accounts?.id) start(); else setTimeout(start, 500);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E7E2D8]">
        <div>
          <button
            onClick={onNavigateBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#1E3A2F] hover:text-[#294D3F] mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#191C1B] tracking-tight flex items-center gap-2.5">
            Account Profile & Security Settings
          </h1>
          <p className="text-sm text-[#707973] mt-1">
            Manage identity information, system permissions, and SSO authentication links
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProfile}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-[#E7E2D8] text-[#57534E] hover:text-[#1E3A2F] hover:bg-[#F5ECE8] transition-all cursor-pointer"
            title="Refresh account information"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FDF3F2] text-[#BA1A1A] hover:bg-[#FCE7E5] text-sm font-semibold transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-[#FFF8E7] border border-[#F1D99B] text-[#7A5A00] text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#B07A00] flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Profile Card & Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Summary */}
        <div className="bg-white rounded-xl p-6 border border-[#E7E2D8] shadow-xs flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-3xl bg-[#1E3A2F] text-white text-3xl font-bold flex items-center justify-center shadow-[0_8px_20px_rgba(30,58,47,0.18)] mb-4">
            {currentUser?.avatarText || 'US'}
          </div>

          <h2 className="text-lg font-bold text-[#191C1B]">{me?.name || 'User'}</h2>
          <p className="text-xs text-[#707973] font-mono mt-0.5">{me?.email}</p>

          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-[#E5F3EB] text-[#1E3A2F]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1E3A2F]" />
            <span>{roleLabel}</span>
          </div>

          <div className="w-full mt-6 pt-6 border-t border-[#E7E2D8] text-left space-y-3 text-xs text-[#57534E]">
            <div className="flex justify-between items-center">
              <span className="text-[#8C857B]">Status:</span>
              <span className={`font-semibold flex items-center gap-1 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {isActive ? 'Active' : 'Inactive'} ({me?.status || '-'})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#8C857B]">Assigned store:</span>
              <span className="font-medium text-[#191C1B]">{me?.storeId ? `Store #${me.storeId}` : 'All systems'}</span>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Information Details & Google Linking */}
        <div className="md:col-span-2 space-y-6">
          {/* Identity details */}
          <div className="bg-white rounded-xl p-6 border border-[#E7E2D8] shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#707973] flex items-center gap-2">
              <User className="w-4 h-4 text-[#1E3A2F]" />
              Identity Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8]">
                <p className="text-xs text-[#8C857B] font-medium">Full Name</p>
                <p className="font-semibold text-[#191C1B] mt-1">{me?.name || 'Not provided'}</p>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8]">
                <p className="text-xs text-[#8C857B] font-medium">Email Address</p>
                <p className="font-semibold text-[#191C1B] mt-1 font-mono text-xs">{me?.email || '-'}</p>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8]">
                <p className="text-xs text-[#8C857B] font-medium">System Role</p>
                <p className="font-semibold text-[#191C1B] mt-1">{roleLabel}</p>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8]">
                <p className="text-xs text-[#8C857B] font-medium">Email Verification</p>
                <p className={`font-semibold mt-1 flex items-center gap-1.5 ${me?.emailVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {me?.emailVerified ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {me?.emailVerified ? 'Verified' : 'Not Verified'}
                </p>
              </div>
            </div>
          </div>

          {/* User-facing security settings */}
          <div className="bg-white rounded-xl p-6 border border-[#E7E2D8] shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#707973] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1E3A2F]" />
              Sign-in security
            </h3>
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#1E3A2F] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#191C1B]">Email sign-in is active</p>
                <p className="text-xs text-[#707973] mt-1">
                  Your account is secured with email and password authentication.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#8C857B]">{googleLinked ? 'Google account is linked to this PASPM account.' : 'Link Google to sign in faster next time.'}</p>
              {!googleLinked && <button type="button" onClick={linkGoogle} disabled={isLinkingGoogle} className="rounded-lg bg-[#1E3A2F] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">{isLinkingGoogle ? 'Connecting…' : 'Link Google account'}</button>}
              {googleLinked && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Linked</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
