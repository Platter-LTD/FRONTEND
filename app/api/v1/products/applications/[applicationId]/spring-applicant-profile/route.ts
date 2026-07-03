import { NextRequest } from "next/server"

import { proxySpringApplicantProfileRequest } from "@/lib/server/proxySpringApplicantProfile"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const { applicationId } = await params
    const upstreamPath = `/api/v1/products/applications/${encodeURIComponent(applicationId)}/spring-applicant-profile`
    return proxySpringApplicantProfileRequest(request, upstreamPath)
  } catch (error: unknown) {
    const message = (error as Error)?.message || "Failed to load applicant profile"
    const timedOut = message.toLowerCase().includes("timeout")
    return Response.json(
      { success: false, error: timedOut ? "Applicant profile request timed out" : message },
      { status: timedOut ? 504 : 500 },
    )
  }
}
