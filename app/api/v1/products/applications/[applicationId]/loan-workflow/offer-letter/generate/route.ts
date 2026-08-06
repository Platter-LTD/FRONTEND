import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

import { getProductApiBaseUrl } from "@/lib/plataApiBaseUrl"
import { merchantRoleHeadersFromAuthorization } from "@/lib/server/merchantRoleHeaders"
import {
  applyRefreshedTokens,
  refreshTokensFromRequest,
  resolveAuthorizationForRequest,
} from "@/lib/server/plataSessionRefresh"
import { plataUpstreamHttpsAgent } from "@/lib/server/plataUpstreamAxios"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST {} → account-ms
 * `/api/v1/products/applications/:applicationId/loan-workflow/offer-letter/generate`
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const { applicationId } = await params
    const { authorization, refreshed } = await resolveAuthorizationForRequest(request)
    if (!authorization) {
      return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const base = getProductApiBaseUrl().replace(/\/+$/, "")
    const target = `${base}/api/v1/products/applications/${encodeURIComponent(applicationId)}/loan-workflow/offer-letter/generate`
    const incomingMerchantId =
      request.headers.get("x-merchant-id") || request.headers.get("x-user-merchant-id") || undefined

    const upstream = async (auth: string) =>
      axios.post(target, body && typeof body === "object" ? body : {}, {
        headers: {
          "Content-Type": "application/json",
          Authorization: auth,
          ...merchantRoleHeadersFromAuthorization(auth),
          ...(incomingMerchantId
            ? { "x-merchant-id": incomingMerchantId, "x-user-merchant-id": incomingMerchantId }
            : {}),
        },
        httpsAgent: plataUpstreamHttpsAgent,
        timeout: 120_000,
        validateStatus: () => true,
      })

    let tokensToSet = refreshed
    let resp = await upstream(authorization)
    if (resp.status === 401) {
      const retryTokens = await refreshTokensFromRequest(request)
      if (retryTokens?.accessToken) {
        tokensToSet = retryTokens
        resp = await upstream(`Bearer ${retryTokens.accessToken}`)
      }
    }

    const data = resp.data ?? {}
    const status = resp.status === 401 ? 403 : resp.status
    const responseBody =
      resp.status === 401
        ? {
            success: false,
            error:
              (typeof data === "object" && data && "error" in data && String((data as { error?: unknown }).error)) ||
              "Unable to authorize offer letter generation.",
          }
        : data

    const nextResponse = NextResponse.json(responseBody, { status })
    if (tokensToSet) applyRefreshedTokens(nextResponse, tokensToSet)
    return nextResponse
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Offer letter generation failed",
      },
      { status: 502 },
    )
  }
}
