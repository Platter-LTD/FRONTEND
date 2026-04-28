import { NextRequest, NextResponse } from "next/server"
import { plataUpstreamAxios } from "@/lib/server/plataUpstreamAxios"

/**
 * Proxies GET /api/configurations/options/:slug → upstream
 * GET /api/v1/configurations/options/:slug (forwards Bearer when the browser sent one).
 */
export async function proxyStaticConfigurationOption(
  request: NextRequest,
  optionSlug: string,
  logLabel: string,
  failureMessage: string,
) {
  try {
    const authHeader = request.headers.get("authorization")
    const resp = await plataUpstreamAxios.get(`/api/v1/configurations/options/${optionSlug}`, {
      headers: {
        ...(authHeader && { Authorization: authHeader }),
      },
    })
    const data = resp.data ?? {}
    if (resp.status < 200 || resp.status >= 300) {
      return NextResponse.json(
        {
          success: false,
          error:
            (data as { error?: string }).error ||
            (data as { message?: string }).message ||
            failureMessage,
        },
        { status: resp.status || 502 },
      )
    }
    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error(`${logLabel}:`, error)
    return NextResponse.json({ success: false, error: failureMessage }, { status: 500 })
  }
}
