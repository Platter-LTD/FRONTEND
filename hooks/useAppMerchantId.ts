"use client"

import { getMerchantIdFromAccessToken } from "@/lib/merchantIdFromToken"
import { useGetApiV1AppsId } from "@/lib/generated/plata/apps/apps"

/**
 * Wallet-ms scopes wallets per app merchant id (create-app MS), not the Plata user JWT merchant id.
 * Each app has its own merchantId — using the JWT id leaks wallets/transactions from other apps.
 * The app is read through the generated GET /apps/:id query (cached, shared with the app settings page).
 */
export function useAppMerchantId(appId: string | null | undefined) {
  const query = useGetApiV1AppsId(appId ?? "", { query: { enabled: Boolean(appId) } })

  if (!appId) return { merchantId: null, loading: false, error: null }

  const fallback = getMerchantIdFromAccessToken()
  if (query.error) {
    return {
      merchantId: fallback,
      loading: false,
      error: query.error instanceof Error ? query.error.message : "Failed to load app merchant",
    }
  }
  if (query.isLoading) return { merchantId: null, loading: true, error: null }

  const appMerchantId = (query.data as { data?: { merchantId?: string } } | undefined)?.data?.merchantId?.trim()
  const resolved = appMerchantId || fallback
  return { merchantId: resolved, loading: false, error: resolved ? null : "No merchant ID found for this app." }
}
