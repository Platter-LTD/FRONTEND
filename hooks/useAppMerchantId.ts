"use client"

import { useEffect, useState } from "react"
import { getMerchantIdFromAccessToken } from "@/lib/merchantIdFromToken"
import { appApi } from "@/lib/services/appService"

/**
 * Wallet-ms scopes wallets per app merchant id (create-app MS), not the Plata user JWT merchant id.
 * Each app has its own merchantId — using the JWT id leaks wallets/transactions from other apps.
 */
export function useAppMerchantId(appId: string | null | undefined) {
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(appId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!appId) {
      setMerchantId(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void appApi
      .getAppById(appId)
      .then((res) => {
        if (cancelled) return
        const appMerchantId = res.data?.merchantId?.trim()
        const fallback = getMerchantIdFromAccessToken()
        const resolved = appMerchantId || fallback
        setMerchantId(resolved)
        if (!resolved) {
          setError("No merchant ID found for this app.")
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const fallback = getMerchantIdFromAccessToken()
        setMerchantId(fallback)
        setError(e instanceof Error ? e.message : "Failed to load app merchant")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [appId])

  return { merchantId, loading, error }
}
