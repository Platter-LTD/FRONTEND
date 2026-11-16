import { resolveApiInput } from "@/lib/plataApiBaseUrl"

/**
 * Plain `fetch` for gateway paths: `/api/v1/*` goes to the Plata gateway, and cookies are only
 * sent to our own origin (the gateway is Bearer-only, and credentialed CORS is not enabled on it).
 * Callers keep setting their own headers (Authorization etc.) as before.
 */
export function gatewayFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const url = resolveApiInput(input)
  const sameOrigin = url.startsWith("/")
  return fetch(url, { ...init, credentials: sameOrigin ? init.credentials : "omit" })
}
