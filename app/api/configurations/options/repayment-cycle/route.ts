import { NextRequest } from "next/server"
import { proxyStaticConfigurationOption } from "@/lib/server/configurationsOptionStaticProxy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/configurations/options/repayment-cycle → Product / configurations MS */
export function GET(request: NextRequest) {
  return proxyStaticConfigurationOption(
    request,
    "repayment-cycle",
    "Repayment cycle options error",
    "Failed to fetch repayment cycle options",
  )
}
