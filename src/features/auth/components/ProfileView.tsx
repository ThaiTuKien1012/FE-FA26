import React, { useEffect, useState } from 'react';
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

  // Google link state
  const [googleIdToken, setGoogleIdToken] = useState('');
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

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
      setErrorMessage('Không thể tải thông tin tài khoản từ máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLinkGoogle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleIdToken.trim()) return;

    setIsLinkingGoogle(true);
    setLinkSuccess(null);
    setLinkError(null);

    try {
      const token = authService.getToken();
      const res = await fetch('/api/auth/google/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ idToken: googleIdToken.trim() })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setLinkSuccess(data.message || 'Liên kết tài khoản Google thành công!');
        setGoogleIdToken('');
      } else {
        setLinkError(data.error || 'Liên kết Google thất bại. Token có thể không hợp lệ hoặc đã hết hạn.');
      }
    } catch {
      setLinkError('Lỗi kết nối khi liên kết tài khoản Google.');
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-10 max-w-5xl mx-auto space-y-8 animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-emerald-950/20">
        <div>
          <button
            onClick={onNavigateBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 hover:text-emerald-900 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại bảng điều khiển</span>
          </button>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            Hồ sơ tài khoản & Cài đặt bảo mật
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage identity information, system permissions, and SSO authentication links
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProfile}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all cursor-pointer"
            title="Làm mới thông tin"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm font-semibold transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Profile Card & Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Summary */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white text-3xl font-bold flex items-center justify-center shadow-lg shadow-emerald-950/20 mb-4">
            {currentUser?.avatarText || 'US'}
          </div>

          <h2 className="text-lg font-bold text-slate-900">{me?.name || 'User'}</h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{me?.email}</p>

          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{me?.roleCode || 'User'}</span>
          </div>

          <div className="w-full mt-6 pt-6 border-t border-slate-100 text-left space-y-3 text-xs text-slate-600">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Trạng thái:</span>
              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Đang hoạt động (ACTIVE)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">User ID:</span>
              <span className="font-mono font-medium text-slate-800">#{me?.userId || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Store:</span>
              <span className="font-medium text-slate-800">{me?.storeId ? `Store #${me.storeId}` : 'Global (All system)'}</span>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Information Details & Google Linking */}
        <div className="md:col-span-2 space-y-6">
          {/* Identity details */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              Identity Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-400 font-medium">Họ và tên</p>
                <p className="font-semibold text-slate-800 mt-1">{me?.name || 'Not provided'}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-400 font-medium">Email Address</p>
                <p className="font-semibold text-slate-800 mt-1 font-mono text-xs">{me?.email}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-400 font-medium">System Role</p>
                <p className="font-semibold text-slate-800 mt-1">{me?.roleCode || '-'}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-400 font-medium">Email Verification</p>
                <p className="font-semibold text-emerald-600 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {me?.emailVerified ? 'Verified' : 'Not verified'}
                </p>
              </div>
            </div>
          </div>

          {/* Google SSO Identity Linking */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-emerald-600" />
                  Liên kết tài khoản Google
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Link a Google ID Token to this account to enable Google sign-in
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
                API F01-10
              </span>
            </div>

            {linkSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{linkSuccess}</span>
              </div>
            )}

            {linkError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{linkError}</span>
              </div>
            )}

            <form onSubmit={handleLinkGoogle} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nhập Google ID Token (hoặc thử nghiệm với token Google GIS):
                </label>
                <input
                  type="text"
                  value={googleIdToken}
                  onChange={(e) => setGoogleIdToken(e.target.value)}
                  placeholder="eyJhbGciOiJSUzI1NiIsImtpZCI6..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLinkingGoogle || !googleIdToken.trim()}
                className="px-5 py-2.5 rounded-xl font-semibold text-xs bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLinkingGoogle ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Liên kết tài khoản Google</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
