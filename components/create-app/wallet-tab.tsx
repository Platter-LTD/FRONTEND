"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getAccessToken } from "@/lib/cookieAuth"
import { getMerchantIdFromAccessToken } from "@/lib/merchantIdFromToken"
import { merchantWalletMainBalance } from "@/lib/services/walletService"
import { plataWalletDisplayCurrency } from "@/lib/walletDisplay"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchAppMerchantWalletsThunk, fetchKycTransactionsThunk } from "@/store/walletSlice"
import { MerchantTransactionsTable } from "@/components/wallets/merchant-transactions-table"
import { FundWalletDrawer } from "@/components/wallets/fund-wallet-drawer"
import { WithdrawWalletDialog } from "@/components/wallets/withdraw-wallet-dialog"
import { MerchantWalletBalanceCard } from "@/components/wallets/merchant-wallet-balance-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type AppRow = { id: string; name?: string; alias?: string; merchantId?: string }

export function WalletTab() {
  const dispatch = useAppDispatch()
  const walletState = useAppSelector((s) => s.wallet)

  const [apps, setApps] = useState<AppRow[]>([])
  const [appsLoading, setAppsLoading] = useState(true)
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [showBalance, setShowBalance] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [fundOpen, setFundOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)

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
    void loadApps()
  }, [loadApps])

  const appId = selectedAppId
  const selectedApp = apps.find((a) => a.id === appId)
  const merchantId = selectedApp?.merchantId?.trim() || getMerchantIdFromAccessToken()
  const selectedAppName =
    selectedApp?.name && selectedApp.name.toLowerCase() !== "anonymous"
      ? selectedApp.name
      : selectedApp?.alias || appId || ""

  useEffect(() => {
    if (!merchantId || !appId) return
    void dispatch(fetchAppMerchantWalletsThunk({ merchantId, appId }))
    void dispatch(fetchKycTransactionsThunk({ merchantId, appId }))
  }, [dispatch, merchantId, appId])

  const inScope = walletState.merchantId === merchantId && walletState.appId === appId
  const settlement = inScope ? walletState.settlement ?? walletState.kyc : null
  const treasury = inScope ? walletState.treasury : null
  const txs = inScope ? walletState.kycTransactions : []
  const walletsLoading = inScope && walletState.walletsLoading
  const txsLoading = inScope && walletState.kycTxLoading
  const walletsError = inScope ? walletState.walletsError : null
  const txsError = inScope ? walletState.kycTxError : null

  const settlementBal = merchantWalletMainBalance(settlement)
  const currency = plataWalletDisplayCurrency(settlement?.currency ?? treasury?.currency)

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
        No applications found. Create an app under <span className="font-medium">All Apps</span> to view app
        wallets.
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          Showing settlement & treasury wallets for{" "}
          <span className="font-medium text-gray-900">{selectedAppName}</span>.
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

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <MerchantWalletBalanceCard
          wallet={settlement}
          loading={!!walletsLoading}
          showBalance={showBalance}
          onToggleBalance={() => setShowBalance((value) => !value)}
          title="Settlement wallet"
          subtitle="Fund & withdraw here"
        />
        <MerchantWalletBalanceCard
          wallet={treasury}
          loading={!!walletsLoading}
          showBalance={showBalance}
          onToggleBalance={() => setShowBalance((value) => !value)}
          title="Treasury wallet"
          subtitle="Disbursements"
        />
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-end gap-3">
        <Button
          className="bg-[#9A813F] px-6 font-semibold text-white hover:bg-[#7A642F]"
          disabled={walletsLoading || !settlement}
          onClick={() => setFundOpen(true)}
        >
          Fund settlement
        </Button>
        <Button
          variant="outline"
          className="border-[#9A813F] px-6 font-semibold text-[#9A813F] hover:bg-[#9A813F]/10"
          disabled={walletsLoading || !settlement || settlementBal <= 0}
          onClick={() => setWithdrawOpen(true)}
        >
          Withdraw
        </Button>
      </div>

      <MerchantTransactionsTable
        transactions={txs}
        loading={!!txsLoading}
        currency={currency}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <FundWalletDrawer
        open={fundOpen}
        onOpenChange={setFundOpen}
        currency={currency}
        virtualNuban={{
          accountNumber: settlement?.virtualNuban?.accountNumber,
          bankName: settlement?.virtualNuban?.bankName,
          bankCode: settlement?.virtualNuban?.bankCode,
          accountHolder: settlement?.name || "Settlement wallet",
          provisionStatus: settlement?.virtualNuban?.provisionStatus,
        }}
        onRefreshBalance={() => {
          if (!merchantId || !appId) return
          void dispatch(fetchAppMerchantWalletsThunk({ merchantId, appId }))
          void dispatch(fetchKycTransactionsThunk({ merchantId, appId }))
        }}
      />
      <WithdrawWalletDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        mode="merchant-settlement"
        maxAmount={settlementBal}
        currency={currency}
        appId={appId ?? undefined}
        onSuccess={() => {
          if (!merchantId || !appId) return
          void dispatch(fetchAppMerchantWalletsThunk({ merchantId, appId }))
        }}
      />
    </>
  )
}
