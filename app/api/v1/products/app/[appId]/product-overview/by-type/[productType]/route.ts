import { NextRequest } from "next/server"
import { proxyProductOverviewGet } from "@/lib/server/proxyProductOverview"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; productType: string }> },
) {
  const { appId, productType } = await params
  const type = decodeURIComponent(productType || "").trim().toUpperCase()
  return proxyProductOverviewGet(
    request,
    `/api/v1/products/app/${encodeURIComponent(appId)}/product-overview/by-type/${encodeURIComponent(type)}`,
  )
}
