import type { QueryKey } from "@tanstack/react-query"
import { appsListKey, appProductsKey, catalogProductsKey, productDetailKey } from "@/lib/dashboardSessionCache"
import { toQueryKey } from "@/lib/sessionQueryCache"

/**
 * Every React Query key in the app. Keys are `[string, ...params]`; the string heads are shared with
 * lib/dashboardSessionCache so prefix invalidation (invalidateDashboardApps/Products) reaches them.
 */
export const queryKeys = {
  apps: {
    list: (): QueryKey => toQueryKey(appsListKey()),
    detail: (appId: string): QueryKey => ["app", appId],
    analytics: (appId: string, params: Record<string, unknown>): QueryKey => ["app", appId, "analytics", params],
    transactionStats: (appId: string): QueryKey => ["app", appId, "transaction-stats"],
    transactions: (appId: string, params: Record<string, unknown>): QueryKey => ["app", appId, "transactions", params],
    productKeys: (appId: string): QueryKey => ["app", appId, "product-keys"],
    driveDocuments: (appId: string, params: Record<string, unknown>): QueryKey => ["app", appId, "drive", params],
    configurations: (appId: string): QueryKey => ["app", appId, "configurations"],
    activeConfiguration: (appId: string): QueryKey => ["app", appId, "configuration"],
    templates: (appId: string): QueryKey => ["app", appId, "templates"],
  },
  products: {
    forApp: (appId: string, params?: { page?: number; limit?: number; type?: string }): QueryKey =>
      toQueryKey(appProductsKey(appId, params)),
    catalog: (params: Parameters<typeof catalogProductsKey>[0]): QueryKey => toQueryKey(catalogProductsKey(params)),
    detail: (productId: string): QueryKey => toQueryKey(productDetailKey(productId)),
  },
} as const
