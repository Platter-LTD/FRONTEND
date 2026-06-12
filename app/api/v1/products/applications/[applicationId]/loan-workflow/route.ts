import { NextRequest, NextResponse } from "next/server"
import { merchantRoleHeadersFromAuthorization } from "@/lib/server/merchantRoleHeaders"
import { plataUpstreamAxios } from "@/lib/server/plataUpstreamAxios"

export const dynamic = "force-dynamic"

function getAuthHeader(request: NextRequest): string | null {
  const cookieAccessToken = request.cookies.get("accessToken")?.value
  return (
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const { applicationId } = await params
    const authHeader = getAuthHeader(request)
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
    }

    const incomingMerchantId = request.headers.get("x-merchant-id") || request.headers.get("x-user-merchant-id") || undefined
    const body = await request.json().catch(() => ({}))
    const target = `/api/v1/products/applications/${encodeURIComponent(applicationId)}/loan-workflow`

    const response = await plataUpstreamAxios.patch(target, body, {
      headers: {
        Authorization: authHeader,
        ...merchantRoleHeadersFromAuthorization(authHeader),
        ...(incomingMerchantId ? { "x-merchant-id": incomingMerchantId, "x-user-merchant-id": incomingMerchantId } : {}),
      },
    })

    return NextResponse.json(response.data, { status: response.status })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Failed to update loan workflow status" },
      { status: 500 },
    )
  }
}
