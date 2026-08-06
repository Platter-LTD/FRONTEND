/**
 * Client-side fetch that on 401 attempts silent refresh then retries once.
 * When refresh fails, clears session and redirects to /signin.
 */

import { getAccessToken } from '@/lib/cookieAuth';
import { handleSessionExpired, isInvalidOrExpiredTokenError, refreshOrRedirectToSignIn } from '@/lib/plataAuthFetch';

export type FetchWithAuthOptions = RequestInit & {
  /** Skip adding Authorization header (e.g. for public endpoints) */
  skipAuth?: boolean;
  /** Applied after defaults (e.g. wallet-ms role hints: x-user-role) */
  additionalHeaders?: Record<string, string>;
};

/**
 * Fetch with Bearer token. On 401, refreshes once then retries.
 * If refresh fails (or retry still reports expired token), redirects to sign-in.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  options: FetchWithAuthOptions = {}
): Promise<Response> {
  const { skipAuth = false, additionalHeaders, ...init } = options;
  const token = typeof window !== 'undefined' && !skipAuth ? getAccessToken() : null;
  const headers = new Headers(init.headers);
  if (token && !skipAuth) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (additionalHeaders) {
    for (const [key, value] of Object.entries(additionalHeaders)) {
      if (value != null && value !== '') headers.set(key, value);
    }
  }

  let res = await fetch(input, { ...init, headers, credentials: init.credentials ?? 'include' });

  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshOrRedirectToSignIn();
    headers.set('Authorization', `Bearer ${newToken}`);
    res = await fetch(input, { ...init, headers, credentials: init.credentials ?? 'include' });

    if (res.status === 401) {
      const body = await res.clone().json().catch(() => ({}));
      if (isInvalidOrExpiredTokenError(body)) {
        await handleSessionExpired();
      }
    }
  }

  return res;
}
