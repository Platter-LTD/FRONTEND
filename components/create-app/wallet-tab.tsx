"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getMerchantIdFromAccessToken } from "@/lib/merchantIdFromToken"
import { merchantWalletMainBalance } from "@/lib/services/walletService"
import { plataWalletDisplayCurrency } from "@/lib/walletDisplay"
import { MerchantTransactionsTable } from "@/components/wallets/merchant-transactions-table"
import { FundWalletDrawer } from "@/components/wallets/fund-wallet-drawer"
import { WithdrawWalletDialog } from "@/components/wallets/withdraw-wallet-dialog"
import { MerchantWalletBalanceCard } from "@/components/wallets/merchant-wallet-balance-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePermissions } from "@/hooks/usePermissions"
import { useApps } from "@/hooks/queries/apps"
import { useAppWalletState } from "@/hooks/queries/wallets"

type AppRow = { id: string; name?: string; alias?: string; merchantId?: string }

export function WalletTab() {
  const { actions } = usePermissions()
  const canViewBalances = actions.viewWalletBalances
  const canFundOrWithdraw = actions.viewWalletBalances

  const { data: appsData, isLoading: appsLoading } = useApps()
  const apps = (appsData ?? []) as AppRow[]
  const [pickedAppId, setSelectedAppId] = useState<string | null>(null)
  // Keep the user's pick while it still exists; otherwise default to the first app.
  const selectedAppId =
    pickedAppId && apps.some((a) => a.id === pickedAppId) ? pickedAppId : (apps[0]?.id ?? null)
  const [showBalance, setShowBalance] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [fundOpen, setFundOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  const appId = selectedAppId
  const selectedApp = apps.find((a) => a.id === appId)
  const merchantId = selectedApp?.merchantId?.trim() || getMerchantIdFromAccessToken()
  const selectedAppName =
    selectedApp?.name && selectedApp.name.toLowerCase() !== "anonymous"
      ? selectedApp.name
      : selectedApp?.alias || appId || ""

  const walletState = useAppWalletState(merchantId, appId, { settlement: true })

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
          showBalance={canViewBalances && showBalance}
          onToggleBalance={() => {
            if (!canViewBalances) return
            setShowBalance((value) => !value)
          }}
          title="Repayment wallet"
          subtitle={
            canViewBalances
              ? "Loan repayments · fund & withdraw"
              : "Balances hidden — ledger access only"
          }
        />
        <MerchantWalletBalanceCard
          wallet={treasury}
          loading={!!walletsLoading}
          showBalance={canViewBalances && showBalance}
          onToggleBalance={() => {
            if (!canViewBalances) return
            setShowBalance((value) => !value)
          }}
          title="Treasury wallet"
          subtitle={canViewBalances ? "Disbursements" : "Balances hidden — ledger access only"}
        />
      </div>

      {canFundOrWithdraw ? (
      <div className="mb-8 flex flex-wrap items-center justify-end gap-3">
        <Button
          className="bg-[#9A813F] px-6 font-semibold text-white hover:bg-[#7A642F]"
          disabled={walletsLoading || !settlement}
          onClick={() => setFundOpen(true)}
        >
          Fund repayment
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
      ) : null}

      <MerchantTransactionsTable
        transactions={txs}
        loading={!!txsLoading}
        currency={currency}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {canFundOrWithdraw ? (
        <>
      <FundWalletDrawer
        open={fundOpen}
        onOpenChange={setFundOpen}
        currency={currency}
        virtualNuban={{
          accountNumber: settlement?.virtualNuban?.accountNumber,
          bankName: settlement?.virtualNuban?.bankName,
          bankCode: settlement?.virtualNuban?.bankCode,
          accountHolder: settlement?.name || "Repayment wallet",
          provisionStatus: settlement?.virtualNuban?.provisionStatus,
        }}
        onRefreshBalance={() => {
          if (!merchantId || !appId) return
          void walletState.refresh()
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
          void walletState.refresh()
        }}
      />
        </>
      ) : null}
    </>
  )
}
