import { getAccessToken } from "@/lib/cookieAuth"
import { refreshAccessTokenClient } from "@/lib/refreshAccessTokenClient"
import { clearSecureTokens } from "@/lib/tokenManager"

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
    // Still have a cookie/token but refresh failed or another client already refreshed.
    // Do not hard-logout: workflow/permission 401s must not wipe a live session.
    return response
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
