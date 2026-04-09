/**
 * Client-side fetch that on 401 attempts silent refresh (via /api/auth/refresh) then retries once.
 * Follows convention: do not log user out on first 401; try refresh then retry.
 * Does not force redirects when refresh fails; caller decides UI behavior.
 */

import { getAccessToken } from '@/lib/cookieAuth';

export type FetchWithAuthOptions = RequestInit & {
  /** Skip adding Authorization header (e.g. for public endpoints) */
  skipAuth?: boolean;
  /** Applied after defaults (e.g. wallet-ms role hints: x-user-role) */
  additionalHeaders?: Record<string, string>;
};

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        const newAccess = data?.data?.accessToken ?? data?.accessToken;
        return res.ok && newAccess ? newAccess : null;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Fetch with Bearer token. On 401, calls /api/auth/refresh (credentials: include),
 * then retries the request once with the new token. If refresh fails, returns the 401
 * response (caller or global handler can redirect to signin).
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

  if (res.status === 401) {
    const newToken = await doRefresh();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(input, { ...init, headers, credentials: init.credentials ?? 'include' });
    }
  }

  return res;
}
