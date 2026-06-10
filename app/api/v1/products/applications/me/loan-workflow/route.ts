import { NextRequest, NextResponse } from "next/server"
import { merchantRoleHeadersFromAuthorization } from "@/lib/server/merchantRoleHeaders"
import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"

export const dynamic = "force-dynamic"

const BASE_URL = getPlataApiBaseUrl().replace(/\/+$/, "")

function getAuthHeader(request: NextRequest): string | null {
  const cookieAccessToken = request.cookies.get("accessToken")?.value
  return (
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)
  )
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = getAuthHeader(request)
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
    }

    const incomingMerchantId = request.headers.get("x-merchant-id") || request.headers.get("x-user-merchant-id") || undefined
    const queryString = request.nextUrl.searchParams.toString()
    const target = `${BASE_URL}/api/v1/products/applications/me/loan-workflow${queryString ? `?${queryString}` : ""}`

    const response = await fetch(target, {
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        ...merchantRoleHeadersFromAuthorization(authHeader),
        ...(incomingMerchantId ? { "x-merchant-id": incomingMerchantId, "x-user-merchant-id": incomingMerchantId } : {}),
      },
      cache: "no-store",
    })

    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Failed to fetch loan workflow" },
      { status: 500 },
    )
  }
}
