"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAppMerchantId } from "@/hooks/useAppMerchantId"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  fetchAppMerchantWalletsThunk,
  fetchOperationTransactionsThunk,
} from "@/store/walletSlice"
import { MerchantTransactionsTable } from "@/components/wallets/merchant-transactions-table"
import { FundWalletDrawer } from "@/components/wallets/fund-wallet-drawer"
import { MerchantWalletBalanceCard } from "@/components/wallets/merchant-wallet-balance-card"
import { plataWalletDisplayCurrency } from "@/lib/walletDisplay"
import {
  isVirtualNubanActive,
  merchantWalletApi,
  merchantWalletMainBalance,
  type MerchantWallet,
} from "@/lib/services/walletService"
import { usePermissions } from "@/hooks/usePermissions"

export default function BillingWalletPage() {
  const params = useParams()
  const appId = params.id as string
  const dispatch = useAppDispatch()
  const walletState = useAppSelector((s) => s.wallet)
  const { actions } = usePermissions()
  const canViewBalances = actions.viewWalletBalances

  const { merchantId, loading: merchantLoading, error: merchantError } = useAppMerchantId(appId)

  const [showBalance, setShowBalance] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [fundOpen, setFundOpen] = useState(false)
  const [billingWallet, setBillingWallet] = useState<MerchantWallet | null>(null)
  const [walletDetailLoading, setWalletDetailLoading] = useState(false)

  const inScope = walletState.merchantId === merchantId && walletState.appId === appId
  const bundleBilling = inScope ? walletState.billing ?? walletState.operation : null
  const billing = billingWallet ?? bundleBilling

  const refreshBillingWallet = useCallback(async () => {
    if (!merchantId || !appId) return null
    setWalletDetailLoading(true)
    try {
      const res = await merchantWalletApi.getMerchantWallet(merchantId, "BILLING", appId)
      const wallet = res.data ?? null
      setBillingWallet(wallet)
      return wallet
    } catch {
      return null
    } finally {
      setWalletDetailLoading(false)
    }
  }, [merchantId, appId])

  const refresh = useCallback(() => {
    if (!merchantId || !appId) return
    void dispatch(fetchAppMerchantWalletsThunk({ merchantId, appId }))
    void dispatch(fetchOperationTransactionsThunk({ merchantId, appId }))
    void refreshBillingWallet()
  }, [dispatch, merchantId, appId, refreshBillingWallet])

  useEffect(() => {
    refresh()
  }, [refresh])

  const txs = inScope ? walletState.operationTransactions : []
  const walletsLoading =
    merchantLoading || walletDetailLoading || (inScope && walletState.walletsLoading && !billing)
  const txsLoading = merchantLoading || (inScope && walletState.operationTxLoading)
  const walletsError = inScope ? walletState.walletsError : null
  const txsError = inScope ? walletState.operationTxError : null
  const currency = plataWalletDisplayCurrency(billing?.currency)
  const mainBal = merchantWalletMainBalance(billing)
  const nubanActive = isVirtualNubanActive(billing?.virtualNuban)
  const canOpenFund = canViewBalances && Boolean(billing) && !walletsLoading

  const bannerError = useMemo(() => {
    if (merchantError) return merchantError
    if (!merchantLoading && !merchantId) return "No merchant ID found for this app."
    return walletsError || txsError
  }, [merchantError, merchantLoading, merchantId, walletsError, txsError])

  return (
    <div className="flex-1 bg-white p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Billing wallet</h1>

      {bannerError ? (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {bannerError}
        </div>
      ) : null}

      <MerchantWalletBalanceCard
        wallet={billing}
        loading={!!walletsLoading}
        showBalance={canViewBalances && showBalance}
        onToggleBalance={() => {
          if (!canViewBalances) return
          setShowBalance((value) => !value)
        }}
        title="Billing wallet"
        subtitle={
          canViewBalances
            ? nubanActive
              ? `Fees · ${billing?.virtualNuban?.bankName || "Bank"} · ${billing?.virtualNuban?.accountNumber}`
              : "Fees and billing collections (API: BILLING)"
            : "Balances hidden — ledger access only"
        }
        className="mb-8"
        actions={
          canViewBalances ? (
          <Button
            className="bg-[#8B7355] text-white hover:bg-[#7A6449] disabled:opacity-50"
            disabled={!canOpenFund}
            onClick={() => setFundOpen(true)}
          >
            Fund
          </Button>
          ) : null
        }
      />

      <MerchantTransactionsTable
        transactions={txs}
        loading={!!txsLoading}
        currency={currency}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {canViewBalances ? (
      <FundWalletDrawer
        open={fundOpen}
        onOpenChange={setFundOpen}
        currency={currency}
        mainBalance={mainBal}
        virtualNuban={{
          accountNumber: billing?.virtualNuban?.accountNumber,
          bankName: billing?.virtualNuban?.bankName,
          bankCode: billing?.virtualNuban?.bankCode,
          accountHolder:
            billing?.contactName || billing?.name || "Billing wallet",
          provisionStatus: billing?.virtualNuban?.provisionStatus,
        }}
        onRefreshBalance={async () => {
          await refreshBillingWallet()
          refresh()
        }}
      />
      ) : null}
    </div>
  )
}
