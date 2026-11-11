import { ArrowRight, Heart, Menu, Search, ShoppingCart, UserRound, X } from 'lucide-react';
import { APP_BRAND } from '../../../app/branding';
import { AppLogo } from '../../../components/common/AppLogo';
import { AvatarDropdown } from '../../../components/common/AvatarDropdown';
import type { AuthUser } from '../../../services/authService';
import { containerClass } from './CustomerCommerce';

interface CustomerHeaderProps {
  query: string;
  setQuery: (value: string) => void;
  onSearch: () => void;
  savedCount: number;
  savedOnly: boolean;
  toggleSavedOnly: () => void;
  cartCount: number;
  openCart: () => void;
  onLogin: () => void;
  onHome?: () => void;
  user?: AuthUser | null;
  onProfile?: () => void;
  onLogout?: () => void;
  menuOpen?: boolean;
  onToggleMenu?: () => void;
}

const iconButtonClass = 'relative flex items-center justify-center border-0 bg-transparent p-[7px] max-[580px]:p-[5px]';

export function CustomerHeader({ query, setQuery, onSearch, savedCount, savedOnly, toggleSavedOnly, cartCount, openCart, onLogin, onHome, user, onProfile, onLogout, menuOpen = false, onToggleMenu }: CustomerHeaderProps) {
  return (<>
      <div className="fm-topbar bg-[#088178] text-[10px] text-[#def3ed] max-[580px]:text-[8px]">
        <div className={`${containerClass} flex min-h-8 items-center justify-between gap-5 max-[580px]:min-h-[30px] max-[580px]:gap-2`}>
          <span>Your favorite stores. <strong className="font-medium text-[#e4f0a2]">Everyday favorites, all in one place.</strong></span>
          <span className="flex items-center gap-[13px] max-[580px]:text-[0px]">Stores & everyday favorites <span className="rounded-full border border-white/30 px-[9px] py-px text-[8px] max-[580px]:text-[7px]">Demo</span></span>
        </div>
      </div>

      <header className={`fm-header ${containerClass} flex min-h-[88px] items-center gap-9 max-[1100px]:min-h-[82px] max-[1100px]:gap-6 max-[800px]:gap-[18px] max-[580px]:min-h-[122px] max-[580px]:flex-wrap max-[580px]:justify-between max-[580px]:gap-0 max-[580px]:py-4`}>
        <a href="/customer-home" onClick={event => { if (onHome) { event.preventDefault(); onHome(); } }} className="fm-logo inline-flex items-center gap-[9px] whitespace-nowrap text-[25px] tracking-[-1.2px] text-[#088178] max-[1100px]:gap-[7px] max-[1100px]:text-[23px] max-[800px]:text-[21px] max-[580px]:text-2xl max-[360px]:text-[21px]" aria-label={`${APP_BRAND.name} — Home`}>
          <AppLogo className="fm-brand-symbol size-8 shrink-0 max-[800px]:size-7 max-[580px]:size-[29px]" /><strong className="font-[750]">{APP_BRAND.name}</strong>
        </a>
        <form className="fm-search flex h-11 min-w-0 flex-1 items-center gap-[11px] rounded-full border border-[#eceeee] bg-[#fafafa] p-[5px] pl-[18px] max-[800px]:gap-[7px] max-[800px]:pl-3 max-[580px]:order-3 max-[580px]:mt-[14px] max-[580px]:h-[38px] max-[580px]:basis-full" role="search" onSubmit={event => { event.preventDefault(); onSearch(); }}>
          <Search size={18} className="shrink-0 text-[#929a9a] max-[580px]:size-[15px]" />
          <input className="w-full min-w-0 border-0 bg-transparent text-[11px] outline-none placeholder:text-[#9ba3a3] max-[800px]:text-[10px]" type="search" aria-label="Search products or brands" placeholder="Search for products or your favorite brands..." value={query} onChange={event => setQuery(event.target.value)} />
          <button className="flex items-center gap-3 rounded-full border-0 bg-[#088178] px-4 py-2 text-[10px] whitespace-nowrap text-white hover:bg-[#06685f] max-[800px]:gap-0 max-[800px]:p-2 max-[800px]:text-[0px] max-[580px]:gap-2 max-[580px]:px-[11px] max-[580px]:py-[6px] max-[580px]:text-[9px]" type="submit">Search <ArrowRight size={15} /></button>
        </form>
        <div className="fm-header-actions flex items-center gap-4 max-[1100px]:gap-3 max-[800px]:gap-2">
          <button className={`${iconButtonClass} ${savedOnly ? 'text-[#d25b53]' : ''}`} aria-label={`Wishlist (${savedCount})`} aria-pressed={savedOnly} onClick={toggleSavedOnly}>
            <Heart size={21} />{savedCount > 0 && <span className="absolute top-0 -right-px grid size-[15px] place-items-center rounded-full bg-[#e76b58] text-[8px] text-white">{savedCount}</span>}
          </button>
          <button className={`${iconButtonClass} fm-cart-trigger`} aria-label={`Open demo cart (${cartCount})`} onClick={openCart}>
            <ShoppingCart size={22} />{cartCount > 0 && <span className="absolute top-0 -right-px grid size-[15px] place-items-center rounded-full bg-[#e76b58] text-[8px] text-white">{cartCount}</span>}
          </button>
          {user ? <AvatarDropdown user={user} onProfile={onProfile || onLogin} onLogout={onLogout} /> : <button className="grid size-8 place-items-center rounded-full border border-[#d3e9df] bg-[#e3f0e6] text-[#088178] max-[580px]:size-7" onClick={onLogin} aria-label="Sign In"><UserRound size={18} /></button>}
          {onToggleMenu && <button className="hidden items-center justify-center border-0 bg-transparent p-[5px] max-[580px]:flex" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => onToggleMenu?.()}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>}
        </div>
      </header>

  </>);
}
