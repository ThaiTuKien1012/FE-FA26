import React, { useEffect, useId, useRef, useState } from 'react';
import { LogOut, Settings } from 'lucide-react';
import type { AuthUser } from '../../services/authService';

interface AvatarDropdownProps {
  user?: AuthUser | null;
  onProfile: () => void;
  onLogout?: () => void;
}

export const AvatarDropdown: React.FC<AvatarDropdownProps> = ({ user, onProfile, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const initials = user?.avatarText || user?.name?.trim().split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'US';

  return (
    <div
      ref={containerRef}
      className="relative shrink-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label="Account menu"
        aria-expanded={isOpen}
        aria-controls={dropdownId}
        onClick={() => setIsOpen(previous => !previous)}
        className="w-8 h-8 rounded-full bg-[#1E3A2F] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-[0_1px_3px_rgba(41,37,36,0.08)] cursor-pointer hover:bg-[#25473A] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A2F]"
        title="Account menu"
      >
        {user?.avatarUrl ? <img src={user.avatarUrl} alt="Profile avatar" className="h-full w-full rounded-full object-cover" /> : initials}
      </button>

      {isOpen && (
        <div id={dropdownId} role="group" aria-label="Account actions" className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-[#E7E2D8] shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 text-xs">
          <div className="px-3 py-2 border-b border-[#E7E2D8]/80">
            <p className="font-bold text-sm text-[#191C1B] truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] text-[#707973] truncate">{user?.email || ''}</p>
            <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E5F3EB] text-[#1E3A2F]">{user?.role || 'Guest'}</div>
          </div>
          <div className="pt-1 mt-1 border-t border-[#E7E2D8]/80">
            <button type="button" onClick={() => { setIsOpen(false); onProfile(); }} className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[#FAF8F5] cursor-pointer text-[#191C1B] font-semibold text-xs">
              <Settings className="w-3.5 h-3.5 text-emerald-700" />
              <span>Profile &amp; Security</span>
            </button>
          </div>
          {onLogout && (
            <div className="pt-1 mt-1 border-t border-[#E7E2D8]/80">
              <button type="button" onClick={() => { setIsOpen(false); onLogout(); }} className="w-full px-3 py-2 text-left flex items-center gap-2 text-[#BA1A1A] hover:bg-[#FDF3F2] cursor-pointer font-semibold">
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
