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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const { applicationId } = await params
    const authHeader = getAuthHeader(request)
    const target = `/api/v1/products/applications/${encodeURIComponent(applicationId)}`

    const response = await plataUpstreamAxios.get(target, {
      headers: {
        ...(authHeader ? { Authorization: authHeader, ...merchantRoleHeadersFromAuthorization(authHeader) } : {}),
      },
    })

    return NextResponse.json(response.data, { status: response.status })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Failed to load application" },
      { status: 500 },
    )
  }
}
