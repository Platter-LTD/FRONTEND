import { NextRequest, NextResponse } from "next/server"
import { BACKEND } from "@/lib/endpoints"
import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"
import { plataCookieOpts } from "@/lib/server/plataSessionRefresh"

export const dynamic = "force-dynamic"

type Tokens = { accessToken?: string; refreshToken?: string }

/** Login response shapes seen from service-auth: { data: { tokens } } | { data: {...tokens} } | {...tokens}. */
function pickTokens(body: Record<string, unknown>): Tokens {
  const data = (body.data && typeof body.data === "object" ? body.data : {}) as Record<string, unknown>
  const nested = (data.tokens && typeof data.tokens === "object" ? data.tokens : {}) as Tokens
  return {
    accessToken: nested.accessToken ?? (data.accessToken as string) ?? (body.accessToken as string),
    refreshToken: nested.refreshToken ?? (data.refreshToken as string) ?? (body.refreshToken as string),
  }
}

/** Remove every refreshToken field so it never reaches browser JavaScript. */
function stripRefreshToken(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripRefreshToken)
  if (!value || typeof value !== "object") return value
  const out: Record<string, unknown> = {}
  for (const [key, v] of Object.entries(value)) {
    if (key === "refreshToken") continue
    out[key] = stripRefreshToken(v)
  }
  return out
}

/**
 * POST /api/auth/login — the one place the browser logs in.
 * Calls the gateway, stores the access token in a readable cookie and the refresh token
 * in an httpOnly cookie, and returns the login body without the refresh token.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  try {
    const res = await fetch(`${getPlataApiBaseUrl()}${BACKEND.auth.login}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const response = NextResponse.json(stripRefreshToken(data), { status: res.status })

    const { accessToken, refreshToken } = pickTokens(data)
    if (res.ok && accessToken) {
      response.cookies.set("accessToken", accessToken, plataCookieOpts(60 * 60, false))
      if (refreshToken) {
        response.cookies.set("refreshToken", refreshToken, plataCookieOpts(60 * 60 * 24 * 7, true))
      }
    }
    return response
  } catch (err) {
    console.error("[auth/login]", err)
    return NextResponse.json({ success: false, error: "Cannot reach the auth service." }, { status: 502 })
  }
}
