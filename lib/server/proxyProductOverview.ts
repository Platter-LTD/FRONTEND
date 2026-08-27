import { NextRequest, NextResponse } from "next/server"
import { merchantRoleHeadersFromAuthorization } from "@/lib/server/merchantRoleHeaders"
import { plataUpstreamAxios } from "@/lib/server/plataUpstreamAxios"

function isRetryableNetworkError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error)
  return /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|socket hang up|Network Error|timeout/i.test(msg)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Proxy GET product-overview routes via IPv4 axios.
 * Node `fetch` to Fly.io often fails fast (~500ms) after the first success (IPv6 / reset).
 * Retry transient 5xx / connection drops — tab switches used to 500 after the first LOAN hit.
 */
export async function proxyProductOverviewGet(request: NextRequest, path: string) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
  }

  const incomingMerchantId =
    request.headers.get("x-merchant-id") || request.headers.get("x-user-merchant-id") || undefined

  const headers = {
    Authorization: authHeader,
    ...merchantRoleHeadersFromAuthorization(authHeader),
    ...(incomingMerchantId
      ? { "x-merchant-id": incomingMerchantId, "x-user-merchant-id": incomingMerchantId }
      : {}),
  }

  const qs = request.nextUrl.searchParams.toString()
  const upstreamPath = qs ? `${path}${path.includes("?") ? "&" : "?"}${qs}` : path

  try {
    let lastStatus = 0
    let lastBody: unknown = {}
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await plataUpstreamAxios.get(upstreamPath, { headers })
        lastStatus = response.status
        lastBody = response.data && typeof response.data === "object" ? response.data : {}

        if (response.status >= 500 && attempt < 2) {
          console.warn("[product-overview] retry upstream 5xx", upstreamPath, response.status, "attempt", attempt + 1)
          await sleep(250 * (attempt + 1))
          continue
        }

        if (response.status === 404) {
          return NextResponse.json({ success: true, data: null }, { status: 200 })
        }

        if (response.status >= 400) {
          const data = lastBody as { error?: string; message?: string }
          const err = data.error || data.message || `Product overview failed (${response.status})`
          console.error("[product-overview] upstream", upstreamPath, response.status, err)
          return NextResponse.json({ success: false, error: err }, { status: response.status })
        }

        return NextResponse.json(lastBody, { status: response.status || 200 })
      } catch (error: unknown) {
        if (!isRetryableNetworkError(error) || attempt === 2) throw error
        console.warn("[product-overview] retry network", upstreamPath, error instanceof Error ? error.message : error)
        await sleep(250 * (attempt + 1))
      }
    }

    const data = lastBody as { error?: string; message?: string }
    const err = data.error || data.message || `Product overview failed (${lastStatus || 502})`
    console.error("[product-overview] upstream exhausted", upstreamPath, lastStatus, err)
    return NextResponse.json({ success: false, error: err }, { status: lastStatus >= 400 ? lastStatus : 502 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch product overview"
    console.error("[product-overview] proxy error", upstreamPath, msg)
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }
}
