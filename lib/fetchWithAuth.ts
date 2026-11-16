/**
 * Client-side fetch that on 401 attempts silent refresh then retries once.
 * When refresh fails, clears session and redirects to /signin.
 */

import { getAccessToken } from '@/lib/cookieAuth';
import { resolveApiInput } from '@/lib/plataApiBaseUrl';
import { handleSessionExpired, isInvalidOrExpiredTokenError, refreshOrRedirectToSignIn } from '@/lib/plataAuthFetch';

export type FetchWithAuthOptions = RequestInit & {
  /** Skip adding Authorization header (e.g. for public endpoints) */
  skipAuth?: boolean;
  /** Applied after defaults (e.g. wallet-ms role hints: x-user-role) */
  additionalHeaders?: Record<string, string>;
};

function isSameOrigin(input: RequestInfo | URL): boolean {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (raw.startsWith('/')) return true;
  if (typeof window === 'undefined') return false;
  try {
    return new URL(raw).origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Fetch with Bearer token. On 401, refreshes once then retries.
 * If refresh fails (or retry still reports expired token), redirects to sign-in.
 */
export async function fetchWithAuth(
  rawInput: RequestInfo | URL,
  options: FetchWithAuthOptions = {}
): Promise<Response> {
  const input = resolveApiInput(rawInput);
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

  // Cookies only go to our own origin (/api/auth/*); gateway calls are Bearer-only.
  const credentials = init.credentials ?? (isSameOrigin(input) ? 'include' : 'omit');
  let res = await fetch(input, { ...init, headers, credentials });

  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshOrRedirectToSignIn();
    headers.set('Authorization', `Bearer ${newToken}`);
    res = await fetch(input, { ...init, headers, credentials });

    if (res.status === 401) {
      const body = await res.clone().json().catch(() => ({}));
      if (isInvalidOrExpiredTokenError(body)) {
        await handleSessionExpired();
      }
    }
  }

  return res;
}
