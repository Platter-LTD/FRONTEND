/**
 * Single in-flight refresh for all browser clients (axios, plataAuthFetch, fetchWithAuth).
 * Concurrent 401s must share one refresh — rotating refresh tokens make parallel
 * /api/auth/refresh calls race and falsely log the user out (e.g. Mortgage Workflow
 * loads while the sidebar re-fetches KYC on pathname change).
 */

let refreshPromise: Promise<string | null> | null = null

export async function refreshAccessTokenClient(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data?.success === false) return null
        const access = data?.data?.accessToken ?? data?.accessToken
        return typeof access === "string" && access.length > 0 ? access : null
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}
