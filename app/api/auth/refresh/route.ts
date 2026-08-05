import { NextRequest, NextResponse } from "next/server"

import { applyRefreshedTokens, plataCookieOpts } from "@/lib/server/plataSessionRefresh"
import { singleFlightRefresh } from "@/lib/server/singleFlightRefresh"

function clearAuthCookies(response: NextResponse) {
  response.cookies.set("accessToken", "", { ...plataCookieOpts(0, false) })
  response.cookies.set("refreshToken", "", { ...plataCookieOpts(0, true) })
  return response
}

/**
 * API Route to refresh tokens using httpOnly cookie.
 * Uses single-flight so parallel mortgage/workflow/compliance calls don't rotate-race
 * and wipe a just-refreshed session.
 */
export async function POST(request: NextRequest) {
  try {
    let refreshToken = request.cookies.get("refreshToken")?.value
    if (!refreshToken) {
      try {
        const body = await request.json().catch(() => ({}))
        refreshToken = (body as { refreshToken?: string })?.refreshToken
      } catch {
        /* no body */
      }
    }
    if (!refreshToken) {
      // No refresh cookie at all — safe to clear access remnant.
      return clearAuthCookies(
        NextResponse.json({ success: false, error: "No refresh token found" }, { status: 401 }),
      )
    }

    const tokens = await singleFlightRefresh(refreshToken)
    if (!tokens?.accessToken) {
      // Do NOT clear cookies here. A parallel request may have already rotated and
      // set new cookies; wiping would log the user out falsely.
      return NextResponse.json(
        { success: false, error: "Token refresh failed" },
        { status: 401 },
      )
    }

    const response = NextResponse.json({
      success: true,
      data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    })
    applyRefreshedTokens(response, tokens)
    return response
  } catch (error: unknown) {
    console.error("Refresh token error:", error)
    // Transient upstream/network — keep cookies so the client can retry.
    return NextResponse.json(
      { success: false, error: "Failed to refresh token" },
      { status: 500 },
    )
  }
}
