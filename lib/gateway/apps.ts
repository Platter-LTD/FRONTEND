import { fetchWithAuth } from "@/lib/fetchWithAuth"
import { getAccessToken } from "@/lib/cookieAuth"
import { jsonResponse, readJson, upstreamError } from "@/lib/gateway/response"

/**
 * Create-app calls straight to the gateway (/api/v1/apps). Ported from the old Next.js /api/apps route,
 * minus everything that must not live in a browser: no JWT re-signing, API keys or bypass tokens, and no
 * client-set role/merchant headers. The gateway authenticates the normal login token.
 */

function merchantIdFromToken(): string | null {
  const token = getAccessToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
    return (
      payload.userMerchantId ||
      payload.user_merchant_id ||
      payload.merchantId ||
      payload.userId ||
      payload.id ||
      payload.sub ||
      null
    )
  } catch {
    return null
  }
}

function validateCreateAppBody(input: Record<string, unknown>): string | null {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "")
  const name = str(input.name)
  const alias = str(input.alias)
  const description = str(input.description)
  const subdomain = str(input.subdomain).toLowerCase()
  if (!name || name.length < 3 || name.length > 100) return "name is required (3–100 characters)"
  if (!str(input.websiteUrl)) return "websiteUrl is required"
  if (!alias || alias.length < 2 || alias.length > 50) return "alias is required (2–50 characters)"
  if (!description || description.length < 10 || description.length > 1000) {
    return "description is required (10–1000 characters)"
  }
  if (subdomain && !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(subdomain)) {
    return "subdomain must be a valid hostname label"
  }
  return null
}

function formatDate(value?: string): string {
  const d = value ? new Date(value) : new Date()
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

/** GET /api/v1/apps → `{ success: true, data }` (same shape the old /api/apps GET returned). */
export async function listApps(): Promise<Response> {
  const res = await fetchWithAuth("/api/v1/apps", { method: "GET" })
  const body = await readJson(res)
  if (res.ok) return jsonResponse({ success: true, data: body?.data || body })
  return jsonResponse({ success: false, error: upstreamError(body, "Failed to fetch apps") }, res.status || 502)
}

/** POST /api/v1/apps with client-side validation, returning the normalized app the UI expects. */
export async function createApp(input: Record<string, unknown>): Promise<Response> {
  const invalid = validateCreateAppBody(input)
  if (invalid) return jsonResponse({ success: false, error: invalid }, 400)

  const merchantId = (input.merchantId as string | undefined) || merchantIdFromToken()
  if (!merchantId) return jsonResponse({ success: false, error: "Merchant ID is required" }, 400)

  const payload: Record<string, unknown> = {
    name: String(input.name).trim(),
    websiteUrl: String(input.websiteUrl).trim(),
    alias: String(input.alias).trim(),
    description: String(input.description).trim(),
    merchantId,
  }
  const subdomain = typeof input.subdomain === "string" ? input.subdomain.trim().toLowerCase() : ""
  if (subdomain) payload.subdomain = subdomain

  const res = await fetchWithAuth("/api/v1/apps", { method: "POST", body: JSON.stringify(payload) })
  const result = await readJson(res)
  if (!res.ok) {
    return jsonResponse(
      { success: false, error: upstreamError(result, "Failed to create app"), details: result },
      res.status || 502,
    )
  }

  const app = result?.data?.app || result?.data || result
  return jsonResponse(
    {
      success: true,
      message: result?.message || "Application created successfully",
      data: {
        id: app.id,
        appId: app.id,
        name: app.name,
        websiteUrl: app.websiteUrl,
        alias: app.alias,
        description: app.description,
        subdomain: app.subdomain,
        defaultAppUrl: app.defaultAppUrl,
        status: app.status || "active",
        dateCreated: formatDate(app.createdAt),
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        merchantId: app.merchantId,
      },
    },
    201,
  )
}

/** Uncached app list for React Query: resolves to the apps array, throws on failure. */
export async function fetchAppsList(): Promise<any[]> {
  const result = await readJson(await listApps())
  if (!result?.success) throw new Error(result?.error || "Failed to load applications")
  return Array.isArray(result.data) ? result.data : []
}
