import { NextRequest, NextResponse } from "next/server"

import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"
export const dynamic = "force-dynamic"

// Proxies to backend GET /api/v1/keys
export async function GET(request: NextRequest) {
  try {
    const AUTH_MS_URL = getPlataApiBaseUrl()

    const cookieAccessToken = request.cookies.get("accessToken")?.value
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization") ||
      (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)

    const url = `${AUTH_MS_URL.replace(/\/+$/, "")}/api/v1/keys`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status || 502 })
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error("Keys proxy error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch keys" }, { status: 500 })
  }
}

// Proxies to backend POST /api/v1/keys (generate new keys)
export async function POST(request: NextRequest) {
  try {
    const AUTH_MS_URL = getPlataApiBaseUrl()

    const cookieAccessToken = request.cookies.get("accessToken")?.value
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization") ||
      (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)

    const url = `${AUTH_MS_URL.replace(/\/+$/, "")}/api/v1/keys`

    // Get the request body to forward to backend
    const body = await request.text()

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      body,
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status || 502 })
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error("Keys proxy POST error:", error)
    return NextResponse.json({ success: false, error: "Failed to generate keys" }, { status: 500 })
  }
}

