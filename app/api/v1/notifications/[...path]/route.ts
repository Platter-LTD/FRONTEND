import { NextRequest, NextResponse } from "next/server"

import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"

export const dynamic = "force-dynamic"

const BASE_URL = getPlataApiBaseUrl().replace(/\/+$/, "").replace(/\/(api(\/v1?)?)\/?$/, "")

function buildNotificationsUrl(request: NextRequest, path: string[]) {
  const suffix = path.map((part) => encodeURIComponent(part)).join("/")
  const qs = request.nextUrl.searchParams.toString()
  return `${BASE_URL}/api/v1/notifications/${suffix}${qs ? `?${qs}` : ""}`
}

function forwardHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const authHeader = request.headers.get("authorization")
  const cookieHeader = request.headers.get("cookie")
  if (authHeader) headers.Authorization = authHeader
  if (cookieHeader) headers.Cookie = cookieHeader
  return headers
}

async function proxyRequest(method: "GET" | "POST", request: NextRequest, path: string[]) {
  try {
    const targetUrl = buildNotificationsUrl(request, path)
    const headers = forwardHeaders(request)
    const init: RequestInit = { method, headers, cache: "no-store" }

    if (method === "POST") {
      const body = await request.json().catch(() => ({}))
      init.body = JSON.stringify(body)
    }

    const response = await fetch(targetUrl, init)
    const data = await response.json().catch(() => ({ success: false, error: "Invalid JSON from notifications service" }))

    // Temporary compatibility: if gateway does not expose notifications routes yet,
    // avoid surfacing a hard error in the UI and return an empty inbox payload.
    if (
      method === "GET" &&
      response.status === 404 &&
      path[0] === "user" &&
      typeof (data as { error?: unknown }).error === "string" &&
      String((data as { error?: string }).error).toLowerCase().includes("route not found")
    ) {
      return NextResponse.json(
        { success: true, data: { notifications: [], total: 0, limit: 50, offset: 0 } },
        { status: 200 },
      )
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Notifications proxy failed"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxyRequest("GET", request, path)
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxyRequest("POST", request, path)
}
