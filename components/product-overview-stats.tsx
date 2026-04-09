"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAppSelector } from "@/store/hooks"
import { productApi } from "@/lib/services/product-api"

type OverviewHeadline = {
  requestedAmount?: number
  approvedAmount?: number
  totalTransactions?: number
  totalSavings?: number
  totalInterest?: number
}

const formatMoney = (value: number | undefined) => {
  const n = Number.isFinite(value) ? Number(value) : 0
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(n)
}

export default function ProductOverviewStats() {
  const searchParams = useSearchParams()
  const { selectedAppId } = useAppSelector((s) => s.merchantApps)
  const appId = searchParams.get("appId") || selectedAppId || null
  const [headline, setHeadline] = useState<OverviewHeadline | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!appId) {
      setHeadline(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    productApi
      .getProductOverview(appId)
      .then((res) => {
        if (cancelled) return
        const nextHeadline = (res as { data?: { headline?: OverviewHeadline } })?.data?.headline || {}
        setHeadline(nextHeadline)
      })
      .catch((e) => {
        if (cancelled) return
        setHeadline(null)
        setError(e instanceof Error ? e.message : "Failed to load overview")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [appId])

  const stats = useMemo(
    () => [
      { label: "Requested", value: formatMoney(headline?.requestedAmount) },
      { label: "Approved", value: formatMoney(headline?.approvedAmount) },
      { label: "Total Transactions", value: formatMoney(headline?.totalTransactions) },
      { label: "Total Savings", value: formatMoney(headline?.totalSavings) },
      { label: "Total Interest", value: formatMoney(headline?.totalInterest) },
    ],
    [headline],
  )

  return (
    <div className="bg-gray-900 rounded-lg p-8 mb-8">
      {!appId ? <p className="text-gray-300 text-sm mb-4">Select an app to see product overview totals.</p> : null}
      {error ? <p className="text-red-300 text-sm mb-4">{error}</p> : null}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
            <p className="text-white text-2xl sm:text-3xl font-bold mb-1">
              {loading && appId ? "Loading..." : stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
