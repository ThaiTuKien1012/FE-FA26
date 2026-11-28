import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { authCopy, authRequestMessage, authResponseMessage, type AuthAction } from '../src/features/auth/authMessages';

const scenarios: [string, AuthAction, number | null, string | undefined, string][] = [
  ['login 401 is generic', 'login', 401, undefined, 'Invalid email or password.'],
  ['login 401 ignores an account-specific code', 'login', 401, 'STORE_INACTIVE', 'Invalid email or password.'],
  ['inactive Store 403', 'login', 403, 'STORE_INACTIVE', authCopy.storeInactive],
  ['ordinary 403', 'login', 403, undefined, 'Access denied.'],
  ['login 429', 'login', 429, undefined, 'Too many sign-in attempts. Please wait a few minutes and try again.'],
  ['verification 429', 'verify', 429, undefined, 'Too many attempts. Please wait and try again.'],
  ['resend 429', 'resend', 429, undefined, 'Please wait before requesting another code.'],
  ['reset request 429', 'reset-request', 429, undefined, 'Please wait before requesting another code.'],
  ['wrong, expired or exhausted OTP shares 400', 'verify', 400, undefined, 'This code could not be verified. Check it or request a new one.'],
  ['activation OTP failure shares 400', 'activate', 400, undefined, 'This code could not be verified. Check it or request a new one.'],
  ['invalid request 400', 'login', 400, undefined, 'Check the information you entered and try again.'],
  ['registration conflict 409', 'register', 409, undefined, 'This email is already registered.'],
  ['unclassified status', 'verify', 404, undefined, 'The request could not be completed. Please try again.'],
  ['Google sign-in 503 says Google is unavailable (TC-F01-012)', 'google', 503, undefined, 'Google sign-in is currently unavailable. Please use your email and password.'],
  ['Google sign-in keeps the generic sign-in errors', 'google', 401, undefined, 'Invalid email or password.'],
  ['Google sign-in 500 stays the generic server error', 'google', 500, undefined, authCopy.server],
  ['a 503 outside Google sign-in stays the generic server error', 'login', 503, undefined, authCopy.server],
  ['500 failure', 'login', 500, undefined, authCopy.server],
  ['503 failure', 'resend', 503, undefined, authCopy.server],
  ['network failure', 'reset-request', null, undefined, authCopy.network],
];

for (const [name, action, status, code, text] of scenarios) {
  test(name, () => assert.equal(authRequestMessage(action, status, code), text));
}

test('auth responses ignore raw Backend text and handle empty or non-JSON responses', async () => {
  for (const body of ['{"error":"This account is disabled"}', '', '<html>private message</html>']) {
    assert.equal(await authResponseMessage('login', new Response(body, { status: 401 })), 'Invalid email or password.');
  }
});

// Every auth screen announces its one alert area to screen readers (role="alert" for errors, role="status" for notices).
test('each auth screen announces its error and notice areas', () => {
  for (const view of ['LoginView', 'RegisterView', 'ActivateView', 'ForgotPasswordView']) {
    const source = readFileSync(new URL(`../src/features/auth/components/${view}.tsx`, import.meta.url), 'utf8');
    assert.match(source, /role="alert"/, `${view} has an alert area`);
    assert.match(source, /role="status"/, `${view} has a status area`);
  }
});
