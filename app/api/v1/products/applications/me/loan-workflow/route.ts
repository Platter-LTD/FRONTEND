import { NextRequest, NextResponse } from "next/server"
import { merchantRoleHeadersFromAuthorization } from "@/lib/server/merchantRoleHeaders"

import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"
export const dynamic = "force-dynamic"

const BASE_URL = (getPlataApiBaseUrl()).replace(/\/+$/, "")

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
    }

    const incomingMerchantId =
      request.headers.get("x-merchant-id") || request.headers.get("x-user-merchant-id") || undefined

    const { searchParams } = new URL(request.url)
    const qs = searchParams.toString()
    const target = `${BASE_URL}/api/v1/products/applications/me/loan-workflow${qs ? `?${qs}` : ""}`

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
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || "Failed to fetch loan workflow" },
        { status: response.status || 502 },
      )
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Failed to fetch loan workflow" },
      { status: 500 },
    )
  }
}
