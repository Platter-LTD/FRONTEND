import { NextRequest } from "next/server"

import { proxyLoanWorkflowRequest } from "@/lib/server/proxyLoanWorkflow"
import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"

export const dynamic = "force-dynamic"

const BASE_URL = getPlataApiBaseUrl().replace(/\/+$/, "")

export async function GET(request: NextRequest) {
  try {
    const queryString = request.nextUrl.searchParams.toString()
    const target = `${BASE_URL}/api/v1/products/applications/me/loan-workflow${queryString ? `?${queryString}` : ""}`
    return proxyLoanWorkflowRequest(request, target, "GET")
  } catch (error: unknown) {
    return Response.json(
      { success: false, error: (error as Error)?.message || "Failed to fetch loan workflow" },
      { status: 500 },
    )
  }
}
