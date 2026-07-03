import { NextRequest, NextResponse } from "next/server"

import { merchantRoleHeadersFromAuthorization } from "@/lib/server/merchantRoleHeaders"
import {
  applyRefreshedTokens,
  refreshTokensFromRequest,
  resolveAuthorizationForRequest,
  type RefreshedTokens,
} from "@/lib/server/plataSessionRefresh"

export async function proxyPendingApprovedMortgageRequest(
  request: NextRequest,
  targetUrl: string,
  method: "GET" | "POST",
  body?: unknown,
): Promise<NextResponse> {
  const { authorization, refreshed } = await resolveAuthorizationForRequest(request)
  if (!authorization) {
    return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
  }

  const incomingMerchantId =
    request.headers.get("x-merchant-id") || request.headers.get("x-user-merchant-id") || undefined

  const upstream = (auth: string) =>
    fetch(targetUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
        ...merchantRoleHeadersFromAuthorization(auth),
        ...(incomingMerchantId
          ? { "x-merchant-id": incomingMerchantId, "x-user-merchant-id": incomingMerchantId }
          : {}),
      },
      ...(body !== undefined && method !== "GET" ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    })

  let tokensToSet: RefreshedTokens | null = refreshed
  let response = await upstream(authorization)

  if (response.status === 401) {
    const retryTokens = await refreshTokensFromRequest(request)
    if (retryTokens?.accessToken) {
      tokensToSet = retryTokens
      response = await upstream(`Bearer ${retryTokens.accessToken}`)
    }
  }

  const data = await response.json().catch(() => ({}))
  const nextResponse = NextResponse.json(data, { status: response.status })
  if (tokensToSet) applyRefreshedTokens(nextResponse, tokensToSet)
  return nextResponse
}
