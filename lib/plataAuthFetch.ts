import { getAccessToken } from "@/lib/cookieAuth"
import { clearSecureTokens } from "@/lib/tokenManager"

let refreshPromise: Promise<string | null> | null = null
let sessionRedirectInFlight = false

/** Clear auth cookies and send the user to sign-in (idempotent). */
export async function handleSessionExpired(): Promise<never> {
  if (typeof window === "undefined") {
    throw new Error("Session expired")
  }

  if (!sessionRedirectInFlight) {
    sessionRedirectInFlight = true
    try {
      await clearSecureTokens()
    } catch {
      /* still redirect */
    }
    window.location.replace("/signin")
  }

  throw new Error("Session expired")
}

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
  // FormData must keep browser-managed multipart Content-Type (with boundary).
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData
  if (isFormData) {
    headers.delete("Content-Type")
  } else if (!headers.has("Content-Type")) {
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
    // Session was refreshed — return the response even on 401 (upstream auth/permission issue).
    return fetch(input, buildInit(newToken, init))
  }

  token = typeof window !== "undefined" ? getAccessToken() : null
  if (token) {
    response = await fetch(input, buildInit(token, init))
    if (response.status !== 401) return response
  }

  await handleSessionExpired()
  throw new Error("Session expired")
}

export function isSessionExpiredError(_status: number, error?: string): boolean {
  const msg = String(error || "").toLowerCase()
  return (
    msg === "session expired" ||
    msg.includes("session has expired") ||
    msg.includes("please sign in again") ||
    msg.includes("no refresh token")
  )
}
