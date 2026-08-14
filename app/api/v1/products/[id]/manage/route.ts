import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import https from "https"
import dns from "dns"

import { merchantRoleHeadersFromAuthorization } from "@/lib/server/merchantRoleHeaders"
import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BASE_URL = getPlataApiBaseUrl().replace(/\/+$/, "")

const agent = new https.Agent({
  keepAlive: true,
  family: 4,
  // @ts-ignore Node lookup signature compatibility
  lookup: (hostname: string, _options: unknown, cb: (err: NodeJS.ErrnoException | null, address: string, family: number) => void) =>
    dns.lookup(hostname, { family: 4 }, cb),
})

const http = axios.create({
  timeout: 30000,
  httpsAgent: agent,
  validateStatus: () => true,
  headers: { "Content-Type": "application/json" },
})

function apiErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err) {
    const row = err as { error?: unknown; message?: unknown }
    if (typeof row.error === "string" && row.error.trim()) return row.error
    if (typeof row.message === "string" && row.message.trim()) return row.message
  }
  return fallback
}

// PUT /api/v1/products/:id/manage
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const authHeader = request.headers.get("authorization")

  if (!authHeader) {
    return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const url = `${BASE_URL}/api/v1/products/${encodeURIComponent(id)}/manage`

  try {
    const resp = await http.put(url, body, {
      headers: { Authorization: authHeader, ...merchantRoleHeadersFromAuthorization(authHeader) },
    })

    if (resp.status >= 200 && resp.status < 300) {
      return NextResponse.json(resp.data)
    }

    return NextResponse.json(
      { success: false, error: apiErrorMessage(resp.data, "Failed to manage product") },
      { status: resp.status || 502 },
    )
  } catch (error: unknown) {
    console.error("[Products manage] PUT error:", error)
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Failed to manage product" },
      { status: 502 },
    )
  }
}
