import { NextRequest, NextResponse } from "next/server"
import { merchantRoleHeadersFromAuthorization } from "@/lib/server/merchantRoleHeaders"

import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"
export const dynamic = "force-dynamic"

const BASE_URL = (getPlataApiBaseUrl()).replace(/\/+$/, "")

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const { applicationId } = await params
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
    }

    const incomingMerchantId =
      request.headers.get("x-merchant-id") || request.headers.get("x-user-merchant-id") || undefined

    const body = await request.json().catch(() => ({}))
    const target = `${BASE_URL}/api/v1/products/applications/${encodeURIComponent(applicationId)}/loan-workflow`

    const response = await fetch(target, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        ...merchantRoleHeadersFromAuthorization(authHeader),
        ...(incomingMerchantId ? { "x-merchant-id": incomingMerchantId, "x-user-merchant-id": incomingMerchantId } : {}),
      },
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || "Failed to update loan workflow status" },
        { status: response.status || 502 },
      )
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Failed to update loan workflow status" },
      { status: 500 },
    )
  }
}
