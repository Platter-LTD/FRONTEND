import { NextRequest, NextResponse } from "next/server"
import { plataUpstreamAxios } from "@/lib/server/plataUpstreamAxios"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Dynamic options proxy:
 * GET /api/configurations/options/:option
 * -> GET /api/v1/configurations/options/:option
 */
export async function GET(request: NextRequest, context: { params: Promise<{ option: string }> }) {
  try {
    const { option } = await context.params
    const authHeader = request.headers.get("authorization")
    const path = `/api/v1/configurations/options/${encodeURIComponent(option)}`
    const maxAttempts = 3
    let lastError: unknown = null

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const resp = await plataUpstreamAxios.get(path, {
          headers: {
            ...(authHeader && { Authorization: authHeader }),
          },
        })

        const data = resp.data ?? {}
        if (resp.status < 200 || resp.status >= 300) {
          return NextResponse.json(
            {
              success: false,
              error: (data as { error?: string }).error || (data as { message?: string }).message || `Failed to fetch ${option} options`,
            },
            { status: resp.status || 502 },
          )
        }

        return NextResponse.json(data)
      } catch (error) {
        lastError = error
        if (attempt < maxAttempts) {
          await sleep(attempt * 250)
          continue
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Failed to fetch options")
  } catch (error: unknown) {
    console.error("Dynamic options proxy error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch options" }, { status: 500 })
  }
}
