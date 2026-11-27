export type AuthAction = 'login' | 'verify' | 'resend' | 'reset-request' | 'activate' | 'register' | 'complete';

export const authCopy = {
  network: 'Unable to connect to the server. Please try again.',
  server: 'Something went wrong. Please try again later.',
  required: 'This field is required.',
  email: 'Please enter a valid email address.',
  otpFormat: 'Enter the 6-digit verification code.',
  passwordLength: 'Enter at least 12 characters.',
  passwordMismatch: 'Passwords do not match.',
  invalidLink: 'This verification link is invalid. Enter your email and verification code below.',
  resetRequested: "If an account exists for this email, we've sent a verification code.",
  storeInactive: 'Your store is inactive. Contact your system administrator for help.',
} as const;

export function authRequestMessage(action: AuthAction, status: number | null, code?: string): string {
  if (status === null) return authCopy.network;
  if (status >= 500) return authCopy.server;
  if (status === 403 && code === 'STORE_INACTIVE') return authCopy.storeInactive;
  if (status === 401 && action === 'login') return 'Invalid email or password.';
  if (status === 429) {
    if (action === 'login') return 'Too many sign-in attempts. Please wait a few minutes and try again.';
    if (action === 'resend' || action === 'reset-request') return 'Please wait before requesting another code.';
    return 'Too many attempts. Please wait and try again.';
  }
  if (status === 400 && (action === 'verify' || action === 'activate')) {
    // F01 uses the same status for invalid, expired, consumed and exhausted challenges.
    return 'This code could not be verified. Check it or request a new one.';
  }
  if (status === 409 && action === 'register') return 'This email is already registered.';
  if (status === 403) return 'Access denied.';
  if (status === 400) return 'Check the information you entered and try again.';
  return 'The request could not be completed. Please try again.';
}

export async function authResponseMessage(action: AuthAction, response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  return authRequestMessage(action, response.status, typeof body?.code === 'string' ? body.code : undefined);
}
