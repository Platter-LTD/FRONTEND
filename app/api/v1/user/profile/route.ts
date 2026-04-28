import { NextRequest, NextResponse } from "next/server"
import { BACKEND } from "@/lib/endpoints"
import { plataUpstreamAxios } from "@/lib/server/plataUpstreamAxios"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/v1/user/profile
 * PUT /api/v1/user/profile
 */
export async function GET(request: NextRequest) {
  try {
    const cookieAccessToken = request.cookies.get("accessToken")?.value
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization") ||
      (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)

    const resp = await plataUpstreamAxios.get(BACKEND.user.profile, {
      headers: {
        ...(authHeader && { Authorization: authHeader }),
      },
    })

    const data = resp.data ?? {}

    if (resp.status < 200 || resp.status >= 300) {
      return NextResponse.json(
        {
          success: false,
          error: (data as { error?: string }).error || (data as { message?: string }).message || "Failed to fetch user profile",
        },
        { status: resp.status || 502 },
      )
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error("User profile proxy error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch user profile" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieAccessToken = request.cookies.get("accessToken")?.value
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization") ||
      (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)
    const body = await request.json().catch(() => ({}))

    const resp = await plataUpstreamAxios.put(BACKEND.user.updateProfile, body, {
      headers: {
        ...(authHeader && { Authorization: authHeader }),
      },
    })

    const data = resp.data ?? {}

    if (resp.status < 200 || resp.status >= 300) {
      return NextResponse.json(
        {
          success: false,
          error: (data as { error?: string }).error || (data as { message?: string }).message || "Failed to update user profile",
        },
        { status: resp.status || 502 },
      )
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error("User profile update proxy error:", error)
    return NextResponse.json({ success: false, error: "Failed to update user profile" }, { status: 500 })
  }
}
