import { NextRequest } from "next/server"
import { proxyStaticConfigurationOption } from "@/lib/server/configurationsOptionStaticProxy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET(request: NextRequest) {
  return proxyStaticConfigurationOption(
    request,
    "investment-trading-cycle",
    "Investment trading cycle options error",
    "Failed to fetch investment trading cycle options",
  )
}
