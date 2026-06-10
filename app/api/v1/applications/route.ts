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

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthHeader(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
    }

    const search = request.nextUrl.searchParams.toString()
    const response = await plataUpstreamAxios.get(`/api/v1/applications${search ? `?${search}` : ""}`, {
      headers: { Authorization: auth },
    })

    return NextResponse.json(response.data, { status: response.status })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Failed to load applications" },
      { status: 500 },
    )
  }
}
