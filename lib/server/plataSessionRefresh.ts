import type { NextRequest, NextResponse } from "next/server"

import { BACKEND } from "@/lib/endpoints"
import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"

const AUTH_SERVICE_URL = getPlataApiBaseUrl().replace(/\/+$/, "")

export type RefreshedTokens = {
  accessToken: string
  refreshToken?: string
}

export const plataCookieOpts = (maxAge: number, httpOnly: boolean) => ({
  httpOnly,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
})

export function applyRefreshedTokens(response: NextResponse, tokens: RefreshedTokens) {
  response.cookies.set("accessToken", tokens.accessToken, plataCookieOpts(60 * 60, false))
  if (tokens.refreshToken) {
    response.cookies.set("refreshToken", tokens.refreshToken, plataCookieOpts(60 * 60 * 24 * 7, true))
  }
}

export async function refreshTokensFromRequest(request: NextRequest): Promise<RefreshedTokens | null> {
  const refreshToken = request.cookies.get("refreshToken")?.value
  if (!refreshToken) return null

  const res = await fetch(`${AUTH_SERVICE_URL}${BACKEND.auth.refresh}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.success) return null

  const accessToken = data.data?.accessToken ?? data.accessToken
  const newRefresh = data.data?.refreshToken ?? data.refreshToken
  if (!accessToken || typeof accessToken !== "string") return null

  return {
    accessToken,
    refreshToken: typeof newRefresh === "string" ? newRefresh : undefined,
  }
}

function readAccessToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice("Bearer ".length).trim()
  return request.cookies.get("accessToken")?.value ?? null
}

function isAccessTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf8")) as {
      exp?: number
    }
    if (!payload.exp) return false
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

/** Prefer a valid access token; refresh from httpOnly cookie when missing or expired. */
export async function resolveAuthorizationForRequest(request: NextRequest): Promise<{
  authorization: string | null
  refreshed: RefreshedTokens | null
}> {
  const token = readAccessToken(request)
  if (token && !isAccessTokenExpired(token)) {
    return { authorization: `Bearer ${token}`, refreshed: null }
  }

  const refreshed = await refreshTokensFromRequest(request)
  if (refreshed?.accessToken) {
    return { authorization: `Bearer ${refreshed.accessToken}`, refreshed }
  }

  if (token) return { authorization: `Bearer ${token}`, refreshed: null }
  return { authorization: null, refreshed: null }
}
