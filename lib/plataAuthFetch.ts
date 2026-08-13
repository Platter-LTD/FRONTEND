import { getAccessToken } from "@/lib/cookieAuth"
import { refreshAccessTokenClient } from "@/lib/refreshAccessTokenClient"
import { clearSecureTokens } from "@/lib/tokenManager"
import { buildSigninUrl, getCurrentReturnTo } from "@/lib/authReturnTo"

let sessionRedirectInFlight = false

export function isOnAuthPage(): boolean {
  if (typeof window === "undefined") return true
  const path = window.location.pathname
  return (
    path === "/signin" ||
    path.startsWith("/signin/") ||
    path === "/forgot-password" ||
    path.startsWith("/forgot-password") ||
    path === "/reset-password" ||
    path.startsWith("/reset-password") ||
    path.startsWith("/verify-email") ||
    path.startsWith("/spring/")
  )
}

/** True when an API error body indicates the access/refresh token is dead. */
export function isInvalidOrExpiredTokenError(error?: unknown): boolean {
  const msg = String(
    typeof error === "string"
      ? error
      : error && typeof error === "object"
        ? (error as Record<string, unknown>).error ??
          (error as Record<string, unknown>).message ??
          ""
        : "",
  ).toLowerCase()
  if (!msg) return false
  return (
    msg.includes("invalid or expired") ||
    msg.includes("token expired") ||
    msg.includes("expired token") ||
    msg.includes("jwt expired") ||
    msg.includes("invalid token") ||
    msg.includes("no refresh token") ||
    msg.includes("token refresh failed") ||
    msg.includes("session has expired") ||
    msg.includes("please sign in again") ||
    (msg.includes("unauthorized") && msg.includes("token"))
  )
}

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
    if (!isOnAuthPage()) {
      window.location.replace(buildSigninUrl(getCurrentReturnTo()))
    }
  }

  throw new Error("Session expired")
}

/**
 * After a 401: try one shared refresh. If refresh fails, force sign-in.
 * Returns the new access token when refresh succeeds.
 */
export async function refreshOrRedirectToSignIn(): Promise<string> {
  const newToken = await refreshAccessTokenClient()
  if (newToken) return newToken

  // Refresh failed — only force sign-out when we also have no usable access cookie.
  // Transient 500s / race losers used to clear a valid session here.
  const existing = typeof window !== "undefined" ? getAccessToken() : null
  if (existing) {
    try {
      const payload = JSON.parse(atob(existing.split(".")[1])) as { exp?: number }
      if (payload.exp && payload.exp * 1000 > Date.now() + 5_000) {
        return existing
      }
    } catch {
      /* fall through */
    }
  }

  await handleSessionExpired()
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
 * If refresh fails, clears session and redirects to /signin.
 */
export async function plataAuthFetch(input: string, init?: RequestInit): Promise<Response> {
  let token = typeof window !== "undefined" ? getAccessToken() : null
  let response = await fetch(input, buildInit(token, init))

  if (response.status !== 401) return response

  // Don't try refresh loops against auth endpoints themselves.
  const url = typeof input === "string" ? input : ""
  if (
    url.includes("/api/auth/login") ||
    url.includes("/api/auth/refresh") ||
    url.includes("/api/v1/auth/login")
  ) {
    return response
  }

  const newToken = await refreshOrRedirectToSignIn()
  response = await fetch(input, buildInit(newToken, init))

  // Retry still unauthorized with a fresh token → permission issue, not expired session.
  if (response.status === 401) {
    const body = await response
      .clone()
      .json()
      .catch(() => ({} as Record<string, unknown>))
    if (isInvalidOrExpiredTokenError(body)) {
      await handleSessionExpired()
    }
  }

  return response
}

export function isSessionExpiredError(_status: number, error?: string): boolean {
  return isInvalidOrExpiredTokenError(error) || String(error || "").toLowerCase() === "session expired"
}
