"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { FiEyeOff, FiEye } from "react-icons/fi"
import { Skeleton } from "@/components/ui/skeleton"
import { getAccessToken } from "@/lib/cookieAuth"
import { getMerchantIdFromAccessToken } from "@/lib/merchantIdFromToken"
import { merchantWalletMainBalance } from "@/lib/services/walletService"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchAppMerchantWalletsThunk, fetchTreasuryTransactionsThunk } from "@/store/walletSlice"
import { MerchantTransactionsTable } from "@/components/wallets/merchant-transactions-table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type AppRow = { id: string; name?: string; alias?: string }

export function WalletTab() {
  const dispatch = useAppDispatch()
  const walletState = useAppSelector((s) => s.wallet)

  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [apps, setApps] = useState<AppRow[]>([])
  const [appsLoading, setAppsLoading] = useState(true)
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [showBalance, setShowBalance] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const loadApps = useCallback(async () => {
    setAppsLoading(true)
    try {
      const token = typeof window !== "undefined" ? getAccessToken() : null
      const response = await fetch("/api/apps", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      const result = await response.json()
      const list: AppRow[] = result.success && Array.isArray(result.data) ? result.data : []
      setApps(list)
      setSelectedAppId((prev) => {
        if (prev && list.some((a) => a.id === prev)) return prev
        return list[0]?.id ?? null
      })
    } catch {
      setApps([])
      setSelectedAppId(null)
    } finally {
      setAppsLoading(false)
    }
  }, [])

  useEffect(() => {
    setMerchantId(getMerchantIdFromAccessToken())
  }, [])

  useEffect(() => {
    void loadApps()
  }, [loadApps])

  const appId = selectedAppId
  const selectedApp = apps.find((a) => a.id === appId)
  const selectedAppName =
    selectedApp?.name && selectedApp.name.toLowerCase() !== "anonymous"
      ? selectedApp.name
      : selectedApp?.alias || appId || ""

  useEffect(() => {
    if (!merchantId || !appId) return
    void dispatch(fetchAppMerchantWalletsThunk({ merchantId, appId }))
    void dispatch(fetchTreasuryTransactionsThunk({ merchantId, appId }))
  }, [dispatch, merchantId, appId])

  const inScope = walletState.merchantId === merchantId && walletState.appId === appId
  const treasury = inScope ? walletState.treasury : null
  const txs = inScope ? walletState.treasuryTransactions : []
  const walletsLoading = inScope && walletState.walletsLoading
  const txsLoading = inScope && walletState.treasuryTxLoading
  const walletsError = inScope ? walletState.walletsError : null
  const txsError = inScope ? walletState.treasuryTxError : null

  const mainBal = merchantWalletMainBalance(treasury)
  const formatted = mainBal.toFixed(2).split(".")
  const dollars = Number(formatted[0]).toLocaleString()
  const cents = formatted[1] || "00"
  const currency = treasury?.currency || "NGN"

  if (!merchantId) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Sign in to load wallet data.
      </div>
    )
  }

  if (appsLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!appId) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
        No applications found. Create an app under <span className="font-medium">All Apps</span> to view treasury
        wallet and transactions.
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          Showing treasury wallet for <span className="font-medium text-gray-900">{selectedAppName}</span>.
        </p>
        {apps.length > 1 ? (
          <div className="w-full sm:w-64">
            <Select value={appId} onValueChange={setSelectedAppId}>
              <SelectTrigger className="h-9 border-gray-300 bg-white text-sm">
                <SelectValue placeholder="Select app" />
              </SelectTrigger>
              <SelectContent>
                {apps.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name && a.name.toLowerCase() !== "anonymous" ? a.name : a.alias || a.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {(walletsError || txsError) && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {walletsError || txsError}
        </div>
      )}

      <div className="relative mb-8 overflow-hidden rounded-lg bg-black p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="mb-2 text-sm text-white/70">Treasury — main balance</p>
            {walletsLoading ? (
              <div className="flex items-baseline gap-1">
                <Skeleton className="h-12 w-32 bg-gray-600" />
                <Skeleton className="ml-1 h-8 w-8 bg-gray-600" />
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                {showBalance ? (
                  <>
                    <span className="text-5xl font-semibold text-white">
                      {currency === "NGN" ? "NGN " : ""}
                      {dollars}
                    </span>
                    <span className="text-2xl text-white">.{cents}</span>
                  </>
                ) : (
                  <span className="text-5xl font-semibold text-white">••••</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {!walletsLoading && (
              <button
                type="button"
                onClick={() => setShowBalance(!showBalance)}
                className="text-white/50 transition-colors hover:text-white/70"
              >
                {showBalance ? <FiEyeOff size={24} /> : <FiEye size={24} />}
              </button>
            )}
            <Button className="bg-[#9A813F] px-8 text-white hover:bg-[#8A7335]" disabled={walletsLoading}>
              Withdraw
            </Button>
          </div>
        </div>
      </div>

      <MerchantTransactionsTable
        transactions={txs}
        loading={!!txsLoading}
        currency={currency}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
    </>
  )
}
