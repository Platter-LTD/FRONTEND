import { NextRequest, NextResponse } from "next/server"
import { merchantRoleHeadersFromAuthorization } from "@/lib/server/merchantRoleHeaders"

export const dynamic = "force-dynamic"

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "https://account-ms-plata.fly.dev").replace(/\/+$/, "")

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

    const body = await request.json().catch(() => ({}))
    const target = `${BASE_URL}/api/v1/products/applications/${encodeURIComponent(applicationId)}/loan-workflow`

    const response = await fetch(target, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        ...merchantRoleHeadersFromAuthorization(authHeader),
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
