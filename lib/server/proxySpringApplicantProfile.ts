import { NextRequest, NextResponse } from "next/server"

import { merchantRoleHeadersFromAuthorization } from "@/lib/server/merchantRoleHeaders"
import { plataUpstreamAxios } from "@/lib/server/plataUpstreamAxios"
import {
  applyRefreshedTokens,
  refreshTokensFromRequest,
  resolveAuthorizationForRequest,
  type RefreshedTokens,
} from "@/lib/server/plataSessionRefresh"

/** Spring profile chains Plata → Spring; observed ~10–15s — must exceed product-ms internal limits. */
const UPSTREAM_TIMEOUT_MS = 60_000

function buildHeaders(request: NextRequest, authorization: string): Record<string, string> {
  const incomingMerchantId =
    request.headers.get("x-merchant-id") || request.headers.get("x-user-merchant-id") || undefined

  return {
    Authorization: authorization,
    ...merchantRoleHeadersFromAuthorization(authorization),
    ...(incomingMerchantId
      ? { "x-merchant-id": incomingMerchantId, "x-user-merchant-id": incomingMerchantId }
      : {}),
  }
}

export async function proxySpringApplicantProfileRequest(
  request: NextRequest,
  upstreamPath: string,
): Promise<NextResponse> {
  const { authorization, refreshed } = await resolveAuthorizationForRequest(request)
  if (!authorization) {
    return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
  }

  let tokensToSet: RefreshedTokens | null = refreshed
  let response
  try {
    response = await plataUpstreamAxios.get(upstreamPath, {
      headers: buildHeaders(request, authorization),
      timeout: UPSTREAM_TIMEOUT_MS,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upstream request failed"
    const timedOut = /timeout|ETIMEDOUT|ECONNABORTED/i.test(message)
    return NextResponse.json(
      { success: false, error: timedOut ? "Applicant profile request timed out" : message },
      { status: timedOut ? 504 : 502 },
    )
  }

  if (response.status === 401) {
    const retryTokens = await refreshTokensFromRequest(request)
    if (retryTokens?.accessToken) {
      tokensToSet = retryTokens
      const retryAuth = `Bearer ${retryTokens.accessToken}`
      try {
        response = await plataUpstreamAxios.get(upstreamPath, {
          headers: buildHeaders(request, retryAuth),
          timeout: UPSTREAM_TIMEOUT_MS,
        })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Upstream request failed"
        const timedOut = /timeout|ETIMEDOUT|ECONNABORTED/i.test(message)
        return NextResponse.json(
          { success: false, error: timedOut ? "Applicant profile request timed out" : message },
          { status: timedOut ? 504 : 502 },
        )
      }
    }
  }

  const nextResponse = NextResponse.json(
    response.status === 401
      ? {
          success: false,
          error:
            (response.data as { error?: string } | undefined)?.error ||
            "Unable to load applicant profile upstream",
          springApplicantProfileError:
            (response.data as { springApplicantProfileError?: string } | undefined)
              ?.springApplicantProfileError ||
            (response.data as { error?: string } | undefined)?.error ||
            "Upstream authorization failed",
        }
      : (response.data ?? {}),
    { status: response.status === 401 ? 403 : response.status },
  )
  if (tokensToSet) applyRefreshedTokens(nextResponse, tokensToSet)
  return nextResponse
}
