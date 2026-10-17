import React from 'react';
import { AuthUser } from '../../services/authService';

export const AuthGuard: React.FC<{
  user: AuthUser | null;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ user, children, fallback = null }) => user ? <>{children}</> : <>{fallback}</>;
