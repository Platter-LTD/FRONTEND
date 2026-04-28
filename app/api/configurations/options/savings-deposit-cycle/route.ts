import { NextRequest } from "next/server"
import { proxyStaticConfigurationOption } from "@/lib/server/configurationsOptionStaticProxy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET(request: NextRequest) {
  return proxyStaticConfigurationOption(
    request,
    "savings-deposit-cycle",
    "Savings deposit cycle options error",
    "Failed to fetch savings deposit cycle options",
  )
}
