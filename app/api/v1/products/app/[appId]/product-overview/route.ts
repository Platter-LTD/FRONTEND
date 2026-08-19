import { NextRequest } from "next/server"
import { proxyProductOverviewGet } from "@/lib/server/proxyProductOverview"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params
  return proxyProductOverviewGet(
    request,
    `/api/v1/products/overview?appId=${encodeURIComponent(appId)}`,
  )
}
