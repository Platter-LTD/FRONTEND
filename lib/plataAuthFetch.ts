import { getAccessToken } from "@/lib/cookieAuth"

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessTokenClient(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.success) return null
        return (data.data?.accessToken ?? data.accessToken ?? null) as string | null
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

function buildInit(token: string | null, init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers)
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  } else {
    headers.delete("Authorization")
  }
  return {
    ...init,
    credentials: "include",
    headers,
  }
}

/**
 * Browser fetch for Plata BFF routes with cookie session + one refresh retry on 401.
 * Loan workflow and other raw fetch callers should use this instead of fetch + getAuthHeaders.
 */
export async function plataAuthFetch(input: string, init?: RequestInit): Promise<Response> {
  let token = typeof window !== "undefined" ? getAccessToken() : null
  let response = await fetch(input, buildInit(token, init))

  if (response.status !== 401) return response

  const newToken = await refreshAccessTokenClient()
  if (newToken) {
    return fetch(input, buildInit(newToken, init))
  }

  token = typeof window !== "undefined" ? getAccessToken() : null
  if (token) {
    return fetch(input, buildInit(token, init))
  }

  return response
}

export function isSessionExpiredError(status: number, error?: string): boolean {
  if (status === 401) return true
  const msg = String(error || "").toLowerCase()
  return msg.includes("invalid token") || msg.includes("token expired") || msg.includes("authorization required")
}
