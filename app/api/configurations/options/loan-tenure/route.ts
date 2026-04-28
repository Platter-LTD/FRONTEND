import { NextRequest } from "next/server"
import { proxyStaticConfigurationOption } from "@/lib/server/configurationsOptionStaticProxy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/configurations/options/loan-tenure → Product / configurations MS */
export function GET(request: NextRequest) {
  return proxyStaticConfigurationOption(
    request,
    "loan-tenure",
    "Loan tenure options error",
    "Failed to fetch loan tenure options",
  )
}
