import { NextRequest, NextResponse } from "next/server"
import { BACKEND } from "@/lib/endpoints"
import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"
import { plataCookieOpts } from "@/lib/server/plataSessionRefresh"

export const dynamic = "force-dynamic"

/**
 * POST /api/auth/clear-tokens — logout.
 * Best-effort revokes the session on the backend, then always clears both auth cookies.
 */
export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value
  const refreshToken = request.cookies.get("refreshToken")?.value

  if (accessToken || refreshToken) {
    try {
      await fetch(`${getPlataApiBaseUrl()}${BACKEND.auth.logout}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      })
    } catch (err) {
      console.warn("[auth/clear-tokens] backend logout failed; clearing cookies anyway", err)
    }
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set("accessToken", "", plataCookieOpts(0, false))
  response.cookies.set("refreshToken", "", plataCookieOpts(0, true))
  return response
}
