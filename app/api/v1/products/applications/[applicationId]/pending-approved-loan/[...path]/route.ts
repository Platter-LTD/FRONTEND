import { NextRequest } from "next/server"

import { getProductApiBaseUrl } from "@/lib/plataApiBaseUrl"
import { proxyPendingApprovedMortgageRequest } from "@/lib/server/proxyPendingApprovedMortgage"

export const dynamic = "force-dynamic"

function productApiBaseUrl(): string {
  return getProductApiBaseUrl().replace(/\/+$/, "")
}

function targetUrl(applicationId: string, path: string[], search: string) {
  const tail = path.map((p) => encodeURIComponent(p)).join("/")
  return `${productApiBaseUrl()}/api/v1/products/applications/${encodeURIComponent(applicationId)}/pending-approved-loan/${tail}${search}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string; path: string[] }> },
) {
  try {
    const { applicationId, path } = await params
    return proxyPendingApprovedMortgageRequest(
      request,
      targetUrl(applicationId, path || [], request.nextUrl.search || ""),
      "GET",
    )
  } catch (error: unknown) {
    return Response.json(
      { success: false, error: (error as Error)?.message || "Failed to load loan fulfillment" },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string; path: string[] }> },
) {
  try {
    const { applicationId, path } = await params
    const body = await request.json().catch(() => ({}))
    return proxyPendingApprovedMortgageRequest(
      request,
      targetUrl(applicationId, path || [], request.nextUrl.search || ""),
      "POST",
      body,
    )
  } catch (error: unknown) {
    return Response.json(
      { success: false, error: (error as Error)?.message || "Failed to update loan fulfillment" },
      { status: 500 },
    )
  }
}
