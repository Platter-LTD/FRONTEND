"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAppMerchantId } from "@/hooks/useAppMerchantId"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  fetchAppMerchantWalletsThunk,
  fetchOperationTransactionsThunk,
} from "@/store/walletSlice"
import { MerchantTransactionsTable } from "@/components/wallets/merchant-transactions-table"
import { MerchantWalletBalanceCard } from "@/components/wallets/merchant-wallet-balance-card"
import { plataWalletDisplayCurrency } from "@/lib/walletDisplay"

export default function RepaymentWalletPage() {
  const params = useParams()
  const appId = params.id as string
  const dispatch = useAppDispatch()
  const walletState = useAppSelector((s) => s.wallet)

  const { merchantId, loading: merchantLoading, error: merchantError } = useAppMerchantId(appId)

  const [showBalance, setShowBalance] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!merchantId || !appId) return
    void dispatch(fetchAppMerchantWalletsThunk({ merchantId, appId }))
    void dispatch(fetchOperationTransactionsThunk({ merchantId, appId }))
  }, [dispatch, merchantId, appId])

  const inScope = walletState.merchantId === merchantId && walletState.appId === appId

  const billing = inScope ? walletState.billing ?? walletState.operation : null
  const txs = inScope ? walletState.operationTransactions : []
  const walletsLoading = merchantLoading || (inScope && walletState.walletsLoading)
  const txsLoading = merchantLoading || (inScope && walletState.operationTxLoading)
  const walletsError = inScope ? walletState.walletsError : null
  const txsError = inScope ? walletState.operationTxError : null
  const currency = plataWalletDisplayCurrency(billing?.currency)

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
        showBalance={showBalance}
        onToggleBalance={() => setShowBalance((value) => !value)}
        title="Billing wallet"
        subtitle="Fees and billing collections (API: BILLING)"
        className="mb-8"
        actions={
          <Button className="bg-[#8B7355] text-white hover:bg-[#7A6449]" disabled={walletsLoading}>
            Withdraw
          </Button>
        }
      />

      <MerchantTransactionsTable
        transactions={txs}
        loading={!!txsLoading}
        currency={currency}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
    </div>
  )
}
