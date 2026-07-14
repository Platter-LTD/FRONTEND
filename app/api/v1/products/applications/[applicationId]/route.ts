import { NextRequest } from "next/server"

import { proxyLoanWorkflowRequest } from "@/lib/server/proxyLoanWorkflow"
import { getProductApiBaseUrl } from "@/lib/plataApiBaseUrl"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const { applicationId } = await params
    const base = getProductApiBaseUrl().replace(/\/+$/, "")
    const target = `${base}/api/v1/products/applications/${encodeURIComponent(applicationId)}`
    return proxyLoanWorkflowRequest(request, target, "GET")
  } catch (error: unknown) {
    return Response.json(
      { success: false, error: (error as Error)?.message || "Failed to load application" },
      { status: 500 },
    )
  }
}
