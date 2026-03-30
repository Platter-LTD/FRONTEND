import { NextRequest, NextResponse } from "next/server"
import { BACKEND } from "@/lib/endpoints"

export const dynamic = "force-dynamic"

const AUTH_MS_URL = process.env.NEXT_PUBLIC_API_URL || "https://account-ms.fly.dev"

/**
 * PUT /api/v1/password/change — Bearer. Changes the authenticated user's password.
 */
export async function PUT(request: NextRequest) {
  const cookieAccessToken = request.cookies.get("accessToken")?.value
  const authHeader =
    request.headers.get("Authorization") ||
    request.headers.get("authorization") ||
    (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)

  try {
    const url = `${AUTH_MS_URL.replace(/\/+$/, "")}${BACKEND.password.change}`
    const body = await request.json().catch(() => ({}))

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => ({ success: false, error: "Invalid JSON from backend" }))

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status || 502 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to change password"
    console.error("[Password Change Proxy v1] Error:", message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

