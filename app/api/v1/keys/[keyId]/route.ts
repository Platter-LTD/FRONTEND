import { NextRequest, NextResponse } from "next/server"

import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"

export const dynamic = "force-dynamic"

function authFromRequest(request: NextRequest): string | null {
  const cookieAccessToken = request.cookies.get("accessToken")?.value
  return (
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)
  )
}

/** Proxies to gateway DELETE /api/v1/keys/:keyId (soft revoke). */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ keyId: string }> | { keyId: string } },
) {
  try {
    const resolved = await Promise.resolve(context.params)
    const keyId = decodeURIComponent(resolved.keyId || "").trim()
    if (!keyId) {
      return NextResponse.json({ success: false, error: "API key id is required" }, { status: 400 })
    }

    const AUTH_MS_URL = getPlataApiBaseUrl()
    const authHeader = authFromRequest(request)
    const url = `${AUTH_MS_URL.replace(/\/+$/, "")}/api/v1/keys/${encodeURIComponent(keyId)}`

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    })

    const data = await response.json().catch(() => ({}))
    const retryAfter = response.headers.get("retry-after")
    const headers = retryAfter ? { "Retry-After": retryAfter } : undefined

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status || 502, headers })
    }
    return NextResponse.json(data, { headers })
  } catch (error: unknown) {
    console.error("Keys proxy DELETE error:", error)
    return NextResponse.json({ success: false, error: "Failed to revoke API key" }, { status: 500 })
  }
}
