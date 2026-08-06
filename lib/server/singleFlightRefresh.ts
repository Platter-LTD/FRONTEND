import { BACKEND } from "@/lib/endpoints"
import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"

const AUTH_SERVICE_URL = getPlataApiBaseUrl().replace(/\/+$/, "")

export type RefreshedTokens = {
  accessToken: string
  refreshToken?: string
}

/**
 * Concurrent refreshes with the same refresh token must share one upstream call.
 * Rotating refresh tokens: a second parallel refresh with the old token fails and
 * previously cleared cookies — logging the user out while another request succeeded.
 */
const inflightByRefreshToken = new Map<string, Promise<RefreshedTokens | null>>()

async function refreshUpstream(refreshToken: string): Promise<RefreshedTokens | null> {
  try {
    const res = await fetch(`${AUTH_SERVICE_URL}${BACKEND.auth.refresh}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    })
    const data = await res.json().catch(() => ({} as Record<string, unknown>))
    if (!res.ok || (data as { success?: boolean })?.success === false) return null

    const accessToken =
      (data as { data?: { accessToken?: string }; accessToken?: string }).data?.accessToken ??
      (data as { accessToken?: string }).accessToken
    const newRefresh =
      (data as { data?: { refreshToken?: string }; refreshToken?: string }).data?.refreshToken ??
      (data as { refreshToken?: string }).refreshToken

    if (!accessToken || typeof accessToken !== "string") return null

    return {
      accessToken,
      refreshToken: typeof newRefresh === "string" ? newRefresh : undefined,
    }
  } catch {
    return null
  }
}

/** Single-flight refresh; late callers with the same old token reuse the first result. */
export function singleFlightRefresh(refreshToken: string): Promise<RefreshedTokens | null> {
  const existing = inflightByRefreshToken.get(refreshToken)
  if (existing) return existing

  const pending = refreshUpstream(refreshToken).finally(() => {
    // Keep briefly so parallel BFF handlers that still hold the old token reuse success.
    setTimeout(() => {
      if (inflightByRefreshToken.get(refreshToken) === pending) {
        inflightByRefreshToken.delete(refreshToken)
      }
    }, 10_000)
  })

  inflightByRefreshToken.set(refreshToken, pending)
  return pending
}
