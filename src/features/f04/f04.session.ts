import { authService } from '../../services/authService';

// Session epoch survives reload and normal token refresh. Never persist tokens.
export function f04Scope(): string {
  const user = authService.getCurrentUser();
  return JSON.stringify([authService.getSessionId(), user?.id, user?.storeId, user?.role]);
}

export function canReadImports(): boolean {
  const role = authService.getCurrentUser()?.role;
  return role === 'Store Admin' || role === 'Merchandiser';
}
