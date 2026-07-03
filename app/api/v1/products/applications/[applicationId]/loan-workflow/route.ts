import { NextRequest } from "next/server"

import { proxyLoanWorkflowRequest } from "@/lib/server/proxyLoanWorkflow"
import { getProductApiBaseUrl } from "@/lib/plataApiBaseUrl"

export const dynamic = "force-dynamic"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const { applicationId } = await params
    const body = await request.json().catch(() => ({}))
    const base = getProductApiBaseUrl().replace(/\/+$/, "")
    const target = `${base}/api/v1/products/applications/${encodeURIComponent(applicationId)}/loan-workflow`
    return proxyLoanWorkflowRequest(request, target, "PATCH", body)
  } catch (error: unknown) {
    return Response.json(
      { success: false, error: (error as Error)?.message || "Failed to update loan workflow status" },
      { status: 500 },
    )
  }
}
