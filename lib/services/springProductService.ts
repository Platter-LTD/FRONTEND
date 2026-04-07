/**
 * Merchant product list + activation via Next.js API routes (proxied to NEXT_PUBLIC_API_URL).
 *
 * - GET /api/v1/products — **all** products (catalog)
 * - GET /api/v1/products/app/:appId — **active / turned-on** products for that app only
 * - PUT /api/v1/products/toggle/:appId/:productId — body `{ "activate": boolean }`
 */

import { getAccessToken } from "@/lib/cookieAuth"

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
  /** Full product catalog — GET /api/v1/products */
  async getAllProducts() {
    const response = await fetch("/api/v1/products", {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to fetch products" }))
      throw new Error((error as { error?: string }).error || "Failed to fetch products")
    }

    return response.json()
  },

  /** Active products for this app only — GET /api/v1/products/app/:appId */
  async getProductsForApp(appId: string) {
    const response = await fetch(`/api/v1/products/app/${encodeURIComponent(appId)}`, {
      headers: getAuthHeaders(),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error((data as { error?: string }).error || "Failed to fetch products")
    }

    return data
  },

  async getProductById(productId: string) {
    const response = await fetch(`/api/product/${encodeURIComponent(productId)}`, {
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

    return response.json()
  },

  getMerchantId(): string | null {
    return getMerchantIdFromToken()
  },
}
