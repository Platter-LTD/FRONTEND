import { NextRequest } from "next/server"
import { proxyProductOverviewGet } from "@/lib/server/proxyProductOverview"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/products/overview?appId=...
 * Proxies Product MS catalog overview (card counts).
 */
export async function GET(request: NextRequest) {
  const qs = request.nextUrl.search
  return proxyProductOverviewGet(request, `/api/v1/products/overview${qs}`)
}
