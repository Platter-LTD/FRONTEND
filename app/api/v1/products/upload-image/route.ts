import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"
import { merchantRoleHeadersFromAuthorization } from "@/lib/server/merchantRoleHeaders"
import { plataUpstreamHttpsAgent } from "@/lib/server/plataUpstreamAxios"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST multipart/form-data → Product MS `/api/v1/products/upload-image`.
 *
 * Forwards the **raw** multipart body and original `Content-Type` (including boundary). Passing Web
 * `FormData` through axios on Node often breaks the request body; mirroring the compliance proxy avoids that.
 *
 * Base URL: `getPlataApiBaseUrl()` (`NEXT_PUBLIC_API_URL` / `PLATA_API_URL` / `API_URL`, normalized).
 */
export async function POST(request: NextRequest) {
  const cookieAccessToken = request.cookies.get("accessToken")?.value
  const authHeader =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)

  if (!authHeader) {
    return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
  }

  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { success: false, error: 'Expected multipart/form-data (include a file in the "file" field).' },
      { status: 400 },
    )
  }

  let rawBody: Buffer
  try {
    const buf = await request.arrayBuffer()
    if (buf.byteLength === 0) {
      return NextResponse.json({ success: false, error: "Empty upload body" }, { status: 400 })
    }
    rawBody = Buffer.from(buf)
  } catch {
    return NextResponse.json({ success: false, error: "Could not read upload body" }, { status: 400 })
  }

  const origin = getPlataApiBaseUrl().replace(/\/+$/, "")
  if (!origin.startsWith("http://") && !origin.startsWith("https://")) {
    return NextResponse.json(
      { success: false, error: "Server misconfiguration: set NEXT_PUBLIC_API_URL (or PLATA_API_URL) to your API origin." },
      { status: 500 },
    )
  }
  const upstreamUrl = `${origin}/api/v1/products/upload-image`
  const roleHeaders = merchantRoleHeadersFromAuthorization(authHeader)

  try {
    const resp = await axios.post(upstreamUrl, rawBody, {
      headers: {
        "Content-Type": contentType,
        Authorization: authHeader,
        ...roleHeaders,
      },
      httpsAgent: plataUpstreamHttpsAgent,
      timeout: 120_000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true,
    })

    const data = resp.data ?? {}
    if (resp.status < 200 || resp.status >= 300) {
      if (process.env.NODE_ENV === "development") {
        console.error("[products/upload-image] upstream error:", {
          upstreamUrl,
          status: resp.status,
          data: typeof data === "object" ? JSON.stringify(data).slice(0, 500) : data,
        })
      }
      const msg =
        (typeof data === "object" && data && "error" in data && String((data as { error?: unknown }).error)) ||
        (typeof data === "object" && data && "message" in data && String((data as { message?: unknown }).message)) ||
        (typeof data === "string" && data.trim().slice(0, 300)) ||
        `Upload failed (${resp.status})`
      const payload =
        typeof data === "object" && data !== null && !Array.isArray(data)
          ? { ...(data as Record<string, unknown>), success: false as const }
          : { success: false as const, error: msg || `Upload failed (${resp.status})` }
      return NextResponse.json(payload, { status: resp.status })
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Upload failed"
    if (process.env.NODE_ENV === "development") {
      console.error("[products/upload-image] proxy error:", { upstreamUrl, message: msg, error })
    }
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }
}
