/**
 * Merchant product list + activation via Next.js API routes (proxied to NEXT_PUBLIC_API_URL).
 *
 * Documented (Plata Frontend API):
 * - GET /api/v1/products?appId=&page=&limit=&type= — catalog (`data.items` + pagination)
 * - GET /api/v1/products/app/:appId?page=&limit= — products for that app
 * - GET /api/v1/products/:id — product detail
 *
 * Toggle is used by the merchant console but is not in the published frontendplata spec.
 */

import { getAccessToken } from "@/lib/cookieAuth"
import { withProductItemsAsData } from "@/lib/productOverview"
import { queryCache } from "@/lib/sessionQueryCache"
import {
  DASHBOARD_TTL,
  appProductsKey,
  catalogProductsKey,
  invalidateDashboardProducts,
} from "@/lib/dashboardSessionCache"

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? getAccessToken() : null
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  } as Record<string, string>
}

const getMerchantIdFromToken = (): string | null => {
  if (typeof window === "undefined") return null

  const token = getAccessToken()
  if (!token) return null

  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
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

export const springProductService = {
  /** Plata catalog — GET /api/v1/products?appId= (required) */
  async getAllProducts(params: { appId: string; type?: string; page?: number; limit?: number }) {
    return queryCache(
      catalogProductsKey(params),
      async () => {
        const qs = new URLSearchParams()
        qs.set("appId", params.appId)
        qs.set("page", String(params.page && params.page > 0 ? params.page : 1))
        qs.set("limit", String(params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 100))
        if (params.type) qs.set("type", params.type.toUpperCase())
        const response = await fetch(`/api/v1/products?${qs.toString()}`, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Failed to fetch products" }))
          throw new Error((error as { error?: string }).error || "Failed to fetch products")
        }

        const data = await response.json().catch(() => ({}))
        return withProductItemsAsData(data as Record<string, unknown>)
      },
      DASHBOARD_TTL.products,
    )
  },

  /** Active products for this app only — GET /api/v1/products/app/:appId */
  async getProductsForApp(appId: string) {
    return queryCache(
      appProductsKey(appId),
      async () => {
        const qs = new URLSearchParams({ page: "1", limit: "100" })
        const response = await fetch(
          `/api/v1/products/app/${encodeURIComponent(appId)}?${qs.toString()}`,
          {
            headers: getAuthHeaders(),
          },
        )

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error((data as { error?: string }).error || "Failed to fetch products")
        }

        return withProductItemsAsData(data as Record<string, unknown>)
      },
      DASHBOARD_TTL.products,
    )
  },

  async getProductById(productId: string) {
    const response = await fetch(`/api/v1/products/${encodeURIComponent(productId)}`, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to fetch product" }))
      throw new Error((error as { error?: string }).error || "Failed to fetch product")
    }

    return response.json()
  },

  async toggleProductActivation(appId: string, productId: string, activate: boolean) {
    const response = await fetch(
      `/api/v1/products/toggle/${encodeURIComponent(appId)}/${encodeURIComponent(productId)}`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ activate }),
      },
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to toggle product" }))
      throw new Error((error as { error?: string }).error || "Failed to toggle product")
    }

    invalidateDashboardProducts(appId)
    return response.json()
  },

  getMerchantId(): string | null {
    return getMerchantIdFromToken()
  },
}
