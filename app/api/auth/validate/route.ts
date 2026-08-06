import { NextRequest, NextResponse } from "next/server"

import { namesFromJwtPayload } from "@/lib/userNameFromClaims"
import {
  applyRefreshedTokens,
  refreshTokensFromRequest,
} from "@/lib/server/plataSessionRefresh"

function userFromPayload(payload: Record<string, unknown>) {
  const { firstName, lastName } = namesFromJwtPayload(payload)
  return {
    id: (payload.userId ?? payload.sub) as string,
    email: (payload.email ?? "") as string,
    firstName,
    lastName,
    role: (payload.userType ?? payload.role) as string | undefined,
  }
}

/** 401 without wiping cookies — clearing here races concurrent refresh and logs users out. */
function unauthorized(body: Record<string, unknown>) {
  return NextResponse.json(body, { status: 401 })
}

/**
 * If access token is missing or expired, try to refresh using refreshToken cookie.
 */
async function tryRefreshAndRespond(request: NextRequest): Promise<NextResponse | null> {
  const tokens = await refreshTokensFromRequest(request)
  if (!tokens?.accessToken) return null

  const parts = tokens.accessToken.split(".")
  if (parts.length !== 3) return null
  const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8")) as Record<
    string,
    unknown
  >

  const response = NextResponse.json({
    success: true,
    valid: true,
    user: userFromPayload(payload),
  })
  applyRefreshedTokens(response, tokens)
  return response
}

/**
 * API Route to validate JWT token server-side.
 * If access token is missing or expired, attempts refresh using refreshToken cookie before returning 401.
 */
export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("accessToken")?.value

    if (!accessToken) {
      const refreshResponse = await tryRefreshAndRespond(request)
      if (refreshResponse) return refreshResponse
      return unauthorized({ success: false, valid: false, error: "No access token found" })
    }

    try {
      const parts = accessToken.split(".")
      if (parts.length !== 3) {
        throw new Error("Invalid token structure")
      }
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8")) as Record<
        string,
        unknown
      >

      if (payload.exp && (payload.exp as number) * 1000 < Date.now()) {
        const refreshResponse = await tryRefreshAndRespond(request)
        if (refreshResponse) return refreshResponse
        return unauthorized({ success: false, valid: false, error: "Token expired" })
      }

      return NextResponse.json({
        success: true,
        valid: true,
        user: userFromPayload(payload),
      })
    } catch {
      const refreshResponse = await tryRefreshAndRespond(request)
      if (refreshResponse) return refreshResponse
      return unauthorized({ success: false, valid: false, error: "Invalid token format" })
    }
  } catch (error: unknown) {
    console.error("Validate token error:", error)
    return NextResponse.json(
      { success: false, valid: false, error: "Token validation failed" },
      { status: 500 },
    )
  }
}

/**
 * POST endpoint for validating token against auth service
 * Use this for critical operations that require full server validation
 */
export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("accessToken")?.value

    if (!accessToken) {
      const refreshResponse = await tryRefreshAndRespond(request)
      if (refreshResponse) return refreshResponse
      return unauthorized({ success: false, valid: false, error: "No access token found" })
    }

    const { getPlataApiBaseUrl } = await import("@/lib/plataApiBaseUrl")
    const { BACKEND } = await import("@/lib/endpoints")
    const AUTH_SERVICE_URL = getPlataApiBaseUrl().replace(/\/+$/, "")

    const authResponse = await fetch(`${AUTH_SERVICE_URL}${BACKEND.auth.me}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!authResponse.ok) {
      const refreshResponse = await tryRefreshAndRespond(request)
      if (refreshResponse) return refreshResponse
      const errorData = await authResponse.json().catch(() => ({}))
      return unauthorized({
        success: false,
        valid: false,
        error: (errorData as { error?: string }).error || "Token validation failed",
      })
    }

    const userData = await authResponse.json()

    return NextResponse.json({
      success: true,
      valid: true,
      user: userData.data || userData.user || userData,
    })
  } catch (error: unknown) {
    console.error("Full token validation error:", error)
    return NextResponse.json(
      { success: false, valid: false, error: "Token validation failed" },
      { status: 500 },
    )
  }
}
