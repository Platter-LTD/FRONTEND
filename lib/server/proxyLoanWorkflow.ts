import { NextRequest, NextResponse } from "next/server"

import { merchantRoleHeadersFromAuthorization } from "@/lib/server/merchantRoleHeaders"
import {
  applyRefreshedTokens,
  refreshTokensFromRequest,
  resolveAuthorizationForRequest,
  type RefreshedTokens,
} from "@/lib/server/plataSessionRefresh"

export async function proxyLoanWorkflowRequest(
  request: NextRequest,
  targetUrl: string,
  method: "GET" | "PATCH",
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
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    })

  let tokensToSet: RefreshedTokens | null = refreshed
  let response: Response
  try {
    response = await upstream(authorization)
  } catch (error: unknown) {
    // Fly.io gateway occasionally times out; don't crash the route and return HTML/empty body.
    const msg = error instanceof Error ? error.message : "Upstream request failed"
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }

  if (response.status === 401) {
    const retryTokens = await refreshTokensFromRequest(request)
    if (retryTokens?.accessToken) {
      tokensToSet = retryTokens
      try {
        response = await upstream(`Bearer ${retryTokens.accessToken}`)
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Upstream request failed"
        return NextResponse.json({ success: false, error: msg }, { status: 502 })
      }
    }
  }

  const data = await response.json().catch(() => ({}))
  const status =
    response.status === 401
      ? 403
      : response.status
  const responseBody =
    response.status === 401
      ? {
          success: false,
          error:
            (data as { error?: string }).error ||
            "Unable to authorize this workflow request. Check merchant access for this application.",
        }
      : data
  const nextResponse = NextResponse.json(responseBody, { status })
  if (tokensToSet) applyRefreshedTokens(nextResponse, tokensToSet)
  return nextResponse
}
