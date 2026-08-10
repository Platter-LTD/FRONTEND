import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import dns from "dns"
import https from "https"
import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"
import { merchantRoleHeadersFromAuthorization } from "@/lib/server/merchantRoleHeaders"
import {
  composeAnalyticsFromLiveSources,
  unwrapAnalyticsPayload,
  unwrapOverviewPayload,
  unwrapStatsPayload,
  unwrapTransactionsPayload,
} from "@/lib/server/composeAppAnalytics"
import type { AnalyticsProductFilter, AnalyticsRange } from "@/lib/appAnalytics"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const RANGES = new Set(["7d", "30d", "90d"])
const PRODUCT_TYPES = new Set(["ALL", "LOAN", "MORTGAGE", "SAVINGS", "INVESTMENT", "COMMODITY"])

const httpsAgent = new https.Agent({
  keepAlive: false,
  family: 4,
  // @ts-ignore Node lookup signature compatibility
  lookup: (hostname: string, _options: unknown, cb: (err: NodeJS.ErrnoException | null, address: string, family: number) => void) =>
    dns.lookup(hostname, { family: 4 }, cb),
})

const http = axios.create({
  baseURL: getPlataApiBaseUrl().replace(/\/+$/, ""),
  timeout: 45_000,
  httpsAgent,
  validateStatus: () => true,
})

function clientStatus(upstreamStatus: number) {
  if (upstreamStatus === 401 || upstreamStatus === 403) return upstreamStatus
  if (upstreamStatus >= 400 && upstreamStatus < 500) return upstreamStatus
  return 502
}

function upstreamMessage(data: unknown, status: number) {
  if (data && typeof data === "object") {
    const body = data as { error?: string; message?: string }
    if (body.error) return body.error
    if (body.message) return body.message
  }
  return `Analytics failed (${status})`
}

/**
 * GET /api/v1/apps/{appId}/analytics
 * Prefer create-app analytics. If that 500s for an app, compose from
 * product-overview + transaction-stats + transactions (those routes work).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params
  if (!appId?.trim()) {
    return NextResponse.json({ success: false, error: "Missing app id" }, { status: 400 })
  }

  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
  }

  const rangeRaw = (request.nextUrl.searchParams.get("range") || request.nextUrl.searchParams.get("timeframe") || "30d")
    .trim()
    .toLowerCase() as AnalyticsRange
  const productRaw = (
    request.nextUrl.searchParams.get("productType") ||
    request.nextUrl.searchParams.get("product") ||
    "ALL"
  )
    .trim()
    .toUpperCase() as AnalyticsProductFilter

  if (!RANGES.has(rangeRaw)) {
    return NextResponse.json({ success: false, error: "range must be one of: 7d, 30d, 90d" }, { status: 400 })
  }
  if (!PRODUCT_TYPES.has(productRaw)) {
    return NextResponse.json(
      { success: false, error: "productType must be ALL, LOAN, MORTGAGE, SAVINGS, INVESTMENT, or COMMODITY" },
      { status: 400 },
    )
  }

  const incomingMerchantId =
    request.headers.get("x-merchant-id") || request.headers.get("x-user-merchant-id") || undefined
  const headers = {
    Authorization: authHeader,
    Accept: "application/json",
    ...merchantRoleHeadersFromAuthorization(authHeader),
    ...(incomingMerchantId
      ? { "x-merchant-id": incomingMerchantId, "x-user-merchant-id": incomingMerchantId }
      : {}),
  }
  const analyticsPath = `/api/v1/apps/${encodeURIComponent(appId)}/analytics`

  let primaryStatus = 0
  let primaryBody: unknown = {}

  try {
    const primary = await http.get(analyticsPath, {
      headers,
      params: { range: rangeRaw, productType: productRaw },
    })
    primaryStatus = primary.status
    primaryBody = primary.data
    const primaryData = unwrapAnalyticsPayload(primary.data)
    if (primary.status >= 200 && primary.status < 300 && primaryData) {
      return NextResponse.json(primary.data, { status: primary.status || 200 })
    }

    console.error("[app-analytics] upstream primary failed", {
      status: primary.status,
      body: primary.data,
      productType: productRaw,
    })

    if (primary.status === 401 || primary.status === 403) {
      return NextResponse.json(
        { success: false, error: upstreamMessage(primary.data, primary.status) },
        { status: primary.status },
      )
    }
  } catch (error: unknown) {
    console.error("[app-analytics] primary proxy error", analyticsPath, error instanceof Error ? error.message : error)
  }

  try {
    const [overviewRes, statsRes, txRes] = await Promise.all([
      http.get(`/api/v1/products/app/${encodeURIComponent(appId)}/product-overview`, { headers }),
      http.get(`/api/v1/apps/${encodeURIComponent(appId)}/transaction-stats`, { headers }),
      http.get(`/api/v1/apps/${encodeURIComponent(appId)}/transactions`, {
        headers,
        params: { limit: 100 },
      }),
    ])

    console.warn("[app-analytics] fallback sources", {
      overview: overviewRes.status,
      stats: statsRes.status,
      transactions: txRes.status,
    })

    const overview = overviewRes.status < 400 ? unwrapOverviewPayload(overviewRes.data) : null
    const stats = statsRes.status < 400 ? unwrapStatsPayload(statsRes.data) : null
    const transactions = txRes.status < 400 ? unwrapTransactionsPayload(txRes.data) : []

    if (!overview && !stats && transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: upstreamMessage(primaryBody, primaryStatus || 502) },
        { status: clientStatus(primaryStatus) },
      )
    }

    const composed = composeAnalyticsFromLiveSources({
      appId,
      range: rangeRaw,
      productType: productRaw,
      overview,
      stats,
      transactions,
    })
    console.warn("[app-analytics] served composed overview/stats fallback")
    return NextResponse.json({ success: true, data: composed })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch analytics"
    console.error("[app-analytics] fallback proxy error", msg)
    return NextResponse.json(
      { success: false, error: upstreamMessage(primaryBody, primaryStatus || 502) || msg },
      { status: clientStatus(primaryStatus) },
    )
  }
}
