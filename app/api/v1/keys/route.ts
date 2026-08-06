import { NextRequest, NextResponse } from "next/server"

import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"

export const dynamic = "force-dynamic"

type CacheEntry = {
  expiresAt: number
  status: number
  body: unknown
  retryAfter: string | null
}

/** Short in-memory GET cache to absorb React Strict Mode / double-mount + tab remounts. */
const getCache = new Map<string, CacheEntry>()
const GET_TTL_MS = 20_000
/** Coalesce concurrent identical upstream GETs (same auth). */
const getInflight = new Map<string, Promise<CacheEntry>>()

function authFromRequest(request: NextRequest): string | null {
  const cookieAccessToken = request.cookies.get("accessToken")?.value
  return (
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)
  )
}

function cacheKeyForAuth(authHeader: string | null): string {
  if (!authHeader) return "anon"
  // Avoid storing the full bearer token as a map key in logs; last 24 chars is enough to isolate sessions.
  return authHeader.length > 24 ? authHeader.slice(-24) : authHeader
}

function withRetryHeaders(body: unknown, status: number, retryAfter: string | null) {
  const headers = new Headers()
  if (retryAfter) headers.set("Retry-After", retryAfter)
  return NextResponse.json(body, { status, headers })
}

async function upstreamGet(authHeader: string | null): Promise<CacheEntry> {
  const AUTH_MS_URL = getPlataApiBaseUrl()
  const url = `${AUTH_MS_URL.replace(/\/+$/, "")}/api/v1/keys`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    cache: "no-store",
  })

  const body = await response.json().catch(() => ({}))
  const retryAfter = response.headers.get("retry-after")

  return {
    expiresAt: Date.now() + GET_TTL_MS,
    status: response.status || 502,
    body,
    retryAfter,
  }
}

// Proxies to backend GET /api/v1/keys
export async function GET(request: NextRequest) {
  try {
    const authHeader = authFromRequest(request)
    const key = cacheKeyForAuth(authHeader)
    const now = Date.now()

    const cached = getCache.get(key)
    if (cached && cached.expiresAt > now && cached.status < 400) {
      return withRetryHeaders(cached.body, cached.status, cached.retryAfter)
    }

    let pending = getInflight.get(key)
    if (!pending) {
      pending = upstreamGet(authHeader).finally(() => {
        getInflight.delete(key)
      })
      getInflight.set(key, pending)
    }

    const entry = await pending
    if (entry.status < 400) {
      getCache.set(key, entry)
    } else {
      getCache.delete(key)
    }

    return withRetryHeaders(entry.body, entry.status, entry.retryAfter)
  } catch (error: unknown) {
    console.error("Keys proxy error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch keys" }, { status: 500 })
  }
}

// Proxies to backend POST /api/v1/keys (generate new keys)
export async function POST(request: NextRequest) {
  try {
    const AUTH_MS_URL = getPlataApiBaseUrl()
    const authHeader = authFromRequest(request)
    const url = `${AUTH_MS_URL.replace(/\/+$/, "")}/api/v1/keys`
    const body = await request.text()

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body,
    })

    const data = await response.json().catch(() => ({}))
    const retryAfter = response.headers.get("retry-after")

    // Invalidate list cache after successful create
    if (response.ok) {
      getCache.delete(cacheKeyForAuth(authHeader))
    }

    if (!response.ok) {
      return withRetryHeaders(data, response.status || 502, retryAfter)
    }

    return withRetryHeaders(data, response.status || 201, retryAfter)
  } catch (error: unknown) {
    console.error("Keys proxy POST error:", error)
    return NextResponse.json({ success: false, error: "Failed to generate keys" }, { status: 500 })
  }
}
