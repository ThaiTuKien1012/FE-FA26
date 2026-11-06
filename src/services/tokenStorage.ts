import { authService } from './authService';

// Compatibility facade: credentials are managed in memory by AuthSession.
export const tokenStorage = { get: authService.getToken, clear: authService.endLocal };
