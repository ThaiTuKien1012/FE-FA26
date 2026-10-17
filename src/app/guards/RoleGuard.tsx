import React from 'react';
import { ActiveNavScreen } from '../../types/mining';
import { AuthUser, authService } from '../../services/authService';

export const RoleGuard: React.FC<{
  user: AuthUser | null;
  screen: ActiveNavScreen;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ user, screen, children, fallback = null }) => (
  user && authService.isScreenAllowed(user, screen) ? <>{children}</> : <>{fallback}</>
);
