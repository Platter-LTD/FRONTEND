import { invalidateQueries, queryCache } from "@/lib/sessionQueryCache"
import { getAccessToken } from "@/lib/cookieAuth"

export const DASHBOARD_TTL = {
  apps: 60_000,
  products: 60_000,
  productDetail: 60_000,
} as const

export function appsListKey() {
  return "dashboard:apps"
}

export function catalogProductsKey(params: {
  appId?: string
  type?: string
  page?: number
  limit?: number
  search?: string
}) {
  const qs = new URLSearchParams()
  if (params.appId) qs.set("appId", params.appId)
  qs.set("page", String(params.page && params.page > 0 ? params.page : 1))
  qs.set("limit", String(params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 100))
  if (params.type && params.type.toLowerCase() !== "all") qs.set("type", params.type.toUpperCase())
  if (params.search?.trim()) qs.set("search", params.search.trim())
  return `dashboard:catalog:${qs.toString()}`
}

export function appProductsKey(
  appId: string,
  params?: { page?: number; limit?: number; type?: string },
) {
  const qs = new URLSearchParams()
  qs.set("page", String(params?.page && params.page > 0 ? params.page : 1))
  qs.set("limit", String(params?.limit && params.limit > 0 ? Math.min(params.limit, 100) : 100))
  if (params?.type && params.type.toLowerCase() !== "all") qs.set("type", params.type.toUpperCase())
  return `dashboard:app-products:${appId}:${qs.toString()}`
}

export function productDetailKey(productId: string) {
  return `dashboard:product:${productId}`
}

export function invalidateDashboardApps() {
  invalidateQueries("dashboard:apps")
}

export function invalidateDashboardProducts(appId?: string) {
  invalidateQueries("dashboard:catalog:")
  invalidateQueries("dashboard:product:")
  if (appId) invalidateQueries(`dashboard:app-products:${appId}`)
  else invalidateQueries("dashboard:app-products:")
}

export async function fetchAppsListCached<T>(fetcher: () => Promise<T>, options?: { force?: boolean }) {
  return queryCache(appsListKey(), fetcher, DASHBOARD_TTL.apps, options)
}

export function dashboardAuthHeaders() {
  const token = typeof window !== "undefined" ? getAccessToken() : null
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}
