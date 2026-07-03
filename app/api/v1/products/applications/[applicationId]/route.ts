import { NextRequest, NextResponse } from "next/server"
import { merchantRoleHeadersFromAuthorization } from "@/lib/server/merchantRoleHeaders"
import { getProductApiBaseUrl } from "@/lib/plataApiBaseUrl"

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
    const base = getProductApiBaseUrl().replace(/\/+$/, "")
    const target = `${base}/api/v1/products/applications/${encodeURIComponent(applicationId)}`

    const response = await fetch(target, {
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader, ...merchantRoleHeadersFromAuthorization(authHeader) } : {}),
      },
      cache: "no-store",
    })

    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Failed to load application" },
      { status: 500 },
    )
  }
}
