import { NextRequest, NextResponse } from "next/server"
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = getAuthHeader(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const response = await plataUpstreamAxios.post(
      `/api/v1/applications/${encodeURIComponent(id)}/approve`,
      body,
      { headers: { Authorization: auth } },
    )

    return NextResponse.json(response.data, { status: response.status })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Failed to approve application" },
      { status: 500 },
    )
  }
}
