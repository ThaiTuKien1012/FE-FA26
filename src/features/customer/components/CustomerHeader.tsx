import { ArrowRight, Search, UserRound } from 'lucide-react';
import { APP_BRAND } from '../../../app/branding';
import { AppLogo } from '../../../components/common/AppLogo';
import { AvatarDropdown } from '../../../components/common/AvatarDropdown';
import type { AuthUser } from '../../../services/authService';
import { containerClass } from './CustomerCommerce';

export interface CustomerHeaderProps {
  query?: string;
  setQuery?: (value: string) => void;
  onSearch?: () => void;
  onLogin: () => void;
  onHome: () => void;
  user?: AuthUser | null;
  onProfile?: () => void;
  onLogout?: () => void;
}
export function CustomerHeader({ query = '', setQuery, onSearch, onLogin, onHome, user, onProfile, onLogout }: CustomerHeaderProps) {
  return <>
    <div className="bg-[#088178] py-2 text-xs text-[#def3ed]"><div className={containerClass}>Khám phá sản phẩm từ các cửa hàng trên {APP_BRAND.name}.</div></div>
    <header className={`${containerClass} flex min-h-24 flex-wrap items-center gap-6 py-4 max-[580px]:gap-4`}>
      <a href="/customer-home" onClick={event => { event.preventDefault(); onHome(); }} className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-[#088178]"><AppLogo className="size-8" />{APP_BRAND.name}</a>
      {setQuery && <form className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-[#e1e8e3] bg-[#fafcfb] pl-4 pr-1 max-[580px]:order-3 max-[580px]:basis-full" role="search" onSubmit={event => { event.preventDefault(); onSearch?.(); }}><Search size={17} className="shrink-0 text-[#7b9586]" /><input className="min-w-0 flex-1 bg-transparent text-sm outline-none" type="search" aria-label="Tìm sản phẩm" placeholder="Tìm sản phẩm…" value={query} onChange={event => setQuery(event.target.value)} /><button type="submit" className="flex items-center gap-2 rounded-full bg-[#088178] px-4 py-2 text-sm text-white">Tìm kiếm<ArrowRight size={15} /></button></form>}
      <div className="ml-auto">{user ? <AvatarDropdown user={user} onProfile={onProfile || onLogin} onLogout={onLogout} /> : <button className="flex items-center gap-2 rounded-full border border-[#cfe3d8] px-4 py-2 text-sm text-[#088178]" onClick={onLogin}><UserRound size={18} />Đăng nhập</button>}</div>
    </header>
  </>;
}
