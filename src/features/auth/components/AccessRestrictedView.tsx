import React from 'react';
import { 
  ShieldAlert, 
  ArrowLeft, 
  UserCheck, 
  Store, 
  Cpu, 
  Layers, 
  ShoppingBag,
  Lock,
  ArrowRight
} from 'lucide-react';
import { AuthUser, SCREEN_OWNER_MAP } from '../../../services/authService';
import { ActiveNavScreen } from '../../../types/mining';

interface AccessRestrictedViewProps {
  attemptedScreen: ActiveNavScreen;
  currentUser: AuthUser | null;
  onNavigate: (screen: ActiveNavScreen) => void;
  onSwitchRole?: (roleKey: 'store-admin' | 'system-admin' | 'merchandiser' | 'customer') => void;
}

export const AccessRestrictedView: React.FC<AccessRestrictedViewProps> = ({
  attemptedScreen,
  currentUser,
  onNavigate,
  onSwitchRole,
}) => {
  const screenInfo = SCREEN_OWNER_MAP[attemptedScreen] || {
    primaryRole: 'System Admin',
    roleKey: 'system-admin',
    title: attemptedScreen,
    allowedRoles: ['System Admin']
  };

  return (
    <div className="max-w-3xl mx-auto my-12 bg-white rounded-2xl border border-[#E7E2D8] shadow-sm overflow-hidden text-[#191c1b]">
      {/* Accent Alert Header */}
      <div className="p-6 md:p-8 border-b border-[#E7E2D8] bg-[#FDF3F2] flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white border border-[#BA1A1A]/20 text-[#BA1A1A] flex items-center justify-center shrink-0 shadow-2xs">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#BA1A1A]/10 text-[#BA1A1A] font-mono">
              Access Restricted
            </span>
            <span className="text-xs text-[#707973]">Role-Based Access Control</span>
          </div>
          <h2 className="text-xl font-bold text-[#191C1B] mt-1">
            Permission Required: {screenInfo.title}
          </h2>
          <p className="text-sm text-[#707973] mt-1">
            This module is reserved for the <strong className="text-[#191C1B]">{screenInfo.primaryRole}</strong> role.
          </p>
        </div>
      </div>

      {/* Comparison Details */}
      <div className="p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current User Role */}
          <div className="p-4 rounded-xl border border-[#E7E2D8] bg-[#FAF8F5]">
            <div className="text-[11px] font-bold text-[#707973] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#1E3A2F]" />
              <span>Your Current Session</span>
            </div>
            <div className="text-base font-bold text-[#191C1B]">
              {currentUser?.name || 'Guest User'}
            </div>
            <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#E5F3EB] text-[#1E3A2F] mt-1">
              Role: {currentUser?.role || 'Unauthenticated'}
            </div>
            <p className="text-xs text-[#707973] mt-2">
              Department: {currentUser?.department || 'Operations'}
            </p>
          </div>

          {/* Required Owner Role */}
          <div className="p-4 rounded-xl border border-[#CAEADA] bg-[#F4FBF7]">
            <div className="text-[11px] font-bold text-[#1E3A2F] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#1E3A2F]" />
              <span>Required Role</span>
            </div>
            <div className="text-base font-bold text-[#191C1B]">
              {screenInfo.primaryRole}
            </div>
            <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#1E3A2F] text-white mt-1">
              Authorized Role: {screenInfo.allowedRoles.join(', ')}
            </div>
            <p className="text-xs text-[#707973] mt-2">
              Responsible for managing {screenInfo.title.toLowerCase()}.
            </p>
          </div>
        </div>

        {/* Action Guidance */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E7E2D8]">
          <button
            onClick={() => onNavigate(currentUser?.defaultScreen || 'store-inventory')}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-[#E7E2D8] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#191C1B] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#707973]" />
            <span>Return to My Dashboard ({currentUser?.defaultScreen})</span>
          </button>

          <button
            onClick={() => onNavigate('login')}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#1E3A2F] hover:bg-[#162B23] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_1px_3px_rgba(41,37,36,0.08)]"
          >
            <span>Đăng nhập tài khoản khác</span>
            <ArrowRight className="w-4 h-4 text-[#CAEADA]" />
          </button>
        </div>
      </div>
    </div>
  );
};
