import type { CustomerStorefrontSource } from '../hooks/useActiveStorefront';
import type { AuthUser } from '../../../services/authService';
import { CustomerStorefrontView } from './CustomerStorefrontView';

type Props = { source?: CustomerStorefrontSource; mockMode?: boolean; onLogin: () => void; onRegister: () => void; onExplore: () => void; user?: AuthUser | null; onProfile?: () => void; onLogout?: () => void };
/** Both entry points use one storefront, preserving the existing shared cart and account actions. */
export function CustomerHomeView({ onLogin, onRegister, onExplore, source, mockMode, user, onProfile, onLogout }: Props) {
  return <CustomerStorefrontView source={source} mockMode={mockMode} onLogin={onLogin} onRegister={onRegister} onExplore={onExplore} onHome={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })} user={user} onProfile={onProfile || onLogin} onLogout={onLogout || (() => {})} />;
}
