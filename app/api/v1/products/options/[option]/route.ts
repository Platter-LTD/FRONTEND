import { NextRequest, NextResponse } from "next/server"
import type { AxiosResponse } from "axios"
import { plataUpstreamAxios } from "@/lib/server/plataUpstreamAxios"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type JsonBody = Record<string, unknown>

function shouldTryConfigurationsFallback(status: number, data: JsonBody): boolean {
  if (status === 404) return true
  const msg = String(data?.error ?? data?.message ?? "").toLowerCase()
  if (!msg) return false
  return (
    msg.includes("route not found") ||
    msg.includes("endpoint not found") ||
    msg.includes("path not found") ||
    msg === "not found"
  )
}

function isUsableOptionsPayload(status: number, data: JsonBody): boolean {
  if (status < 200 || status >= 300) return false
  if (data.success === false) return false
  return Array.isArray(data.data)
}

async function fetchUpstreamJson(
  pathWithQuery: string,
  authHeader: string | null,
): Promise<{ status: number; data: JsonBody }> {
  const withAuth = authHeader ? { Authorization: authHeader } : {}
  let resp: AxiosResponse<unknown> = await plataUpstreamAxios.get(pathWithQuery, { headers: withAuth })
  if (resp.status === 404 && authHeader) {
    resp = await plataUpstreamAxios.get(pathWithQuery, { headers: {} })
  }
  const data = (typeof resp.data === "object" && resp.data !== null ? resp.data : {}) as JsonBody
  return { status: resp.status, data }
}

/**
 * GET /api/v1/products/options/:option
 * Proxies to backend GET /api/v1/products/options/:option.
 * Several option slugs are only (or primarily) exposed under /api/v1/configurations/options/:option;
 * on 404 / "Route not found" we fall back there so the UI can load dropdowns without errors.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ option: string }> },
) {
  try {
    const { option } = await context.params
    const authHeader = request.headers.get("authorization")
    const queryString = request.nextUrl.searchParams.toString()
    const qs = queryString ? `?${queryString}` : ""

    const productsPath = `/api/v1/products/options/${encodeURIComponent(option)}${qs}`
    const configurationsPath = `/api/v1/configurations/options/${encodeURIComponent(option)}${qs}`

    const maxAttempts = 3
    let lastError: unknown = null
    let primary: { status: number; data: JsonBody } | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        primary = await fetchUpstreamJson(productsPath, authHeader)
        break
      } catch (error) {
        lastError = error
        if (attempt < maxAttempts) {
          await sleep(attempt * 250)
          continue
        }
      }
    }

    if (!primary) {
      throw lastError instanceof Error ? lastError : new Error("Failed to fetch product options")
    }

    const { status, data } = primary

    if (isUsableOptionsPayload(status, data)) {
      return NextResponse.json(data)
    }

    if (shouldTryConfigurationsFallback(status, data)) {
      const fallback = await fetchUpstreamJson(configurationsPath, authHeader)
      if (isUsableOptionsPayload(fallback.status, fallback.data)) {
        return NextResponse.json(fallback.data)
      }
      return NextResponse.json({ success: true, data: [] })
    }

    if (status < 200 || status >= 300) {
      return NextResponse.json(
        {
          success: false,
          error: (data.error as string) || (data.message as string) || `Failed to fetch ${option} options`,
        },
        { status: status || 502 },
      )
    }

    if (data.success === false) {
      return NextResponse.json(
        {
          success: false,
          error: (data.error as string) || (data.message as string) || `Failed to fetch ${option} options`,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true, data: [] })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Failed to fetch product options" },
      { status: 500 },
    )
  }
}
