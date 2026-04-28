import { NextRequest } from "next/server"
import { proxyStaticConfigurationOption } from "@/lib/server/configurationsOptionStaticProxy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET(request: NextRequest) {
  return proxyStaticConfigurationOption(
    request,
    "currency",
    "Currency options error",
    "Failed to fetch currency options",
  )
}
